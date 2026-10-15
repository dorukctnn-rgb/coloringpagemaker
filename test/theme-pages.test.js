// Theme pages: the "Free printable ... coloring pages" gallery on every theme page and the seasonal guides
// (fall, Thanksgiving, turkey, winter, nativity, New Year, gingerbread, snowman, Diwali, Hanukkah). server.js runs
// as a child process with no KV and no OpenAI key, which is enough to render pages, serve the example files and
// build a free PDF.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const h = require('./helpers');
const THEME_EXAMPLES = require('../theme-examples.js');
const THEME_GUIDES = require('../theme-guides.js');

const SEASONAL = ['fall-coloring-pages', 'thanksgiving-coloring-pages', 'turkey-coloring-pages', 'winter-coloring-pages',
  'nativity-coloring-pages', 'new-year-coloring-pages', 'gingerbread-coloring-pages', 'snowman-coloring-pages',
  'diwali-coloring-pages', 'hanukkah-coloring-pages'];
// Pages that show two examples: none of their other candidates passed review within the generation cap.
const TWO_EXAMPLES = ['princess-coloring-pages', 'snowman-coloring-pages'];
let app;
let sitemapPaths = [];
const pages = new Map(); // path -> html

before(async () => {
  app = await h.startApp({ KV_REST_API_URL: '', OPENAI_API_KEY: '' });
  const xml = await (await fetch(app.base + '/sitemap.xml')).text();
  sitemapPaths = [...xml.matchAll(/<loc>https:\/\/www\.coloringpagemaker\.app([^<]*)<\/loc>/g)].map(m => m[1] || '/');
  pages.set('/sitemap.xml', xml);
  for (const p of sitemapPaths) {
    const r = await fetch(app.base + p);
    assert.equal(r.status, 200, p);
    pages.set(p, await r.text());
  }
});
after(async () => { if (app) await app.stop(); });

const themePaths = () => Object.keys(THEME_EXAMPLES).map(s => '/' + s);
function gallery(html) {
  const start = html.indexOf('<section class="examples"');
  if (start < 0) return null;
  return { start, html: html.slice(start, html.indexOf('</section>', start)) };
}

test('every theme in the sitemap has examples, and every example file exists', () => {
  const themesInSitemap = sitemapPaths.filter(p => /-coloring-pages$/.test(p) && !/self-publishing/.test(p));
  assert.deepEqual(themesInSitemap.slice().sort(), themePaths().sort());
  const alts = new Set();
  for (const [slug, g] of Object.entries(THEME_EXAMPLES)) {
    // Every theme page has three examples, except the TWO_EXAMPLES pages.
    assert.ok(g.items.length >= (TWO_EXAMPLES.includes(slug) ? 2 : 3), slug + ' has ' + g.items.length + ' examples');
    assert.match(g.heading, /^Free printable .+ coloring pages$/);
    for (const x of g.items) {
      for (const suffix of ['.png', '-400.webp', '-800.webp']) {
        assert.ok(fs.existsSync(path.join(__dirname, '..', 'public', 'examples', slug, x.name + suffix)), `${slug}/${x.name}${suffix}`);
      }
      assert.ok(!alts.has(x.alt), 'alt text is unique: ' + x.name);
      alts.add(x.alt);
    }
  }
});

