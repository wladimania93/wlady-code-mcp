import { getDatabase } from '../db/database.js';
import type { ToolDefinition, ToolHandler } from './index.js';
import type { Adr } from '../types.js';

function formatAdr(adr: Adr): string {
  const lines = [
    `ADR-${adr.number.toString().padStart(4, '0')}: ${adr.title}`,
    `Status: ${adr.status.toUpperCase()}`,
    `Created: ${new Date(adr.created_at).toISOString().split('T')[0]}`,
    `Updated: ${new Date(adr.updated_at).toISOString().split('T')[0]}`,
    '',
  ];

  if (adr.context_text) {
    lines.push('Context:');
    lines.push(adr.context_text);
    lines.push('');
  }
  if (adr.decision) {
    lines.push('Decision:');
    lines.push(adr.decision);
    lines.push('');
  }
  if (adr.consequences) {
    lines.push('Consequences:');
    lines.push(adr.consequences);
    lines.push('');
  }

  return lines.join('\n');
}

export const adrTools: ToolDefinition[] = [
  {
    name: 'adr_list',
    description: 'List Architecture Decision Records (ADRs) for the project.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        status: { type: 'string', description: 'Filter by status: proposed, accepted, deprecated, superseded' },
        number: { type: 'number', description: 'Show specific ADR by number' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'adr_create',
    description: 'Create a new Architecture Decision Record.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        title: { type: 'string', description: 'ADR title' },
        status: { type: 'string', enum: ['proposed', 'accepted', 'deprecated', 'superseded'], description: 'Initial status', default: 'proposed' },
        context: { type: 'string', description: 'Context and problem statement' },
        decision: { type: 'string', description: 'The decision that was made' },
        consequences: { type: 'string', description: 'Consequences of the decision' },
      },
      required: ['project_id', 'title'],
    },
  },
  {
    name: 'adr_update',
    description: 'Update an existing Architecture Decision Record.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        number: { type: 'number', description: 'ADR number to update' },
        title: { type: 'string', description: 'New title' },
        status: { type: 'string', enum: ['proposed', 'accepted', 'deprecated', 'superseded'], description: 'New status' },
        context: { type: 'string', description: 'Updated context' },
        decision: { type: 'string', description: 'Updated decision' },
        consequences: { type: 'string', description: 'Updated consequences' },
      },
      required: ['project_id', 'number'],
    },
  },
];

export const adrHandlers: ToolHandler = {
  async adr_list(args: Record<string, unknown>) {
    const db = getDatabase();
    const projectId = args['project_id'] as string;
    const statusFilter = args['status'] as string | undefined;
    const numberFilter = args['number'] as number | undefined;

    // Show specific ADR
    if (numberFilter !== undefined) {
      const adr = db.getAdr(projectId, numberFilter);
      if (!adr) {
        return { content: [{ type: 'text', text: `ADR-${numberFilter} not found.` }] };
      }
      return { content: [{ type: 'text', text: formatAdr(adr) }] };
    }

    let adrs = db.listAdrs(projectId);

    if (statusFilter) {
      adrs = adrs.filter(a => a.status === statusFilter);
    }

    if (adrs.length === 0) {
      return { content: [{ type: 'text', text: 'No ADRs found. Use adr_create to add one.' }] };
    }

    const lines = [`Architecture Decision Records (${adrs.length}):`, ''];
    for (const adr of adrs) {
      const statusIcon = {
        proposed: '?',
        accepted: '✓',
        deprecated: '✗',
        superseded: '→',
      }[adr.status] ?? '?';

      lines.push(`  ADR-${adr.number.toString().padStart(4, '0')}  [${statusIcon}] ${adr.title}`);
      lines.push(`         Status: ${adr.status} | Updated: ${new Date(adr.updated_at).toISOString().split('T')[0]}`);
    }

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  },

  async adr_create(args: Record<string, unknown>) {
    const db = getDatabase();
    const projectId = args['project_id'] as string;
    const title = args['title'] as string;
    const status = (args['status'] as Adr['status']) ?? 'proposed';
    const context = args['context'] as string | undefined;
    const decision = args['decision'] as string | undefined;
    const consequences = args['consequences'] as string | undefined;

    const project = db.getProject(projectId);
    if (!project) return { content: [{ type: 'text', text: `Project not found: ${projectId}` }] };

    const number = db.getNextAdrNumber(projectId);
    const now = Date.now();

    db.createAdr({
      project_id: projectId,
      number,
      title,
      status,
      context_text: context,
      decision,
      consequences,
      created_at: now,
      updated_at: now,
    });

    const adr = db.getAdr(projectId, number)!;
    return { content: [{ type: 'text', text: `Created ADR-${number.toString().padStart(4, '0')}\n\n${formatAdr(adr)}` }] };
  },

  async adr_update(args: Record<string, unknown>) {
    const db = getDatabase();
    const projectId = args['project_id'] as string;
    const number = args['number'] as number;

    const existing = db.getAdr(projectId, number);
    if (!existing) {
      return { content: [{ type: 'text', text: `ADR-${number} not found.` }] };
    }

    const updates: Partial<Pick<Adr, 'title' | 'status' | 'context_text' | 'decision' | 'consequences'>> = {};

    if (args['title'] !== undefined) updates.title = args['title'] as string;
    if (args['status'] !== undefined) updates.status = args['status'] as Adr['status'];
    if (args['context'] !== undefined) updates.context_text = args['context'] as string;
    if (args['decision'] !== undefined) updates.decision = args['decision'] as string;
    if (args['consequences'] !== undefined) updates.consequences = args['consequences'] as string;

    db.updateAdr(projectId, number, updates);

    const updated = db.getAdr(projectId, number)!;
    return { content: [{ type: 'text', text: `Updated ADR-${number.toString().padStart(4, '0')}\n\n${formatAdr(updated)}` }] };
  },
};
