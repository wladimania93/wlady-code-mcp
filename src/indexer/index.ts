import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ignoreFactory: () => { add(patterns: string | string[]): any; ignores(path: string): boolean } = _require('ignore');
import type { FSWatcher } from 'chokidar';
import { IncrementalDetector } from './incremental.js';
import { CodeParser } from '../parser/index.js';
import { detectLanguage, INDEXABLE_EXTENSIONS } from '../parser/languages.js';
import { computeCyclomatic, computeCognitive } from '../analysis/complexity.js';
import type { WladyDatabase } from '../db/database.js';
import type { IndexStats, FileRecord } from '../types.js';

const DEFAULT_IGNORE_PATTERNS = [
  'node_modules/**',
  '.git/**',
  'dist/**',
  'build/**',
  'out/**',
  '.next/**',
  '.nuxt/**',
  'coverage/**',
  '__pycache__/**',
  '*.pyc',
  '.DS_Store',
  'Thumbs.db',
  '*.min.js',
  '*.min.css',
  '*.map',
  'vendor/**',
  '.venv/**',
  'venv/**',
  'env/**',
  'target/**',
  'bin/**',
  'obj/**',
  '*.lock',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
];

export class Indexer {
  private detector = new IncrementalDetector();
  private parser = new CodeParser();
  private watcher: FSWatcher | null = null;

  constructor(private db: WladyDatabase) {}

  async index(
    projectPath: string,
    projectId: string,
    forceRebuild: boolean = false
  ): Promise<IndexStats> {
    const start = Date.now();
    let filesProcessed = 0;
    let filesSkipped = 0;
    let symbolsFound = 0;
    let edgesFound = 0;

    // Load .gitignore patterns
    const ig = ignoreFactory();
    ig.add(DEFAULT_IGNORE_PATTERNS);
    const gitignorePath = path.join(projectPath, '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      ig.add(fs.readFileSync(gitignorePath, 'utf-8'));
    }

    // Walk directory
    const allFiles = await glob('**/*', {
      cwd: projectPath,
      nodir: true,
      absolute: true,
      dot: false,
    });

    const indexableFiles = allFiles.filter(f => {
      const rel = path.relative(projectPath, f).replace(/\\/g, '/');
      if (ig.ignores(rel)) return false;
      const ext = path.extname(f).toLowerCase();
      return INDEXABLE_EXTENSIONS.has(ext);
    });

    // Get existing files from DB
    const existingFiles = forceRebuild ? [] : this.db.getFilesByProject(projectId);

    // Detect changes
    const { added, modified, deleted } = await this.detector.getChangedFiles(
      projectPath,
      existingFiles,
      indexableFiles
    );

    if (forceRebuild) {
      // Clear everything for this project
      this.db.deleteEdgesByProject(projectId);
      this.db.deleteSymbolsByProject(projectId);
      this.db.deleteFilesByProject(projectId);
    }

    // Process added and modified files
    const filesToProcess = forceRebuild ? indexableFiles : [...added, ...modified];

    this.db.transaction(() => {
      for (const absPath of filesToProcess) {
        try {
          const relativePath = path.relative(projectPath, absPath).replace(/\\/g, '/');
          const lang = detectLanguage(absPath);
          let content: string;
          try {
            content = fs.readFileSync(absPath, 'utf-8');
          } catch {
            filesSkipped++;
            continue;
          }

          // Get file meta
          const stat = fs.statSync(absPath);
          const meta = {
            mtime: Math.floor(stat.mtimeMs),
            size: stat.size,
          };

          // Upsert file record
          const fileId = this.db.upsertFile({
            project_id: projectId,
            path: absPath,
            relative_path: relativePath,
            language: lang,
            size: meta.size,
            mtime: meta.mtime,
            hash: undefined,
          });

          // Clear old symbols/edges for this file
          this.db.deleteEdgesByFile(fileId);
          this.db.deleteSymbolsByFile(fileId);

          // Parse
          const parseResult = this.parser.parse(absPath, content);

          // Insert symbols
          const symbolIdMap = new Map<string, number>();
          for (const sym of parseResult.symbols) {
            const cyclo = computeCyclomatic(sym.body ?? '', lang);
            const cogn = computeCognitive(sym.body ?? '', lang);

            const symId = this.db.insertSymbol({
              project_id: projectId,
              file_id: fileId,
              name: sym.name,
              qualified_name: `${relativePath}::${sym.name}`,
              kind: sym.kind,
              start_line: sym.start_line,
              end_line: sym.end_line,
              signature: sym.signature,
              body: sym.body,
              role: 'unknown',
              complexity_cyclomatic: cyclo,
              complexity_cognitive: cogn,
            });
            symbolIdMap.set(sym.name, symId);
            symbolsFound++;
          }

          // Insert import edges
          for (const importPath of parseResult.imports) {
            // Resolve import to file
            const resolvedFileId = this.resolveImport(projectPath, projectId, absPath, importPath);
            this.db.insertEdge({
              project_id: projectId,
              from_symbol_id: undefined,
              to_symbol_id: undefined,
              from_file_id: fileId,
              to_file_id: resolvedFileId ?? undefined,
              edge_type: 'imports',
              from_line: undefined,
              call_name: importPath,
            });
            edgesFound++;
          }

          // Insert call edges
          for (const call of parseResult.calls) {
            const fromSymId = call.from ? symbolIdMap.get(call.from) : undefined;
            // Resolve callee symbol
            const toSymId = this.resolveSymbol(projectId, call.to);

            this.db.insertEdge({
              project_id: projectId,
              from_symbol_id: fromSymId ?? undefined,
              to_symbol_id: toSymId ?? undefined,
              from_file_id: fileId,
              to_file_id: undefined,
              edge_type: 'calls',
              from_line: call.line,
              call_name: call.to,
            });
            edgesFound++;
          }

          filesProcessed++;
        } catch (err) {
          filesSkipped++;
        }
      }

      // Handle deleted files
      for (const delPath of deleted) {
        const relativePath = path.relative(projectPath, delPath).replace(/\\/g, '/');
        const fileRec = this.db.getFileByRelativePath(projectId, relativePath);
        if (fileRec) {
          this.db.deleteEdgesByFile(fileRec.id);
          this.db.deleteSymbolsByFile(fileRec.id);
          this.db.deleteFile(projectId, relativePath);
        }
      }
    });

    // Update project stats
    this.db.updateProjectStats(projectId);

    return {
      files_processed: filesProcessed,
      files_skipped: filesSkipped,
      symbols_found: symbolsFound,
      edges_found: edgesFound,
      duration_ms: Date.now() - start,
    };
  }

