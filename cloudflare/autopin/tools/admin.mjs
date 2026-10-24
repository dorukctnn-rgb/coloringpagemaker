// Command line for the admin address of the Pinterest job (autopin/routes.js). The key is read from the environment
// (AUTOPIN_ADMIN_KEY) or from the file .env.autopin in the repository root (not committed); it is never printed.
//
//   node cloudflare/autopin/tools/admin.mjs status        flags, today's counters against the free allowances, last runs and errors
//   node cloudflare/autopin/tools/admin.mjs pause         KILL SWITCH: no more pages are drawn and the feed stops showing new items
//   node cloudflare/autopin/tools/admin.mjs resume        undo pause
//   node cloudflare/autopin/tools/admin.mjs seeds-off     the 30 Halloween seeds leave the feed (use when they were uploaded from the CSV)
//   node cloudflare/autopin/tools/admin.mjs seeds-on      the seeds come back
//   node cloudflare/autopin/tools/admin.mjs run           draw one page now (still held by the daily caps)
//   node cloudflare/autopin/tools/admin.mjs selftest      judge, draw and encode a sample page inside the object (no model call, nothing stored)
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
const key = readKey();
if (!cmd || !key) {
  console.error(cmd ? 'No key: set AUTOPIN_ADMIN_KEY or put AUTOPIN_ADMIN_KEY=... in .env.autopin' : 'usage: node admin.mjs status|pause|resume|seeds-on|seeds-off|run|selftest|hide <slug>|unhide <slug>');
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
const route = routes[cmd];
if (!route || ((cmd === 'hide' || cmd === 'unhide') && !arg)) { console.error('unknown command or missing slug'); process.exit(2); }
const res = await fetch(base + route[1], { method: route[0], headers: { Authorization: 'Bearer ' + key } });
const text = await res.text();
let out = text;
try { out = JSON.stringify(JSON.parse(text), null, 1); } catch { /* not JSON */ }
console.log(res.status, out);
process.exit(res.ok ? 0 : 1);
