import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(import.meta.dirname, '..', 'dist');
const BASE = '/csview-local';
const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.svg':'image/svg+xml', '.woff2':'font/woff2', '.png':'image/png', '.jpg':'image/jpeg' };
http.createServer((req,res)=>{
  let p = decodeURIComponent(new URL(req.url,'http://x').pathname);
  if (p === '/' || p === BASE) { res.writeHead(302,{location:BASE+'/'}); res.end(); return; }
  if (!p.startsWith(BASE+'/')) { res.writeHead(404).end('outside base'); return; }
  const rel = p.slice(BASE.length+1) || 'index.html';
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404).end('404'); return; }
  res.writeHead(200,{'content-type':MIME[path.extname(file)]||'application/octet-stream'});
  fs.createReadStream(file).pipe(res);
}).listen(5199, ()=>console.log('dist preview → http://localhost:5199'+BASE+'/'));
