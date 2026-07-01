"""
run_rag.py — End-to-end RAG pipeline entry point

Full pipeline: query → retrieve → generate → display

Modes:
  Demo (default):
      python run_rag.py
      Runs 5 showcase queries and prints formatted results.

  Single query:
      python run_rag.py --query "I need a login form"

  Interactive REPL:
      python run_rag.py --interactive

Requirements:
  GROQ_API_KEY must be set in .env or the environment.
"""

from __future__ import annotations

import argparse
import sys
import textwrap
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from scripts.config_loader import find_project_root, load_settings, setup_logging, load_env
from scripts.retriever import create_retriever
from scripts.generator import Generator, GeneratorResponse, load_generator_config


# ─────────────────────────────────────────────────────────────
# Demo queries
# ─────────────────────────────────────────────────────────────

_DEMO_QUERIES = [
    "I need a login form with email and password",
    "show a loading skeleton while content is fetching",
    "build a hero section for my SaaS landing page",
    "display recent user activity in my admin dashboard",
    "what component should I use to calculate a derivative",   # no match
]


# ─────────────────────────────────────────────────────────────
# Display
# ─────────────────────────────────────────────────────────────

_W = 65


def _rule(char: str = "=") -> str:
    return char * _W


def display_response(resp: GeneratorResponse, show_scores: bool = False) -> None:
    print()
    print(_rule())
    print("  RAG RESPONSE")
    print(_rule())
    print(f"  Query : {resp.query!r}")
    print()

    # ── No match ──────────────────────────────────────────────
    if resp.no_match:
        print(f"  {resp.message}")
        if show_scores and resp.retrieval_scores:
            print()
            print("  (Retrieved but below threshold:)")
            for name, score in sorted(
                resp.retrieval_scores.items(), key=lambda x: -x[1]
            ):
                print(f"    {name:<22}  score: {score:.4f}")
        print(_rule())
        print()
        return

    # ── Match found ───────────────────────────────────────────
    score = resp.retrieval_scores.get(resp.chosen_component, 0.0)

    print(f"  Component  : {resp.chosen_component}")
    print(f"  Confidence : {resp.confidence}")
    print(f"  Similarity : {score:.4f}")
    print()

    # Reasoning — wrapped at 60 chars
    if resp.reasoning:
        print("  Why :")
        for line in textwrap.wrap(resp.reasoning, width=60):
            print(f"    {line}")
        print()

    # Import
    print("  Import :")
    print(f"    import {resp.chosen_component} from '{resp.import_path}';")
    print()

    # Usage
    if resp.usage_example:
        print("  Usage :")
        for line in resp.usage_example.strip().splitlines():
            print(f"    {line}")
        print()

    # Props suggested by LLM
    if resp.props_to_use:
        print("  Key props for this query :")
        for p in resp.props_to_use:
            reason = p.get("reason", "")
            val = p.get("suggested_value", "")
            line = f"    {p['name']:<18}  {val}"
            if reason:
                line += f"   # {reason}"
            print(line)
        print()

    # Alternatives
    if resp.alternative_components:
        alts = ", ".join(resp.alternative_components)
        print(f"  Alternatives : {alts}")
        print()

    if show_scores:
        print("  Retrieval scores :")
        for name, sc in sorted(
            resp.retrieval_scores.items(), key=lambda x: -x[1]
        ):
            marker = "  <-- chosen" if name == resp.chosen_component else ""
            print(f"    {name:<22}  {sc:.4f}{marker}")
        print()

    print(_rule())
    print()


# ─────────────────────────────────────────────────────────────
# Pipeline wrapper
# ─────────────────────────────────────────────────────────────

def run_query(retriever, generator: Generator, query: str, verbose: bool = False) -> GeneratorResponse:
    results = retriever.retrieve(query)
    resp = generator.generate(query, results)
    display_response(resp, show_scores=verbose)
    return resp


# ─────────────────────────────────────────────────────────────
# Modes
# ─────────────────────────────────────────────────────────────

def run_demo(retriever, generator: Generator, verbose: bool) -> int:
    print()
    print(_rule("="))
    print("  RAG DEMO — 5 showcase queries")
    print(_rule("="))
    for q in _DEMO_QUERIES:
        run_query(retriever, generator, q, verbose)
    return 0


def run_single(retriever, generator: Generator, query: str, verbose: bool) -> int:
    run_query(retriever, generator, query, verbose)
    return 0


def run_interactive(retriever, generator: Generator, verbose: bool) -> int:
    print()
    print("  RAG REPL — type a query, 'quit' to exit.")
    print("  " + "-" * (_W - 2))
    while True:
        try:
            query = input("\n  > ").strip()
        except (EOFError, KeyboardInterrupt):
            print("\n  Exiting.")
            return 0
        if not query:
            continue
        if query.lower() in {"quit", "exit", "q"}:
            print("  Exiting.")
            return 0
        run_query(retriever, generator, query, verbose)


# ─────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser(description="Astro RAG — component finder")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--interactive", "-i", action="store_true",
                      help="Interactive REPL mode")
    mode.add_argument("--query", "-q", type=str,
                      help="Single query and exit")
    parser.add_argument("--verbose", "-v", action="store_true",
                        help="Show retrieval scores and raw details")
    args = parser.parse_args()

    project_root = find_project_root()
    load_env(project_root)
    settings = load_settings(project_root)
    setup_logging(settings)

    # Pre-flight: check FAISS index exists
    index_file = project_root / settings["vector_store"]["index_file"]
    if not index_file.exists():
        print(
            "[ERROR] FAISS index not found. Run the offline pipeline first:\n"
            "  python run_scanner.py\n"
            "  python run_metadata.py\n"
            "  python run_queries.py\n"
            "  python run_embeddings.py\n"
            "  python run_vector_store.py",
            file=sys.stderr,
        )
        return 1

    # Pre-flight: check GROQ_API_KEY
    import os
    if not os.environ.get("GROQ_API_KEY"):
        print(
            "[ERROR] GROQ_API_KEY is not set.\n"
            "Add it to your .env file:\n"
            "  GROQ_API_KEY=your_key_here",
            file=sys.stderr,
        )
        return 1

    # Load retriever (model + FAISS index)
    print("\n[RAG] Loading retriever ...")
    retriever = create_retriever(settings, project_root)
    retriever.load()

    # Load generator (Groq client, lazy — only connects on first generate())
    gen_cfg = load_generator_config(settings)
    generator = Generator(gen_cfg)
    print(f"[RAG] Generator ready (model: {gen_cfg.model})")
    print()

    if args.interactive:
        return run_interactive(retriever, generator, args.verbose)
    if args.query:
        return run_single(retriever, generator, args.query, args.verbose)
    return run_demo(retriever, generator, args.verbose)


if __name__ == "__main__":
    sys.exit(main())
