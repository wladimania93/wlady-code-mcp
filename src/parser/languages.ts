import type { SymbolKind } from '../types.js';

export interface SymbolPattern {
  kind: SymbolKind;
  pattern: RegExp;
  nameGroup: number;
  signatureGroup?: number;
}

export interface LanguageConfig {
  name: string;
  extensions: string[];
  symbolPatterns: SymbolPattern[];
  importPatterns: RegExp[];
  callPatterns: RegExp[];
  singleLineComment: string;
  blockCommentStart?: string;
  blockCommentEnd?: string;
}

export const LANGUAGE_CONFIGS: LanguageConfig[] = [
  {
    name: 'typescript',
    extensions: ['.ts', '.tsx', '.mts', '.cts'],
    symbolPatterns: [
      { kind: 'class', pattern: /^(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/, nameGroup: 1 },
      { kind: 'interface', pattern: /^(?:export\s+)?interface\s+(\w+)/, nameGroup: 1 },
      { kind: 'type', pattern: /^(?:export\s+)?type\s+(\w+)\s*=/, nameGroup: 1 },
      { kind: 'enum', pattern: /^(?:export\s+)?(?:const\s+)?enum\s+(\w+)/, nameGroup: 1 },
      { kind: 'function', pattern: /^(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*(\([^)]*\)(?:\s*:\s*\S+)?)/, nameGroup: 1, signatureGroup: 2 },
      { kind: 'method', pattern: /^\s+(?:public\s+|private\s+|protected\s+|static\s+|async\s+)*(?:get\s+|set\s+)?(\w+)\s*(\([^)]*\)(?:\s*:\s*\S+)?)(?:\s*\{|$)/, nameGroup: 1, signatureGroup: 2 },
      { kind: 'variable', pattern: /^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*(?::\s*[^=]+)?=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>|\w+\s*=>)/, nameGroup: 1 },
    ],
    importPatterns: [
      /^import\s+.*?from\s+['"]([^'"]+)['"]/,
      /^import\s+['"]([^'"]+)['"]/,
      /require\s*\(\s*['"]([^'"]+)['"]\s*\)/,
    ],
    callPatterns: [
      /(\w+)\s*\(/g,
    ],
    singleLineComment: '//',
    blockCommentStart: '/*',
    blockCommentEnd: '*/',
  },
  {
    name: 'javascript',
    extensions: ['.js', '.jsx', '.mjs', '.cjs'],
    symbolPatterns: [
      { kind: 'class', pattern: /^(?:export\s+)?(?:default\s+)?class\s+(\w+)/, nameGroup: 1 },
      { kind: 'function', pattern: /^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+(\w+)\s*(\([^)]*\))/, nameGroup: 1, signatureGroup: 2 },
      { kind: 'method', pattern: /^\s+(?:static\s+|async\s+)*(?:get\s+|set\s+)?(\w+)\s*(\([^)]*\))\s*\{/, nameGroup: 1, signatureGroup: 2 },
      { kind: 'variable', pattern: /^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>|\w+\s*=>)/, nameGroup: 1 },
    ],
    importPatterns: [
      /^import\s+.*?from\s+['"]([^'"]+)['"]/,
      /^import\s+['"]([^'"]+)['"]/,
      /require\s*\(\s*['"]([^'"]+)['"]\s*\)/,
    ],
    callPatterns: [
      /(\w+)\s*\(/g,
    ],
    singleLineComment: '//',
    blockCommentStart: '/*',
    blockCommentEnd: '*/',
  },
  {
    name: 'python',
    extensions: ['.py', '.pyw', '.pyi'],
    symbolPatterns: [
      { kind: 'class', pattern: /^class\s+(\w+)/, nameGroup: 1 },
      { kind: 'function', pattern: /^(?:async\s+)?def\s+(\w+)\s*(\([^)]*\)(?:\s*->\s*\S+)?)/, nameGroup: 1, signatureGroup: 2 },
      { kind: 'method', pattern: /^\s{4,}(?:async\s+)?def\s+(\w+)\s*(\([^)]*\)(?:\s*->\s*\S+)?)/, nameGroup: 1, signatureGroup: 2 },
    ],
    importPatterns: [
      /^import\s+([\w.]+)/,
      /^from\s+([\w.]+)\s+import/,
    ],
    callPatterns: [
      /(\w+)\s*\(/g,
    ],
    singleLineComment: '#',
  },
  {
    name: 'go',
    extensions: ['.go'],
    symbolPatterns: [
      { kind: 'function', pattern: /^func\s+(\w+)\s*(\([^)]*\)(?:\s+\([^)]*\)|\s+\w+)?)/, nameGroup: 1, signatureGroup: 2 },
      { kind: 'method', pattern: /^func\s+\(\w+\s+\*?\w+\)\s+(\w+)\s*(\([^)]*\))/, nameGroup: 1, signatureGroup: 2 },
      { kind: 'type', pattern: /^type\s+(\w+)\s+(?:struct|interface)/, nameGroup: 1 },
      { kind: 'interface', pattern: /^type\s+(\w+)\s+interface/, nameGroup: 1 },
      { kind: 'variable', pattern: /^var\s+(\w+)/, nameGroup: 1 },
    ],
    importPatterns: [
      /^\s+"([^"]+)"/,
      /^import\s+"([^"]+)"/,
    ],
    callPatterns: [
      /(\w+)\s*\(/g,
    ],
    singleLineComment: '//',
    blockCommentStart: '/*',
    blockCommentEnd: '*/',
  },
  {
    name: 'rust',
    extensions: ['.rs'],
    symbolPatterns: [
      { kind: 'function', pattern: /^(?:pub\s+)?(?:async\s+)?fn\s+(\w+)\s*(\([^)]*\)(?:\s*->\s*[^{]+)?)/, nameGroup: 1, signatureGroup: 2 },
      { kind: 'method', pattern: /^\s+(?:pub\s+)?(?:async\s+)?fn\s+(\w+)\s*(\([^)]*\)(?:\s*->\s*[^{]+)?)/, nameGroup: 1, signatureGroup: 2 },
      { kind: 'class', pattern: /^(?:pub\s+)?struct\s+(\w+)/, nameGroup: 1 },
      { kind: 'interface', pattern: /^(?:pub\s+)?trait\s+(\w+)/, nameGroup: 1 },
      { kind: 'enum', pattern: /^(?:pub\s+)?enum\s+(\w+)/, nameGroup: 1 },
      { kind: 'type', pattern: /^(?:pub\s+)?type\s+(\w+)/, nameGroup: 1 },
    ],
    importPatterns: [
      /^use\s+([\w:]+)/,
      /^extern crate\s+(\w+)/,
    ],
    callPatterns: [
      /(\w+)\s*\(/g,
      /(\w+)::\s*\w+\s*\(/g,
    ],
    singleLineComment: '//',
    blockCommentStart: '/*',
    blockCommentEnd: '*/',
  },
  {
    name: 'java',
    extensions: ['.java'],
    symbolPatterns: [
      { kind: 'class', pattern: /^(?:public\s+|private\s+|protected\s+)?(?:abstract\s+)?(?:final\s+)?class\s+(\w+)/, nameGroup: 1 },
      { kind: 'interface', pattern: /^(?:public\s+)?interface\s+(\w+)/, nameGroup: 1 },
      { kind: 'enum', pattern: /^(?:public\s+)?enum\s+(\w+)/, nameGroup: 1 },
      { kind: 'method', pattern: /^\s+(?:public\s+|private\s+|protected\s+)?(?:static\s+)?(?:final\s+)?(?:synchronized\s+)?(?:\w+(?:<[^>]*>)?)\s+(\w+)\s*\(([^)]*)\)/, nameGroup: 1, signatureGroup: 2 },
    ],
    importPatterns: [
      /^import\s+([\w.]+)/,
    ],
    callPatterns: [
      /(\w+)\s*\(/g,
    ],
    singleLineComment: '//',
    blockCommentStart: '/*',
    blockCommentEnd: '*/',
  },
  {
    name: 'csharp',
    extensions: ['.cs'],
    symbolPatterns: [
      { kind: 'class', pattern: /^(?:\s+)?(?:public\s+|private\s+|protected\s+|internal\s+)?(?:abstract\s+|sealed\s+)?class\s+(\w+)/, nameGroup: 1 },
      { kind: 'interface', pattern: /^(?:\s+)?(?:public\s+)?interface\s+(\w+)/, nameGroup: 1 },
      { kind: 'enum', pattern: /^(?:\s+)?(?:public\s+)?enum\s+(\w+)/, nameGroup: 1 },
      { kind: 'method', pattern: /^\s+(?:public\s+|private\s+|protected\s+|internal\s+)?(?:static\s+)?(?:async\s+)?(?:override\s+)?(?:\w+(?:<[^>]*>)?)\s+(\w+)\s*\([^)]*\)/, nameGroup: 1 },
    ],
    importPatterns: [
      /^using\s+([\w.]+)/,
    ],
    callPatterns: [
      /(\w+)\s*\(/g,
    ],
    singleLineComment: '//',
    blockCommentStart: '/*',
    blockCommentEnd: '*/',
  },
  {
    name: 'cpp',
    extensions: ['.cpp', '.cc', '.cxx', '.c++', '.hpp', '.hxx', '.h++'],
    symbolPatterns: [
      { kind: 'class', pattern: /^(?:template\s*<[^>]*>\s*)?class\s+(\w+)/, nameGroup: 1 },
      { kind: 'function', pattern: /^(?:inline\s+|static\s+|virtual\s+)?(?:[\w:*&<>]+\s+)+(\w+)\s*\(([^)]*)\)(?:\s+const)?(?:\s*\{|;)/, nameGroup: 1, signatureGroup: 2 },
      { kind: 'method', pattern: /^\s+(?:virtual\s+|static\s+|inline\s+)?(?:[\w:*&<>]+\s+)+(\w+)\s*\(([^)]*)\)(?:\s+const)?(?:\s*(?:override|final))?\s*(?:\{|;)/, nameGroup: 1, signatureGroup: 2 },
    ],
    importPatterns: [
      /^#include\s+[<"]([^>"]+)[>"]/,
    ],
    callPatterns: [
      /(\w+)\s*\(/g,
    ],
    singleLineComment: '//',
    blockCommentStart: '/*',
    blockCommentEnd: '*/',
  },
  {
    name: 'c',
    extensions: ['.c', '.h'],
    symbolPatterns: [
      { kind: 'function', pattern: /^(?:static\s+|inline\s+|extern\s+)?(?:[\w*]+\s+)+(\w+)\s*\(([^)]*)\)\s*\{/, nameGroup: 1, signatureGroup: 2 },
      { kind: 'type', pattern: /^typedef\s+(?:struct|enum|union)\s+\w*\s+(\w+)/, nameGroup: 1 },
    ],
    importPatterns: [
      /^#include\s+[<"]([^>"]+)[>"]/,
    ],
    callPatterns: [
      /(\w+)\s*\(/g,
    ],
    singleLineComment: '//',
    blockCommentStart: '/*',
    blockCommentEnd: '*/',
  },
  {
    name: 'php',
    extensions: ['.php', '.phtml'],
    symbolPatterns: [
      { kind: 'class', pattern: /^(?:abstract\s+)?(?:final\s+)?class\s+(\w+)/, nameGroup: 1 },
      { kind: 'interface', pattern: /^interface\s+(\w+)/, nameGroup: 1 },
      { kind: 'function', pattern: /^(?:public\s+|private\s+|protected\s+)?(?:static\s+)?function\s+(\w+)\s*\(([^)]*)\)/, nameGroup: 1, signatureGroup: 2 },
      { kind: 'method', pattern: /^\s+(?:public\s+|private\s+|protected\s+)?(?:static\s+)?function\s+(\w+)\s*\(([^)]*)\)/, nameGroup: 1, signatureGroup: 2 },
    ],
    importPatterns: [
      /^(?:require|include|require_once|include_once)\s+['"]([^'"]+)['"]/,
      /^use\s+([\w\\]+)/,
    ],
    callPatterns: [
      /(\w+)\s*\(/g,
    ],
    singleLineComment: '//',
    blockCommentStart: '/*',
    blockCommentEnd: '*/',
  },
  {
    name: 'ruby',
    extensions: ['.rb', '.rake'],
    symbolPatterns: [
      { kind: 'class', pattern: /^class\s+(\w+)/, nameGroup: 1 },
      { kind: 'module', pattern: /^module\s+(\w+)/, nameGroup: 1 },
      { kind: 'function', pattern: /^def\s+(\w+)/, nameGroup: 1 },
      { kind: 'method', pattern: /^\s+def\s+(\w+)/, nameGroup: 1 },
    ],
    importPatterns: [
      /^require\s+['"]([^'"]+)['"]/,
      /^require_relative\s+['"]([^'"]+)['"]/,
    ],
    callPatterns: [
      /(\w+)\s*\(/g,
      /(\w+)\s+\w/g,
    ],
    singleLineComment: '#',
  },
  {
    name: 'generic',
    extensions: [],
    symbolPatterns: [
      { kind: 'function', pattern: /^(?:function|func|def|fn)\s+(\w+)/, nameGroup: 1 },
      { kind: 'class', pattern: /^(?:class|struct|interface)\s+(\w+)/, nameGroup: 1 },
    ],
    importPatterns: [
      /^(?:import|require|include|use)\s+['"]?([^'"\s;]+)['"]?/,
    ],
    callPatterns: [
      /(\w+)\s*\(/g,
    ],
    singleLineComment: '//',
  },
];

const EXT_TO_LANGUAGE = new Map<string, LanguageConfig>();
for (const config of LANGUAGE_CONFIGS) {
  for (const ext of config.extensions) {
    EXT_TO_LANGUAGE.set(ext, config);
  }
}

export function getLanguageConfig(ext: string): LanguageConfig {
  return EXT_TO_LANGUAGE.get(ext.toLowerCase()) ?? LANGUAGE_CONFIGS[LANGUAGE_CONFIGS.length - 1];
}

export function detectLanguage(filePath: string): string {
  const ext = filePath.substring(filePath.lastIndexOf('.')).toLowerCase();
  const config = EXT_TO_LANGUAGE.get(ext);
  return config?.name ?? 'generic';
}

export const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg',
  '.mp3', '.mp4', '.wav', '.avi', '.mov',
  '.zip', '.tar', '.gz', '.rar', '.7z',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx',
  '.exe', '.dll', '.so', '.dylib', '.a', '.lib',
  '.ttf', '.woff', '.woff2', '.eot',
  '.db', '.sqlite', '.sqlite3',
  '.lock', '.bin', '.dat',
]);

export const INDEXABLE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.mts', '.cts',
  '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.pyw', '.pyi',
  '.go',
  '.rs',
  '.java',
  '.cs',
  '.cpp', '.cc', '.cxx', '.c++', '.hpp', '.hxx', '.h++',
  '.c', '.h',
  '.php', '.phtml',
  '.rb', '.rake',
  '.vue', '.svelte',
  '.json', '.yaml', '.yml', '.toml',
  '.md', '.txt', '.rst',
  '.sh', '.bash', '.zsh', '.fish',
  '.sql',
]);