test('the gallery renders below the generator with alt text, sized lazy images and downloads', async () => {
  for (const p of themePaths()) {
    const html = pages.get(p);
    const g = gallery(html);
    assert.ok(g, p + ' has a gallery');
    assert.ok(html.indexOf('id="generateBtn"') > 0 && html.indexOf('id="generateBtn"') < g.start, p + ': gallery is below the generator');
    assert.ok(g.start < html.indexOf('<article class="content">'), p + ': gallery comes before the guide text');
    assert.match(g.html, /made with ColoringPageMaker/, p + ': labelled as made with this site');
    const items = THEME_EXAMPLES[p.slice(1)].items;
    const imgs = [...g.html.matchAll(/<img ([^>]+)>/g)].map(m => m[1]);
    assert.equal(imgs.length, items.length, p + ': one image per example');
    for (const img of imgs) {
      const alt = (/alt="([^"]*)"/.exec(img) || [])[1] || '';
      assert.ok(alt.length >= 40 && /coloring page/i.test(alt), p + ': descriptive alt text: ' + alt);
      assert.match(img, /loading="lazy"/);
      assert.match(img, /width="400" height="400"/, 'fixed size, so nothing shifts');
      assert.match(img, /srcset="[^"]+-400\.webp 400w, [^"]+-800\.webp 800w"/);
    }
    const downloads = [...g.html.matchAll(/<a class="btn-small" href="([^"]+\.png)" download="([^"]+)">/g)];
    const pdfs = [...g.html.matchAll(/data-example-pdf="([^"]+\.png)"/g)];
    assert.equal(downloads.length, items.length, p + ': a PNG download per example');
    assert.equal(pdfs.length, items.length, p + ': a PDF button per example');
    for (const [, href, name] of downloads) {
      assert.match(name, /-coloring-page\.png$/);
      const r = await fetch(app.base + href);
      assert.equal(r.status, 200, href);
      assert.equal(r.headers.get('content-type'), 'image/png');
      assert.match(r.headers.get('cache-control') || '', /max-age=2592000/);
      await r.arrayBuffer();
    }
  }
});

test('no gallery outside the theme pages', () => {
  for (const p of sitemapPaths.filter(p => !themePaths().includes(p))) {
    assert.equal(gallery(pages.get(p)), null, p);
  }
});

test('an example PNG goes through the existing PDF route', async () => {
  const slug = 'turkey-coloring-pages';
  const png = fs.readFileSync(path.join(__dirname, '..', 'public', 'examples', slug, 'turkey-without-feathers.png'));
  const r = await fetch(app.base + '/download-pdf', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUrls: ['data:image/png;base64,' + png.toString('base64')], token: '' })
  });
  const buf = Buffer.from(await r.arrayBuffer());
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type'), /application\/pdf/);
  assert.equal(h.pdfPages(buf), 1);
  assert.ok(h.pdfText(buf).includes('FREE PREVIEW'), 'a free visitor gets the usual free PDF');
});

test('the seasonal pages render with their own content, JSON-LD and sitemap entries', () => {
  const xml = pages.get('/sitemap.xml').replace(/\s+/g, '');
  for (const slug of SEASONAL) {
    const g = THEME_GUIDES[slug];
    assert.ok(g, slug + ' has a guide');
    const html = pages.get('/' + slug);
    assert.ok(html.includes(`<h1>${g.h1.replace(/'/g, '&#39;')}</h1>`), slug + ' h1');
    assert.ok(xml.includes(`${slug}</loc><lastmod>${g.updated}</lastmod>`), slug + ' sitemap lastmod');
    const ld = JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)[1]);
    const types = ld['@graph'].map(n => n['@type']);
    for (const t of ['WebPage', 'WebApplication', 'BreadcrumbList', 'FAQPage']) assert.ok(types.includes(t), slug + ' JSON-LD ' + t);
    assert.equal(ld['@graph'].find(n => n['@type'] === 'FAQPage').mainEntity.length, g.faq.length);
    assert.ok(g.sources.length >= 1 && g.sources.every(s => /^https:\/\//.test(s.href)), slug + ' sources');
    assert.ok(!/disney|bluey|hello kitty|crayola|charlie brown|frosty|olaf|grinch|shrek|gingy|rudolph|peppa/i.test(JSON.stringify(g)), slug + ': no trademarked characters');
  }
});

test('no seasonal page is orphaned', () => {
  for (const slug of SEASONAL) {
    const linkers = sitemapPaths.filter(p => p !== '/' + slug && pages.get(p).includes(`href="/${slug}"`));
    assert.ok(linkers.length >= 3, `${slug} is linked from ${linkers.length} pages: ${linkers.join(' ')}`);
    assert.ok(linkers.includes('/blog'), slug + ' is in the theme guides hub');
  }
});

