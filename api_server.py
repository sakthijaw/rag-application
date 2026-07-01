"""
API Server — FastAPI wrapper around the RAG pipeline.

Install extra deps:  pip install fastapi uvicorn[standard]
Run:                 python api_server.py

Endpoints:
  GET  /api/health   — health check
  POST /api/search   — { "query": "..." } → component recommendation
"""
from __future__ import annotations

import sys
from pathlib import Path

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

sys.path.insert(0, str(Path(__file__).parent))

from scripts.config_loader import find_project_root, load_settings, setup_logging, load_env
from scripts.retriever import create_retriever
from scripts.generator import Generator, load_generator_config

# ── Bootstrap pipeline (done once at startup) ─────────────────
_root = find_project_root()
load_env(_root)
_settings = load_settings(_root)
setup_logging(_settings)

_retriever = create_retriever(_settings, _root)
_retriever.load()

_gen_cfg = load_generator_config(_settings)
_generator = Generator(_gen_cfg)

# ── App ───────────────────────────────────────────────────────
app = FastAPI(title="Astro Component RAG API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request schema ────────────────────────────────────────────
class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)


# ── Routes ────────────────────────────────────────────────────
@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "model": _gen_cfg.model, "components": 42}


@app.post("/api/search")
def search(req: SearchRequest) -> dict:
    query = req.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    results = _retriever.retrieve(query)
    resp = _generator.generate(query, results)

    if resp.no_match:
        return {"no_match": True, "message": resp.message}

    chosen = next(
        (r for r in results if r.component_name == resp.chosen_component), None
    )

    props = [
        {
            "name": p.get("name", ""),
            "type": p.get("type", "any"),
            "required": bool(p.get("required", False)),
            "default": p.get("default"),
            "description": p.get("description", ""),
        }
        for p in (chosen.props if chosen else [])
    ]

    alternatives = []
    for name in resp.alternative_components:
        alt = next((r for r in results if r.component_name == name), None)
        if alt:
            alternatives.append(
                {
                    "name": name,
                    "category": alt.category,
                    "similarity": round(alt.score, 4),
                    "description": (alt.description or "")[:120],
                }
            )

    return {
        "no_match": False,
        "component": resp.chosen_component,
        "category": chosen.category if chosen else "",
        "confidence": resp.confidence,
        "similarity": round(
            resp.retrieval_scores.get(resp.chosen_component, 0.0), 4
        ),
        "reason": resp.reasoning,
        "import_path": resp.import_path,
        "usage": resp.usage_example,
        "props": props,
        "slots": chosen.slots if chosen else [],
        "tags": (chosen.tags[:12] if chosen else []),
        "accessibility_notes": (chosen.accessibility_notes if chosen else ""),
        "alternatives": alternatives,
    }


if __name__ == "__main__":
    uvicorn.run("api_server:app", host="0.0.0.0", port=8000, reload=True)
