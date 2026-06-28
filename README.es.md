<div align="center">

# WLADY_CODE MCP

**Inteligencia avanzada de codebases para asistentes de IA**

[![Version](https://img.shields.io/badge/version-0.2.0-blue?style=flat-square)](package.json)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen?style=flat-square&logo=node.js)](https://nodejs.org)
[![MCP](https://img.shields.io/badge/MCP-compatible-purple?style=flat-square)](https://modelcontextprotocol.io)
[![License](https://img.shields.io/badge/license-MIT-orange?style=flat-square)](LICENSE)

🌐 [English](README.md) · **Español**

*Un servidor MCP que convierte cualquier codebase en un grafo de conocimiento consultable — y lo renderiza como una galaxia interactiva.*

</div>

---

## ¿Qué es?

WLADY_CODE indexa tu proyecto, construye un grafo de dependencias y expone **27 herramientas MCP** que cualquier asistente de IA compatible (Claude, Cursor, etc.) puede usar para navegar, analizar y razonar sobre el código con precisión quirúrgica.

Además levanta una **visualización 3D estilo galaxia** en `http://localhost:9750` donde cada archivo es una estrella y cada dependencia es una arista nebulosa luminosa.

```
┌──────────────────────────────────────────────────────────────────┐
│                        WLADY_CODE MCP                            │
│                                                                  │
│  ┌──────────────────┐   ┌────────────────┐   ┌────────────────┐  │
│  │     Indexer      │──▶│   SQLite DB    │◀──│ 27 herram. MCP │  │
│  │ Tree-sitter AST  │   │ ~/.wlady-code  │   │                │  │
│  │ + regex fallback │   │   -mcp/        │   │ navegación     │  │
│  └──────────────────┘   │   wlady.db     │   │ impacto        │  │
│                         └──────┬─────────┘   │ análisis       │  │
│  ┌──────────────────────────┐  │             │ arquitectura   │  │
│  │  Galaxy UI · :9750       │  │             │ búsqueda + RRF │  │
│  └──────────────────────────┘  │             │ tracing · adr  │  │
│                                │             └────────────────┘  │
│  ┌─────────────────────────────┴──────────┐                      │
│  │  Embeddings  ·  snowflake-arctic-embed  │                      │
│  │  BM25 + vector → búsqueda híbrida RRF  │                      │
│  └────────────────────────────────────────┘                      │
└──────────────────────────────────────────────────────────────────┘
```

---

## ¿Para qué sirve?

| Pregunta al asistente | Herramienta que responde |
|---|---|
| "¿Dónde está definida la función `X`?" | `where` |
| "Si cambio esta función, ¿qué se rompe?" | `fn_impact` |
| "¿Qué afectará este PR en producción?" | `diff_impact` |
| "¿Hay código muerto, clases dios o deps circulares?" | `audit` |
| "¿Cómo está estructurado este monorepo?" | `get_architecture` |
| "¿Cuál es el camino entre el módulo A y B?" | `path` |
| "Encuentra código que haga algo similar a X" | `search_graph(semantic: true)` |
| "Traza el flujo de ejecución desde main" | `execution_flow` |
| "Muéstrame todos los módulos visualmente" | Galaxy UI en :9750 |

---

## Características

### Visualización Galaxy

La interfaz web integrada usa un **sistema de colores espectrales estelares** — los archivos se colorean como estrellas reales según su conectividad:

| Color | Tipo espectral | Significado |
|---|---|---|
| Azul-blanco | O / B | Hubs muy conectados — el núcleo del sistema |
| Blanco-amarillo | A / F | Conectividad media |
| Ámbar | G / K | Archivos de soporte |
| Rojo | M | Archivos hoja — mínimas dependencias |

Las aristas usan **mezcla aditiva en Canvas 2D** (`globalCompositeOperation: 'lighter'`), haciendo que los clusters de dependencias densas brillen más — el mismo efecto que `AdditiveBlending` de Three.js. Donde convergen muchos imports, aparece una nebulosa.

**Controles:**

| Acción | Efecto |
|---|---|
| Arrastrar | Rotar el grafo |
| Rueda del ratón | Zoom |
| Clic en nodo | Seleccionar + resaltar conexiones directas |
| Doble clic en nodo | Abrir código fuente con syntax highlighting |
| Clic en comunidad | Resaltar todos los archivos de ese módulo |
| Doble clic en vacío | Reanudar auto-rotación |
| `Esc` | Cerrar panel de código |

El panel de código usa **Prism.js** con gramáticas específicas para 18+ lenguajes, e incluye un botón **"Abrir en VS Code"** via el protocolo `vscode://file/`.

### Parser AST — Tree-sitter

La extracción de símbolos está impulsada por **Tree-sitter**, ofreciendo un parse completo basado en AST para 11 lenguajes con fallback automático al parser de expresiones regulares cuando no hay gramática disponible.

| Lenguaje | Parser |
|---|---|
| JavaScript, TypeScript, TSX | Tree-sitter |
| Python, Java, Go, Rust | Tree-sitter |
| C#, C++, PHP, Ruby | Tree-sitter |
| Todos los demás lenguajes soportados | Fallback regex |

### Embeddings Semánticos y Búsqueda Híbrida

`search_graph` soporta un modo de **búsqueda híbrida BM25 + vectores** que encuentra código semánticamente similar incluso cuando no comparte palabras clave con la consulta.

**Cómo funciona:**
1. Cada símbolo se embebe con `snowflake-arctic-embed-xs` (22M parámetros, 384 dims, ~90 MB, corre completamente local via ONNX Runtime)
2. En tiempo de consulta: los ranks BM25 + los ranks de similitud coseno se fusionan via **Reciprocal Rank Fusion (RRF)**
3. Los resultados muestran símbolos semánticamente relacionados con la consulta — no solo los que coinciden léxicamente

Actívalo por proyecto al momento de indexar:
```
index_repository(path: "/mi/proyecto", embeddings: true)
```

Luego busca:
```
search_graph(project_id: "...", query: "validación de token de autenticación", semantic: true)
```

Los embeddings son incrementales — solo los símbolos nuevos o modificados se re-embeben en ejecuciones posteriores.

### Trazado de Flujo de Ejecución

Detecta y visualiza automáticamente cómo se ejecuta tu aplicación desde sus puntos de entrada.

```
list_entry_points(project_id: "...")
```
```
execution_flow(project_id: "...", entry_point: "main", depth: 5)
```

Los puntos de entrada se detectan por: clasificación de rol, patrones de nombre (`main`, `handler`, `router`, `start`, …), convenciones de archivo (`index.ts`, `app.ts`, `server.ts`, …), y patrones de registro de rutas HTTP.

El árbol de llamadas se renderiza en profundidad con **detección de ciclos** (marcador ↩) y referencias archivo:línea en cada nodo.

### Soporte Docker

Ejecuta WLADY_CODE en cualquier entorno sin necesidad de Node.js local:

```bash
# Construir e iniciar
WORKSPACE_PATH=/ruta/a/tu/repo docker compose up

# La Galaxy UI abre en http://localhost:9750
```

O con Docker directo:

```bash
docker build -t wlady-code-mcp .
docker run -i --rm \
  -p 9750:9750 \
  -v wlady-db:/root/.wlady-code-mcp \
  -v /ruta/al/repo:/workspace:ro \
  wlady-code-mcp
```

### Referencia de herramientas MCP

<details>
<summary><strong>Indexación</strong> (4 herramientas)</summary>

| Herramienta | Descripción |
|---|---|
| `index_repository` | Indexa un proyecto completo o actualiza incrementalmente. Pasa `embeddings: true` para generar embeddings semánticos (descarga modelo ~90 MB en la primera ejecución). |
| `list_projects` | Lista todos los proyectos indexados |
| `delete_project` | Elimina un proyecto del índice |
| `detect_changes` | Detecta archivos modificados desde el último índice |

</details>

<details>
<summary><strong>Navegación</strong> (5 herramientas)</summary>

| Herramienta | Descripción |
|---|---|
| `where` | Dónde está definido un símbolo |
| `context` | Contexto completo: definición, llamadores y llamados |
| `path` | Camino más corto entre dos símbolos |
| `trace_path` | Todos los caminos upstream/downstream desde un símbolo |
| `map` | Mapa de módulos y estructura del proyecto |

</details>

<details>
<summary><strong>Búsqueda</strong> (4 herramientas)</summary>

| Herramienta | Descripción |
|---|---|
| `search_code` | Búsqueda de texto tipo grep en todos los archivos fuente |
| `search_graph` | Búsqueda BM25 de símbolos. Pasa `semantic: true` para búsqueda híbrida BM25+vector con RRF (requiere embeddings). |
| `query_graph` | Consulta directa al grafo con filtros (kind, role, complejidad, patrón de archivo) |
| `brief` | Resumen breve de un archivo o módulo |

</details>

<details>
<summary><strong>Trazado de Procesos</strong> (2 herramientas)</summary>

| Herramienta | Descripción |
|---|---|
| `execution_flow` | Traza el árbol de llamadas desde un punto de entrada (o lo detecta automáticamente). BFS limitado en profundidad con detección de ciclos. |
| `list_entry_points` | Detecta puntos de entrada probables: funciones main, handlers HTTP, controladores, routers |

</details>

<details>
<summary><strong>Análisis de impacto</strong> (3 herramientas)</summary>

| Herramienta | Descripción |
|---|---|
| `fn_impact` | Todos los llamadores afectados al modificar una función |
| `diff_impact` | Cambios git actuales → símbolos afectados |
| `branch_compare` | Comparación a nivel de símbolos entre dos ramas |

</details>

<details>
<summary><strong>Calidad y análisis</strong> (4 herramientas)</summary>

| Herramienta | Descripción |
|---|---|
| `audit` | Auditoría completa: dead code, god files, alta complejidad, deps circulares |
| `complexity` | Reporte de complejidad ciclomática y cognitiva por símbolo |
| `roles` | Clasifica símbolos por rol (entry / core / utility / adapter / dead / leaf) |
| `communities` | Detección de comunidades/clusters en el grafo |

</details>

<details>
<summary><strong>Arquitectura</strong> (3 herramientas)</summary>

| Herramienta | Descripción |
|---|---|
| `get_architecture` | Vista de alto nivel: capas, módulos, estadísticas del grafo |
| `manifesto` | Gestiona reglas de calidad (umbrales de complejidad, etc.) |
| `check` | Evalúa el codebase contra las reglas del manifesto (PASS / WARN / FAIL) |

</details>

<details>
<summary><strong>Decisiones de arquitectura (ADR)</strong> (3 herramientas)</summary>

| Herramienta | Descripción |
|---|---|
| `adr_list` | Lista todas las decisiones de arquitectura registradas |
| `adr_create` | Registra una nueva decisión de arquitectura |
| `adr_update` | Actualiza el estado de una decisión existente |

</details>

---

## Lenguajes soportados

> TypeScript · JavaScript · Java · Kotlin · Python · Go · Rust · C · C++ · C# · PHP · Ruby · Swift · Dart · HTML · CSS/SCSS · JSON · YAML · SQL · Bash

---

## Instalación

### Prerrequisitos

- **Node.js 18+**
- Claude Desktop, Cursor u otro cliente MCP compatible

**Linux / macOS** — `better-sqlite3` y `tree-sitter` compilan bindings nativos durante la instalación, necesitas las build tools:
```bash
# Debian / Ubuntu
sudo apt install python3 make g++

# Fedora / RHEL
sudo dnf install python3 make gcc-c++

# Arch
sudo pacman -S python make gcc

# macOS (Xcode CLI tools)
xcode-select --install
```

### Inicio rápido — npx (recomendado)

Sin necesidad de clonar ni compilar. Agrega esto a tu `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "wlady-code": {
      "command": "npx",
      "args": ["-y", "wlady-code-mcp"]
    }
  }
}
```

O via la CLI de Claude Code:

```bash
claude mcp add wlady-code -s user -- npx -y wlady-code-mcp
```

`npx` descarga y ejecuta la versión publicada más reciente automáticamente. No requiere configurar ninguna ruta.

### Compilar desde el código fuente

Solo necesario si quieres contribuir o ejecutar un build local de desarrollo:

```bash
git clone https://github.com/wladimania93/wlady-code-mcp
cd wlady-code-mcp
npm install --legacy-peer-deps   # requerido por compatibilidad de gramáticas tree-sitter
npm run build
```

Luego registra el build local:

```bash
claude mcp add wlady-code -s user -- node "/ruta/absoluta/wlady-code-mcp/dist/index.js"
```

O manualmente en `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "wlady-code": {
      "command": "node",
      "args": ["/ruta/absoluta/wlady-code-mcp/dist/index.js"]
    }
  }
}
```

### Indexar tu primer proyecto

Pídeselo al asistente:

```
Indexa el proyecto en /ruta/a/mi-proyecto con id "mi-proyecto"
```

O usa la herramienta directamente:

```
index_repository(path: "/ruta/a/mi-proyecto", name: "Mi Proyecto")
```

La visualización abre automáticamente en `http://localhost:9750`.

Para habilitar búsqueda semántica:

```
index_repository(path: "/ruta/a/mi-proyecto", embeddings: true)
```

La primera ejecución descarga el modelo `snowflake-arctic-embed-xs` (~90 MB) en `~/.wlady-code-mcp/models/` y lo cachea para todas las ejecuciones futuras.

### Variables de entorno

| Variable | Valor | Efecto |
|---|---|---|
| `WLADY_UI_PORT` | número | Cambia el puerto de la UI (default: `9750`) |
| `WLADY_UI_PORT` | `0` | Desactiva la UI completamente |

---

## Estructura del proyecto

```
wlady-code-mcp/
├── src/
│   ├── index.ts              # Entry point MCP + arranque del servidor UI
│   ├── types.ts              # Tipos compartidos
│   ├── db/                   # Capa de acceso SQLite + esquema (incl. tabla embeddings)
│   ├── parser/
│   │   ├── index.ts          # Orquestador de parsers (tree-sitter → fallback regex)
│   │   ├── tree-sitter.ts    # Parser AST para 11 lenguajes
│   │   └── languages.ts      # Configuraciones de lenguajes para fallback regex
│   ├── embeddings/
│   │   └── embedder.ts       # Singleton snowflake-arctic-embed-xs, embedding por lotes
│   ├── indexer/              # Orquestador de indexado + actualizaciones incrementales + generación de embeddings
│   ├── graph/                # BFS, DFS, rutas mínimas, detección de ciclos
│   ├── search/
│   │   ├── bm25.ts           # Motor de búsqueda BM25 full-text
│   │   └── hybrid.ts         # RRF: fusión BM25 + búsqueda vectorial
│   ├── analysis/
│   │   ├── complexity.ts     # Complejidad ciclomática + cognitiva
│   │   ├── roles.ts          # Clasificador de roles de símbolos
│   │   └── entry-points.ts   # Detección de puntos de entrada (patrones nombre/archivo/cuerpo)
│   ├── git/                  # Integración con git (diff, comparación de ramas)
│   ├── tools/                # Los 27 handlers de herramientas MCP (un archivo por categoría)
│   └── visualization/
│       ├── graph-data.ts     # Queries SQLite → datos del grafo
│       ├── server.ts         # Servidor HTTP :9750 + endpoint /api/file
│       └── template.ts       # UI autocontenida (HTML + CSS + JS, ~34 KB)
├── Dockerfile                # Build multi-stage alpine
├── docker-compose.yml        # Compose con volumen workspace + persistencia DB
└── dist/                     # Compilado (ejecutar después de npm run build)
```

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Runtime | Node.js 18+ · ES Modules |
| MCP | `@modelcontextprotocol/sdk` |
| Base de datos | `better-sqlite3` (embebida, síncrona) |
| Parser AST | `tree-sitter` + 11 gramáticas de lenguajes (MIT) |
| Embeddings | `@huggingface/transformers` · `snowflake-arctic-embed-xs` (Apache-2.0) |
| Git | `simple-git` |
| Watch de archivos | `chokidar` |
| Visualización | Canvas 2D · Prism.js |
| Servidor HTTP | `http` nativo de Node.js (sin Express) |
| Contenedor | Docker · Alpine Linux |

---

## Inspiración y créditos

WLADY_CODE nació de combinar y extender lo mejor de tres proyectos excepcionales:

### [codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp)

La **filosofía de visualización**: representar el codebase como una galaxia donde la importancia de un archivo se expresa con su tipo estelar, y la densidad de dependencias crea nebulosas luminosas mediante mezcla aditiva de colores. El sistema de colores espectrales O/B/A/F/G/K/M y la arquitectura del grafo 3D están directamente inspirados en su implementación con React + Three.js + Bloom. Nuestra versión lo reimplementa con Canvas 2D nativo, eliminando dependencias de build y sirviendo una UI autocontenida desde el propio proceso MCP.

### [ops-codegraph-tool](https://github.com/optave/ops-codegraph-tool)

La **filosofía de análisis**: tratar el codebase como un grafo de conocimiento consultable, con herramientas especializadas para navegación (dónde está X, qué llama a Y), análisis de impacto (si cambio Z, qué se rompe) y auditoría de calidad (dead code, complejidad, dependencias circulares). La estructura modular de handlers por categoría y la integración en tiempo real con git vienen de esta influencia.

### [GitNexus](https://github.com/abhigyanpatwari/GitNexus)

La **filosofía de precisión**: parse a nivel AST con Tree-sitter para extracción exacta de símbolos en múltiples lenguajes, embeddings vectoriales locales para búsqueda semántica de código, y Reciprocal Rank Fusion para combinar rankings por palabras clave y semánticos en un conjunto de resultados de alta calidad. El enfoque de almacenamiento de embeddings, el algoritmo de fusión RRF y los patrones de trazado de puntos de entrada fueron diseñados tomando a GitNexus como referencia de lo que significa inteligencia de código de primer nivel.

**La síntesis:** un MCP que *ve el código como un grafo* (codegraph), lo *muestra como una galaxia* (codebase-memory) y lo *entiende semánticamente* (GitNexus) — todo en un único servidor, licencia MIT, sin servicios externos requeridos.

---

<div align="center">

*WLADY_CODE v0.2.0 · Construido con Node.js · Potenciado por MCP*

</div>
