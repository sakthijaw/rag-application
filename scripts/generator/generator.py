"""
Generator — Step 7

Takes the user query and a ranked list of RetrievalResult objects from
Step 6, calls the Groq LLM with a structured prompt, and returns a
GeneratorResponse containing the chosen component and usage guidance.

Anti-hallucination guarantees enforced here (not just in the prompt):
  1. chosen_component must be in the retrieved set — rejected otherwise
  2. import_path is always taken from retrieved metadata, never from LLM output
  3. alternative_components are filtered to only names present in retrieved set
  4. prop names in props_to_use are validated against the component's actual props
  5. Empty retrieved set → skip API call entirely, return no_result_message

The LLM's creative contribution is:
  - Deciding which retrieved component best fits the query
  - Generating a contextually appropriate usage example
  - Explaining the reasoning in 1–2 sentences
  - Suggesting which props matter most for this specific query
"""

from __future__ import annotations

import json
import logging
import os
import time
from dataclasses import dataclass, field
from pathlib import Path

from scripts.retriever import RetrievalResult


# ─────────────────────────────────────────────────────────────
# Prompt templates
# ─────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """\
You are an Astro.js UI component library assistant.
Given a developer query and a list of retrieved components, identify the
best match and explain how to use it.

STRICT RULES — these are not suggestions:
1. You may ONLY choose from the components listed in RETRIEVED CONTEXT.
2. Never invent, modify, or guess component names or import paths.
3. If no retrieved component genuinely matches the query, set "no_match": true.
4. Return ONLY a single valid JSON object — no prose, no markdown fences.\
"""

_USER_TEMPLATE = """\
Developer query: "{query}"

RETRIEVED CONTEXT (choose ONLY from these):
{context}

Return this exact JSON schema:
{{
  "no_match": false,
  "chosen_component": "<name exactly as shown in context>",
  "confidence": "<high | medium | low>",
  "reasoning": "<1–2 sentences: why this component fits this query>",
  "usage_example": "<concise Astro snippet tailored to the query>",
  "props_to_use": [
    {{"name": "<prop_name>", "suggested_value": "<value>", "reason": "<why useful for this query>"}}
  ],
  "alternative_components": ["<other component names from context that partially fit>"]
}}

