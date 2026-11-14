import { createServer } from 'node:http';
import { readFile, readdir, realpath } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

/** Snapshot supported public files before accepting requests. Never follow symlinks. */
export async function preloadRoutes(root) {
  const routes = new Map();
  const rootPath = await realpath(fileURLToPath(root));
  async function visit(directory, prefix = '') {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.isSymbolicLink()) continue;
      const path = join(directory, entry.name);
      const route = `${prefix}/${entry.name}`;
      if (entry.isDirectory()) {
        await visit(path, route);
      } else if (entry.isFile() && types[extname(entry.name)]) {
        const resource = { body: await readFile(path), type: types[extname(entry.name)] };
        routes.set(route, resource);
        if (entry.name === 'index.html') {
          const directoryRoute = route.slice(0, -'index.html'.length);
          routes.set(directoryRoute, resource);
          if (directoryRoute !== '/') routes.set(directoryRoute.slice(0, -1), resource);
        }
      }
    }
  }
  await visit(rootPath);
  return routes;
}

/** Local preview server; requests only look up preloaded public/static bytes. */
export async function createAcademyServer(root) {
  const routes = await preloadRoutes(root);
  return createServer((request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; font-src 'self'; connect-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'");
    response.setHeader('Cache-Control', 'no-store');
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.setHeader('Allow', 'GET, HEAD');
      response.writeHead(405).end('Method not allowed');
      return;
    }
    let pathname;
    try {
      pathname = decodeURIComponent((request.url ?? '/').split('?')[0]);
    } catch {
      response.writeHead(400).end('Invalid path');
      return;
    }
    if (!pathname.startsWith('/') || pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').some(part => part.startsWith('.'))) {
      response.writeHead(404).end('Not found');
      return;
    }
    const resource = routes.get(pathname);
    if (!resource) {
      response.writeHead(404).end('Not found');
      return;
    }
    response.setHeader('Content-Type', resource.type);
    response.setHeader('Content-Length', resource.body.byteLength);
    response.writeHead(200).end(request.method === 'HEAD' ? undefined : resource.body);
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = new URL(process.argv.includes('--production') ? '../dist/' : '../public/', import.meta.url);
  const port = 3003;
  const server = await createAcademyServer(root);
  server.listen(port, '127.0.0.1', () => {
    console.log(`WitnessOps Academy: http://127.0.0.1:${port}`);
  });
}