test('existing link lists keep their items and order; the seasonal pages are only appended', () => {
  const t = s => s + '-coloring-pages';
  const home = [...pages.get('/').matchAll(/<li><a href="\/([a-z-]+-coloring-pages)"><strong>/g)].map(m => m[1]);
  assert.deepEqual(home, ['unicorn', 'dinosaur', 'mandala', 'halloween', 'christmas', 'animal', 'princess', 'flower', 'adult', 'fall', 'thanksgiving', 'winter',
    'nativity', 'new-year', 'gingerbread', 'snowman', 'diwali', 'hanukkah'].map(t));
  // The rotation the niche pages had before: the next six of the original ten themes, wrapping around.
  const ORIGINAL = ['unicorn', 'dinosaur', 'mandala', 'halloween', 'christmas', 'animal', 'flower', 'princess', 'easter', 'adult'].map(t);
  for (const slug of ['mandala', 'flower', 'easter'].map(t)) {
    const html = pages.get('/' + slug);
    const sec = html.slice(html.indexOf('<h2>Browse more themes</h2>'));
    const links = [...sec.slice(0, sec.indexOf('</section>')).matchAll(/href="\/([a-z-]+)"/g)].map(m => m[1]);
    const i = ORIGINAL.indexOf(slug);
    assert.deepEqual(links, [...[...ORIGINAL.slice(i + 1), ...ORIGINAL.slice(0, i)].slice(0, 6), ...SEASONAL], slug);
  }
  // Related lists on existing guides: the original links first, in their order, then the seasonal ones.
  const related = {
    halloween: ['christmas', 'animal', 'adult', 'coloring-pages-for-classroom-teachers', 'fall'],
    christmas: ['halloween', 'animal', 'adult', 'coloring-pages-for-classroom-teachers', 'winter', 'nativity'],
    winter: ['christmas', 'animal', 'adult', 'coloring-pages-for-classroom-teachers', 'snowman']
  };
  for (const [slug, expected] of Object.entries(related)) {
    assert.deepEqual(THEME_GUIDES[t(slug)].related.map(r => r.href),
      expected.map(s => '/' + (s.startsWith('coloring-pages-') ? s : t(s))), slug + ': related links');
  }
});

test('the second seasonal batch: examples, dates and sources', () => {
  const batch = { nativity: 3, 'new-year': 3, gingerbread: 3, snowman: 2, diwali: 3, hanukkah: 3 };
  for (const [s, n] of Object.entries(batch)) {
    const slug = s + '-coloring-pages';
    assert.equal(THEME_EXAMPLES[slug].items.length, n, slug + ' examples');
    assert.equal(THEME_GUIDES[slug].checked, '15 October 2026', slug + ' facts checked');
    assert.ok(THEME_GUIDES[slug].sources.length >= 2, slug + ' has at least two sources');
  }
  // The dates in the copy, each taken from the page's sources.
  const dates = {
    'nativity-coloring-pages': 'Friday 25 December 2026',
    'new-year-coloring-pages': 'Friday 1 January 2027',
    'diwali-coloring-pages': 'Sunday 8 November',
    'hanukkah-coloring-pages': 'Friday 4 December'
  };
  for (const [slug, date] of Object.entries(dates)) {
    assert.ok(pages.get('/' + slug).includes(date), slug + ': ' + date);
  }
});

test('pages that gained a third example carry the 2026-10-15 sitemap date', () => {
  const xml = pages.get('/sitemap.xml').replace(/\s+/g, '');
  for (const slug of ['halloween', 'christmas', 'animal', 'easter', 'adult', 'winter'].map(s => s + '-coloring-pages')) {
    assert.ok(xml.includes(`${slug}</loc><lastmod>2026-10-15</lastmod>`), slug);
    assert.equal(THEME_EXAMPLES[slug].items.length, 3, slug);
  }
});
