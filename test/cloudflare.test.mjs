// The Cloudflare Worker (cloudflare/worker.js) with its ledger on node:sqlite and stubbed bindings:
// routes of the old server, the zero-cost generation shield, the hard OpenAI spend cap, Pro, PDFs.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import vm from 'node:vm';
import worker, { isLegacySale, config } from '../cloudflare/worker.js';
import { LedgerCore, TOKEN_TTL_MS } from '../cloudflare/ledger-core.js';
import { FLUX_MODEL } from '../cloudflare/flux.js';
import { buildPdf, decodePdfImage } from '../cloudflare/pdf.js';
import lineart from '../lineart.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DAY = new Date().toISOString().slice(0, 10);
const MONTH = DAY.slice(0, 7);

// --- fixtures ---
function grayPng(w = 64, h = 64) {
  const G = new Uint8Array(w * h).fill(255);
  for (let i = 8; i < w - 8; i++) { G[8 * w + i] = 0; G[(h - 9) * w + i] = 0; G[i * w + 8] = 0; G[i * w + w - 9] = 0; }
  return lineart.encodeGray(G, w, h);
}
const PNG = grayPng();
// Smallest JPEG header the PDF writer reads: SOI, APP0, SOF0 (gray, 48 x 32), EOI.
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
  0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x20, 0x00, 0x30, 0x01, 0x01, 0x11, 0x00, 0xff, 0xd9]);
const dataUrl = (buf, type = 'png') => `data:image/${type};base64,${buf.toString('base64')}`;

function makeLedger() {
  const db = new DatabaseSync(':memory:');
  const exec = (q, ...p) => { const st = db.prepare(q); return /^\s*SELECT/i.test(q) ? st.all(...p) : (st.run(...p), []); };
  const txn = fn => { db.exec('BEGIN'); try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; } };
  const core = new LedgerCore(exec, txn);
  // Like a Durable Object stub: every call is async.
  const stub = new Proxy(core, { get: (t, k) => (typeof t[k] === 'function' ? (...a) => Promise.resolve(t[k](...a)) : t[k]) });
  return { core, stub };
}

const PAGES = { '/': 'home page', '/privacy': 'privacy page', '/blog': 'blog page', '/sitemap.xml': '<urlset/>', '/404': 'not found page' };
const assets = {
  async fetch(req) {
    const u = new URL(req.url);
    if (u.pathname.endsWith('/') && u.pathname.length > 1) return new Response(null, { status: 307, headers: { Location: u.pathname.slice(0, -1) } });
    const body = PAGES[u.pathname];
    if (body === undefined) return new Response(null, { status: 404 });
    return new Response(req.method === 'HEAD' ? null : body, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
};

let calls, openaiReply, gumroad, legacyReply, aiFails, imagesFail, L, env;
function makeEnv(vars = {}) {
  return {
    LEDGER: { idFromName: () => 'main', get: () => L.stub },
    ASSETS: assets,
    // aiFails: true (a generic failure), a text (the error message), or an object (properties of the error, like { code: 4006 }).
    AI: { async run(model, input) { calls.ai.push({ model, input }); if (aiFails) throw typeof aiFails === 'object' ? Object.assign(new Error('AiError'), aiFails) : new Error(typeof aiFails === 'string' ? aiFails : 'AI down'); return { image: JPEG.toString('base64') }; } },
    IMAGES: {
      input() { return { transform() { return { async output() { calls.images++; if (imagesFail) throw new Error('9422'); return { response: () => new Response(PNG) }; } }; } }; }
    },
    OPENAI_API_KEY: 'sk-test',
    ...vars
  };
}
const realFetch = globalThis.fetch;
beforeEach(() => {
  calls = { ai: [], images: 0, openai: 0, gumroad: 0, legacy: 0 };
  openaiReply = () => new Response(JSON.stringify({ data: [{ b64_json: PNG.toString('base64') }], usage: { total_tokens: 1 } }), { status: 200 });
  gumroad = {};
  legacyReply = { pro: false };
  aiFails = false; imagesFail = false;
  L = makeLedger();
  env = makeEnv();
  globalThis.fetch = async (url, init = {}) => {
    url = String(url);
    if (url.endsWith('/images/generations')) { calls.openai++; return openaiReply(JSON.parse(init.body)); }
    if (url === 'https://api.gumroad.com/v2/licenses/verify') {
      calls.gumroad++;
      const key = new URLSearchParams(init.body).get('license_key');
      const p = gumroad[key];
      return new Response(JSON.stringify(p ? { success: true, purchase: p } : { success: false, message: 'That license does not exist for the provided product.' }));
    }
    if (url.endsWith('/verify-pro')) { calls.legacy++; return new Response(JSON.stringify(legacyReply)); }
    throw new Error('unexpected fetch ' + url);
  };
});
afterEach(() => { globalThis.fetch = realFetch; });

const call = (p, { method = 'GET', body, ip = '1.1.1.1', ct = 'application/json' } = {}) =>
  worker.fetch(new Request('https://cpm.test' + p, { method, headers: { 'Content-Type': ct, 'cf-connecting-ip': ip }, body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body)) }), env);
const gen = async (body, ip) => { const r = await call('/generate', { method: 'POST', body, ip }); return { status: r.status, ...(await r.json()) }; };
async function proToken({ created = '2026-11-02T10:00:00Z', sale = 'sale-new' } = {}) {
  gumroad['KEY-' + sale] = { sale_id: sale, product_id: 'p', email: 'buyer@example.com', created_at: created, refunded: false };
  const r = await (await call('/verify-pro', { method: 'POST', body: { license_key: 'KEY-' + sale } })).json();
  assert.equal(r.pro, true);
  return r.token;
}

