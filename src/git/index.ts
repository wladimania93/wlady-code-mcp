import * as path from 'path';
import { simpleGit } from 'simple-git';
import type { SimpleGit } from 'simple-git';
import type { WladyDatabase } from '../db/database.js';
import type { Symbol, FileRecord } from '../types.js';

export interface BranchDiff {
  added: Symbol[];
  modified: Symbol[];
  removed: Symbol[];
}

export interface CochangeEntry {
  file1: string;
  file2: string;
  count: number;
}

export class GitIntegration {
  private git: SimpleGit;

  constructor(
    private projectPath: string,
    private db?: WladyDatabase
  ) {
    this.git = simpleGit(projectPath);
  }

  /**
   * Get list of changed files (working tree or staged).
   */
  async getChangedFiles(staged: boolean = false): Promise<string[]> {
    try {
      const status = await this.git.status();
      const files: string[] = [];

      if (staged) {
        for (const f of status.staged) {
          files.push(path.join(this.projectPath, f));
        }
      } else {
        for (const f of [...status.modified, ...status.not_added, ...status.created]) {
          files.push(path.join(this.projectPath, f));
        }
      }

      return files;
    } catch {
      return [];
    }
  }

  /**
   * Get symbols touched by the current diff (staged or unstaged).
   */
  async getDiffSymbols(projectId: string, staged: boolean = false): Promise<Symbol[]> {
    if (!this.db) return [];

    try {
      const diffOptions = staged ? ['--staged'] : [];
      const diff = await this.git.diff([...diffOptions, '--name-only']);
      const changedRelPaths = diff.split('\n').map(l => l.trim()).filter(l => l.length > 0);

      const result: Symbol[] = [];
      for (const relPath of changedRelPaths) {
        const fileRec = this.db.getFileByRelativePath(projectId, relPath);
        if (!fileRec) continue;

        // Get diff hunk lines
        const fileDiff = await this.git.diff([...diffOptions, '--', relPath]);
        const changedLines = this.extractChangedLines(fileDiff);

        // Get symbols that overlap with changed lines
        const symbols = this.db.getSymbolsByFile(fileRec.id);
        for (const sym of symbols) {
          if (changedLines.some(line => line >= sym.start_line && line <= sym.end_line)) {
            result.push(sym);
          }
        }
      }

      return result;
    } catch {
      return [];
    }
  }

  private extractChangedLines(diff: string): number[] {
    const lines: number[] = [];
    // Parse @@ -a,b +c,d @@ hunks
    const hunkPattern = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/gm;
    let m: RegExpExecArray | null;

    while ((m = hunkPattern.exec(diff)) !== null) {
      const start = parseInt(m[1], 10);
      const count = m[2] !== undefined ? parseInt(m[2], 10) : 1;
      for (let i = start; i < start + count; i++) {
        lines.push(i);
      }
    }

    return lines;
  }

  /**
   * Analyze git log to compute co-change matrix.
   * Files that frequently change together are likely coupled.
   */
  async getCochangeMatrix(projectId?: string, limit: number = 200): Promise<CochangeEntry[]> {
    try {
      // Get recent commits
      const log = await this.git.log(['--format=%H', '--max-count=500']);
      const hashes = log.all.map(c => c.hash);

      const cochangeMap = new Map<string, number>();

      for (const hash of hashes) {
        const show = await this.git.show(['--name-only', '--format=', hash]);
        const files = show.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        // Build pairs
        for (let i = 0; i < files.length; i++) {
          for (let j = i + 1; j < files.length; j++) {
            const key = files[i] < files[j]
              ? `${files[i]}|||${files[j]}`
              : `${files[j]}|||${files[i]}`;
            cochangeMap.set(key, (cochangeMap.get(key) ?? 0) + 1);
          }
        }
      }

      const entries: CochangeEntry[] = Array.from(cochangeMap.entries())
        .map(([key, count]) => {
          const [file1, file2] = key.split('|||');
          return { file1, file2, count };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);

      // Store in DB if projectId provided
      if (projectId && this.db) {
        for (const entry of entries) {
          const f1 = this.db.getFileByRelativePath(projectId, entry.file1);
          const f2 = this.db.getFileByRelativePath(projectId, entry.file2);
          if (f1 && f2) {
            this.db.updateCochange(projectId, f1.id, f2.id);
          }
        }
      }

      return entries;
    } catch {
      return [];
    }
  }

  /**
   * Compare symbols between two branches.
   */
  async compareBranches(
    projectId: string,
    base: string,
    head: string
  ): Promise<BranchDiff> {
    if (!this.db) return { added: [], modified: [], removed: [] };

    try {
      const diff = await this.git.diff([`${base}...${head}`, '--name-status']);
      const lines = diff.split('\n').map(l => l.trim()).filter(l => l.length > 0);

      const added: Symbol[] = [];
      const modified: Symbol[] = [];
      const removed: Symbol[] = [];

      for (const line of lines) {
        const parts = line.split('\t');
        if (parts.length < 2) continue;
        const status = parts[0];
        const filePath = parts[parts.length - 1];
        const fileRec = this.db.getFileByRelativePath(projectId, filePath);

        if (status.startsWith('A')) {
          if (fileRec) {
            const syms = this.db.getSymbolsByFile(fileRec.id);
            added.push(...syms);
          }
        } else if (status.startsWith('M')) {
          if (fileRec) {
            const syms = this.db.getSymbolsByFile(fileRec.id);
            modified.push(...syms);
          }
        } else if (status.startsWith('D')) {
          if (fileRec) {
            const syms = this.db.getSymbolsByFile(fileRec.id);
            removed.push(...syms);
          }
        }
      }

      return { added, modified, removed };
    } catch {
      return { added: [], modified: [], removed: [] };
    }
  }

  /**
   * Get the current branch name.
   */
  async getCurrentBranch(): Promise<string> {
    try {
      const branch = await this.git.revparse(['--abbrev-ref', 'HEAD']);
      return branch.trim();
    } catch {
      return 'unknown';
    }
  }

  /**
   * Check if a path is a git repository.
   */
  static async isGitRepo(projectPath: string): Promise<boolean> {
    try {
      const git = simpleGit(projectPath);
      await git.status();
      return true;
    } catch {
      return false;
    }
  }
}
