import type { WladyDatabase } from '../db/database.js';
import type { Symbol } from '../types.js';

// Control-flow keywords that the regex parser can incorrectly emit as symbols
const STOP_WORDS = new Set([
  'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'return', 'break',
  'continue', 'try', 'catch', 'finally', 'new', 'delete', 'typeof', 'void',
  'throw', 'yield', 'await', 'super', 'this', 'in', 'of', 'from', 'as',
]);

// Name patterns that strongly suggest an entry point
const ENTRY_NAME_PATTERNS = [
  /^main$/i,
  /^handler$/i,
  /^index$/i,
  /^start$/i,
  /^run$/i,
  /^bootstrap$/i,
  /^init$/i,
  /^listen$/i,
  /^serve$/i,
  /^launch$/i,
  /^setup$/i,
  /^createServer$/i,
  /^createApp$/i,
  /^makeApp$/i,
  /Handler$/,    // e.g. requestHandler, connectHandler
  /Controller$/, // e.g. UserController (class)
  /Router$/,     // e.g. userRouter
  /Routes?$/,    // e.g. authRoutes
];

// File name patterns that typically contain entry points
const ENTRY_FILE_PATTERNS = [
  /\/(index|main|app|server|handler|entry|bootstrap|start)\.[tj]sx?$/,
  /\/cmd\//,
  /\/cmd\.[tj]sx?$/,
  /\/bin\//,
];

// Body content indicating HTTP route registration
const HTTP_ROUTE_BODY_PATTERNS = [
  /app\.(get|post|put|patch|delete|use)\s*\(/,
  /router\.(get|post|put|patch|delete|use)\s*\(/,
  /fastify\.(get|post|put|patch|delete)\s*\(/,
  /server\.(route|inject)\s*\(/,
  /express\(\)/,
  /@(Get|Post|Put|Patch|Delete|Controller|Route)\s*\(/,
];

export interface EntryPoint {
  symbol: Symbol;
  reason: string;
}

export function detectEntryPoints(
  projectId: string,
  db: WladyDatabase,
  limit = 20
): EntryPoint[] {
  const raw = db.getRawDb();
  const seen = new Set<number>();
  const results: EntryPoint[] = [];

  function add(sym: Symbol, reason: string) {
    if (!seen.has(sym.id) && results.length < limit && !STOP_WORDS.has(sym.name)) {
      seen.add(sym.id);
      results.push({ symbol: sym, reason });
    }
  }

  // 1. Symbols already classified as 'entry' by the roles analysis
  const roleEntries = raw.prepare(`
    SELECT s.*, f.path as file_path, f.relative_path
    FROM symbols s JOIN files f ON s.file_id = f.id
    WHERE s.project_id = ? AND s.role = 'entry'
    ORDER BY s.start_line
  `).all(projectId) as Symbol[];

  for (const sym of roleEntries) add(sym, 'role=entry');

  // 2. Symbols whose name matches entry patterns
  const allFunctions = raw.prepare(`
    SELECT s.*, f.path as file_path, f.relative_path
    FROM symbols s JOIN files f ON s.file_id = f.id
    WHERE s.project_id = ? AND s.kind IN ('function', 'method', 'class')
    ORDER BY f.relative_path, s.start_line
  `).all(projectId) as Symbol[];

  for (const sym of allFunctions) {
    if (seen.has(sym.id)) continue;
    for (const pat of ENTRY_NAME_PATTERNS) {
      if (pat.test(sym.name)) {
        add(sym, `name matches /${pat.source}/`);
        break;
      }
    }
  }

  // 3. Symbols in entry-point files (even if name doesn't match)
  for (const sym of allFunctions) {
    if (seen.has(sym.id)) continue;
    const filePath = sym.relative_path ?? '';
    for (const pat of ENTRY_FILE_PATTERNS) {
      if (pat.test(filePath)) {
        add(sym, `entry file: ${filePath}`);
        break;
      }
    }
  }

  // 4. Symbols whose body registers HTTP routes
  for (const sym of allFunctions) {
    if (seen.has(sym.id)) continue;
    const body = sym.body ?? '';
    for (const pat of HTTP_ROUTE_BODY_PATTERNS) {
      if (pat.test(body)) {
        add(sym, 'registers HTTP routes');
        break;
      }
    }
  }

  return results;
}
