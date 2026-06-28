import { getDatabase } from '../db/database.js';
import { detectEntryPoints } from '../analysis/entry-points.js';
import type { ToolDefinition, ToolHandler } from './index.js';
import type { Symbol } from '../types.js';

const MAX_DEPTH = 8;
const MAX_CHILDREN = 10;

interface FlowNode {
  symbol: Symbol;
  children: FlowNode[];
  depth: number;
  cyclic: boolean;
}

function buildFlowTree(
  symbolId: number,
  db: ReturnType<typeof getDatabase>,
  visited: Set<number>,
  depth: number,
  maxDepth: number
): FlowNode['children'] {
  if (depth >= maxDepth) return [];

  const callees = db.getCalleesOf(symbolId);
  const children: FlowNode['children'] = [];

  for (const callee of callees.slice(0, MAX_CHILDREN)) {
    const cyclic = visited.has(callee.id);
    const node: FlowNode = { symbol: callee, children: [], depth, cyclic };
    if (!cyclic) {
      visited.add(callee.id);
      node.children = buildFlowTree(callee.id, db, visited, depth + 1, maxDepth);
      visited.delete(callee.id);
    }
    children.push(node);
  }

  if (callees.length > MAX_CHILDREN) {
    children.push({
      symbol: { name: `… ${callees.length - MAX_CHILDREN} more`, kind: 'other', id: -1 } as Symbol,
      children: [],
      depth,
      cyclic: false,
    });
  }

  return children;
}

function renderTree(nodes: FlowNode['children'], prefix = '', isLast = true): string[] {
  const lines: string[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const last = i === nodes.length - 1;
    const connector = last ? '└── ' : '├── ';
    const childPrefix = prefix + (last ? '    ' : '│   ');
    const cycleTag = node.cyclic ? ' ↩ (cycle)' : '';
    const loc = node.symbol.relative_path
      ? ` ${node.symbol.relative_path}:${node.symbol.start_line}`
      : '';
    lines.push(`${prefix}${connector}${node.symbol.kind} ${node.symbol.name}${loc}${cycleTag}`);
    if (node.children.length > 0) {
      lines.push(...renderTree(node.children, childPrefix, last));
    }
  }
  return lines;
}

export const tracingTools: ToolDefinition[] = [
  {
    name: 'execution_flow',
    description:
      'Trace the execution flow from an entry point (or auto-detect entry points). ' +
      'Shows the call tree depth-first with cycle detection.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        entry_point: {
          type: 'string',
          description: 'Symbol name to use as root. Omit to auto-detect entry points.',
        },
        depth: {
          type: 'number',
          description: `Maximum call depth to trace (default 5, max ${MAX_DEPTH})`,
          default: 5,
        },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'list_entry_points',
    description: 'Detect and list likely entry points in a project (main, handlers, HTTP routes, etc.).',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        limit: { type: 'number', description: 'Maximum entry points to return (default 20)', default: 20 },
      },
      required: ['project_id'],
    },
  },
];

export const tracingHandlers: ToolHandler = {
  async execution_flow(args: Record<string, unknown>) {
    const db = getDatabase();
    const projectId = args['project_id'] as string;
    const entryName = args['entry_point'] as string | undefined;
    const depth = Math.min((args['depth'] as number) ?? 5, MAX_DEPTH);

    const lines: string[] = [];

    if (entryName) {
      // Trace a specific symbol
      const sym = db.getSymbolByName(projectId, entryName);
      if (!sym) {
        return { content: [{ type: 'text', text: `Symbol not found: ${entryName}` }] };
      }
      const visited = new Set<number>([sym.id]);
      const children = buildFlowTree(sym.id, db, visited, 0, depth);

      lines.push(`Execution flow from: ${sym.kind} ${sym.name}`);
      lines.push(`File: ${sym.relative_path ?? '?'}:${sym.start_line}`);
      lines.push('');
      lines.push(`${sym.kind} ${sym.name}`);
      lines.push(...renderTree(children));
    } else {
      // Auto-detect entry points and show a flow for each
      const entries = detectEntryPoints(projectId, db, 5);
      if (entries.length === 0) {
        return {
          content: [{
            type: 'text',
            text: 'No entry points detected. Try specifying entry_point explicitly.',
          }],
        };
      }

      lines.push(`Auto-detected ${entries.length} entry point(s):`);
      lines.push('');

      for (const { symbol: sym, reason } of entries) {
        const visited = new Set<number>([sym.id]);
        const children = buildFlowTree(sym.id, db, visited, 0, depth);

        lines.push(`┌─ ${sym.kind} ${sym.name}  [${reason}]`);
        lines.push(`│  ${sym.relative_path ?? '?'}:${sym.start_line}`);
        if (children.length === 0) {
          lines.push('│  (no outgoing calls resolved)');
        } else {
          lines.push(...renderTree(children, '│  '));
        }
        lines.push('');
      }
    }

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  },

  async list_entry_points(args: Record<string, unknown>) {
    const db = getDatabase();
    const projectId = args['project_id'] as string;
    const limit = (args['limit'] as number) ?? 20;

    const entries = detectEntryPoints(projectId, db, limit);

    if (entries.length === 0) {
      return {
        content: [{
          type: 'text',
          text: 'No entry points detected in this project.',
        }],
      };
    }

    const lines = [`Entry points detected (${entries.length}):`, ''];
    for (const { symbol: sym, reason } of entries) {
      lines.push(`  ${sym.kind.padEnd(10)} ${sym.name.padEnd(30)} ${sym.relative_path ?? ''}:${sym.start_line}`);
      lines.push(`             reason: ${reason}`);
    }

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  },
};
