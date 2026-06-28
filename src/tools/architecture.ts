import { getDatabase } from '../db/database.js';
import { GitIntegration } from '../git/index.js';
import { computeMaintainability } from '../analysis/complexity.js';
import { getFileOwners, getOwnerSummary } from '../analysis/codeowners.js';
import type { ToolDefinition, ToolHandler } from './index.js';
import type { Symbol, ManifestoRule } from '../types.js';

export const architectureTools: ToolDefinition[] = [
  {
    name: 'get_architecture',
    description: 'Get a high-level architecture overview: layers, modules, dependency graph summary.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        project_path: { type: 'string', description: 'Optional: project path for git info' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'manifesto',
    description: 'Manage project quality manifesto rules (thresholds for complexity, dead code, etc.).',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        action: { type: 'string', enum: ['list', 'add', 'remove'], description: 'Action to perform', default: 'list' },
        rule_name: { type: 'string', description: 'Rule name (for add/remove)' },
        metric: { type: 'string', description: 'Metric name: max_cyclomatic, max_cognitive, max_file_symbols, max_dead_ratio' },
        warn_threshold: { type: 'number', description: 'Warning threshold value' },
        fail_threshold: { type: 'number', description: 'Failure threshold value' },
      },
      required: ['project_id', 'action'],
    },
  },
  {
    name: 'check',
    description: 'Run manifesto checks against the current codebase state. Returns PASS/WARN/FAIL per rule.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'code_owners',
    description: 'Show CODEOWNERS information: who owns a file, all patterns, or a summary by owner. Reads .github/CODEOWNERS, CODEOWNERS, or docs/CODEOWNERS.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        rel_path:   { type: 'string', description: 'Optional: relative file path to find owners for' },
      },
      required: ['project_id'],
    },
  },
];

