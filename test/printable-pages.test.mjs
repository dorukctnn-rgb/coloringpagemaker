// The 78 printable pages that were live on 10 November 2026 (printables-index.json): each has its own written note
// (cloudflare/autopin/notes/), a title and a meta description of its own, three related pages, a WebP picture for its LCP image
// and the image license fields; the theme pages link to their printables and /llms.txt maps the site.
// Rendering uses the real page.js on views built the way the site builds them, so no Worker or object is needed.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { NOTES, NOTE_TEXTS, noteWords, META_TAIL, pageNotes, relatedViews, wordCount } from '../cloudflare/autopin/notes/index.js';
import { renderLanding, renderHub, titleOf, metaOf } from '../cloudflare/autopin/page.js';
import { seedViews, autoView, buildSitemap } from '../cloudflare/autopin/feed.js';
import { allSubjects, describe, THEMES, pageHeadline } from '../cloudflare/autopin/topics.js';
import { describePages, indexText, slugsOfSitemap } from '../cloudflare/autopin/tools/sync-printables.mjs';

const require = createRequire(import.meta.url);
const h = require('./helpers.js');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INDEX = JSON.parse(fs.readFileSync(path.join(root, 'printables-index.json'), 'utf8'));
const SLUGS = INDEX.items.map(x => x.slug);
// What none of the new text may say (the product is described as a drawing tool; it never talks about how a picture was made).
const BANNED = /\b(AI|A\.I\.|generated|synthetic|artificial intelligence|machine[- ]made)\b/i;

const subjects = new Map(allSubjects().map(s => [s.slug, s]));
const seeds = new Map(seedViews().map(v => [v.slug, v]));
function viewOf(slug) {
  if (seeds.has(slug)) return seeds.get(slug);
  const s = subjects.get(slug);
  const d = describe(s);
  return autoView({
    slug, theme: s.theme, group: THEMES[s.theme].group, level: s.level, headline: d.headline, title: d.pinTitle, description: d.pinDescription,
    alt: d.alt, intro: d.intro, metaDescription: d.metaDescription, prompt: s.draw, site: s.site || THEMES[s.theme].site,
    release: Date.parse('2026-10-20T12:00:00Z'), created: Date.parse('2026-10-20T12:00:00Z'), pinBytes: 1000
  });
}
const VIEWS = SLUGS.map(viewOf);
const text = html => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ').trim();
const mainOf = html => html.slice(html.indexOf('<main'), html.indexOf('</main>'));
const PAGES = new Map(VIEWS.map(v => [v.slug, renderLanding(v, VIEWS.filter(x => x.group === v.group && x.slug !== v.slug).slice(0, 6), relatedViews(v, VIEWS, 3))]));
const sentences = s => s.split(/(?<=[.!?])\s+/).map(x => x.trim().toLowerCase()).filter(x => x.length >= 25);
const trigrams = t => { const w = t.toLowerCase().replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean); const g = new Set(); for (let i = 0; i + 3 <= w.length; i++) g.add(w.slice(i, i + 3).join(' ')); return g; };

test('printables-index.json lists every printable page once and is what the banks and seeds describe', () => {
  assert.equal(INDEX.count, INDEX.items.length);
  assert.equal(new Set(SLUGS).size, SLUGS.length);
  assert.ok(SLUGS.length >= 78);
  const again = describePages(SLUGS);
  assert.deepEqual(again.missing, []);
  assert.equal(indexText(again.items).replace(/\r\n/g, '\n'), fs.readFileSync(path.join(root, 'printables-index.json'), 'utf8').replace(/\r\n/g, '\n'), 'run node cloudflare/autopin/tools/sync-printables.mjs');
  assert.deepEqual(slugsOfSitemap('<loc>https://www.coloringpagemaker.app/printables/a-b</loc><loc>https://www.coloringpagemaker.app/printables</loc>'), ['a-b']);
});

