import { getDatabase } from '../db/database.js';
import { GraphAlgorithms } from '../graph/algorithms.js';
import type { ToolDefinition, ToolHandler } from './index.js';
import type { Symbol } from '../types.js';

function formatSymbol(s: Symbol): string {
  return `  ${s.kind.padEnd(12)} ${s.name.padEnd(30)} ${s.relative_path ?? ''}:${s.start_line}`;
}

export const navigationTools: ToolDefinition[] = [
  {
    name: 'context',
    description: 'Get the context around a symbol: its definition, callers, callees, and file siblings.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        symbol: { type: 'string', description: 'Symbol name to look up' },
        radius: { type: 'number', description: 'Context radius (default 1)', default: 1 },
      },
      required: ['project_id', 'symbol'],
    },
  },
  {
    name: 'where',
    description: 'Find where a symbol is defined.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        symbol: { type: 'string', description: 'Symbol name' },
      },
      required: ['project_id', 'symbol'],
    },
  },
  {
    name: 'path',
    description: 'Find the shortest call path between two symbols.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        from: { type: 'string', description: 'Source symbol name' },
        to: { type: 'string', description: 'Target symbol name' },
      },
      required: ['project_id', 'from', 'to'],
    },
  },
  {
    name: 'trace_path',
    description: 'Trace all call paths from a symbol (upstream callers or downstream callees).',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        symbol: { type: 'string', description: 'Symbol name' },
        direction: { type: 'string', enum: ['up', 'down'], description: 'up=callers, down=callees', default: 'down' },
        max_depth: { type: 'number', description: 'Maximum traversal depth (default 5)', default: 5 },
      },
      required: ['project_id', 'symbol'],
    },
  },
  {
    name: 'brief',
    description: 'Get a brief overview of a file: its symbols, imports, and exports.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        file: { type: 'string', description: 'Relative file path' },
      },
      required: ['project_id', 'file'],
    },
  },
  {
    name: 'map',
    description: 'Get a structural map of the project: top files by connectivity, module clusters.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        limit: { type: 'number', description: 'Number of top files to show (default 20)', default: 20 },
      },
      required: ['project_id'],
    },
  },
];

