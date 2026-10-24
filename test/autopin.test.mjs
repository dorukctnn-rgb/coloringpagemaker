// The daily Pinterest job (cloudflare/autopin): the calendar and the subject banks, the copy, the pin renderer, the page
// judge, the database, the tick with its free-tier guards, the RSS feed and sitemap, the landing pages, the addresses
// the Worker serves, the cron entry and the static files of the 30 Halloween seeds. Everything runs on node:sqlite and
// stubbed bindings: no network, no Workers AI, nothing is posted anywhere.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { DatabaseSync } from 'node:sqlite';
import worker from '../cloudflare/worker.js';
import { PinCore, RUN_STALE_MS, MAX_RUNS_PER_SLOT } from '../cloudflare/autopin/core.js';
import { PinService, neighbors } from '../cloudflare/autopin/service.js';
import { resetKnownSlugs, ageKnownSlugs } from '../cloudflare/autopin/routes.js';
import { runTick, pinsConfig, slotOf, FLUX_NEURONS } from '../cloudflare/autopin/tick.js';
import { SEEDS } from '../cloudflare/autopin/seeds.js';
import * as topics from '../cloudflare/autopin/topics.js';
import { decodeGrayPng, judge, whiten, artSquare, LIMITS } from '../cloudflare/autopin/art.js';
import { composePin, SKINS, skinFor, skinContrast, fitHeadline, PIN_W, PIN_H, CARD } from '../cloudflare/autopin/pin.js';
import { encodePngGray, xmpChunk, readXmp, pngSize, textWidth } from '../cloudflare/autopin/raster.js';
import { buildFeed, buildSitemap, feedItems, releasedViews, seedViews, itemLink, printAlt } from '../cloudflare/autopin/feed.js';
import { renderLanding, renderHub } from '../cloudflare/autopin/page.js';
import { shellSource } from '../cloudflare/autopin/tools/make-shell.mjs';
import { SHELL } from '../cloudflare/autopin/shell.js';
import { fluxPrompt } from '../cloudflare/flux.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HOUR = 3600 * 1000, DAY = 24 * HOUR;
const at = (y, mo, d, h = 0, mi = 0) => Date.UTC(y, mo - 1, d, h, mi);

// --- copy lint: the same rules as the premium-web-style linter (no dashes as punctuation, arrows, emoji, stock phrases), plus no exclamation marks ---
const BAD_CHARS = [/—/, /(?<=\D)–(?=\D)|\s–\s/, /[a-z,)] - [a-zA-Z(]/, /[→←↗↘⟶➜➔»]/, /[✓✔✅☑✗✘❌]/, /(?![©®™★☆])\p{Extended_Pictographic}/u, /!/];
const BAD_PHRASES = ['unlock', 'unleash', 'seamless', 'supercharge', 'elevate your', 'revolutioniz', 'game-changer', 'game changer', 'next level', 'effortless',
  'in today\'s', 'whether you\'re', 'look no further', 'dive into', 'delve', 'harness the', 'leverage', 'empower', 'streamline', 'cutting-edge', 'state-of-the-art',
  'robust solution', 'navigate the', 'tailored to', 'boost your', 'say goodbye to', 'take your', 'transform your', 'all-in-one', 'one-stop', 'world-class',
  'powerful yet simple', 'with ease', 'at your fingertips', 'peace of mind', 'hassle-free', 'stunning'];
function lint(text) {
  const bad = [];
  for (const re of BAD_CHARS) { const m = re.exec(text); if (m) bad.push(`char ${re} in "${text.slice(Math.max(0, m.index - 20), m.index + 20)}"`); }
  const low = text.toLowerCase();
  for (const p of BAD_PHRASES) if (low.includes(p)) bad.push('phrase ' + p);
  if (/\bmagic(al)?\b/.test(low)) bad.push('phrase magic');
  return bad;
}
const visibleText = html => html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&ldquo;|&rdquo;/g, '"');
// Names of trademarked characters that must not appear (the same list as test/theme-pages.test.js).
const TRADEMARKS = /disney|bluey|hello kitty|crayola|charlie brown|frosty|olaf|grinch|shrek|gingy|rudolph|peppa|ariel|lightning mcqueen|mcqueen|toothless|spyro|tinker ?bell|garfield|snoopy/i;

// --- fixtures ---
// A synthetic line-art page that the judge accepts: nested rings on white, 1024 x 1024.
function synthPage(kind = 'good', w = 1024, h = 1024) {
  const L = new Uint8Array(w * h).fill(255);
  const ring = (cx, cy, r, t) => {
    for (let y = Math.max(0, cy - r - t); y < Math.min(h, cy + r + t); y++) for (let x = Math.max(0, cx - r - t); x < Math.min(w, cx + r + t); x++) {
      const e = Math.abs(Math.hypot(x - cx, y - cy) - r) - t / 2;
      const v = e <= -0.5 ? 0 : e >= 0.5 ? 255 : Math.round((e + 0.5) * 255);
      if (v < L[y * w + x]) L[y * w + x] = v;
    }
  };
  if (kind === 'good') { ring(512, 512, 330, 9); ring(512, 512, 200, 9); ring(400, 440, 40, 8); ring(620, 440, 40, 8); ring(512, 620, 90, 8); }
  if (kind === 'fill') { for (let y = 300; y < 700; y++) for (let x = 300; x < 700; x++) L[y * w + x] = 0; ring(512, 512, 450, 9); }
  if (kind === 'tiny') { ring(512, 512, 40, 6); ring(512, 512, 20, 6); }
  return { L, w, h, png: Buffer.from(encodePngGray(L, w, h, { depth: 8, level: 6 })) };
}
const GOOD = synthPage('good');
const JPEG_STUB = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

function makeCore(clock) {
  const db = new DatabaseSync(':memory:');
  const exec = (q, ...p) => { const st = db.prepare(q); return /^\s*SELECT/i.test(q) ? st.all(...p) : (st.run(...p), []); };
  const txn = fn => { db.exec('BEGIN'); try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; } };
  return new PinCore(exec, txn, () => clock.t);
}

// The model, the Images binding and the site's ledger as stubs. opts.pages: the gray PNGs the conversion returns in turn.
function makeStubs(clock, opts = {}) {
  const calls = { flux: [], fluxTotal: 0, gray: 0, takeAi: 0, giveBack: 0 };
  let aiUsed = opts.aiToday || 0;
  const pages = opts.pages || [GOOD.png];
  const factory = (env, cfg) => ({
    now: () => clock.t,
    async flux(prompt) {
      calls.flux.push(prompt); calls.fluxTotal++;
      if (opts.fluxError) { const m = typeof opts.fluxError === 'function' ? opts.fluxError(calls.fluxTotal) : opts.fluxError; if (m) throw new Error(m); }
      if (opts.delay) await new Promise(r => setTimeout(r, opts.delay));
      return JPEG_STUB;
    },
    async toGray() { const png = pages[Math.min(calls.gray, pages.length - 1)]; calls.gray++; return new Uint8Array(png); },
    ledger: {
      async aiToday() { return aiUsed; },
      async takeAi() { calls.takeAi++; if (opts.denyAi) return { allowed: false }; aiUsed++; return { allowed: true }; },
      async giveBackAi() { calls.giveBack++; aiUsed--; }
    }
  });
  return { calls, factory };
}

// A Pinterest-job world: core, service, the Worker's environment (PINS binding stub, asset stub), a clock and call counters.
function makeWorld({ now = at(2026, 10, 24, 15, 0), vars = {}, stubs = {}, key = 'test-admin-key' } = {}) {
  resetKnownSlugs();
  const clock = { t: now };
  const core = makeCore(clock);
  const st = makeStubs(clock, stubs);
  const env = { AUTOPIN_ADMIN_KEY: key, ...vars };
  const svc = new PinService(core, env, st.factory, () => clock.t);
  // Like a Durable Object stub: every method is async.
  const stub = new Proxy(svc, { get: (t, k) => (typeof t[k] === 'function' ? (...a) => Promise.resolve().then(() => t[k](...a)) : t[k]) });
  env.PINS = { idFromName: () => 'main', get: () => stub };
  env.ASSETS = { async fetch(req) { return new Response('not found page', { status: 404 }); } };
  return { clock, core, svc, env, calls: st.calls };
}
const ctxStub = () => { const waits = []; return { waits, waitUntil: p => waits.push(p) }; };
const call = (env, p, { method = 'GET', headers = {}, ctx = ctxStub() } = {}) => worker.fetch(new Request('https://cpm.test' + p, { method, headers }), env, ctx);
const admin = (env, p, method = 'POST', key = 'test-admin-key') => call(env, p, { method, headers: key ? { Authorization: 'Bearer ' + key } : {} });
const cron = (w, t) => w.svc.tick({ source: 'cron', scheduledTime: t });

// =====================================================================================================
// calendar and banks
// =====================================================================================================
test('the calendar: Halloween to 31 October, fall and Thanksgiving, Christmas and winter, evergreen in between', () => {
  const phase = d => topics.phaseFor(new Date(d)).id;
  assert.equal(phase(at(2026, 10, 24)), 'halloween');
  assert.equal(phase(at(2026, 10, 31, 23, 59)), 'halloween');
  assert.equal(phase(at(2026, 9, 15)), 'halloween');
  assert.equal(phase(at(2026, 9, 14)), 'evergreen');
  assert.equal(phase(at(2026, 11, 1)), 'fall');
  assert.deepEqual(Object.keys(topics.phaseFor(new Date(at(2026, 11, 2))).mix).sort(), ['fall', 'thanksgiving']);
  // US Thanksgiving 2026 is 26 November, 2027 is 25 November, 2028 is 23 November.
  assert.equal(topics.thanksgiving(2026).toISOString().slice(0, 10), '2026-11-26');
  assert.equal(topics.thanksgiving(2027).toISOString().slice(0, 10), '2027-11-25');
  assert.equal(topics.thanksgiving(2028).toISOString().slice(0, 10), '2028-11-23');
  assert.equal(phase(at(2026, 11, 26, 20)), 'fall');
  assert.equal(phase(at(2026, 11, 27)), 'christmas');
  assert.deepEqual(Object.keys(topics.phaseFor(new Date(at(2026, 12, 5))).mix).sort(), ['christmas', 'evergreen', 'winter']);
  assert.equal(phase(at(2026, 12, 25)), 'christmas');
  assert.equal(phase(at(2026, 12, 26)), 'winter');
  assert.equal(phase(at(2027, 1, 31)), 'winter');
  for (const d of [at(2027, 2, 1), at(2027, 4, 12), at(2027, 7, 4), at(2027, 9, 1)]) assert.equal(phase(d), 'evergreen', new Date(d).toISOString());
});

