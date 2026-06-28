export const SCHEMA_SQL = `
PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  indexed_at INTEGER,
  file_count INTEGER NOT NULL DEFAULT 0,
  symbol_count INTEGER NOT NULL DEFAULT 0,
  edge_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  relative_path TEXT NOT NULL,
  language TEXT,
  size INTEGER,
  mtime INTEGER,
  hash TEXT,
  UNIQUE(project_id, relative_path)
);

CREATE INDEX IF NOT EXISTS idx_files_project ON files(project_id);
CREATE INDEX IF NOT EXISTS idx_files_path ON files(path);

CREATE TABLE IF NOT EXISTS symbols (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  qualified_name TEXT,
  kind TEXT NOT NULL DEFAULT 'other',
  start_line INTEGER NOT NULL DEFAULT 0,
  end_line INTEGER NOT NULL DEFAULT 0,
  signature TEXT,
  body TEXT,
  role TEXT NOT NULL DEFAULT 'unknown',
  complexity_cyclomatic INTEGER NOT NULL DEFAULT 1,
  complexity_cognitive INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_symbols_project ON symbols(project_id);
CREATE INDEX IF NOT EXISTS idx_symbols_file ON symbols(file_id);
CREATE INDEX IF NOT EXISTS idx_symbols_name ON symbols(name);
CREATE INDEX IF NOT EXISTS idx_symbols_kind ON symbols(kind);
CREATE INDEX IF NOT EXISTS idx_symbols_role ON symbols(role);

CREATE TABLE IF NOT EXISTS edges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  from_symbol_id INTEGER REFERENCES symbols(id) ON DELETE SET NULL,
  to_symbol_id INTEGER REFERENCES symbols(id) ON DELETE SET NULL,
  from_file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  to_file_id INTEGER REFERENCES files(id) ON DELETE SET NULL,
  edge_type TEXT NOT NULL DEFAULT 'calls',
  from_line INTEGER,
  call_name TEXT
);

CREATE INDEX IF NOT EXISTS idx_edges_project ON edges(project_id);
CREATE INDEX IF NOT EXISTS idx_edges_from_symbol ON edges(from_symbol_id);
CREATE INDEX IF NOT EXISTS idx_edges_to_symbol ON edges(to_symbol_id);
CREATE INDEX IF NOT EXISTS idx_edges_from_file ON edges(from_file_id);
CREATE INDEX IF NOT EXISTS idx_edges_to_file ON edges(to_file_id);
CREATE INDEX IF NOT EXISTS idx_edges_type ON edges(edge_type);

CREATE TABLE IF NOT EXISTS manifesto_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  rule_name TEXT NOT NULL,
  metric TEXT NOT NULL,
  warn_threshold REAL,
  fail_threshold REAL,
  UNIQUE(project_id, rule_name)
);

CREATE TABLE IF NOT EXISTS adrs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'proposed',
  context_text TEXT,
  decision TEXT,
  consequences TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(project_id, number)
);

CREATE INDEX IF NOT EXISTS idx_adrs_project ON adrs(project_id);

CREATE TABLE IF NOT EXISTS cochange_pairs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file1_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  file2_id INTEGER NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  count INTEGER NOT NULL DEFAULT 1,
  UNIQUE(project_id, file1_id, file2_id)
);

CREATE INDEX IF NOT EXISTS idx_cochange_project ON cochange_pairs(project_id);
CREATE INDEX IF NOT EXISTS idx_cochange_file1 ON cochange_pairs(file1_id);
CREATE INDEX IF NOT EXISTS idx_cochange_file2 ON cochange_pairs(file2_id);

CREATE VIRTUAL TABLE IF NOT EXISTS symbols_fts USING fts5(
  name,
  qualified_name,
  signature,
  body,
  content='symbols',
  content_rowid='id',
  tokenize='porter unicode61'
);

CREATE TABLE IF NOT EXISTS embeddings (
  symbol_id INTEGER PRIMARY KEY REFERENCES symbols(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  vector BLOB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_embeddings_project ON embeddings(project_id);
`;

export const FTS_TRIGGERS_SQL = [
  `CREATE TRIGGER IF NOT EXISTS symbols_fts_insert AFTER INSERT ON symbols BEGIN
    INSERT INTO symbols_fts(rowid, name, qualified_name, signature, body)
    VALUES (new.id, new.name, new.qualified_name, new.signature, new.body);
  END`,
  `CREATE TRIGGER IF NOT EXISTS symbols_fts_delete AFTER DELETE ON symbols BEGIN
    INSERT INTO symbols_fts(symbols_fts, rowid, name, qualified_name, signature, body)
    VALUES ('delete', old.id, old.name, old.qualified_name, old.signature, old.body);
  END`,
  `CREATE TRIGGER IF NOT EXISTS symbols_fts_update AFTER UPDATE ON symbols BEGIN
    INSERT INTO symbols_fts(symbols_fts, rowid, name, qualified_name, signature, body)
    VALUES ('delete', old.id, old.name, old.qualified_name, old.signature, old.body);
    INSERT INTO symbols_fts(rowid, name, qualified_name, signature, body)
    VALUES (new.id, new.name, new.qualified_name, new.signature, new.body);
  END`,
];
