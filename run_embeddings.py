"""
Entry point — Step 4: Embedding Pipeline

Run from the project root:
    python run_embeddings.py

Input:  data/metadata_with_queries.json   (produced by run_queries.py)
Output: data/embeddings/embeddings.npy
        data/embeddings/component_ids.json

The model (all-MiniLM-L6-v2, ~22 MB) is downloaded from HuggingFace on
the first run and cached in data/models/. Subsequent runs load from cache
and complete in under 2 seconds.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))

from scripts.config_loader import find_project_root, load_settings, setup_logging
from scripts.embeddings import EmbeddingPipeline, load_embedding_config


# ─────────────────────────────────────────────────────────────
# Report
# ─────────────────────────────────────────────────────────────

_TOKEN_WARN = 220   # flag documents approaching the 256-token model limit


def print_report(
    embeddings: np.ndarray,
    ids: list[str],
    stats: list[dict],
    emb_path: Path,
    ids_path: Path,
    model_name: str,
) -> None:
    n, dim = embeddings.shape

    # Verify L2 norms (should all be 1.0 after normalisation)
    norms = np.linalg.norm(embeddings, axis=1)
    norm_ok = bool(np.allclose(norms, 1.0, atol=1e-5))
    norm_str = "yes (all within 1e-5 of 1.0)" if norm_ok else f"FAILED — min={norms.min():.4f}"

    total_chars = sum(s["char_count"] for s in stats)
    avg_tokens = sum(s["tokens_approx"] for s in stats) / n if n else 0
    max_tokens = max(s["tokens_approx"] for s in stats) if stats else 0
    over_limit = [s for s in stats if s["tokens_approx"] > _TOKEN_WARN]

    print("\n" + "=" * 65)
    print("  EMBEDDING PIPELINE REPORT")
    print("=" * 65)
    print(f"  Model                 : {model_name}")
    print(f"  Embedding dimension   : {dim}")
    print(f"  Components embedded   : {n}")
    print(f"  Output shape          : ({n}, {dim})  float32")
    print(f"  L2 normalised         : {norm_str}")
    print(f"  Avg tokens/doc        : {avg_tokens:.0f}  (model limit: 256)")
    print(f"  Max tokens (any doc)  : {max_tokens}")

    if over_limit:
        print(f"\n  [WARN] {len(over_limit)} doc(s) near the 256-token limit:")
        for s in over_limit:
            print(f"    {s['component_name']:<22}  tokens~{s['tokens_approx']}")

    print()

    # Per-category table
    by_cat: dict[str, list[dict]] = {}
    for s in stats:
        by_cat.setdefault(s["category"], []).append(s)

    for cat in sorted(by_cat):
        comps = by_cat[cat]
        print(f"  [{cat.upper()}]  ({len(comps)} components)")
        for s in comps:
            warn = " !" if s["tokens_approx"] > _TOKEN_WARN else ""
            print(
                f"    {s['component_name']:<22}"
                f"  tags:{s['tag_count']:<3}"
                f"  props:{s['prop_count']:<3}"
                f"  queries:{s['query_count']:<3}"
                f"  tokens~{s['tokens_approx']}{warn}"
            )
        print()

    print(f"  Embeddings saved : {emb_path}")
    print(f"  IDs saved        : {ids_path}")
    print("=" * 65 + "\n")


# ─────────────────────────────────────────────────────────────
# Sanity check: load saved files and verify shape
# ─────────────────────────────────────────────────────────────

def verify_saved(emb_path: Path, ids_path: Path, expected_n: int, expected_dim: int) -> bool:
    try:
        loaded = np.load(str(emb_path))
        with ids_path.open(encoding="utf-8") as fh:
            loaded_ids = json.load(fh)
        assert loaded.shape == (expected_n, expected_dim), \
            f"Shape mismatch: {loaded.shape} vs ({expected_n}, {expected_dim})"
        assert len(loaded_ids) == expected_n, \
            f"ID count mismatch: {len(loaded_ids)} vs {expected_n}"
        return True
    except Exception as exc:
        print(f"[ERROR] Verification failed: {exc}", file=sys.stderr)
        return False


# ─────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────

def main() -> int:
    project_root = find_project_root()
    settings = load_settings(project_root)
    setup_logging(settings)

    cfg = load_embedding_config(settings, project_root)

    # Resolve input file from metadata section
    input_file = project_root / settings["metadata"]["queries_output_file"]
    if not input_file.exists():
        print(
            f"[ERROR] Input file not found: {input_file}\n"
            "Run `python run_queries.py` first.",
            file=sys.stderr,
        )
        return 1

    with input_file.open(encoding="utf-8") as fh:
        data = json.load(fh)

    n_components = len(data.get("components", []))
    if n_components == 0:
        print("[ERROR] No components found in input file.", file=sys.stderr)
        return 1

    print(f"\n[Step 4] Embedding {n_components} components with '{cfg.model_name}' ...")
    print(f"         Model cache: {cfg.model_cache_dir}")
    print(f"         (First run downloads ~22 MB from HuggingFace)\n")

    pipeline = EmbeddingPipeline(cfg)

    try:
        embeddings, ids, stats = pipeline.embed_all(data)
    except Exception as exc:
        print(f"[ERROR] Embedding failed: {exc}", file=sys.stderr)
        return 1

    emb_path, ids_path = pipeline.save(embeddings, ids)

    # Verify the saved files are readable and correct
    dim = embeddings.shape[1]
    ok = verify_saved(emb_path, ids_path, n_components, dim)
    if not ok:
        return 1

    print_report(embeddings, ids, stats, emb_path, ids_path, cfg.model_name)
    print(f"[OK] Step 4 complete. {n_components} components embedded at dim={dim}.\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