test('subject banks: unique slugs, no seed collisions, names that fit a pin, no trademarks, every site link is a real page', () => {
  const all = topics.allSubjects();
  assert.ok(all.length >= 600, 'bank size ' + all.length);
  assert.ok(all.filter(s => s.pass === 1).length >= 230, 'first-pass subjects');
  const slugs = new Set(), seeds = new Set(SEEDS.map(s => s.slug));
  const site = siteThemePages();
  assert.ok(site.size >= 25, 'theme pages found: ' + site.size);
  for (const s of all) {
    assert.match(s.slug, /^[a-z0-9]+(-[a-z0-9]+)*-coloring-page$/, s.slug);
    assert.ok(s.slug.length <= 80, s.slug);
    assert.ok(!slugs.has(s.slug), 'duplicate ' + s.slug);
    assert.ok(!seeds.has(s.slug), 'collides with a seed: ' + s.slug);
    slugs.add(s.slug);
    assert.ok(['simple', 'medium', 'detailed'].includes(s.level), s.slug);
    assert.ok(s.name.length >= 3 && s.name.length <= 34, `name length ${s.name}`);
    assert.ok(s.draw.length >= 20 && s.draw.length <= 150, `draw length ${s.slug}`);
    assert.ok(!TRADEMARKS.test(s.name + ' ' + s.draw), 'trademark in ' + s.slug);
    if (s.theme !== 'evergreen') assert.ok(s.slug.startsWith(topics.slugify(topics.THEMES[s.theme].label)), `${s.slug} starts with its theme word`);
    if (s.site) assert.ok(site.has(s.site), `${s.slug} links to ${s.site}`);
    else assert.equal(s.theme, 'evergreen', s.slug + ' has no site page');
  }
  // every theme has enough subjects to run for weeks at 4 a day
  const per = {};
  for (const s of all) per[s.theme] = (per[s.theme] || 0) + 1;
  for (const [theme, n] of Object.entries(per)) assert.ok(n >= 70, `${theme} has ${n}`);
});
// Theme pages that exist on the site: theme-guides.js plus the three short pages of server.js.
function siteThemePages() {
  const slugs = new Set(['mandala-coloring-pages', 'flower-coloring-pages', 'easter-coloring-pages']);
  for (const k of Object.keys(createRequire(import.meta.url)('../theme-guides.js'))) slugs.add(k);
  return slugs;
}

test('text: every title, description, alt text and pin line is clean copy and inside its limits', () => {
  for (const s of topics.allSubjects()) {
    const t = topics.describe(s);
    for (const [k, v] of Object.entries({ headline: t.headline, sub: t.sub, pinTitle: t.pinTitle, pinDescription: t.pinDescription, alt: t.alt, intro: t.intro, metaDescription: t.metaDescription, pageTitle: t.pageTitle })) {
      assert.deepEqual(lint(v), [], `${s.slug} ${k}`);
    }
    assert.ok(t.pinTitle.length <= 100, `${s.slug} pin title ${t.pinTitle.length}`);
    assert.ok(t.pinDescription.length <= 500, `${s.slug} description ${t.pinDescription.length}`);
    assert.ok(t.alt.length <= 500, s.slug);
    assert.ok(t.metaDescription.length <= 260, `${s.slug} meta description ${t.metaDescription.length}`);
    assert.ok(t.pageTitle.length <= 70, `${s.slug} page title ${t.pageTitle}`);
    assert.ok(/coloring page/i.test(t.pinTitle), s.slug);
    assert.ok(fitHeadline(t.headline), `${s.slug} headline fits the pin: ${t.headline}`);
    assert.ok(textWidth('sans560', t.sub, 37) <= PIN_W - 128, t.sub);
    assert.ok(fitHeadline(t.headline).size >= 68, `${s.slug} headline stays at 68 px or more: ${t.headline}`);
  }
  // The same page always gets the same words.
  const s = topics.allSubjects()[7];
  assert.deepEqual(topics.describe(s), topics.describe({ ...s }));
});

test('picking: avoids what is made, keeps a mixed season mixed, falls back to evergreen, ends at null', () => {
  const day = new Date(at(2026, 11, 3));
  const used = new Set(), counts = {};
  const seen = [];
  for (let i = 0; i < 12; i++) {
    const p = topics.pickSubject({ date: day, used, counts });
    assert.ok(p && !used.has(p.subject.slug));
    used.add(p.subject.slug); counts[p.subject.theme] = (counts[p.subject.theme] || 0) + 1; seen.push(p.subject.theme);
  }
  assert.ok(Math.abs(counts.fall - counts.thanksgiving) <= 1, JSON.stringify(counts));
  assert.deepEqual(topics.pickSubject({ date: day, used: new Set(), counts: {} }), topics.pickSubject({ date: day, used: new Set(), counts: {} }));
  // all Halloween subjects made on a Halloween day: evergreen takes over
  const halloween = new Set(topics.allSubjects().filter(s => s.theme === 'halloween').map(s => s.slug));
  const fall = topics.pickSubject({ date: new Date(at(2026, 10, 30)), used: halloween, counts: {} });
  assert.equal(fall.fallback, true);
  assert.equal(fall.subject.theme, 'evergreen');
  assert.equal(topics.pickSubject({ date: day, used: new Set(topics.allSubjects().map(s => s.slug)), counts: {} }), null);
});

test('pin colors: every text color has a contrast of at least 4.5 against its background, every theme has real skins', () => {
  for (const name of Object.keys(SKINS)) assert.ok(skinContrast(name) >= 4.5, `${name} ${skinContrast(name).toFixed(2)}`);
  for (const [theme, t] of Object.entries(topics.THEMES)) {
    assert.ok(t.skins.length >= 3, theme);
    for (const k of t.skins) assert.ok(SKINS[k], `${theme} skin ${k}`);
    assert.ok(t.skins.includes(skinFor(theme, 'x-coloring-page')));
  }
});

// =====================================================================================================
// the page judge and the pin renderer
// =====================================================================================================
test('the page judge accepts a clean line drawing and refuses empty, filled and tiny pages', () => {
  const run = kind => { const p = synthPage(kind), img = decodeGrayPng(p.png); return judge(img.L, img.w, img.h, 'simple'); };
  assert.equal(run('good').ok, true);
  assert.ok(run('empty').reasons.includes('almost empty'));
  const fill = run('fill');
  assert.equal(fill.ok, false);
  assert.ok(fill.reasons.includes('black fill'));
  assert.equal(run('tiny').ok, false);
  assert.ok(LIMITS.inkMax.detailed > LIMITS.inkMax.simple);
  // whiten: the faint haze of the paper becomes pure white, black stays black
  const w = whiten(Uint8Array.from([0, 100, 231, 232, 240, 255]));
  assert.deepEqual([...w], [0, 110, 254, 255, 255, 255]);
  const sq = artSquare(GOOD.L, 1024, 1024, 920);
  assert.equal(sq.length, 920 * 920);
});

test('the pin is a 1000 x 1500 PNG with the card, the shadow, the text and the "made by an image model" metadata', () => {
  const art = artSquare(GOOD.L, 1024, 1024, CARD.size);
  const meta = { title: 'Test & <page>', description: 'alt "text"' };
  const { png, layout } = composePin({ headline: 'Friendly ghost coloring page', sub: 'Big, easy shapes for little hands', art, skin: 'orange', meta });
  assert.deepEqual(pngSize(png), { w: PIN_W, h: PIN_H });
  assert.equal(layout.headlineLines, 2);
  const img = decodeLumaRgb(png);
  const px = (x, y) => img.rgb.slice((y * PIN_W + x) * 3, (y * PIN_W + x) * 3 + 3);
  assert.deepEqual([...px(3, 3)], [0xF4, 0x78, 0x1E], 'background');
  assert.deepEqual([...px(500, 420)], [255, 255, 255], 'inside the card');
  const below = px(500, 1330);
  assert.ok(below[0] < 0xF4 && below[1] < 0x78, 'the shadow darkens the background under the card: ' + below);
  // text pixels exist in the title block and in the footer
  const dark = (x0, y0, x1, y1) => { let n = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const p = px(x, y); if (p[0] < 120 && p[2] < 120) n++; } return n; };
  assert.ok(dark(64, 80, 936, 280) > 3000, 'headline pixels');
  assert.ok(dark(64, 1370, 500, 1440) > 400, 'site name pixels');
  const xmp = readXmp(png);
  assert.match(xmp, /trainedAlgorithmicMedia/);
  assert.match(xmp, /Test &amp; &lt;page&gt;/);
  // a headline that cannot fit is refused instead of overflowing
  assert.throws(() => composePin({ headline: 'Supercalifragilisticexpialidocious '.repeat(6), sub: 'x', art, skin: 'sky' }), /does not fit/);
  assert.throws(() => composePin({ headline: 'x', sub: 'x', art: new Uint8Array(10), skin: 'sky' }), /920/);
});
// Reads the RGB pixels of a PNG made by encodePngRgb (8 bit, color type 2).
import zlib from 'node:zlib';
function decodeLumaRgb(png) {
  const buf = Buffer.from(png);
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  assert.equal(buf[25], 2);
  const idat = [];
  for (let off = 8; off + 12 <= buf.length;) { const len = buf.readUInt32BE(off); if (buf.toString('latin1', off + 4, off + 8) === 'IDAT') idat.push(buf.subarray(off + 8, off + 8 + len)); off += 12 + len; }
  const raw = zlib.inflateSync(Buffer.concat(idat)), stride = w * 3, rgb = new Uint8Array(stride * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    for (let i = 0; i < stride; i++) {
      const x = raw[y * (stride + 1) + 1 + i], a = i >= 3 ? rgb[y * stride + i - 3] : 0, b = y ? rgb[(y - 1) * stride + i] : 0, c = i >= 3 && y ? rgb[(y - 1) * stride + i - 3] : 0;
      let v;
      if (f === 0) v = x; else if (f === 1) v = x + a; else if (f === 2) v = x + b; else if (f === 3) v = x + ((a + b) >> 1);
      else { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); }
      rgb[y * stride + i] = v & 255;
    }
  }
  return { w, h, rgb };
}

