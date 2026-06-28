import { getDatabase } from '../db/database.js';
import { GraphAlgorithms } from '../graph/algorithms.js';
import { RoleClassifier } from '../analysis/roles.js';
import { computeCyclomatic, computeCognitive, computeMaintainability } from '../analysis/complexity.js';
import type { ToolDefinition, ToolHandler } from './index.js';
import type { Symbol } from '../types.js';

export const analysisTools: ToolDefinition[] = [
  {
    name: 'audit',
    description: 'Audit the codebase for quality issues: dead code, high complexity, missing coverage, circular deps.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        checks: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific checks to run: dead_code, high_complexity, god_files, circular_deps. Default: all.',
        },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'roles',
    description: 'Classify and display the roles of symbols in the project (entry, core, utility, adapter, dead, leaf).',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        reclassify: { type: 'boolean', description: 'Re-run role classification before showing results', default: false },
        filter_role: { type: 'string', description: 'Show only symbols with this role' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'complexity',
    description: 'Show complexity metrics for symbols in the project, sorted by complexity.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        min_cyclomatic: { type: 'number', description: 'Minimum cyclomatic complexity to show', default: 5 },
        limit: { type: 'number', description: 'Maximum results', default: 30 },
        file: { type: 'string', description: 'Filter to specific file (relative path)' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'communities',
    description: 'Detect code communities/clusters using graph connectivity analysis.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        min_size: { type: 'number', description: 'Minimum community size to show', default: 2 },
      },
      required: ['project_id'],
    },
  },
];

