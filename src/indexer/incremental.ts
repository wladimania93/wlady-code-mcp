import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type { FileRecord } from '../types.js';

export interface FileChanges {
  added: string[];
  modified: string[];
  deleted: string[];
}

export class IncrementalDetector {
  /**
   * Level 0: Journal-based detection (if a journal file exists).
   * Level 1: mtime + size comparison.
   * Level 2: hash comparison for files that appear modified.
   */
  async getChangedFiles(
    projectPath: string,
    existingFiles: FileRecord[],
    allCurrentPaths: string[]
  ): Promise<FileChanges> {
    const added: string[] = [];
    const modified: string[] = [];
    const deleted: string[] = [];

    // Build a map of existing files by relative path
    const existingMap = new Map<string, FileRecord>();
    for (const f of existingFiles) {
      existingMap.set(f.relative_path, f);
    }

    const currentSet = new Set<string>();

    for (const absPath of allCurrentPaths) {
      const relativePath = path.relative(projectPath, absPath).replace(/\\/g, '/');
      currentSet.add(relativePath);

      const existing = existingMap.get(relativePath);
      if (!existing) {
        // Level 0: new file
        added.push(absPath);
        continue;
      }

      // Level 1: mtime + size comparison
      let stat: fs.Stats;
      try {
        stat = fs.statSync(absPath);
      } catch {
        deleted.push(absPath);
        continue;
      }

      const mtimeMs = Math.floor(stat.mtimeMs);
      const size = stat.size;

      if (existing.mtime === mtimeMs && existing.size === size) {
        // Unchanged by mtime+size
        continue;
      }

      // Level 2: hash comparison
      if (existing.hash) {
        const currentHash = await this.hashFile(absPath);
        if (currentHash === existing.hash) {
          // mtime changed but content is same (touch, copy, etc.)
          continue;
        }
      }

      modified.push(absPath);
    }

    // Find deleted files
    for (const [relativePath, record] of existingMap) {
      if (!currentSet.has(relativePath)) {
        deleted.push(record.path);
      }
    }

    return { added, modified, deleted };
  }

  async hashFile(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      stream.on('data', chunk => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  async getFileMeta(filePath: string): Promise<{ mtime: number; size: number; hash: string } | null> {
    try {
      const stat = fs.statSync(filePath);
      const hash = await this.hashFile(filePath);
      return {
        mtime: Math.floor(stat.mtimeMs),
        size: stat.size,
        hash,
      };
    } catch {
      return null;
    }
  }

  /**
   * Level 0 journal: read a journal file that lists changed files.
   * Returns null if no journal exists.
   */
  readJournal(projectPath: string): string[] | null {
    const journalPath = path.join(projectPath, '.wlady-journal');
    if (!fs.existsSync(journalPath)) return null;
    try {
      const content = fs.readFileSync(journalPath, 'utf-8');
      return content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    } catch {
      return null;
    }
  }

  clearJournal(projectPath: string): void {
    const journalPath = path.join(projectPath, '.wlady-journal');
    try {
      fs.unlinkSync(journalPath);
    } catch {
      // ignore
    }
  }
}
