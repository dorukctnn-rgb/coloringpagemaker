// The visit and Pro click counter: the counting rules (cloudflare/funnel-core.js), the Worker's two addresses (POST /funnel, GET
// /funnel/admin), the script every page carries (views/partials/funnel.ejs) on a fake page, the hooks in the pages, the privacy
// page, and the report script (cloudflare/funnel-read.mjs). server.js runs as a child process, as in the other page tests.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import http from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { DatabaseSync } from 'node:sqlite';
import worker from '../cloudflare/worker.js';
import { FunnelCore, cleanNote, MAX_ROWS_PER_DAY, KEEP_DAYS } from '../cloudflare/funnel-core.js';
import { LedgerCore } from '../cloudflare/ledger-core.js';
import { windowOf, readCounter, readSales, buildReport, formatReport, isOurs, isSale } from '../cloudflare/funnel-read.mjs';

const require = createRequire(import.meta.url);
const h = require('./helpers');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = promisify(execFile);
const DAY = 864e5;
const NOTE = { e: 'click', t: 'coloringpagemaker', p: '/halloween-coloring-pages', w: 'limit-card', s: 'pinterest' };

// ---------------------------------------------------------------- core
function makeCore(start = Date.parse('2026-11-10T12:00:00Z')) {
  const db = new DatabaseSync(':memory:');
  const exec = (q, ...p) => { const st = db.prepare(q); return /^\s*SELECT/i.test(q) ? st.all(...p) : (st.run(...p), []); };
  const txn = fn => { db.exec('BEGIN'); try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; } };
  const clock = { t: start };
  return { core: new FunnelCore(exec, txn, () => clock.t), clock, db, exec, txn };
}

test('core: a note keeps five lowercased fields, drops an address with a query or #, a free-text place or an unknown kind of site, and refuses the rest', () => {
  assert.deepEqual(cleanNote(NOTE), NOTE);
  assert.deepEqual(cleanNote(JSON.stringify({ ...NOTE, p: '/Halloween-Coloring-Pages', s: 'Pinterest', ip: '1.2.3.4', email: 'a@b.c' })), NOTE);
  assert.equal(cleanNote({ ...NOTE, p: '/x?email=a@b.c' }).p, '');
  assert.equal(cleanNote({ ...NOTE, p: '/x#frag' }).p, '');
  assert.equal(cleanNote({ ...NOTE, w: 'Buy Pro now!' }).w, '');
  assert.equal(cleanNote({ ...NOTE, s: 'https://evil.example/' }).s, '');
  for (const bad of [null, 'x', '[]', '{"e":"purchase","t":"coloringpagemaker"}', '{"e":"click"}', '{"e":"click","t":"x y"}', JSON.stringify({ ...NOTE, pad: 'x'.repeat(700) })]) assert.equal(cleanNote(bad), null);
});
test('core: each note adds one to the UTC day\'s total for its combination; the window includes today; old totals are deleted; a flood is capped', () => {
  const { core, clock, db } = makeCore();
  for (let i = 0; i < 3; i++) core.note(cleanNote(NOTE));
  core.note(cleanNote({ ...NOTE, e: 'view' }));
  assert.deepEqual(core.rows({ days: 7, by: ['e'] }), [{ e: 'click', n: 3 }, { e: 'view', n: 1 }]);
  clock.t += DAY; core.note(cleanNote(NOTE));
  assert.deepEqual(core.rows({ days: 1, by: ['day'] }), [{ day: '2026-11-11', n: 1 }]);
  assert.deepEqual(core.rows({ days: 2, by: ['day'] }), [{ day: '2026-11-10', n: 4 }, { day: '2026-11-11', n: 1 }]);
  for (let i = 0; i < 20; i++) core.note(cleanNote({ ...NOTE, p: '/p' + i }), 5);
  assert.ok(db.prepare("SELECT COUNT(*) AS c FROM funnel WHERE day = '2026-11-11'").get().c <= 6, 'the day\'s rows stop at the room plus the overflow row');
  assert.ok(MAX_ROWS_PER_DAY >= 1000);
  clock.t += (KEEP_DAYS + 1) * DAY; core.purge();
  assert.equal(db.prepare('SELECT COUNT(*) AS c FROM funnel').get().c, 0);
  assert.deepEqual(db.prepare('PRAGMA table_info(funnel)').all().map(c => c.name), ['day', 'e', 't', 'p', 'w', 's', 'n'], 'counts only');
});
test('core: the Ledger object makes the counter in the same SQLite as the ledger without touching the ledger\'s tables', () => {
  const { exec, txn } = makeCore();
  const ledger = new LedgerCore(exec, txn);
  const funnel = new FunnelCore(exec, txn);
  funnel.note(cleanNote(NOTE));
  ledger.add('ai:2026-11-10', 1, 1e9);
  assert.equal(funnel.rows({ days: 1, by: [] })[0].n, 1);
  const src = fs.readFileSync(path.join(root, 'cloudflare', 'ledger.js'), 'utf8').replace(/\r\n/g, '\n');
  assert.match(src, /this\.funnel = new FunnelCore\(exec, txn\)/);
  assert.match(src, /noteFunnel\(rec\) \{ return this\.funnel\.note\(rec\); \}/);
  assert.match(src, /funnelRows\(a\) \{ return this\.funnel\.rows\(a\); \}/);
  assert.match(src, /this\.funnel\.purge\(\)/);
});

