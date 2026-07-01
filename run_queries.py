"""
Entry point — Step 3: Synthetic Query Generation

Run from the project root:
    python run_queries.py

Input:  data/metadata.json          (produced by run_metadata.py)
Output: data/metadata_with_queries.json

Adds a `synthetic_queries` list to every component entry.
These queries are embedded alongside descriptions and tags in Step 4
to bridge the vocabulary gap between developer intent and component code.
"""

from __future__ import annotations

import copy
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from scripts.config_loader import find_project_root, load_settings, setup_logging
from scripts.metadata.query_generator import QueryGenerator, load_query_config


# ─────────────────────────────────────────────────────────────
# Report
# ─────────────────────────────────────────────────────────────

def print_report(data: dict, config_min: int, config_max: int) -> None:
    components = data["components"]
    total = len(components)

    # Collect stats
    query_counts = [len(c.get("synthetic_queries", [])) for c in components]
    total_queries = sum(query_counts)
    avg_queries = total_queries / total if total else 0
    min_q = min(query_counts) if query_counts else 0
    max_q = max(query_counts) if query_counts else 0

    # Components below minimum (shouldn't happen with curated queries)
    below_min = [
        c["component_name"]
        for c in components
        if len(c.get("synthetic_queries", [])) < config_min
    ]

    print("\n" + "=" * 65)
    print("  SYNTHETIC QUERY GENERATION REPORT")
    print("=" * 65)
    print(f"  Components processed  : {total}")
    print(f"  Total queries created : {total_queries}")
    print(f"  Average per component : {avg_queries:.1f}")
    print(f"  Min queries           : {min_q}  (threshold: {config_min})")
    print(f"  Max queries           : {max_q}  (cap: {config_max})")

    if below_min:
        print(f"\n  [WARNING] {len(below_min)} component(s) below minimum query count:")
        for name in below_min:
            print(f"    - {name}")

    print()

    # Per-category breakdown
    by_cat: dict[str, list[dict]] = {}
    for c in components:
        by_cat.setdefault(c["category"], []).append(c)

    for cat in sorted(by_cat):
        comps = by_cat[cat]
        print(f"  [{cat.upper()}]  ({len(comps)} components)")
        for c in comps:
            queries = c.get("synthetic_queries", [])
            flag = " [LOW]" if len(queries) < config_min else ""
            print(
                f"    {c['component_name']:<22}"
                f"  queries: {len(queries)}{flag}"
            )
            # Show first 2 queries as a sample
            for q in queries[:2]:
                print(f"      - {q}")
        print()

    print("=" * 65 + "\n")


# ─────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────

def main() -> int:
    project_root = find_project_root()
    settings = load_settings(project_root)
    setup_logging(settings)

    config = load_query_config(settings, project_root)

    # Validate input
    if not config.metadata_file.exists():
        print(
            f"[ERROR] Metadata file not found: {config.metadata_file}\n"
            "Run `python run_metadata.py` first.",
            file=sys.stderr,
        )
        return 1

    # Load metadata
    with config.metadata_file.open(encoding="utf-8") as fh:
        data = json.load(fh)

    components = data.get("components", [])
    if not components:
        print("[ERROR] No components found in metadata file.", file=sys.stderr)
        return 1

    # Generate queries
    generator = QueryGenerator(
        min_queries=config.min_queries,
        max_queries=config.max_queries,
    )

    output = copy.deepcopy(data)
    for comp in output["components"]:
        comp["synthetic_queries"] = generator.generate(
            component_name=comp["component_name"],
            category=comp["category"],
        )

    # Save
    config.output_file.parent.mkdir(parents=True, exist_ok=True)
    with config.output_file.open("w", encoding="utf-8") as fh:
        json.dump(output, fh, indent=2, ensure_ascii=False)

    print_report(output, config.min_queries, config.max_queries)
    print(f"[OK] Queries written to: {config.output_file}\n")
    return 0


if __name__ == "__main__":
    sys.exit(main())
