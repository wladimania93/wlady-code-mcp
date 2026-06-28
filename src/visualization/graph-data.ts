import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const DEFAULT_DB = path.join(os.homedir(), '.wlady-code-mcp', 'wlady.db');

function requireDb(dbPath: string): Database.Database {
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Base de datos no encontrada en ${dbPath}. Indexa un proyecto primero con la herramienta index_project.`);
  }
  return new Database(dbPath, { readonly: true });
}

export interface GraphNode {
  id: number;
  label: string;
  path: string;
  language: string;
  fanIn: number;
  fanOut: number;
  community: number;
  dir: string;
}

export interface GraphEdge {
  from: number;
  to: number;
}

export interface GraphProject {
  id: string;
  name: string;
  path: string;
  fileCount: number;
  symbolCount: number;
  edgeCount: number;
  indexedAt: number;
}

// ── Community detection from directory structure ─────────────────
const moduleKeys: Record<string, number> = {};
let nextCommunity = 0;

function getModuleKey(relPath: string): string {
  const parts = relPath.replace(/\\/g, '/').split('/');
  const top = parts[0];

  if (top === 'frontend' || top === 'fe') {
    const fi = parts.indexOf('features');
    if (fi >= 0 && parts[fi + 1]) return 'fe·' + parts[fi + 1];
    if (parts.includes('store'))  return 'fe·store';
    if (parts.includes('core'))   return 'fe·core';
    if (parts.includes('shared')) return 'fe·shared';
    if (parts.includes('layout')) return 'fe·layout';
    return 'fe·' + (parts[1] || 'root');
  }

  if (top === 'backend' || top === 'be') {
    if (parts.includes('service'))    return 'be·service';
    if (parts.includes('entity'))     return 'be·entity';
    if (parts.includes('controller')) return 'be·controller';
    if (parts.includes('repository')) return 'be·repository';
    if (parts.includes('security'))   return 'be·security';
    if (parts.includes('config'))     return 'be·config';
    if (parts.includes('exception'))  return 'be·exception';
    if (parts.includes('dto'))        return 'be·dto';
    if (parts.includes('sri'))        return 'be·sri';
    return 'be·' + (parts[parts.length - 2] || 'root');
  }

  return parts.slice(0, 2).join('/') || 'root';
}

function getCommunity(relPath: string): { id: number; dir: string } {
  const key = getModuleKey(relPath);
  if (!(key in moduleKeys)) moduleKeys[key] = nextCommunity++;
  return { id: moduleKeys[key], dir: key };
}

function resetCommunities() {
  for (const k of Object.keys(moduleKeys)) delete moduleKeys[k];
  nextCommunity = 0;
}

// ── Symbol & entry-point types ───────────────────────────────────
export interface SymbolItem {
  id: number;
  name: string;
  kind: string;
  start_line: number;
  end_line: number;
  role: string;
  complexity_cyclomatic: number;
}

export interface EntryPointItem {
  name: string;
  kind: string;
  filePath: string;
  relPath: string;
  startLine: number;
}

// ── API ─────────────────────────────────────────────────────────
export function getProjects(dbPath = DEFAULT_DB): GraphProject[] {
  const db = requireDb(dbPath);
  try {
    return (db.prepare('SELECT * FROM projects ORDER BY indexed_at DESC').all() as any[])
      .map(r => ({
        id: r.id,
        name: r.name,
        path: r.path,
        fileCount: r.file_count,
        symbolCount: r.symbol_count,
        edgeCount: r.edge_count,
        indexedAt: r.indexed_at,
      }));
  } finally {
    db.close();
  }
}

export function getGraph(projectId: string, dbPath = DEFAULT_DB): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const db = requireDb(dbPath);
  resetCommunities();

  try {
    const files = db.prepare(
      'SELECT id, relative_path, language FROM files WHERE project_id = ? ORDER BY id'
    ).all(projectId) as any[];

    // File-level fan-in / fan-out directly from edges table
    const fanInRows = db.prepare(`
      SELECT to_file_id AS fid, COUNT(DISTINCT from_file_id) AS cnt
      FROM edges
      WHERE project_id = ? AND to_file_id IS NOT NULL AND from_file_id != to_file_id
      GROUP BY to_file_id
    `).all(projectId) as any[];

    const fanOutRows = db.prepare(`
      SELECT from_file_id AS fid, COUNT(DISTINCT to_file_id) AS cnt
      FROM edges
      WHERE project_id = ? AND to_file_id IS NOT NULL AND from_file_id != to_file_id
      GROUP BY from_file_id
    `).all(projectId) as any[];

    const fanIn: Record<number, number> = {};
    const fanOut: Record<number, number> = {};
    fanInRows.forEach(r => { fanIn[r.fid] = r.cnt; });
    fanOutRows.forEach(r => { fanOut[r.fid] = r.cnt; });

    const nodes: GraphNode[] = files.map(f => {
      const { id, dir } = getCommunity(f.relative_path);
      return {
        id: f.id,
        label: path.basename(f.relative_path),
        path: f.relative_path,
        language: f.language || 'unknown',
        fanIn: fanIn[f.id] || 0,
        fanOut: fanOut[f.id] || 0,
        community: id,
        dir,
      };
    });

    const edgeRows = db.prepare(`
      SELECT DISTINCT from_file_id, to_file_id
      FROM edges
      WHERE project_id = ? AND to_file_id IS NOT NULL AND from_file_id != to_file_id
    `).all(projectId) as any[];

    const edges: GraphEdge[] = edgeRows.map(r => ({ from: r.from_file_id, to: r.to_file_id }));

    return { nodes, edges };
  } finally {
    db.close();
  }
}

export function getSymbolsForFile(projectId: string, relPath: string, dbPath = DEFAULT_DB): SymbolItem[] {
  const db = requireDb(dbPath);
  try {
    return db.prepare(`
      SELECT s.id, s.name, s.kind, s.start_line, s.end_line, s.role, s.complexity_cyclomatic
      FROM symbols s
      JOIN files f ON s.file_id = f.id
      WHERE f.project_id = ? AND f.relative_path = ?
      ORDER BY s.start_line
    `).all(projectId, relPath) as SymbolItem[];
  } finally {
    db.close();
  }
}

const ENTRY_STOP_WORDS = new Set([
  'if','else','for','while','do','switch','case','return','break',
  'continue','try','catch','finally','new','delete','typeof','void',
  'throw','yield','await','super','this','in','of','from','as',
]);

export function getProjectEntryPoints(projectId: string, dbPath = DEFAULT_DB): EntryPointItem[] {
  const db = requireDb(dbPath);
  try {
    // Combined query: role=entry OR name patterns OR entry-file symbols
    const rows = db.prepare(`
      SELECT DISTINCT s.name, s.kind, f.path AS file_path, f.relative_path, s.start_line
      FROM symbols s
      JOIN files f ON s.file_id = f.id
      WHERE f.project_id = ?
        AND (
          s.role = 'entry'
          OR LOWER(s.name) IN ('main','handler','index','start','run','bootstrap',
                               'init','listen','serve','launch','setup',
                               'createserver','createapp','makeapp')
          OR s.name LIKE '%Handler'
          OR s.name LIKE '%Controller'
          OR s.name LIKE '%Router'
          OR s.name LIKE '%Routes'
          OR f.relative_path LIKE '%/index.ts'
          OR f.relative_path LIKE '%/index.js'
          OR f.relative_path LIKE '%/main.ts'
          OR f.relative_path LIKE '%/main.js'
          OR f.relative_path LIKE '%/app.ts'
          OR f.relative_path LIKE '%/server.ts'
        )
        AND s.kind IN ('function','method','class')
      ORDER BY f.relative_path, s.start_line
      LIMIT 30
    `).all(projectId) as any[];

    return rows
      .filter((r: any) => !ENTRY_STOP_WORDS.has(r.name))
      .map((r: any) => ({
        name: r.name,
        kind: r.kind,
        filePath: r.file_path,
        relPath: r.relative_path,
        startLine: r.start_line,
      }));
  } finally {
    db.close();
  }
}
