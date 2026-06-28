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
