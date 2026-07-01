"""
Entry point — Step 5: FAISS Vector Store

Run from the project root:
    python run_vector_store.py

Inputs:
  data/embeddings/embeddings.npy        (Step 4)
  data/embeddings/component_ids.json    (Step 4)
  data/metadata_with_queries.json       (Step 3)

Outputs:
  data/faiss_index/index.faiss          — binary FAISS index
  data/faiss_index/metadata_store.json  — position → component metadata

After building, runs a self-test by searching with known component
vectors and verifying the correct component is returned at rank 1.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))

from scripts.config_loader import find_project_root, load_settings, setup_logging
from scripts.vector_store import FAISSStore, load_vector_store_config


# ─────────────────────────────────────────────────────────────
# Self-test: search with known embeddings
# ─────────────────────────────────────────────────────────────

_SELF_TEST_COMPONENTS = [
    "LoginForm",
    "Button",
    "Hero",
    "Table",
    "Modal",
]


def run_self_test(
    store: FAISSStore,
    embeddings: np.ndarray,
    ids: list[str],
    score_threshold: float,
) -> list[dict]:
    """
    For each test component, search using its own embedding.
    Rank-1 result must be itself with score ≈ 1.0.
    Returns list of result dicts for the report.
    """
    results = []
    for name in _SELF_TEST_COMPONENTS:
        if name not in ids:
            continue
        pos = ids.index(name)
        hits = store.search(embeddings[pos], top_k=3, score_threshold=score_threshold)
        rank1 = hits[0] if hits else None
        passed = rank1 is not None and rank1.component_name == name
        results.append(
            {
                "query_component": name,
                "rank1_name": rank1.component_name if rank1 else "—",
                "rank1_score": rank1.score if rank1 else 0.0,
                "rank2_name": hits[1].component_name if len(hits) > 1 else "—",
                "rank2_score": hits[1].score if len(hits) > 1 else 0.0,
                "rank3_name": hits[2].component_name if len(hits) > 2 else "—",
                "rank3_score": hits[2].score if len(hits) > 2 else 0.0,
                "passed": passed,
            }
        )
    return results


# ─────────────────────────────────────────────────────────────
# Report
# ─────────────────────────────────────────────────────────────

def print_report(
    store: FAISSStore,
    cfg,
    self_test_results: list[dict],
) -> None:
    index_size_kb = cfg.index_file.stat().st_size / 1024
    meta_size_kb = cfg.metadata_file.stat().st_size / 1024
    passed = sum(1 for r in self_test_results if r["passed"])
    total = len(self_test_results)

    print("\n" + "=" * 65)
    print("  FAISS VECTOR STORE REPORT")
    print("=" * 65)
    print(f"  Index type            : {cfg.index_type}")
    print(f"  Dimension             : {cfg.dimension}")
    print(f"  Vectors stored        : {store.n_vectors}")
    print(f"  Index file size       : {index_size_kb:.1f} KB")
    print(f"  Metadata store size   : {meta_size_kb:.1f} KB")
    print(f"  Self-test             : {passed}/{total} passed")
    print()

    print("  Self-test (search each component with its own embedding):")
    print(f"  {'Component':<20}  {'Rank1':<20}  {'Score':>7}  {'Rank2':<18}  {'Rank3':<18}  {'OK?'}")
    print("  " + "-" * 96)
    for r in self_test_results:
        ok = "[OK]" if r["passed"] else "[FAIL]"
        print(
            f"  {r['query_component']:<20}"
            f"  {r['rank1_name']:<20}"
            f"  {r['rank1_score']:>7.4f}"
            f"  {r['rank2_name']:<18}"
            f"  {r['rank3_name']:<18}"
            f"  {ok}"
        )

    print()
    print(f"  Index file     : {cfg.index_file}")
    print(f"  Metadata store : {cfg.metadata_file}")
    print("=" * 65 + "\n")


# ─────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────

def main() -> int:
    project_root = find_project_root()
    settings = load_settings(project_root)
    setup_logging(settings)

    vs_cfg = load_vector_store_config(settings, project_root)

    # ── Load inputs ──────────────────────────────────────────
    emb_file = project_root / settings["embedding"]["embeddings_file"]
    ids_file = project_root / settings["embedding"]["ids_file"]
    meta_file = project_root / settings["metadata"]["queries_output_file"]

    for path, name in [
        (emb_file, "embeddings.npy"),
        (ids_file, "component_ids.json"),
        (meta_file, "metadata_with_queries.json"),
    ]:
        if not path.exists():
            step = "run_embeddings.py" if "embed" in str(path) else "run_queries.py"
            print(f"[ERROR] {name} not found: {path}\nRun `python {step}` first.", file=sys.stderr)
            return 1

    embeddings: np.ndarray = np.load(str(emb_file))
    with ids_file.open(encoding="utf-8") as fh:
        ids: list[str] = json.load(fh)
    with meta_file.open(encoding="utf-8") as fh:
        meta_data: dict = json.load(fh)

    components: list[dict] = meta_data.get("components", [])
    if not components:
        print("[ERROR] No components found in metadata file.", file=sys.stderr)
        return 1

    n, dim = embeddings.shape
    print(f"\n[Step 5] Building FAISS {vs_cfg.index_type} index — {n} vectors × {dim} dims ...")

    # ── Build ────────────────────────────────────────────────
    store = FAISSStore(vs_cfg)
    try:
        store.build(embeddings, ids, components)
    except Exception as exc:
        print(f"[ERROR] Build failed: {exc}", file=sys.stderr)
        return 1

    # ── Self-test ────────────────────────────────────────────
    score_threshold = float(settings["retriever"]["score_threshold"])
    self_test_results = run_self_test(store, embeddings, ids, score_threshold)

    # ── Report ───────────────────────────────────────────────
    print_report(store, vs_cfg, self_test_results)

    failed = [r for r in self_test_results if not r["passed"]]
    if failed:
        print(f"[WARN] {len(failed)} self-test(s) failed:", file=sys.stderr)
        for r in failed:
            print(f"  {r['query_component']}: expected rank-1 self, got {r['rank1_name']}", file=sys.stderr)
        return 1

    print(f"[OK] Step 5 complete. FAISS index ready with {store.n_vectors} vectors.\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
