# DESIGN.md — Astro Component RAG System

> Architecture and design reference for contributors and maintainers.
> This document explains **why** the system is built the way it is,
> not just what it does.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Directory Structure](#3-directory-structure)
4. [Core Components](#4-core-components)
5. [Data Flow](#5-data-flow)
6. [Design Decisions](#6-design-decisions)
7. [Configuration](#7-configuration)
8. [Algorithms](#8-algorithms)
9. [Error Handling](#9-error-handling)
10. [Performance Considerations](#10-performance-considerations)
11. [Security Considerations](#11-security-considerations)
12. [Limitations](#12-limitations)
13. [Future Improvements](#13-future-improvements)
14. [Developer Notes](#14-developer-notes)
15. [Glossary](#15-glossary)

---

## 1. Project Overview

### Purpose

This project is a **Retrieval-Augmented Generation (RAG) system** built specifically
for an Astro.js UI component library. It allows developers to describe what they need
in plain English and receive the correct component — including its import path, props,
usage example, and explanation — without manually browsing documentation or source code.

### Problem It Solves

Frontend developers working with a large component library face a common problem:
they know what they want to build (a login page, a pricing section, a dashboard card)
but do not know which component to use, what it is called, or how to import it.
Traditional documentation search is keyword-dependent and brittle. This system understands
the *intent* behind a query and maps it to the right component using semantic similarity.

### Anti-Hallucination Guarantee

The system is strictly grounded. The LLM (Groq) can **only** return components that
were retrieved from the local FAISS vector index. It cannot invent component names,
import paths, or props. If no component matches the query above the configured similarity
threshold, the system returns a clear "no matching component" message instead of
fabricating an answer.

### Target Users

| User | Use Case |
|---|---|
| Frontend developer | "Which component should I use for a login form?" |
| UI designer | "Is there a component for a hero section?" |
| New team member | Discover the component library without reading all source files |
| Code reviewer | Verify that the right component is being used |
| Internal tooling | Integrate component lookup into IDE plugins or CI checks |

### High-Level Workflow

```
Developer writes a natural language query
            │
            ▼
System encodes the query into a vector (sentence-transformers)
            │
            ▼
FAISS searches for the closest component vectors
            │
            ▼
Top-k results are retrieved with full metadata
            │
            ▼
Groq LLM formats a structured JSON response
using ONLY the retrieved components
            │
            ▼
Developer receives: component name, import path,
usage example, reasoning, alternatives, confidence
```

---

## 2. Architecture

### Overall System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        RAG SYSTEM                               │
│                                                                 │
│  ┌──────────┐    ┌───────────┐    ┌───────────┐    ┌────────┐  │
│  │ Component│    │ Metadata  │    │ Embedding │    │ FAISS  │  │
│  │ Scanner  │───▶│ Extractor │───▶│ Pipeline  │───▶│ Store  │  │
│  │ Step 1   │    │  Step 2   │    │  Step 4   │    │ Step 5 │  │
│  └──────────┘    └───────────┘    └───────────┘    └────────┘  │
│       │               │                                  │      │
│       ▼               ▼                                  │      │
│  component_      metadata.json                           │      │
│  inventory.json       │                                  │      │
│                       ▼                                  │      │
│               ┌───────────────┐                          │      │
│               │ Query         │                          │      │
│               │ Generator     │                          │      │
│               │ Step 3        │                          │      │
│               └───────────────┘                          │      │
│                       │                                  │      │
│                metadata_with_                            │      │
│                queries.json                              │      │
│                                                          │      │
│  ┌──────────────────────────────────────────────────┐   │      │
│  │              QUERY TIME (runtime)                │   │      │
│  │                                                  │   │      │
│  │   User Query                                     │   │      │
│  │       │                                          │   │      │
│  │       ▼                                          │   │      │
│  │  [Embedder]──vector──▶[Retriever]◀──────────────┘   │      │
│  │   Step 4               Step 6                        │      │
│  │                            │                         │      │
│  │                      top-k results                   │      │
│  │                            │                         │      │
│  │                            ▼                         │      │
│  │                      [Generator]                     │      │
│  │                       Step 7                         │      │
│  │                       Groq LLM                       │      │
│  │                            │                         │      │
│  │                     JSON response                    │      │
│  └──────────────────────────────────────────────────┘   │      │
└─────────────────────────────────────────────────────────────────┘
```

### Offline vs. Online Phases

The system has two distinct phases:

**Offline (index-building) — run once or on library change:**
```
Scan → Extract → Generate Queries → Embed → Build FAISS Index
```

**Online (query-serving) — run per user query:**
```
Embed Query → FAISS Search → Filter → Groq LLM → JSON Response
```

This separation means indexing cost is paid once up-front.
Each query at runtime only requires one embedding call and one LLM call.

### Major Modules and Responsibilities

| Module | Step | Responsibility |
|---|---|---|
| `ComponentScanner` | 1 | Walk filesystem, discover `.astro` files, produce inventory |
| `MetadataExtractor` | 2 | Parse source files, extract props/slots/tags/descriptions |
| `TagGenerator` | 2 (utility) | Generate semantic tag vocabulary for each component |
| `QueryGenerator` | 3 | Produce 5–10 synthetic developer queries per component |
| `EmbeddingPipeline` | 4 | Encode text documents to 384-dim vectors using MiniLM |
| `FAISSStore` | 5 | Build, persist, load, and update the vector index |
| `Retriever` | 6 | Embed query, search FAISS, filter, return ranked results |
| `Generator` | 7 | Call Groq LLM with context, produce structured JSON |
| `ConfigLoader` | shared | Resolve project root, load `settings.yaml`, set up logging |

---

## 3. Directory Structure

```
f:\rag application\
│
├── components\                   ← Astro.js component library (42 components)
│   ├── layout\                   ← Page-level structure (Navbar, Footer, Sidebar…)
│   ├── ui\                       ← Generic UI elements (Button, Badge, Avatar…)
│   ├── forms\                    ← Input controls (Input, Select, Checkbox…)
│   ├── feedback\                 ← User notifications (Alert, Modal, Toast…)
│   ├── data\                     ← Data display (Card, Table, StatCard…)
│   ├── navigation\               ← Nav patterns (Tabs, Pagination, Breadcrumb…)
│   ├── marketing\                ← Landing page sections (Hero, PricingCard…)
│   ├── auth\                     ← Authentication (LoginForm, RegisterForm…)
│   ├── dashboard\                ← Admin panels (DashboardCard, StatsGrid…)
│   └── content\                  ← Long-form (Article, BlogCard, ProfileCard)
│
├── scripts\                      ← All Python pipeline modules
│   ├── __init__.py
│   ├── config_loader.py          ← Shared: root discovery, YAML loader, logging
│   ├── scanner\
│   │   ├── __init__.py
│   │   └── component_scanner.py  ← Step 1: filesystem walk + .astro parsing
│   ├── metadata\
│   │   ├── __init__.py
│   │   ├── metadata_extractor.py ← Step 2: JSDoc + Props interface parser
│   │   └── tag_generator.py      ← Step 2 utility: semantic tag generation
│   ├── embeddings\               ← Step 4: sentence-transformers pipeline
│   ├── vector_store\             ← Step 5: FAISS index builder and loader
│   ├── retriever\                ← Step 6: query → embed → search → filter
│   └── generator\                ← Step 7: Groq LLM response formatter
│
├── config\
│   └── settings.yaml             ← Single source of truth for all configuration
│
├── data\                         ← Generated artifacts (not committed to git)
│   ├── component_inventory.json  ← Output of Step 1
│   ├── metadata.json             ← Output of Step 2
│   ├── metadata_with_queries.json← Output of Step 3
│   ├── embeddings\
│   │   ├── embeddings.npy        ← Output of Step 4 (NumPy array)
│   │   └── component_ids.json    ← FAISS position → component name mapping
│   ├── faiss_index\
│   │   ├── index.faiss           ← Binary FAISS index file
│   │   └── metadata_store.json   ← Full metadata keyed by FAISS position
│   └── models\                   ← Cached HuggingFace model weights
│
├── evaluation\                   ← Step 9: benchmark dataset and results
│   ├── eval_dataset.json
│   └── results.json
│
├── tests\                        ← pytest test suite (per step)
│
├── docs\                         ← Extended documentation
│
├── run_scanner.py                ← CLI entry point for Step 1
├── run_metadata.py               ← CLI entry point for Step 2
├── requirements.txt              ← Pinned Python dependencies
├── .env.example                  ← Environment variable template
├── DESIGN.md                     ← This file
└── README.md                     ← Installation and usage guide
```

### Key Design Rule: Library vs. Entry Point Separation

Every `scripts/*/` directory contains **library code** — importable, reusable,
independently testable. The top-level `run_*.py` files are **thin CLI wrappers**
that load config, wire up dependencies, call the library, and print reports.
This means future callers (a web API, a VS Code extension, a CI script) can
import the library directly without touching CLI logic.

---

## 4. Core Components

### 4.1 ComponentScanner (`scripts/scanner/component_scanner.py`)

**Responsibility:** Discover every `.astro` file in the component library and
record its structural characteristics without interpreting its semantics.

**Inputs:**
- `components/` directory (configurable path)
- `config/settings.yaml` scanner section (ignored dirs, extensions, prefixes)

**Outputs:**
- `ComponentInventory` dataclass (in memory)
- `data/component_inventory.json` (serialised to disk)

**Key fields extracted per file:**

| Field | How Obtained |
|---|---|
| `component_name` | `path.stem` — filename without extension |
| `category` | `path.parent.name` — immediate parent folder |
| `file_path` | `path.relative_to(root).as_posix()` |
| `absolute_path` | `str(path)` — stored so Step 2 can re-read the file |
| `has_props_interface` | Regex: `export\s+(?:interface|type)\s+Props` |
| `has_slots` | Regex: `<slot\b` anywhere in the file |
| `has_script` | Regex: `<script` not followed by `is:inline define:vars` |
| `line_count` | `len(raw.splitlines())` |
| `file_size_bytes` | `path.stat().st_size` |

**Dependencies:** `pathlib`, `re`, `json`, `dataclasses`, `yaml` — all standard
library except PyYAML.

**Why it exists:** Separating discovery (Step 1) from semantic extraction (Step 2)
means the filesystem walk is fast, cheap, and re-runnable at any time. If the
library structure changes, the scanner can be rerun in milliseconds before any
expensive ML operations begin.

---

### 4.2 MetadataExtractor (`scripts/metadata/metadata_extractor.py`)

**Responsibility:** Read each `.astro` source file identified by the scanner and
extract rich, structured metadata by parsing JSDoc comments and the TypeScript
Props interface.

**Inputs:**
- `data/component_inventory.json` (list of file paths + categories from Step 1)
- The actual `.astro` source files referenced by `absolute_path`

**Outputs:**
- `ComponentMetadata` dataclass per component (in memory)
- `data/metadata.json` (serialised to disk)

**Extraction pipeline per file:**

```
.astro file
    │
    ├─ _get_frontmatter()          Extract text between --- fences
    │        │
    │        ├─ _parse_main_jsdoc()
    │        │       Finds /** ... */ at top of frontmatter.
    │        │       Parses @accessibility, @slot name - desc,
    │        │       and description (non-@ lines).
    │        │
    │        ├─ _extract_defaults()
    │        │       Finds `const { ... } = Astro.props`
    │        │       Extracts `propName = defaultValue` pairs.
    │        │
    │        └─ _parse_props_interface()
    │               Finds `export interface Props {`
    │               Uses brace-depth counter to extract body.
    │               Parses line-by-line: JSDoc → propName?: type;
    │
    ├─ template section (after second ---)
    │        └─ _merge_slots()
    │               Combines @slot JSDoc entries with <slot name="x">
    │               elements found in the HTML template.
    │               JSDoc descriptions take precedence.
    │
    ├─ TagGenerator.generate()     5-layer tag generation
    ├─ _generate_usage_example()   Templated Astro snippet
    └─ _score_confidence()         0.50–1.00 based on data richness
```

**Dependencies:** `re`, `json`, `dataclasses`, `pathlib`, `datetime`, `TagGenerator`

**Why it exists:** The semantic richness of the metadata is the single biggest
factor in RAG retrieval quality. Descriptions, props, tags, and accessibility notes
all become part of the embedding document. The better the metadata, the more
accurately queries match components.

---

### 4.3 TagGenerator (`scripts/metadata/tag_generator.py`)

**Responsibility:** Generate a comprehensive, deduplicated list of semantic tags
for each component. Tags form a critical part of the text document that gets
embedded. They bridge the gap between how developers phrase requests and how
components are described in code.

**Inputs:**
- `component_name` (PascalCase string)
- `category` (folder name string)
- `description` (extracted JSDoc text)
- `prop_names` (list of prop names from Props interface)
- `slot_names` (list of slot names)

**Outputs:**
- Sorted, deduplicated `list[str]` of lowercase semantic tags

**Five-layer tag generation strategy:**

```
Layer 1: Category base tags
         "ui" → ["ui", "ui component", "interactive"]

Layer 2: Component name split
         "DashboardCard" → ["dashboard", "card", "dashboard card"]

Layer 3: Curated hand-crafted tags  ← most important for RAG quality
         "Button" → ["submit form", "save changes", "call to action",
                     "primary button", "danger button", ...]

Layer 4: Description keyword extraction
         "Responsive sticky top navigation bar." →
         ["responsive", "sticky", "navigation", "bar"]

Layer 5: Prop and slot name keywords
         props: ["variant", "loading", "disabled"]
         slots: ["header", "actions", "footer"]
```

**Why curated tags matter:**

Without curated tags, a query like `"submit form"` might not retrieve `Button`
because the word "submit" does not appear in the Button component's source.
The curated dictionary explicitly maps developer vocabulary to components, even
when that vocabulary does not appear verbatim in the source code.

**Dependencies:** `re`, `dataclasses` — pure standard library.

---

### 4.4 ConfigLoader (`scripts/config_loader.py`)

**Responsibility:** Provide a single, consistent way for any module in the project
to locate the project root, load `settings.yaml`, and set up the logging system.

**Inputs:** None (introspects filesystem from its own `__file__` location)

**Outputs:**
- `project_root: Path`
- `settings: dict` (full contents of `settings.yaml`)
- Configured `logging` module (side effect)

**Root discovery algorithm:**
```
Start from __file__ parent directory.
Walk up to 6 levels, checking each for config/settings.yaml.
If not found, check PROJECT_ROOT environment variable.
Raise FileNotFoundError if neither succeeds.
```

**Why it exists:** Without a shared config loader, every `run_*.py` script would
duplicate the root-finding logic and YAML loading. The shared loader also ensures
all scripts configure `logging` identically, so log output is consistent regardless
of which script is invoked.

---

### 4.5 Planned Modules (Steps 3–9)

These modules follow the same library-vs-entry-point pattern:

| Module | Location | Planned Responsibility |
|---|---|---|
| `QueryGenerator` | `scripts/metadata/query_generator.py` | Generate 5–10 natural language queries per component |
| `EmbeddingPipeline` | `scripts/embeddings/embedding_pipeline.py` | Batch-encode text documents using `all-MiniLM-L6-v2` |
| `FAISSStore` | `scripts/vector_store/faiss_store.py` | Build, save, load, and update the FAISS index |
| `Retriever` | `scripts/retriever/retriever.py` | Embed query → FAISS search → filter → return results |
| `Generator` | `scripts/generator/generator.py` | Call Groq LLM with retrieved context → JSON response |

---

## 5. Data Flow

### Complete Lifecycle

```
┌─────────────────────────────────────────────────────────────────────┐
│                         OFFLINE PIPELINE                            │
│                                                                     │
│  components/*.astro                                                 │
│         │                                                           │
│         ▼  python run_scanner.py                                    │
│  ┌─────────────┐                                                    │
│  │    Step 1   │  Walk filesystem                                   │
│  │   Scanner   │  Parse .astro structure                            │
│  │             │  Detect Props/Slots/Script                         │
│  └──────┬──────┘                                                    │
│         │                                                           │
│         ▼  data/component_inventory.json                            │
│         │  { component_name, file_path, category,                   │
│         │    has_props, has_slots, line_count, ... }                │
│         │                                                           │
│         ▼  python run_metadata.py                                   │
│  ┌─────────────┐                                                    │
│  │    Step 2   │  Parse JSDoc blocks                                │
│  │  Metadata   │  Extract Props interface                           │
│  │  Extractor  │  Extract Slots, Accessibility                      │
│  │             │  Generate Tags (5 layers)                          │
│  │             │  Generate Usage Examples                           │
│  │             │  Score Confidence                                  │
│  └──────┬──────┘                                                    │
│         │                                                           │
│         ▼  data/metadata.json                                       │
│         │  { description, props[], slots[], tags[],                 │
│         │    import_path, usage_example, confidence, ... }          │
│         │                                                           │
│         ▼  python run_queries.py  (Step 3)                          │
│  ┌─────────────┐                                                    │
│  │    Step 3   │  For each component:                               │
│  │   Query     │  Generate 5–10 realistic developer queries         │
│  │  Generator  │  e.g. "build a login page", "show loading state"   │
│  └──────┬──────┘                                                    │
│         │                                                           │
│         ▼  data/metadata_with_queries.json                          │
│         │  + { synthetic_queries: ["...", "...", ...] }             │
│         │                                                           │
│         ▼  python run_embeddings.py  (Step 4)                       │
│  ┌─────────────┐                                                    │
│  │    Step 4   │  For each component:                               │
│  │  Embedding  │  Concatenate: description + tags + props           │
│  │  Pipeline   │              + synthetic_queries                   │
│  │             │  Encode with all-MiniLM-L6-v2 → 384-dim vector     │
│  │             │  L2-normalize for cosine similarity                │
│  └──────┬──────┘                                                    │
│         │                                                           │
│         ▼  data/embeddings/embeddings.npy  (42 × 384 float32)       │
│         ▼  data/embeddings/component_ids.json                       │
│         │                                                           │
│         ▼  python run_vector_store.py  (Step 5)                     │
│  ┌─────────────┐                                                    │
│  │    Step 5   │  Create FAISS IndexFlatIP                          │
│  │   Vector    │  Add all 42 embeddings                             │
│  │    Store    │  Save index to disk                                │
│  │             │  Save metadata store (position → metadata)         │
│  └──────┬──────┘                                                    │
│         │                                                           │
│         ▼  data/faiss_index/index.faiss                             │
│         ▼  data/faiss_index/metadata_store.json                     │
└─────────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────┐
│                         ONLINE PIPELINE (per query)                 │
│                                                                     │
│  User: "I need a login page"                                        │
│         │                                                           │
│         ▼                                                           │
│  ┌─────────────┐                                                    │
│  │    Step 6   │  Embed query with all-MiniLM-L6-v2                 │
│  │  Retriever  │  L2-normalize query vector                         │
│  │             │  FAISS.search(query_vec, top_k=5)                  │
│  │             │  Filter by score_threshold ≥ 0.25                  │
│  │             │  Hydrate results with full metadata                │
│  └──────┬──────┘                                                    │
│         │                                                           │
│         ▼  top-k RetrievalResult objects                            │
│         │  { component_name, score, description,                    │
│         │    import_path, usage_example, props, ... }               │
│         │                                                           │
│         ▼                                                           │
│  ┌─────────────┐                                                    │
│  │    Step 7   │  Build prompt: user query + retrieved context       │
│  │  Generator  │  Call Groq API (llama-3.3-70b-versatile)           │
│  │  (Groq LLM) │  Enforce: only use retrieved component names       │
│  │             │  Parse structured JSON response                    │
│  └──────┬──────┘                                                    │
│         │                                                           │
│         ▼  Structured JSON response                                 │
│         {                                                           │
│           "chosen_component": "LoginForm",                          │
│           "confidence": "high",                                     │
│           "reasoning": "...",                                       │
│           "import_path": "@/components/auth/LoginForm.astro",       │
│           "usage_example": "...",                                   │
│           "code_snippet": "...",                                    │
│           "alternative_components": ["RegisterForm"]                │
│         }                                                           │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Artifact Lineage

```
components/*.astro
      │
      │ Step 1 (Scanner)
      ▼
data/component_inventory.json           ← filesystem facts only
      │
      │ Step 2 (MetadataExtractor)
      ▼
data/metadata.json                      ← + semantics, props, tags
      │
      │ Step 3 (QueryGenerator)
      ▼
data/metadata_with_queries.json         ← + synthetic queries
      │
      │ Step 4 (EmbeddingPipeline)
      ▼
data/embeddings/embeddings.npy          ← 384-dim float32 vectors
data/embeddings/component_ids.json      ← FAISS position → name
      │
      │ Step 5 (FAISSStore)
      ▼
data/faiss_index/index.faiss            ← binary vector index
data/faiss_index/metadata_store.json    ← position → full metadata
```

Each artifact is a checkpoint. Steps can be individually rerun.
If only tags change, rerun from Step 2 onward. If only a new component
is added, rerun from Step 1 onward. Embeddings are regenerated only
when text content changes.

---

## 6. Design Decisions

### 6.1 Programming Language: Python

**Chosen:** Python 3.12

**Reason:** Python is the dominant language for ML/AI tooling.
`sentence-transformers`, `faiss-cpu`, and the Groq SDK are all Python-native.
Forcing another language would require subprocess bridges or FFI bindings that
add complexity without benefit.

**Alternative considered:** TypeScript/Node.js — rejected because there is no
production-quality FAISS binding for Node and `sentence-transformers` has no
official JS port.

---

### 6.2 Embedding Model: `all-MiniLM-L6-v2`

**Chosen:** `sentence-transformers/all-MiniLM-L6-v2`

**Reason:**

| Property | Value |
|---|---|
| Output dimensions | 384 |
| Model size | ~22 MB |
| Inference speed | ~14,000 sentences/second on CPU |
| Quality | Strong semantic similarity, trained on 1B+ sentence pairs |
| Cost | Free, runs locally, no API call |

The model is small enough to load in under two seconds and fast enough
that even batch-encoding 42 × 10 synthetic queries takes less than a second.

**Alternative considered:** `all-mpnet-base-v2` (768-dim) — better quality,
but doubles the FAISS index size and inference time. Overkill for a 42-component
library. Could be swapped in via `settings.yaml` as the library grows.

**Alternative considered:** OpenAI `text-embedding-ada-002` — requires an API
call and costs money per embedding. The local model avoids vendor lock-in and
works offline.

---

### 6.3 Vector Database: FAISS (`IndexFlatIP`)

**Chosen:** `faiss-cpu` with `IndexFlatIP`

**Reason:**

`IndexFlatIP` performs **exact inner product search** over all vectors.
With L2-normalised embeddings, inner product equals cosine similarity.
For 42 components (and even 10,000+), exact search is faster than
approximate search because approximate indexes (IVF, HNSW) have
non-trivial build costs and only pay off at millions of vectors.

| Property | Value |
|---|---|
| Index type | FlatIP (exact, brute-force) |
| Similarity metric | Cosine (via L2-normalised inner product) |
| Memory for 42 components | 42 × 384 × 4 bytes = ~64 KB |
| Search latency | < 1 ms for 42 components |
| Persistence | Single `.faiss` binary file |

**Alternative considered:** ChromaDB — has a nicer API but adds an HTTP
server dependency and is overkill for local-first use.

**Alternative considered:** Weaviate / Qdrant — cloud-native vector databases
with filtering, but require running a separate process and have no free tier
for self-hosted production use.

**Alternative considered:** FAISS `IndexIVFFlat` (approximate) — would be
appropriate at 100,000+ vectors. Not needed now; the config can switch index
type when the library scales.

---

### 6.4 LLM Provider: Groq

**Chosen:** Groq API with `llama-3.3-70b-versatile`

**Reason:**

- Free tier with sufficient rate limits for development
- Fastest open-model inference available (Groq LPU hardware)
- `llama-3.3-70b` produces high-quality structured JSON
- Low temperature (`0.1`) gives deterministic, factual responses
- No data is sent to a closed-source training pipeline

**Anti-hallucination enforcement:** The generator prompt explicitly instructs
the LLM that it may **only** reference component names present in the
retrieved context. If no component matches, it must return the configured
`no_result_message` rather than inventing one.

**Alternative considered:** OpenAI GPT-4o — better reasoning but costs money
per call and has no free tier.

**Alternative considered:** Local Ollama (llama3) — fully offline but requires
a machine with sufficient RAM (8 GB+ for 8B, 32 GB+ for 70B) and is slower.
Can be supported by changing `settings.yaml` generator config.

---

### 6.5 Configuration Strategy: Single YAML File

**Chosen:** `config/settings.yaml` as the single source of truth.

**Reason:** All runtime-variable values (paths, model names, thresholds, batch
sizes, log levels) are in one file. No value is hardcoded in Python source.
Changing the embedding model, score threshold, or log level requires editing
one file with no code changes.

The `ConfigLoader` resolves the project root automatically by walking up the
filesystem, so scripts work correctly regardless of the current working directory.

**Alternative considered:** Multiple `.env` files — fine for secrets but bad
for structured config (nested keys, lists of ignored dirs). YAML handles both.

**Alternative considered:** Python `config.py` — mixes configuration with code,
making it harder to share config with non-Python tools or deploy with different
settings per environment.

---

### 6.6 Metadata Strategy: Source-Derived, Not Sidecar Files

**Chosen:** Extract metadata from the `.astro` source files themselves (JSDoc
comments, TypeScript interface).

**Reason:** The source file is the authoritative document. Maintaining a separate
`Button.metadata.json` sidecar for each component creates a synchronisation
problem — metadata drifts out of date when components change. By extracting
directly from source, the metadata is always as fresh as the latest component.

**Alternative considered:** Manual YAML sidecars per component — 100% accurate
but 42 files to maintain, each drifting independently. Not scalable.

**Alternative considered:** LLM-based extraction — non-deterministic, expensive,
and violates the anti-hallucination principle during the index-building phase.

---

### 6.7 Project Structure: Library vs. Entry Point Separation

**Chosen:** All pipeline logic lives in `scripts/*/` packages. `run_*.py` files
at the root are thin CLI wrappers.

**Reason:** Future consumers (web API, VS Code extension, CI pipeline) can
import `from scripts.retriever import Retriever` without depending on CLI
arguments. Tests import library code directly. Entry points are easily swapped
(CLI, FastAPI, Click) without touching the core logic.

---

### 6.8 Embedding Document Design: One Document Per Component

**Chosen:** One embedding per component, concatenating all semantic fields.

**Document format:**
```
Component: {name}
Category: {category}
Description: {description}
Tags: {tags joined by comma}
Props: {prop names and types}
Accessibility: {accessibility_notes}
Queries: {synthetic query 1}. {synthetic query 2}. ...
```

**Reason:** With only 42 components, there is no benefit to chunking. A single
dense document captures all semantic signals. Chunking would fragment the
semantic space (e.g., embedding props separately from the description) and
increase the chance that a query matches a prop chunk rather than the right component.

**Alternative considered:** Separate embeddings per field (description, tags,
queries) with result merging — adds complexity, requires weighted fusion logic,
and provides no benefit at this scale.

---

## 7. Configuration

### `config/settings.yaml`

The configuration file is divided into named sections. Each section maps to one
pipeline module.

#### Scanner Section

```yaml
scanner:
  components_dir: "components"       # Root folder to scan, relative to project root
  supported_extensions:
    - ".astro"                       # Only Astro files for now
  ignored_dirs:                      # Directories skipped during walk
    - "node_modules"
    - "dist"
    - "build"
    - ".git"
    - ".svelte-kit"
    - "__pycache__"
    - ".cache"
  ignored_prefixes:                  # Files/dirs starting with these are skipped
    - "."                            # Hidden files and directories
    - "_"                            # Private/internal files by convention
  output_file: "data/component_inventory.json"
```

#### Metadata Section

```yaml
metadata:
  input_file: "data/component_inventory.json"
  output_file: "data/metadata.json"
  queries_output_file: "data/metadata_with_queries.json"
  min_queries_per_component: 5      # Minimum synthetic queries to generate
  max_queries_per_component: 10     # Maximum synthetic queries to generate
  confidence_threshold: 0.6        # Below this → needs_review: true
```

#### Embedding Section

```yaml
embedding:
  model_name: "all-MiniLM-L6-v2"   # HuggingFace model identifier
  model_cache_dir: "data/models"    # Where model weights are cached locally
  batch_size: 32                    # Components per encode() call
  normalize_embeddings: true        # L2-normalise → cosine similarity via dot product
  embeddings_file: "data/embeddings/embeddings.npy"
  ids_file: "data/embeddings/component_ids.json"
```

#### Vector Store Section

```yaml
vector_store:
  index_type: "FlatIP"              # Exact inner product search
  index_file: "data/faiss_index/index.faiss"
  metadata_file: "data/faiss_index/metadata_store.json"
  dimension: 384                    # Must match embedding model output dimension
```

#### Retriever Section

```yaml
retriever:
  top_k: 5                          # Number of candidates to return
  score_threshold: 0.25             # Minimum cosine similarity (0–1 scale)
  rerank: false                     # Cross-encoder re-ranking (planned, not built)
```

#### Generator Section

```yaml
generator:
  provider: "groq"
  model: "llama-3.3-70b-versatile"
  temperature: 0.1                  # Low = deterministic JSON output
  max_tokens: 1024
  no_result_message: "No matching component found in the library for this query."
```

#### Logging Section

```yaml
logging:
  level: "INFO"                     # DEBUG | INFO | WARNING | ERROR
  format: "%(asctime)s [%(levelname)s] %(name)s — %(message)s"
  date_format: "%Y-%m-%d %H:%M:%S"
```

### Environment Variables (`.env`)

```
GROQ_API_KEY=your_key_here     # Required for Step 7 (generator)
PROJECT_ROOT=/path/to/project  # Optional: override auto-detection
```

Secrets are never stored in `settings.yaml`. The `ConfigLoader.load_env()`
function loads `.env` via `python-dotenv` before any module needs the key.

---

## 8. Algorithms

### 8.1 Component Scanning Algorithm

```
function scan(root_dir):
    components = []

    function walk(directory):
        for entry in sorted(directory.iterdir()):
            if entry is directory:
                if entry.name in ignored_dirs: skip
                if entry.name starts with ignored_prefix: skip
                walk(entry)                    # recurse
            elif entry is file:
                if entry.name starts with ignored_prefix: skip
                if entry.suffix in [".astro"]:
                    components.append(parse_file(entry))

    walk(root_dir)
    return ComponentInventory(components)
```

`sorted()` is used to ensure deterministic ordering across different operating
systems (which may return `iterdir()` results in arbitrary order).

---

### 8.2 Props Interface Parsing Algorithm

Standard regex cannot reliably parse nested braces. The extractor uses a
**character-level brace depth counter** instead:

```
function extract_balanced_block(text, start_pos):
    depth = 1
    i = start_pos   # i is just past the opening {

    while i < len(text) and depth > 0:
        if text[i] == '{': depth += 1
        if text[i] == '}': depth -= 1
        i += 1

    if depth != 0:
        return None   # malformed file

    return text[start_pos : i-1]   # content between braces
```

The body is then parsed line-by-line with a finite-state machine
that tracks whether the current line is inside a JSDoc block:

```
states: NORMAL | IN_JSDOC

for each line:
    if IN_JSDOC:
        if line contains "*/": transition to NORMAL, save accumulated desc
        else: accumulate description text
    elif NORMAL:
        if line starts with "/**":
            if single-line (ends with "*/"): save inline desc
            else: transition to IN_JSDOC
        elif line matches /^(\w+)(\??):\s*(.+)/: emit PropInfo
```

---

### 8.3 Tag Generation Algorithm

```
function generate_tags(name, category, description, prop_names, slot_names):
    tags = empty set

    # Layer 1: category vocabulary
    tags += CATEGORY_TAGS[category]

    # Layer 2: split PascalCase name
    parts = split_pascal_case(name)           # "DashboardCard" → ["dashboard","card"]
    tags += parts
    tags += [join(parts, " ")]                # "dashboard card"
    tags += [name.lower()]                    # "dashboardcard"

    # Layer 3: curated synonyms (hand-crafted per component)
    tags += CURATED[name]                     # e.g. "submit form", "cta", ...

    # Layer 4: description keywords (stop-words removed)
    words = tokenize(description)
    tags += [w for w in words if w not in STOP_WORDS and len(w) >= 3]

    # Layer 5: prop and slot name keywords
    for prop in prop_names:
        if prop not in {"class", "style", "id", "as", "ref"}:
            tags += split_camel_case(prop)    # camelCase → individual words
    for slot in slot_names:
        if slot != "default":
            tags += [slot.lower()]

    return sorted(deduplicate(tags))
```

---

### 8.4 Confidence Scoring Algorithm

```
function score_confidence(has_desc, has_props, has_slots, has_a11y, tag_count):
    score = 0.50          # base: all discovered components start at 50%

    if has_desc:          score += 0.25   # JSDoc description found
    if has_props:         score += 0.15   # Props interface parsed
    if has_slots:         score += 0.05   # At least one slot
    if has_a11y:          score += 0.05   # Accessibility notes present
    if tag_count >= 5:    score += 0.05   # Reasonable tag coverage
    if tag_count >= 10:   score += 0.05   # Rich tag coverage

    return min(score, 1.0)
```

A component is flagged `needs_review: true` when `score < 0.60`.
All 42 current components score `1.00` because they all have JSDoc,
Props interfaces, slots, accessibility notes, and 16–37 tags.

---

### 8.5 Cosine Similarity via FAISS Inner Product

FAISS `IndexFlatIP` computes the **inner product** (dot product) between
the query vector and every stored vector. When both vectors are L2-normalised
(unit length), inner product equals cosine similarity:

```
cosine_similarity(a, b) = dot(a, b) / (|a| × |b|)

When |a| = 1 and |b| = 1:
cosine_similarity(a, b) = dot(a, b)
```

This means both the stored embeddings (at index-build time) and the
query vector (at query time) must be L2-normalised before being
passed to FAISS. This is handled by `normalize_embeddings: true`
in the embedding config.

---

## 9. Error Handling

### Strategy Overview

```
Layer 1: Configuration errors
  → Caught at startup before any processing begins
  → Clear error message with remediation hint
  → Process exits with code 1

Layer 2: Per-component errors (scan and extraction)
  → Caught with try/except per component
  → Logged as WARNING with component path
  → Skipped component is counted in scan_metadata.skipped_files
  → Processing continues for remaining components

Layer 3: API errors (Groq)
  → Retry with exponential backoff (planned)
  → If retries exhausted: return structured error response
  → Never silently discard the user query

Layer 4: No-result case
  → FAISS returns results below score_threshold
  → Generator returns no_result_message from config
  → This is not an error — it is a valid outcome
```

### Specific Error Cases

| Scenario | Handling |
|---|---|
| `components/` directory not found | `FileNotFoundError` raised in `Scanner.scan()`, caught in `main()`, exit 1 |
| `.astro` file not UTF-8 | `read_text(errors="replace")` — garbled chars replaced, file still processed |
| Malformed frontmatter (no `---`) | `_get_frontmatter()` returns empty string; extraction continues with empty fields |
| Props interface body has unclosed brace | `_extract_balanced_block()` returns `None`; props list is empty; confidence reduced |
| `component_inventory.json` not found | Checked at startup in `run_metadata.py`; exit 1 with instruction to run scanner first |
| Groq API key missing | `os.environ` lookup fails; `KeyError` at generator init; message tells user to set `GROQ_API_KEY` |
| Query below confidence threshold | Retriever returns empty list; generator returns configured `no_result_message` |
| FAISS index file not found | Caught in `FAISSStore.load()`; message tells user to run `run_vector_store.py` |

### Validation

`run_metadata.py` calls `validate_metadata()` after extraction:

```python
required_fields = {
    "component_name", "category", "description",
    "import_path", "file_path", "tags",
}
```

Validation errors are printed to the console but do not halt execution,
allowing partial results to be saved and inspected.

### Logging

All modules use Python's `logging` module with a named logger per class
(`logging.getLogger(self.__class__.__name__)`). The root logger is
configured once in `config_loader.setup_logging()`. This means:

- Log level can be changed globally in `settings.yaml` without code changes
- Each log line includes the module name, enabling easy filtering
- DEBUG logging shows per-file progress; INFO shows summaries only

---

## 10. Performance Considerations

### Offline Pipeline (Index Building)

| Step | Estimated Time (42 components) | Bottleneck |
|---|---|---|
| Step 1: Scan | < 0.1 seconds | Filesystem I/O |
| Step 2: Metadata | < 0.5 seconds | Regex parsing |
| Step 3: Query Gen | < 1 second | String operations |
| Step 4: Embedding | ~2–5 seconds | Model load (first run), then ~0.5s |
| Step 5: FAISS build | < 0.1 seconds | 42 × 384-dim is trivial |
| **Total** | **~5–8 seconds** | Model load dominates |

On subsequent runs, the HuggingFace model is cached in `data/models/`,
reducing Step 4 to ~0.5 seconds.

### Online Pipeline (Per Query)

| Operation | Estimated Time |
|---|---|
| Query embedding | ~10 ms (model already loaded) |
| FAISS search (42 vectors) | < 1 ms |
| Groq API call | 500–2000 ms (network latency) |
| **Total** | **~0.5–2 seconds** |

The Groq LLM call dominates query latency. FAISS and embedding are negligible.

### Scalability

| Component Library Size | Impact |
|---|---|
| < 1,000 components | No changes needed. `IndexFlatIP` handles this trivially. |
| 1,000–100,000 components | Switch to `IndexIVFFlat` (approximate search). Change `vector_store.index_type` in config. |
| > 100,000 components | Use `IndexHNSWFlat` or add GPU FAISS. Consider chunked metadata loading. |

### Memory Usage

- FAISS index in memory: `42 × 384 × 4 bytes ≈ 64 KB`
- `all-MiniLM-L6-v2` model: ~90 MB RAM when loaded
- `metadata_store.json`: ~200 KB for 42 components
- Total RSS during query: ~200–300 MB (dominated by PyTorch model)

### Optimisation Strategies

1. **Lazy model loading:** Load the embedding model once at startup, not per query.
2. **Batch embedding:** Encode all synthetic queries together in one `model.encode()` call rather than one by one.
3. **Index persistence:** Never rebuild FAISS index from scratch if only metadata changed (not embeddings). Check modification times.
4. **Incremental update:** Add only new component embeddings rather than rebuilding the full index when one component is added.

---

## 11. Security Considerations

### API Key Handling

- `GROQ_API_KEY` is loaded exclusively from `.env` (never from `settings.yaml`)
- `.env` is listed in `.gitignore` to prevent accidental commits
- `.env.example` shows the required variable name with a placeholder value
- The key is never logged, printed, or included in error messages
- `python-dotenv` loads the key into `os.environ`; it is never stored in a Python variable at module level

### Input Validation

- **Query strings (user input):** Passed to the embedding model and then to Groq as a prompt. The embedding model treats input as plain text — no code execution. The Groq prompt is constructed by the generator, which wraps user input in a clearly delimited template. Prompt injection is mitigated by the system prompt instruction that restricts the LLM to retrieved components only.
- **Component source files:** Read with `errors="replace"`, preventing codec exceptions from malformed bytes. File paths are resolved via `pathlib.Path.relative_to()`, preventing path traversal.
- **Configuration values:** Loaded from `settings.yaml` using `yaml.safe_load()` (not `yaml.load()`), which disables arbitrary Python object instantiation.

### Filesystem Safety

- The scanner uses `path.relative_to(project_root)` to compute all output paths, ensuring all writes stay within the project directory.
- `output.parent.mkdir(parents=True, exist_ok=True)` is used before writing any file, preventing race conditions.
- The scanner never follows symlinks (default `pathlib` behaviour on Windows and Linux).

### Permission Boundaries

- The system reads component source files and writes to `data/`
- It makes outbound HTTPS calls to `api.groq.com` only
- It does not read environment files other than the project-root `.env`
- It does not write to `components/` — the component library is always read-only from the pipeline's perspective

---

## 12. Limitations

### Current Implementation (Steps 1–2 Complete)

| Limitation | Details |
|---|---|
| **Steps 3–9 not yet built** | Embedding, FAISS, retriever, generator, evaluation are planned but not implemented. |
| **Regex-based TypeScript parsing** | The Props interface parser uses character-counting and line-by-line regex, not a real TypeScript AST. Multi-line type annotations or unusual formatting may be partially captured. |
| **`.astro` files only** | Vue, Svelte, TSX, or plain HTML components are not scanned. Adding support requires extending `supported_extensions` and potentially a different parser per extension. |
| **No incremental scan** | Every run of the scanner re-processes all files. There is no change-detection or file-hash comparison to skip unchanged files. |
| **Category = parent folder name** | Category inference is purely structural. A component filed in the wrong folder will have the wrong category. |
| **No event extraction** | The `events` field in `ComponentMetadata` is always an empty list. Astro components do not emit DOM events in the same way as Vue/Svelte, but custom events via `CustomEvent` are not detected. |
| **Usage examples are structural** | Generated usage examples show props but not semantically meaningful content (e.g., "Button content" rather than "Save Changes"). Step 3 synthetic queries will add semantic meaning. |
| **Single language** | Tags, descriptions, and queries are English-only. Multi-language support would require multilingual embedding models. |

---

## 13. Future Improvements

### Short Term (Next Steps in This Project)

| Improvement | Step | Description |
|---|---|---|
| Synthetic query generation | Step 3 | Add 5–10 realistic queries per component to improve embedding coverage |
| Embedding pipeline | Step 4 | Batch-encode all components with `all-MiniLM-L6-v2` |
| FAISS index builder | Step 5 | Persistent vector store with incremental update support |
| Retriever | Step 6 | Query → embed → FAISS → filter → ranked results |
| Groq generator | Step 7 | LLM response with anti-hallucination guardrails |
| Evaluation suite | Step 9 | Precision@3, Recall, Top-1 Accuracy on 20+ test queries |

### Medium Term

| Improvement | Description |
|---|---|
| **Cross-encoder re-ranking** | Use a cross-encoder model to re-rank FAISS top-k results before passing to LLM. The `retriever.rerank` config flag already exists for this. |
| **Incremental index update** | Track file modification times; only re-embed components that changed. |
| **Vue/Svelte/TSX support** | Extend scanner to handle additional file types with format-specific parsers. |
| **Web API** | Wrap the retriever + generator behind a FastAPI endpoint for IDE integration. |
| **CLI query interface** | `python search.py "I need a login form"` interactive mode. |
| **Confidence calibration** | Validate confidence scores against human judgement on a held-out evaluation set. |

### Long Term

| Improvement | Description |
|---|---|
| **Automatic re-indexing** | Watch the `components/` directory with `watchdog`; rebuild only changed vectors on file save. |
| **Multi-library support** | Accept multiple component library roots; namespace components by library. |
| **Hybrid search** | Combine BM25 keyword search with FAISS vector search for improved recall on exact component names. |
| **Feedback loop** | Record user query → selected component pairs; use as fine-tuning signal for the embedding model. |
| **GPU acceleration** | Switch `faiss-cpu` to `faiss-gpu` for sub-millisecond search on large libraries. |

---

## 14. Developer Notes

### Adding a New Component

1. Create the `.astro` file in the correct `components/<category>/` folder
2. Add a JSDoc block at the top with `@component`, `@category`, `@accessibility`, `@slot` tags
3. Define a typed `export interface Props { ... }` with JSDoc comments on each prop
4. Rerun the full offline pipeline:
   ```
   python run_scanner.py
   python run_metadata.py
   python run_queries.py
   python run_embeddings.py
   python run_vector_store.py
   ```
5. Verify the component appears in the metadata report with `confidence: 1.00`

### Changing a Config Value

All values are in `config/settings.yaml`. No Python file changes are required
for configuration changes. After changing `embedding.model_name`, you must
rerun Steps 4 and 5 (the new model produces different-dimension vectors
that are incompatible with the old FAISS index).

### Running Individual Steps

Each step has an independent entry point:

```bash
python run_scanner.py       # Step 1
python run_metadata.py      # Step 2 (requires Step 1 output)
python run_queries.py       # Step 3 (requires Step 2 output)
python run_embeddings.py    # Step 4 (requires Step 3 output)
python run_vector_store.py  # Step 5 (requires Step 4 output)
```

### Assumptions All Contributors Should Know

1. **Category is directory name.** The parent folder of a component file is its category. This is a convention, not a configuration. Moving a file to a different folder changes its category without any code change.

2. **`data/` is not committed.** All generated files under `data/` are build artifacts. They should be in `.gitignore`. The offline pipeline must be run after checkout to populate them.

3. **FAISS position = metadata store key.** The FAISS index assigns integer IDs `0, 1, 2, ...` to stored vectors. The `metadata_store.json` uses these same integer keys. The two files must always be rebuilt together — never update one without the other.

4. **`all-MiniLM-L6-v2` outputs 384 dimensions.** The `vector_store.dimension: 384` config value is tightly coupled to this model. Changing the model requires changing this value and rebuilding the index.

5. **The LLM prompt is the anti-hallucination guardrail.** The system's correctness guarantee rests on the generator prompt instructing the LLM to use only retrieved component names. If someone modifies the generator without preserving this instruction, the hallucination guarantee is broken.

6. **`sorted()` in the scanner ensures deterministic output.** Without it, the order of components in `component_inventory.json` would vary between runs on different operating systems, causing FAISS position IDs to change and making incremental updates unreliable.

---

## 15. Glossary

| Term | Definition |
|---|---|
| **RAG** | Retrieval-Augmented Generation. An architecture where a retrieval system finds relevant documents, which are then passed to an LLM as context to generate a grounded response. |
| **Embedding** | A fixed-size numerical vector (array of floats) that represents the semantic meaning of a piece of text. Similar texts produce similar vectors. |
| **Sentence Transformer** | A neural network architecture that encodes variable-length text into fixed-size semantic embeddings. Uses BERT-like transformers with pooling. |
| **FAISS** | Facebook AI Similarity Search. A C++ library (with Python bindings) for efficient similarity search over large sets of vectors. |
| **IndexFlatIP** | A FAISS index type that performs exact inner product (dot product) search by comparing the query vector against every stored vector. |
| **Cosine Similarity** | A measure of similarity between two vectors, computed as the angle between them. Values range from -1 (opposite) to 1 (identical). Equals inner product when vectors are L2-normalised. |
| **L2 Normalisation** | Dividing a vector by its Euclidean (L2) norm so that the resulting vector has unit length (magnitude = 1). Required for inner product to equal cosine similarity. |
| **Frontmatter** | The section of an `.astro` file between the opening and closing `---` fences. Contains TypeScript/JavaScript imports, type definitions, and component logic. |
| **Props Interface** | A TypeScript `export interface Props { ... }` block in Astro frontmatter that declares the typed API surface of a component. |
| **Slot** | A named or default content injection point in an Astro component. Defined with `<slot />` or `<slot name="x" />` in the template. Consumers provide content via `slot="x"` attributes. |
| **Tag** | A short, lowercase keyword associated with a component. Tags are used to enrich the embedding document with vocabulary that may not appear verbatim in the source code. |
| **Confidence Score** | A float (0.0–1.0) computed by `_score_confidence()` that measures the richness of extracted metadata for a component. Not a retrieval score. |
| **Retrieval Score** | The cosine similarity value (0.0–1.0) returned by FAISS when comparing the query embedding to a stored component embedding. Used for ranking and threshold filtering. |
| **Top-k** | The number of most-similar results returned by FAISS. Configured as `retriever.top_k` in `settings.yaml`. |
| **Score Threshold** | Minimum cosine similarity for a result to be returned. Results below `retriever.score_threshold` are discarded as insufficiently relevant. |
| **Synthetic Query** | A realistic natural language question generated for each component during Step 3 (e.g., "how do I add a login form?"). Included in the embedding document to improve retrieval recall. |
| **Offline Pipeline** | The index-building phase: Scan → Extract → Query Gen → Embed → Build FAISS. Run once and whenever the component library changes. |
| **Online Pipeline** | The query-serving phase: Embed Query → FAISS Search → Filter → LLM Generate. Run once per user query. |
| **Anti-Hallucination Guardrail** | The constraint enforced via the LLM system prompt that the generator may only reference component names present in the retrieved context. If no component matches, a configured fallback message is returned. |
| **PascalCase** | A naming convention where each word begins with a capital letter (e.g., `DashboardCard`, `LoginForm`). Used for Astro component filenames. |
| **Category** | The direct parent folder name of a component file (e.g., `ui`, `auth`, `dashboard`). Derived structurally from the filesystem; no code or config controls it. |
| **Groq** | An inference provider that runs open-weight LLMs (LLaMA, Mixtral) on custom LPU hardware, offering free-tier access with fast response times. |
| **LPU** | Language Processing Unit. Groq's custom chip architecture optimised for LLM inference, producing faster generation than GPU-based inference. |
| **JSDoc** | A documentation comment format for JavaScript/TypeScript using `/** ... */` syntax with `@tag` annotations. Used in Astro frontmatter to document components. |
| **Brace Depth Counter** | An algorithm that walks a string character by character, incrementing a counter on `{` and decrementing on `}`, to find the matching closing brace for a given opening brace. Used to reliably extract the Props interface body regardless of nesting. |