export const navigationHandlers: ToolHandler = {
  async context(args: Record<string, unknown>) {
    const db = getDatabase();
    const projectId = args['project_id'] as string;
    const symbolName = args['symbol'] as string;
    const radius = (args['radius'] as number) ?? 1;

    const sym = db.getSymbolByName(projectId, symbolName);
    if (!sym) {
      return { content: [{ type: 'text', text: `Symbol not found: ${symbolName}` }] };
    }

    const graph = new GraphAlgorithms(db);
    const context = graph.getContext(sym.id, radius);
    const callers = db.getCallersOf(sym.id);
    const callees = db.getCalleesOf(sym.id);

    const lines = [
      `Symbol: ${sym.name}`,
      `Kind: ${sym.kind}  Role: ${sym.role}`,
      `File: ${sym.relative_path}:${sym.start_line}-${sym.end_line}`,
      `Complexity: cyclomatic=${sym.complexity_cyclomatic} cognitive=${sym.complexity_cognitive}`,
      '',
    ];

    if (sym.signature) {
      lines.push(`Signature: ${sym.signature}`);
      lines.push('');
    }

    if (callers.length > 0) {
      lines.push(`Callers (${callers.length}):`);
      for (const c of callers.slice(0, 10)) lines.push(formatSymbol(c));
      lines.push('');
    }

    if (callees.length > 0) {
      lines.push(`Callees (${callees.length}):`);
      for (const c of callees.slice(0, 10)) lines.push(formatSymbol(c));
      lines.push('');
    }

    // File siblings
    const siblings = db.getSymbolsByFile(sym.file_id).filter(s => s.id !== sym.id);
    if (siblings.length > 0) {
      lines.push(`File siblings (${siblings.length}):`);
      for (const s of siblings.slice(0, 15)) lines.push(formatSymbol(s));
    }

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  },

  async where(args: Record<string, unknown>) {
    const db = getDatabase();
    const projectId = args['project_id'] as string;
    const symbolName = args['symbol'] as string;

    const raw = db.getRawDb();
    const results = raw.prepare(`
      SELECT s.*, f.path as file_path, f.relative_path
      FROM symbols s JOIN files f ON s.file_id = f.id
      WHERE s.project_id = ? AND s.name = ?
      LIMIT 10
    `).all(projectId, symbolName) as Symbol[];

    if (results.length === 0) {
      // Try partial match
      const partial = raw.prepare(`
        SELECT s.*, f.path as file_path, f.relative_path
        FROM symbols s JOIN files f ON s.file_id = f.id
        WHERE s.project_id = ? AND s.name LIKE ?
        LIMIT 10
      `).all(projectId, `%${symbolName}%`) as Symbol[];

      if (partial.length === 0) {
        return { content: [{ type: 'text', text: `Symbol not found: ${symbolName}` }] };
      }

      const lines = [`No exact match for "${symbolName}". Similar symbols:`, ''];
      for (const s of partial) lines.push(formatSymbol(s));
      return { content: [{ type: 'text', text: lines.join('\n') }] };
    }

    const lines = [`Definitions of "${symbolName}":`, ''];
    for (const s of results) {
      lines.push(`  ${s.kind} ${s.name}`);
      lines.push(`    ${s.relative_path}:${s.start_line}`);
      if (s.signature) lines.push(`    Signature: ${s.signature}`);
      lines.push('');
    }

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  },

  async path(args: Record<string, unknown>) {
    const db = getDatabase();
    const projectId = args['project_id'] as string;
    const fromName = args['from'] as string;
    const toName = args['to'] as string;

    const fromSym = db.getSymbolByName(projectId, fromName);
    const toSym = db.getSymbolByName(projectId, toName);

    if (!fromSym) return { content: [{ type: 'text', text: `Symbol not found: ${fromName}` }] };
    if (!toSym) return { content: [{ type: 'text', text: `Symbol not found: ${toName}` }] };

    const graph = new GraphAlgorithms(db);
    const pathSymbols = graph.shortestPath(fromSym.id, toSym.id);

    if (pathSymbols.length === 0) {
      return { content: [{ type: 'text', text: `No path found from ${fromName} to ${toName}` }] };
    }

    const lines = [`Call path from ${fromName} to ${toName} (${pathSymbols.length} steps):`, ''];
    for (let i = 0; i < pathSymbols.length; i++) {
      const s = pathSymbols[i];
      lines.push(`  ${i + 1}. ${s.name} (${s.relative_path}:${s.start_line})`);
    }

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  },

  async trace_path(args: Record<string, unknown>) {
    const db = getDatabase();
    const projectId = args['project_id'] as string;
    const symbolName = args['symbol'] as string;
    const direction = (args['direction'] as 'up' | 'down') ?? 'down';
    const maxDepth = (args['max_depth'] as number) ?? 5;

    const sym = db.getSymbolByName(projectId, symbolName);
    if (!sym) return { content: [{ type: 'text', text: `Symbol not found: ${symbolName}` }] };

    const graph = new GraphAlgorithms(db);
    const nodes = graph.traceCallChain(sym.id, direction, maxDepth);

    if (nodes.length === 0) {
      return { content: [{ type: 'text', text: `No ${direction === 'down' ? 'callees' : 'callers'} found for ${symbolName}` }] };
    }

    const label = direction === 'down' ? 'Call tree (callees)' : 'Caller tree';
    const lines = [`${label} of ${symbolName}:`, ''];

    for (const node of nodes) {
      const indent = '  '.repeat(node.depth);
      lines.push(`${indent}${node.symbol.name} (${node.symbol.relative_path}:${node.symbol.start_line})`);
    }

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  },

  async brief(args: Record<string, unknown>) {
    const db = getDatabase();
    const projectId = args['project_id'] as string;
    const filePath = args['file'] as string;

    const fileRec = db.getFileByRelativePath(projectId, filePath);
    if (!fileRec) {
      return { content: [{ type: 'text', text: `File not found in index: ${filePath}` }] };
    }

    const symbols = db.getSymbolsByFile(fileRec.id);
    const importers = db.getImportersOf(fileRec.id);

    const lines = [
      `File: ${fileRec.relative_path}`,
      `Language: ${fileRec.language ?? 'unknown'}`,
      `Size: ${fileRec.size ?? 0} bytes`,
      '',
      `Symbols (${symbols.length}):`,
    ];

    const byKind = new Map<string, Symbol[]>();
    for (const s of symbols) {
      const k = byKind.get(s.kind) ?? [];
      k.push(s);
      byKind.set(s.kind, k);
    }

    for (const [kind, syms] of byKind) {
      lines.push(`  ${kind}s:`);
      for (const s of syms) {
        const role = s.role !== 'unknown' ? ` [${s.role}]` : '';
        lines.push(`    ${s.name}${role} (line ${s.start_line})`);
      }
    }

    if (importers.length > 0) {
      lines.push('');
      lines.push(`Imported by (${importers.length}):`);
      for (const f of importers.slice(0, 10)) {
        lines.push(`  ${f.relative_path}`);
      }
    }

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  },

  async map(args: Record<string, unknown>) {
    const db = getDatabase();
    const projectId = args['project_id'] as string;
    const limit = (args['limit'] as number) ?? 20;

    const project = db.getProject(projectId);
    if (!project) return { content: [{ type: 'text', text: `Project not found: ${projectId}` }] };

    const graph = new GraphAlgorithms(db);
    const topFiles = graph.getTopConnectedFiles(projectId, limit);

    const lines = [
      `Project Map: ${project.name}`,
      `Files: ${project.file_count} | Symbols: ${project.symbol_count} | Edges: ${project.edge_count}`,
      '',
      `Top connected files (by import degree):`,
      '',
    ];

    for (let i = 0; i < topFiles.length; i++) {
      const f = topFiles[i];
      lines.push(`  ${(i + 1).toString().padStart(2)}. ${f.relative_path} (degree: ${f.degree})`);
    }

    // Language breakdown
    const raw = db.getRawDb();
    const langRows = raw.prepare(`
      SELECT language, COUNT(*) as cnt FROM files WHERE project_id = ? GROUP BY language ORDER BY cnt DESC
    `).all(projectId) as { language: string; cnt: number }[];

    if (langRows.length > 0) {
      lines.push('');
      lines.push('Language breakdown:');
      for (const r of langRows) {
        lines.push(`  ${(r.language ?? 'unknown').padEnd(15)} ${r.cnt} files`);
      }
    }

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  },
};