// ---------------------------------------------------------------- the Worker
function makeEnv(extra = {}) {
  const mk = () => { const { core } = makeCore(Date.now()); return { core, stub: new Proxy(core, { get: (t, k) => (k === 'noteFunnel' ? (...a) => Promise.resolve(t.note(...a)) : k === 'funnelRows' ? (...a) => Promise.resolve(t.rows(...a)) : t[k]) }) }; };
  const instances = { main: mk(), funnel: mk() };
  return { env: { LEDGER: { idFromName: n => n, get: n => instances[n].stub }, ASSETS: { async fetch(req) { const p = new URL(req.url).pathname; return p === '/404' ? new Response('not found page', { status: 200 }) : p === '/' ? new Response('page', { status: 200 }) : new Response(null, { status: 404 }); } }, AUTOPIN_ADMIN_KEY: 'admin-test', ...extra }, instances };
}
const ORIGIN = 'https://www.coloringpagemaker.app';
const post = (env, body, headers = {}) => worker.fetch(new Request(ORIGIN + '/funnel', { method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'text/plain;charset=UTF-8', 'User-Agent': 'Mozilla/5.0 Chrome/130', 'cf-connecting-ip': '203.0.113.9', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) }), env);
const total = i => (i.funnel.core.rows({ days: 1, by: [] })[0] || {}).n || 0;

