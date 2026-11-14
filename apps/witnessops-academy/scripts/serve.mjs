import { createServer } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
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

/** Local preview server; only the public/static build directory is exposed. */
export function createAcademyServer(root) {
  const rootPath = resolve(fileURLToPath(root));
  return createServer(async (request, response) => {
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
    try {
      let path = resolve(rootPath, `.${pathname}`);
      if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
      const actual = await realpath(path);
      const actualRoot = await realpath(rootPath);
      if (!actual.startsWith(actualRoot + sep) || !types[extname(actual)]) {
        response.writeHead(404).end('Not found');
        return;
      }
      const body = await readFile(actual);
      response.setHeader('Content-Type', types[extname(actual)]);
      response.setHeader('Content-Length', body.byteLength);
      response.writeHead(200).end(request.method === 'HEAD' ? undefined : body);
    } catch (error) {
      response.writeHead(['ENOENT', 'ENOTDIR', 'EISDIR', 'EACCES'].includes(error.code) ? 404 : 500).end('Not found');
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = new URL(process.argv.includes('--production') ? '../dist/' : '../public/', import.meta.url);
  const port = 3003;
  createAcademyServer(root).listen(port, '127.0.0.1', () => {
    console.log(`WitnessOps Academy: http://127.0.0.1:${port}`);
  });
}
