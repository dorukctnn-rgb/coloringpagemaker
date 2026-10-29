#!/usr/bin/env node
// The funnel report of ColoringPageMaker: page views, pages made, the free limit shown (the limit card, line or window), the Pro
// window opened, Pro button clicks, and the Gumroad sales that came back (utm_campaign "coloringpagemaker"), for the last 7 and 30
// UTC days. The counts come from the site's own counter (cloudflare/funnel-core.js, GET /funnel/admin, read with the same key as
// the Pinterest job's admin address); the sales from the Gumroad API, read only. Nothing is written anywhere.
//
//   node cloudflare/funnel-read.mjs                  7 and 30 days
//   node cloudflare/funnel-read.mjs --days 14        one window
//   node cloudflare/funnel-read.mjs --pages          add the 12 busiest pages (views, pages made, limit shown, clicks)
//   node cloudflare/funnel-read.mjs --json           the same numbers as JSON
//   node cloudflare/funnel-read.mjs --no-gumroad     the counter only
//   node cloudflare/funnel-read.mjs --selftest       one test note (a view of the page /selftest, left out of the report) and read it back
//
// Keys (never printed): AUTOPIN_ADMIN_KEY in the environment or in .env.autopin in the repository root (as admin.mjs of the Pinterest
// job); GUMROAD_TOKEN or C:\Users\doruk\.claude\skills\store-deploy\secrets\bodyarcade\gumroad-token.txt. FUNNEL_BASE overrides the site
// address (default https://www.coloringpagemaker.app).
// Reading the numbers: views are page openings (a reload counts again, crawlers and automation do not); "made" counts every page
// drawn; "limit shown" is each time the free limit put the Pro card or window in front of someone; "clicks" are Pro links followed (a
// sale is not a click: Gumroad takes the payment). Rates are rough guides, not a cohort: the same visitor can open, click and buy on
// different days.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..');
const DAY = 864e5;
export const dayOf = (ms) => new Date(ms).toISOString().slice(0, 10);
export const windowOf = (days, now = Date.now()) => ({ days, from: dayOf(now - (days - 1) * DAY), to: dayOf(now) });

export async function readCounter({ base, key, days, by, fetchFn = fetch }) {
  const r = await fetchFn(`${base.replace(/\/+$/, '')}/funnel/admin?days=${days}&by=${by.join(',')}`, { headers: { Authorization: `Bearer ${key}` } });
  if (r.status === 401) throw new Error('the site refused the key (401): check AUTOPIN_ADMIN_KEY');
  if (r.status === 404) throw new Error('the counter is not on the site yet (404 on /funnel/admin): the Worker with the counter has not been deployed');
  if (!r.ok) throw new Error(`the site answered ${r.status}`);
  return (await r.json()).rows || [];
}