// --- routes: the same answers as the old Express server ---
test('trailing slash, retired pages, old API addresses and letter case answer like the old server', async () => {
  const loc = async (p, method) => { const r = await call(p, { method }); return [r.status, r.headers.get('location')]; };
  assert.deepEqual(await loc('/privacy/?a=1'), [301, '/privacy?a=1']);
  assert.deepEqual(await loc('/dragon-coloring-pages/?utm_source=pinterest'), [301, '/dragon-coloring-pages?utm_source=pinterest']);
  assert.deepEqual(await loc('/pokemon-coloring-pages/?x=1'), [301, '/animal-coloring-pages']);
  assert.deepEqual(await loc('/cartoon-character-coloring-pages'), [301, '/']);
  for (const p of ['/generate', '/download-pdf', '/gumroad-webhook', '/verify-pro', '/GENERATE']) assert.deepEqual(await loc(p), [301, '/'], p);
  const up = await call('/Privacy');
  assert.equal(up.status, 200);
  assert.equal(await up.text(), 'privacy page');
  assert.equal(await (await call('/BLOG')).text(), 'blog page');
  assert.equal(await (await call('/Sitemap.xml')).text(), '<urlset/>');
  assert.equal(await (await call('/')).text(), 'home page');
});

test('unknown paths, stored file names and unknown POSTs get the 404 page with status 404', async () => {
  for (const p of ['/nope', '/privacy.html', '/index.html', '/INDEX.HTML', '/index', '/404', '/Dragon-Coloring-Pages']) {
    const r = await call(p);
    assert.equal(r.status, 404, p);
    assert.equal(await r.text(), 'not found page', p);
    assert.match(r.headers.get('content-type'), /text\/html/);
  }
  const head = await call('/nope', { method: 'HEAD' });
  assert.equal(head.status, 404);
  assert.equal(await head.text(), '');
  assert.equal((await call('/nope', { method: 'POST', body: {} })).status, 404);
  assert.equal((await call('/pro-signout')).status, 404);
});

// --- the zero-cost shield ---
test('free pages are drawn by Workers AI as gray PNGs and never call OpenAI', async () => {
  const a = await gen({ prompt: 'a cat in a garden', style: 'simple' });
  assert.equal(a.status, 200);
  assert.equal(a.isPro, false);
  assert.equal(a.remaining, 1);
  assert.ok(a.imageUrl.startsWith('data:image/png;base64,'));
  assert.equal(Buffer.from(a.imageUrl.split(',')[1], 'base64').readUInt32BE(0), 0x89504e47);
  assert.equal(calls.ai[0].model, '@cf/black-forest-labs/flux-1-schnell');
  assert.match(calls.ai[0].input.prompt, /line art of a cat in a garden\. Simple shapes/);
  assert.equal(calls.ai[0].input.steps, 4);
  const b = await gen({ prompt: 'a dog' });
  assert.equal(b.remaining, 0);
  const c = await gen({ prompt: 'a third page' });
  assert.equal(c.status, 429);
  assert.equal(c.limitReached, true);
  assert.equal(c.reason, 'free_daily_cap', 'the page tells the visitor own limit from the shared pool');
  assert.equal(calls.openai, 0);
  assert.equal(calls.ai.length, 2);
});

test('free pages stop at the global daily cap and at the Workers AI daily ceiling', async () => {
  env = makeEnv({ FREE_GLOBAL_DAILY_LIMIT: '3' });
  for (let i = 0; i < 3; i++) assert.equal((await gen({ prompt: 'page ' + i }, '10.0.0.' + i)).status, 200);
  const over = await gen({ prompt: 'one more' }, '10.0.0.9');
  assert.equal(over.status, 429);
  assert.match(over.error, /free pages for today are all used/);

  L = makeLedger();
  env = makeEnv({ AI_DAILY_LIMIT: '2' });
  for (let i = 0; i < 2; i++) assert.equal((await gen({ prompt: 'page ' + i }, '10.1.0.' + i)).status, 200);
  assert.equal((await gen({ prompt: 'one more' }, '10.1.0.9')).status, 429);
  assert.equal(calls.ai.length, 5); // 3 + 2 drawn, the refused ones never reach Workers AI
  assert.equal(calls.openai, 0);
});

test('a failed drawing is not counted; a failed gray conversion sends the JPEG; FREE_ENGINE=off pauses free pages', async () => {
  aiFails = true;
  const r = await gen({ prompt: 'a castle' });
  assert.equal(r.status, 503);
  assert.equal(L.core.count(`free:ip:${DAY}:` + (await ipKey('1.1.1.1'))), 0);
  assert.equal(L.core.count(`ai:${DAY}`), 0);
  aiFails = false;
  imagesFail = true;
  const j = await gen({ prompt: 'a castle' });
  assert.equal(j.status, 200);
  assert.ok(j.imageUrl.startsWith('data:image/jpeg;base64,'));
  env = makeEnv({ FREE_ENGINE: 'off' });
  assert.equal((await gen({ prompt: 'a castle' }, '9.9.9.9')).status, 503);
  assert.equal(calls.openai, 0);
});
async function ipKey(ip) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`|${ip}`));
  return Buffer.from(d).toString('hex').slice(0, 32);
}

// --- Workers AI error 4006: the account's free neurons of the UTC day are gone ---
const NO_NEURONS = "AiError: 4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan if you would like to continue usage.";
const POOL_MESSAGE = "Today's free drawings are used up. They reset at midnight UTC (03:00 Turkey time).";

test('Workers AI 4006: a free visitor gets 429 with limitReached and the reset message, nothing is counted, and tomorrow-style retry works', async () => {
  aiFails = NO_NEURONS;
  const r = await gen({ prompt: 'a castle' });
  assert.equal(r.status, 429);
  assert.equal(r.limitReached, true);
  assert.equal(r.reason, 'ai_exhausted');
  assert.equal(r.error, POOL_MESSAGE);
  assert.doesNotMatch(r.error, /try again in a minute/i);
  assert.equal(calls.ai.length, 1);
  assert.equal(calls.openai, 0);
  // the free page of this visitor and the day's image count are given back
  assert.equal(L.core.count(`free:ip:${DAY}:` + (await ipKey('1.1.1.1'))), 0);
  assert.equal(L.core.count(`free:all:${DAY}`), 0);
  assert.equal(L.core.count(`ai:${DAY}`), 0);
  // once the allowance is back the same visitor still has both free pages
  aiFails = false;
  const ok = await gen({ prompt: 'a castle' });
  assert.equal(ok.status, 200);
  assert.equal(ok.remaining, 1);
});

