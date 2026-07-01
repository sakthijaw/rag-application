"""
FAISS Vector Store — Step 5

Responsibilities:
  build()  — create IndexFlatIP, add all component embeddings, save to disk
  load()   — load index.faiss + metadata_store.json from disk
  search() — given one L2-normalised query vector, return ranked SearchResults

Saved artifacts:
  data/faiss_index/index.faiss          — binary FAISS index (exact inner product)
  data/faiss_index/metadata_store.json  — position-ordered list of component metadata

Position contract (must be maintained across Steps 4, 5, 6):
  embeddings.npy row i  ==  component_ids.json[i]  ==  FAISS position i
  ==  metadata_store.json["store"][i]

This contract is established here at build time: we iterate embeddings and ids
in the same order they came from Step 4, and store metadata in that same order.
FAISS preserves insertion order, so position i always refers to the same component.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

import numpy as np


# ─────────────────────────────────────────────────────────────
# Fields stored in the metadata store per component.
# Everything the Retriever and Generator need — no file reads
# required at query time.
# ─────────────────────────────────────────────────────────────

_STORE_FIELDS = (
    "component_name",
    "category",
    "description",
    "import_path",
    "file_path",
    "props",
    "slots",
    "tags",
    "accessibility_notes",
    "usage_example",
    "confidence",
    "synthetic_queries",
)


# ─────────────────────────────────────────────────────────────
# Data types
# ─────────────────────────────────────────────────────────────

@dataclass
class SearchResult:
    """One ranked result returned by FAISSStore.search()."""
    position: int           # row index in the FAISS index
    component_name: str     # human-readable name
    score: float            # cosine similarity 0.0 – 1.0
    metadata: dict          # full component entry from metadata_store


@dataclass
class VectorStoreConfig:
    index_type: str
    dimension: int
    index_file: Path
    metadata_file: Path


def load_vector_store_config(settings: dict, project_root: Path) -> VectorStoreConfig:
    vs = settings["vector_store"]
    return VectorStoreConfig(
        index_type=vs["index_type"],
        dimension=int(vs["dimension"]),
        index_file=project_root / vs["index_file"],
        metadata_file=project_root / vs["metadata_file"],
    )


# ─────────────────────────────────────────────────────────────
# Store
# ─────────────────────────────────────────────────────────────

class FAISSStore:
    """
    Thin wrapper around a FAISS IndexFlatIP that adds:
      - metadata persistence (position → component data)
      - score-threshold filtering on search results
      - clear build/load/search API
    """

    def __init__(self, config: VectorStoreConfig) -> None:
        self._cfg = config
        self._index = None      # faiss.Index, populated by build() or load()
        self._store: list[dict] = []    # metadata_store["store"] list
        self._log = logging.getLogger(self.__class__.__name__)

    # ── Build ─────────────────────────────────────────────────

    def build(
        self,
        embeddings: np.ndarray,
        ids: list[str],
        components: list[dict],
    ) -> None:
        """
        Create a new FAISS IndexFlatIP from the given embeddings.
        Save the binary index and a JSON metadata store to disk.

        Parameters
        ----------
        embeddings  : (N, D) float32 array, already L2-normalised
        ids         : component names in the same row order as embeddings
        components  : full component dicts from metadata_with_queries.json
        """
        import faiss  # type: ignore

        n, dim = embeddings.shape
        if dim != self._cfg.dimension:
            raise ValueError(
                f"Embedding dimension {dim} does not match config dimension "
                f"{self._cfg.dimension}. Update vector_store.dimension in settings.yaml."
            )

        self._log.info("Building IndexFlatIP — %d vectors × %d dims", n, dim)
        index = faiss.IndexFlatIP(dim)
        index.add(embeddings)
        self._log.info("Index contains %d vectors", index.ntotal)

        # Save binary index
        self._cfg.index_file.parent.mkdir(parents=True, exist_ok=True)
        faiss.write_index(index, str(self._cfg.index_file))
        self._log.info("FAISS index saved → %s", self._cfg.index_file)

        # Build metadata store: list[dict] ordered by FAISS position
        id_to_comp = {c["component_name"]: c for c in components}
        store: list[dict] = []
        for pos, name in enumerate(ids):
            comp = id_to_comp[name]
            entry = {k: comp.get(k) for k in _STORE_FIELDS}
            entry["position"] = pos
            store.append(entry)

        meta_payload = {
            "build_info": {
                "built_at": datetime.now().isoformat(timespec="seconds"),
                "model": "all-MiniLM-L6-v2",
                "index_type": self._cfg.index_type,
                "dimension": dim,
                "n_components": n,
            },
            "store": store,
        }
        with self._cfg.metadata_file.open("w", encoding="utf-8") as fh:
            json.dump(meta_payload, fh, indent=2, ensure_ascii=False)
        self._log.info("Metadata store saved → %s", self._cfg.metadata_file)

        # Keep in memory for immediate use (no need to reload)
        self._index = index
        self._store = store

    # ── Load ──────────────────────────────────────────────────

    def load(self) -> None:
        """Load a previously built index and metadata store from disk."""
        import faiss  # type: ignore

        if not self._cfg.index_file.exists():
            raise FileNotFoundError(
                f"FAISS index not found: {self._cfg.index_file}\n"
                "Run `python run_vector_store.py` to build it."
            )
        if not self._cfg.metadata_file.exists():
            raise FileNotFoundError(
                f"Metadata store not found: {self._cfg.metadata_file}\n"
                "Run `python run_vector_store.py` to build it."
            )

        self._index = faiss.read_index(str(self._cfg.index_file))
        self._log.info(
            "Loaded FAISS index: %d vectors, dim %d",
            self._index.ntotal, self._cfg.dimension,
        )

        with self._cfg.metadata_file.open(encoding="utf-8") as fh:
            payload = json.load(fh)
        self._store = payload["store"]
        self._log.info("Loaded metadata store: %d entries", len(self._store))

    # ── Search ────────────────────────────────────────────────

    def search(
        self,
        query_vector: np.ndarray,
        top_k: int,
        score_threshold: float = 0.0,
    ) -> list[SearchResult]:
        """
        Search the index for the top_k most similar components.

        Parameters
        ----------
        query_vector    : 1-D or (1, D) float32, must be L2-normalised
        top_k           : maximum number of results to return
        score_threshold : discard results with cosine similarity below this

        Returns
        -------
        List of SearchResult, sorted by score descending.
        Empty list if no result meets the threshold.
        """
        if self._index is None:
            raise RuntimeError("Index is not ready. Call build() or load() first.")

        # Ensure shape (1, D) and float32
        vec = np.array(query_vector, dtype=np.float32)
        if vec.ndim == 1:
            vec = vec.reshape(1, -1)

        scores_arr, positions_arr = self._index.search(vec, top_k)

        results: list[SearchResult] = []
        for score, pos in zip(scores_arr[0], positions_arr[0]):
            if int(pos) == -1:          # FAISS padding when k > index size
                continue
            s = float(score)
            if s < score_threshold:
                continue
            results.append(
                SearchResult(
                    position=int(pos),
                    component_name=self._store[int(pos)]["component_name"],
                    score=round(s, 6),
                    metadata=self._store[int(pos)],
                )
            )

        # Already sorted by FAISS (descending score), but be explicit
        results.sort(key=lambda r: r.score, reverse=True)
        return results

    # ── Properties ───────────────────────────────────────────

    @property
    def n_vectors(self) -> int:
        return self._index.ntotal if self._index else 0

    @property
    def is_ready(self) -> bool:
        return self._index is not None and bool(self._store)