// GET /v2/sales from `after` on, every page; only the fields the report needs are kept (no e-mail, name or license key)
export async function readSales({ token, after, fetchFn = fetch, maxPages = 60 }) {
  const out = [];
  let pageKey = '';
  for (let i = 0; i < maxPages; i++) {
    const q = new URLSearchParams({ after });
    if (pageKey) q.set('page_key', pageKey);
    const r = await fetchFn(`https://api.gumroad.com/v2/sales?${q}`, { headers: { Authorization: `Bearer ${token}` } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.success) throw new Error(`Gumroad answered ${r.status}${j.message ? `: ${String(j.message).slice(0, 80)}` : ''}`);
    for (const s of j.sales || []) out.push({ at: String(s.created_at || ''), cents: Number(s.price) || 0, product: String(s.product_name || ''), refunded: !!(s.refunded || s.chargedback), source: String(s.utm_source || ''), campaign: String(s.utm_campaign || '') });
    if (!j.next_page_key) break;
    pageKey = j.next_page_key;
  }
  return out;
}
// this product's sales: tagged with the site's campaign, or sold before the tags existed under the product's name
export const isOurs = (s) => s.campaign === 'coloringpagemaker' || /ColoringPageMaker/i.test(s.product);
export const isSale = (s) => s.cents > 0 && !s.refunded;

// rows: [{e, p?, w?, s?, n}]; the test note (page /selftest) is left out
export function buildReport({ rows, sales, window: win }) {
  const real = rows.filter((r) => r.p !== '/selftest');
  const total = { view: 0, make: 0, gate: 0, open: 0, click: 0 };
  const makeBy = {}, gateBy = {}, openBy = {}, clickBy = {}, viewBy = {}, clickSource = {};
  const pages = {};
  const add = (m, k, n) => { m[k || '(unknown)'] = (m[k || '(unknown)'] || 0) + n; };
  for (const r of real) {
    if (!(r.e in total)) continue;
    total[r.e] += r.n;
    if (r.e === 'make' && r.w !== undefined) add(makeBy, r.w, r.n);
    if (r.e === 'gate' && r.w !== undefined) add(gateBy, r.w, r.n);
    if (r.e === 'open' && r.w !== undefined) add(openBy, r.w, r.n);
    if (r.e === 'click' && r.w !== undefined) add(clickBy, r.w, r.n);
    if (r.e === 'click' && r.s !== undefined) add(clickSource, r.s, r.n);
    if (r.e === 'view' && r.s !== undefined) add(viewBy, r.s, r.n);
    if (r.p !== undefined) { const p = pages[r.p || '(unknown)'] || (pages[r.p || '(unknown)'] = { view: 0, make: 0, gate: 0, open: 0, click: 0 }); p[r.e] += r.n; }
  }
  const mine = sales.filter((s) => isOurs(s) && isSale(s) && s.at.slice(0, 10) >= win.from && s.at.slice(0, 10) <= win.to);
  return { window: win, total, makeBy, gateBy, openBy, clickBy, viewBy, clickSource, pages, sales: mine.length, cents: mine.reduce((a, s) => a + s.cents, 0),
    salesByCampaign: mine.reduce((m, s) => { const k = s.campaign || '(no tag)'; m[k] = (m[k] || 0) + 1; return m; }, {}) };
}

const money = (c) => `$${(c / 100).toFixed(2)}`;
const pct = (a, b) => (b > 0 ? `${((a / b) * 100).toFixed(1)}%` : '-');
const split = (m) => Object.entries(m).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([k, n]) => `${k} ${n}`).join(', ');
export function formatReport(rep, { pages = false } = {}) {
  const t = rep.total, w = rep.window;
  const L = [`ColoringPageMaker funnel, last ${w.days} days (${w.from} to ${w.to}, UTC days, today included)`];
  const row = (label, n, extra = '') => L.push(`  ${label.padEnd(28)}${String(n).padStart(7)}  ${extra}`.trimEnd());
  row('page views', t.view, split(rep.viewBy) && `by kind of site: ${split(rep.viewBy)}`);
  row('pages made', t.make, `${pct(t.make, t.view)} of views${split(rep.makeBy) ? `; ${split(rep.makeBy)}` : ''}`);
  row('free limit shown (gate)', t.gate, `${pct(t.gate, t.make)} of pages made${split(rep.gateBy) ? `; ${split(rep.gateBy)}` : ''}`);
  row('Pro window opened', t.open, split(rep.openBy));
  row('Pro button clicks', t.click, `${pct(t.click, t.gate)} of limits shown, ${pct(t.click, t.view)} of views${split(rep.clickBy) ? `; where: ${split(rep.clickBy)}` : ''}`);
  if (split(rep.clickSource)) L.push(`  ${''.padEnd(28)}${''.padStart(7)}  clicks by kind of site: ${split(rep.clickSource)}`);
  row('Gumroad sales', rep.sales, `${pct(rep.sales, t.click)} of clicks; ${money(rep.cents)} gross${rep.sales ? `; ${split(rep.salesByCampaign)}` : ''}`);
  if (pages) {
    L.push('', '  busiest pages (views, made, limit shown, Pro clicks):');
    for (const [p, c] of Object.entries(rep.pages).sort((a, b) => b[1].view - a[1].view || b[1].click - a[1].click).slice(0, 12)) L.push(`    ${p.padEnd(40)}${String(c.view).padStart(6)}${String(c.make).padStart(6)}${String(c.gate).padStart(6)}${String(c.click).padStart(6)}`);
  }
  return L.join('\n');
}