test('Workers AI 4006 is recognised by its code as well as its text; other Workers AI errors keep the "busy" answer', async () => {
  aiFails = { code: 4006 };
  const byCode = await gen({ prompt: 'a castle' }, '2.2.2.2');
  assert.deepEqual([byCode.status, byCode.limitReached, byCode.reason], [429, true, 'ai_exhausted']);
  aiFails = 'AiError: 3040: capacity temporarily exceeded, please try again';
  const busy = await gen({ prompt: 'a castle' }, '3.3.3.3');
  assert.equal(busy.status, 503);
  assert.equal(busy.error, 'The drawing service is busy. Please try again in a minute.');
  assert.equal(busy.limitReached, undefined);
  assert.equal(busy.reason, undefined);
});

test('Workers AI 4006: a Pro standard page is answered the same way and the Pro page and image counts are given back', async () => {
  env = makeEnv({ HD_ENABLED: '0' });
  const token = await proToken();
  aiFails = NO_NEURONS;
  const r = await gen({ prompt: 'a dragon', token });
  assert.equal(r.status, 429);
  assert.equal(r.limitReached, true);
  assert.equal(r.reason, 'ai_exhausted');
  assert.equal(r.error, POOL_MESSAGE);
  assert.equal(L.core.count(`pro:${DAY}:sale-new`), 0);
  assert.equal(L.core.count(`ai:${DAY}`), 0);
  assert.equal(calls.openai, 0);
  // HD pages come from OpenAI, which 4006 does not touch
  env = makeEnv();
  const hd = await gen({ prompt: 'a dragon', token });
  assert.equal(hd.status, 200);
  assert.equal(hd.quality, 'hd');
});

test('the daily image budget defaults to 52 images and 30 free pages (172.8 neurons each, 90 percent of the free 10,000)', async () => {
  const cfg = config({});
  assert.equal(cfg.aiDaily, 52);
  assert.equal(cfg.freeGlobal, 30);
  assert.ok(cfg.aiDaily * 172.8 <= 0.9 * 10000);
  // the 31st free page of the day is refused with the shared-pool message of the global cap
  for (let i = 0; i < 30; i++) assert.equal((await gen({ prompt: 'page ' + i }, '10.2.0.' + i)).status, 200);
  const over = await gen({ prompt: 'one more' }, '10.2.1.1');
  assert.equal(over.status, 429);
  assert.equal(over.limitReached, true);
  assert.equal(over.reason, 'free_global_cap');
  assert.equal(calls.ai.length, 30);
});

test('the ledger spend counters carry the free pages of the day for the admin status', async () => {
  await gen({ prompt: 'one' }, '4.4.4.4');
  await gen({ prompt: 'two' }, '5.5.5.5');
  const sp = L.core.spend({ month: MONTH, day: DAY });
  assert.equal(sp.freeToday, 2);
  assert.equal(sp.aiToday, 2);
});

// The page code that shows the answer (views/index.ejs, views/niche.ejs): run the real generatePage() with a stub page.
function runGeneratePage(file, response, extra = {}) {
  const src = fs.readFileSync(path.join(root, 'views', file), 'utf8');
  const m = /async function generatePage\(\)\{[\s\S]*?\r?\n\}\r?\n/.exec(src);
  assert.ok(m, file + ' has generatePage()');
  assert.ok(!m[0].includes('<%'), 'generatePage() has no template tags');
  const els = {};
  const el = id => els[id] || (els[id] = { id, value: 'a unicorn', textContent: '', innerHTML: '', hidden: true, disabled: false, classes: new Set(),
    classList: { add: c => els[id].classes.add(c), remove: c => els[id].classes.delete(c), toggle() {}, contains: c => els[id].classes.has(c) } });
  const log = { alerts: [], modal: 0, nudge: [], spinnerWhenShown: [] };
  const ctx = {
    document: { getElementById: el }, alert: m2 => log.alerts.push(m2), openProModal: () => { log.modal++; },
    fetch: async () => ({ ok: response.status < 400, status: response.status, json: async () => response.body }),
    esc: t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'),
    selectedStyle: 'medium', proToken: extra.proToken || '', generatedImages: [], renderGallery() {}, persistImages() {}, updateCharCount() {},
    // the Pro offer card of views/partials/pro-nudge.ejs
    // (the spinner sits above the result: if it is still on when the card scrolls into view, removing it moves the card off the screen)
    cpmNudge: { show: kind => { log.nudge.push(kind); log.spinnerWhenShown.push(el('loadingArea').classes.has('active')); return true; } }
  };
  vm.createContext(ctx);
  vm.runInContext(m[0], ctx);
  return ctx.generatePage().then(() => ({ els, log, bar: el('usageBar'), btn: el('generateBtn') }));
}

test('the home page shows the 4006 message in the usage line, with no alert and no Pro window over it', async () => {
  const r = await runGeneratePage('index.ejs', { status: 429, body: { error: POOL_MESSAGE, limitReached: true, reason: 'ai_exhausted' } });
  assert.deepEqual(r.log.alerts, []);
  assert.equal(r.log.modal, 0);
  assert.ok(r.bar.innerHTML.startsWith(POOL_MESSAGE), r.bar.innerHTML);
  assert.match(r.bar.innerHTML, /data-open-pro/);
  assert.ok(r.bar.classes.has('is-alert'));
  assert.equal(r.btn.disabled, false);
  assert.equal(r.btn.textContent, 'Generate coloring page');
  // the other limits keep their Pro window, and a real failure still says so
  const cap = await runGeneratePage('index.ejs', { status: 429, body: { error: 'Daily limit reached (2 free pages per day). Upgrade to Pro for up to 150 a day.', limitReached: true } });
  assert.equal(cap.log.modal, 1);
  assert.deepEqual(cap.log.alerts, []);
  const busy = await runGeneratePage('index.ejs', { status: 503, body: { error: 'The drawing service is busy. Please try again in a minute.' } });
  assert.deepEqual(busy.log.alerts, ['The drawing service is busy. Please try again in a minute.']);
  // a good answer clears the alert look of an earlier message
  const ok = await runGeneratePage('index.ejs', { status: 200, body: { success: true, imageUrl: 'data:image/png;base64,AA', remaining: 1 } });
  assert.ok(!ok.bar.classes.has('is-alert'));
  assert.match(ok.bar.innerHTML, /1<\/strong> free pages left today/);
});

