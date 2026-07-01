"""
Retriever — Step 6

The first online-pipeline component. Converts a plain text query into a
ranked list of matching components using:

  query string
      │  embed with all-MiniLM-L6-v2 (same model used at index time)
      │  L2-normalise
      ▼
  query vector (384-dim float32)
      │  FAISS IndexFlatIP.search(top_k)
      ▼
  (score, position) pairs
      │  filter by score_threshold
      │  optional category_filter
      │  hydrate from metadata_store
      ▼
  list[RetrievalResult] sorted by score descending

Returns an empty list (never raises) when no component clears the
score threshold. The Generator (Step 7) converts that to the
configured no_result_message.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

from scripts.embeddings import EmbeddingPipeline, EmbeddingConfig, load_embedding_config
from scripts.vector_store import FAISSStore, VectorStoreConfig, load_vector_store_config


# ─────────────────────────────────────────────────────────────
# Result type returned to callers (Generator, CLI, API)
# ─────────────────────────────────────────────────────────────

@dataclass
class RetrievalResult:
    """
    One ranked result from the retriever.
    All fields the Generator needs are present here — no further
    file reads required at query time.
    """
    rank: int
    component_name: str
    category: str
    score: float                    # cosine similarity, 0.0 – 1.0
    description: str
    import_path: str
    file_path: str
    props: list[dict] = field(default_factory=list)
    slots: list[dict] = field(default_factory=list)
    tags: list[str] = field(default_factory=list)
    accessibility_notes: str = ""
    usage_example: str = ""
    confidence: float = 1.0

    def to_dict(self) -> dict:
        return {
            "rank": self.rank,
            "component_name": self.component_name,
            "category": self.category,
            "score": self.score,
            "description": self.description,
            "import_path": self.import_path,
            "file_path": self.file_path,
            "props": self.props,
            "slots": self.slots,
            "tags": self.tags,
            "accessibility_notes": self.accessibility_notes,
            "usage_example": self.usage_example,
            "confidence": self.confidence,
        }


# ─────────────────────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────────────────────

@dataclass
class RetrieverConfig:
    top_k: int
    score_threshold: float
    rerank: bool


def load_retriever_config(settings: dict) -> RetrieverConfig:
    r = settings["retriever"]
    return RetrieverConfig(
        top_k=int(r["top_k"]),
        score_threshold=float(r["score_threshold"]),
        rerank=bool(r.get("rerank", False)),
    )


# ─────────────────────────────────────────────────────────────
# Factory
# ─────────────────────────────────────────────────────────────

def create_retriever(settings: dict, project_root: Path) -> "Retriever":
    """Wire up and return a ready-to-use Retriever from settings."""
    return Retriever(
        retriever_cfg=load_retriever_config(settings),
        embedding_cfg=load_embedding_config(settings, project_root),
        vector_store_cfg=load_vector_store_config(settings, project_root),
    )


# ─────────────────────────────────────────────────────────────
# Retriever
# ─────────────────────────────────────────────────────────────

class Retriever:
    """
    Query → embed → FAISS search → filter → RetrievalResult list.

    Model and index are lazy-loaded on the first call to retrieve()
    so that instantiation is fast. Call load() explicitly at web-server
    startup to pay the cost up front.
    """

    def __init__(
        self,
        retriever_cfg: RetrieverConfig,
        embedding_cfg: EmbeddingConfig,
        vector_store_cfg: VectorStoreConfig,
    ) -> None:
        self._rcfg = retriever_cfg
        self._ecfg = embedding_cfg
        self._vcfg = vector_store_cfg
        self._pipeline: EmbeddingPipeline | None = None
        self._store: FAISSStore | None = None
        self._log = logging.getLogger(self.__class__.__name__)

    # ── Public API ────────────────────────────────────────────

    def load(self) -> None:
        """
        Pre-load the embedding model and FAISS index.
        Optional — retrieve() calls this lazily if not already done.
        Useful for web-server startup to avoid cold-start latency.
        """
        self._get_pipeline()
        self._get_store()
        self._log.info("Retriever ready (model + index loaded).")

    def retrieve(
        self,
        query: str,
        top_k: int | None = None,
        category_filter: str | None = None,
    ) -> list[RetrievalResult]:
        """
        Retrieve the most relevant components for a natural language query.

        Parameters
        ----------
        query           : plain text developer query, e.g. "I need a login form"
        top_k           : override the configured top_k for this call
        category_filter : restrict results to one category (e.g. "auth", "forms")

        Returns
        -------
        List of RetrievalResult sorted by score descending.
        Empty list if no component meets the score threshold.
        """
        query = query.strip()
        if not query:
            return []

        k = top_k if top_k is not None else self._rcfg.top_k
        self._log.debug("Retrieving top %d for query: %r", k, query)

        # 1. Embed + normalise query
        query_vec = self._embed_query(query)

        # 2. FAISS search
        store = self._get_store()
        raw_hits = store.search(
            query_vec,
            top_k=k,
            score_threshold=self._rcfg.score_threshold,
        )

        # 3. Optional category filter (applied after threshold so counts are honest)
        if category_filter:
            raw_hits = [
                h for h in raw_hits
                if h.metadata.get("category", "").lower() == category_filter.lower()
            ]

        # 4. Hydrate into RetrievalResult
        results: list[RetrievalResult] = []
        for rank, hit in enumerate(raw_hits, start=1):
            m = hit.metadata
            results.append(
                RetrievalResult(
                    rank=rank,
                    component_name=m.get("component_name", ""),
                    category=m.get("category", ""),
                    score=hit.score,
                    description=m.get("description", ""),
                    import_path=m.get("import_path", ""),
                    file_path=m.get("file_path", ""),
                    props=m.get("props") or [],
                    slots=m.get("slots") or [],
                    tags=m.get("tags") or [],
                    accessibility_notes=m.get("accessibility_notes", ""),
                    usage_example=m.get("usage_example", ""),
                    confidence=m.get("confidence", 1.0),
                )
            )

        self._log.debug(
            "Query %r → %d result(s) (threshold %.2f)",
            query, len(results), self._rcfg.score_threshold,
        )
        return results

    # ── Private helpers ───────────────────────────────────────

    def _embed_query(self, query: str) -> np.ndarray:
        """
        Encode a single query string into a 384-dim L2-normalised vector.
        Uses the same model and normalisation as the index-build step.
        """
        pipeline = self._get_pipeline()
        model = pipeline._load_model()
        vec: np.ndarray = model.encode(
            [query],
            normalize_embeddings=True,
            convert_to_numpy=True,
        )
        return vec[0].astype(np.float32)

    def _get_pipeline(self) -> EmbeddingPipeline:
        if self._pipeline is None:
            self._log.info("Loading embedding model (%s) ...", self._ecfg.model_name)
            self._pipeline = EmbeddingPipeline(self._ecfg)
            self._pipeline._load_model()
        return self._pipeline

    def _get_store(self) -> FAISSStore:
        if self._store is None:
            self._log.info("Loading FAISS index ...")
            self._store = FAISSStore(self._vcfg)
            self._store.load()
        return self._store