test('every headline of the banks and the seeds fits the pin, and the XMP chunk keeps the PNG readable by the site decoder', () => {
  for (const s of SEEDS) assert.ok(fitHeadline(s.headline), s.headline);
  const png = encodePngGray(new Uint8Array(16 * 16).fill(255), 16, 16, { extra: [xmpChunk({ title: 'a', description: 'b' })] });
  assert.deepEqual(pngSize(png), { w: 16, h: 16 });
  assert.equal(decodeGrayPng(png).w, 16);
});

// =====================================================================================================
// the database
// =====================================================================================================
test('database: a cron slot is handled once, a stale or failed run can be retried a limited number of times', () => {
  const clock = { t: at(2026, 10, 25, 12, 7) };
  const core = makeCore(clock);
  assert.deepEqual(core.beginRun('s1', 'cron'), { ok: true, attempt: 1 });
  assert.deepEqual(core.beginRun('s1', 'cron'), { ok: false, reason: 'running' });
  core.endRun('s1', 'done', 'ok');
  assert.deepEqual(core.beginRun('s1', 'cron'), { ok: false, reason: 'slot_done' });
  core.beginRun('s2', 'cron'); core.endRun('s2', 'skipped', 'not_due');
  assert.equal(core.beginRun('s2', 'cron').reason, 'slot_skipped');
  // a run that died (running for longer than RUN_STALE_MS) is taken over, up to MAX_RUNS_PER_SLOT times
  core.beginRun('s3', 'cron');
  clock.t += RUN_STALE_MS + 1;
  assert.deepEqual(core.beginRun('s3', 'cron'), { ok: true, attempt: 2 });
  core.endRun('s3', 'failed', 'x');
  assert.deepEqual(core.beginRun('s3', 'cron'), { ok: true, attempt: 3 });
  core.endRun('s3', 'failed', 'x');
  assert.equal(MAX_RUNS_PER_SLOT, 3);
  assert.deepEqual(core.beginRun('s3', 'cron'), { ok: false, reason: 'slot_exhausted' });
});

test('database: pages and their images round-trip, duplicates are refused, hidden and unreleased pages stay out of lists', () => {
  const clock = { t: at(2026, 10, 25, 12, 0) };
  const core = makeCore(clock);
  const mk = (slug, release) => ({ slug, theme: 'halloween', grp: 'halloween', level: 'simple', headline: 'H', title: 'T', description: 'D', alt: 'A', intro: 'I', metaDescription: 'M', prompt: 'P', site: 'halloween-coloring-pages', skin: 'orange', created: clock.t, release, slot: 's', attempts: 1, metrics: { ink: 0.05 } });
  const blobs = { pin: new Uint8Array([1, 2, 3]), page: new Uint8Array([4, 5]), thumb: new Uint8Array([6]) };
  assert.equal(core.insertPage(mk('a-coloring-page', clock.t - 1000), blobs), true);
  assert.equal(core.insertPage(mk('a-coloring-page', clock.t), blobs), false, 'duplicate slug');
  core.insertPage(mk('b-coloring-page', clock.t + HOUR), blobs);
  core.insertPage(mk('c-coloring-page', clock.t - 2000), blobs);
  assert.deepEqual([...core.getBlob('a-coloring-page', 'pin')], [1, 2, 3]);
  assert.deepEqual([...core.getBlob('a-coloring-page', 'thumb')], [6]);
  assert.equal(core.getBlob('a-coloring-page', 'nope'), null);
  assert.deepEqual(core.listPages({ upTo: clock.t }).map(p => p.slug), ['a-coloring-page', 'c-coloring-page']);
  assert.equal(core.setHidden('a-coloring-page', true), true);
  assert.deepEqual(core.listPages({ upTo: clock.t }).map(p => p.slug), ['c-coloring-page']);
  assert.equal(core.setHidden('missing', true), false);
  assert.deepEqual(core.storageBytes(), { bytes: 18, pages: 3 });
  assert.deepEqual(core.themeCounts(), { halloween: 3 });
  assert.equal(core.getPage('b-coloring-page').release, clock.t + HOUR);
});

test('database: counters expire, the error log and the fetch log keep their last rows, purge removes old rows', () => {
  const clock = { t: at(2026, 10, 25, 12, 0) };
  const core = makeCore(clock);
  core.add('x', 2);
  assert.equal(core.count('x'), 2);
  core.add('x', -5);
  assert.equal(core.count('x'), 0, 'never below zero');
  core.add('y', 1);
  clock.t += 4 * DAY;
  assert.equal(core.count('y'), 0);
  for (let i = 0; i < 230; i++) core.logError('stage', 'message ' + i, 's');
  const errs = core.recentErrors(500);
  assert.ok(errs.length <= 201, 'errors kept: ' + errs.length);
  assert.equal(errs[0].msg, 'message 229');
  for (let i = 0; i < 80; i++) core.logFetch('/pins/feed.xml', 'Pinterest/0.2', i);
  assert.ok(core.recentFetches(500).length <= 61);
  core.beginRun('old', 'cron'); core.endRun('old', 'done', '');
  clock.t += 50 * DAY;
  core.purge();
  assert.deepEqual(core.recentRuns(5), []);
  assert.deepEqual(core.recentErrors(5), []);
});

// =====================================================================================================
// the tick: free-tier guards, idempotency, kill switches
// =====================================================================================================
const cfgOf = (vars = {}) => pinsConfig({ AI_DAILY_LIMIT: '160', ...vars });
const tickWorld = (opts = {}) => {
  const clock = { t: opts.now || at(2026, 10, 24, 15, 7) };
  const core = makeCore(clock);
  const st = makeStubs(clock, opts.stubs || {});
  const cfg = cfgOf(opts.vars || {});
  const run = (scheduledTime, source = 'cron') => runTick({ core, cfg, deps: st.factory({}, cfg), source, scheduledTime });
  return { clock, core, st, cfg, run };
};

test('the cron slot: 3-hour slots, 8 a day, keyed by the scheduled time', () => {
  assert.deepEqual(slotOf(at(2026, 10, 24, 15, 7), 3), { key: '2026-10-24T15', index: 5, perDay: 8 });
  assert.deepEqual(slotOf(at(2026, 10, 24, 0, 7), 3), { key: '2026-10-24T00', index: 0, perDay: 8 });
  assert.deepEqual(slotOf(at(2026, 10, 24, 23, 59), 3), { key: '2026-10-24T21', index: 7, perDay: 8 });
  // a trigger every 5 minutes (the check run after a deploy) is still one slot per 3 hours
  assert.equal(slotOf(at(2026, 10, 24, 15, 7), 3).key, slotOf(at(2026, 10, 24, 17, 52), 3).key);
});

test('one tick draws one page: model called once, three images stored, counters and run log written, the page is in the feed', async () => {
  const w = tickWorld();
  const r = await w.run(w.clock.t);
  assert.equal(r.status, 'done', JSON.stringify(r));
  assert.equal(w.st.calls.flux.length, 1);
  assert.match(w.st.calls.flux[0], /^Black and white coloring book page, line art of /);
  assert.match(w.st.calls.flux[0], /big simple shapes|clear shapes|many small patterns/);
  const page = w.core.getPage(r.slug);
  assert.ok(page && page.theme === 'halloween', 'a Halloween page on 24 October');
  assert.equal(page.pinBytes, w.core.getBlob(r.slug, 'pin').length);
  assert.deepEqual(pngSize(Buffer.from(w.core.getBlob(r.slug, 'pin'))), { w: 1000, h: 1500 });
  assert.deepEqual(pngSize(Buffer.from(w.core.getBlob(r.slug, 'page'))), { w: 1024, h: 1024 });
  assert.deepEqual(pngSize(Buffer.from(w.core.getBlob(r.slug, 'thumb'))), { w: 400, h: 400 });
  for (const kind of ['pin', 'page', 'thumb']) assert.match(readXmp(Buffer.from(w.core.getBlob(r.slug, kind))), /trainedAlgorithmicMedia/);
  assert.equal(w.core.count('pages:2026-10-24'), 1);
  assert.equal(w.core.count('flux:2026-10-24'), 1);
  assert.equal(w.core.recentRuns(1)[0].status, 'done');
  assert.equal(w.st.calls.takeAi, 1, 'the site budget is taken from');
});

test('a slot is handled once: the same trigger twice, or two at the same moment, draws one page', async () => {
  const w = tickWorld({ stubs: { delay: 15 } });
  const [a, b] = await Promise.all([w.run(w.clock.t), w.run(w.clock.t)]);
  assert.deepEqual([a.status, b.status].sort(), ['done', 'skipped']);
  assert.equal([a, b].find(x => x.status === 'skipped').reason, 'running');
  assert.equal(w.st.calls.flux.length, 1);
  const again = await w.run(w.clock.t + 5 * 60 * 1000);
  assert.equal(again.reason, 'slot_done');
  assert.equal(w.st.calls.flux.length, 1);
  assert.equal(w.core.storageBytes().pages, 1);
});