test('the other tool pages show a daily limit in the usage line, not in an alert', async () => {
  const lim = await runGeneratePage('niche.ejs', { status: 429, body: { error: POOL_MESSAGE, limitReached: true, reason: 'ai_exhausted' } });
  assert.deepEqual(lim.log.alerts, []);
  assert.equal(lim.bar.textContent, POOL_MESSAGE);
  assert.equal(lim.bar.hidden, false);
  assert.ok(lim.bar.classes.has('is-alert'));
  const busy = await runGeneratePage('niche.ejs', { status: 503, body: { error: 'The drawing service is busy. Please try again in a minute.' } });
  assert.deepEqual(busy.log.alerts, ['The drawing service is busy. Please try again in a minute.']);
  // the theme pages already put every answer, with a Pro link on a limit (never for a Pro buyer), into their usage line
  const theme = fs.readFileSync(path.join(root, 'views', 'theme.ejs'), 'utf8');
  assert.match(theme, /say\(data\.error \|\| '[^']*', !!data\.limitReached && !proToken, true\)/);
});

test('the Pro offer: home page keeps its window on a free limit, shows the reason, and never pitches a Pro buyer', async () => {
  const body = { error: 'Daily limit reached (2 free pages per day). Upgrade to Pro for up to 150 a day.', limitReached: true, reason: 'free_daily_cap' };
  const free = await runGeneratePage('index.ejs', { status: 429, body });
  assert.equal(free.log.modal, 1);
  assert.deepEqual(free.log.alerts, []);
  assert.ok(free.bar.classes.has('is-alert'), 'the reason is on the page when the window is closed');
  assert.ok(free.bar.innerHTML.startsWith('Daily limit reached (2 free pages per day)'), free.bar.innerHTML);
  assert.match(free.bar.innerHTML, /data-open-pro/);
  // a Pro buyer at the fair-use cap is told so, with no Pro window and no sales link
  const pro = await runGeneratePage('index.ejs', { status: 429, body: { error: 'Daily fair-use cap reached (150 pages). Resets at midnight UTC. Contact support if you need more.', limitReached: true, reason: 'pro_daily_cap' } }, { proToken: 'a'.repeat(64) });
  assert.equal(pro.log.modal, 0);
  assert.deepEqual(pro.log.alerts, []);
  assert.match(pro.bar.textContent, /^Daily fair-use cap reached/);
  assert.doesNotMatch(pro.bar.textContent, /Get Pro|See Pro/);
  assert.deepEqual(pro.log.nudge, []);
  // the last free page puts the offer under the result; a page with one left does not
  const last = await runGeneratePage('index.ejs', { status: 200, body: { success: true, imageUrl: 'data:image/png;base64,AA', remaining: 0 } });
  assert.deepEqual(last.log.nudge, ['last']);
  const one = await runGeneratePage('index.ejs', { status: 200, body: { success: true, imageUrl: 'data:image/png;base64,AA', remaining: 1 } });
  assert.deepEqual(one.log.nudge, []);
  // a Pro answer (remaining -1) never shows it
  const proOk = await runGeneratePage('index.ejs', { status: 200, body: { success: true, imageUrl: 'data:image/png;base64,AA', remaining: -1 } }, { proToken: 'a'.repeat(64) });
  assert.deepEqual(proOk.log.nudge, []);
});

test('the Pro offer: the other tool pages swap their dead-end limit line for the offer, except for a shared-pool message or a Pro buyer', async () => {
  const lim = (reason, extra) => runGeneratePage('niche.ejs', { status: 429, body: { error: 'x', limitReached: true, reason } }, extra);
  const refused = await lim('free_daily_cap');
  assert.deepEqual(refused.log.nudge, ['limit']);
  assert.deepEqual(refused.log.spinnerWhenShown, [false], 'the spinner is gone before the card scrolls into view');
  assert.deepEqual((await lim('free_global_cap')).log.nudge, ['pool']);
  assert.deepEqual((await lim('ai_exhausted')).log.nudge, []);
  assert.deepEqual((await lim('pro_daily_cap', { proToken: 'b'.repeat(64) })).log.nudge, []);
  const last = await runGeneratePage('niche.ejs', { status: 200, body: { success: true, imageUrl: 'data:image/png;base64,AA', remaining: 0 } });
  assert.deepEqual(last.log.nudge, ['last']);
  // the usage line keeps saying the reason in words
  const r = await lim('free_daily_cap');
  assert.equal(r.bar.textContent, 'x');
  assert.ok(r.bar.classes.has('is-alert'));
});

test('bad prompts are refused before anything is counted', async () => {
  assert.equal((await gen({ prompt: 'ab' })).status, 400);
  assert.equal((await gen({})).status, 400);
  const bad = await call('/generate', { method: 'POST', body: '{not json' });
  assert.equal(bad.status, 400);
  assert.equal(calls.ai.length, 0);
});

// --- Pro, HD and the hard spend cap ---
test('Pro gets HD pages from OpenAI while the HD allowance lasts, then standard pages', async () => {
  env = makeEnv({ HD_MONTHLY_ALLOWANCE: '2' });
  const token = await proToken();
  const q = [];
  for (let i = 0; i < 3; i++) q.push(await gen({ prompt: 'a dragon ' + i, token }));
  assert.deepEqual(q.map(r => [r.status, r.isPro, r.quality]), [[200, true, 'hd'], [200, true, 'hd'], [200, true, 'standard']]);
  assert.equal(calls.openai, 2);
  assert.equal(calls.ai.length, 1);
  assert.equal(L.core.spend({ month: MONTH, day: DAY }).monthMicros, 2 * 60000);
});

test('sales before HD_TERMS_FROM keep their terms: no HD allowance, only the shared caps', async () => {
  env = makeEnv({ HD_MONTHLY_ALLOWANCE: '1' });
  const token = await proToken({ created: '2026-09-20T08:00:00Z', sale: 'sale-old' });
  for (let i = 0; i < 3; i++) assert.equal((await gen({ prompt: 'a horse ' + i, token })).quality, 'hd');
  assert.equal(calls.openai, 3);
  const cfg = config({ HD_TERMS_FROM: '2026-10-21' });
  assert.equal(isLegacySale({ sale_created: '2026-10-20T23:59:59Z' }, cfg), true);
  assert.equal(isLegacySale({ sale_created: '2026-10-21T00:00:00Z' }, cfg), false);
  assert.equal(isLegacySale({ sale_created: '', legacy: false }, cfg), true);
});

test('the monthly and daily spend caps are hard: OpenAI is never called past them, even with parallel requests', async () => {
  env = makeEnv({ HD_COST_USD: '0.06', HD_MONTHLY_CAP_USD: '0.2', HD_DAILY_CAP_USD: '5', HD_MONTHLY_ALLOWANCE: '1000' });
  const token = await proToken({ created: '2026-09-01T00:00:00Z', sale: 'sale-busy' });
  const all = await Promise.all(Array.from({ length: 12 }, (_, i) => gen({ prompt: 'parallel page ' + i, token })));
  assert.equal(calls.openai, 3); // 3 x 0.06 = 0.18 <= 0.20 < 0.24
  assert.equal(all.filter(r => r.quality === 'hd').length, 3);
  assert.equal(all.filter(r => r.quality === 'standard').length, 9);
  const s = L.core.spend({ month: MONTH, day: DAY });
  assert.ok(s.monthMicros <= 200000, 'month spend ' + s.monthMicros);

  L = makeLedger();
  calls.openai = 0;
  env = makeEnv({ HD_COST_USD: '0.06', HD_MONTHLY_CAP_USD: '9', HD_DAILY_CAP_USD: '0.13', HD_MONTHLY_ALLOWANCE: '1000' });
  const t2 = await proToken({ created: '2026-09-01T00:00:00Z', sale: 'sale-busy2' });
  for (let i = 0; i < 4; i++) await gen({ prompt: 'daily page ' + i, token: t2 });
  assert.equal(calls.openai, 2);
});

test('OpenAI errors: a refusal is refunded, a lost answer stays reserved, a moderation refusal is final', async () => {
  const token = await proToken({ created: '2026-09-01T00:00:00Z', sale: 'sale-err' });
  openaiReply = () => new Response(JSON.stringify({ error: { message: 'server busy' } }), { status: 500 });
  const a = await gen({ prompt: 'a ship', token });
  assert.equal(a.quality, 'standard');
  assert.equal(L.core.spend({ month: MONTH, day: DAY }).monthMicros, 0);

  openaiReply = () => { throw new Error('socket hang up'); };
  const b = await gen({ prompt: 'a ship', token });
  assert.equal(b.quality, 'standard');
  assert.equal(L.core.spend({ month: MONTH, day: DAY }).monthMicros, 60000);

  openaiReply = () => new Response(JSON.stringify({ error: { message: 'Your request was rejected by the safety system.', code: 'moderation_blocked' } }), { status: 400 });
  const before = L.core.count(`pro:${DAY}:sale-err`);
  const c = await gen({ prompt: 'something not allowed', token });
  assert.equal(c.status, 400);
  assert.match(c.error, /safety system/);
  assert.equal(L.core.count(`pro:${DAY}:sale-err`), before);
  assert.equal(L.core.spend({ month: MONTH, day: DAY }).monthMicros, 60000);
});

test('without an OpenAI key or with HD_ENABLED=0 Pro pages are standard; the Pro daily cap holds', async () => {
  env = makeEnv({ OPENAI_API_KEY: '', PRO_DAILY_LIMIT: '2' });
  const token = await proToken();
  assert.equal((await gen({ prompt: 'a car', token })).quality, 'standard');
  assert.equal((await gen({ prompt: 'a car', token })).quality, 'standard');
  const capped = await gen({ prompt: 'a car', token });
  assert.equal(capped.status, 429);
  assert.match(capped.error, /Daily fair-use cap reached \(2 pages\)/);
  assert.equal(capped.reason, 'pro_daily_cap', 'a Pro buyer at the cap is not shown the Pro offer');
  env = makeEnv({ HD_ENABLED: '0' });
  const t2 = await proToken({ sale: 'sale-x' });
  assert.equal((await gen({ prompt: 'a car', token: t2 })).quality, 'standard');
  assert.equal(calls.openai, 0);
});

// --- Pro tokens ---
test('verify-pro: license key to token, token check, sign-out, refund through the Gumroad ping', async () => {
  const token = await proToken({ sale: 'sale-life' });
  assert.match(token, /^[a-f0-9]{64}$/);
  const check = async () => (await (await call('/verify-pro', { method: 'POST', body: { token } })).json()).pro;
  assert.equal(await check(), true);
  assert.equal((await (await call('/verify-pro', { method: 'POST', body: { license_key: 'WRONG' } })).json()).pro, false);
  assert.equal((await (await call('/verify-pro', { method: 'POST', body: { email: 'buyer@example.com' } })).json()).pro, false);

  gumroad['KEY-sale-life'].refunded = true;
  const ping = await call('/gumroad-webhook', { method: 'POST', body: 'license_key=KEY-sale-life&sale_id=sale-life', ct: 'application/x-www-form-urlencoded' });
  assert.equal(ping.status, 200);
  assert.equal(await check(), false);
  assert.equal((await call('/gumroad-webhook', { method: 'POST', body: 'license_key=FORGED', ct: 'application/x-www-form-urlencoded' })).status, 401);

  const t2 = await proToken({ sale: 'sale-out' });
  await call('/pro-signout', { method: 'POST', body: { token: t2 } });
  assert.equal((await (await call('/verify-pro', { method: 'POST', body: { token: t2 } })).json()).pro, false);
});

test('a token from the old server is asked there once, then remembered as an older sale', async () => {
  env = makeEnv({ LEGACY_VERIFY_URL: 'https://old.test', HD_MONTHLY_ALLOWANCE: '0' });
  const old = 'a'.repeat(64);
  legacyReply = { pro: true };
  const r = await gen({ prompt: 'a unicorn', token: old });
  assert.equal(r.isPro, true);
  assert.equal(r.quality, 'hd'); // older sale: no allowance
  await gen({ prompt: 'a unicorn', token: old });
  assert.equal(calls.legacy, 1);
  const unknown = 'b'.repeat(64);
  legacyReply = { pro: false };
  assert.equal((await gen({ prompt: 'a unicorn', token: unknown })).isPro, false);
  assert.equal((await gen({ prompt: 'a unicorn', token: unknown }, '2.2.2.2')).isPro, false);
  assert.equal(calls.legacy, 2);
});

// --- PDFs ---
function checkPdf(buf) {
  const s = buf.toString('latin1');
  assert.ok(s.startsWith('%PDF-1.4'));
  assert.ok(s.trimEnd().endsWith('%%EOF'));
  const start = Number(/startxref\n(\d+)/.exec(s)[1]);
  assert.equal(s.slice(start, start + 4), 'xref');
  const offs = [...s.slice(start).matchAll(/^(\d{10}) 00000 n $/gm)].map(m => Number(m[1]));
  offs.forEach((o, i) => assert.equal(s.slice(o, o + `${i + 1} 0 obj`.length), `${i + 1} 0 obj`));
  return s;
}

test('download-pdf: free = first page with the watermark; Pro = every page, no watermark', async () => {
  const free = await call('/download-pdf', { method: 'POST', body: { imageUrls: [dataUrl(PNG), dataUrl(PNG)] } });
  assert.equal(free.status, 200);
  assert.equal(free.headers.get('content-type'), 'application/pdf');
  assert.match(free.headers.get('content-disposition'), /^attachment; filename="coloring-book-\d+\.pdf"$/);
  const fs1 = checkPdf(Buffer.from(await free.arrayBuffer()));
  assert.equal((fs1.match(/\/Type \/Page /g) || []).length, 1);
  assert.ok(fs1.includes('FREE PREVIEW. Not for resale.'));

  const token = await proToken();
  const pro = await call('/download-pdf', { method: 'POST', body: { imageUrls: [dataUrl(PNG), dataUrl(JPEG, 'jpeg')], token } });
  const ps = checkPdf(Buffer.from(await pro.arrayBuffer()));
  assert.equal((ps.match(/\/Type \/Page /g) || []).length, 2);
  assert.ok(!ps.includes('FREE PREVIEW'));
  assert.ok(ps.includes('/Filter /DCTDecode') && ps.includes('/Width 48 /Height 32'));
});

test('download-pdf refuses web addresses, WebP, mislabeled and broken images', async () => {
  const post = async imageUrls => (await call('/download-pdf', { method: 'POST', body: { imageUrls } })).status;
  assert.equal(await post([]), 400);
  assert.equal(await post(['https://evil.test/a.png']), 400);
  assert.equal(await post([dataUrl(JPEG, 'png')]), 400);
  assert.equal(await post([dataUrl(PNG.subarray(0, 60))]), 400);
  const webp = Buffer.concat([Buffer.from('RIFF\x10\x00\x00\x00WEBPVP8 ', 'latin1'), Buffer.alloc(8)]);
  assert.equal(await post([dataUrl(webp, 'webp')]), 415);
});

test('every example PNG on the site (palette, 4 bit) goes into a valid PDF', () => {
  const dir = path.join(root, 'public', 'examples');
  const files = [];
  for (const d of fs.readdirSync(dir)) for (const f of fs.readdirSync(path.join(dir, d))) if (f.endsWith('.png')) files.push(path.join(dir, d, f));
  assert.ok(files.length >= 80);
  for (const f of files) {
    const img = decodePdfImage(dataUrl(fs.readFileSync(f)));
    assert.ok(img.buffer, f + ' ' + img.error);
    checkPdf(buildPdf([img], { watermark: true }));
  }
});

// --- ledger ---
test('ledger: counters expire, purge removes old rows, a failed check reserves nothing', () => {
  let t = Date.parse('2026-10-20T10:00:00Z');
  const db = new DatabaseSync(':memory:');
  const exec = (q, ...p) => { const st = db.prepare(q); return /^\s*SELECT/i.test(q) ? st.all(...p) : (st.run(...p), []); };
  const core = new LedgerCore(exec, fn => fn(), () => t);
  const hold = { saleKey: 's', legacy: false, month: '2026-10', day: '2026-10-20', costMicros: 60000, monthlyCapMicros: 100000, dailyCapMicros: 100000, allowance: 5 };
  assert.equal(core.reserveHd(hold).ok, true);
  const no = core.reserveHd(hold);
  assert.deepEqual(no, { ok: false, reason: 'hd_monthly_cap' });
  assert.equal(core.count('hd:usd:m:2026-10'), 60000);
  assert.equal(core.count('hd:n:2026-10:s'), 1);
  t += 3 * 24 * 3600 * 1000;
  assert.equal(core.count('hd:usd:d:2026-10-20'), 0);
  core.purge();
  assert.equal(exec('SELECT COUNT(*) AS n FROM counters WHERE k = ?', 'hd:usd:d:2026-10-20')[0].n, 0);
  assert.equal(core.count('hd:usd:m:2026-10'), 60000);
});

// --- the privacy page against the Worker ---
// views/privacy.ejs says where visitor data goes, how long it stays and who runs the site. These tests read the production
// config and the Worker and fail when one of them moves without the other (a new store, a new outbound address, a changed
// retention, the previous server switched off).
const privacyArticle = () => fs.readFileSync(path.join(root, 'views', 'privacy.ejs'), 'utf8').match(/<article[\s\S]*<\/article>/)[0];
const privacyText = () => privacyArticle().replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ');
const prodConfig = () => JSON.parse(fs.readFileSync(path.join(root, 'cloudflare', 'wrangler.production.jsonc'), 'utf8').replace(/^\s*\/\/.*$/gm, ''));

test('privacy page: names the host and the services the production Worker really uses', () => {
  const t = privacyText();
  const prod = prodConfig();
  assert.match(t, /The site runs on Cloudflare/);
  assert.doesNotMatch(t, /site runs on Vercel|connected through Vercel|Upstash Redis/);
  // drawing: Workers AI with the free model, OpenAI only for Pro HD pages
  assert.ok(prod.ai && prod.ai.binding === 'AI');
  assert.match(FLUX_MODEL, /flux-1-schnell/);
  assert.match(t, /Workers AI/);
  assert.match(t, /FLUX\.1 \[schnell\]/);
  assert.match(t, /Pro pages in high quality \(HD\) are drawn by OpenAI/);
  assert.equal(prod.vars.HD_TERMS_FROM, '2026-10-21');
  assert.match(t, /for purchases from 21 October 2026, while your monthly HD allowance lasts/);
  assert.match(t, /Free pages, and Pro pages in standard quality, are drawn by Workers AI/);
  assert.ok(prod.images && prod.images.binding === 'IMAGES');
  assert.match(t, /Cloudflare Images/);
  // storage: the two Durable Objects and nothing else; a new kind of store needs a new sentence on the page
  assert.deepEqual(prod.durable_objects.bindings.map(b => b.name).sort(), ['LEDGER', 'PINS']);
  for (const k of ['kv_namespaces', 'd1_databases', 'r2_buckets', 'analytics_engine_datasets', 'queues', 'hyperdrive', 'vectorize']) assert.equal(prod[k], undefined, k + ' is not mentioned on the privacy page');
  assert.match(t, /Durable Object with SQLite storage/);
  assert.ok(prod.observability && prod.observability.enabled === true);
  assert.match(t, /Workers Logs/);
  // the previous server: asked for old Pro tokens while LEGACY_VERIFY_URL is set
  assert.match(prod.vars.LEGACY_VERIFY_URL, /vercel\.app/);
  assert.match(t, /previous server, which still runs on Vercel/);
  assert.match(t, /Upstash/);
  assert.match(t, /Pinterest/);
});

test('privacy page: the meta description (search result and share card) names the drawing services the Worker really uses', () => {
  const src = fs.readFileSync(path.join(root, 'views', 'privacy.ejs'), 'utf8');
  const desc = src.match(/var desc = '([^']+)'/)[1];
  assert.ok(prodConfig().ai.binding === 'AI' && /flux-1-schnell/.test(FLUX_MODEL));
  assert.match(desc, /Workers AI/);
  assert.match(desc, /OpenAI/);
  assert.doesNotMatch(desc, /sent to OpenAI|counted by IP address/);
  assert.ok(desc.length <= 200, 'the description stays short enough for a search result');
});