  private resolveImport(
    projectPath: string,
    projectId: string,
    fromFile: string,
    importPath: string
  ): number | null {
    if (!importPath.startsWith('.')) return null;

    const fromDir = path.dirname(fromFile);
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts', '.mjs'];
    let resolved = path.resolve(fromDir, importPath);

    // Try direct extensions
    for (const ext of extensions) {
      const candidate = resolved + ext;
      const rel = path.relative(projectPath, candidate).replace(/\\/g, '/');
      const fileRec = this.db.getFileByRelativePath(projectId, rel);
      if (fileRec) return fileRec.id;
    }

    // Try index files
    for (const ext of extensions) {
      const candidate = path.join(resolved, `index${ext}`);
      const rel = path.relative(projectPath, candidate).replace(/\\/g, '/');
      const fileRec = this.db.getFileByRelativePath(projectId, rel);
      if (fileRec) return fileRec.id;
    }

    // Try removing .js extension and retrying with .ts
    if (importPath.endsWith('.js')) {
      const tsImport = importPath.slice(0, -3) + '.ts';
      const tsResolved = path.resolve(fromDir, tsImport);
      const rel = path.relative(projectPath, tsResolved).replace(/\\/g, '/');
      const fileRec = this.db.getFileByRelativePath(projectId, rel);
      if (fileRec) return fileRec.id;
    }

    return null;
  }

  private resolveSymbol(projectId: string, name: string): number | null {
    const sym = this.db.getSymbolByName(projectId, name);
    return sym?.id ?? null;
  }

  async watch(
    projectPath: string,
    projectId: string,
    onChange: (stats: IndexStats) => void
  ): Promise<void> {
    const { default: chokidar } = await import('chokidar');

    if (this.watcher) {
      await this.watcher.close();
    }

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const changedFiles = new Set<string>();

    const scheduleReindex = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        const stats = await this.index(projectPath, projectId, false);
        onChange(stats);
        changedFiles.clear();
      }, 1000);
    };

    this.watcher = chokidar.watch(projectPath, {
      ignored: /(node_modules|\.git|dist|build|\.next)/,
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
    });

    this.watcher
      .on('add', f => { changedFiles.add(f); scheduleReindex(); })
      .on('change', f => { changedFiles.add(f); scheduleReindex(); })
      .on('unlink', f => { changedFiles.add(f); scheduleReindex(); });
  }

  async stopWatch(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }
}
