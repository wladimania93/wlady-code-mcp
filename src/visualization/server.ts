import * as http from 'http';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { getProjects, getGraph, getSymbolsForFile, getProjectEntryPoints } from './graph-data.js';
import { getVisualizationHtml } from './template.js';

const DEFAULT_PORT = 9750;

function dbPath(): string {
  return path.join(os.homedir(), '.wlady-code-mcp', 'wlady.db');
}

function respond(res: http.ServerResponse, status: number, body: string, ct = 'application/json') {
  res.writeHead(status, { 'Content-Type': ct, 'Access-Control-Allow-Origin': '*' });
  res.end(body);
}

export function startVisualizationServer(port = DEFAULT_PORT): void {
  const envPort = process.env.WLADY_UI_PORT;
  if (envPort === '0') return;
  if (envPort) port = parseInt(envPort, 10) || DEFAULT_PORT;

  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');

    if (url.pathname === '/') {
      respond(res, 200, getVisualizationHtml(), 'text/html; charset=utf-8');
      return;
    }

    if (url.pathname === '/api/projects') {
      try {
        const projects = getProjects(dbPath());
        respond(res, 200, JSON.stringify(projects));
      } catch (err: any) {
        respond(res, 500, JSON.stringify({ error: err.message }));
      }
      return;
    }

    if (url.pathname === '/api/graph') {
      const projectId = url.searchParams.get('projectId');
      if (!projectId) {
        respond(res, 400, JSON.stringify({ error: 'projectId requerido' }));
        return;
      }
      try {
        const graph = getGraph(projectId, dbPath());
        respond(res, 200, JSON.stringify(graph));
      } catch (err: any) {
        respond(res, 500, JSON.stringify({ error: err.message }));
      }
      return;
    }

    if (url.pathname === '/api/file') {
      try {
        let absPath: string;
        const directPath = url.searchParams.get('path');
        if (directPath) {
          absPath = directPath;
        } else {
          const projectId = url.searchParams.get('projectId');
          const relPath = url.searchParams.get('relPath');
          if (!projectId || !relPath) {
            respond(res, 400, JSON.stringify({ error: 'Se requiere path o (projectId + relPath)' }));
            return;
          }
          const projects = getProjects(dbPath());
          const project = projects.find(p => p.id === projectId);
          if (!project) {
            respond(res, 404, JSON.stringify({ error: 'Proyecto no encontrado' }));
            return;
          }
          absPath = path.join(project.path, relPath);
        }
        if (!fs.existsSync(absPath)) {
          respond(res, 404, JSON.stringify({ error: 'Archivo no encontrado: ' + absPath }));
          return;
        }
        const content = fs.readFileSync(absPath, 'utf8');
        respond(res, 200, JSON.stringify({ content, absPath }));
      } catch (err: any) {
        respond(res, 500, JSON.stringify({ error: err.message }));
      }
      return;
    }

    if (url.pathname === '/api/symbols') {
      const projectId = url.searchParams.get('projectId');
      const relPath = url.searchParams.get('relPath');
      if (!projectId || !relPath) {
        respond(res, 400, JSON.stringify({ error: 'projectId y relPath requeridos' }));
        return;
      }
      try {
        const symbols = getSymbolsForFile(projectId, relPath, dbPath());
        respond(res, 200, JSON.stringify(symbols));
      } catch (err: any) {
        respond(res, 500, JSON.stringify({ error: err.message }));
      }
      return;
    }

    if (url.pathname === '/api/entry-points') {
      const projectId = url.searchParams.get('projectId');
      if (!projectId) {
        respond(res, 400, JSON.stringify({ error: 'projectId requerido' }));
        return;
      }
      try {
        const entryPoints = getProjectEntryPoints(projectId, dbPath());
        respond(res, 200, JSON.stringify(entryPoints));
      } catch (err: any) {
        respond(res, 500, JSON.stringify({ error: err.message }));
      }
      return;
    }

    respond(res, 404, JSON.stringify({ error: 'Not found' }));
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      process.stderr.write(`[wlady-ui] puerto ${port} ocupado, UI no disponible\n`);
    } else {
      process.stderr.write(`[wlady-ui] error: ${err.message}\n`);
    }
  });

  server.listen(port, '127.0.0.1', () => {
    process.stderr.write(`[wlady-ui] Graph UI en http://localhost:${port}\n`);
  });
}