test('privacy page: every address the Worker code calls is one the page names', () => {
  // a call to fetch(...), not the handler's own `async fetch(request, ...)` and not env.ASSETS.fetch(...)
  const calls = s => [...s.matchAll(/(?<![.\w])(?<!async )fetch\(\s*([^,)]+)/g)].map(m => m[1].trim());
  assert.deepEqual(calls(fs.readFileSync(path.join(root, 'cloudflare', 'worker.js'), 'utf8')), [
    "'https://api.gumroad.com/v2/licenses/verify'", "cfg.legacyUrl + '/verify-pro'", "cfg.openaiBase + '/images/generations'"
  ]);
  for (const f of ['ledger.js', 'ledger-core.js', 'flux.js', 'pdf.js', 'index.js']) assert.deepEqual(calls(fs.readFileSync(path.join(root, 'cloudflare', f), 'utf8')), [], f);
  for (const f of ['service.js', 'routes.js', 'store.js', 'tick.js', 'core.js', 'feed.js']) assert.deepEqual(calls(fs.readFileSync(path.join(root, 'cloudflare', 'autopin', f), 'utf8')), [], 'autopin/' + f);
  const t = privacyText();
  assert.match(t, /api\.gumroad\.com/);
  assert.match(t, /OpenAI/);
});

