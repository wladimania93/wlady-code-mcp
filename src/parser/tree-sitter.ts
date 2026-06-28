import { createRequire } from 'module';
import type { ParseResult, ParsedSymbol, SymbolKind } from '../types.js';

const _require = createRequire(import.meta.url);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SNode = any;

let _parser: unknown | null = null;
const grammarCache = new Map<string, unknown>();
const failedGrammars = new Set<string>();

function getParser(): unknown {
  if (!_parser) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const TreeSitter = _require('tree-sitter') as any;
    _parser = new TreeSitter();
  }
  return _parser;
}

function loadGrammar(langKey: string): unknown | null {
  if (grammarCache.has(langKey)) return grammarCache.get(langKey) ?? null;
  if (failedGrammars.has(langKey)) return null;
  try {
    let g: unknown;
    switch (langKey) {
      case 'typescript': g = (_require('tree-sitter-typescript') as { typescript: unknown }).typescript; break;
      case 'tsx':        g = (_require('tree-sitter-typescript') as { tsx: unknown }).tsx; break;
      case 'javascript': g = _require('tree-sitter-javascript'); break;
      case 'python':     g = _require('tree-sitter-python'); break;
      case 'java':       g = _require('tree-sitter-java'); break;
      case 'go':         g = _require('tree-sitter-go'); break;
      case 'rust':       g = _require('tree-sitter-rust'); break;
      case 'csharp':     g = _require('tree-sitter-c-sharp/bindings/node/index.js'); break;
      case 'cpp':        g = _require('tree-sitter-cpp'); break;
      case 'php':        g = (_require('tree-sitter-php') as { php_only: unknown }).php_only; break;
      case 'ruby':       g = _require('tree-sitter-ruby'); break;
      default: return null;
    }
    grammarCache.set(langKey, g);
    return g;
  } catch {
    failedGrammars.add(langKey);
    return null;
  }
}

const EXT_TO_LANG: Record<string, string> = {
  '.ts': 'typescript', '.mts': 'typescript', '.cts': 'typescript',
  '.tsx': 'tsx',
  '.js': 'javascript', '.jsx': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript',
  '.py': 'python', '.pyw': 'python', '.pyi': 'python',
  '.java': 'java',
  '.go': 'go',
  '.rs': 'rust',
  '.cs': 'csharp',
  '.cpp': 'cpp', '.cc': 'cpp', '.cxx': 'cpp', '.c++': 'cpp',
  '.hpp': 'cpp', '.hxx': 'cpp', '.h++': 'cpp',
  '.php': 'php', '.phtml': 'php',
  '.rb': 'ruby', '.rake': 'ruby',
};

function getLangKey(filePath: string): string | null {
  const dotIdx = filePath.lastIndexOf('.');
  if (dotIdx === -1) return null;
  return EXT_TO_LANG[filePath.substring(dotIdx).toLowerCase()] ?? null;
}

function nameFromField(node: SNode, ...fields: string[]): string | null {
  for (const f of fields) {
    const child: SNode | null = node.childForFieldName(f);
    if (child) return child.text as string;
  }
  return null;
}

function makeSymbol(
  name: string,
  kind: SymbolKind,
  node: SNode,
  content: string,
  signature?: string,
): ParsedSymbol {
  const start: number = (node.startPosition.row as number) + 1;
  const end: number = (node.endPosition.row as number) + 1;
  const lines = content.split('\n');
  const body = lines
    .slice(start - 1, Math.min(end, start + 200) - 1)
    .join('\n')
    .substring(0, 2000);
  return { name, kind, start_line: start, end_line: end, signature, body };
}

interface Extraction {
  symbols: ParsedSymbol[];
  imports: string[];
  calls: { from: string; to: string; line: number }[];
}

// ─── TypeScript / JavaScript ──────────────────────────────────────────────────

