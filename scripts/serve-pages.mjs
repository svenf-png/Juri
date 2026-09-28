// Lokaler Server, der sich wie GitHub Pages verhält: dist/ liegt unter /Juri/,
// unbekannte Pfade liefern /Juri/404.html mit Status 404. Für E2E-Tests und `npm run serve`.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const args = process.argv.slice(2);
const portArg = args.indexOf('--port');
const port = Number(portArg >= 0 ? args[portArg + 1] : (process.env.PORT ?? 4173));
const root = resolve('dist');
const prefix = '/Juri/';

const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

function send(res, status, file) {
  res.writeHead(status, {
    'Content-Type': types[extname(file)] ?? 'application/octet-stream',
    'Cache-Control': 'no-cache',
  });
  createReadStream(file).pipe(res);
}

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const notFound = join(root, '404.html');
  if (!url.pathname.startsWith(prefix)) {
    res.writeHead(url.pathname === '/Juri' ? 301 : 404, { Location: prefix });
    res.end();
    return;
  }
  const relative = normalize(decodeURIComponent(url.pathname.slice(prefix.length)));
  if (relative.startsWith('..')) {
    res.writeHead(400);
    res.end();
    return;
  }
  let file = join(root, relative);
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (existsSync(file) && statSync(file).isFile()) send(res, 200, file);
  else if (existsSync(notFound)) send(res, 404, notFound);
  else {
    res.writeHead(404);
    res.end('404');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Juri läuft unter http://127.0.0.1:${port}${prefix}`);
});
