// API smoke test for a deployed Worker (preview, production on workers.dev, or the live host after the cut).
//
//   node cloudflare/smoke.mjs https://<host>             -> PDF, Pro checks, webhook, sign-out, unknown POST
//   node cloudflare/smoke.mjs https://<host> --generate  -> also draws one free page (uses 1 of this IP's 2 a day)
//
// Prints statuses and shapes only, never a key or token. Exits 1 when a check fails.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const base = (process.argv[2] || '').replace(/\/+$/, '');
if (!/^https:\/\//.test(base)) { console.error('usage: node cloudflare/smoke.mjs https://<host> [--generate]'); process.exit(2); }
const example = path.join(here, '..', 'public', 'examples', 'adult-coloring-pages', 'adult-cafe-table.png');
const page = 'data:image/png;base64,' + fs.readFileSync(example).toString('base64');

async function post(p, body, form = false) {
  const r = await fetch(base + p, {
    method: 'POST', redirect: 'manual',
    headers: { 'Content-Type': form ? 'application/x-www-form-urlencoded' : 'application/json' },
    body: form ? new URLSearchParams(body) : JSON.stringify(body)
  });
  const buf = Buffer.from(await r.arrayBuffer());
  let json = null; try { json = JSON.parse(buf.toString()); } catch {}
  return { status: r.status, type: r.headers.get('content-type') || '', buf, json };
}
const pdfPages = buf => (buf.toString('latin1').match(/\/Type\s*\/Page\b(?!s)/g) || []).length;

const checks = [];
const check = (name, ok, evidence) => checks.push({ name, ok: !!ok, evidence });
const fakeToken = '0'.repeat(64);
const fakeKey = 'AAAAAAAA-BBBBBBBB-CCCCCCCC-DDDDDDDD';

if (process.argv.includes('--generate')) {
  const g = await post('/generate', { prompt: 'a friendly turtle on a beach', style: 'simple' });
  const m = g.json && /^data:(image\/\w+);base64,/.exec(g.json.imageUrl || '');
  check('free page drawn (gray PNG, not Pro)', g.status === 200 && m && m[1] === 'image/png' && g.json.isPro === false,
    `${g.status} ${m ? m[1] : (g.json && g.json.error) || g.type}`);
}
const one = await post('/download-pdf', { imageUrls: [page, page, page] });
check('free PDF: one page from three', one.status === 200 && one.type.startsWith('application/pdf') && pdfPages(one.buf) === 1, `${one.status} ${one.type} pages=${pdfPages(one.buf)}`);
const web = await post('/download-pdf', { imageUrls: ['https://example.com/a.png'] });
check('PDF refuses web addresses', web.status === 400, String(web.status));
const short = await post('/generate', { prompt: 'ab' });
check('short prompt refused', short.status === 400, String(short.status));
const tok = await post('/verify-pro', { token: fakeToken });
check('unknown token is not Pro', tok.status === 200 && tok.json && tok.json.pro === false, `${tok.status} ${tok.buf.toString().slice(0, 40)}`);
const key = await post('/verify-pro', { license_key: fakeKey });
check('bad license key is not Pro', key.status === 200 && key.json && key.json.pro === false, `${key.status}`);
const hook = await post('/gumroad-webhook', { license_key: fakeKey }, true);
check('webhook refuses an unverified ping', hook.status === 401, String(hook.status));
const out = await post('/pro-signout', { token: fakeToken });
check('sign-out answers ok', out.status === 200 && out.json && out.json.ok === true, String(out.status));
const nope = await post('/no-such-route', {});
check('unknown POST is a 404 page', nope.status === 404 && nope.type.startsWith('text/html'), `${nope.status} ${nope.type}`);

for (const c of checks) console.log(`${c.ok ? 'pass' : 'FAIL'}  ${c.name}  (${c.evidence})`);
process.exit(checks.every(c => c.ok) ? 0 : 1);
