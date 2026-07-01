"""
Embedding Pipeline — Step 4

Reads data/metadata_with_queries.json, builds one text document per
component from all its semantic fields, encodes them with the local
all-MiniLM-L6-v2 model, L2-normalises the result, and saves:

  data/embeddings/embeddings.npy        — (N × 384) float32 matrix
  data/embeddings/component_ids.json    — ordered list of component names

Row i in embeddings.npy corresponds to ids[i] in component_ids.json,
which in turn corresponds to position i in the FAISS index built in Step 5.

Document format (fields ordered so truncation hits Queries last):
  Component: <name>
  Category: <category>
  Description: <description>
  Tags: <tag1>, <tag2>, ...
  Props: <prop_name> (<type>), ...
  Accessibility: <notes>
  Queries: <q1>. <q2>. ...

No API calls. Model is downloaded once to data/models/ then reused.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from pathlib import Path

import numpy as np


# ─────────────────────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────────────────────

@dataclass
class EmbeddingConfig:
    model_name: str
    model_cache_dir: Path
    batch_size: int
    normalize_embeddings: bool
    embeddings_file: Path
    ids_file: Path


def load_embedding_config(settings: dict, project_root: Path) -> EmbeddingConfig:
    e = settings["embedding"]
    return EmbeddingConfig(
        model_name=e["model_name"],
        model_cache_dir=project_root / e["model_cache_dir"],
        batch_size=int(e["batch_size"]),
        normalize_embeddings=bool(e["normalize_embeddings"]),
        embeddings_file=project_root / e["embeddings_file"],
        ids_file=project_root / e["ids_file"],
    )


# ─────────────────────────────────────────────────────────────
# Pipeline
# ─────────────────────────────────────────────────────────────

class EmbeddingPipeline:
    """
    Encodes every component in the metadata store into a 384-dim
    L2-normalised vector using all-MiniLM-L6-v2.
    """

    def __init__(self, config: EmbeddingConfig) -> None:
        self._cfg = config
        self._model = None          # lazy-loaded on first call to embed_all()
        self._log = logging.getLogger(self.__class__.__name__)

    # ── Public API ────────────────────────────────────────────

    def embed_all(self, data: dict) -> tuple[np.ndarray, list[str], list[dict]]:
        """
        Build documents from component metadata, encode, and normalise.

        Returns
        -------
        embeddings   : np.ndarray shape (N, 384) float32, L2-normalised
        ids          : list[str]  — component names, same order as rows
        stats        : list[dict] — per-component diagnostic info for report
        """
        components = data.get("components", [])
        if not components:
            raise ValueError("No components found in metadata.")

        documents, ids, stats = self._build_documents(components)

        self._log.info("Encoding %d documents with %s ...", len(documents), self._cfg.model_name)
        model = self._load_model()

        embeddings: np.ndarray = model.encode(
            documents,
            batch_size=self._cfg.batch_size,
            normalize_embeddings=self._cfg.normalize_embeddings,
            show_progress_bar=True,
            convert_to_numpy=True,
        )

        # Guarantee float32 (some torch builds return float16)
        embeddings = embeddings.astype(np.float32)

        actual_dim = embeddings.shape[1]
        self._log.info(
            "Done. Shape: %s  dtype: %s  dim: %d",
            embeddings.shape, embeddings.dtype, actual_dim,
        )
        return embeddings, ids, stats

    def save(self, embeddings: np.ndarray, ids: list[str]) -> tuple[Path, Path]:
        """Persist embeddings.npy and component_ids.json. Returns (emb_path, ids_path)."""
        emb_path = self._cfg.embeddings_file
        emb_path.parent.mkdir(parents=True, exist_ok=True)
        np.save(str(emb_path), embeddings)
        self._log.info("Saved embeddings → %s", emb_path)

        ids_path = self._cfg.ids_file
        with ids_path.open("w", encoding="utf-8") as fh:
            json.dump(ids, fh, indent=2)
        self._log.info("Saved component IDs → %s", ids_path)

        return emb_path, ids_path

    # ── Private helpers ───────────────────────────────────────

    def _load_model(self):
        if self._model is None:
            # Import here so the module can be imported without torch installed
            from sentence_transformers import SentenceTransformer  # type: ignore
            self._log.info(
                "Loading model '%s' (cache: %s) ...",
                self._cfg.model_name,
                self._cfg.model_cache_dir,
            )
            self._cfg.model_cache_dir.mkdir(parents=True, exist_ok=True)
            self._model = SentenceTransformer(
                self._cfg.model_name,
                cache_folder=str(self._cfg.model_cache_dir),
            )
        return self._model

    def _build_documents(
        self, components: list[dict]
    ) -> tuple[list[str], list[str], list[dict]]:
        """
        Construct one text document per component.
        Returns (documents, ids, stats).
        """
        documents: list[str] = []
        ids: list[str] = []
        stats: list[dict] = []

        for comp in components:
            doc = self._build_document(comp)
            documents.append(doc)
            ids.append(comp["component_name"])
            stats.append(
                {
                    "component_name": comp["component_name"],
                    "category": comp["category"],
                    "char_count": len(doc),
                    "tokens_approx": self._estimate_tokens(doc),
                    "prop_count": len(comp.get("props", [])),
                    "tag_count": len(comp.get("tags", [])),
                    "query_count": len(comp.get("synthetic_queries", [])),
                    "document": doc,
                }
            )

        return documents, ids, stats

    @staticmethod
    def _build_document(comp: dict) -> str:
        """
        Concatenate all semantic fields into a single string.

        Field order ensures the most important content (name, category,
        description, tags, props) appears first and is never truncated
        by the model's 256-token limit. Queries are placed last because
        they are longest and most redundant with tags.
        """
        parts: list[str] = []

        parts.append(f"Component: {comp['component_name']}")
        parts.append(f"Category: {comp['category']}")

        desc = (comp.get("description") or "").strip()
        if desc:
            parts.append(f"Description: {desc}")

        tags: list[str] = comp.get("tags") or []
        if tags:
            parts.append(f"Tags: {', '.join(tags)}")

        props: list[dict] = comp.get("props") or []
        if props:
            prop_strs = [
                f"{p['name']} ({p.get('type', 'any')})"
                for p in props
            ]
            parts.append(f"Props: {', '.join(prop_strs)}")

        a11y = (comp.get("accessibility_notes") or "").strip()
        if a11y:
            parts.append(f"Accessibility: {a11y}")

        queries: list[str] = comp.get("synthetic_queries") or []
        if queries:
            parts.append(f"Queries: {'. '.join(queries)}")

        return "\n".join(parts)

    @staticmethod
    def _estimate_tokens(text: str) -> int:
        """
        Rough token count estimate: BERT-style tokenisers average ~1.3
        tokens per whitespace-delimited word due to subword splitting.
        """
        return int(len(text.split()) * 1.3)
