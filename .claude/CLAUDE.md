# WLADY_CODE — Project Instructions

This project is the WLADY_CODE MCP server itself. When working in this codebase, you MUST use the `wlady-code` MCP tools as the primary method for navigating, understanding, and analyzing the code. Do not rely solely on file reading or grep when an MCP tool provides a better answer.

## Setup check

Before any analysis task, verify the project is indexed:

```
list_projects()
```

If `wlady-code-mcp` is not listed, index it first:

```
index_repository(
  project_path: "<absolute path to this directory>",
  project_id: "wlady-code-mcp",
  project_name: "WLADY_CODE MCP"
)
```

## Tool usage rules

### Navigation — always prefer MCP over grep/read

| Task | Use this tool | Not this |
|---|---|---|
| Find where a function is defined | `where(symbol: "functionName")` | grep |
| Understand what a function does and who calls it | `context(symbol: "functionName")` | reading the file |
| Find the call chain between two parts of the code | `path(from: "A", to: "B")` | manual tracing |
| Trace all callers up the chain | `trace_path(symbol: "X", direction: "upstream")` | grep + read |
| Get a summary of a file or module | `brief(target: "src/tools/analysis.ts")` | cat |

### Impact analysis — always run before editing

Before modifying any function or file:

```
fn_impact(symbol: "functionName", project_id: "wlady-code-mcp")
```

This tells you every caller that could be affected by the change. Never skip this step for functions that appear to be called from multiple places.

### Search — use semantic search first

```
search_code(query: "how edges are stored", project_id: "wlady-code-mcp")
```

Only fall back to `grep` for exact string literals or regex patterns that semantic search can't capture.

### Architecture overview — start here for large tasks

When starting a task that touches multiple modules:

```
get_architecture(project_id: "wlady-code-mcp")
```

This gives you the layer map, module breakdown, and graph stats before you dive into files.

### Quality checks — run before PRs

```
audit(project_id: "wlady-code-mcp")
complexity(project_id: "wlady-code-mcp", threshold: 10)
```

Flag any new god files, dead code, or circular dependencies introduced by the change.

## Key modules in this codebase

| Path | Responsibility |
|---|---|
| `src/index.ts` | MCP server entry point |
| `src/tools/` | All 25 MCP tool handlers (one file per category) |
| `src/visualization/template.ts` | Self-contained galaxy UI (~34 KB, HTML+CSS+JS) |
| `src/visualization/server.ts` | HTTP server at :9750 |
| `src/visualization/graph-data.ts` | SQLite → graph data for the UI |
| `src/indexer/index.ts` | File walker + parser orchestrator |
| `src/db/database.ts` | SQLite access layer |
| `src/graph/algorithms.ts` | BFS, DFS, shortest path, cycle detection |

## Paths convention

All `relative_path` values stored in the DB use forward slashes (`/`) regardless of OS. The indexer normalizes them with `.replace(/\\/g, '/')` at write time. Never store or compare paths with backslashes.

## Build

```bash
npm run build   # tsc → dist/
npm start       # node dist/index.js
```

The visualization server starts automatically on `npm start` at `http://localhost:9750`.
