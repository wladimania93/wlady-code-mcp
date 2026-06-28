<div align="center">

# WLADY_CODE MCP

**Advanced codebase intelligence for AI assistants**

[![Version](https://img.shields.io/badge/version-0.1.0-blue?style=flat-square)](package.json)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen?style=flat-square&logo=node.js)](https://nodejs.org)
[![MCP](https://img.shields.io/badge/MCP-compatible-purple?style=flat-square)](https://modelcontextprotocol.io)
[![License](https://img.shields.io/badge/license-MIT-orange?style=flat-square)](LICENSE)

🌐 **English** · [Español](README.es.md)

*An MCP server that turns any codebase into a queryable knowledge graph — and renders it as an interactive galaxy.*

</div>

---

## What is it?

WLADY_CODE indexes your project, builds a dependency graph, and exposes **25 MCP tools** that any compatible AI assistant (Claude, Cursor, etc.) can call to navigate, analyze, and reason about code with surgical precision.

It also spins up a **local 3D galaxy visualization** at `http://localhost:9750` where every file is a star and every dependency is a luminous nebula edge.

```
┌──────────────────────────────────────────────────────────────┐
│                      WLADY_CODE MCP                          │
│                                                              │
│  ┌─────────────┐   ┌────────────────┐   ┌────────────────┐  │
│  │   Indexer   │──▶│   SQLite DB    │◀──│  25 MCP Tools  │  │
│  │ (Parser +   │   │ ~/.wlady-code  │   │                │  │
│  │   Graph)    │   │   -mcp/        │   │ navigation     │  │
│  └─────────────┘   │   wlady.db     │   │ impact         │  │
│                    └────────────────┘   │ analysis       │  │
│  ┌──────────────────────────────────┐   │ architecture   │  │
│  │  Galaxy UI  ·  localhost:9750    │   │ search · adr   │  │
│  └──────────────────────────────────┘   └────────────────┘  │
└──────────────────────────────────────────────────────────────┘
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

### MCP Tools Reference

<details>
<summary><strong>Indexing</strong> (4 tools)</summary>

| Tool | Description |
|---|---|
| `index_repository` | Index a full project or update incrementally |
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
| `search_code` | BM25 semantic code search |
| `search_graph` | Search the dependency graph |
| `query_graph` | Direct graph query with filters |
| `brief` | Short summary of a file or module |

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

### Build

```bash
git clone https://github.com/wladimania93/wlady-code-mcp
cd wlady-code-mcp
npm install
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
Index the project at /path/to/my-project with id "my-project"
```

Or call the tool directly:

```
index_repository(
  project_path: "/path/to/my-project",
  project_id: "my-project",
  project_name: "My Project"
)
```

The galaxy visualization opens automatically at `http://localhost:9750`.

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
│   ├── db/                   # SQLite access layer + schema
│   ├── parser/               # Per-language parsers
│   ├── indexer/              # Index orchestrator + incremental updates
│   ├── graph/                # BFS, DFS, shortest path, cycle detection
│   ├── search/               # BM25 search engine
│   ├── analysis/             # Complexity metrics + role classifier
│   ├── git/                  # Git integration (diff, branch compare)
│   ├── tools/                # All 25 MCP tool handlers
│   └── visualization/
│       ├── graph-data.ts     # SQLite → graph data queries
│       ├── server.ts         # HTTP server :9750 + /api/file endpoint
│       └── template.ts       # Self-contained UI (HTML + CSS + JS, ~34 KB)
└── dist/                     # Compiled output (run after npm run build)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ · ES Modules |
| MCP | `@modelcontextprotocol/sdk` |
| Database | `better-sqlite3` (embedded, synchronous) |
| Git | `simple-git` |
| File watching | `chokidar` |
| Visualization | Canvas 2D · Prism.js (CDN) |
| HTTP server | Node.js built-in `http` (no Express) |

---

## Inspiration & Credits

WLADY_CODE was built by combining the best of two excellent projects:

### [codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp)

The **visual philosophy**: represent a codebase as a galaxy where file importance maps to stellar spectral type, and dependency density creates glowing nebulae via additive color blending. The O/B/A/F/G/K/M spectral color system and the 3D graph architecture are directly inspired by their React + Three.js + Bloom implementation. Our version reimplements it with native Canvas 2D — eliminating build dependencies and serving a fully self-contained UI from the MCP process itself.

### [ops-codegraph-tool](https://github.com/wladimania93/ops-codegraph-tool)

The **analysis philosophy**: treat a codebase as a queryable knowledge graph, with specialized tools for navigation (where is X, what calls Y), impact analysis (if I change Z, what breaks), and quality auditing (dead code, complexity, circular dependencies). The modular handler structure by category and the real-time git integration are directly influenced by this project.

**The synthesis:** an MCP that *sees code as a graph* (codegraph) and *renders it as a galaxy* (codebase-memory) — all inside a single server with no external runtime dependencies.

---

<div align="center">

*WLADY_CODE v0.1.0 · Built with Node.js · Powered by MCP*

</div>
