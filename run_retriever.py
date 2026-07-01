"""
Entry point — Step 6: Retriever

Two modes:

  Batch test (default):
      python run_retriever.py
      Runs 10 predefined test queries covering the full query-to-result path
      and verifies the expected component appears in the top-3.

  Interactive REPL:
      python run_retriever.py --interactive
      Type any query and see ranked results. Type 'quit' to exit.

  Single query:
      python run_retriever.py --query "I need a login form"
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from scripts.config_loader import find_project_root, load_settings, setup_logging
from scripts.retriever import create_retriever, RetrievalResult


# ─────────────────────────────────────────────────────────────
# Batch test queries  {query: expected_top1_component}
# ─────────────────────────────────────────────────────────────

_BATCH_TESTS: list[tuple[str, str | None]] = [
    # (query, expected_rank1)  None = expect no results
    ("I need a login form",                          "LoginForm"),
    ("show a loading spinner while data fetches",    "Spinner"),
    ("hero section for my landing page",             "Hero"),
    ("multi-step checkout wizard",                   "Steps"),
    ("display a data table with sortable columns",   "Table"),
    ("show a success notification that fades out",   "Toast"),
    ("user profile card with bio and avatar",        "ProfileCard"),
    ("pricing plan cards for a SaaS product",        "PricingCard"),
    ("breadcrumb trail showing current page path",   "Breadcrumb"),
    ("quantum physics formula derivation",           None),       # no result expected
]


# ─────────────────────────────────────────────────────────────
# Display helpers
# ─────────────────────────────────────────────────────────────

def _bar(width: int = 65) -> str:
    return "-" * width


def display_results(query: str, results: list[RetrievalResult], no_result_msg: str) -> None:
    print(f"\n  Query : {query!r}")
    print("  " + _bar())

    if not results:
        print(f"  {no_result_msg}")
        print()
        return

    for r in results:
        prop_names = ", ".join(p["name"] for p in r.props[:5])
        if len(r.props) > 5:
            prop_names += f" (+{len(r.props) - 5} more)"

        print(
            f"  Rank {r.rank}  {r.component_name:<20}  "
            f"[{r.category}]  score: {r.score:.4f}"
        )
        # Truncate description at 80 chars
        desc = r.description
        if len(desc) > 80:
            desc = desc[:77] + "..."
        print(f"         {desc}")
        print(f"         Import : {r.import_path}")
        if prop_names:
            print(f"         Props  : {prop_names}")
        print()


# ─────────────────────────────────────────────────────────────
# Batch test
# ─────────────────────────────────────────────────────────────

def run_batch_tests(retriever, no_result_msg: str) -> int:
    passed = 0
    failed_list = []

    print("\n" + "=" * 65)
    print("  RETRIEVER BATCH TEST")
    print("=" * 65)

    for query, expected in _BATCH_TESTS:
        results = retriever.retrieve(query)
        rank1 = results[0].component_name if results else None

        if expected is None:
            # Expect no results
            ok = (rank1 is None)
        else:
            ok = (rank1 == expected)

        status = "[OK]  " if ok else "[FAIL]"
        rank1_str = rank1 if rank1 else "(no result)"
        exp_str = expected if expected else "(no result)"
        score_str = f"{results[0].score:.4f}" if results else "—"

        print(f"  {status}  {query[:45]:<45}  got: {rank1_str}  score: {score_str}")
        if ok:
            passed += 1
        else:
            failed_list.append((query, expected, rank1))

    print()
    print(f"  Result: {passed}/{len(_BATCH_TESTS)} tests passed")
    if failed_list:
        print("\n  Failed queries:")
        for q, exp, got in failed_list:
            print(f"    - {q!r}  expected: {exp}  got: {got}")

    print("=" * 65 + "\n")
    return 0 if not failed_list else 1


# ─────────────────────────────────────────────────────────────
# Single query
# ─────────────────────────────────────────────────────────────

def run_single_query(retriever, query: str, no_result_msg: str) -> None:
    results = retriever.retrieve(query)
    display_results(query, results, no_result_msg)


# ─────────────────────────────────────────────────────────────
# Interactive REPL
# ─────────────────────────────────────────────────────────────

def run_interactive(retriever, no_result_msg: str) -> None:
    print("\n  Retriever REPL — type a query, 'quit' to exit.")
    print("  " + _bar())
    while True:
        try:
            query = input("\n  > ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\n  Exiting.")
            break
        if not query:
            continue
        if query.lower() in {"quit", "exit", "q"}:
            print("  Exiting.")
            break
        results = retriever.retrieve(query)
        display_results(query, results, no_result_msg)


# ─────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser(description="Retriever — Step 6")
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--interactive", "-i", action="store_true",
                       help="Start interactive REPL")
    group.add_argument("--query", "-q", type=str,
                       help="Run a single query and exit")
    args = parser.parse_args()

    project_root = find_project_root()
    settings = load_settings(project_root)
    setup_logging(settings)

    no_result_msg = settings["generator"]["no_result_message"]

    # Validate FAISS index exists before loading model
    from pathlib import Path as _Path
    index_file = project_root / settings["vector_store"]["index_file"]
    if not index_file.exists():
        print(
            f"[ERROR] FAISS index not found: {index_file}\n"
            "Run `python run_vector_store.py` first.",
            file=sys.stderr,
        )
        return 1

    print("\n[Step 6] Loading retriever (model + FAISS index) ...")
    retriever = create_retriever(settings, project_root)
    retriever.load()
    print("[Step 6] Retriever ready.\n")

    if args.query:
        run_single_query(retriever, args.query, no_result_msg)
        return 0

    if args.interactive:
        run_interactive(retriever, no_result_msg)
        return 0

    # Default: batch test
    return run_batch_tests(retriever, no_result_msg)


if __name__ == "__main__":
    sys.exit(main())
