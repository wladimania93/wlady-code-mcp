export type SymbolKind = 'function' | 'class' | 'method' | 'interface' | 'variable' | 'type' | 'enum' | 'module' | 'other';
export type Role = 'entry' | 'core' | 'utility' | 'adapter' | 'dead' | 'leaf' | 'unknown';
export type EdgeType = 'calls' | 'imports' | 'extends' | 'implements' | 'uses';

export interface Project {
  id: string;
  name: string;
  path: string;
  created_at: number;
  indexed_at?: number;
  file_count: number;
  symbol_count: number;
  edge_count: number;
}

export interface FileRecord {
  id: number;
  project_id: string;
  path: string;
  relative_path: string;
  language?: string;
  size?: number;
  mtime?: number;
  hash?: string;
}

export interface Symbol {
  id: number;
  project_id: string;
  file_id: number;
  name: string;
  qualified_name?: string;
  kind: SymbolKind;
  start_line: number;
  end_line: number;
  signature?: string;
  body?: string;
  role: Role;
  complexity_cyclomatic: number;
  complexity_cognitive: number;
  // joined fields
  file_path?: string;
  relative_path?: string;
}

export interface Edge {
  id: number;
  project_id: string;
  from_symbol_id?: number;
  to_symbol_id?: number;
  from_file_id: number;
  to_file_id?: number;
  edge_type: EdgeType;
  from_line?: number;
  call_name?: string;
}

export interface ParsedSymbol {
  name: string;
  kind: SymbolKind;
  start_line: number;
  end_line: number;
  signature?: string;
  body?: string;
}

export interface ParsedEdge {
  from_name: string;
  to_name: string;
  edge_type: EdgeType;
  line: number;
}

export interface ParseResult {
  symbols: ParsedSymbol[];
  imports: string[];
  calls: { from: string; to: string; line: number }[];
}

export interface IndexStats {
  files_processed: number;
  files_skipped: number;
  symbols_found: number;
  edges_found: number;
  duration_ms: number;
}

export interface ManifestoRule {
  id: number;
  project_id: string;
  rule_name: string;
  metric: string;
  warn_threshold?: number;
  fail_threshold?: number;
}

export interface Adr {
  id: number;
  project_id: string;
  number: number;
  title: string;
  status: 'proposed' | 'accepted' | 'deprecated' | 'superseded';
  context_text?: string;
  decision?: string;
  consequences?: string;
  created_at: number;
  updated_at: number;
}