test('privacy page: the free counter is kept under a salted hash of the IP address, never the address', async () => {
  env = makeEnv({ IP_SALT: 'salt-one' });
  assert.equal((await gen({ prompt: 'a lighthouse' }, '203.0.113.77')).status, 200);
  const keys = L.core.exec('SELECT k FROM counters').map(r => r.k);
  assert.ok(keys.some(k => /^free:ip:\d{4}-\d{2}-\d{2}:[0-9a-f]{32}$/.test(k)), keys.join(' '));
  assert.ok(!keys.some(k => k.includes('203.0.113.77')), 'the address is not a key');
  const other = makeLedger();
  L = other;
  env = makeEnv({ IP_SALT: 'salt-two' });
  await gen({ prompt: 'a lighthouse' }, '203.0.113.77');
  assert.notDeepEqual(other.core.exec('SELECT k FROM counters').map(r => r.k).sort(), keys.sort(), 'another salt gives another hash');
  assert.match(privacyText(), /one-way hash, mixed with a secret value that only we hold/);
});

test('privacy page: counters are deleted about two days after their last change, the monthly HD count after about 40, tokens after 400', () => {
  let t = Date.parse('2026-10-20T10:00:00Z');
  const db = new DatabaseSync(':memory:');
  const exec = (q, ...p) => { const st = db.prepare(q); return /^\s*SELECT/i.test(q) ? st.all(...p) : (st.run(...p), []); };
  const core = new LedgerCore(exec, fn => fn(), () => t);
  const H = 3600 * 1000;
  core.takeFree({ ipKey: 'k', day: '2026-10-20', perIp: 2, globalFree: 30, aiDaily: 52 });
  core.takePro({ saleKey: 's', day: '2026-10-20', perDay: 150 });
  core.reserveHd({ saleKey: 's', legacy: false, month: '2026-10', day: '2026-10-20', costMicros: 1, monthlyCapMicros: 10, dailyCapMicros: 10, allowance: 5 });
  t += 47 * H;
  assert.equal(core.count('free:ip:2026-10-20:k'), 1);
  assert.equal(core.count('pro:2026-10-20:s'), 1);
  t += 2 * H;
  assert.equal(core.count('free:ip:2026-10-20:k'), 0, 'gone after 2 days');
  assert.equal(core.count('pro:2026-10-20:s'), 0);
  t += 37 * 24 * H;
  assert.equal(core.count('hd:n:2026-10:s'), 1, 'still there after about 39 days');
  t += 2 * 24 * H;
  assert.equal(core.count('hd:n:2026-10:s'), 0, 'gone after 40 days');
  assert.equal(TOKEN_TTL_MS, 400 * 24 * H);
  const text = privacyText();
  assert.match(text, /deleted automatically about two days after they were last changed/);
  assert.match(text, /deleted about 40 days after it was last changed/);
  assert.match(text, /about 400 days/);
});

