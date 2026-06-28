import type { WladyDatabase } from '../db/database.js';
import type { Role } from '../types.js';
import { GraphAlgorithms } from '../graph/algorithms.js';

export class RoleClassifier {
  private graph: GraphAlgorithms;

  constructor(private db: WladyDatabase) {
    this.graph = new GraphAlgorithms(db);
  }

  /**
   * Classify all symbols in a project and update their roles in the DB.
   */
  classifyProject(projectId: string): void {
    const symbols = this.db.getSymbolsByProject(projectId);
    if (symbols.length === 0) return;

    const degrees = this.graph.computeDegrees(projectId);

    // Compute stats for thresholds
    const inDegrees = Array.from(degrees.values()).map(d => d.in);
    const outDegrees = Array.from(degrees.values()).map(d => d.out);
    const avgIn = inDegrees.length > 0 ? inDegrees.reduce((a, b) => a + b, 0) / inDegrees.length : 0;
    const avgOut = outDegrees.length > 0 ? outDegrees.reduce((a, b) => a + b, 0) / outDegrees.length : 0;

    // Get exported symbols (those with 'export' in signature or name is exported by convention)
    const exportedNames = this.getExportedNames(projectId);

    this.db.transaction(() => {
      for (const sym of symbols) {
        const deg = degrees.get(sym.id) ?? { in: 0, out: 0 };
        const role = this.classifySymbol(
          sym.name,
          sym.kind,
          deg.in,
          deg.out,
          avgIn,
          avgOut,
          exportedNames.has(sym.name)
        );
        this.db.updateSymbolRole(sym.id, role);
      }
    });
  }

  private classifySymbol(
    name: string,
    kind: string,
    inDegree: number,
    outDegree: number,
    avgIn: number,
    avgOut: number,
    isExported: boolean
  ): Role {
    // Dead code: not exported, no callers
    if (inDegree === 0 && !isExported && kind !== 'class' && kind !== 'interface' && kind !== 'type') {
      return 'dead';
    }

    // Entry point: exported and many callers, or main/index pattern
    if (isExported && inDegree >= Math.max(avgIn * 1.5, 2)) {
      return 'entry';
    }

    // Entry by name convention
    if (/^(main|index|run|start|init|bootstrap|create|build|setup)$/i.test(name)) {
      return 'entry';
    }

    // Core: many internal callers
    if (inDegree >= Math.max(avgIn * 2, 3)) {
      return 'core';
    }

    // Leaf: no outgoing calls
    if (outDegree === 0 && inDegree > 0) {
      return 'leaf';
    }

    // Adapter: connects to external (has many outgoing but also incoming)
    if (outDegree >= Math.max(avgOut * 2, 3) && inDegree > 0) {
      return 'adapter';
    }

    // Utility: few callers, few deps, typically a helper
    if (inDegree <= Math.max(avgIn, 1) && outDegree <= Math.max(avgOut, 1)) {
      if (/^(util|helper|format|parse|convert|transform|validate|check|get|set|is|has|to|from)/i.test(name)) {
        return 'utility';
      }
    }

    return 'unknown';
  }

  private getExportedNames(projectId: string): Set<string> {
    const raw = this.db.getRawDb();
    const rows = raw.prepare(`
      SELECT s.name
      FROM symbols s
      JOIN files f ON s.file_id = f.id
      WHERE s.project_id = ?
      AND (
        s.signature LIKE 'export %'
        OR s.body LIKE 'export %'
        OR s.qualified_name LIKE 'export/%'
        OR s.name LIKE 'module.exports%'
      )
    `).all(projectId) as { name: string }[];

    // Also check for files that explicitly export
    const exportRows = raw.prepare(`
      SELECT s.name
      FROM symbols s
      JOIN files f ON s.file_id = f.id
      WHERE s.project_id = ?
      AND f.language IN ('javascript', 'typescript')
      AND s.kind IN ('function', 'class', 'variable', 'type', 'interface')
      LIMIT 1000
    `).all(projectId) as { name: string }[];

    const result = new Set<string>();
    for (const r of rows) result.add(r.name);
    return result;
  }

  /**
   * Get a summary of role distribution for a project.
   */
  getRoleSummary(projectId: string): Record<Role, number> {
    const raw = this.db.getRawDb();
    const rows = raw.prepare(`
      SELECT role, COUNT(*) as cnt
      FROM symbols WHERE project_id = ?
      GROUP BY role
    `).all(projectId) as { role: Role; cnt: number }[];

    const result: Record<Role, number> = {
      entry: 0, core: 0, utility: 0, adapter: 0, dead: 0, leaf: 0, unknown: 0,
    };
    for (const r of rows) {
      result[r.role] = r.cnt;
    }
    return result;
  }
}