If NO retrieved component matches the query, return:
{{
  "no_match": true,
  "chosen_component": null,
  "confidence": "none",
  "reasoning": "None of the retrieved components match this query.",
  "usage_example": "",
  "props_to_use": [],
  "alternative_components": []
}}\
"""

_CONTEXT_ITEM = """\
[{rank}] {name}  (category: {category}  similarity: {score:.3f})
  Description : {description}
  Import      : {import_path}
  Props       : {props}
  Usage hint  :
{usage}\
"""


# ─────────────────────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────────────────────

@dataclass
class GeneratorConfig:
    provider: str
    model: str
    temperature: float
    max_tokens: int
    no_result_message: str


def load_generator_config(settings: dict) -> GeneratorConfig:
    g = settings["generator"]
    return GeneratorConfig(
        provider=g["provider"],
        model=g["model"],
        temperature=float(g["temperature"]),
        max_tokens=int(g["max_tokens"]),
        no_result_message=g["no_result_message"],
    )


# ─────────────────────────────────────────────────────────────
# Response type
# ─────────────────────────────────────────────────────────────

@dataclass
class GeneratorResponse:
    query: str
    no_match: bool
    chosen_component: str | None
    confidence: str                       # "high" | "medium" | "low" | "none"
    reasoning: str
    import_path: str
    usage_example: str
    props_to_use: list[dict] = field(default_factory=list)
    alternative_components: list[str] = field(default_factory=list)
    message: str = ""                     # populated when no_match=True
    model: str = ""
    retrieved_names: list[str] = field(default_factory=list)
    retrieval_scores: dict[str, float] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "query": self.query,
            "no_match": self.no_match,
            "chosen_component": self.chosen_component,
            "confidence": self.confidence,
            "reasoning": self.reasoning,
            "import_path": self.import_path,
            "usage_example": self.usage_example,
            "props_to_use": self.props_to_use,
            "alternative_components": self.alternative_components,
            "message": self.message,
            "model": self.model,
            "retrieved_names": self.retrieved_names,
            "retrieval_scores": self.retrieval_scores,
        }


# ─────────────────────────────────────────────────────────────
# Generator
# ─────────────────────────────────────────────────────────────

class Generator:
    """
    Calls the Groq LLM with retrieved component context and returns a
    structured, hallucination-safe GeneratorResponse.
    """

    _MAX_RETRIES = 2
    _RETRY_DELAY = 4.0       # seconds between retries on rate-limit

    def __init__(self, config: GeneratorConfig) -> None:
        self._cfg = config
        self._client = None  # lazy-loaded on first generate()
        self._log = logging.getLogger(self.__class__.__name__)

    # ── Public API ────────────────────────────────────────────

    def generate(
        self,
        query: str,
        results: list[RetrievalResult],
    ) -> GeneratorResponse:
        """
        Generate a response for the given query using retrieved components.

        If results is empty, returns the no_result_message immediately
        without making an API call.
        """
        query = query.strip()

        if not results:
            self._log.debug("No retrieved results — returning no_match response.")
            return self._no_match_response(query)

        system_prompt = _SYSTEM_PROMPT
        user_message = self._build_user_message(query, results)

        raw_json = self._call_groq(system_prompt, user_message)
        if raw_json is None:
            return self._no_match_response(query)

        return self._parse_and_validate(query, raw_json, results)

    # ── Prompt building ───────────────────────────────────────

    def _build_user_message(self, query: str, results: list[RetrievalResult]) -> str:
        context_blocks = []
        for r in results:
            # Summarise props as "name (type)" pairs
            prop_summary = ", ".join(
                f"{p['name']} ({p.get('type', 'any')})"
                for p in r.props[:8]               # cap at 8 to limit tokens
            )
            if len(r.props) > 8:
                prop_summary += f" (+{len(r.props) - 8} more)"

            # Indent the usage example
            usage_lines = r.usage_example.strip().splitlines()
            indented = "\n".join("    " + line for line in usage_lines[:6])

            context_blocks.append(
                _CONTEXT_ITEM.format(
                    rank=r.rank,
                    name=r.component_name,
                    category=r.category,
                    score=r.score,
                    description=(r.description or "")[:120],
                    import_path=r.import_path,
                    props=prop_summary or "none",
                    usage=indented or "    (no example)",
                )
            )

        context = "\n\n".join(context_blocks)
        return _USER_TEMPLATE.format(query=query, context=context)

    # ── Groq API call ─────────────────────────────────────────

    def _call_groq(self, system: str, user: str) -> str | None:
        client = self._get_client()
        for attempt in range(1, self._MAX_RETRIES + 1):
            try:
                self._log.debug("Calling Groq API (attempt %d) ...", attempt)
                response = client.chat.completions.create(
                    model=self._cfg.model,
                    messages=[
                        {"role": "system", "content": system},
                        {"role": "user",   "content": user},
                    ],
                    temperature=self._cfg.temperature,
                    max_tokens=self._cfg.max_tokens,
                    response_format={"type": "json_object"},
                )
                content = response.choices[0].message.content
                self._log.debug("Groq response received (%d chars).", len(content))
                return content

            except Exception as exc:
                err = str(exc)
                if "rate_limit" in err.lower() and attempt < self._MAX_RETRIES:
                    self._log.warning(
                        "Rate limit hit. Retrying in %.0fs ...", self._RETRY_DELAY
                    )
                    time.sleep(self._RETRY_DELAY)
                else:
                    self._log.error("Groq API error: %s", err)
                    return None
        return None

    def _get_client(self):
        if self._client is None:
            try:
                from groq import Groq  # type: ignore
            except ImportError:
                raise ImportError(
                    "groq package not installed. Run: pip install groq"
                )
            api_key = os.environ.get("GROQ_API_KEY", "")
            if not api_key:
                raise EnvironmentError(
                    "GROQ_API_KEY is not set.\n"
                    "Add it to your .env file or export it as an environment variable."
                )
            self._client = Groq(api_key=api_key)
            self._log.info("Groq client initialised (model: %s).", self._cfg.model)
        return self._client

    # ── Response parsing + validation ─────────────────────────

    def _parse_and_validate(
        self,
        query: str,
        raw_json: str,
        results: list[RetrievalResult],
    ) -> GeneratorResponse:
        """
        Parse the LLM JSON response and enforce all anti-hallucination rules.
        Falls back to no_match if the response violates any rule.
        """
        retrieved_names = {r.component_name for r in results}
        score_map = {r.component_name: r.score for r in results}
        result_map = {r.component_name: r for r in results}

        try:
            data: dict = json.loads(raw_json)
        except json.JSONDecodeError as exc:
            self._log.error("Failed to parse LLM JSON: %s", exc)
            return self._no_match_response(query)

        # ── no_match path ──────────────────────────────────────
        if data.get("no_match"):
            return self._no_match_response(query, retrieved_names, score_map)

        # ── Validate chosen_component ──────────────────────────
        chosen = data.get("chosen_component")
        if not chosen or chosen not in retrieved_names:
            self._log.warning(
                "LLM chose %r which is not in retrieved set %s. Falling back.",
                chosen, retrieved_names,
            )
            return self._no_match_response(query, retrieved_names, score_map)

        chosen_result = result_map[chosen]

        # ── import_path: always use ground truth ───────────────
        import_path = chosen_result.import_path

        # ── alternative_components: filter to retrieved set ────
        alternatives = [
            a for a in data.get("alternative_components", [])
            if a in retrieved_names and a != chosen
        ]

        # ── props_to_use: filter to actual prop names ──────────
        valid_prop_names = {p["name"] for p in chosen_result.props}
        props_to_use = [
            p for p in data.get("props_to_use", [])
            if isinstance(p, dict) and p.get("name") in valid_prop_names
        ]

        return GeneratorResponse(
            query=query,
            no_match=False,
            chosen_component=chosen,
            confidence=str(data.get("confidence", "medium")),
            reasoning=str(data.get("reasoning", "")),
            import_path=import_path,
            usage_example=str(data.get("usage_example", chosen_result.usage_example)),
            props_to_use=props_to_use,
            alternative_components=alternatives,
            message="",
            model=self._cfg.model,
            retrieved_names=sorted(retrieved_names),
            retrieval_scores=score_map,
        )

    # ── Helpers ───────────────────────────────────────────────

    def _no_match_response(
        self,
        query: str,
        retrieved_names: set[str] | None = None,
        score_map: dict[str, float] | None = None,
    ) -> GeneratorResponse:
        return GeneratorResponse(
            query=query,
            no_match=True,
            chosen_component=None,
            confidence="none",
            reasoning="No retrieved component matched the query above the similarity threshold.",
            import_path="",
            usage_example="",
            props_to_use=[],
            alternative_components=[],
            message=self._cfg.no_result_message,
            model=self._cfg.model,
            retrieved_names=sorted(retrieved_names or set()),
            retrieval_scores=score_map or {},
        )
