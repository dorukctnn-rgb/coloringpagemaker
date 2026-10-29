// URL check for the move: every page, file, redirect and 404 of the live site against a new host.
//
//   node cloudflare/check-site.mjs                      -> cloudflare/dist against the live site (no new host)
//   node cloudflare/check-site.mjs https://<new host>   -> the new host against dist and the live site
//
// Pages, sitemap.xml, robots.txt and every public file must answer 200 with the same bytes on both hosts.
// Redirects and 404s must answer with the same status and Location. Exits 1 on any difference.
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(here, 'dist');
const LIVE = (process.env.LIVE_BASE || 'https://www.coloringpagemaker.app').replace(/\/+$/, '');
const base = (process.argv[2] || '').replace(/\/+$/, '');
const manifest = JSON.parse(fs.readFileSync(path.join(here, 'dist-manifest.json'), 'utf8'));
const sha = buf => createHash('sha256').update(buf).digest('hex');

async function get(url, method = 'GET') {
  for (let attempt = 0; ; attempt++) {
    try {
      const r = await fetch(url, { method, redirect: 'manual', headers: { 'User-Agent': 'cpm-move-check/1' } });
      const body = Buffer.from(await r.arrayBuffer());
      return { status: r.status, location: r.headers.get('location'), type: r.headers.get('content-type'), body, hash: sha(body) };
    } catch (e) {
      if (attempt >= 2) return { status: 0, error: e.message, body: Buffer.alloc(0), hash: '' };
      await new Promise(res => setTimeout(res, 500 * (attempt + 1)));
    }
  }
}
async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; await fn(items[k]); } }));
}

const problems = [];
const stats = { pages: 0, files: 0, redirects: 0 };

// 1. Pages and the generated files: dist bytes = live bytes (= new host bytes).
const pageList = [...Object.entries(manifest.pages), ...Object.entries(manifest.files).filter(([p]) => p.startsWith('/'))];
await pool(pageList, 6, async ([p, m]) => {
  const live = await get(LIVE + p);
  if (live.status !== 200 || live.hash !== m.sha256) problems.push(`live ${p}: ${live.status} ${live.hash === m.sha256 ? 'same' : 'DIFFERENT'} bytes`);
  if (base) {
    const nw = await get(base + p);
    if (nw.status !== 200 || nw.hash !== m.sha256) problems.push(`new ${p}: ${nw.status} ${nw.hash === m.sha256 ? 'same' : 'DIFFERENT'} bytes`);
    if (nw.status === 200 && live.type && nw.type && live.type.split(';')[0] !== nw.type.split(';')[0]) problems.push(`new ${p}: content-type ${nw.type} (live ${live.type})`);
  }
  stats.pages++;
});

// 2. Every public file (images, fonts, styles): same bytes on both hosts.
const pageFiles = new Set([...Object.values(manifest.pages).map(m => m.file), ...Object.values(manifest.files).map(m => m.file), '_headers']);
const files = [];
(function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) { walk(full); continue; }
    const rel = path.relative(dist, full).split(path.sep).join('/');
    if (!pageFiles.has(rel)) files.push(rel);
  }
})(dist);
await pool(files, 8, async rel => {
  const want = sha(fs.readFileSync(path.join(dist, rel)));
  const urlPath = '/' + rel.split('/').map(encodeURIComponent).join('/');
  const live = await get(LIVE + urlPath);
  if (live.status !== 200 || live.hash !== want) problems.push(`live /${rel}: ${live.status} ${live.hash === want ? 'same' : 'DIFFERENT'} bytes`);
  if (base) {
    const nw = await get(base + urlPath);
    if (nw.status !== 200 || nw.hash !== want) problems.push(`new /${rel}: ${nw.status} ${nw.hash === want ? 'same' : 'DIFFERENT'} bytes`);
  }
  stats.files++;
});

// 3. Redirects, case rules and 404s: same status and Location as the live site.
const CASES = [
  '/privacy/?a=1', '/blog/', '/dragon-coloring-pages/?utm_source=pinterest&utm_medium=pin', '/pokemon-coloring-pages',
  '/pokemon-coloring-pages/', '/cartoon-character-coloring-pages', '/generate', '/download-pdf', '/gumroad-webhook',
  '/verify-pro', '/Privacy', '/BLOG', '/Terms', '/Sitemap.xml', '/ROBOTS.TXT', '/nope', '/Dragon-Coloring-Pages',
  '/privacy.html', '/index.html', '/404', '/pro-signout', '/examples/does-not-exist.png'
];
const nf = manifest.files['404'] && manifest.files['404'].sha256;
await pool(CASES, 4, async p => {
  const live = await get(LIVE + p);
  if (!base) { stats.redirects++; return; }
  const nw = await get(base + p);
  const liveLoc = live.location ? live.location.replace(LIVE, '') : null;
  const newLoc = nw.location ? nw.location.replace(base, '') : null;
  if (live.status !== nw.status || liveLoc !== newLoc) problems.push(`case ${p}: new ${nw.status} ${newLoc || ''} / live ${live.status} ${liveLoc || ''}`);
  else if (live.status === 200 && live.hash !== nw.hash) problems.push(`case ${p}: 200 on both, DIFFERENT bytes`);
  else if (live.status === 404 && (live.hash !== nf || nw.hash !== nf)) problems.push(`case ${p}: 404 body differs from 404.html (live ${live.hash === nf}, new ${nw.hash === nf})`);
  stats.redirects++;
});

console.log(JSON.stringify({ base: base || '(dist only)', live: LIVE, builtFrom: manifest.builtFrom, ...stats, problems: problems.length }, null, 0));
for (const p of problems.sort()) console.log('  ' + p);
process.exit(problems.length ? 1 : 0);