test('every live printable has a written note of 120 to 200 words, three related pages and no banned word', () => {
  for (const slug of SLUGS) {
    const n = NOTES[slug];
    assert.ok(n, slug + ' has a note');
    const words = noteWords(n);
    assert.ok(words >= 120 && words <= 200, `${slug}: ${words} words`);
    for (const k of NOTE_TEXTS) assert.ok(wordCount(n[k]) >= 8, `${slug}.${k} is too short`);
    assert.ok(n.m && n.m.length >= 40 && n.m.length <= 135, `${slug}.m is ${n.m && n.m.length} characters`);
    assert.equal(n.r.length, 3, slug + ' names three related pages');
    assert.equal(new Set(n.r).size, 3);
    for (const r of n.r) { assert.ok(r !== slug, slug + ' names itself'); assert.ok(SLUGS.includes(r), `${slug} names ${r}, which is not a live page`); }
    const all = [n.m, ...NOTE_TEXTS.map(k => n[k])].join(' ');
    assert.ok(!BANNED.test(all), slug + ' uses a banned word: ' + (all.match(BANNED) || [])[0]);
    assert.ok(!/[—–]/.test(all), slug + ' has a dash used as punctuation');
  }
  assert.deepEqual(Object.keys(NOTES).filter(s => !SLUGS.includes(s)), [], 'a note for a page that is not live');
});

test('the notes are different from each other: no long sentence is repeated and no two pages read alike', () => {
  const seen = new Map();
  for (const slug of SLUGS) for (const k of NOTE_TEXTS) for (const s of sentences(NOTES[slug][k])) {
    assert.ok(!seen.has(s), `"${s}" is in ${seen.get(s)} and in ${slug}.${k}`);
    seen.set(s, `${slug}.${k}`);
  }
  const metas = new Set();
  for (const slug of SLUGS) { assert.ok(!metas.has(NOTES[slug].m), slug + ' repeats a summary'); metas.add(NOTES[slug].m); }
  const grams = SLUGS.map(s => trigrams(NOTE_TEXTS.map(k => NOTES[s][k]).join(' ')));
  for (let i = 0; i < SLUGS.length; i++) for (let j = i + 1; j < SLUGS.length; j++) {
    let common = 0; for (const g of grams[i]) if (grams[j].has(g)) common++;
    const like = common / (grams[i].size + grams[j].size - common);
    assert.ok(like < 0.2, `${SLUGS[i]} and ${SLUGS[j]} share ${(like * 100).toFixed(0)} percent of their word triples`);
  }
});

test('every live printable page is linked from at least one other page by its note, and the related pages are named both ways where they can be', () => {
  const inbound = new Map(SLUGS.map(s => [s, 0]));
  for (const s of SLUGS) for (const r of NOTES[s].r) inbound.set(r, inbound.get(r) + 1);
  for (const [s, n] of inbound) assert.ok(n >= 1, s + ' is named by no other page');
});

