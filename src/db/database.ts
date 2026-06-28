import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { SCHEMA_SQL, FTS_TRIGGERS_SQL } from './schema.js';
import type { Project, FileRecord, Symbol, Edge, Adr, ManifestoRule } from '../types.js';

const DB_DIR = path.join(os.homedir(), '.wlady-code-mcp');
const DB_PATH = path.join(DB_DIR, 'wlady.db');

export class WladyDatabase {
  private db: Database.Database;

  constructor(dbPath: string = DB_PATH) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.applySchema();
  }

  private applySchema(): void {
    this.db.exec(SCHEMA_SQL);
    for (const trigger of FTS_TRIGGERS_SQL) {
      try {
        this.db.exec(trigger);
      } catch {
        // trigger may already exist
      }
    }
  }

  close(): void {
    this.db.close();
  }

  // ---- Projects ----

  getProject(id: string): Project | undefined {
    return this.db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as Project | undefined;
  }

  getProjectByPath(projectPath: string): Project | undefined {
    return this.db.prepare('SELECT * FROM projects WHERE path = ?').get(projectPath) as Project | undefined;
  }

  listProjects(): Project[] {
    return this.db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all() as Project[];
  }

  upsertProject(project: Omit<Project, 'file_count' | 'symbol_count' | 'edge_count'> & Partial<Pick<Project, 'file_count' | 'symbol_count' | 'edge_count'>>): void {
    this.db.prepare(`
      INSERT INTO projects (id, name, path, created_at, indexed_at, file_count, symbol_count, edge_count)
      VALUES (@id, @name, @path, @created_at, @indexed_at, @file_count, @symbol_count, @edge_count)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        path = excluded.path,
        indexed_at = excluded.indexed_at,
        file_count = excluded.file_count,
        symbol_count = excluded.symbol_count,
        edge_count = excluded.edge_count
    `).run({
      id: project.id,
      name: project.name,
      path: project.path,
      created_at: project.created_at,
      indexed_at: project.indexed_at ?? null,
      file_count: project.file_count ?? 0,
      symbol_count: project.symbol_count ?? 0,
      edge_count: project.edge_count ?? 0,
    });
  }

  updateProjectStats(projectId: string): void {
    const fileCount = (this.db.prepare('SELECT COUNT(*) as c FROM files WHERE project_id = ?').get(projectId) as { c: number }).c;
    const symbolCount = (this.db.prepare('SELECT COUNT(*) as c FROM symbols WHERE project_id = ?').get(projectId) as { c: number }).c;
    const edgeCount = (this.db.prepare('SELECT COUNT(*) as c FROM edges WHERE project_id = ?').get(projectId) as { c: number }).c;
    this.db.prepare('UPDATE projects SET file_count=?, symbol_count=?, edge_count=?, indexed_at=? WHERE id=?')
      .run(fileCount, symbolCount, edgeCount, Date.now(), projectId);
  }

  deleteProject(id: string): void {
    this.db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  }

  // ---- Files ----

  upsertFile(file: Omit<FileRecord, 'id'>): number {
    const result = this.db.prepare(`
      INSERT INTO files (project_id, path, relative_path, language, size, mtime, hash)
      VALUES (@project_id, @path, @relative_path, @language, @size, @mtime, @hash)
      ON CONFLICT(project_id, relative_path) DO UPDATE SET
        path = excluded.path,
        language = excluded.language,
        size = excluded.size,
        mtime = excluded.mtime,
        hash = excluded.hash
    `).run(file);
    if (result.changes > 0 && result.lastInsertRowid) {
      return result.lastInsertRowid as number;
    }
    const existing = this.db.prepare('SELECT id FROM files WHERE project_id = ? AND relative_path = ?')
      .get(file.project_id, file.relative_path) as { id: number };
    return existing.id;
  }

  getFilesByProject(projectId: string): FileRecord[] {
    return this.db.prepare('SELECT * FROM files WHERE project_id = ?').all(projectId) as FileRecord[];
  }

  getFileByRelativePath(projectId: string, relativePath: string): FileRecord | undefined {
    return this.db.prepare('SELECT * FROM files WHERE project_id = ? AND relative_path = ?')
      .get(projectId, relativePath) as FileRecord | undefined;
  }

  deleteFilesByProject(projectId: string): void {
    this.db.prepare('DELETE FROM files WHERE project_id = ?').run(projectId);
  }

  deleteFile(projectId: string, relativePath: string): void {
    this.db.prepare('DELETE FROM files WHERE project_id = ? AND relative_path = ?').run(projectId, relativePath);
  }

  // ---- Symbols ----

  insertSymbol(symbol: Omit<Symbol, 'id' | 'file_path' | 'relative_path'>): number {
    const result = this.db.prepare(`
      INSERT INTO symbols (project_id, file_id, name, qualified_name, kind, start_line, end_line, signature, body, role, complexity_cyclomatic, complexity_cognitive)
      VALUES (@project_id, @file_id, @name, @qualified_name, @kind, @start_line, @end_line, @signature, @body, @role, @complexity_cyclomatic, @complexity_cognitive)
    `).run(symbol);
    return result.lastInsertRowid as number;
  }

  deleteSymbolsByFile(fileId: number): void {
    this.db.prepare('DELETE FROM symbols WHERE file_id = ?').run(fileId);
  }

  deleteSymbolsByProject(projectId: string): void {
    this.db.prepare('DELETE FROM symbols WHERE project_id = ?').run(projectId);
  }

  getSymbolsByFile(fileId: number): Symbol[] {
    return this.db.prepare(`
      SELECT s.*, f.path as file_path, f.relative_path
      FROM symbols s JOIN files f ON s.file_id = f.id
      WHERE s.file_id = ?
    `).all(fileId) as Symbol[];
  }

  getSymbolById(id: number): Symbol | undefined {
    return this.db.prepare(`
      SELECT s.*, f.path as file_path, f.relative_path
      FROM symbols s JOIN files f ON s.file_id = f.id
      WHERE s.id = ?
    `).get(id) as Symbol | undefined;
  }

  getSymbolByName(projectId: string, name: string): Symbol | undefined {
    return this.db.prepare(`
      SELECT s.*, f.path as file_path, f.relative_path
      FROM symbols s JOIN files f ON s.file_id = f.id
      WHERE s.project_id = ? AND s.name = ?
      LIMIT 1
    `).get(projectId, name) as Symbol | undefined;
  }

  getSymbolsByProject(projectId: string): Symbol[] {
    return this.db.prepare(`
      SELECT s.*, f.path as file_path, f.relative_path
      FROM symbols s JOIN files f ON s.file_id = f.id
      WHERE s.project_id = ?
    `).all(projectId) as Symbol[];
  }

  updateSymbolRole(symbolId: number, role: string): void {
    this.db.prepare('UPDATE symbols SET role = ? WHERE id = ?').run(role, symbolId);
  }

  // ---- Edges ----

  insertEdge(edge: Omit<Edge, 'id'>): void {
    this.db.prepare(`
      INSERT INTO edges (project_id, from_symbol_id, to_symbol_id, from_file_id, to_file_id, edge_type, from_line, call_name)
      VALUES (@project_id, @from_symbol_id, @to_symbol_id, @from_file_id, @to_file_id, @edge_type, @from_line, @call_name)
    `).run(edge);
  }

  deleteEdgesByProject(projectId: string): void {
    this.db.prepare('DELETE FROM edges WHERE project_id = ?').run(projectId);
  }

  deleteEdgesByFile(fileId: number): void {
    this.db.prepare('DELETE FROM edges WHERE from_file_id = ?').run(fileId);
  }

  getCallersOf(symbolId: number): Symbol[] {
    return this.db.prepare(`
      SELECT s.*, f.path as file_path, f.relative_path
      FROM edges e
      JOIN symbols s ON e.from_symbol_id = s.id
      JOIN files f ON s.file_id = f.id
      WHERE e.to_symbol_id = ? AND e.edge_type = 'calls'
    `).all(symbolId) as Symbol[];
  }

  getCalleesOf(symbolId: number): Symbol[] {
    return this.db.prepare(`
      SELECT s.*, f.path as file_path, f.relative_path
      FROM edges e
      JOIN symbols s ON e.to_symbol_id = s.id
      JOIN files f ON s.file_id = f.id
      WHERE e.from_symbol_id = ? AND e.edge_type = 'calls'
    `).all(symbolId) as Symbol[];
  }

  getImportersOf(fileId: number): FileRecord[] {
    return this.db.prepare(`
      SELECT DISTINCT f.*
      FROM edges e
      JOIN files f ON e.from_file_id = f.id
      WHERE e.to_file_id = ? AND e.edge_type = 'imports'
    `).all(fileId) as FileRecord[];
  }

  getEdgesByProject(projectId: string): Edge[] {
    return this.db.prepare('SELECT * FROM edges WHERE project_id = ?').all(projectId) as Edge[];
  }

  getEdgesFrom(symbolId: number): Edge[] {
    return this.db.prepare('SELECT * FROM edges WHERE from_symbol_id = ?').all(symbolId) as Edge[];
  }

  getEdgesTo(symbolId: number): Edge[] {
    return this.db.prepare('SELECT * FROM edges WHERE to_symbol_id = ?').all(symbolId) as Edge[];
  }

  // ---- FTS Search ----

  searchFTS(query: string, projectId: string, limit: number = 20): Symbol[] {
    return this.db.prepare(`
      SELECT s.*, f.path as file_path, f.relative_path
      FROM symbols_fts fts
      JOIN symbols s ON fts.rowid = s.id
      JOIN files f ON s.file_id = f.id
      WHERE symbols_fts MATCH ? AND s.project_id = ?
      ORDER BY rank
      LIMIT ?
    `).all(query, projectId, limit) as Symbol[];
  }

  // ---- Co-change ----

  getCochangePairs(projectId: string, limit: number = 50): { file1: FileRecord; file2: FileRecord; count: number }[] {
    const rows = this.db.prepare(`
      SELECT cp.count, f1.*, f2.id as f2_id, f2.project_id as f2_project_id, f2.path as f2_path,
             f2.relative_path as f2_relative_path, f2.language as f2_language
      FROM cochange_pairs cp
      JOIN files f1 ON cp.file1_id = f1.id
      JOIN files f2 ON cp.file2_id = f2.id
      WHERE cp.project_id = ?
      ORDER BY cp.count DESC
      LIMIT ?
    `).all(projectId, limit) as any[];
    return rows.map(r => ({
      file1: { id: r.id, project_id: r.project_id, path: r.path, relative_path: r.relative_path, language: r.language, size: r.size, mtime: r.mtime, hash: r.hash },
      file2: { id: r.f2_id, project_id: r.f2_project_id, path: r.f2_path, relative_path: r.f2_relative_path, language: r.f2_language },
      count: r.count,
    }));
  }

  updateCochange(projectId: string, file1Id: number, file2Id: number): void {
    const [a, b] = file1Id < file2Id ? [file1Id, file2Id] : [file2Id, file1Id];
    this.db.prepare(`
      INSERT INTO cochange_pairs (project_id, file1_id, file2_id, count)
      VALUES (?, ?, ?, 1)
      ON CONFLICT(project_id, file1_id, file2_id) DO UPDATE SET count = count + 1
    `).run(projectId, a, b);
  }

  // ---- ADRs ----

  listAdrs(projectId: string): Adr[] {
    return this.db.prepare('SELECT * FROM adrs WHERE project_id = ? ORDER BY number ASC').all(projectId) as Adr[];
  }

  getAdr(projectId: string, number: number): Adr | undefined {
    return this.db.prepare('SELECT * FROM adrs WHERE project_id = ? AND number = ?').get(projectId, number) as Adr | undefined;
  }

  createAdr(adr: Omit<Adr, 'id'>): number {
    const result = this.db.prepare(`
      INSERT INTO adrs (project_id, number, title, status, context_text, decision, consequences, created_at, updated_at)
      VALUES (@project_id, @number, @title, @status, @context_text, @decision, @consequences, @created_at, @updated_at)
    `).run(adr);
    return result.lastInsertRowid as number;
  }

  updateAdr(projectId: string, number: number, updates: Partial<Pick<Adr, 'title' | 'status' | 'context_text' | 'decision' | 'consequences'>>): void {
    const now = Date.now();
    const fields = Object.entries(updates).filter(([, v]) => v !== undefined).map(([k]) => `${k} = @${k}`).join(', ');
    if (!fields) return;
    this.db.prepare(`UPDATE adrs SET ${fields}, updated_at = @updated_at WHERE project_id = @project_id AND number = @number`)
      .run({ ...updates, updated_at: now, project_id: projectId, number });
  }

  getNextAdrNumber(projectId: string): number {
    const row = this.db.prepare('SELECT MAX(number) as n FROM adrs WHERE project_id = ?').get(projectId) as { n: number | null };
    return (row.n ?? 0) + 1;
  }

  // ---- Manifesto Rules ----

  listManifestoRules(projectId: string): ManifestoRule[] {
    return this.db.prepare('SELECT * FROM manifesto_rules WHERE project_id = ?').all(projectId) as ManifestoRule[];
  }

  upsertManifestoRule(rule: Omit<ManifestoRule, 'id'>): void {
    this.db.prepare(`
      INSERT INTO manifesto_rules (project_id, rule_name, metric, warn_threshold, fail_threshold)
      VALUES (@project_id, @rule_name, @metric, @warn_threshold, @fail_threshold)
      ON CONFLICT(project_id, rule_name) DO UPDATE SET
        metric = excluded.metric,
        warn_threshold = excluded.warn_threshold,
        fail_threshold = excluded.fail_threshold
    `).run(rule);
  }

  deleteManifestoRule(projectId: string, ruleName: string): void {
    this.db.prepare('DELETE FROM manifesto_rules WHERE project_id = ? AND rule_name = ?').run(projectId, ruleName);
  }

  // ---- Transactions ----

  transaction<T>(fn: () => T): T {
    return this.db.transaction(fn)();
  }

  // ---- Raw access for algorithms ----

  getRawDb(): Database.Database {
    return this.db;
  }
}

let _instance: WladyDatabase | null = null;

export function getDatabase(): WladyDatabase {
  if (!_instance) {
    _instance = new WladyDatabase();
  }
  return _instance;
}