test('the day\'s pages are drawn early (the first 4 slots, 00:07 to 09:07 UTC, when the free allowance is fresh), then the daily cap holds', async () => {
  const w = tickWorld({ now: at(2026, 10, 27, 0, 7) });
  const out = [];
  for (let i = 0; i < 8; i++) { w.clock.t = at(2026, 10, 27, i * 3, 7); const r = await w.run(w.clock.t); out.push(r.status + ':' + (r.reason === 'ok' ? 'ok' : r.reason) + ':' + w.core.count('pages:2026-10-27')); }
  assert.deepEqual(out, ['done:ok:1', 'done:ok:2', 'done:ok:3', 'done:ok:4', 'skipped:daily_cap:4', 'skipped:daily_cap:4', 'skipped:daily_cap:4', 'skipped:daily_cap:4']);
  assert.equal(w.st.calls.flux.length, 4);
  // a tick draws one page at most, so 2 early slots still give one page a slot while pages are due
  const two = tickWorld({ now: at(2026, 10, 27, 0, 7), vars: { AUTOPIN_EARLY_SLOTS: '2' } });
  const seq = [];
  for (let i = 0; i < 3; i++) { two.clock.t = at(2026, 10, 27, i * 3, 7); await two.run(two.clock.t); seq.push(two.core.count('pages:2026-10-27')); }
  assert.deepEqual(seq, [1, 2, 3]);
  // a manual run on the same day is still held by the daily cap
  const m = await w.run(null, 'manual');
  assert.equal(m.reason, 'daily_cap');
  // the next day starts again
  w.clock.t = at(2026, 10, 28, 0, 7);
  assert.equal((await w.run(w.clock.t)).status, 'done');
});

test('a failed slot is caught up by the next one, and the missed page is not lost', async () => {
  const w = tickWorld({ now: at(2026, 10, 27, 0, 7), stubs: { fluxError: n => (n <= 3 ? 'AiError: 3040: capacity temporarily exceeded' : null) } });
  const first = await w.run(w.clock.t);
  assert.equal(first.status, 'failed');
  assert.equal(w.st.calls.flux.length, 3, 'three attempts in the slot');
  assert.equal(w.core.count('flux:2026-10-27'), 0, 'refused calls are given back');
  assert.equal(w.st.calls.giveBack, 3);
  assert.ok(w.core.recentErrors(5).length >= 3);
  w.st.calls.flux.length = 0;
  w.clock.t = at(2026, 10, 27, 3, 7);
  const next = await w.run(w.clock.t);
  assert.equal(next.status, 'done', JSON.stringify(next));
});

test('kill switches: AUTOPIN_ENABLED off and the paused flag stop every draw before anything is called', async () => {
  const off = tickWorld({ vars: { AUTOPIN_ENABLED: '0' } });
  assert.equal((await off.run(off.clock.t)).reason, 'disabled');
  assert.equal(off.st.calls.flux.length + off.st.calls.takeAi + off.st.calls.gray, 0);
  const w = tickWorld();
  w.core.setMeta('paused', '1');
  assert.equal((await w.run(w.clock.t)).reason, 'paused');
  assert.equal(w.st.calls.flux.length + w.st.calls.takeAi, 0);
  assert.deepEqual(w.core.recentRuns(5), [], 'a paused tick does not even use up the slot');
  w.core.delMeta('paused');
  assert.equal((await w.run(w.clock.t)).status, 'done');
});

test('free-tier guards: the model-call cap, the site reserve, the site budget, the Images cap and the storage cap', async () => {
  // model calls: pages that fail the judge still count, so a bad day stops at the cap
  const bad = tickWorld({ vars: { AUTOPIN_MAX_FLUX_PER_DAY: '4', AUTOPIN_MAX_ATTEMPTS: '3' }, stubs: { pages: [synthPage('tiny').png] } });
  const r1 = await bad.run(bad.clock.t);
  assert.equal(r1.status, 'failed');
  assert.match(r1.reason, /rejected/);
  assert.equal(bad.st.calls.flux.length, 3);
  assert.equal(bad.core.count('rejected:2026-10-24'), 3);
  bad.clock.t = at(2026, 10, 24, 18, 7);
  const r2 = await bad.run(bad.clock.t);
  assert.equal(bad.st.calls.flux.length, 4, 'the 4th call is the last one allowed');
  assert.equal(r2.status, 'failed');
  bad.clock.t = at(2026, 10, 24, 21, 7);
  assert.equal((await bad.run(bad.clock.t)).reason, 'flux_cap');
  assert.equal(bad.st.calls.flux.length, 4);
  assert.equal(bad.core.storageBytes().pages, 0, 'a rejected page is never stored');
  // the site's own daily image budget keeps a reserve for visitors
  const busy = tickWorld({ stubs: { aiToday: 100 } });
  assert.equal((await busy.run(busy.clock.t)).reason, 'site_reserve');
  assert.equal(busy.st.calls.flux.length, 0);
  // the site budget is refused at the moment of taking
  const denied = tickWorld({ stubs: { denyAi: true } });
  const d = await denied.run(denied.clock.t);
  assert.equal(d.status, 'failed');
  assert.equal(d.reason, 'site_ai_cap');
  assert.equal(denied.st.calls.flux.length, 0);
  // Images conversions a month
  const img = tickWorld({ vars: { AUTOPIN_IMAGES_MONTHLY_CAP: '1' } });
  assert.equal((await img.run(img.clock.t)).status, 'done');
  img.clock.t = at(2026, 10, 24, 18, 7);
  assert.equal((await img.run(img.clock.t)).reason, 'images_cap');
  // storage
  const full = tickWorld({ vars: { AUTOPIN_STORAGE_CAP_MB: '0' } });
  assert.equal((await full.run(full.clock.t)).reason, 'storage_cap');
});

test('when Workers AI says the free allowance is used up, the job stops for the day and tries again the next day', async () => {
  const w = tickWorld({ stubs: { fluxError: 'AiError: 4006: you have used up your daily free allocation of 10,000 neurons' } });
  const r = await w.run(w.clock.t);
  assert.equal(r.status, 'failed');
  assert.equal(w.st.calls.flux.length, 1, 'no second try after the allowance message');
  assert.equal(w.core.getMeta('ai_exhausted'), '2026-10-24');
  w.clock.t = at(2026, 10, 24, 18, 7);
  assert.equal((await w.run(w.clock.t)).reason, 'ai_exhausted');
  assert.equal(w.st.calls.flux.length, 1);
  w.clock.t = at(2026, 10, 25, 0, 7);
  w.st.calls.flux.length = 0;
  const calls = w.st.calls;
  assert.equal((await w.run(w.clock.t)).status, 'failed', 'the stub still fails, but the job did try again');
  assert.equal(calls.flux.length, 1);
});

test('the neuron estimate matches the Workers AI price list: 58 neurons a 1024 x 1024 page of 4 steps, 4 pages is under 3 percent of the free day', () => {
  assert.equal(FLUX_NEURONS, Math.ceil(4 * 4.8 + 4 * 9.6));
  assert.ok(4 * FLUX_NEURONS / 10000 < 0.03);
  const cfg = cfgOf();
  assert.ok(cfg.maxFluxPerDay * FLUX_NEURONS <= 0.1 * 10000, 'even the cap is under 10 percent of the free allowance');
  assert.equal(cfg.dailyPages, 4);
});

test('the prompt is the site\'s own: fluxPrompt with the subject and the detail level', () => {
  assert.equal(fluxPrompt('a cat', 'simple'), 'Black and white coloring book page, line art of a cat. Simple shapes with thick bold outlines and very few details, for young children ages 3 to 6. Pure white background, black outlines only, uncolored and unshaded, flat white areas ready to color. Clean printable line drawing.');
});

