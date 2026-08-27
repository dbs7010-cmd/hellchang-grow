const http = require('http');
const fs = require('fs');
const path = require('path');
const DIR = __dirname;
const REPO = process.argv[2];
const OUT = path.join(DIR, 'out');
fs.mkdirSync(OUT, { recursive: true });

const types = { '.html': 'text/html; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'POST' && url.pathname === '/save') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const name = url.searchParams.get('name');
      const data = body.startsWith('data:') ? body.slice(body.indexOf(',') + 1) : body;
      const buf = name.endsWith('.json') ? Buffer.from(data, 'utf8') : Buffer.from(data, 'base64');
      fs.writeFileSync(path.join(OUT, name), buf);
      console.log('SAVED', name, buf.length);
      res.writeHead(200); res.end('ok');
    });
    return;
  }
  let file;
  if (url.pathname === '/' ) file = path.join(DIR, 'index.html');
  else if (url.pathname === '/neutral-renderer.svg') file = path.join(OUT, 'neutral-renderer.svg');
  else if (url.pathname === '/layered.svg') file = path.join(REPO, 'assets/characters/danbaek/canon/layered/danbaek_stage0_layered_master.svg');
  else if (url.pathname === '/ref.png') file = path.join(REPO, 'assets/characters/danbaek/canon/reference_v3/levels/danbaek-lv01.png');
  else { res.writeHead(404); res.end(); return; }
  const buf = fs.readFileSync(file);
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  res.end(buf);
}).listen(4599, () => console.log('evidence server on http://localhost:4599'));