test('worker: POST /funnel counts the note in the "funnel" instance only, answers 204 and stores nothing about the visitor', async () => {
  const { env, instances } = makeEnv();
  const r = await post(env, NOTE);
  assert.equal(r.status, 204);
  assert.equal(r.headers.get('set-cookie'), null);
  assert.deepEqual(instances.funnel.core.rows({ days: 1, by: ['e', 'p', 'w', 's'] }), [{ e: 'click', p: '/halloween-coloring-pages', w: 'limit-card', s: 'pinterest', n: 1 }]);
  assert.equal((instances.main.core.rows({ days: 1, by: [] })[0] || {}).n || 0, 0, 'the "main" instance of the ledger is untouched');
});
test('worker: the main instance of the ledger is not used for notes (a flood never waits behind a drawing request)', async () => {
  const names = [];
  const { env } = makeEnv();
  const idFromName = env.LEDGER.idFromName;
  env.LEDGER.idFromName = n => { names.push(n); return idFromName(n); };
  await post(env, NOTE);
  assert.deepEqual(names, ['funnel']);
});
test('worker: POST /funnel refuses another origin or none, a bad note or another site\'s name; crawlers are answered and not counted', async () => {
  const { env, instances } = makeEnv();
  assert.equal((await post(env, NOTE, { Origin: 'https://evil.example' })).status, 403);
  assert.equal((await post(env, NOTE, { Origin: 'https://www.coloringpagemaker.app.evil.example' })).status, 403);
  assert.equal((await worker.fetch(new Request(ORIGIN + '/funnel', { method: 'POST', body: JSON.stringify(NOTE) }), env)).status, 403);
  assert.equal((await post(env, '{"e":"purchase","t":"coloringpagemaker"}')).status, 400);
  assert.equal((await post(env, { ...NOTE, t: 'pay-gap-report' })).status, 400, 'a note for another tool is not this site\'s');
  assert.equal((await post(env, 'x'.repeat(700))).status, 413);
  assert.equal((await post(env, NOTE, { 'User-Agent': 'Googlebot/2.1' })).status, 204);
  assert.equal((await post(env, NOTE, { 'User-Agent': 'HeadlessChrome/130' })).status, 204);
  assert.equal(total(instances), 0);
  // the apex and the www host are both this site; a preview address is its own origin
  assert.equal((await post(env, NOTE, { Origin: 'https://coloringpagemaker.app' })).status, 204);
  assert.equal(total(instances), 1);
  const preview = await worker.fetch(new Request('https://coloringpagemaker-preview.railer-iot.workers.dev/funnel', { method: 'POST', headers: { Origin: 'https://coloringpagemaker-preview.railer-iot.workers.dev', 'User-Agent': 'Mozilla/5.0' }, body: JSON.stringify(NOTE) }), env);
  assert.equal(preview.status, 204, 'a page served by the preview Worker counts into the preview\'s own database');
});
test('worker: a counting failure still answers 204; GET /funnel is the 404 page; the admin address needs the key and does not exist without one', async () => {
  const { env } = makeEnv();
  env.LEDGER = { idFromName: n => n, get: () => ({ noteFunnel: async () => { throw new Error('down'); } }) };
  const log = console.error; console.error = () => {};
  try { assert.equal((await post(env, NOTE)).status, 204); } finally { console.error = log; }
  const ok = makeEnv();
  assert.equal((await worker.fetch(new Request(ORIGIN + '/funnel'), ok.env)).status, 404);
  const get = (p, key, e = ok.env) => worker.fetch(new Request(ORIGIN + p, { headers: key ? { Authorization: 'Bearer ' + key } : {} }), e);
  await post(ok.env, NOTE); await post(ok.env, { ...NOTE, e: 'gate', w: 'last' });
  assert.equal((await get('/funnel/admin')).status, 401);
  assert.equal((await get('/funnel/admin', 'wrong')).status, 401);
  const r = await get('/funnel/admin?days=7&by=e,w', 'admin-test');
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.deepEqual((await r.json()).rows, [{ e: 'click', w: 'limit-card', n: 1 }, { e: 'gate', w: 'last', n: 1 }]);
  assert.deepEqual((await (await get('/funnel/admin?by=e;DROP TABLE funnel', 'admin-test')).json()).by, []);
  const none = makeEnv({ AUTOPIN_ADMIN_KEY: undefined });
  const gone = await get('/funnel/admin', 'admin-test', none.env);
  assert.equal(gone.status, 404, 'without a key set the address does not exist: the 404 page');
  assert.equal(await gone.text(), 'not found page');
});

// ---------------------------------------------------------------- the pages
let app;
const pages = new Map();
before(async () => {
  app = await h.startApp({ KV_REST_API_URL: '', OPENAI_API_KEY: '' });
  for (const p of ['/', '/halloween-coloring-pages', '/christmas-coloring-pages', '/mandala-coloring-pages', '/blog', '/privacy', '/terms', '/this-page-does-not-exist-x']) {
    const r = await fetch(app.base + p);
    pages.set(p, await r.text());
  }
});
after(async () => { if (app) await app.stop(); });

