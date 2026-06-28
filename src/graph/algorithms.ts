import type { WladyDatabase } from '../db/database.js';
import type { Symbol, Edge } from '../types.js';

export interface TraceNode {
  symbol: Symbol;
  depth: number;
  path: string[];
}

export interface FileDegree {
  file_id: number;
  relative_path: string;
  degree: number;
}

export class GraphAlgorithms {
  constructor(private db: WladyDatabase) {}

  /**
   * BFS traversal over the call graph.
   * direction='down' follows callees, direction='up' follows callers.
   */
  bfs(startSymbolId: number, direction: 'up' | 'down', maxDepth: number = 5): Symbol[] {
    const visited = new Set<number>();
    const result: Symbol[] = [];
    const queue: { id: number; depth: number }[] = [{ id: startSymbolId, depth: 0 }];

    while (queue.length > 0) {
      const item = queue.shift()!;
      if (visited.has(item.id)) continue;
      visited.add(item.id);

      if (item.depth > 0) {
        const sym = this.db.getSymbolById(item.id);
        if (sym) result.push(sym);
      }

      if (item.depth >= maxDepth) continue;

      const neighbors = direction === 'down'
        ? this.db.getCalleesOf(item.id)
        : this.db.getCallersOf(item.id);

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor.id)) {
          queue.push({ id: neighbor.id, depth: item.depth + 1 });
        }
      }
    }

    return result;
  }

  /**
   * BFS shortest path between two symbols.
   */
  shortestPath(fromId: number, toId: number): Symbol[] {
    if (fromId === toId) {
      const sym = this.db.getSymbolById(fromId);
      return sym ? [sym] : [];
    }

    const visited = new Set<number>();
    const prev = new Map<number, number>();
    const queue: number[] = [fromId];
    visited.add(fromId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const callees = this.db.getCalleesOf(current);

      for (const callee of callees) {
        if (visited.has(callee.id)) continue;
        visited.add(callee.id);
        prev.set(callee.id, current);

        if (callee.id === toId) {
          // Reconstruct path
          return this.reconstructPath(fromId, toId, prev);
        }
        queue.push(callee.id);
      }
    }

    return [];
  }

  private reconstructPath(fromId: number, toId: number, prev: Map<number, number>): Symbol[] {
    const path: number[] = [];
    let current: number | undefined = toId;
    while (current !== undefined) {
      path.unshift(current);
      current = prev.get(current);
    }

    const result: Symbol[] = [];
    for (const id of path) {
      const sym = this.db.getSymbolById(id);
      if (sym) result.push(sym);
    }
    return result;
  }

  /**
   * Union-Find connected components over the call graph.
   * Returns a map of symbolId -> componentId.
   */
  connectedComponents(projectId: string): Map<number, number> {
    const symbols = this.db.getSymbolsByProject(projectId);
    const edges = this.db.getEdgesByProject(projectId);

    const parent = new Map<number, number>();
    const rank = new Map<number, number>();

    for (const sym of symbols) {
      parent.set(sym.id, sym.id);
      rank.set(sym.id, 0);
    }

    const find = (x: number): number => {
      if (parent.get(x) !== x) {
        parent.set(x, find(parent.get(x)!));
      }
      return parent.get(x)!;
    };

    const union = (x: number, y: number) => {
      const px = find(x);
      const py = find(y);
      if (px === py) return;
      const rx = rank.get(px) ?? 0;
      const ry = rank.get(py) ?? 0;
      if (rx < ry) parent.set(px, py);
      else if (rx > ry) parent.set(py, px);
      else { parent.set(py, px); rank.set(px, (rank.get(px) ?? 0) + 1); }
    };

    for (const edge of edges) {
      if (edge.from_symbol_id && edge.to_symbol_id) {
        union(edge.from_symbol_id, edge.to_symbol_id);
      }
    }

    // Normalize component IDs
    const compMap = new Map<number, number>();
    const result = new Map<number, number>();
    let nextComp = 0;

    for (const sym of symbols) {
      const root = find(sym.id);
      if (!compMap.has(root)) {
        compMap.set(root, nextComp++);
      }
      result.set(sym.id, compMap.get(root)!);
    }

    return result;
  }

  /**
   * Get top files by degree (number of import edges in or out).
   */
  getTopConnectedFiles(projectId: string, limit: number = 20): FileDegree[] {
    const raw = this.db.getRawDb();
    const rows = raw.prepare(`
      SELECT f.id as file_id, f.relative_path,
             COUNT(DISTINCT e1.id) + COUNT(DISTINCT e2.id) as degree
      FROM files f
      LEFT JOIN edges e1 ON e1.to_file_id = f.id AND e1.project_id = f.project_id
      LEFT JOIN edges e2 ON e2.from_file_id = f.id AND e2.project_id = f.project_id AND e2.edge_type = 'imports'
      WHERE f.project_id = ?
      GROUP BY f.id
      ORDER BY degree DESC
      LIMIT ?
    `).all(projectId, limit) as FileDegree[];
    return rows;
  }

  /**
   * Trace the call chain from a symbol, returning nodes with depth and path info.
   */
  traceCallChain(
    symbolId: number,
    direction: 'up' | 'down',
    maxDepth: number = 10
  ): TraceNode[] {
    const visited = new Set<number>();
    const result: TraceNode[] = [];

    const dfs = (id: number, depth: number, pathSoFar: string[]) => {
      if (visited.has(id) || depth > maxDepth) return;
      visited.add(id);

      const sym = this.db.getSymbolById(id);
      if (!sym) return;

      const currentPath = [...pathSoFar, sym.name];
      if (depth > 0) {
        result.push({ symbol: sym, depth, path: currentPath });
      }

      const neighbors = direction === 'down'
        ? this.db.getCalleesOf(id)
        : this.db.getCallersOf(id);

      for (const neighbor of neighbors) {
        dfs(neighbor.id, depth + 1, currentPath);
      }
    };

    dfs(symbolId, 0, []);
    return result;
  }

  /**
   * Get all symbols in the same file as the given symbol, plus their direct neighbors.
   */
  getContext(symbolId: number, radius: number = 1): Symbol[] {
    const sym = this.db.getSymbolById(symbolId);
    if (!sym) return [];

    const result = new Map<number, Symbol>();
    result.set(sym.id, sym);

    // Add file siblings
    const siblings = this.db.getSymbolsByFile(sym.file_id);
    for (const s of siblings) result.set(s.id, s);

    if (radius > 0) {
      // Add callers and callees
      const callers = this.db.getCallersOf(symbolId);
      const callees = this.db.getCalleesOf(symbolId);
      for (const s of [...callers, ...callees]) result.set(s.id, s);
    }

    return Array.from(result.values());
  }

  /**
   * Compute in-degree and out-degree for all symbols in a project.
   */
  computeDegrees(projectId: string): Map<number, { in: number; out: number }> {
    const raw = this.db.getRawDb();
    const degrees = new Map<number, { in: number; out: number }>();

    const inRows = raw.prepare(`
      SELECT to_symbol_id as id, COUNT(*) as cnt
      FROM edges WHERE project_id = ? AND to_symbol_id IS NOT NULL AND edge_type = 'calls'
      GROUP BY to_symbol_id
    `).all(projectId) as { id: number; cnt: number }[];

    const outRows = raw.prepare(`
      SELECT from_symbol_id as id, COUNT(*) as cnt
      FROM edges WHERE project_id = ? AND from_symbol_id IS NOT NULL AND edge_type = 'calls'
      GROUP BY from_symbol_id
    `).all(projectId) as { id: number; cnt: number }[];

    for (const r of inRows) {
      const d = degrees.get(r.id) ?? { in: 0, out: 0 };
      d.in = r.cnt;
      degrees.set(r.id, d);
    }
    for (const r of outRows) {
      const d = degrees.get(r.id) ?? { in: 0, out: 0 };
      d.out = r.cnt;
      degrees.set(r.id, d);
    }

    return degrees;
  }
}