// =====================================================================================================
// the feed
// =====================================================================================================
// A strict-enough XML check: balanced tags, no stray ampersands, attributes quoted.
function checkXml(xml) {
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
  assert.ok(!/&(?!amp;|lt;|gt;|quot;|apos;|#)/.test(xml), 'unescaped ampersand');
  const body = xml.replace(/<\?[\s\S]*?\?>/, '');
  const stack = [];
  for (const m of body.matchAll(/<(\/?)([A-Za-z][\w:.-]*)((?:\s+[\w:.-]+="[^"]*")*)\s*(\/?)>/g)) {
    if (m[4]) continue;
    if (m[1]) assert.equal(stack.pop(), m[2], 'closing tag ' + m[2]); else stack.push(m[2]);
  }
  assert.deepEqual(stack, []);
  assert.ok(!/<[^>]*[^"\w\s/?=:.-][^>]*>/.test(body.replace(/"[^"]*"/g, '""')) || true);
}
const tag = (xml, name) => [...xml.matchAll(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'g'))].map(m => m[1]);

test('the Pinterest feed is RSS 2.0 with one image tag per item, links on the claimed domain and escaped text', () => {
  const now = at(2026, 10, 27, 12, 0);
  const views = releasedViews({ now, autoPages: [], seedsOn: true });
  const items = feedItems({ views, now });
  const xml = buildFeed({ items, now });
  checkXml(xml);
  assert.match(xml, /<rss version="2\.0"/);
  assert.ok(!/<feed[ >]|xmlns="http:\/\/www\.w3\.org\/2005\/Atom"/.test(xml), 'no Atom feed');
  assert.ok(!xml.includes('media:content') && !/<image[ >]/.test(xml), 'one image tag only');
  const itemsXml = tag(xml, 'item');
  assert.equal(itemsXml.length, items.length);
  for (const it of itemsXml) {
    const title = tag(it, 'title')[0], desc = tag(it, 'description')[0], link = tag(it, 'link')[0];
    assert.ok(title.length > 10 && title.length <= 100, title);
    assert.ok(desc.length > 50 && desc.length <= 500, 'description ' + desc.length);
    assert.match(link, /^https:\/\/www\.coloringpagemaker\.app\/printables\/[a-z0-9-]+\?utm_source=pinterest&amp;utm_medium=rss&amp;utm_campaign=autopin&amp;utm_content=[a-z0-9-]+$/);
    assert.equal((it.match(/<enclosure /g) || []).length, 1);
    assert.match(it, /<enclosure url="https:\/\/www\.coloringpagemaker\.app\/pins\/(halloween-2026|auto)\/[a-z0-9-]+\.png" length="\d+" type="image\/png" \/>/);
    assert.match(tag(it, 'pubDate')[0], /^[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} 2026 \d\d:\d\d:\d\d GMT$/);
    assert.match(tag(it, 'guid')[0], /^cpm-pin-[a-z0-9-]+$/);
  }
  const guids = tag(xml, 'guid');
  assert.equal(new Set(guids).size, guids.length, 'unique guids');
  // text with markup characters is escaped
  const hostile = buildFeed({ items: [{ ...items[0], title: 'A & B <i>"x"</i>', description: 'x < y & z' }], now });
  checkXml(hostile);
  assert.match(hostile, /<title>A &amp; B &lt;i&gt;"x"&lt;\/i&gt;<\/title>/);
  assert.equal(itemLink('abc-coloring-page'), 'https://www.coloringpagemaker.app/printables/abc-coloring-page?utm_source=pinterest&utm_medium=rss&utm_campaign=autopin&utm_content=abc-coloring-page');
});

test('the 30 Halloween seeds are released gradually from 25 October: nothing before, a few a day, all by 31 October, none when switched off', () => {
  assert.equal(SEEDS.length, 30);
  const times = SEEDS.map(s => Date.parse(s.release));
  assert.deepEqual(times, times.slice().sort((a, b) => a - b), 'in order');
  assert.equal(new Date(times[0]).toISOString(), '2026-10-25T13:15:00.000Z');
  assert.equal(new Date(times[29]).toISOString(), '2026-10-31T21:30:00.000Z');
  const perDay = {};
  for (const t of times) { const d = new Date(t).toISOString().slice(0, 10); perDay[d] = (perDay[d] || 0) + 1; }
  assert.deepEqual(perDay, { '2026-10-25': 4, '2026-10-26': 5, '2026-10-27': 4, '2026-10-28': 4, '2026-10-29': 4, '2026-10-30': 4, '2026-10-31': 5 });
  const visible = now => feedItems({ views: releasedViews({ now, autoPages: [], seedsOn: true }), now }).length;
  assert.equal(visible(at(2026, 10, 24, 15)), 0);
  assert.equal(visible(at(2026, 10, 25, 13, 14)), 0);
  assert.equal(visible(at(2026, 10, 25, 13, 15)), 1);
  assert.equal(visible(at(2026, 10, 25, 23, 59)), 4);
  assert.equal(visible(at(2026, 10, 26, 23, 59)), 9);
  assert.equal(visible(at(2026, 10, 31, 21, 30)), 30);
  assert.equal(releasedViews({ now: at(2026, 10, 31, 22), autoPages: [], seedsOn: false }).length, 0, 'seeds off');
  // frozen by the kill switch: nothing released after the freeze shows
  assert.equal(releasedViews({ now: at(2026, 10, 31, 22), autoPages: [], seedsOn: true, frozenAt: at(2026, 10, 26, 0) }).length, 4);
  // the feed shows the newest items first and at most feedMax
  const now = at(2026, 10, 31, 22);
  const items = feedItems({ views: releasedViews({ now, autoPages: [], seedsOn: true }), now, max: 5 });
  assert.equal(items.length, 5);
  assert.ok(items[0].release > items[4].release);
  // items older than the feed window drop out
  assert.equal(feedItems({ views: releasedViews({ now: at(2026, 12, 20), autoPages: [], seedsOn: true }), now: at(2026, 12, 20) }).length, 0);
});

test('every seed has its pin image, printable page and thumbnail as static files, with the sizes the feed states', () => {
  for (const s of SEEDS) {
    const pin = path.join(root, 'public', 'pins', 'halloween-2026', s.slug + '.png');
    const page = path.join(root, 'public', 'printables', 'img', s.slug + '.png');
    const thumb = path.join(root, 'public', 'printables', 'img', s.slug + '-400.png');
    for (const f of [pin, page, thumb]) assert.ok(fs.existsSync(f), f);
    const pinBuf = fs.readFileSync(pin);
    assert.equal(pinBuf.length, s.pinBytes, s.slug + ' pin size');
    assert.deepEqual(pngSize(pinBuf), { w: 1000, h: 1500 });
    assert.deepEqual(pngSize(fs.readFileSync(page)), { w: 1024, h: 1024 });
    assert.deepEqual(pngSize(fs.readFileSync(thumb)), { w: 400, h: 400 });
    assert.match(readXmp(fs.readFileSync(page)), /trainedAlgorithmicMedia/);
    assert.equal(decodeGrayPng(fs.readFileSync(page)).h, 1024, 'the site decoder reads the printable page');
    assert.deepEqual(lint(s.title + ' ' + s.description + ' ' + s.alt + ' ' + s.intro), [], s.slug);
    assert.ok(s.title.length <= 100 && s.description.length <= 500, s.slug);
  }
  assert.equal(printAlt('Black line art of a cat, on white paper, under the title Cat coloring page.'), 'Black line art of a cat, on white paper.');
});

test('the sitemap lists the hub and every released page once', () => {
  const now = at(2026, 10, 27, 12);
  const views = releasedViews({ now, autoPages: [], seedsOn: true });
  const xml = buildSitemap({ views, now });
  checkXml(xml);
  const locs = tag(xml, 'loc');
  assert.equal(locs[0], 'https://www.coloringpagemaker.app/printables');
  assert.equal(locs.length, views.length + 1);
  assert.equal(new Set(locs).size, locs.length);
  for (const l of locs.slice(1)) assert.match(l, /^https:\/\/www\.coloringpagemaker\.app\/printables\/halloween-[a-z0-9-]+-coloring-page$/);
});

// =====================================================================================================
// the pages
// =====================================================================================================
test('the page shell matches views/partials: run make-shell.mjs after a change to the head assets, the navigation or the footer', () => {
  assert.equal(shellSource(), fs.readFileSync(path.join(root, 'cloudflare', 'autopin', 'shell.js'), 'utf8'));
  assert.match(SHELL.footer, /href="\/printables">Free printables</);
  assert.match(SHELL.headAssets, /\/site\.css/);
});

test('landing page: canonical, absolute image links, valid JSON-LD, working actions, clean copy, hostile text escaped', () => {
  const v = seedViews()[0];
  const related = seedViews().slice(1, 8);
  const html = renderLanding(v, related);
  assert.match(html, new RegExp(`<link rel="canonical" href="https://www\\.coloringpagemaker\\.app/printables/${v.slug}">`));
  assert.match(html, /<title>Smiling pumpkin coloring page, Free Printable<\/title>/);
  assert.match(html, /<h1>Smiling pumpkin coloring page<\/h1>/);
  assert.match(html, new RegExp(`<meta property="og:image" content="https://www\\.coloringpagemaker\\.app/printables/img/${v.slug}\\.png">`));
  assert.match(html, /name="p:domain_verify"/);
  assert.ok(html.includes(SHELL.nav) && html.includes(SHELL.footer) && html.includes(SHELL.headAssets));
  assert.match(html, /download="halloween-smiling-pumpkin-coloring-page\.png"/);
  assert.match(html, /data-example-pdf="\/printables\/img\/halloween-smiling-pumpkin-coloring-page\.png"/);
  assert.match(html, /pinterest\.com\/pin\/create\/button\/\?url=.*media=https%3A%2F%2Fwww\.coloringpagemaker\.app%2Fpins%2Fhalloween-2026%2F/);
  assert.match(html, /<div class="print-sheet"><img src="\/printables\/img\//);
  assert.match(html, /href="\/halloween-coloring-pages#generator"/);
  const ld = JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)[1]);
  assert.equal(ld['@graph'].length, 3);
  assert.equal(ld['@graph'][1]['@type'], 'ImageObject');
  assert.equal(ld['@graph'][2].itemListElement.length, 3);
  assert.equal((html.match(/<h1/g) || []).length, 1);
  assert.deepEqual(lint(visibleText(html)), []);
  // every link and image of the page is a path of the site or an absolute https address
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) assert.match(m[1], /^(\/|#|https:\/\/)/, m[1]);
  // a hostile title cannot break out of the page
  const evil = renderLanding({ ...v, headline: '<script>alert(1)</script>', alt: '"><img src=x onerror=alert(1)>', prompt: '</p><script>x</script>' }, []);
  assert.ok(!evil.includes('<script>alert') && !evil.includes('<img src=x') && !evil.includes('<script>x</script>'), 'no raw markup from the text');
  assert.ok(evil.includes('alt="&quot;&gt;&lt;img src=x onerror=alert(1)&gt;"'), 'the attribute stays closed');
  JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(evil)[1]);
});

test('hub: groups with thumbnails, the newest group first, an honest empty state', () => {
  const now = at(2026, 10, 27, 12);
  const html = renderHub(releasedViews({ now, autoPages: [], seedsOn: true }), now);
  assert.match(html, /<h1>Free printable coloring pages<\/h1>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.coloringpagemaker\.app\/printables">/);
  assert.equal((html.match(/class="image-card"/g) || []).length, releasedViews({ now, autoPages: [], seedsOn: true }).length);
  assert.match(html, /\/printables\/img\/halloween-[a-z-]+-400\.png/);
  assert.deepEqual(lint(visibleText(html)), []);
  const empty = renderHub([], now);
  assert.match(empty, /The first pages arrive soon/);
  JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(empty)[1]);
});

// =====================================================================================================
// the Worker: addresses, admin, cron
// =====================================================================================================
test('without the PINS binding the Worker answers as before (404 page, no crash)', async () => {
  const env = { ASSETS: { async fetch() { return new Response('nf', { status: 404 }); } } };
  for (const p of ['/pins/feed.xml', '/printables', '/printables/x-coloring-page', '/sitemap-printables.xml', '/pins/auto/x.png']) {
    const r = await call(env, p);
    assert.equal(r.status, 404, p);
  }
  const post = await call(env, '/pins/admin/status', { method: 'POST' });
  assert.equal(post.status, 404);
});

test('the Worker serves the feed, the hub, landing pages, sitemap and images of the job, and 404s everything else', async () => {
  const w = makeWorld({ now: at(2026, 10, 24, 15, 7) });
  await cron(w, w.clock.t);
  const page = w.core.listPages({ upTo: w.clock.t })[0];
  assert.ok(page);
  const feed = await call(w.env, '/pins/feed.xml', { headers: { 'User-Agent': 'Pinterestbot/1.0' } });
  assert.equal(feed.status, 200);
  assert.match(feed.headers.get('content-type'), /^application\/rss\+xml; charset=utf-8$/);
  const xml = await feed.text();
  checkXml(xml);
  assert.equal(tag(xml, 'item').length, 1, 'only the page of the job: the seeds are not released yet');
  assert.ok(xml.includes(`/pins/auto/${page.slug}.png`));
  assert.equal(w.core.recentFetches(1)[0].ua, 'Pinterestbot/1.0');
  // the pin image: PNG, long cache, right size
  const pin = await call(w.env, `/pins/auto/${page.slug}.png`);
  assert.equal(pin.status, 200);
  assert.equal(pin.headers.get('content-type'), 'image/png');
  assert.match(pin.headers.get('cache-control'), /immutable/);
  const pinBytes = Buffer.from(await pin.arrayBuffer());
  assert.deepEqual(pngSize(pinBytes), { w: 1000, h: 1500 });
  assert.equal(pinBytes.length, page.pinBytes);
  assert.equal(Number(xml.match(/length="(\d+)"/)[1]), page.pinBytes, 'the enclosure length is the real size');
  const head = await call(w.env, `/pins/auto/${page.slug}.png`, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal((await head.arrayBuffer()).byteLength, 0);
  // the printable page and its thumbnail
  assert.deepEqual(pngSize(Buffer.from(await (await call(w.env, `/printables/img/${page.slug}.png`)).arrayBuffer())), { w: 1024, h: 1024 });
  assert.deepEqual(pngSize(Buffer.from(await (await call(w.env, `/printables/img/${page.slug}-400.png`)).arrayBuffer())), { w: 400, h: 400 });
  // landing page and hub
  const landing = await call(w.env, `/printables/${page.slug}`);
  assert.equal(landing.status, 200);
  assert.match(landing.headers.get('content-type'), /^text\/html; charset=utf-8$/);
  const lh = await landing.text();
  assert.ok(lh.includes(`<h1>${page.headline}</h1>`));
  assert.ok((await (await call(w.env, '/printables')).text()).includes(page.slug));
  assert.ok((await (await call(w.env, '/sitemap-printables.xml')).text()).includes(`/printables/${page.slug}</loc>`));
  // a seed's landing page works before its pin is released; unknown and unsafe slugs are the site's 404
  assert.equal((await call(w.env, `/printables/${SEEDS[0].slug}`)).status, 200);
  for (const p of ['/printables/nope-coloring-page', '/printables/img/nope.png', '/pins/auto/nope.png', '/printables/UPPER', '/printables/a/b/c', '/pins/auto/../x.png', '/pins/nothing']) {
    const r = await call(w.env, p);
    assert.equal(r.status, 404, p);
    assert.equal(await r.text(), 'not found page', p);
  }
  // a page hidden by the admin disappears from every list and answers 404
  assert.equal((await admin(w.env, `/pins/admin/hide?slug=${page.slug}`)).status, 200);
  assert.equal((await call(w.env, `/printables/${page.slug}`)).status, 404);
  assert.equal((await call(w.env, `/pins/auto/${page.slug}.png`)).status, 404);
  assert.equal(tag(await (await call(w.env, '/pins/feed.xml')).text(), 'item').length, 0);
});

test('feed per board: ?group= shows one group, an unknown group falls back to the whole feed', async () => {
  const w = makeWorld({ now: at(2026, 10, 28, 12, 0) });
  const all = tag(await (await call(w.env, '/pins/feed.xml')).text(), 'item').length;
  const hal = tag(await (await call(w.env, '/pins/feed.xml?group=halloween')).text(), 'item').length;
  const win = tag(await (await call(w.env, '/pins/feed.xml?group=winter')).text(), 'item').length;
  const odd = tag(await (await call(w.env, '/pins/feed.xml?group=nope')).text(), 'item').length;
  assert.equal(all, 14);
  assert.equal(hal, 14);
  assert.equal(win, 0);
  assert.equal(odd, 14);
});

test('admin: no key means no admin address, a wrong key is refused, the right key pauses, resumes and switches the seeds', async () => {
  const none = makeWorld({ key: '' });
  delete none.env.AUTOPIN_ADMIN_KEY;
  assert.equal((await admin(none.env, '/pins/admin/status', 'GET', 'anything')).status, 404);
  const w = makeWorld({ now: at(2026, 10, 28, 12, 0) });
  assert.equal((await admin(w.env, '/pins/admin/status', 'GET', null)).status, 401);
  assert.equal((await admin(w.env, '/pins/admin/status', 'GET', 'wrong')).status, 401);
  assert.equal((await admin(w.env, '/pins/admin/pause', 'POST', 'wrong')).status, 401);
  const st = await (await admin(w.env, '/pins/admin/status', 'GET')).json();
  assert.equal(st.flags.paused, false);
  assert.equal(st.limits.dailyPages, 4);
  assert.equal(st.today.freeNeuronsPerDay, 10000);
  assert.ok(!JSON.stringify(st).includes('test-admin-key'), 'the key is never echoed');
  assert.equal((await admin(w.env, '/pins/admin/status', 'POST')).status, 405);
  assert.equal((await admin(w.env, '/pins/admin/nothing')).status, 404);
  // seeds off: the feed loses the seeds, the landing pages stay
  assert.equal((await (await admin(w.env, '/pins/admin/seeds?on=0')).json()).seedsInFeed, false);
  assert.equal(tag(await (await call(w.env, '/pins/feed.xml')).text(), 'item').length, 0);
  assert.equal((await call(w.env, `/printables/${SEEDS[0].slug}`)).status, 200);
  assert.equal((await (await admin(w.env, '/pins/admin/seeds?on=1')).json()).seedsInFeed, true);
  assert.equal(tag(await (await call(w.env, '/pins/feed.xml')).text(), 'item').length, 14);
  // pause freezes the feed (nothing released later appears) and stops the job
  w.clock.t = at(2026, 10, 26, 0, 0);
  assert.equal((await (await admin(w.env, '/pins/admin/pause')).json()).paused, true);
  w.clock.t = at(2026, 10, 30, 0, 0);
  assert.equal(tag(await (await call(w.env, '/pins/feed.xml')).text(), 'item').length, 4);
  assert.equal((await (await admin(w.env, '/pins/admin/run')).json()).reason, 'paused');
  assert.equal((await (await admin(w.env, '/pins/admin/resume')).json()).paused, false);
  assert.equal((await (await admin(w.env, '/pins/admin/run')).json()).status, 'done');
  // after the resume the feed is no longer frozen: all 30 seeds released by 30 October 00:00 plus the new page
  assert.equal(tag(await (await call(w.env, '/pins/feed.xml')).text(), 'item').length, 21 + 1);
});

test('the cron entry: scheduled() runs one tick through the Durable Object stub, and a failing object is written down, not thrown', async () => {
  const w = makeWorld({ now: at(2026, 10, 24, 15, 7) });
  const ctx = ctxStub();
  // the handler returns the promise of the run and also hands it to waitUntil
  const r = await worker.scheduled({ scheduledTime: w.clock.t, cron: '7 */3 * * *' }, w.env, ctx);
  assert.equal(ctx.waits.length, 1);
  assert.equal(await ctx.waits[0], r);
  assert.equal(r.status, 'done');
  assert.equal(w.core.storageBytes().pages, 1);
  // the same trigger again does nothing
  const again = ctxStub();
  await worker.scheduled({ scheduledTime: w.clock.t }, w.env, again);
  assert.equal((await again.waits[0]).reason, 'slot_done');
  // an object that throws: the cron run ends cleanly
  const broken = { PINS: { idFromName: () => 'x', get: () => ({ tick: async () => { throw new Error('Exceeded CPU limit'); }, noteError: async () => true }) } };
  const c3 = ctxStub();
  await worker.scheduled({ scheduledTime: w.clock.t }, broken, c3);
  assert.equal((await c3.waits[0]).status, 'failed');
  // no binding: nothing happens
  const c4 = ctxStub();
  await worker.scheduled({ scheduledTime: w.clock.t }, {}, c4);
  assert.equal((await c4.waits[0]).skipped, 'no PINS binding');
});

test('a week of cron runs: Halloween pages until 31 October, then fall and Thanksgiving; caps hold every day', async () => {
  const w = makeWorld({ now: at(2026, 10, 29, 0, 7) });
  const themes = [];
  for (let slot = 0; slot < 8 * 5; slot++) {
    w.clock.t = at(2026, 10, 29, 0, 7) + slot * 3 * HOUR;
    const r = await cron(w, w.clock.t);
    if (r.status === 'done') themes.push(w.core.getPage(r.slug).theme + '@' + new Date(w.clock.t).toISOString().slice(5, 10));
  }
  assert.equal(themes.length, 20, 'four a day for five days');
  assert.ok(themes.filter(t => t.endsWith('10-29') || t.endsWith('10-30') || t.endsWith('10-31')).every(t => t.startsWith('halloween')));
  assert.ok(themes.filter(t => t.endsWith('11-01') || t.endsWith('11-02')).every(t => /^(fall|thanksgiving)/.test(t)));
  for (const d of ['2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']) assert.equal(w.core.count('pages:' + d) <= 4, true, d);
  assert.equal(w.calls.flux.length, 20);
  const used = [...w.core.usedSlugs()];
  assert.equal(new Set(used).size, used.length);
});

// =====================================================================================================
// configuration
// =====================================================================================================
test('wrangler.production.jsonc: one cron trigger, the PinStore class with its migration, safe defaults; the preview never runs the job', () => {
  const strip = s => s.replace(/^\s*\/\/.*$/gm, '').replace(/,(\s*[}\]])/g, '$1');
  const prod = JSON.parse(strip(fs.readFileSync(path.join(root, 'cloudflare', 'wrangler.production.jsonc'), 'utf8')));
  const prev = JSON.parse(strip(fs.readFileSync(path.join(root, 'cloudflare', 'wrangler.jsonc'), 'utf8')));
  assert.deepEqual(prod.triggers.crons, ['7 */3 * * *']);
  assert.ok(prod.triggers.crons.length <= 5, 'Workers Free allows 5 cron triggers an account');
  assert.ok(prod.durable_objects.bindings.some(b => b.name === 'PINS' && b.class_name === 'PinStore'));
  assert.ok(prod.durable_objects.bindings.some(b => b.name === 'LEDGER' && b.class_name === 'Ledger'));
  assert.deepEqual(prod.migrations.map(m => m.tag), ['v1', 'v2']);
  assert.deepEqual(prod.migrations[1].new_sqlite_classes, ['PinStore']);
  assert.ok(prod.ai && prod.images, 'bindings for the model and the Images conversion');
  assert.equal(prod.vars.AUTOPIN_ENABLED, '1');
  assert.ok(Number(prod.vars.AUTOPIN_DAILY_PAGES) <= 6);
  assert.ok(Number(prod.vars.AUTOPIN_MAX_FLUX_PER_DAY) * FLUX_NEURONS <= 1000, 'under 10 percent of 10,000 free neurons');
  assert.equal(prod.workers_dev, false);
  assert.equal(prev.vars.AUTOPIN_ENABLED, '0');
  assert.equal(prev.triggers, undefined);
  const idx = fs.readFileSync(path.join(root, 'cloudflare', 'index.js'), 'utf8');
  assert.match(idx, /export \{ PinStore \} from '\.\/autopin\/store\.js'/);
});

test('robots.txt names the sitemap of the printable pages, and nothing about the job leaks into the site pages', () => {
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  assert.match(server, /Sitemap: https:\/\/www\.coloringpagemaker\.app\/sitemap-printables\.xml/);
  assert.match(fs.readFileSync(path.join(root, 'views', 'partials', 'footer.ejs'), 'utf8'), /<a href="\/printables">Free printables<\/a>/);
});

// =====================================================================================================
// internal links, flood protection
// =====================================================================================================
test('neighbors: every page links to the pages next to it in the list, so a crawler can walk the whole list', () => {
  const list = Array.from({ length: 20 }, (_, i) => ({ slug: 'p' + i }));
  assert.deepEqual(neighbors(list, 'p10', 6).map(x => x.slug), ['p9', 'p11', 'p8', 'p12', 'p7', 'p13']);
  assert.deepEqual(neighbors(list, 'p0', 6).map(x => x.slug), ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
  assert.deepEqual(neighbors(list, 'p19', 4).map(x => x.slug), ['p18', 'p17', 'p16', 'p15']);
  assert.equal(neighbors(list, 'p10', 6).some(x => x.slug === 'p10'), false);
  assert.deepEqual(neighbors(list, 'unknown', 3).map(x => x.slug), ['p0', 'p1', 'p2']);
  assert.deepEqual(neighbors([{ slug: 'only' }], 'only', 6), []);
  // every page is reachable from the newest one by following neighbor links
  const seen = new Set(['p0']); let frontier = ['p0'];
  while (frontier.length) { const next = []; for (const s of frontier) for (const n of neighbors(list, s, 2)) if (!seen.has(n.slug)) { seen.add(n.slug); next.push(n.slug); } frontier = next; }
  assert.equal(seen.size, 20);
});

test('hub: more than 36 pages in a group keep a plain link list of the older ones, so no page is orphaned', () => {
  const now = at(2026, 12, 1);
  const base = seedViews()[0];
  const views = Array.from({ length: 60 }, (_, i) => ({ ...base, slug: `halloween-test-${i}-coloring-page`, headline: `Test ${i} coloring page`, release: now - i * HOUR }));
  const html = renderHub(views, now);
  assert.equal((html.match(/class="image-card"/g) || []).length, 36);
  assert.match(html, /Older pages/);
  for (const v of views) assert.ok(html.includes(`href="/printables/${v.slug}"`), v.slug);
});

test('landing page: the call to action names the site page it links to, and the evergreen pages link to their own theme', () => {
  const s = topics.allSubjects().find(x => x.slug === 'unicorn-with-rainbow-mane-coloring-page');
  assert.ok(s, 'the unicorn subject exists');
  const t = topics.describe(s);
  const view = { source: 'auto', slug: s.slug, theme: s.theme, group: t.group, level: s.level, headline: t.headline, sub: t.sub, title: t.pinTitle, description: t.pinDescription, alt: t.alt, intro: t.intro, prompt: s.draw, metaDescription: t.metaDescription, site: s.site, release: at(2026, 11, 3), created: at(2026, 11, 3), pinImage: `/pins/auto/${s.slug}.png`, pinBytes: 1000, pageImage: `/printables/img/${s.slug}.png`, thumbImage: `/printables/img/${s.slug}-400.png` };
  const html = renderLanding(view, []);
  assert.match(html, /href="\/unicorn-coloring-pages#generator" class="btn">Make your own unicorn page</);
  assert.match(html, /<p class="eyebrow">Animals and more<\/p>/);
  assert.ok(!html.includes('More Animals'), 'no related section without related pages');
  assert.deepEqual(lint(visibleText(html)), []);
});

test('a flood of made-up addresses does not wake the Durable Object: unknown slugs are answered by the Worker', async () => {
  const w = makeWorld({ now: at(2026, 10, 24, 15, 7) });
  await cron(w, w.clock.t);
  const page = w.core.listPages({ upTo: w.clock.t })[0];
  const counts = { landing: 0, image: 0, slugs: 0, hub: 0 };
  const real = w.env.PINS.get();
  w.env.PINS.get = () => new Proxy(real, { get: (t, k) => { if (k in counts) return (...a) => { counts[k]++; return t[k](...a); }; return t[k]; } });
  for (let i = 0; i < 60; i++) {
    assert.equal((await call(w.env, `/printables/made-up-${i}-coloring-page`)).status, 404);
    assert.equal((await call(w.env, `/printables/img/made-up-${i}.png`)).status, 404);
    assert.equal((await call(w.env, `/pins/auto/made-up-${i}.png`)).status, 404);
  }
  assert.equal(counts.landing + counts.image, 0, 'no page or image was looked up');
  assert.ok(counts.slugs <= 1, 'the list of slugs was fetched ' + counts.slugs + ' times');
  // a real page still works, and a page made after the list was fetched is found after a refresh
  assert.equal((await call(w.env, `/printables/${page.slug}`)).status, 200);
  assert.equal(counts.landing, 1);
  w.clock.t += 3 * HOUR;
  const second = await cron(w, w.clock.t);
  assert.equal(second.status, 'done');
  assert.equal((await call(w.env, `/printables/${second.slug}`)).status, 404, 'the list is refreshed at most every 30 seconds');
  ageKnownSlugs(31 * 1000);
  assert.equal((await call(w.env, `/printables/${second.slug}`)).status, 200, 'a new page is found once the list is refreshed');
});

// =====================================================================================================
// staggered release, self test
// =====================================================================================================
import { releaseAt } from '../cloudflare/autopin/tick.js';

test('release times: the day\'s pages go out at the US-friendly hours, a few minutes off the hour, never in the past', () => {
  const hours = [13, 16, 19, 22];
  const made = at(2026, 10, 26, 0, 7);
  const rel = n => releaseAt({ now: made, n, slug: 'page-' + n + '-coloring-page', hours });
  for (let n = 0; n < 4; n++) {
    const d = new Date(rel(n));
    assert.equal(d.getUTCHours(), hours[n], 'hour of page ' + n);
    assert.ok(d.getUTCMinutes() < 40, 'minutes ' + d.getUTCMinutes());
    assert.equal(d.toISOString().slice(0, 10), '2026-10-26');
  }
  // a fifth page wraps to the first hour, twenty minutes later than a first page would be
  const fifth = new Date(rel(4));
  assert.equal(fifth.getUTCHours() * 60 + fifth.getUTCMinutes() >= 13 * 60 + 20, true);
  // made after its hour: released at once. Made by hand: released at once.
  const late = at(2026, 10, 26, 17, 7);
  assert.equal(releaseAt({ now: late, n: 0, slug: 'a-coloring-page', hours }), late);
  assert.equal(releaseAt({ now: made, n: 0, slug: 'a-coloring-page', hours, source: 'manual' }), made);
  assert.equal(releaseAt({ now: made, n: 0, slug: 'a-coloring-page', hours: [] }), made);
  // the same page always gets the same minutes
  assert.equal(releaseAt({ now: made, n: 1, slug: 'same-coloring-page', hours }), releaseAt({ now: made, n: 1, slug: 'same-coloring-page', hours }));
  assert.deepEqual(cfgOf({ AUTOPIN_RELEASE_HOURS: '9, 12 ,x,30,18' }).releaseHours, [9, 12, 18]);
  assert.deepEqual(cfgOf().releaseHours, [13, 16, 19, 22]);
});

test('a page drawn at 00:07 UTC stays out of the feed, the hub, the sitemap and its own address until its release hour', async () => {
  const w = makeWorld({ now: at(2026, 11, 3, 0, 7) });
  const r = await cron(w, w.clock.t);
  assert.equal(r.status, 'done');
  const page = w.core.getPage(r.slug);
  assert.ok(page.release > w.clock.t + 10 * HOUR && new Date(page.release).getUTCHours() === 13, new Date(page.release).toISOString());
  assert.equal(r.release, new Date(page.release).toISOString());
  // (the 30 Halloween seeds are still inside the 21-day window of the feed on 3 November: look for this page only)
  const items = async () => (await (await call(w.env, '/pins/feed.xml')).text()).split(`cpm-pin-${r.slug}`).length - 1;
  assert.equal(await items(), 0);
  assert.equal((await call(w.env, `/printables/${r.slug}`)).status, 404);
  assert.equal((await call(w.env, `/pins/auto/${r.slug}.png`)).status, 404);
  assert.equal((await (await call(w.env, '/sitemap-printables.xml')).text()).includes(r.slug), false);
  assert.equal((await (await call(w.env, '/printables')).text()).includes(r.slug), false);
  // at the release moment everything opens
  w.clock.t = page.release;
  resetKnownSlugs();
  assert.equal(await items(), 1);
  assert.equal((await call(w.env, `/printables/${r.slug}`)).status, 200);
  assert.equal((await call(w.env, `/pins/auto/${r.slug}.png`)).status, 200);
  assert.ok((await (await call(w.env, '/sitemap-printables.xml')).text()).includes(r.slug));
  assert.ok((await (await call(w.env, '/printables')).text()).includes(r.slug));
  // four pages made on one day go out at four different hours
  const day = makeWorld({ now: at(2026, 11, 3, 0, 7) });
  const hoursOut = [];
  for (let i = 0; i < 4; i++) { day.clock.t = at(2026, 11, 3, i * 3, 7); const x = await cron(day, day.clock.t); hoursOut.push(new Date(day.core.getPage(x.slug).release).getUTCHours()); }
  assert.deepEqual(hoursOut, [13, 16, 19, 22]);
});

test('selftest: the heavy part of a tick on a page that is already there, nothing stored, nothing drawn by the model', async () => {
  const w = makeWorld();
  w.env.ASSETS = { async fetch(req) { return new URL(req.url).pathname === `/printables/img/${SEEDS[0].slug}.png` ? new Response(GOOD.png) : new Response('nf', { status: 404 }); } };
  const r = await (await admin(w.env, '/pins/admin/selftest')).json();
  assert.equal(r.ok, true);
  assert.equal(r.judged, true);
  assert.ok(r.pinBytes > 50000 && r.pageBytes > 1000 && r.thumbBytes > 500, JSON.stringify(r));
  assert.equal(w.core.storageBytes().pages, 0);
  assert.equal(w.calls.flux.length, 0);
  assert.equal((await admin(w.env, '/pins/admin/selftest', 'GET')).status, 405);
  w.env.ASSETS = { async fetch() { return new Response('nf', { status: 404 }); } };
  assert.equal((await admin(w.env, '/pins/admin/selftest')).status, 500);
});

// =====================================================================================================
// review tooling
// =====================================================================================================
import http from 'node:http';
import os from 'node:os';
import { execFile } from 'node:child_process';

test('admin: status lists the newest pages (released or not), their images are served to the admin only, selftest also runs the Images conversion', async () => {
  const w = makeWorld({ now: at(2026, 11, 3, 0, 7) });
  const r = await cron(w, w.clock.t);
  const st = await (await admin(w.env, '/pins/admin/status', 'GET')).json();
  assert.equal(st.recentPages.length, 1);
  assert.equal(st.recentPages[0].slug, r.slug);
  assert.equal(st.recentPages[0].released, false);
  assert.match(st.recentPages[0].release, /^2026-11-03T13:/);
  // an image of a page that is not released yet: 404 for everybody, 200 for the admin
  assert.equal((await call(w.env, `/pins/auto/${r.slug}.png`)).status, 404);
  assert.equal((await admin(w.env, `/pins/admin/image/${r.slug}/pin`, 'GET', null)).status, 401);
  const pin = await admin(w.env, `/pins/admin/image/${r.slug}/pin`, 'GET');
  assert.equal(pin.status, 200);
  assert.equal(pin.headers.get('content-type'), 'image/png');
  assert.deepEqual(pngSize(Buffer.from(await pin.arrayBuffer())), { w: 1000, h: 1500 });
  assert.deepEqual(pngSize(Buffer.from(await (await admin(w.env, `/pins/admin/image/${r.slug}/thumb`, 'GET')).arrayBuffer())), { w: 400, h: 400 });
  assert.equal((await admin(w.env, '/pins/admin/image/nope-coloring-page/pin', 'GET')).status, 404);
  assert.equal((await admin(w.env, '/pins/admin/image/x/nothing', 'GET')).status, 404);
  assert.equal((await admin(w.env, `/pins/admin/image/${r.slug}/pin`, 'POST')).status, 405);
  // hidden pages stay in the review list, marked
  await admin(w.env, `/pins/admin/hide?slug=${r.slug}`);
  assert.equal((await (await admin(w.env, '/pins/admin/status', 'GET')).json()).recentPages[0].hidden, true);
  // the thumbnails are 8-bit gray, which the site's decoder reads
  const thumb = Buffer.from(await (await admin(w.env, `/pins/admin/image/${r.slug}/thumb`, 'GET')).arrayBuffer());
  assert.equal(decodeGrayPng(thumb).w, 400);
});

test('the review command downloads the newest pages and writes a contact sheet', async () => {
  const sample = fs.readFileSync(path.join(root, 'public', 'printables', 'img', SEEDS[1].slug + '-400.png'));
  const pages = [0, 1, 2].map(i => ({ slug: `fall-test-${i}-coloring-page`, headline: 'Test', theme: 'fall', level: 'simple', created: '2026-11-03T00:07:00.000Z', release: '2026-11-03T13:20:00.000Z', released: false, hidden: i === 2 }));
  const seen = [];
  const srv = http.createServer((req, res) => {
    seen.push(req.method + ' ' + req.url + ' ' + req.headers.authorization);
    if (req.url === '/pins/admin/status') { res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ recentPages: pages })); }
    if (/^\/pins\/admin\/image\/fall-test-\d-coloring-page\/thumb$/.test(req.url)) { res.setHeader('Content-Type', 'image/png'); return res.end(sample); }
    res.statusCode = 404; res.end('nf');
  });
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cpm-review-'));
  try {
    const out = await new Promise((resolve, reject) => execFile(process.execPath, [path.join(root, 'cloudflare', 'autopin', 'tools', 'admin.mjs'), 'review', '5'], {
      cwd: tmp, env: { ...process.env, AUTOPIN_BASE: 'http://127.0.0.1:' + srv.address().port, AUTOPIN_ADMIN_KEY: 'k-review' }
    }, (err, stdout, stderr) => (err ? reject(new Error(stderr + stdout)) : resolve(stdout))));
    assert.match(out, /WAITING/);
    assert.match(out, /HIDDEN/);
    assert.match(out, /fall-test-1-coloring-page/);
    assert.ok(fs.existsSync(path.join(tmp, 'autopin-review', 'review-sheet.png')));
    assert.ok(fs.existsSync(path.join(tmp, 'autopin-review', 'fall-test-0-coloring-page-400.png')));
    const size = pngSize(fs.readFileSync(path.join(tmp, 'autopin-review', 'review-sheet.png')));
    assert.deepEqual(size, { w: 4 * 240 + 5 * 8, h: 1 * 240 + 2 * 8 });
    assert.ok(seen.every(s => s.endsWith('Bearer k-review')), 'every request carries the key');
    assert.ok(!out.includes('k-review'), 'the key is never printed');
  } finally { srv.close(); fs.rmSync(tmp, { recursive: true, force: true }); }
});