export const analysisHandlers: ToolHandler = {
  async audit(args: Record<string, unknown>) {
    const db = getDatabase();
    const projectId = args['project_id'] as string;
    const checks = (args['checks'] as string[]) ?? ['dead_code', 'high_complexity', 'god_files', 'circular_deps'];

    const project = db.getProject(projectId);
    if (!project) return { content: [{ type: 'text', text: `Project not found: ${projectId}` }] };

    const lines = [`Audit: ${project.name}`, ''];
    const raw = db.getRawDb();

    if (checks.includes('dead_code')) {
      const dead = raw.prepare(`
        SELECT s.*, f.path as file_path, f.relative_path
        FROM symbols s JOIN files f ON s.file_id = f.id
        WHERE s.project_id = ? AND s.role = 'dead'
        LIMIT 30
      `).all(projectId) as Symbol[];

      lines.push(`=== Dead Code (${dead.length} symbols) ===`);
      if (dead.length === 0) {
        lines.push('  No dead code detected.');
      } else {
        for (const s of dead) {
          lines.push(`  ${s.kind} ${s.name} - ${s.relative_path}:${s.start_line}`);
        }
      }
      lines.push('');
    }

    if (checks.includes('high_complexity')) {
      const complex = raw.prepare(`
        SELECT s.*, f.path as file_path, f.relative_path
        FROM symbols s JOIN files f ON s.file_id = f.id
        WHERE s.project_id = ? AND s.complexity_cyclomatic >= 10
        ORDER BY s.complexity_cyclomatic DESC
        LIMIT 20
      `).all(projectId) as Symbol[];

      lines.push(`=== High Complexity (${complex.length} symbols with cyclomatic >= 10) ===`);
      if (complex.length === 0) {
        lines.push('  No high-complexity symbols detected.');
      } else {
        for (const s of complex) {
          const loc = s.end_line - s.start_line + 1;
          const mi = computeMaintainability(s.complexity_cyclomatic, loc);
          lines.push(`  CC=${s.complexity_cyclomatic} COG=${s.complexity_cognitive} MI=${mi.toFixed(0)} | ${s.kind} ${s.name} (${s.relative_path}:${s.start_line})`);
        }
      }
      lines.push('');
    }

    if (checks.includes('god_files')) {
      const godFiles = raw.prepare(`
        SELECT f.relative_path, COUNT(s.id) as sym_count
        FROM files f JOIN symbols s ON s.file_id = f.id
        WHERE f.project_id = ?
        GROUP BY f.id
        HAVING sym_count > 20
        ORDER BY sym_count DESC
        LIMIT 10
      `).all(projectId) as { relative_path: string; sym_count: number }[];

      lines.push(`=== God Files (${godFiles.length} files with >20 symbols) ===`);
      if (godFiles.length === 0) {
        lines.push('  No god files detected.');
      } else {
        for (const f of godFiles) {
          lines.push(`  ${f.sym_count} symbols - ${f.relative_path}`);
        }
      }
      lines.push('');
    }

    if (checks.includes('circular_deps')) {
      // Simple circular import detection: find files that import each other
      const cycles = raw.prepare(`
        SELECT f1.relative_path as file1, f2.relative_path as file2
        FROM edges e1
        JOIN edges e2 ON e1.from_file_id = e2.to_file_id AND e1.to_file_id = e2.from_file_id
        JOIN files f1 ON e1.from_file_id = f1.id
        JOIN files f2 ON e1.to_file_id = f2.id
        WHERE e1.project_id = ? AND e1.edge_type = 'imports' AND e2.edge_type = 'imports'
        AND f1.relative_path < f2.relative_path
        LIMIT 20
      `).all(projectId) as { file1: string; file2: string }[];

      lines.push(`=== Circular Dependencies (${cycles.length} pairs) ===`);
      if (cycles.length === 0) {
        lines.push('  No circular dependencies detected.');
      } else {
        for (const c of cycles) {
          lines.push(`  ${c.file1} <-> ${c.file2}`);
        }
      }
      lines.push('');
    }

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  },

  async roles(args: Record<string, unknown>) {
    const db = getDatabase();
    const projectId = args['project_id'] as string;
    const reclassify = (args['reclassify'] as boolean) ?? false;
    const filterRole = args['filter_role'] as string | undefined;

    if (reclassify) {
      const classifier = new RoleClassifier(db);
      classifier.classifyProject(projectId);
    }

    const classifier = new RoleClassifier(db);
    const summary = classifier.getRoleSummary(projectId);

    const lines = ['Role Classification Summary:', ''];
    const roleOrder = ['entry', 'core', 'utility', 'adapter', 'dead', 'leaf', 'unknown'] as const;
    for (const role of roleOrder) {
      const count = summary[role];
      const bar = '█'.repeat(Math.min(40, Math.floor(count / 2)));
      lines.push(`  ${role.padEnd(10)} ${count.toString().padStart(5)}  ${bar}`);
    }
    lines.push('');

    const raw = db.getRawDb();
    let sql = `
      SELECT s.*, f.path as file_path, f.relative_path
      FROM symbols s JOIN files f ON s.file_id = f.id
      WHERE s.project_id = ?
    `;
    const params: unknown[] = [projectId];

    if (filterRole) {
      sql += ' AND s.role = ?';
      params.push(filterRole);
    }

    sql += ' ORDER BY s.role, s.name LIMIT 50';
    const symbols = raw.prepare(sql).all(...params) as Symbol[];

    if (filterRole) {
      lines.push(`Symbols with role "${filterRole}":`);
      for (const s of symbols) {
        lines.push(`  ${s.kind.padEnd(12)} ${s.name.padEnd(30)} ${s.relative_path}:${s.start_line}`);
      }
    } else {
      lines.push('Sample symbols by role (top 50):');
      let currentRole = '';
      for (const s of symbols) {
        if (s.role !== currentRole) {
          currentRole = s.role;
          lines.push(`\n[${currentRole}]`);
        }
        lines.push(`  ${s.kind.padEnd(12)} ${s.name.padEnd(30)} ${s.relative_path}:${s.start_line}`);
      }
    }

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  },

  async complexity(args: Record<string, unknown>) {
    const db = getDatabase();
    const projectId = args['project_id'] as string;
    const minCyclomatic = (args['min_cyclomatic'] as number) ?? 5;
    const limit = (args['limit'] as number) ?? 30;
    const fileFilter = args['file'] as string | undefined;

    const raw = db.getRawDb();
    let sql = `
      SELECT s.*, f.path as file_path, f.relative_path
      FROM symbols s JOIN files f ON s.file_id = f.id
      WHERE s.project_id = ? AND s.complexity_cyclomatic >= ?
    `;
    const params: unknown[] = [projectId, minCyclomatic];

    if (fileFilter) {
      sql += ' AND f.relative_path LIKE ?';
      params.push(`%${fileFilter}%`);
    }

    sql += ' ORDER BY s.complexity_cyclomatic DESC, s.complexity_cognitive DESC LIMIT ?';
    params.push(limit);

    const symbols = raw.prepare(sql).all(...params) as Symbol[];

    if (symbols.length === 0) {
      return { content: [{ type: 'text', text: `No symbols with cyclomatic complexity >= ${minCyclomatic} found.` }] };
    }

    const lines = [
      `Complexity Report (cyclomatic >= ${minCyclomatic}, showing ${symbols.length}):`,
      '',
      `${'CC'.padStart(4)} ${'COG'.padStart(4)} ${'LOC'.padStart(5)}  ${'MI'.padStart(5)}  Symbol`,
      '-'.repeat(70),
    ];

    for (const s of symbols) {
      const loc = s.end_line - s.start_line + 1;
      const mi = computeMaintainability(s.complexity_cyclomatic, loc);
      const miStr = mi.toFixed(0);
      const alert = s.complexity_cyclomatic >= 20 ? ' ⚠' : '';
      lines.push(
        `${s.complexity_cyclomatic.toString().padStart(4)} ${s.complexity_cognitive.toString().padStart(4)} ${loc.toString().padStart(5)}  ${miStr.padStart(5)}  ${s.kind} ${s.name} (${s.relative_path}:${s.start_line})${alert}`
      );
    }

    // Stats
    const total = symbols.length;
    const avgCC = symbols.reduce((a, s) => a + s.complexity_cyclomatic, 0) / total;
    lines.push('');
    lines.push(`Average cyclomatic: ${avgCC.toFixed(1)} | Highest: ${symbols[0].complexity_cyclomatic}`);

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  },

  async communities(args: Record<string, unknown>) {
    const db = getDatabase();
    const projectId = args['project_id'] as string;
    const minSize = (args['min_size'] as number) ?? 2;

    const graph = new GraphAlgorithms(db);
    const componentMap = graph.connectedComponents(projectId);

    // Group by component
    const components = new Map<number, number[]>();
    for (const [symId, compId] of componentMap) {
      const arr = components.get(compId) ?? [];
      arr.push(symId);
      components.set(compId, arr);
    }

    // Filter by min size and sort by size
    const significant = Array.from(components.entries())
      .filter(([, members]) => members.length >= minSize)
      .sort((a, b) => b[1].length - a[1].length);

    if (significant.length === 0) {
      return { content: [{ type: 'text', text: `No communities with ${minSize}+ members found.` }] };
    }

    const lines = [
      `Code Communities (${significant.length} clusters with ${minSize}+ members):`,
      '',
    ];

    for (let i = 0; i < Math.min(significant.length, 20); i++) {
      const [compId, memberIds] = significant[i];
      lines.push(`Cluster ${i + 1} (${memberIds.length} symbols):`);

      // Get sample symbols
      for (const symId of memberIds.slice(0, 8)) {
        const sym = db.getSymbolById(symId);
        if (sym) {
          lines.push(`  ${sym.kind.padEnd(10)} ${sym.name.padEnd(25)} ${sym.relative_path}:${sym.start_line}`);
        }
      }
      if (memberIds.length > 8) {
        lines.push(`  ... and ${memberIds.length - 8} more`);
      }
      lines.push('');
    }

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  },
};
