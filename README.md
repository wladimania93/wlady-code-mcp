<div align="center">

# WLADY_CODE MCP

**Advanced codebase intelligence for AI assistants**

[![Version](https://img.shields.io/badge/version-0.2.0-blue?style=flat-square)](package.json)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen?style=flat-square&logo=node.js)](https://nodejs.org)
[![MCP](https://img.shields.io/badge/MCP-compatible-purple?style=flat-square)](https://modelcontextprotocol.io)
[![License](https://img.shields.io/badge/license-MIT-orange?style=flat-square)](LICENSE)

🌐 **English** · [Español](README.es.md)

*An MCP server that turns any codebase into a queryable knowledge graph — and renders it as an interactive galaxy.*

</div>

---

## What is it?

WLADY_CODE indexes your project, builds a dependency graph, and exposes **27 MCP tools** that any compatible AI assistant (Claude, Cursor, etc.) can call to navigate, analyze, and reason about code with surgical precision.

It also spins up a **local 3D galaxy visualization** at `http://localhost:9750` where every file is a star and every dependency is a luminous nebula edge.

```
┌──────────────────────────────────────────────────────────────────┐
│                        WLADY_CODE MCP                            │
│                                                                  │
│  ┌──────────────────┐   ┌────────────────┐   ┌────────────────┐  │
│  │     Indexer      │──▶│   SQLite DB    │◀──│  27 MCP Tools  │  │
│  │ Tree-sitter AST  │   │ ~/.wlady-code  │   │                │  │
│  │ + regex fallback │   │   -mcp/        │   │ navigation     │  │
│  └──────────────────┘   │   wlady.db     │   │ impact         │  │
│                         └──────┬─────────┘   │ analysis       │  │
│  ┌──────────────────────────┐  │             │ architecture   │  │
│  │  Galaxy UI · :9750       │  │             │ search + RRF   │  │
│  └──────────────────────────┘  │             │ tracing · adr  │  │
│                                │             └────────────────┘  │
│  ┌─────────────────────────────┴──────────┐                      │
│  │  Embeddings  ·  snowflake-arctic-embed  │                      │
│  │  BM25 + vector → RRF hybrid search     │                      │
│  └────────────────────────────────────────┘                      │
└──────────────────────────────────────────────────────────────────┘
```

---

## Why use it?

| Question you ask the AI | Tool that answers it |
|---|---|
| "Where is function `X` defined?" | `where` |
| "If I change this function, what breaks?" | `fn_impact` |
| "What will this PR affect in production?" | `diff_impact` |
| "Are there dead code, god classes, or circular deps?" | `audit` |
| "How is this monorepo layered?" | `get_architecture` |
| "What's the call path between module A and B?" | `path` |
| "Find code that does something similar to X" | `search_graph(semantic: true)` |
| "Trace the execution flow from main" | `execution_flow` |
| "Show me all modules visually" | Galaxy UI at :9750 |

---

## Features

### Galaxy Visualization

The built-in web UI uses a **stellar spectral color system** — files are colored like real stars based on their connectivity:

| Color | Spectral type | Meaning |
|---|---|---|
| Blue-white | O / B | Highly connected hubs — the system's core |
| White-yellow | A / F | Medium connectivity |
| Amber | G / K | Supporting files |
| Red | M | Leaf files — minimal dependencies |

Edges use **Canvas 2D additive blending** (`globalCompositeOperation: 'lighter'`), making dense dependency clusters glow brighter — the same effect as Three.js `AdditiveBlending`. Where many imports converge, a nebula appears.

**Controls:**

| Action | Effect |
|---|---|
| Drag | Rotate the graph |
| Scroll wheel | Zoom |
| Click node | Select + highlight its direct connections |
| Double-click node | Open source code with syntax highlighting |
| Click community | Highlight all files in that module |
| Double-click empty space | Resume auto-rotation |
| `Esc` | Close code panel |

The code panel uses **Prism.js** with explicit grammar loading for 18+ languages, and includes an **"Open in VS Code"** button via the `vscode://file/` protocol.

### AST Parser — Tree-sitter

Symbol extraction is powered by **Tree-sitter**, providing a full AST-based parse for 11 languages with automatic fallback to the regex heuristic parser when a grammar isn't available.

| Language | Parser |
|---|---|
| JavaScript, TypeScript, TSX | Tree-sitter |
| Python, Java, Go, Rust | Tree-sitter |
| C#, C++, PHP, Ruby | Tree-sitter |
| All other supported languages | Regex fallback |

### Semantic Embeddings & Hybrid Search

`search_graph` supports a **hybrid BM25 + vector search** mode that finds semantically similar code even when it doesn't share keywords with the query.

**How it works:**
1. Each symbol is embedded with `snowflake-arctic-embed-xs` (22M params, 384 dims, ~90 MB, runs fully locally via ONNX Runtime)
2. At query time: BM25 ranks + cosine similarity ranks are fused via **Reciprocal Rank Fusion (RRF)**
3. Results surface symbols semantically related to the query — not just lexically matching ones

Enable it per project at index time:
```
index_repository(path: "/my/project", embeddings: true)
```

Then search:
```
search_graph(project_id: "...", query: "authentication token validation", semantic: true)
```

Embeddings are incremental — only new/modified symbols are re-embedded on subsequent runs.

### Execution Flow Tracing

Automatically detect and visualize how your application executes from its entry points.

```
list_entry_points(project_id: "...")
```
```
execution_flow(project_id: "...", entry_point: "main", depth: 5)
```

Entry points are detected by: role classification, name patterns (`main`, `handler`, `router`, `start`, …), file conventions (`index.ts`, `app.ts`, `server.ts`, …), and HTTP route registration patterns.

The call tree is rendered depth-first with **cycle detection** (↩ marker) and file:line references at each node.

### Docker Support

Run WLADY_CODE in any environment without a local Node.js install:

```bash
# Build and start
WORKSPACE_PATH=/path/to/your/repo docker compose up

# Galaxy UI opens at http://localhost:9750
```

Or with plain Docker:

```bash
docker build -t wlady-code-mcp .
docker run -i --rm \
  -p 9750:9750 \
  -v wlady-db:/root/.wlady-code-mcp \
  -v /path/to/repo:/workspace:ro \
  wlady-code-mcp
```

### MCP Tools Reference

<details>
<summary><strong>Indexing</strong> (4 tools)</summary>

| Tool | Description |
|---|---|
| `index_repository` | Index a full project or update incrementally. Pass `embeddings: true` to generate semantic embeddings (downloads ~90 MB model on first run). |
| `list_projects` | List all indexed projects |
| `delete_project` | Remove a project from the index |
| `detect_changes` | Detect files modified since last index |

</details>

<details>
<summary><strong>Navigation</strong> (5 tools)</summary>

| Tool | Description |
|---|---|
| `where` | Find where a symbol is defined |
| `context` | Full symbol context: definition, callers, callees |
| `path` | Shortest call path between two symbols |
| `trace_path` | All paths upstream/downstream from a symbol |
| `map` | Module map and project structure |

</details>

<details>
<summary><strong>Search</strong> (4 tools)</summary>

| Tool | Description |
|---|---|
| `search_code` | Grep-like text search across all source files |
| `search_graph` | BM25 symbol search. Pass `semantic: true` for hybrid BM25+vector search with RRF (requires embeddings). |
| `query_graph` | Direct graph query with filters (kind, role, complexity, file pattern) |
| `brief` | Short summary of a file or module |

</details>

<details>
<summary><strong>Process Tracing</strong> (2 tools)</summary>

| Tool | Description |
|---|---|
| `execution_flow` | Trace the call tree from an entry point (or auto-detect). Depth-limited BFS with cycle detection. |
| `list_entry_points` | Detect likely entry points: main functions, HTTP handlers, controllers, routers |

</details>

<details>
<summary><strong>Impact Analysis</strong> (3 tools)</summary>

| Tool | Description |
|---|---|
| `fn_impact` | All callers affected by modifying a function |
| `diff_impact` | Current git diff → affected symbols |
| `branch_compare` | Symbol-level comparison between two branches |

</details>

<details>
<summary><strong>Quality & Analysis</strong> (4 tools)</summary>

| Tool | Description |
|---|---|
| `audit` | Full audit: dead code, god files, high complexity, circular deps |
| `complexity` | Cyclomatic + cognitive complexity report per symbol |
| `roles` | Classify symbols by role (entry / core / utility / adapter / dead / leaf) |
| `communities` | Community/cluster detection in the graph |

</details>

<details>
<summary><strong>Architecture</strong> (3 tools)</summary>

| Tool | Description |
|---|---|
| `get_architecture` | High-level view: layers, modules, graph stats |
| `manifesto` | Manage quality rules (complexity thresholds, etc.) |
| `check` | Evaluate codebase against manifesto rules (PASS / WARN / FAIL) |

</details>

<details>
<summary><strong>Architecture Decision Records</strong> (3 tools)</summary>

| Tool | Description |
|---|---|
| `adr_list` | List all recorded architecture decisions |
| `adr_create` | Record a new architecture decision |
| `adr_update` | Update the status of an existing decision |

</details>

---

## Supported Languages

> TypeScript · JavaScript · Java · Kotlin · Python · Go · Rust · C · C++ · C# · PHP · Ruby · Swift · Dart · HTML · CSS/SCSS · JSON · YAML · SQL · Bash

---

## Installation

### Prerequisites

- **Node.js 18+**
- Claude Desktop, Cursor, or any MCP-compatible client

**Linux / macOS** — `better-sqlite3` and `tree-sitter` compile native bindings on install, so you need build tools:
```bash
# Debian / Ubuntu
sudo apt install python3 make g++

# Fedora / RHEL
sudo dnf install python3 make gcc-c++

# Arch
sudo pacman -S python make gcc

# macOS (Xcode CLI tools)
xcode-select --install
```

### Build

```bash
git clone https://github.com/wladimania93/wlady-code-mcp
cd wlady-code-mcp
npm install --legacy-peer-deps   # required for tree-sitter grammar compatibility
npm run build
```

### Register with Claude Desktop

```bash
claude mcp add wlady-code -s user -- node "/absolute/path/to/wlady-code-mcp/dist/index.js"
```

Or manually in `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "wlady-code": {
      "command": "node",
      "args": ["/absolute/path/to/wlady-code-mcp/dist/index.js"]
    }
  }
}
```

### Index your first project

Ask your AI assistant:

```
Index the project at /path/to/my-project
```

Or call the tool directly:

```
index_repository(path: "/path/to/my-project", name: "My Project")
```

The galaxy visualization opens automatically at `http://localhost:9750`.

To enable semantic search:

```
index_repository(path: "/path/to/my-project", embeddings: true)
```

The first run downloads the `snowflake-arctic-embed-xs` model (~90 MB) into `~/.wlady-code-mcp/models/` and caches it for all future runs.

### Environment variables

| Variable | Value | Effect |
|---|---|---|
| `WLADY_UI_PORT` | number | Change UI port (default: `9750`) |
| `WLADY_UI_PORT` | `0` | Disable the UI entirely |

---

## Project Structure

```
wlady-code-mcp/
├── src/
│   ├── index.ts              # MCP entry point + UI server bootstrap
│   ├── types.ts              # Shared types
│   ├── db/                   # SQLite access layer + schema (incl. embeddings table)
│   ├── parser/
│   │   ├── index.ts          # Parser orchestrator (tree-sitter → regex fallback)
│   │   ├── tree-sitter.ts    # AST parser for 11 languages
│   │   └── languages.ts      # Language configs for regex fallback
│   ├── embeddings/
│   │   └── embedder.ts       # snowflake-arctic-embed-xs singleton, batch embedding
│   ├── indexer/              # Index orchestrator + incremental updates + embedding generation
│   ├── graph/                # BFS, DFS, shortest path, cycle detection
│   ├── search/
│   │   ├── bm25.ts           # BM25 full-text search engine
│   │   └── hybrid.ts         # RRF: BM25 + vector search fusion
│   ├── analysis/
│   │   ├── complexity.ts     # Cyclomatic + cognitive complexity
│   │   ├── roles.ts          # Symbol role classifier
│   │   └── entry-points.ts   # Entry point detection (name/file/body patterns)
│   ├── git/                  # Git integration (diff, branch compare)
│   ├── tools/                # All 27 MCP tool handlers (one file per category)
│   └── visualization/
│       ├── graph-data.ts     # SQLite → graph data queries
│       ├── server.ts         # HTTP server :9750 + /api/file endpoint
│       └── template.ts       # Self-contained UI (HTML + CSS + JS, ~34 KB)
├── Dockerfile                # Multi-stage alpine build
├── docker-compose.yml        # Compose with workspace volume + DB persistence
└── dist/                     # Compiled output (run after npm run build)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ · ES Modules |
| MCP | `@modelcontextprotocol/sdk` |
| Database | `better-sqlite3` (embedded, synchronous) |
| AST Parsing | `tree-sitter` + 11 language grammars (MIT) |
| Embeddings | `@huggingface/transformers` · `snowflake-arctic-embed-xs` (Apache-2.0) |
| Git | `simple-git` |
| File watching | `chokidar` |
| Visualization | Canvas 2D · Prism.js |
| HTTP server | Node.js built-in `http` (no Express) |
| Container | Docker · Alpine Linux |

---

## Inspiration & Credits

WLADY_CODE was built by combining and extending the best of three excellent projects:

### [codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp)

The **visual philosophy**: represent a codebase as a galaxy where file importance maps to stellar spectral type, and dependency density creates glowing nebulae via additive color blending. The O/B/A/F/G/K/M spectral color system and the 3D graph architecture are directly inspired by their React + Three.js + Bloom implementation. Our version reimplements it with native Canvas 2D — eliminating build dependencies and serving a fully self-contained UI from the MCP process itself.

### [ops-codegraph-tool](https://github.com/optave/ops-codegraph-tool)

The **analysis philosophy**: treat a codebase as a queryable knowledge graph, with specialized tools for navigation (where is X, what calls Y), impact analysis (if I change Z, what breaks), and quality auditing (dead code, complexity, circular dependencies). The modular handler structure by category and the real-time git integration are directly influenced by this project.

### [GitNexus](https://github.com/abhigyanpatwari/GitNexus)

The **precision philosophy**: AST-level parsing with Tree-sitter for accurate symbol extraction across languages, local vector embeddings for semantic code search, and Reciprocal Rank Fusion to combine keyword and semantic rankings into a single high-quality result set. The approach to embedding storage, the RRF fusion algorithm, and the entry-point tracing patterns were designed with GitNexus as a reference for what best-in-class code intelligence looks like.

**The synthesis:** an MCP that *sees code as a graph* (codegraph), *renders it as a galaxy* (codebase-memory), and *understands it semantically* (GitNexus) — all inside a single server, MIT licensed, with no external services required.

---

<div align="center">

*WLADY_CODE v0.2.0 · Built with Node.js · Powered by MCP*

</div>
