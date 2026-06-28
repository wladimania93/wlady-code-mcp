// Decision point keywords per language for cyclomatic complexity
const CYCLOMATIC_PATTERNS: Record<string, RegExp> = {
  javascript: /\b(if|else\s+if|while|for|switch|case|catch|&&|\|\||\?)\b/g,
  typescript: /\b(if|else\s+if|while|for|switch|case|catch|&&|\|\||\?)\b/g,
  python: /\b(if|elif|while|for|except|and|or)\b/g,
  go: /\b(if|else\s+if|for|switch|case|select|&&|\|\|)\b/g,
  rust: /\b(if|else\s+if|while|for|match|&&|\|\||\?)\b/g,
  java: /\b(if|else\s+if|while|for|switch|case|catch|&&|\|\|)\b/g,
  csharp: /\b(if|else\s+if|while|for|foreach|switch|case|catch|&&|\|\|)\b/g,
  cpp: /\b(if|else\s+if|while|for|switch|case|catch|&&|\|\|)\b/g,
  c: /\b(if|else\s+if|while|for|switch|case|&&|\|\|)\b/g,
  php: /\b(if|elseif|while|for|foreach|switch|case|catch|&&|\|\|)\b/g,
  ruby: /\b(if|elsif|unless|while|for|until|case|when|rescue|&&|\|\|)\b/g,
  generic: /\b(if|while|for|switch|case|&&|\|\|)\b/g,
};

// Nesting increment keywords for cognitive complexity
const NESTING_PATTERNS: Record<string, RegExp> = {
  javascript: /\b(if|else|while|for|switch|try|catch|finally)\b|\{/g,
  typescript: /\b(if|else|while|for|switch|try|catch|finally)\b|\{/g,
  python: /^\s*(if|elif|else|while|for|try|except|finally|with|def|class)\b/gm,
  go: /\b(if|else|for|switch|select)\b|\{/g,
  rust: /\b(if|else|while|for|match|loop)\b|\{/g,
  java: /\b(if|else|while|for|switch|try|catch|finally)\b|\{/g,
  csharp: /\b(if|else|while|for|foreach|switch|try|catch|finally)\b|\{/g,
  cpp: /\b(if|else|while|for|switch|try|catch)\b|\{/g,
  c: /\b(if|else|while|for|switch)\b|\{/g,
  php: /\b(if|elseif|else|while|for|foreach|switch|try|catch|finally)\b|\{/g,
  ruby: /\b(if|elsif|else|unless|while|for|until|begin|rescue|ensure)\b|do\s*\|/g,
  generic: /\b(if|else|while|for)\b|\{/g,
};

/**
 * Compute McCabe cyclomatic complexity.
 * Counts decision points (branches) + 1.
 */
export function computeCyclomatic(body: string, lang: string): number {
  if (!body || body.trim().length === 0) return 1;

  const pattern = CYCLOMATIC_PATTERNS[lang] ?? CYCLOMATIC_PATTERNS['generic'];
  // Reset lastIndex to avoid stateful regex issues
  pattern.lastIndex = 0;

  let count = 1;
  const matches = body.match(new RegExp(pattern.source, 'g'));
  if (matches) {
    count += matches.length;
  }

  return Math.min(count, 100); // Cap at 100 to avoid extreme values
}

/**
 * Compute cognitive complexity.
 * Penalizes nested structures more than flat ones.
 */
export function computeCognitive(body: string, lang: string): number {
  if (!body || body.trim().length === 0) return 0;

  const lines = body.split('\n');
  let total = 0;
  let nestingLevel = 0;

  const nestingIncreaseWords = getLanguageNestingWords(lang);
  const nestingDecreaseWords = getLanguageNestingDecreaseWords(lang);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) continue;

    // Count nesting increases
    for (const word of nestingIncreaseWords) {
      if (new RegExp(`\\b${word}\\b`).test(trimmed)) {
        total += 1 + nestingLevel;
        nestingLevel++;
        break;
      }
    }

    // Count nesting decreases
    for (const word of nestingDecreaseWords) {
      if (new RegExp(`\\b${word}\\b`).test(trimmed) || trimmed === '}' || trimmed === 'end') {
        if (nestingLevel > 0) nestingLevel--;
        break;
      }
    }

    // Penalize logical operators
    const andCount = (trimmed.match(/&&/g) ?? []).length;
    const orCount = (trimmed.match(/\|\|/g) ?? []).length;
    total += andCount + orCount;
  }

  return Math.min(total, 100);
}

function getLanguageNestingWords(lang: string): string[] {
  const map: Record<string, string[]> = {
    javascript: ['if', 'else', 'while', 'for', 'switch', 'try', 'catch'],
    typescript: ['if', 'else', 'while', 'for', 'switch', 'try', 'catch'],
    python: ['if', 'elif', 'else', 'while', 'for', 'try', 'except', 'with'],
    go: ['if', 'else', 'for', 'switch', 'select'],
    rust: ['if', 'else', 'while', 'for', 'match', 'loop'],
    java: ['if', 'else', 'while', 'for', 'switch', 'try', 'catch'],
    csharp: ['if', 'else', 'while', 'for', 'foreach', 'switch', 'try', 'catch'],
    cpp: ['if', 'else', 'while', 'for', 'switch', 'try', 'catch'],
    c: ['if', 'else', 'while', 'for', 'switch'],
    php: ['if', 'elseif', 'else', 'while', 'for', 'foreach', 'switch', 'try', 'catch'],
    ruby: ['if', 'elsif', 'else', 'unless', 'while', 'for', 'until', 'begin', 'rescue'],
    generic: ['if', 'else', 'while', 'for'],
  };
  return map[lang] ?? map['generic'];
}

function getLanguageNestingDecreaseWords(lang: string): string[] {
  const map: Record<string, string[]> = {
    python: ['else', 'elif', 'except', 'finally'],
    ruby: ['end'],
    generic: [],
  };
  return map[lang] ?? [];
}

/**
 * Compute maintainability index.
 * MI = 171 - 5.2 * ln(V) - 0.23 * G - 16.2 * ln(LOC)
 * Simplified: uses cyclomatic and LOC.
 */
export function computeMaintainability(cyclomatic: number, linesOfCode: number): number {
  if (linesOfCode <= 0) return 100;
  const g = Math.max(1, cyclomatic);
  const loc = Math.max(1, linesOfCode);
  const mi = 171 - 5.2 * Math.log(loc) - 0.23 * g - 16.2 * Math.log(loc);
  return Math.max(0, Math.min(100, mi));
}