const scriptsOf = html => [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const funnelScript = html => scriptsOf(html).find(s => s.includes('window.cpmFunnel ='));

test('pages: every page that carries the source script carries the counter script once, right after it', () => {
  for (const [p, html] of pages) {
    assert.equal(html.split('window.cpmFunnel =').length - 1, 1, p);
    assert.ok(html.indexOf('window.cpmSource =') < html.indexOf('window.cpmFunnel ='), p + ': after the source script, which it reads');
    assert.ok(html.indexOf('window.cpmFunnel =') < html.indexOf('</head>'), p + ': in the head');
  }
});
test('pages: the hooks are where the limit, a made page and the Pro card are', () => {
  const home = pages.get('/'), theme = pages.get('/halloween-coloring-pages'), niche = pages.get('/mandala-coloring-pages');
  assert.match(home, /cpmFunnel\.track\('make', proToken \? 'pro' : 'free'\)/);
  assert.match(home, /cpmFunnel\.track\('gate', 'limit-modal'\)/);
  assert.match(home, /cpmFunnel\.track\('gate', 'pool-line'\)/);
  assert.match(theme, /cpmFunnel\.track\('make', proToken \? 'pro' : 'free'\)/);
  assert.match(niche, /cpmFunnel\.track\('make', proToken \? 'pro' : 'free'\)/);
  for (const html of [home, theme, niche]) assert.match(html, /cpmFunnel\.track\('gate', TITLES\[kind\] \? kind : 'limit'\)/, 'the Pro card counts when it is shown');
});

// the script on a fake page
function loadFunnel({ host = 'www.coloringpagemaker.app', pathname = '/', webdriver = false, prerendering = false, source = { source: 'pinterest', chosen: () => 'google' } } = {}) {
  const sent = [], listeners = {};
  const ctx = {
    location: { hostname: host, pathname },
    navigator: { webdriver },
    fetch(url, init) { sent.push({ url, init, note: JSON.parse(init.body) }); return Promise.resolve({}); },
    document: { prerendering, addEventListener(t, fn, o) { (listeners[t] = listeners[t] || []).push({ fn, o }); } },
  };
  ctx.window = ctx;
  ctx.window.cpmSource = source;
  vm.createContext(ctx);
  vm.runInContext(funnelScript(pages.get('/')), ctx);
  const fire = (type, target, extra) => { for (const l of listeners[type] || []) l.fn({ type, target, ...extra }); };
  return { ctx, sent, listeners, fire, api: ctx.window.cpmFunnel };
}
// a fake element inside some container(s), optionally an <a> with a href, optionally a button that opens the Pro window
function el({ inside = [], href, opener = false, nav = false } = {}) {
  const e = { href, closest: sel => {
    if (sel === 'a[href]') return href ? e : null;
    if (sel === '[data-open-pro], #navProBtn') return opener ? e : null;
    return inside.some(s => sel === s) ? e : null;
  } };
  return e;
}
const PRO = 'https://dorukctn.gumroad.com/l/uynqt';

test('script: a page opens once as a view with this visit\'s kind of site, but not the privacy, terms or 404 page', () => {
  const home = loadFunnel({ pathname: '/Halloween-Coloring-Pages' });
  assert.equal(home.sent.length, 1);
  assert.deepEqual(home.sent[0].note, { e: 'view', t: 'coloringpagemaker', p: '/halloween-coloring-pages', w: '', s: 'pinterest' });
  assert.equal(home.sent[0].url, '/funnel');
  assert.match(home.sent[0].init.headers['Content-Type'], /^text\/plain/);
  assert.equal(home.sent[0].init.credentials, 'omit');
  for (const p of ['/privacy', '/terms', '/404', '/privacy/']) assert.deepEqual(loadFunnel({ pathname: p }).sent, [], p);
  // a prerendered page is counted when the visitor opens it
  const pre = loadFunnel({ prerendering: true });
  assert.equal(pre.sent.length, 0);
  pre.fire('prerenderingchange');
  assert.equal(pre.sent.length, 1);
});
test('script: a Pro link followed is a click with the browser\'s first kind of site, the Pro window button is an open, and the place is named', () => {
  const r = loadFunnel();
  const cases = [
    [el({ href: PRO, inside: ['#proNudge'] }), 'click', 'limit-card'], [el({ href: PRO, inside: ['#proModal'] }), 'click', 'modal'],
    [el({ href: PRO, inside: ['.season-pro'] }), 'click', 'season'], [el({ href: PRO, inside: ['.usage-bar'] }), 'click', 'usage-line'],
    [el({ href: PRO, inside: ['.pricing-cta'] }), 'click', 'bottom-offer'], [el({ href: 'https://gum.co/u/pev97h5v' }), 'click', 'page'],
    [el({ href: PRO, opener: true, inside: ['.plans-cta'] }), 'open', 'plans'], [el({ opener: true, inside: ['.nav'] }), 'open', 'nav'],
  ];
  r.sent.length = 0;
  for (const [target, event, where] of cases) { r.fire('click', target); }
  assert.deepEqual(r.sent.map(s => [s.note.e, s.note.w]), cases.map(c => [c[1], c[2]]));
  assert.ok(r.sent.every(s => s.note.s === 'google'), 'a click carries the same word as the Gumroad link');
  r.sent.length = 0;
  const same = el({ href: PRO }); r.fire('click', same); r.fire('click', same);
  assert.equal(r.sent.length, 1, 'one count per link per two seconds');
  r.fire('auxclick', el({ href: PRO }), { button: 1 });
  assert.equal(r.sent.length, 2);
  r.fire('auxclick', el({ href: PRO }), { button: 2 });
  assert.equal(r.sent.length, 2);
  for (const href of ['https://dorukctn.gumroad.com/l/other', 'https://www.coloringpagemaker.app/blog', 'https://dorukctn.gumroad.com/', 'https://gumroad.com/l/uynqt']) r.fire('click', el({ href }));
  assert.equal(r.sent.length, 2, 'other links are not Pro links');
  for (const t of [null, undefined, {}, { closest() { throw new Error('detached'); } }]) assert.doesNotThrow(() => r.fire('click', t));
});
test('script: gate and make go through track(); nothing is sent from another host, a preview, or under automation, and a failed send is ignored', () => {
  const r = loadFunnel({ pathname: '/mandala-coloring-pages' });
  r.sent.length = 0;
  r.api.track('gate', 'last'); r.api.track('make', 'free');
  assert.deepEqual(r.sent.map(s => [s.note.e, s.note.w, s.note.s]), [['gate', 'last', 'google'], ['make', 'free', 'google']]);
  for (const host of ['localhost', '127.0.0.1', 'coloringpagemaker-preview.railer-iot.workers.dev', 'coloringpagemaker.vercel.app', 'evil.coloringpagemaker.app.example.com']) assert.deepEqual(loadFunnel({ host }).sent, [], host);
  assert.deepEqual(loadFunnel({ webdriver: true }).sent, []);
  assert.equal(loadFunnel({ host: 'coloringpagemaker.app' }).sent.length, 1);
  const broken = loadFunnel(); broken.ctx.fetch = () => { throw new Error('blocked'); };
  assert.doesNotThrow(() => { broken.api.track('gate', 'last'); broken.fire('click', el({ href: PRO })); });
  const rejected = loadFunnel(); rejected.ctx.fetch = () => Promise.reject(new Error('offline'));
  assert.doesNotThrow(() => rejected.api.track('gate', 'last'));
  const noSource = loadFunnel({ source: undefined }); noSource.ctx.window.cpmSource = undefined; noSource.sent.length = 0;
  noSource.api.track('click', 'page');
  assert.equal(noSource.sent[0].note.s, 'direct');
});
test('script: it adds one global, reads and writes no storage or cookie, and its only network call is the one POST', () => {
  const src = funnelScript(pages.get('/'));
  assert.equal(src.split('fetch(').length - 1, 1);
  assert.doesNotMatch(src, /localStorage|sessionStorage|document\.cookie|XMLHttpRequest|sendBeacon|new Image|WebSocket/);
  const r = loadFunnel();
  assert.deepEqual(Object.keys(r.ctx).filter(k => !['location', 'navigator', 'fetch', 'document', 'window', 'cpmSource'].includes(k)), ['cpmFunnel']);
});
test('the Pro card tells the counter which limit it showed, once per showing, and not to a Pro buyer', () => {
  const html = pages.get('/');
  const src = scriptsOf(html).find(s => s.includes('window.cpmNudge ='));
  const tracked = [];
  const els = { proNudge: { hidden: true, scrollIntoView() {} }, proNudgeTitle: {}, proNudgeLead: {}, proNudgeDismiss: { addEventListener() {} } };
  const ctx = { document: { getElementById: id => els[id] || null }, window: { cpmFunnel: { track: (e, w) => tracked.push([e, w]) }, cpmPro: { token: () => '' }, matchMedia: () => ({ matches: true }) } };
  ctx.window.window = ctx.window; Object.assign(ctx, ctx.window);
  vm.createContext(ctx); vm.runInContext(src, ctx);
  assert.equal(ctx.window.cpmNudge.show('last'), true);
  ctx.window.cpmNudge.show('pool'); ctx.window.cpmNudge.show('limit'); ctx.window.cpmNudge.show('whatever');
  assert.deepEqual(tracked, [['gate', 'last'], ['gate', 'pool'], ['gate', 'limit'], ['gate', 'limit']]);
  ctx.window.cpmPro.token = () => 'abc';
  assert.equal(ctx.window.cpmNudge.show('last'), false);
  assert.equal(tracked.length, 4, 'a Pro buyer sees no card and nothing is counted');
});

test('privacy page: says what the counter is, what a note holds, what is not stored, the retention, and that the page itself is not counted', () => {
  const t = pages.get('/privacy').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  assert.match(t, /uses no cookies, no third-party analytics and no advertising\. It does keep a small counter of its own for visits and Pro clicks/);
  assert.match(t, /Visit and click counts/);
  assert.match(t, /you made a page, the free pages ran out and the Pro card or window came up, you opened the Pro window, or you clicked a Pro button/);
  assert.match(t, /The counter's database holds no cookie, no IP address, no browser details, no time of day and nothing that tells one visitor from another/);
  assert.match(t, /A note never holds your descriptions, your pages, your license key or your email address/);
  assert.match(t, /kept for 400 days/);
  assert.match(t, /Daily visit and click totals \(no IP address, no identifier\): 400 days/);
  assert.match(t, /Nothing is counted for this page, the terms page or the error page/);
  assert.match(t, /Last updated: 28 October 2026/);
  assert.match(t, /This site sets no cookies\./);
  assert.doesNotMatch(t, /no cookies and no analytics|no cookies, analytics or advertising/);
  assert.doesNotMatch(t, /Neither word goes anywhere unless you click a Pro button/);
  // the plain-text rules of the studio: no long dashes, arrows or emoji in what a visitor reads
  assert.doesNotMatch(pages.get('/privacy').match(/<article[\s\S]*<\/article>/)[0], /[—–→✓✅]/);
});

// ---------------------------------------------------------------- the report
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status });
const WIN = windowOf(7, Date.parse('2026-11-10T15:00:00Z'));
const sale = o => ({ created_at: '2026-11-08T10:00:00Z', price: 900, product_name: 'ColoringPageMaker Pro - Lifetime Access', refunded: false, chargedback: false, utm_source: 'pinterest', utm_medium: 'social', utm_campaign: 'coloringpagemaker', email: 'buyer@example.com', purchase_email: 'buyer@example.com', full_name: 'A Buyer', license_key: 'AAAA-BBBB', ...o });