function walkJsTs(
  node: SNode,
  ext: Extraction,
  content: string,
  scope: string | null,
  insideClass: boolean,
): void {
  const t: string = node.type;

  if (t === 'export_statement') {
    const decl: SNode | null =
      node.childForFieldName('declaration') ??
      (node.namedChildren as SNode[]).find(
        (c: SNode) => c.type !== 'export' && c.type !== 'default',
      );
    if (decl) walkJsTs(decl, ext, content, scope, insideClass);
    return;
  }

  if (t === 'function_declaration' || t === 'generator_function_declaration') {
    const name = nameFromField(node, 'name');
    if (name) {
      const sig = `${name}${(node.childForFieldName('parameters')?.text as string | undefined) ?? ''}`;
      ext.symbols.push(makeSymbol(name, insideClass ? 'method' : 'function', node, content, sig));
      for (const child of node.namedChildren as SNode[]) {
        walkJsTs(child, ext, content, name, false);
      }
    }
    return;
  }

  if (t === 'class_declaration' || t === 'class') {
    const name = nameFromField(node, 'name');
    if (name) {
      ext.symbols.push(makeSymbol(name, 'class', node, content));
      for (const child of node.namedChildren as SNode[]) {
        walkJsTs(child, ext, content, name, true);
      }
    }
    return;
  }

  if (t === 'method_definition' || t === 'method_signature') {
    const name = nameFromField(node, 'name');
    if (name && name !== 'constructor') {
      const sig = `${name}${(node.childForFieldName('parameters')?.text as string | undefined) ?? ''}`;
      ext.symbols.push(makeSymbol(name, 'method', node, content, sig));
      for (const child of node.namedChildren as SNode[]) {
        walkJsTs(child, ext, content, name, false);
      }
    }
    return;
  }

  if (t === 'interface_declaration') {
    const name = nameFromField(node, 'name');
    if (name) ext.symbols.push(makeSymbol(name, 'interface', node, content));
    return;
  }

  if (t === 'type_alias_declaration') {
    const name = nameFromField(node, 'name');
    if (name) ext.symbols.push(makeSymbol(name, 'type', node, content));
    return;
  }

  if (t === 'enum_declaration') {
    const name = nameFromField(node, 'name');
    if (name) ext.symbols.push(makeSymbol(name, 'enum', node, content));
    return;
  }

  if (t === 'lexical_declaration' || t === 'variable_declaration') {
    for (const decl of node.namedChildren as SNode[]) {
      if (decl.type !== 'variable_declarator') continue;
      const nameNode: SNode | null = decl.childForFieldName('name');
      const valueNode: SNode | null = decl.childForFieldName('value');
      if (
        nameNode && valueNode &&
        (valueNode.type === 'arrow_function' ||
          valueNode.type === 'function_expression' ||
          valueNode.type === 'generator_function')
      ) {
        const name = nameNode.text as string;
        const sig = `${name}${(valueNode.childForFieldName('parameters')?.text as string | undefined) ?? ''}`;
        ext.symbols.push(makeSymbol(name, 'function', decl, content, sig));
        for (const child of valueNode.namedChildren as SNode[]) {
          walkJsTs(child, ext, content, name, false);
        }
      }
    }
    return;
  }

  if (t === 'import_statement') {
    const source: SNode | null = node.childForFieldName('source');
    if (source) ext.imports.push((source.text as string).replace(/^['"]|['"]$/g, ''));
    return;
  }

  if (t === 'call_expression') {
    const fn: SNode | null = node.childForFieldName('function');
    if (fn) {
      const callee: string =
        fn.type === 'member_expression'
          ? ((fn.childForFieldName('property')?.text as string | undefined) ?? fn.text as string)
          : (fn.text as string);
      if (callee.length > 1 && /^[a-zA-Z_$]/.test(callee)) {
        ext.calls.push({ from: scope ?? '', to: callee, line: (node.startPosition.row as number) + 1 });
      }
    }
    const args: SNode | null = node.childForFieldName('arguments');
    if (args) {
      for (const child of args.namedChildren as SNode[]) {
        walkJsTs(child, ext, content, scope, insideClass);
      }
    }
    return;
  }

  for (const child of node.namedChildren as SNode[]) {
    walkJsTs(child, ext, content, scope, insideClass);
  }
}

// ─── Python ───────────────────────────────────────────────────────────────────

function walkPython(
  node: SNode,
  ext: Extraction,
  content: string,
  scope: string | null,
  insideClass: boolean,
): void {
  const t: string = node.type;

  if (t === 'function_definition') {
    const name = nameFromField(node, 'name');
    if (name) {
      const params: string = (node.childForFieldName('parameters')?.text as string | undefined) ?? '';
      const ret: string = node.childForFieldName('return_type')
        ? ` -> ${node.childForFieldName('return_type').text as string}`
        : '';
      ext.symbols.push(makeSymbol(name, insideClass ? 'method' : 'function', node, content, `${name}${params}${ret}`));
      const body: SNode | null = node.childForFieldName('body');
      if (body) walkPython(body, ext, content, name, insideClass);
    }
    return;
  }

  if (t === 'class_definition') {
    const name = nameFromField(node, 'name');
    if (name) {
      ext.symbols.push(makeSymbol(name, 'class', node, content));
      const body: SNode | null = node.childForFieldName('body');
      if (body) walkPython(body, ext, content, name, true);
    }
    return;
  }

  if (t === 'decorated_definition') {
    const def: SNode | undefined = (node.namedChildren as SNode[]).find(
      (c: SNode) => c.type === 'function_definition' || c.type === 'class_definition',
    );
    if (def) walkPython(def, ext, content, scope, insideClass);
    return;
  }

  if (t === 'import_statement') {
    const nameNode: SNode | undefined = (node.namedChildren as SNode[]).find(
      (c: SNode) => c.type === 'dotted_name' || c.type === 'aliased_import',
    );
    if (nameNode) ext.imports.push((nameNode.text as string).split(' ')[0]);
    return;
  }

  if (t === 'import_from_statement') {
    const mod: SNode | null = node.childForFieldName('module_name');
    if (mod) ext.imports.push(mod.text as string);
    return;
  }

  if (t === 'call') {
    const fn: SNode | null = node.childForFieldName('function');
    if (fn) {
      const callee: string =
        fn.type === 'attribute'
          ? ((fn.childForFieldName('attribute')?.text as string | undefined) ?? fn.text as string)
          : (fn.text as string);
      if (callee.length > 1 && /^[a-zA-Z_]/.test(callee)) {
        ext.calls.push({ from: scope ?? '', to: callee, line: (node.startPosition.row as number) + 1 });
      }
    }
    const args: SNode | null = node.childForFieldName('arguments');
    if (args) {
      for (const child of args.namedChildren as SNode[]) {
        walkPython(child, ext, content, scope, insideClass);
      }
    }
    return;
  }

  for (const child of node.namedChildren as SNode[]) {
    walkPython(child, ext, content, scope, insideClass);
  }
}

// ─── Go ───────────────────────────────────────────────────────────────────────

function walkGo(node: SNode, ext: Extraction, content: string, scope: string | null): void {
  const t: string = node.type;

  if (t === 'function_declaration') {
    const name = nameFromField(node, 'name');
    if (name) {
      const params: string = (node.childForFieldName('parameters')?.text as string | undefined) ?? '';
      const result: string = node.childForFieldName('result')
        ? ` ${node.childForFieldName('result').text as string}`
        : '';
      ext.symbols.push(makeSymbol(name, 'function', node, content, `${name}${params}${result}`));
      const body: SNode | null = node.childForFieldName('body');
      if (body) walkGo(body, ext, content, name);
    }
    return;
  }

  if (t === 'method_declaration') {
    const name = nameFromField(node, 'name');
    if (name) {
      const params: string = (node.childForFieldName('parameters')?.text as string | undefined) ?? '';
      ext.symbols.push(makeSymbol(name, 'method', node, content, `${name}${params}`));
      const body: SNode | null = node.childForFieldName('body');
      if (body) walkGo(body, ext, content, name);
    }
    return;
  }

  if (t === 'type_declaration') {
    for (const spec of node.namedChildren as SNode[]) {
      if (spec.type !== 'type_spec') continue;
      const name = nameFromField(spec, 'name');
      const typeNode: SNode | null = spec.childForFieldName('type');
      if (name && typeNode) {
        ext.symbols.push(makeSymbol(name, typeNode.type === 'interface_type' ? 'interface' : 'type', spec, content));
      }
    }
    return;
  }

  if (t === 'import_spec') {
    const p: SNode | null = node.childForFieldName('path') ?? (node.namedChildren as SNode[])[0];
    if (p) ext.imports.push((p.text as string).replace(/^["']|["']$/g, ''));
    return;
  }

  if (t === 'call_expression') {
    const fn: SNode | null = node.childForFieldName('function');
    if (fn) {
      const callee: string =
        fn.type === 'selector_expression'
          ? ((fn.childForFieldName('field')?.text as string | undefined) ?? fn.text as string)
          : (fn.text as string);
      if (callee.length > 1 && /^[a-zA-Z_]/.test(callee)) {
        ext.calls.push({ from: scope ?? '', to: callee, line: (node.startPosition.row as number) + 1 });
      }
    }
    return;
  }

  for (const child of node.namedChildren as SNode[]) {
    walkGo(child, ext, content, scope);
  }
}

// ─── Rust ─────────────────────────────────────────────────────────────────────

function walkRust(
  node: SNode,
  ext: Extraction,
  content: string,
  scope: string | null,
  insideImpl: boolean,
): void {
  const t: string = node.type;

  if (t === 'function_item') {
    const name = nameFromField(node, 'name');
    if (name) {
      const params: string = (node.childForFieldName('parameters')?.text as string | undefined) ?? '';
      const ret: string = node.childForFieldName('return_type')
        ? ` -> ${node.childForFieldName('return_type').text as string}`
        : '';
      ext.symbols.push(makeSymbol(name, insideImpl ? 'method' : 'function', node, content, `${name}${params}${ret}`));
      const body: SNode | null = node.childForFieldName('body');
      if (body) walkRust(body, ext, content, name, insideImpl);
    }
    return;
  }

  if (t === 'impl_item') {
    const body: SNode | null = node.childForFieldName('body');
    if (body) walkRust(body, ext, content, scope, true);
    return;
  }

  if (t === 'struct_item') {
    const name = nameFromField(node, 'name');
    if (name) ext.symbols.push(makeSymbol(name, 'class', node, content));
    return;
  }

  if (t === 'trait_item') {
    const name = nameFromField(node, 'name');
    if (name) ext.symbols.push(makeSymbol(name, 'interface', node, content));
    return;
  }

  if (t === 'enum_item') {
    const name = nameFromField(node, 'name');
    if (name) ext.symbols.push(makeSymbol(name, 'enum', node, content));
    return;
  }

  if (t === 'type_item') {
    const name = nameFromField(node, 'name');
    if (name) ext.symbols.push(makeSymbol(name, 'type', node, content));
    return;
  }

  if (t === 'use_declaration') {
    const path: SNode | undefined = (node.namedChildren as SNode[])[0];
    if (path) ext.imports.push(path.text as string);
    return;
  }

  if (t === 'call_expression' || t === 'method_call_expression') {
    const fn: SNode | null =
      t === 'call_expression'
        ? node.childForFieldName('function')
        : node.childForFieldName('method');
    if (fn) {
      const raw: string = fn.text as string;
      const callee: string =
        fn.type === 'field_expression'
          ? ((fn.childForFieldName('field')?.text as string | undefined) ?? raw)
          : (raw.split('::').pop() ?? raw);
      if (callee.length > 1 && /^[a-zA-Z_]/.test(callee)) {
        ext.calls.push({ from: scope ?? '', to: callee, line: (node.startPosition.row as number) + 1 });
      }
    }
    return;
  }

  for (const child of node.namedChildren as SNode[]) {
    walkRust(child, ext, content, scope, insideImpl);
  }
}

// ─── Java ─────────────────────────────────────────────────────────────────────

function walkJava(
  node: SNode,
  ext: Extraction,
  content: string,
  scope: string | null,
  insideClass: boolean,
): void {
  const t: string = node.type;

  if (t === 'class_declaration') {
    const name = nameFromField(node, 'name');
    if (name) {
      ext.symbols.push(makeSymbol(name, 'class', node, content));
      const body: SNode | null = node.childForFieldName('body');
      if (body) walkJava(body, ext, content, name, true);
    }
    return;
  }

  if (t === 'interface_declaration') {
    const name = nameFromField(node, 'name');
    if (name) {
      ext.symbols.push(makeSymbol(name, 'interface', node, content));
      const body: SNode | null = node.childForFieldName('body');
      if (body) walkJava(body, ext, content, name, true);
    }
    return;
  }

  if (t === 'enum_declaration') {
    const name = nameFromField(node, 'name');
    if (name) ext.symbols.push(makeSymbol(name, 'enum', node, content));
    return;
  }

  if (t === 'method_declaration' || t === 'constructor_declaration') {
    const name = nameFromField(node, 'name');
    if (name) {
      const params: string = (node.childForFieldName('parameters')?.text as string | undefined) ?? '';
      ext.symbols.push(makeSymbol(name, 'method', node, content, `${name}${params}`));
      const body: SNode | null = node.childForFieldName('body');
      if (body) walkJava(body, ext, content, name, insideClass);
    }
    return;
  }

  if (t === 'import_declaration') {
    const p: SNode | undefined = (node.namedChildren as SNode[]).find(
      (c: SNode) => c.type === 'scoped_identifier' || c.type === 'identifier',
    );
    if (p) ext.imports.push(p.text as string);
    return;
  }

  if (t === 'method_invocation') {
    const name = nameFromField(node, 'name');
    if (name && name.length > 1 && /^[a-zA-Z_]/.test(name)) {
      ext.calls.push({ from: scope ?? '', to: name, line: (node.startPosition.row as number) + 1 });
    }
    const args: SNode | null = node.childForFieldName('arguments');
    if (args) {
      for (const child of args.namedChildren as SNode[]) {
        walkJava(child, ext, content, scope, insideClass);
      }
    }
    return;
  }

  for (const child of node.namedChildren as SNode[]) {
    walkJava(child, ext, content, scope, insideClass);
  }
}

// ─── C# ──────────────────────────────────────────────────────────────────────

function walkCSharp(
  node: SNode,
  ext: Extraction,
  content: string,
  scope: string | null,
  insideClass: boolean,
): void {
  const t: string = node.type;

  if (t === 'class_declaration') {
    const name = nameFromField(node, 'name');
    if (name) {
      ext.symbols.push(makeSymbol(name, 'class', node, content));
      const body: SNode | null = node.childForFieldName('body');
      if (body) walkCSharp(body, ext, content, name, true);
    }
    return;
  }

  if (t === 'interface_declaration') {
    const name = nameFromField(node, 'name');
    if (name) {
      ext.symbols.push(makeSymbol(name, 'interface', node, content));
      const body: SNode | null = node.childForFieldName('body');
      if (body) walkCSharp(body, ext, content, name, true);
    }
    return;
  }

  if (t === 'enum_declaration') {
    const name = nameFromField(node, 'name');
    if (name) ext.symbols.push(makeSymbol(name, 'enum', node, content));
    return;
  }

  if (t === 'method_declaration' || t === 'constructor_declaration') {
    const name = nameFromField(node, 'name');
    if (name) {
      const params: string = (node.childForFieldName('parameters')?.text as string | undefined) ?? '';
      ext.symbols.push(makeSymbol(name, 'method', node, content, `${name}${params}`));
      const body: SNode | null = node.childForFieldName('body');
      if (body) walkCSharp(body, ext, content, name, insideClass);
    }
    return;
  }

  if (t === 'using_directive') {
    const ns: SNode | undefined = (node.namedChildren as SNode[]).find(
      (c: SNode) => c.type === 'qualified_name' || c.type === 'identifier',
    );
    if (ns) ext.imports.push(ns.text as string);
    return;
  }

  if (t === 'invocation_expression') {
    const fn: SNode | null = node.childForFieldName('expression');
    if (fn) {
      const callee: string =
        fn.type === 'member_access_expression'
          ? ((fn.childForFieldName('name')?.text as string | undefined) ?? fn.text as string)
          : (fn.text as string);
      if (callee.length > 1 && /^[a-zA-Z_]/.test(callee)) {
        ext.calls.push({ from: scope ?? '', to: callee, line: (node.startPosition.row as number) + 1 });
      }
    }
    return;
  }

  for (const child of node.namedChildren as SNode[]) {
    walkCSharp(child, ext, content, scope, insideClass);
  }
}

// ─── C++ ─────────────────────────────────────────────────────────────────────

function walkCpp(
  node: SNode,
  ext: Extraction,
  content: string,
  scope: string | null,
  insideClass: boolean,
): void {
  const t: string = node.type;

  if (t === 'class_specifier' || t === 'struct_specifier') {
    const name = nameFromField(node, 'name');
    if (name) {
      ext.symbols.push(makeSymbol(name, 'class', node, content));
      const body: SNode | null = node.childForFieldName('body');
      if (body) walkCpp(body, ext, content, name, true);
    }
    return;
  }

  if (t === 'function_definition') {
    const declarator: SNode | null = node.childForFieldName('declarator');
    if (declarator) {
      const fnDecl: SNode =
        declarator.type === 'pointer_declarator'
          ? (declarator.namedChildren as SNode[])[0]
          : declarator;
      const raw: string | undefined =
        fnDecl?.type === 'function_declarator'
          ? (fnDecl.childForFieldName('declarator')?.text as string | undefined)
          : (fnDecl?.text as string | undefined);
      if (raw) {
        const name = raw.split('::').pop() ?? raw;
        ext.symbols.push(makeSymbol(name, insideClass ? 'method' : 'function', node, content));
        const body: SNode | null = node.childForFieldName('body');
        if (body) walkCpp(body, ext, content, name, insideClass);
      }
    }
    return;
  }

  if (t === 'preproc_include') {
    const p: SNode | null = node.childForFieldName('path') ?? (node.namedChildren as SNode[])[0];
    if (p) ext.imports.push((p.text as string).replace(/^[<"']|[>"']$/g, ''));
    return;
  }

  if (t === 'call_expression') {
    const fn: SNode | null = node.childForFieldName('function');
    if (fn) {
      const raw: string = fn.text as string;
      const callee: string =
        fn.type === 'field_expression'
          ? ((fn.childForFieldName('field')?.text as string | undefined) ?? raw)
          : (raw.split('::').pop() ?? raw);
      if (callee.length > 1 && /^[a-zA-Z_]/.test(callee)) {
        ext.calls.push({ from: scope ?? '', to: callee, line: (node.startPosition.row as number) + 1 });
      }
    }
    return;
  }

  for (const child of node.namedChildren as SNode[]) {
    walkCpp(child, ext, content, scope, insideClass);
  }
}

// ─── PHP ─────────────────────────────────────────────────────────────────────

function walkPhp(
  node: SNode,
  ext: Extraction,
  content: string,
  scope: string | null,
  insideClass: boolean,
): void {
  const t: string = node.type;

  if (t === 'class_declaration') {
    const name = nameFromField(node, 'name');
    if (name) {
      ext.symbols.push(makeSymbol(name, 'class', node, content));
      const body: SNode | null = node.childForFieldName('body');
      if (body) walkPhp(body, ext, content, name, true);
    }
    return;
  }

  if (t === 'interface_declaration') {
    const name = nameFromField(node, 'name');
    if (name) {
      ext.symbols.push(makeSymbol(name, 'interface', node, content));
      const body: SNode | null = node.childForFieldName('body');
      if (body) walkPhp(body, ext, content, name, true);
    }
    return;
  }

  if (t === 'function_definition' || t === 'method_declaration') {
    const name = nameFromField(node, 'name');
    if (name) {
      const params: string = (node.childForFieldName('parameters')?.text as string | undefined) ?? '';
      ext.symbols.push(makeSymbol(name, insideClass ? 'method' : 'function', node, content, `${name}${params}`));
      const body: SNode | null = node.childForFieldName('body');
      if (body) walkPhp(body, ext, content, name, insideClass);
    }
    return;
  }

  if (t === 'namespace_use_declaration') {
    const clause: SNode | undefined = (node.namedChildren as SNode[]).find(
      (c: SNode) => c.type === 'namespace_use_clause',
    );
    if (clause) {
      const name: SNode | undefined = (clause.namedChildren as SNode[])[0];
      if (name) ext.imports.push(name.text as string);
    }
    return;
  }

  if (
    t === 'require_expression' || t === 'include_expression' ||
    t === 'require_once_expression' || t === 'include_once_expression'
  ) {
    const p: SNode | undefined = (node.namedChildren as SNode[])[0];
    if (p) ext.imports.push((p.text as string).replace(/^['"]|['"]$/g, ''));
    return;
  }

  if (t === 'function_call_expression' || t === 'member_call_expression') {
    const fn: SNode | null = node.childForFieldName('name') ?? node.childForFieldName('function');
    if (fn) {
      const callee: string = fn.text as string;
      if (callee.length > 1 && /^[a-zA-Z_]/.test(callee)) {
        ext.calls.push({ from: scope ?? '', to: callee, line: (node.startPosition.row as number) + 1 });
      }
    }
    return;
  }

  for (const child of node.namedChildren as SNode[]) {
    walkPhp(child, ext, content, scope, insideClass);
  }
}

// ─── Ruby ─────────────────────────────────────────────────────────────────────

function walkRuby(
  node: SNode,
  ext: Extraction,
  content: string,
  scope: string | null,
  insideClass: boolean,
): void {
  const t: string = node.type;

  if (t === 'class') {
    const name: SNode | undefined = (node.namedChildren as SNode[]).find(
      (c: SNode) => c.type === 'constant',
    );
    if (name) {
      ext.symbols.push(makeSymbol(name.text as string, 'class', node, content));
      for (const child of node.namedChildren as SNode[]) {
        walkRuby(child, ext, content, name.text as string, true);
      }
    }
    return;
  }

  if (t === 'module') {
    const name: SNode | undefined = (node.namedChildren as SNode[]).find(
      (c: SNode) => c.type === 'constant' || c.type === 'scope_resolution',
    );
    if (name) {
      ext.symbols.push(makeSymbol(name.text as string, 'module', node, content));
      for (const child of node.namedChildren as SNode[]) {
        walkRuby(child, ext, content, name.text as string, false);
      }
    }
    return;
  }

  if (t === 'method' || t === 'singleton_method') {
    const name = nameFromField(node, 'name');
    if (name) {
      const params: string = (node.childForFieldName('parameters')?.text as string | undefined) ?? '';
      ext.symbols.push(makeSymbol(name, insideClass ? 'method' : 'function', node, content, `${name}${params}`));
      const body: SNode | undefined = (node.namedChildren as SNode[]).find(
        (c: SNode) => c.type === 'body_statement',
      );
      if (body) walkRuby(body, ext, content, name, insideClass);
    }
    return;
  }

  if (t === 'call') {
    const method: SNode | null = node.childForFieldName('method');
    if (method) {
      const callee: string = method.text as string;
      if (callee.length > 1 && /^[a-zA-Z_]/.test(callee)) {
        ext.calls.push({ from: scope ?? '', to: callee, line: (node.startPosition.row as number) + 1 });
      }
    }
    const args: SNode | null = node.childForFieldName('arguments');
    if (args) {
      for (const child of args.namedChildren as SNode[]) {
        walkRuby(child, ext, content, scope, insideClass);
      }
    }
    return;
  }

  for (const child of node.namedChildren as SNode[]) {
    walkRuby(child, ext, content, scope, insideClass);
  }
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────

function walkRoot(root: SNode, ext: Extraction, content: string, langKey: string): void {
  switch (langKey) {
    case 'typescript':
    case 'tsx':
    case 'javascript':
      for (const child of root.namedChildren as SNode[]) {
        walkJsTs(child, ext, content, null, false);
      }
      break;
    case 'python':
      for (const child of root.namedChildren as SNode[]) {
        walkPython(child, ext, content, null, false);
      }
      break;
    case 'go':
      for (const child of root.namedChildren as SNode[]) {
        walkGo(child, ext, content, null);
      }
      break;
    case 'rust':
      for (const child of root.namedChildren as SNode[]) {
        walkRust(child, ext, content, null, false);
      }
      break;
    case 'java':
      for (const child of root.namedChildren as SNode[]) {
        walkJava(child, ext, content, null, false);
      }
      break;
    case 'csharp':
      for (const child of root.namedChildren as SNode[]) {
        walkCSharp(child, ext, content, null, false);
      }
      break;
    case 'cpp':
      for (const child of root.namedChildren as SNode[]) {
        walkCpp(child, ext, content, null, false);
      }
      break;
    case 'php':
      for (const child of root.namedChildren as SNode[]) {
        walkPhp(child, ext, content, null, false);
      }
      break;
    case 'ruby':
      for (const child of root.namedChildren as SNode[]) {
        walkRuby(child, ext, content, null, false);
      }
      break;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function parseWithTreeSitter(filePath: string, content: string): ParseResult | null {
  const langKey = getLangKey(filePath);
  if (!langKey) return null;

  const grammar = loadGrammar(langKey);
  if (!grammar) return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parser = getParser() as any;
    parser.setLanguage(grammar);
    const tree = parser.parse(content);

    const ext: Extraction = { symbols: [], imports: [], calls: [] };
    walkRoot(tree.rootNode as SNode, ext, content, langKey);

    return {
      symbols: ext.symbols,
      imports: [...new Set(ext.imports)],
      calls: ext.calls,
    };
  } catch {
    return null;
  }
}
