import * as fs from 'fs';
import * as path from 'path';
import type { WladyDatabase } from '../db/database.js';
import type { Symbol, FileRecord } from '../types.js';

export interface CodeSearchResult {
  file: string;
  relative_path: string;
  line: number;
  snippet: string;
  language?: string;
}

export interface SearchOptions {
  limit?: number;
  kinds?: string[];
  files?: string[];
}

export class SearchEngine {
  constructor(private db: WladyDatabase) {}

  /**
   * FTS5 BM25 search over symbols.
   * Supports multi-query via semicolon separator, merged with RRF.
   */
  search(query: string, projectId: string, options: SearchOptions = {}): Symbol[] {
    const limit = options.limit ?? 20;

    // Split multi-queries on semicolons
    const subQueries = query.split(';').map(q => q.trim()).filter(q => q.length > 0);

    if (subQueries.length === 1) {
      return this.singleSearch(subQueries[0], projectId, limit, options);
    }

    // RRF (Reciprocal Rank Fusion) for multiple queries
    return this.rrfSearch(subQueries, projectId, limit, options);
  }

  private sanitizeFtsQuery(q: string): string {
    // Escape special FTS5 characters and wrap in quotes if needed
    const cleaned = q.replace(/['"*()]/g, ' ').trim();
    if (!cleaned) return '""';
    // Use prefix search for each token
    const tokens = cleaned.split(/\s+/).filter(t => t.length > 0);
    return tokens.map(t => `"${t}"*`).join(' OR ');
  }

  private singleSearch(
    query: string,
    projectId: string,
    limit: number,
    options: SearchOptions
  ): Symbol[] {
    try {
      const ftsQuery = this.sanitizeFtsQuery(query);
      let results = this.db.searchFTS(ftsQuery, projectId, limit * 2);

      if (options.kinds && options.kinds.length > 0) {
        results = results.filter(s => options.kinds!.includes(s.kind));
      }

      return results.slice(0, limit);
    } catch {
      // Fall back to simple name search
      return this.fallbackSearch(query, projectId, limit, options);
    }
  }

  private fallbackSearch(
    query: string,
    projectId: string,
    limit: number,
    options: SearchOptions
  ): Symbol[] {
    const raw = this.db.getRawDb();
    const lq = `%${query.toLowerCase()}%`;
    let sql = `
      SELECT s.*, f.path as file_path, f.relative_path
      FROM symbols s JOIN files f ON s.file_id = f.id
      WHERE s.project_id = ? AND (lower(s.name) LIKE ? OR lower(s.qualified_name) LIKE ?)
    `;
    const params: unknown[] = [projectId, lq, lq];

    if (options.kinds && options.kinds.length > 0) {
      sql += ` AND s.kind IN (${options.kinds.map(() => '?').join(',')})`;
      params.push(...options.kinds);
    }

    sql += ` LIMIT ?`;
    params.push(limit);

    return raw.prepare(sql).all(...params) as Symbol[];
  }

  private rrfSearch(
    queries: string[],
    projectId: string,
    limit: number,
    options: SearchOptions
  ): Symbol[] {
    const K = 60; // RRF constant
    const scoreMap = new Map<number, number>();
    const symMap = new Map<number, Symbol>();

    for (const q of queries) {
      const results = this.singleSearch(q, projectId, limit * 2, options);
      for (let rank = 0; rank < results.length; rank++) {
        const sym = results[rank];
        const prev = scoreMap.get(sym.id) ?? 0;
        scoreMap.set(sym.id, prev + 1 / (K + rank + 1));
        symMap.set(sym.id, sym);
      }
    }

    return Array.from(scoreMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => symMap.get(id)!)
      .filter(Boolean);
  }

  /**
   * Raw text search over source files (grep-like).
   */
  async searchCode(
    query: string,
    projectId: string,
    limit: number = 30
  ): Promise<CodeSearchResult[]> {
    const files = this.db.getFilesByProject(projectId);
    const results: CodeSearchResult[] = [];
    const lowerQuery = query.toLowerCase();
    const isRegex = query.startsWith('/') && query.endsWith('/');
    let pattern: RegExp | null = null;

    if (isRegex) {
      try {
        pattern = new RegExp(query.slice(1, -1), 'gi');
      } catch {
        // fall back to string search
      }
    }

    for (const file of files) {
      if (results.length >= limit) break;
      try {
        const content = fs.readFileSync(file.path, 'utf-8');
        const lines = content.split('\n');

        for (let i = 0; i < lines.length && results.length < limit; i++) {
          const line = lines[i];
          const matches = pattern
            ? pattern.test(line)
            : line.toLowerCase().includes(lowerQuery);

          if (matches) {
            const start = Math.max(0, i - 1);
            const end = Math.min(lines.length - 1, i + 1);
            const snippet = lines.slice(start, end + 1).join('\n');

            results.push({
              file: file.path,
              relative_path: file.relative_path,
              line: i + 1,
              snippet: snippet.substring(0, 300),
              language: file.language,
            });
          }
        }
      } catch {
        // Skip unreadable files
      }
    }

    return results;
  }

  /**
   * Search for symbols by name prefix (fast autocomplete-style).
   */
  searchByPrefix(prefix: string, projectId: string, limit: number = 10): Symbol[] {
    const raw = this.db.getRawDb();
    return raw.prepare(`
      SELECT s.*, f.path as file_path, f.relative_path
      FROM symbols s JOIN files f ON s.file_id = f.id
      WHERE s.project_id = ? AND s.name LIKE ?
      LIMIT ?
    `).all(projectId, `${prefix}%`, limit) as Symbol[];
  }
}
