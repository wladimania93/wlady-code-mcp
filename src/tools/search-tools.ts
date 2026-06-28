import { getDatabase } from '../db/database.js';
import { SearchEngine } from '../search/bm25.js';
import type { ToolDefinition, ToolHandler } from './index.js';
import type { Symbol } from '../types.js';

function formatSymbol(s: Symbol): string {
  const role = s.role !== 'unknown' ? ` [${s.role}]` : '';
  return `  ${s.kind.padEnd(12)} ${s.name.padEnd(30)} ${s.relative_path ?? ''}:${s.start_line}${role}`;
}

export const searchTools: ToolDefinition[] = [
  {
    name: 'search_code',
    description: 'Search source code text across all files in the project (grep-like).',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        query: { type: 'string', description: 'Text to search for. Wrap in /.../ for regex.' },
        limit: { type: 'number', description: 'Maximum results (default 30)', default: 30 },
      },
      required: ['project_id', 'query'],
    },
  },
  {
    name: 'search_graph',
    description: 'Semantic search over the symbol graph using BM25 full-text search. Supports multi-query with semicolons.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        query: { type: 'string', description: 'Search query. Use semicolons for multi-query: "auth; JWT; token"' },
        kinds: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by symbol kinds: function, class, method, interface, variable, type, enum',
        },
        limit: { type: 'number', description: 'Maximum results (default 20)', default: 20 },
      },
      required: ['project_id', 'query'],
    },
  },
  {
    name: 'query_graph',
    description: 'Run a raw SQL-like structured query against the symbol graph.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        filter: {
          type: 'object',
          description: 'Filter criteria',
          properties: {
            kind: { type: 'string', description: 'Symbol kind' },
            role: { type: 'string', description: 'Symbol role' },
            min_cyclomatic: { type: 'number', description: 'Minimum cyclomatic complexity' },
            max_cyclomatic: { type: 'number', description: 'Maximum cyclomatic complexity' },
            file_pattern: { type: 'string', description: 'File path pattern (substring match)' },
            name_pattern: { type: 'string', description: 'Symbol name pattern (substring match)' },
          },
        },
        order_by: { type: 'string', description: 'Order by field: name, start_line, complexity_cyclomatic, complexity_cognitive', default: 'name' },
        limit: { type: 'number', description: 'Maximum results (default 50)', default: 50 },
      },
      required: ['project_id'],
    },
  },
];

export const searchHandlers: ToolHandler = {
  async search_code(args: Record<string, unknown>) {
    const db = getDatabase();
    const projectId = args['project_id'] as string;
    const query = args['query'] as string;
    const limit = (args['limit'] as number) ?? 30;

    const engine = new SearchEngine(db);
    const results = await engine.searchCode(query, projectId, limit);

    if (results.length === 0) {
      return { content: [{ type: 'text', text: `No results found for: ${query}` }] };
    }

    const lines = [`Code search results for "${query}" (${results.length} matches):`, ''];
    for (const r of results) {
      lines.push(`${r.relative_path}:${r.line}`);
      lines.push('  ' + r.snippet.split('\n').join('\n  '));
      lines.push('');
    }

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  },

  async search_graph(args: Record<string, unknown>) {
    const db = getDatabase();
    const projectId = args['project_id'] as string;
    const query = args['query'] as string;
    const kinds = args['kinds'] as string[] | undefined;
    const limit = (args['limit'] as number) ?? 20;

    const engine = new SearchEngine(db);
    const results = engine.search(query, projectId, { limit, kinds });

    if (results.length === 0) {
      return { content: [{ type: 'text', text: `No symbols found matching: ${query}` }] };
    }

    const lines = [`Symbol search results for "${query}" (${results.length} found):`, ''];
    for (const s of results) {
      lines.push(formatSymbol(s));
    }

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  },

  async query_graph(args: Record<string, unknown>) {
    const db = getDatabase();
    const projectId = args['project_id'] as string;
    const filter = (args['filter'] as Record<string, unknown>) ?? {};
    const orderBy = (args['order_by'] as string) ?? 'name';
    const limit = (args['limit'] as number) ?? 50;

    const allowedOrderBy = ['name', 'start_line', 'complexity_cyclomatic', 'complexity_cognitive', 'role', 'kind'];
    const safeOrderBy = allowedOrderBy.includes(orderBy) ? orderBy : 'name';

    const raw = db.getRawDb();
    let sql = `
      SELECT s.*, f.path as file_path, f.relative_path
      FROM symbols s JOIN files f ON s.file_id = f.id
      WHERE s.project_id = ?
    `;
    const params: unknown[] = [projectId];

    if (filter['kind']) {
      sql += ' AND s.kind = ?';
      params.push(filter['kind']);
    }
    if (filter['role']) {
      sql += ' AND s.role = ?';
      params.push(filter['role']);
    }
    if (filter['min_cyclomatic'] !== undefined) {
      sql += ' AND s.complexity_cyclomatic >= ?';
      params.push(filter['min_cyclomatic']);
    }
    if (filter['max_cyclomatic'] !== undefined) {
      sql += ' AND s.complexity_cyclomatic <= ?';
      params.push(filter['max_cyclomatic']);
    }
    if (filter['file_pattern']) {
      sql += ' AND f.relative_path LIKE ?';
      params.push(`%${filter['file_pattern']}%`);
    }
    if (filter['name_pattern']) {
      sql += ' AND s.name LIKE ?';
      params.push(`%${filter['name_pattern']}%`);
    }

    sql += ` ORDER BY s.${safeOrderBy} LIMIT ?`;
    params.push(limit);

    const results = raw.prepare(sql).all(...params) as Symbol[];

    if (results.length === 0) {
      return { content: [{ type: 'text', text: 'No symbols match the given filters.' }] };
    }

    const lines = [`Query results (${results.length} symbols):`, ''];
    for (const s of results) {
      lines.push(formatSymbol(s));
    }

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  },
};
