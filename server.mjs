import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'public');
const PORT = Number(process.env.PORT || process.argv.find((a) => a.startsWith('--port='))?.split('=')[1] || 5173);
const HOST = process.env.HOST || '0.0.0.0';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8',
};
const COMPRESSIBLE = new Set(['.html', '.js', '.mjs', '.css', '.json', '.svg', '.txt']);
const gzipCache = new Map();

async function readFileSafe(p) {
  const stat = await fsp.stat(p);
  if (!stat.isFile()) throw new Error('not a file');
  return { buf: await fsp.readFile(p), mtime: stat.mtimeMs, size: stat.size };
}

const server = http.createServer(async (req, res) => {
  const started = Date.now();
  let urlPath;
  try { urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400).end('Bad request'); return; }

  if (urlPath.includes('\0')) { res.writeHead(400).end('Bad request'); return; }
  const rel = path.normalize(urlPath).replace(/^(\.\.[/\\])+/, '').replace(/^[/\\]+/, '');
  let file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT)) { res.writeHead(403).end('Forbidden'); return; }

  try {
    let stat = await fsp.stat(file).catch(() => null);
    if (stat?.isDirectory()) { file = path.join(file, 'index.html'); stat = await fsp.stat(file).catch(() => null); }
    if (!stat) {
      if (path.extname(rel)) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('404 Not Found'); return; }
      file = path.join(ROOT, 'index.html');
    }
    const ext = path.extname(file).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    const { buf, mtime } = await readFileSafe(file);
    const etag = `W/"${mtime.toString(36)}-${buf.length.toString(36)}"`;
    const headers = {
      'content-type': type,
      etag,
      'cache-control': ext === '.html' ? 'no-cache' : rel.startsWith('data/') ? 'public, max-age=60' : 'public, max-age=86400',
      'x-content-type-options': 'nosniff',
    };
    if (req.headers['if-none-match'] === etag) { res.writeHead(304, headers).end(); return; }

    let body = buf;
    const ae = String(req.headers['accept-encoding'] || '');
    if (COMPRESSIBLE.has(ext) && buf.length > 1024 && /\bgzip\b/.test(ae)) {
      const key = `${file}:${mtime}:${buf.length}`;
      let gz = gzipCache.get(key);
      if (!gz) { gz = zlib.gzipSync(buf, { level: 6 }); gzipCache.set(key, gz); if (gzipCache.size > 120) gzipCache.delete(gzipCache.keys().next().value); }
      body = gz;
      headers['content-encoding'] = 'gzip';
      headers.vary = 'Accept-Encoding';
    }
    headers['content-length'] = body.length;
    res.writeHead(200, headers);
    res.end(req.method === 'HEAD' ? undefined : body);
    if (!/\.(png|jpg|jpeg|woff2|svg|gif|webp)$/i.test(file)) {
      console.log(`${req.method} ${urlPath} ${((Date.now() - started)).toFixed(0)}ms ${(body.length / 1024).toFixed(0)}KB`);
    }
  } catch (err) {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' }).end(`500 ${err.message}`);
  }
});

server.listen(PORT, HOST, () => {
  const shown = HOST === '0.0.0.0' ? 'localhost' : HOST;
  console.log(`\n  CSView · 面经知识库`);
  console.log(`  ➜  http://${shown}:${PORT}/\n`);
});