test('a landing page: its own title, H1, description, picture note and three related pages', () => {
  const titles = new Set(), h1s = new Set(), descriptions = new Set();
  for (const v of VIEWS) {
    const html = PAGES.get(v.slug);
    const title = /<title>([^<]*)<\/title>/.exec(html)[1];
    const meta = /<meta name="description" content="([^"]*)"/.exec(html)[1].replace(/&amp;/g, '&');
    const h1 = /<h1>([^<]*)<\/h1>/.exec(html)[1];
    assert.ok(title.length <= 60, `${v.slug}: the title is ${title.length} characters`);
    assert.ok(meta.length >= 90 && meta.length <= 155, `${v.slug}: the description is ${meta.length} characters`);
    assert.ok(meta.endsWith(META_TAIL.trim()), v.slug + ': the description keeps its tail');
    assert.ok(!titles.has(title), v.slug + ' repeats a title: ' + title);
    assert.ok(!h1s.has(h1), v.slug + ' repeats an H1: ' + h1);
    assert.ok(!descriptions.has(meta), v.slug + ' repeats a description');
    titles.add(title); h1s.add(h1); descriptions.add(meta);
    assert.equal((html.match(/<h1>/g) || []).length, 1);
    // the written note is on the page, whole
    for (const k of NOTE_TEXTS) assert.ok(html.includes(NOTES[v.slug][k].replace(/&/g, '&amp;').replace(/'/g, "'")) || html.includes(NOTES[v.slug][k]), `${v.slug}: the ${k} text is on the page`);
    // three related pages, then the neighbors that are not among them
    const rel = /<section class="examples hub-group related-three" aria-labelledby="related-title">([\s\S]*?)<\/section>/.exec(html);
    assert.ok(rel, v.slug + ' has a related section');
    const links = [...rel[1].matchAll(/href="\/printables\/([a-z0-9-]+)"/g)].map(m => m[1]);
    assert.deepEqual(links, NOTES[v.slug].r, v.slug + ': the related pages are the three of the note');
    // the text of the page is words, not only a skeleton
    assert.ok(wordCount(text(mainOf(html))) >= 330, `${v.slug}: ${wordCount(text(mainOf(html)))} words on the page`);
    assert.ok(!BANNED.test(text(mainOf(html))), v.slug + ' says a banned word on the page');
  }
});

test('the two drawings of one subject do not share a title or an H1 (the -detailed, -easy and -classic pages)', () => {
  const pairs = SLUGS.filter(s => /-(detailed|easy|classic)-coloring-page$/.test(s));
  assert.ok(pairs.length >= 1, 'the live pages include a second drawing');
  for (const s of pairs) {
    const base = s.replace(/-(detailed|easy|classic)-coloring-page$/, '-coloring-page');
    const a = PAGES.get(s), b = PAGES.get(base);
    if (!b) continue;
    assert.notEqual(/<h1>([^<]*)<\/h1>/.exec(a)[1], /<h1>([^<]*)<\/h1>/.exec(b)[1], s);
    assert.notEqual(/<title>([^<]*)<\/title>/.exec(a)[1], /<title>([^<]*)<\/title>/.exec(b)[1], s);
  }
  const castle = PAGES.get('halloween-castle-detailed-coloring-page');
  assert.ok(castle && /<h1>Detailed Halloween castle coloring page<\/h1>/.test(castle), 'the detailed castle is headed with its level');
  assert.ok(/<h1>Halloween castle coloring page<\/h1>/.test(PAGES.get('halloween-castle-coloring-page')));
});

test('the picture is a WebP with the PNG as the fallback, and the ImageObject carries the license fields', () => {
  for (const v of VIEWS) {
    const html = PAGES.get(v.slug);
    assert.ok(html.includes(`<source type="image/webp" srcset="/printables/img/${v.slug}.webp">`), v.slug + ': WebP source');
    assert.ok(html.includes(`<img src="/printables/img/${v.slug}.png" width="1024" height="1024"`), v.slug + ': PNG fallback');
    assert.ok(html.includes('fetchpriority="high"'));
    const ld = JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)[1]);
    const image = ld['@graph'].find(x => x['@type'] === 'ImageObject');
    assert.equal(image.license, 'https://www.coloringpagemaker.app/terms');
    assert.equal(image.acquireLicensePage, 'https://www.coloringpagemaker.app/terms');
    assert.equal(image.creator.name, 'ColoringPageMaker');
    assert.equal(image.creditText, 'ColoringPageMaker');
    assert.match(image.copyrightNotice, /2026 ColoringPageMaker/);
    assert.ok(image.thumbnailUrl.endsWith(`/printables/img/${v.slug}-400.png`));
    assert.equal(ld['@graph'].find(x => x['@type'] === 'WebPage').dateModified >= '2026-11-10', true, 'dateModified says the text was revised');
  }
});

test('the 30 seed pages have a static WebP that is a real WebP and smaller than the PNG; a page of the job gets its WebP route', () => {
  const dir = path.join(root, 'public', 'printables', 'img');
  for (const v of seedViews()) {
    const webp = fs.readFileSync(path.join(dir, v.slug + '.webp'));
    const png = fs.readFileSync(path.join(dir, v.slug + '.png'));
    assert.equal(webp.subarray(0, 4).toString('latin1'), 'RIFF', v.slug);
    assert.equal(webp.subarray(8, 12).toString('latin1'), 'WEBP', v.slug);
    assert.ok(webp.length < png.length * 0.75, `${v.slug}: ${webp.length} against ${png.length}`);
  }
  assert.ok(fs.readFileSync(path.join(root, 'cloudflare', 'autopin', 'routes.js'), 'utf8').includes('\\.webp$/.exec(path)'), 'routes.js serves /printables/img/<slug>.webp');
});

test('the sitemap of the printables says the text was revised on 10 November 2026', () => {
  const xml = buildSitemap({ views: VIEWS, now: Date.parse('2026-11-12T00:00:00Z') });
  const mods = [...xml.matchAll(/<lastmod>([^<]*)<\/lastmod>/g)].map(m => m[1]);
  assert.equal(mods.length, VIEWS.length + 1);
  assert.ok(mods.every(m => m >= '2026-11-10'), 'no lastmod is older than the text');
  assert.ok(!/<priority>|<changefreq>/.test(xml), 'no priority or changefreq (Google ignores them)');
});