function readKey() {
  if (process.env.AUTOPIN_ADMIN_KEY) return process.env.AUTOPIN_ADMIN_KEY.trim();
  const file = process.env.AUTOPIN_ENV_FILE || path.join(repo, '.env.autopin');
  if (!fs.existsSync(file)) return '';
  const m = /^AUTOPIN_ADMIN_KEY=(.+)$/m.exec(fs.readFileSync(file, 'utf8'));
  return m ? m[1].trim() : '';
}
function gumroadToken() {
  if (process.env.GUMROAD_TOKEN) return process.env.GUMROAD_TOKEN.trim();
  try { return fs.readFileSync(path.join(process.env.PEAK_SECRETS || path.join(os.homedir(), '.claude', 'skills', 'store-deploy', 'secrets'), 'bodyarcade', 'gumroad-token.txt'), 'utf8').trim(); } catch { return ''; }
}

async function main() {
  const argv = process.argv.slice(2);
  const has = (n) => argv.includes(n);
  const arg = (n, d) => { const i = argv.indexOf(n); return i > -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
  const base = (process.env.FUNNEL_BASE || 'https://www.coloringpagemaker.app').replace(/\/+$/, '');
  const key = readKey();
  if (!key) { console.error('No key: set AUTOPIN_ADMIN_KEY or put AUTOPIN_ADMIN_KEY=... in .env.autopin'); process.exit(2); }
  if (has('--selftest')) {
    const sum = async () => (await readCounter({ base, key, days: 1, by: ['e', 'p'] })).filter((r) => r.p === '/selftest').reduce((a, r) => a + r.n, 0);
    const before = await sum();
    const r = await fetch(`${base}/funnel`, { method: 'POST', headers: { Origin: base, 'Content-Type': 'text/plain;charset=UTF-8', 'User-Agent': 'Mozilla/5.0 (funnel selftest)' }, body: JSON.stringify({ e: 'view', t: 'coloringpagemaker', p: '/selftest', w: '', s: 'direct' }) });
    const after = await sum();
    console.log(`POST /funnel answered ${r.status} (want 204); selftest total ${before} -> ${after} (want +1)`);
    process.exit(r.status === 204 && after === before + 1 ? 0 : 1);
  }
  const windows = String(arg('--days', '7,30')).split(',').map(Number).filter((n) => n >= 1 && n <= 400);
  const widest = Math.max(...windows);
  const notes = [];
  let sales = [];
  if (!has('--no-gumroad')) {
    const token = gumroadToken();
    if (!token) notes.push('Sales: no Gumroad token (GUMROAD_TOKEN or the secrets file), so sales are not shown.');
    else { try { sales = await readSales({ token, after: windowOf(widest + 1).from }); } catch (e) { notes.push(`Sales: ${e.message}`); } }
  }
  const reports = [];
  let failed = false;
  for (const days of windows) {
    let rows = [];
    try { rows = await readCounter({ base, key, days, by: has('--pages') ? ['e', 'p', 'w', 's'] : ['e', 'w', 's'] }); }
    catch (e) { failed = true; notes.push(`Counter: ${e.message}`); }
    reports.push(buildReport({ rows, sales, window: windowOf(days) }));
  }
  if (has('--json')) { console.log(JSON.stringify({ reports, notes }, null, 1)); return; }
  for (const rep of reports) console.log(formatReport(rep, { pages: has('--pages') }) + '\n');
  for (const n of [...new Set(notes)]) console.log(n);
  if (failed && !sales.length) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.error(e.message); process.exit(1); });