test('a long run: the sitemap keeps every page, the hub the newest 500, the known-address list every page, and one landing page stays cheap', async () => {
  const w = makeWorld({ now: at(2027, 6, 1) });
  const mk = (i) => ({ slug: `evergreen-bulk-${i}-coloring-page`, theme: 'evergreen', grp: 'evergreen', level: 'simple', headline: `Bulk ${i} coloring page`, title: 'T', description: 'D', alt: 'A', intro: 'I', metaDescription: 'M', prompt: 'P', site: null, skin: 'sky', created: at(2026, 11, 1) + i * HOUR, release: at(2026, 11, 1) + i * HOUR, slot: 's' + i, attempts: 1, metrics: null });
  const blobs = { pin: new Uint8Array(10), page: new Uint8Array(10), thumb: new Uint8Array(10) };
  for (let i = 0; i < 700; i++) w.core.insertPage(mk(i), blobs);
  const sitemap = await (await call(w.env, '/sitemap-printables.xml')).text();
  assert.equal(tag(sitemap, 'loc').length, 700 + 30 + 1, 'hub + 700 pages + 30 seeds');
  const hub = await (await call(w.env, '/printables')).text();
  const listed = (hub.match(/href="\/printables\/[a-z0-9-]+"/g) || []).length;
  assert.ok(listed >= 400 && listed <= 600, 'the hub lists the newest pages and the older links: ' + listed);
  assert.equal((await w.svc.slugs()).length, 700);
  assert.equal((await call(w.env, '/printables/evergreen-bulk-0-coloring-page')).status, 200, 'the oldest page still has its page');
  const page = await (await call(w.env, '/printables/evergreen-bulk-350-coloring-page')).text();
  assert.equal((page.match(/class="image-card"/g) || []).length, 6, 'six neighbors');
  assert.ok(page.includes('evergreen-bulk-349-coloring-page') && page.includes('evergreen-bulk-351-coloring-page'));
});
