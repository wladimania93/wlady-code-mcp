import { getDatabase } from '../db/database.js';
import { GraphAlgorithms } from '../graph/algorithms.js';
import { GitIntegration } from '../git/index.js';
import type { ToolDefinition, ToolHandler } from './index.js';
import type { Symbol } from '../types.js';

function formatSymbol(s: Symbol): string {
  return `  ${s.kind.padEnd(12)} ${s.name.padEnd(30)} ${s.relative_path ?? ''}:${s.start_line}`;
}

export const impactTools: ToolDefinition[] = [
  {
    name: 'fn_impact',
    description: 'Analyze the impact of changing a function: find all upstream callers affected.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        symbol: { type: 'string', description: 'Function/symbol name to analyze' },
        max_depth: { type: 'number', description: 'Maximum caller depth (default 5)', default: 5 },
      },
      required: ['project_id', 'symbol'],
    },
  },
  {
    name: 'diff_impact',
    description: 'Analyze the impact of current git changes: which symbols are affected and who calls them.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        project_path: { type: 'string', description: 'Path to the git repository' },
        staged: { type: 'boolean', description: 'Analyze staged changes only', default: false },
      },
      required: ['project_id', 'project_path'],
    },
  },
  {
    name: 'detect_changes',
    description: 'Detect which files have changed since last index (using mtime/hash comparison).',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'branch_compare',
    description: 'Compare symbols between two git branches to see what changed.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        project_path: { type: 'string', description: 'Path to the git repository' },
        base: { type: 'string', description: 'Base branch name (e.g. main)' },
        head: { type: 'string', description: 'Head branch name (e.g. feature/xyz)' },
      },
      required: ['project_id', 'project_path', 'base', 'head'],
    },
  },
];

export const impactHandlers: ToolHandler = {
  async fn_impact(args: Record<string, unknown>) {
    const db = getDatabase();
    const projectId = args['project_id'] as string;
    const symbolName = args['symbol'] as string;
    const maxDepth = (args['max_depth'] as number) ?? 5;

    const sym = db.getSymbolByName(projectId, symbolName);
    if (!sym) return { content: [{ type: 'text', text: `Symbol not found: ${symbolName}` }] };

    const graph = new GraphAlgorithms(db);
    const callers = graph.bfs(sym.id, 'up', maxDepth);

    const lines = [
      `Impact analysis for: ${symbolName}`,
      `Location: ${sym.relative_path}:${sym.start_line}`,
      `Kind: ${sym.kind} | Role: ${sym.role}`,
      '',
      `Affected callers (${callers.length} found, depth=${maxDepth}):`,
      '',
    ];

    if (callers.length === 0) {
      lines.push('  No callers found. This symbol may be an entry point or dead code.');
    } else {
      // Group by file
      const byFile = new Map<string, Symbol[]>();
      for (const c of callers) {
        const key = c.relative_path ?? 'unknown';
        const arr = byFile.get(key) ?? [];
        arr.push(c);
        byFile.set(key, arr);
      }

      for (const [file, syms] of byFile) {
        lines.push(`  ${file}:`);
        for (const s of syms) {
          lines.push(`    ${s.kind} ${s.name} (line ${s.start_line})`);
        }
      }
    }

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  },

  async diff_impact(args: Record<string, unknown>) {
    const db = getDatabase();
    const projectId = args['project_id'] as string;
    const projectPath = args['project_path'] as string;
    const staged = (args['staged'] as boolean) ?? false;

    const git = new GitIntegration(projectPath, db);
    const changedSymbols = await git.getDiffSymbols(projectId, staged);

    if (changedSymbols.length === 0) {
      return { content: [{ type: 'text', text: 'No symbols affected by current diff.' }] };
    }

    const graph = new GraphAlgorithms(db);
    const lines = [
      `Diff impact analysis (${staged ? 'staged' : 'unstaged'} changes):`,
      '',
      `Directly changed symbols (${changedSymbols.length}):`,
    ];

    for (const s of changedSymbols) {
      lines.push(formatSymbol(s));
    }

    lines.push('');
    lines.push('Upstream callers affected:');

    const affectedCallers = new Set<number>();
    for (const sym of changedSymbols) {
      const callers = graph.bfs(sym.id, 'up', 3);
      for (const c of callers) {
        if (!changedSymbols.some(s => s.id === c.id)) {
          affectedCallers.add(c.id);
        }
      }
    }

    if (affectedCallers.size === 0) {
      lines.push('  None found.');
    } else {
      for (const id of affectedCallers) {
        const s = db.getSymbolById(id);
        if (s) lines.push(formatSymbol(s));
      }
    }

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  },

  async detect_changes(args: Record<string, unknown>) {
    const db = getDatabase();
    const projectId = args['project_id'] as string;

    const project = db.getProject(projectId);
    if (!project) return { content: [{ type: 'text', text: `Project not found: ${projectId}` }] };

    const { IncrementalDetector } = await import('../indexer/incremental.js');
    const { glob } = await import('glob');
    const { INDEXABLE_EXTENSIONS } = await import('../parser/languages.js');
    const path = await import('path');
    const fs = await import('fs');
    const { createRequire } = await import('module');
    const _req = createRequire(import.meta.url);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ignoreFactory: () => { add(p: string | string[]): any; ignores(p: string): boolean } = _req('ignore');
    const ig = ignoreFactory();
    ig.add(['node_modules/**', '.git/**', 'dist/**', 'build/**']);
    const gitignorePath = path.join(project.path, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      ig.add(fs.readFileSync(gitignorePath, 'utf-8'));
    }

    const allFiles = await glob('**/*', { cwd: project.path, nodir: true, absolute: true, dot: false });
    const indexableFiles = allFiles.filter(f => {
      const rel = path.relative(project.path, f).replace(/\\/g, '/');
      if (ig.ignores(rel)) return false;
      const ext = path.extname(f).toLowerCase();
      return INDEXABLE_EXTENSIONS.has(ext);
    });

    const existingFiles = db.getFilesByProject(projectId);
    const detector = new IncrementalDetector();
    const { added, modified, deleted } = await detector.getChangedFiles(project.path, existingFiles, indexableFiles);

    const lines = [
      `Change detection for: ${project.name}`,
      `Last indexed: ${project.indexed_at ? new Date(project.indexed_at).toISOString() : 'never'}`,
      '',
      `Added files (${added.length}):`,
      ...added.slice(0, 20).map(f => `  + ${path.relative(project.path, f)}`),
      '',
      `Modified files (${modified.length}):`,
      ...modified.slice(0, 20).map(f => `  ~ ${path.relative(project.path, f)}`),
      '',
      `Deleted files (${deleted.length}):`,
      ...deleted.slice(0, 20).map(f => `  - ${path.relative(project.path, f)}`),
    ];

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  },

  async branch_compare(args: Record<string, unknown>) {
    const db = getDatabase();
    const projectId = args['project_id'] as string;
    const projectPath = args['project_path'] as string;
    const base = args['base'] as string;
    const head = args['head'] as string;

    const git = new GitIntegration(projectPath, db);
    const diff = await git.compareBranches(projectId, base, head);

    const lines = [
      `Branch comparison: ${base} → ${head}`,
      '',
      `Added symbols (${diff.added.length}):`,
      ...diff.added.slice(0, 20).map(s => formatSymbol(s)),
      '',
      `Modified symbols (${diff.modified.length}):`,
      ...diff.modified.slice(0, 20).map(s => formatSymbol(s)),
      '',
      `Removed symbols (${diff.removed.length}):`,
      ...diff.removed.slice(0, 20).map(s => formatSymbol(s)),
    ];

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  },
};
