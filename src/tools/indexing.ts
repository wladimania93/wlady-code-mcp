import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { getDatabase } from '../db/database.js';
import { Indexer } from '../indexer/index.js';
import type { ToolDefinition, ToolHandler } from './index.js';

function makeId(projectPath: string): string {
  return crypto.createHash('sha256').update(projectPath).digest('hex').slice(0, 16);
}

export const indexingTools: ToolDefinition[] = [
  {
    name: 'index_repository',
    description: 'Index a code repository to build the symbol graph. Supports incremental updates.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Absolute path to the repository root' },
        name: { type: 'string', description: 'Optional project name (defaults to directory name)' },
        force_rebuild: { type: 'boolean', description: 'Force a full re-index from scratch', default: false },
        embeddings: {
          type: 'boolean',
          description: 'Generate semantic embeddings for symbols (enables hybrid search). Downloads ~90MB model on first run.',
          default: false,
        },
      },
      required: ['path'],
    },
  },
  {
    name: 'list_projects',
    description: 'List all indexed projects with their stats.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'delete_project',
    description: 'Remove a project and all its indexed data from the database.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID to delete' },
      },
      required: ['project_id'],
    },
  },
];

export const indexingHandlers: ToolHandler = {
  async index_repository(args: Record<string, unknown>) {
    const projectPath = args['path'] as string;
    const forceBuild = (args['force_rebuild'] as boolean) ?? false;

    if (!fs.existsSync(projectPath)) {
      return { content: [{ type: 'text', text: `Error: Path does not exist: ${projectPath}` }] };
    }

    const db = getDatabase();
    const projectId = makeId(projectPath);
    const projectName = (args['name'] as string) ?? path.basename(projectPath);

    // Upsert project
    const existing = db.getProject(projectId);
    db.upsertProject({
      id: projectId,
      name: projectName,
      path: projectPath,
      created_at: existing?.created_at ?? Date.now(),
    });

    const genEmbeddings = (args['embeddings'] as boolean) ?? false;
    const indexer = new Indexer(db);
    const stats = await indexer.index(projectPath, projectId, forceBuild, { embeddings: genEmbeddings });

    const embLine = stats.embeddings_generated !== undefined
      ? [`  Embeddings generated: ${stats.embeddings_generated}`]
      : [];

    const text = [
      `Project indexed: ${projectName}`,
      `ID: ${projectId}`,
      `Path: ${projectPath}`,
      ``,
      `Stats:`,
      `  Files processed: ${stats.files_processed}`,
      `  Files skipped: ${stats.files_skipped}`,
      `  Symbols found: ${stats.symbols_found}`,
      `  Edges found: ${stats.edges_found}`,
      ...embLine,
      `  Duration: ${stats.duration_ms}ms`,
    ].join('\n');

    return { content: [{ type: 'text', text }] };
  },

  async list_projects(_args: Record<string, unknown>) {
    const db = getDatabase();
    const projects = db.listProjects();

    if (projects.length === 0) {
      return { content: [{ type: 'text', text: 'No projects indexed yet. Use index_repository to add one.' }] };
    }

    const lines = ['Indexed Projects:', ''];
    for (const p of projects) {
      const indexed = p.indexed_at ? new Date(p.indexed_at).toISOString() : 'never';
      lines.push(`  ${p.name} (${p.id})`);
      lines.push(`    Path: ${p.path}`);
      lines.push(`    Files: ${p.file_count} | Symbols: ${p.symbol_count} | Edges: ${p.edge_count}`);
      lines.push(`    Last indexed: ${indexed}`);
      lines.push('');
    }

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  },

  async delete_project(args: Record<string, unknown>) {
    const projectId = args['project_id'] as string;
    const db = getDatabase();
    const project = db.getProject(projectId);

    if (!project) {
      return { content: [{ type: 'text', text: `Error: Project not found: ${projectId}` }] };
    }

    db.deleteProject(projectId);
    return { content: [{ type: 'text', text: `Project deleted: ${project.name} (${projectId})` }] };
  },
};