test('privacy page: only the token goes to the previous server, only the drawing request goes to OpenAI', async () => {
  const seen = [];
  const inner = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => { seen.push({ url: String(url), headers: Object.keys(init.headers || {}).map(h => h.toLowerCase()).sort(), body: init.body }); return inner(url, init); };
  env = makeEnv({ LEGACY_VERIFY_URL: 'https://old.example' });
  const oldToken = 'a'.repeat(64);
  const r = await gen({ prompt: 'a barn', token: oldToken }, '203.0.113.5');
  assert.equal(r.status, 200);
  const legacy = seen.find(x => x.url === 'https://old.example/verify-pro');
  assert.ok(legacy, 'the previous server is asked about an unknown token');
  assert.deepEqual(Object.keys(JSON.parse(legacy.body)), ['token']);
  assert.deepEqual(legacy.headers, ['content-type']);
  assert.ok(!legacy.body.includes('203.0.113.5'));

  seen.length = 0;
  const token = await proToken({ created: '2026-09-01T00:00:00Z', sale: 'sale-priv' });
  await gen({ prompt: 'a barn', token }, '203.0.113.6');
  const oa = seen.find(x => x.url.endsWith('/images/generations'));
  assert.ok(oa, 'a Pro HD page goes to OpenAI');
  assert.deepEqual(oa.headers, ['authorization', 'content-type']);
  assert.ok(!oa.body.includes('203.0.113.6'));
  assert.deepEqual(Object.keys(JSON.parse(oa.body)).sort(), ['background', 'model', 'n', 'output_format', 'prompt', 'quality', 'size']);
  // a free page never reaches OpenAI
  seen.length = 0;
  await gen({ prompt: 'a barn' }, '203.0.113.7');
  assert.equal(seen.filter(x => x.url.endsWith('/images/generations')).length, 0);
});