test('a page the job draws later, with no written note yet, still gets its own text built from its subject', () => {
  const s = allSubjects().find(x => !NOTES[x.slug] && !x.variant);
  const v = viewOf(s.slug);
  const n = pageNotes(v);
  assert.equal(n.built, true);
  assert.ok(noteWords(n) >= 60, 'built text of ' + noteWords(n) + ' words');
  assert.ok(!BANNED.test(NOTE_TEXTS.map(k => n[k]).join(' ')));
  const html = renderLanding(v, [], relatedViews(v, VIEWS, 3));
  assert.equal((html.match(/class="image-card"/g) || []).length, 3, 'three related pages even without a note');
  assert.ok(titleOf(v).length <= 60);
  assert.ok(metaOf(n, v).length <= 155);
});

test('the hub still lists every page', () => {
  const html = renderHub(VIEWS, Date.parse('2026-11-12T00:00:00Z'));
  for (const s of SLUGS) assert.ok(html.includes(`href="/printables/${s}"`), s + ' is on the hub');
});

// --- the theme pages and /llms.txt, from the real server ---
let app;
before(async () => { app = await h.startApp({ KV_REST_API_URL: '', OPENAI_API_KEY: '' }); });
after(async () => { if (app) await app.stop(); });
const get = async p => { const r = await fetch(app.base + p); assert.equal(r.status, 200, p); return r.text(); };

test('a theme page links to its own printables: 8 on Halloween, with thumbnails, alt text and a link to all of them', async () => {
  const html = await get('/halloween-coloring-pages');
  const block = /<section class="printables-band"[\s\S]*?<\/section>/.exec(html)[0];
  const links = [...block.matchAll(/href="\/printables\/([a-z0-9-]+)"/g)].map(m => m[1]);
  assert.equal(links.length, 8);
  assert.equal(new Set(links).size, 8);
  for (const l of links) assert.ok(SLUGS.includes(l), l);
  assert.equal((block.match(/loading="lazy"/g) || []).length, 8);
  assert.equal((block.match(/width="400" height="400"/g) || []).length, 8);
  assert.ok(/href="\/printables#g-halloween">See all 54 free Halloween printables</.test(block));
  assert.ok(/<h2 id="printables-title">More free Halloween coloring pages to print<\/h2>/.test(block));
  assert.ok(!BANNED.test(text(block)));
});

test('the Christmas, fall and Thanksgiving pages show their printables; the guides with printables show theirs; the turkey page stays as it was', async () => {
  for (const [p, n] of [['/christmas-coloring-pages', 6], ['/fall-coloring-pages', 6], ['/thanksgiving-coloring-pages', 8], ['/thankful-coloring-pages', 3], ['/turkey-disguise-template', 3]]) {
    const html = await get(p);
    assert.equal((html.match(/class="printable-card"/g) || []).length, n, p);
  }
  assert.ok(!(await get('/turkey-coloring-pages')).includes('printables-band'), 'the page with the search traffic is untouched');
  assert.ok(!(await get('/dog-coloring-pages')).includes('printables-band'), 'a theme with no printables shows no block');
});

test('/llms.txt names the tool, the printables, every collection and guide and the plans, and says nothing about how pictures are made', async () => {
  const txt = await get('/llms.txt');
  assert.match(txt, /^# ColoringPageMaker\n\n> /);
  assert.ok(txt.includes('(https://www.coloringpagemaker.app/printables)'));
  const sitemap = await get('/sitemap.xml');
  const themes = [...sitemap.matchAll(/<loc>https:\/\/www\.coloringpagemaker\.app\/([a-z0-9-]+-coloring-pages(?:-for-adults)?)<\/loc>/g)].map(m => m[1])
    .filter(s => !/self-publishing|classroom-teachers|best-ai|elf-|thankful|sell-/.test(s));
  for (const t of themes) assert.ok(txt.includes(`https://www.coloringpagemaker.app/${t})`), t + ' is in llms.txt');
  assert.ok(txt.includes('$9 once'));
  const words = txt.replace(/\(https?:[^)]*\)/g, ''); // the address of an existing guide has "ai" in it; the words do not
  assert.ok(!BANNED.test(words), 'llms.txt says: ' + (words.match(BANNED) || [])[0]);
  assert.ok(txt.split('\n').length < 90);
  const robots = await get('/robots.txt');
  assert.ok(!/llms/.test(robots));
});
