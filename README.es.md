<div align="center">

# WLADY_CODE MCP

**Inteligencia avanzada de codebases para asistentes de IA**

[![Version](https://img.shields.io/badge/version-0.1.0-blue?style=flat-square)](package.json)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen?style=flat-square&logo=node.js)](https://nodejs.org)
[![MCP](https://img.shields.io/badge/MCP-compatible-purple?style=flat-square)](https://modelcontextprotocol.io)
[![License](https://img.shields.io/badge/license-MIT-orange?style=flat-square)](LICENSE)

🌐 [English](README.md) · **Español**

*Un servidor MCP que convierte cualquier codebase en un grafo de conocimiento consultable — y lo renderiza como una galaxia interactiva.*

</div>

---

## ¿Qué es?

WLADY_CODE indexa tu proyecto, construye un grafo de dependencias y expone **25 herramientas MCP** que cualquier asistente de IA compatible (Claude, Cursor, etc.) puede usar para navegar, analizar y razonar sobre el código con precisión quirúrgica.

Además levanta una **visualización 3D estilo galaxia** en `http://localhost:9750` donde cada archivo es una estrella y cada dependencia es una arista nebulosa luminosa.

```
┌──────────────────────────────────────────────────────────────┐
│                      WLADY_CODE MCP                          │
│                                                              │
│  ┌─────────────┐   ┌────────────────┐   ┌────────────────┐  │
│  │   Indexer   │──▶│   SQLite DB    │◀──│  25 herram.    │  │
│  │ (Parser +   │   │ ~/.wlady-code  │   │                │  │
│  │   Grafo)    │   │   -mcp/        │   │ navegación     │  │
│  └─────────────┘   │   wlady.db     │   │ impacto        │  │
│                    └────────────────┘   │ análisis       │  │
│  ┌──────────────────────────────────┐   │ arquitectura   │  │
│  │  Galaxy UI  ·  localhost:9750    │   │ búsqueda · adr │  │
│  └──────────────────────────────────┘   └────────────────┘  │
└──────────────────────────────────────────────────────────────┘
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

### Referencia de herramientas MCP

<details>
<summary><strong>Indexación</strong> (4 herramientas)</summary>

| Herramienta | Descripción |
|---|---|
| `index_repository` | Indexa un proyecto completo o actualiza incrementalmente |
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
| `search_code` | Búsqueda semántica BM25 |
| `search_graph` | Búsqueda en el grafo de dependencias |
| `query_graph` | Consulta directa al grafo con filtros |
| `brief` | Resumen breve de un archivo o módulo |

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

**Solo Linux** — `better-sqlite3` compila bindings nativos durante la instalación, necesitas las build tools:
```bash
# Debian / Ubuntu
sudo apt install python3 make g++

# Fedora / RHEL
sudo dnf install python3 make gcc-c++

# Arch
sudo pacman -S python make gcc
```

### Compilar

```bash
git clone https://github.com/wladimania93/wlady-code-mcp
cd wlady-code-mcp
npm install
npm run build
```

### Registrar en Claude Desktop

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
index_repository(
  project_path: "/ruta/a/mi-proyecto",
  project_id: "mi-proyecto",
  project_name: "Mi Proyecto"
)
```

La visualización abre automáticamente en `http://localhost:9750`.

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
│   ├── db/                   # Capa de acceso SQLite + esquema
│   ├── parser/               # Parsers por lenguaje
│   ├── indexer/              # Orquestador de indexado + actualizaciones incrementales
│   ├── graph/                # BFS, DFS, rutas mínimas, detección de ciclos
│   ├── search/               # Motor de búsqueda BM25
│   ├── analysis/             # Métricas de complejidad + clasificador de roles
│   ├── git/                  # Integración con git (diff, comparación de ramas)
│   ├── tools/                # Los 25 handlers de herramientas MCP
│   └── visualization/
│       ├── graph-data.ts     # Queries SQLite → datos del grafo
│       ├── server.ts         # Servidor HTTP :9750 + endpoint /api/file
│       └── template.ts       # UI autocontenida (HTML + CSS + JS, ~34 KB)
└── dist/                     # Compilado (ejecutar después de npm run build)
```

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Runtime | Node.js 18+ · ES Modules |
| MCP | `@modelcontextprotocol/sdk` |
| Base de datos | `better-sqlite3` (embebida, síncrona) |
| Git | `simple-git` |
| Watch de archivos | `chokidar` |
| Visualización | Canvas 2D · Prism.js (CDN) |
| Servidor HTTP | `http` nativo de Node.js (sin Express) |

---

## Inspiración y créditos

WLADY_CODE nació de combinar lo mejor de dos proyectos excepcionales:

### [codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp)

La **filosofía de visualización**: representar el codebase como una galaxia donde la importancia de un archivo se expresa con su tipo estelar, y la densidad de dependencias crea nebulosas luminosas mediante mezcla aditiva de colores. El sistema de colores espectrales O/B/A/F/G/K/M y la arquitectura del grafo 3D están directamente inspirados en su implementación con React + Three.js + Bloom. Nuestra versión lo reimplementa con Canvas 2D nativo, eliminando dependencias de build y sirviendo una UI autocontenida desde el propio proceso MCP.

### [ops-codegraph-tool](https://github.com/optave/ops-codegraph-tool)

La **filosofía de análisis**: tratar el codebase como un grafo de conocimiento consultable, con herramientas especializadas para navegación (dónde está X, qué llama a Y), análisis de impacto (si cambio Z, qué se rompe) y auditoría de calidad (dead code, complejidad, dependencias circulares). La estructura modular de handlers por categoría y la integración en tiempo real con git vienen de esta influencia.

**La síntesis:** un MCP que *ve el código como un grafo* (codegraph) y lo *muestra como una galaxia* (codebase-memory) — todo en un único servidor sin dependencias externas de runtime.

---

<div align="center">

*WLADY_CODE v0.1.0 · Construido con Node.js · Potenciado por MCP*

</div>