test('privacy page: the Worker never writes a description or an image to its logs, on success or on any failure', async () => {
  const secret = 'zq-secret-description-7431';
  const lines = [];
  const keep = { log: console.log, error: console.error, warn: console.warn };
  for (const k of Object.keys(keep)) console[k] = (...a) => lines.push(a.map(x => (typeof x === 'string' ? x : JSON.stringify(x))).join(' '));
  try {
    await gen({ prompt: secret }, '9.9.9.1');
    aiFails = true;
    await gen({ prompt: secret }, '9.9.9.2');
    aiFails = { code: 4006 };
    await gen({ prompt: secret }, '9.9.9.3');
    aiFails = false;
    imagesFail = true;
    await gen({ prompt: secret }, '9.9.9.4');
    imagesFail = false;
    const token = await proToken({ created: '2026-09-01T00:00:00Z', sale: 'sale-log' });
    await gen({ prompt: secret, token });
    openaiReply = () => new Response(JSON.stringify({ error: { message: 'server busy' } }), { status: 500 });
    await gen({ prompt: secret, token });
    openaiReply = () => { throw new Error('socket hang up'); };
    await gen({ prompt: secret, token });
    openaiReply = () => new Response(JSON.stringify({ error: { message: 'Your request was rejected by the safety system.', code: 'moderation_blocked' } }), { status: 400 });
    await gen({ prompt: secret, token });
    await call('/generate', { method: 'POST', body: '{not json' });
  } finally { Object.assign(console, keep); }
  assert.ok(lines.length > 0, 'the failures do write technical lines');
  assert.deepEqual(lines.filter(l => l.includes(secret)), []);
  assert.deepEqual(lines.filter(l => /base64|data:image/.test(l)), []);
});

test('privacy page: plain text, dated like the sitemap, no characters the style rules forbid', () => {
  const article = privacyArticle();
  assert.doesNotMatch(article, /[—–→←✓✔✅✗✨]/);
  const m = /Last updated: (\d{1,2}) (\w+) (\d{4})/.exec(article);
  assert.ok(m, 'a last updated line');
  const shown = new Date(`${m[1]} ${m[2]} ${m[3]} UTC`).toISOString().slice(0, 10);
  const serverJs = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  assert.equal(/const PRIVACY_UPDATED = '(\d{4}-\d{2}-\d{2})'/.exec(serverJs)[1], shown, 'the sitemap date is the date on the page');
});