export const architectureHandlers: ToolHandler = {
  async get_architecture(args: Record<string, unknown>) {
    const db = getDatabase();
    const projectId = args['project_id'] as string;
    const projectPath = args['project_path'] as string | undefined;

    const project = db.getProject(projectId);
    if (!project) return { content: [{ type: 'text', text: `Project not found: ${projectId}` }] };

    const raw = db.getRawDb();

    const lines = [
      `Architecture Overview: ${project.name}`,
      `Path: ${project.path}`,
      `Files: ${project.file_count} | Symbols: ${project.symbol_count} | Edges: ${project.edge_count}`,
      '',
    ];

    // Language breakdown
    const langs = raw.prepare(`
      SELECT language, COUNT(*) as cnt FROM files WHERE project_id = ? GROUP BY language ORDER BY cnt DESC
    `).all(projectId) as { language: string; cnt: number }[];
    lines.push('Languages:');
    for (const l of langs) {
      lines.push(`  ${(l.language ?? 'unknown').padEnd(15)} ${l.cnt} files`);
    }
    lines.push('');

    // Top-level modules (infer from top-level directories)
    const topDirs = raw.prepare(`
      SELECT SUBSTR(relative_path, 1, INSTR(relative_path || '/', '/') - 1) as dir, COUNT(*) as cnt
      FROM files WHERE project_id = ? AND relative_path LIKE '%/%'
      GROUP BY dir ORDER BY cnt DESC LIMIT 15
    `).all(projectId) as { dir: string; cnt: number }[];
    if (topDirs.length > 0) {
      lines.push('Top-level modules:');
      for (const d of topDirs) {
        lines.push(`  /${d.dir.padEnd(20)} ${d.cnt} files`);
      }
      lines.push('');
    }

    // Role distribution
    const roles = raw.prepare(`
      SELECT role, COUNT(*) as cnt FROM symbols WHERE project_id = ? GROUP BY role ORDER BY cnt DESC
    `).all(projectId) as { role: string; cnt: number }[];
    lines.push('Symbol roles:');
    for (const r of roles) {
      lines.push(`  ${r.role.padEnd(12)} ${r.cnt}`);
    }
    lines.push('');

    // Entry points
    const entries = raw.prepare(`
      SELECT s.*, f.relative_path
      FROM symbols s JOIN files f ON s.file_id = f.id
      WHERE s.project_id = ? AND s.role = 'entry'
      LIMIT 10
    `).all(projectId) as Symbol[];
    if (entries.length > 0) {
      lines.push('Entry points:');
      for (const s of entries) {
        lines.push(`  ${s.kind} ${s.name} (${s.relative_path}:${s.start_line})`);
      }
      lines.push('');
    }

    // Git info
    if (projectPath) {
      try {
        const git = new GitIntegration(projectPath);
        const branch = await git.getCurrentBranch();
        lines.push(`Git branch: ${branch}`);
      } catch {
        // no git
      }
    }

    // Complexity overview
    const complexStats = raw.prepare(`
      SELECT AVG(complexity_cyclomatic) as avg_cc, MAX(complexity_cyclomatic) as max_cc,
             AVG(complexity_cognitive) as avg_cog
      FROM symbols WHERE project_id = ?
    `).get(projectId) as { avg_cc: number; max_cc: number; avg_cog: number };

    if (complexStats) {
      lines.push('');
      lines.push('Complexity:');
      lines.push(`  Avg cyclomatic: ${(complexStats.avg_cc ?? 0).toFixed(1)}`);
      lines.push(`  Max cyclomatic: ${complexStats.max_cc ?? 0}`);
      lines.push(`  Avg cognitive:  ${(complexStats.avg_cog ?? 0).toFixed(1)}`);
    }

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  },

  async manifesto(args: Record<string, unknown>) {
    const db = getDatabase();
    const projectId = args['project_id'] as string;
    const action = (args['action'] as string) ?? 'list';

    if (action === 'list') {
      const rules = db.listManifestoRules(projectId);
      if (rules.length === 0) {
        return { content: [{ type: 'text', text: 'No manifesto rules defined. Use action=add to create rules.' }] };
      }

      const lines = ['Manifesto Rules:', ''];
      for (const r of rules) {
        lines.push(`  ${r.rule_name}`);
        lines.push(`    Metric: ${r.metric}`);
        if (r.warn_threshold !== undefined) lines.push(`    Warn:   >= ${r.warn_threshold}`);
        if (r.fail_threshold !== undefined) lines.push(`    Fail:   >= ${r.fail_threshold}`);
        lines.push('');
      }
      return { content: [{ type: 'text', text: lines.join('\n') }] };
    }

    if (action === 'add') {
      const ruleName = args['rule_name'] as string;
      const metric = args['metric'] as string;
      if (!ruleName || !metric) {
        return { content: [{ type: 'text', text: 'Error: rule_name and metric are required for action=add' }] };
      }

      db.upsertManifestoRule({
        project_id: projectId,
        rule_name: ruleName,
        metric,
        warn_threshold: args['warn_threshold'] as number | undefined,
        fail_threshold: args['fail_threshold'] as number | undefined,
      });

      return { content: [{ type: 'text', text: `Manifesto rule added: ${ruleName} (${metric})` }] };
    }

    if (action === 'remove') {
      const ruleName = args['rule_name'] as string;
      if (!ruleName) {
        return { content: [{ type: 'text', text: 'Error: rule_name is required for action=remove' }] };
      }
      db.deleteManifestoRule(projectId, ruleName);
      return { content: [{ type: 'text', text: `Manifesto rule removed: ${ruleName}` }] };
    }

    return { content: [{ type: 'text', text: `Unknown action: ${action}. Use list, add, or remove.` }] };
  },

  async check(args: Record<string, unknown>) {
    const db = getDatabase();
    const projectId = args['project_id'] as string;

    const rules = db.listManifestoRules(projectId);
    if (rules.length === 0) {
      return { content: [{ type: 'text', text: 'No manifesto rules defined. Use manifesto tool with action=add to create rules.' }] };
    }

    const raw = db.getRawDb();
    const lines = ['Manifesto Check Results:', ''];
    let hasFailures = false;
    let hasWarnings = false;

    for (const rule of rules) {
      let currentValue = 0;

      switch (rule.metric) {
        case 'max_cyclomatic': {
          const r = raw.prepare('SELECT MAX(complexity_cyclomatic) as v FROM symbols WHERE project_id = ?').get(projectId) as { v: number };
          currentValue = r?.v ?? 0;
          break;
        }
        case 'max_cognitive': {
          const r = raw.prepare('SELECT MAX(complexity_cognitive) as v FROM symbols WHERE project_id = ?').get(projectId) as { v: number };
          currentValue = r?.v ?? 0;
          break;
        }
        case 'avg_cyclomatic': {
          const r = raw.prepare('SELECT AVG(complexity_cyclomatic) as v FROM symbols WHERE project_id = ?').get(projectId) as { v: number };
          currentValue = r?.v ?? 0;
          break;
        }
        case 'max_file_symbols': {
          const r = raw.prepare(`
            SELECT MAX(cnt) as v FROM (SELECT COUNT(*) as cnt FROM symbols WHERE project_id = ? GROUP BY file_id)
          `).get(projectId) as { v: number };
          currentValue = r?.v ?? 0;
          break;
        }
        case 'dead_symbol_count': {
          const r = raw.prepare("SELECT COUNT(*) as v FROM symbols WHERE project_id = ? AND role = 'dead'").get(projectId) as { v: number };
          currentValue = r?.v ?? 0;
          break;
        }
        case 'total_symbols': {
          const r = raw.prepare('SELECT COUNT(*) as v FROM symbols WHERE project_id = ?').get(projectId) as { v: number };
          currentValue = r?.v ?? 0;
          break;
        }
        default:
          lines.push(`  SKIP  ${rule.rule_name}: Unknown metric "${rule.metric}"`);
          continue;
      }

      let status = 'PASS';
      if (rule.fail_threshold !== undefined && currentValue >= rule.fail_threshold) {
        status = 'FAIL';
        hasFailures = true;
      } else if (rule.warn_threshold !== undefined && currentValue >= rule.warn_threshold) {
        status = 'WARN';
        hasWarnings = true;
      }

      const icon = status === 'PASS' ? '✓' : status === 'WARN' ? '!' : '✗';
      lines.push(`  [${status}] ${icon} ${rule.rule_name}`);
      lines.push(`        Metric: ${rule.metric} = ${currentValue.toFixed(1)}`);
      if (rule.warn_threshold !== undefined) lines.push(`        Warn threshold: ${rule.warn_threshold}`);
      if (rule.fail_threshold !== undefined) lines.push(`        Fail threshold: ${rule.fail_threshold}`);
      lines.push('');
    }

    lines.push('');
    if (hasFailures) {
      lines.push('Overall: FAIL - one or more rules exceeded fail threshold.');
    } else if (hasWarnings) {
      lines.push('Overall: WARN - one or more rules exceeded warn threshold.');
    } else {
      lines.push('Overall: PASS - all rules within thresholds.');
    }

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  },

  async code_owners(args: Record<string, unknown>) {
    const db = getDatabase();
    const projectId = args['project_id'] as string;
    const relPath = args['rel_path'] as string | undefined;

    const project = db.getProject(projectId);
    if (!project) return { content: [{ type: 'text', text: `Project not found: ${projectId}` }] };

    if (relPath) {
      const ownership = getFileOwners(project.path, relPath);
      if (!ownership.matchedPattern) {
        return { content: [{ type: 'text', text: `No CODEOWNERS entry matches: ${relPath}` }] };
      }
      const lines = [
        `File: ${relPath}`,
        `Matched pattern: ${ownership.matchedPattern}`,
        `Owners: ${ownership.owners.join(', ') || '(none)'}`,
      ];
      return { content: [{ type: 'text', text: lines.join('\n') }] };
    }

    const summary = getOwnerSummary(project.path);
    if (!summary.hasCodeowners) {
      return { content: [{ type: 'text', text: `No CODEOWNERS file found in ${project.path}` }] };
    }

    const lines = [
      `CODEOWNERS: ${summary.location}`,
      `Patterns: ${summary.entries.length}`,
      '',
      'Owners and their patterns:',
    ];
    for (const [owner, patterns] of Object.entries(summary.ownerMap).sort()) {
      lines.push(`  ${owner}`);
      for (const p of patterns) lines.push(`    ${p}`);
    }
    lines.push('');
    lines.push('All entries:');
    for (const e of summary.entries) {
      lines.push(`  ${e.pattern.padEnd(40)} ${e.owners.join(' ') || '(no owner)'}`);
    }

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  },
};