test('report: windows, the counter reader and the Gumroad reader (fields kept, pages followed, errors said plainly)', async () => {
  assert.deepEqual(WIN, { days: 7, from: '2026-11-04', to: '2026-11-10' });
  const seen = [];
  const rows = await readCounter({ base: 'https://x.test/', key: 'k', days: 7, by: ['e', 'w'], fetchFn: async (u, init) => { seen.push([u, init.headers.Authorization]); return json({ rows: [{ e: 'view', n: 5 }] }); } });
  assert.deepEqual(seen, [['https://x.test/funnel/admin?days=7&by=e,w', 'Bearer k']]);
  assert.deepEqual(rows, [{ e: 'view', n: 5 }]);
  await assert.rejects(readCounter({ base: 'https://x.test', key: 'k', days: 7, by: ['e'], fetchFn: async () => json({}, 404) }), /not been deployed/);
  await assert.rejects(readCounter({ base: 'https://x.test', key: 'k', days: 7, by: ['e'], fetchFn: async () => json({}, 401) }), /refused the key/);
  const sales = await readSales({ token: 't', after: '2026-10-11', fetchFn: async u => (u.includes('page_key=p2') ? json({ success: true, sales: [sale({ utm_campaign: '' })] }) : json({ success: true, sales: [sale(), sale({ refunded: true })], next_page_key: 'p2' })) });
  assert.equal(sales.length, 3);
  assert.deepEqual(Object.keys(sales[0]).sort(), ['at', 'campaign', 'cents', 'product', 'refunded', 'source']);
  assert.ok(!JSON.stringify(sales).includes('buyer@example.com') && !JSON.stringify(sales).includes('AAAA-BBBB') && !JSON.stringify(sales).includes('A Buyer'));
  await assert.rejects(readSales({ token: 'x', after: 'y', fetchFn: async () => json({ success: false, message: 'bad token' }, 401) }), /Gumroad answered 401: bad token/);
  assert.equal(isOurs({ campaign: 'coloringpagemaker', product: 'x' }), true);
  assert.equal(isOurs({ campaign: '', product: 'ColoringPageMaker Pro - Lifetime Access' }), true);
  assert.equal(isOurs({ campaign: 'chatbound', product: 'Chatbound Pro' }), false);
  assert.equal(isSale({ cents: 0, refunded: false }), false);
});
test('report: the steps side by side with their rates; sales outside the window, refunds, tests and other products are left out; the selftest page is skipped', () => {
  const rows = [
    { e: 'view', s: 'pinterest', n: 100 }, { e: 'view', s: 'direct', n: 60 }, { e: 'make', w: 'free', n: 20 }, { e: 'make', w: 'pro', n: 5 },
    { e: 'gate', w: 'last', n: 6 }, { e: 'gate', w: 'limit-modal', n: 2 }, { e: 'open', w: 'nav', n: 3 },
    { e: 'click', w: 'limit-card', s: 'pinterest', n: 4 }, { e: 'click', w: 'modal', s: 'direct', n: 1 }, { e: 'view', p: '/selftest', n: 9 },
  ];
  const sales = [
    { at: '2026-11-08T10:00:00Z', cents: 900, refunded: false, campaign: 'coloringpagemaker', product: 'x', source: 'pinterest' },
    { at: '2026-11-03T10:00:00Z', cents: 900, refunded: false, campaign: 'coloringpagemaker', product: 'x', source: '' },
    { at: '2026-11-09T10:00:00Z', cents: 900, refunded: true, campaign: 'coloringpagemaker', product: 'x', source: '' },
    { at: '2026-11-09T10:00:00Z', cents: 0, refunded: false, campaign: 'coloringpagemaker', product: 'x', source: '' },
    { at: '2026-11-09T10:00:00Z', cents: 800, refunded: false, campaign: 'character-ai-export-viewer', product: 'Chatbound Pro', source: '' },
    { at: '2026-11-10T10:00:00Z', cents: 900, refunded: false, campaign: '', product: 'ColoringPageMaker Pro - Lifetime Access', source: '' },
  ];
  const rep = buildReport({ rows, sales, window: WIN });
  assert.deepEqual(rep.total, { view: 160, make: 25, gate: 8, open: 3, click: 5 });
  assert.deepEqual([rep.sales, rep.cents], [2, 1800]);
  const text = formatReport(rep);
  assert.match(text, /^ColoringPageMaker funnel, last 7 days \(2026-11-04 to 2026-11-10, UTC days, today included\)/);
  assert.match(text, /page views\s+160\s+by kind of site: pinterest 100, direct 60/);
  assert.match(text, /pages made\s+25\s+15\.6% of views; free 20, pro 5/);
  assert.match(text, /free limit shown \(gate\)\s+8\s+32\.0% of pages made; last 6, limit-modal 2/);
  assert.match(text, /Pro button clicks\s+5\s+62\.5% of limits shown, 3\.1% of views; where: limit-card 4, modal 1/);
  assert.match(text, /clicks by kind of site: pinterest 4, direct 1/);
  assert.match(text, /Gumroad sales\s+2\s+40\.0% of clicks; \$18\.00 gross; \(no tag\) 1, coloringpagemaker 1/);
  const withPages = formatReport(buildReport({ rows: [{ e: 'view', p: '/', n: 5 }, { e: 'click', p: '/', n: 1 }, { e: 'view', p: '/a-page', n: 9 }], sales: [], window: WIN }), { pages: true });
  assert.match(withPages, /busiest pages[\s\S]*\/a-page\s+9\s+0\s+0\s+0\n\s+\/\s+5\s+0\s+0\s+1/);
});
test('report: the command line against a local copy of the site\'s two addresses (selftest, report, a refused key, no key)', async () => {
  const { env, instances } = makeEnv();
  const server = http.createServer(async (req, res) => {
    const chunks = []; for await (const c of req) chunks.push(c);
    const r = await worker.fetch(new Request(`http://${req.headers.host}${req.url}`, { method: req.method, headers: req.headers, body: ['GET', 'HEAD'].includes(req.method) ? undefined : Buffer.concat(chunks) }), env);
    res.writeHead(r.status, Object.fromEntries(r.headers)); res.end(Buffer.from(await r.arrayBuffer()));
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const cli = (args, e) => run(process.execPath, [path.join(root, 'cloudflare', 'funnel-read.mjs'), ...args], { cwd: path.join(root, 'test'), env: { PATH: process.env.PATH, FUNNEL_BASE: base, PEAK_SECRETS: path.join(root, 'test', 'no-secrets'), AUTOPIN_ENV_FILE: path.join(root, 'test', 'no-env-file'), ...e } }).then(r => ({ code: 0, ...r }), x => ({ code: x.code, stdout: x.stdout, stderr: x.stderr }));
  try {
    instances.funnel.core.note(cleanNote({ ...NOTE, e: 'view', w: '', s: 'direct' }));
    instances.funnel.core.note(cleanNote({ ...NOTE, e: 'click' }));
    const self = await cli(['--selftest'], { AUTOPIN_ADMIN_KEY: 'admin-test' });
    assert.equal(self.code, 0, self.stderr + self.stdout);
    assert.match(self.stdout, /answered 204.*\+1/);
    const rep = await cli(['--no-gumroad', '--days', '7', '--pages'], { AUTOPIN_ADMIN_KEY: 'admin-test' });
    assert.equal(rep.code, 0, rep.stderr);
    assert.match(rep.stdout, /page views\s+1\s/, 'the selftest view is left out of the report');
    assert.match(rep.stdout, /Pro button clicks\s+1\s/);
    assert.match(rep.stdout, /\/halloween-coloring-pages\s+1\s+0\s+0\s+1/);
    assert.ok(!rep.stdout.includes('admin-test'), 'the key is never printed');
    const bad = await cli(['--no-gumroad'], { AUTOPIN_ADMIN_KEY: 'wrong' });
    assert.equal(bad.code, 1);
    assert.match(bad.stdout + bad.stderr, /refused the key/);
    const none = await cli(['--no-gumroad'], {});
    assert.equal(none.code, 2);
    assert.match(none.stderr, /No key/);
  } finally { server.close(); }
});
