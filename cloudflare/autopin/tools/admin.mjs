// Command line for the admin address of the Pinterest job (autopin/routes.js). The key is read from the environment
// (AUTOPIN_ADMIN_KEY) or from the file .env.autopin in the repository root (not committed); it is never printed.
//
//   node cloudflare/autopin/tools/admin.mjs status        flags, today's counters against the free allowances, the site's Ledger counters (images, free pages, OpenAI spend), last runs and errors
//   node cloudflare/autopin/tools/admin.mjs pause         KILL SWITCH: no more pages are drawn and the feed stops showing new items
//   node cloudflare/autopin/tools/admin.mjs resume        undo pause
//   node cloudflare/autopin/tools/admin.mjs seeds-off     the 30 Halloween seeds leave the feed (use when they were uploaded from the CSV)
//   node cloudflare/autopin/tools/admin.mjs seeds-on      the seeds come back
//   node cloudflare/autopin/tools/admin.mjs run           draw one page now (still held by the daily caps)
//   node cloudflare/autopin/tools/admin.mjs selftest      judge, draw and encode a sample page inside the object (no model call, nothing stored)
//   node cloudflare/autopin/tools/admin.mjs review [n]    download the n newest pages (default 12, released or not) as thumbnails and a contact sheet
//                                                          in autopin-review/ (the pages are released at 13, 16, 19 and 22 UTC, hours after they are drawn)
//   node cloudflare/autopin/tools/admin.mjs hide <slug>   take a page out of the feed, the hub and the sitemap (404 on its address)
//   node cloudflare/autopin/tools/admin.mjs unhide <slug>
//
// AUTOPIN_BASE overrides the site address (default https://www.coloringpagemaker.app).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..', '..', '..');
const base = (process.env.AUTOPIN_BASE || 'https://www.coloringpagemaker.app').replace(/\/+$/, '');

function readKey() {
  if (process.env.AUTOPIN_ADMIN_KEY) return process.env.AUTOPIN_ADMIN_KEY.trim();
  const file = path.join(repo, '.env.autopin');
  if (!fs.existsSync(file)) return '';
  const m = /^AUTOPIN_ADMIN_KEY=(.+)$/m.exec(fs.readFileSync(file, 'utf8'));
  return m ? m[1].trim() : '';
}

const [cmd, arg] = process.argv.slice(2);

// Thumbnails of the newest pages and one contact sheet, to look at before a page is released into the feed.
async function review(n) {
  const { decodeGrayPng } = await import('../art.js');
  const { encodePngGray, resizeGray } = await import('../raster.js');
  const get = p => fetch(base + p, { headers: { Authorization: 'Bearer ' + key } });
  const st = await (await get('/pins/admin/status')).json();
  const pages = (st.recentPages || []).slice(0, n);
  const out = path.join(process.cwd(), 'autopin-review');
  fs.mkdirSync(out, { recursive: true });
  const cell = 240, gap = 8, cols = 4, rows = Math.max(1, Math.ceil(pages.length / cols));
  const W = cols * cell + (cols + 1) * gap, H = rows * cell + (rows + 1) * gap;
  const sheet = new Uint8Array(W * H).fill(200);
  let i = 0;
  for (const p of pages) {
    const r = await get('/pins/admin/image/' + p.slug + '/thumb');
    if (!r.ok) { console.log('no image for', p.slug); i++; continue; }
    const buf = Buffer.from(await r.arrayBuffer());
    fs.writeFileSync(path.join(out, p.slug + '-400.png'), buf);
    const img = decodeGrayPng(buf);
    const small = resizeGray(img.L, img.w, img.h, cell, cell);
    const x0 = gap + (i % cols) * (cell + gap), y0 = gap + Math.floor(i / cols) * (cell + gap);
    for (let y = 0; y < cell; y++) sheet.set(small.subarray(y * cell, (y + 1) * cell), (y0 + y) * W + x0);
    console.log(String(i + 1).padStart(2), p.released ? 'released ' : 'WAITING  ', p.release.slice(0, 16).replace('T', ' '), p.hidden ? 'HIDDEN ' : '       ', p.level.padEnd(8), p.slug);
    i++;
  }
  fs.writeFileSync(path.join(out, 'review-sheet.png'), encodePngGray(sheet, W, H, { depth: 8, level: 9 }));
  console.log('contact sheet:', path.join(out, 'review-sheet.png'), '(numbers above = left to right, top to bottom)');
  console.log('to take a page out: node cloudflare/autopin/tools/admin.mjs hide <slug>');
}
const key = readKey();
if (!cmd || !key) {
  console.error(cmd ? 'No key: set AUTOPIN_ADMIN_KEY or put AUTOPIN_ADMIN_KEY=... in .env.autopin' : 'usage: node admin.mjs status|pause|resume|seeds-on|seeds-off|run|selftest|review [n]|hide <slug>|unhide <slug>');
  process.exit(2);
}
const routes = {
  status: ['GET', '/pins/admin/status'],
  pause: ['POST', '/pins/admin/pause'],
  resume: ['POST', '/pins/admin/resume'],
  'seeds-off': ['POST', '/pins/admin/seeds?on=0'],
  'seeds-on': ['POST', '/pins/admin/seeds?on=1'],
  run: ['POST', '/pins/admin/run'],
  selftest: ['POST', '/pins/admin/selftest'],
  hide: ['POST', '/pins/admin/hide?on=1&slug=' + encodeURIComponent(arg || '')],
  unhide: ['POST', '/pins/admin/hide?on=0&slug=' + encodeURIComponent(arg || '')]
};
if (cmd === 'review') { await review(Number(arg) || 12); process.exit(0); }
const route = routes[cmd];
if (!route || ((cmd === 'hide' || cmd === 'unhide') && !arg)) { console.error('unknown command or missing slug'); process.exit(2); }
const res = await fetch(base + route[1], { method: route[0], headers: { Authorization: 'Bearer ' + key } });
const text = await res.text();
let out = text;
try { out = JSON.stringify(JSON.parse(text), null, 1); } catch { /* not JSON */ }
console.log(res.status, out);
process.exit(res.ok ? 0 : 1);
