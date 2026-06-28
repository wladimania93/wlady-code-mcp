import * as path from 'path';
import { getLanguageConfig, detectLanguage, BINARY_EXTENSIONS } from './languages.js';
import type { ParseResult, ParsedSymbol, SymbolKind } from '../types.js';

const STOP_WORDS = new Set([
  'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'return', 'break',
  'continue', 'new', 'delete', 'typeof', 'instanceof', 'void', 'throw',
  'try', 'catch', 'finally', 'import', 'export', 'default', 'class', 'function',
  'const', 'let', 'var', 'async', 'await', 'yield', 'super', 'this', 'true',
  'false', 'null', 'undefined', 'in', 'of', 'from', 'as', 'with', 'static',
  'public', 'private', 'protected', 'abstract', 'override', 'readonly',
  'def', 'fn', 'pub', 'use', 'mod', 'struct', 'impl', 'trait', 'enum',
  'type', 'interface', 'extends', 'implements', 'package', 'namespace',
  'print', 'println', 'console', 'log', 'error', 'warn', 'debug',
]);

export class CodeParser {
  detectLanguage(filePath: string): string {
    return detectLanguage(filePath);
  }

  isBinary(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return BINARY_EXTENSIONS.has(ext);
  }

  parse(filePath: string, content: string): ParseResult {
    if (this.isBinary(filePath)) {
      return { symbols: [], imports: [], calls: [] };
    }

    const ext = path.extname(filePath).toLowerCase();
    const config = getLanguageConfig(ext);
    const lines = content.split('\n');

    const symbols: ParsedSymbol[] = [];
    const imports: string[] = [];
    const calls: { from: string; to: string; line: number }[] = [];

    // Track block comment state
    let inBlockComment = false;
    const symbolStack: { symbol: ParsedSymbol; indent: number; braceDepth: number }[] = [];
    let braceDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      const trimmed = line.trim();

      // Handle block comments
      if (config.blockCommentStart && config.blockCommentEnd) {
        if (inBlockComment) {
          if (trimmed.includes(config.blockCommentEnd)) {
            inBlockComment = false;
          }
          continue;
        }
        if (trimmed.startsWith(config.blockCommentStart) && !trimmed.includes(config.blockCommentEnd)) {
          inBlockComment = true;
          continue;
        }
      }

      // Skip single line comments
      if (trimmed.startsWith(config.singleLineComment)) {
        continue;
      }

      // Count braces to track scope
      for (const ch of trimmed) {
        if (ch === '{') braceDepth++;
        else if (ch === '}') {
          braceDepth--;
          // Close top symbol on stack if its scope ended
          if (symbolStack.length > 0 && braceDepth < symbolStack[symbolStack.length - 1].braceDepth) {
            const top = symbolStack.pop()!;
            top.symbol.end_line = lineNum;
          }
        }
      }

      // Extract imports
      for (const importPat of config.importPatterns) {
        const m = importPat.exec(trimmed);
        if (m && m[1]) {
          imports.push(m[1]);
          break;
        }
      }

      // Extract symbols
      for (const sp of config.symbolPatterns) {
        const m = sp.pattern.exec(line);
        if (m && m[sp.nameGroup]) {
          const name = m[sp.nameGroup];
          if (name.length < 2) continue;

          const signature = sp.signatureGroup && m[sp.signatureGroup]
            ? `${name}${m[sp.signatureGroup]}`
            : undefined;

          const indentLen = line.length - line.trimStart().length;
          const sym: ParsedSymbol = {
            name,
            kind: sp.kind,
            start_line: lineNum,
            end_line: lineNum,
            signature,
            body: undefined,
          };

          symbols.push(sym);
          symbolStack.push({ symbol: sym, indent: indentLen, braceDepth });
          break;
        }
      }

      // Extract calls
      const currentSymbol = this.getCurrentSymbol(symbolStack);
      for (const callPat of config.callPatterns) {
        callPat.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = callPat.exec(trimmed)) !== null) {
          const callee = m[1];
          if (callee && !STOP_WORDS.has(callee) && callee.length > 1 && /^[a-zA-Z_]/.test(callee)) {
            calls.push({
              from: currentSymbol ?? '',
              to: callee,
              line: lineNum,
            });
          }
        }
      }
    }

    // Close any remaining open symbols
    for (const { symbol } of symbolStack) {
      if (symbol.end_line === symbol.start_line) {
        symbol.end_line = lines.length;
      }
    }

    // Extract bodies for symbols
    for (const sym of symbols) {
      const bodyLines = lines.slice(sym.start_line - 1, Math.min(sym.end_line, sym.start_line + 200) - 1);
      sym.body = bodyLines.join('\n').substring(0, 2000);
    }

    return {
      symbols,
      imports: [...new Set(imports)],
      calls,
    };
  }

  private getCurrentSymbol(
    stack: { symbol: ParsedSymbol; indent: number; braceDepth: number }[]
  ): string | undefined {
    if (stack.length === 0) return undefined;
    return stack[stack.length - 1].symbol.name;
  }
}
