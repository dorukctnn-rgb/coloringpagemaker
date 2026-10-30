// Theme pages: the "Free printable ... coloring pages" gallery on every theme page and the seasonal guides
// (fall, Thanksgiving, turkey, winter, nativity, New Year, gingerbread, snowman, Diwali, Hanukkah) and evergreen guides
// (dragon, cat, car, dog, mermaid, horse, fairy, butterfly, space, ocean). server.js runs as a child process with
// no KV and no OpenAI key, which is enough to render pages, serve the example files and build a free PDF.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const h = require('./helpers');
const THEME_EXAMPLES = require('../theme-examples.js');
const THEME_GUIDES = require('../theme-guides.js');
const BLOG_POSTS = require('../blog-posts.js');

const SEASONAL = ['fall-coloring-pages', 'thanksgiving-coloring-pages', 'turkey-coloring-pages', 'winter-coloring-pages',
  'nativity-coloring-pages', 'new-year-coloring-pages', 'gingerbread-coloring-pages', 'snowman-coloring-pages',
  'diwali-coloring-pages', 'hanukkah-coloring-pages'];
const EVERGREEN = ['dragon-coloring-pages', 'cat-coloring-pages', 'car-coloring-pages', 'dog-coloring-pages',
  'mermaid-coloring-pages', 'horse-coloring-pages', 'fairy-coloring-pages', 'butterfly-coloring-pages',
  'space-coloring-pages', 'ocean-coloring-pages'];
// The Christmas and winter pages of 27 October 2026.
const CHRISTMAS = ['santa-coloring-pages', 'reindeer-coloring-pages', 'christmas-tree-coloring-pages',
  'christmas-ornament-coloring-pages', 'snowflake-coloring-pages', 'christmas-coloring-pages-for-adults'];
// The folder under public/examples/ that holds a page's example files: its own name unless the entry says otherwise.
const dirOf = slug => THEME_EXAMPLES[slug].files || slug;
// Names of trademarked characters that must not appear in any guide or example on the new pages.
const TRADEMARKS = /disney|bluey|hello kitty|crayola|charlie brown|frosty|olaf|grinch|shrek|gingy|rudolph|peppa|ariel|lightning mcqueen|mcqueen|toothless|spyro|tinker ?bell|garfield|snoopy/i;
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
  const themesInSitemap = sitemapPaths.filter(p => /-coloring-pages(-for-adults)?$/.test(p) && !/self-publishing/.test(p) && !BLOG_POSTS[p.slice(1)]);
  assert.deepEqual(themesInSitemap.slice().sort(), themePaths().sort());
  const alts = new Set();
  for (const [slug, g] of Object.entries(THEME_EXAMPLES)) {
    // Every theme page has three examples, except the TWO_EXAMPLES pages.
    assert.ok(g.items.length >= (TWO_EXAMPLES.includes(slug) ? 2 : 3), slug + ' has ' + g.items.length + ' examples');
    assert.match(g.heading, /^Free printable .+ coloring pages$/);
    for (const x of g.items) {
      for (const suffix of ['.png', '-400.webp', '-800.webp']) {
        assert.ok(fs.existsSync(path.join(__dirname, '..', 'public', 'examples', dirOf(slug), x.name + suffix)), `${slug}/${x.name}${suffix}`);
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

test('every example has a Save to Pinterest link to its own page and PNG, with no Pinterest script', async () => {
  for (const p of themePaths()) {
    const slug = p.slice(1);
    const g = gallery(pages.get(p));
    const items = THEME_EXAMPLES[slug].items;
    const links = [...g.html.matchAll(/<a class="btn-small btn-small-outline" href="([^"]+)" target="_blank" rel="noopener" data-pin-save>Save to Pinterest<\/a>/g)];
    assert.equal(links.length, items.length, p + ': one Save to Pinterest link per example');
    for (const [i, [, raw]] of links.entries()) {
      // The browser reads the attribute with its HTML entities decoded (EJS escapes & and ').
      const u = new URL(raw.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&'));
      assert.equal(u.origin + u.pathname, 'https://www.pinterest.com/pin/create/button/');
      assert.equal(u.searchParams.get('url'), 'https://www.coloringpagemaker.app/' + slug + '?utm_source=pinterest&utm_medium=save&utm_campaign=examples');
      const media = u.searchParams.get('media');
      assert.equal(media, 'https://www.coloringpagemaker.app/examples/' + dirOf(slug) + '/' + items[i].name + '.png');
      const r = await fetch(app.base + new URL(media).pathname);
      assert.equal(r.status, 200, media);
      await r.arrayBuffer();
      assert.ok(u.searchParams.get('description').startsWith(items[i].title + '. '), p + ': description starts with the example title');
    }
    assert.doesNotMatch(pages.get(p), /pinit\.js|assets\.pinterest\.com/, p + ': no Pinterest script');
  }
  for (const p of sitemapPaths.filter(p => !themePaths().includes(p))) assert.doesNotMatch(pages.get(p), /data-pin-save/, p);
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

test('the seasonal and evergreen pages render with their own content, JSON-LD and sitemap entries', () => {
  const xml = pages.get('/sitemap.xml').replace(/\s+/g, '');
  for (const slug of [...SEASONAL, ...EVERGREEN, ...CHRISTMAS]) {
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
    assert.ok(!TRADEMARKS.test(JSON.stringify(g)), slug + ': no trademarked characters');
    assert.ok(!TRADEMARKS.test(JSON.stringify(THEME_EXAMPLES[slug])), slug + ': no trademarked characters in the examples');
  }
});

test('no seasonal or evergreen page is orphaned', () => {
  for (const slug of [...SEASONAL, ...EVERGREEN, ...CHRISTMAS]) {
    const linkers = sitemapPaths.filter(p => p !== '/' + slug && pages.get(p).includes(`href="/${slug}"`));
    assert.ok(linkers.length >= 3, `${slug} is linked from ${linkers.length} pages: ${linkers.join(' ')}`);
    assert.ok(linkers.includes('/blog'), slug + ' is in the theme guides hub');
  }
});

test('existing link lists keep their items and order; the seasonal pages are only appended', () => {
  const t = s => s + '-coloring-pages';
  const homeHtml = pages.get('/');
  const popular = homeHtml.slice(homeHtml.indexOf('<h2>Popular themes</h2>'));
  const home = [...popular.matchAll(/<li><a href="\/([a-z-]+-coloring-pages)"><strong>/g)].map(m => m[1]);
  assert.deepEqual(home, ['unicorn', 'dinosaur', 'mandala', 'halloween', 'christmas', 'animal', 'princess', 'flower', 'adult', 'fall', 'thanksgiving', 'winter',
    'nativity', 'new-year', 'gingerbread', 'snowman', 'diwali', 'hanukkah',
    'dragon', 'cat', 'car', 'dog', 'mermaid', 'horse', 'fairy', 'butterfly', 'space', 'ocean'].map(t));
  // The rotation the niche pages had before: the next six of the original ten themes, wrapping around.
  const ORIGINAL = ['unicorn', 'dinosaur', 'mandala', 'halloween', 'christmas', 'animal', 'flower', 'princess', 'easter', 'adult'].map(t);
  for (const slug of ['mandala', 'flower', 'easter'].map(t)) {
    const html = pages.get('/' + slug);
    const sec = html.slice(html.indexOf('<h2>Browse more themes</h2>'));
    const links = [...sec.slice(0, sec.indexOf('</section>')).matchAll(/href="\/([a-z-]+)"/g)].map(m => m[1]);
    const i = ORIGINAL.indexOf(slug);
    assert.deepEqual(links, [...[...ORIGINAL.slice(i + 1), ...ORIGINAL.slice(0, i)].slice(0, 6), ...SEASONAL, ...EVERGREEN, ...CHRISTMAS], slug);
  }
  // Related lists on existing guides: the original links first, in their order, then the seasonal ones.
  const related = {
    halloween: ['christmas', 'animal', 'adult', 'coloring-pages-for-classroom-teachers', 'fall'],
    christmas: ['halloween', 'animal', 'adult', 'coloring-pages-for-classroom-teachers', 'winter', 'nativity',
      'santa', 'reindeer', 'christmas-tree', 'christmas-ornament', 'snowflake', 'christmas-for-adults', 'elf', 'custom-christmas-book'],
    winter: ['christmas', 'animal', 'adult', 'coloring-pages-for-classroom-teachers', 'snowman', 'snowflake', 'reindeer'],
    animal: ['dinosaur', 'halloween', 'unicorn', 'coloring-pages-for-classroom-teachers', 'cat', 'dog', 'horse', 'butterfly']
  };
  for (const [slug, expected] of Object.entries(related)) {
    // The Christmas pages of 27 October 2026 end in "-coloring-pages-for-adults", never "<x>-coloring-pages" for that one.
    assert.deepEqual(THEME_GUIDES[t(slug)].related.map(r => r.href),
      expected.map(s => '/' + (s === 'christmas-for-adults' ? 'christmas-coloring-pages-for-adults' : s === 'custom-christmas-book' ? 'custom-christmas-coloring-book' : s.startsWith('coloring-pages-') ? s : t(s))), slug + ': related links');
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

test('the evergreen batch: three examples each, facts checked, sources and the generator untouched', () => {
  for (const slug of EVERGREEN) {
    assert.equal(THEME_EXAMPLES[slug].items.length, 3, slug + ' examples');
    assert.equal(THEME_GUIDES[slug].checked, '16 October 2026', slug + ' facts checked');
    assert.equal(THEME_GUIDES[slug].updated, '2026-10-16', slug + ' sitemap date');
    assert.ok(THEME_GUIDES[slug].sources.length >= 1, slug + ' has a source');
    // The generator on the page is the same one every theme page has.
    const html = pages.get('/' + slug);
    assert.equal(html.split('id="generateBtn"').length - 1, 1, slug + ' has one generator');
    assert.ok(html.indexOf('id="generateBtn"') < html.indexOf('<section class="examples"'), slug + ': examples below the generator');
  }
  // The sources named in the brief for each kind of page.
  const hosts = {
    'space-coloring-pages': /nasa\.gov/, 'ocean-coloring-pages': /noaa\.gov/, 'butterfly-coloring-pages': /nwf\.org/,
    'dragon-coloring-pages': /britannica\.com/, 'mermaid-coloring-pages': /britannica\.com/, 'fairy-coloring-pages': /britannica\.com/,
    'cat-coloring-pages': /cfa\.org/, 'dog-coloring-pages': /akc\.org/, 'horse-coloring-pages': /colostate\.edu|amha\.org/
  };
  for (const [slug, host] of Object.entries(hosts)) {
    assert.ok(THEME_GUIDES[slug].sources.some(s => host.test(s.href)), slug + ' cites ' + host);
  }
});

test('pages that gained a third example carry the date their content last changed in the sitemap', () => {
  const xml = pages.get('/sitemap.xml').replace(/\s+/g, '');
  // Christmas and winter were reworked on 27 October 2026 (query-led titles, links to the new pages), the rest were not.
  const lastmod = { halloween: '2026-10-15', christmas: '2026-10-27', animal: '2026-10-15', easter: '2026-10-15', adult: '2026-10-15', winter: '2026-10-27' };
  for (const [s, date] of Object.entries(lastmod)) {
    const slug = s + '-coloring-pages';
    assert.ok(xml.includes(`${slug}</loc><lastmod>${date}</lastmod>`), slug);
    assert.equal(THEME_EXAMPLES[slug].items.length, 3, slug);
  }
});

test('the Christmas and winter batch of 27 October 2026: query-led pages, real files, honest data', async () => {
  const xml = pages.get('/sitemap.xml').replace(/\s+/g, '');
  const QUERY = {
    'santa-coloring-pages': 'Santa Coloring Pages', 'reindeer-coloring-pages': 'Reindeer Coloring Pages',
    'christmas-tree-coloring-pages': 'Christmas Tree Coloring Pages', 'christmas-ornament-coloring-pages': 'Christmas Ornament Coloring Pages',
    'snowflake-coloring-pages': 'Snowflake Coloring Pages', 'christmas-coloring-pages-for-adults': 'Christmas Coloring Pages for Adults'
  };
  for (const slug of CHRISTMAS) {
    const g = THEME_GUIDES[slug];
    const html = pages.get('/' + slug);
    // The title, the H1 and the first sentence start from the phrase people type.
    assert.ok(g.title.startsWith(QUERY[slug]), slug + ': title starts with the query');
    assert.ok(g.h1.toLowerCase().startsWith(QUERY[slug].toLowerCase()), slug + ': h1 starts with the query');
    assert.match(g.lead, /^Print free [^.]+coloring pages/, slug + ': first sentence');
    assert.ok(g.title.length <= 66 && g.description.length <= 160, slug + ': title and description fit a result');
    assert.equal(g.updated, '2026-10-27');
    assert.equal(g.checked, '27 October 2026');
    assert.ok(xml.includes(`${slug}</loc><lastmod>2026-10-27</lastmod>`), slug + ' sitemap lastmod');
    assert.equal(THEME_EXAMPLES[slug].items.length, 3, slug + ' has three examples');
    assert.ok(g.sources.length >= 1 && g.sources.every(s => /^https:\/\//.test(s.href)), slug + ' sources');
    assert.ok(html.includes(`<link rel="canonical" href="https://www.coloringpagemaker.app/${slug}">`), slug + ' canonical');
    // The generator is pre-filled with the theme.
    assert.ok(html.includes('id="promptInput"') && html.includes(g.presetPrompt.replace(/'/g, '&#39;')), slug + ': generator pre-filled');
    // The JSON-LD lists exactly the example images that are on the page, and the files answer.
    const ld = JSON.parse(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)[1]);
    const gal = ld['@graph'].find(n => n['@type'] === 'ImageGallery');
    assert.ok(gal, slug + ' has an ImageGallery');
    assert.equal(gal.associatedMedia.length, THEME_EXAMPLES[slug].items.length);
    for (const m of gal.associatedMedia) {
      assert.match(m.contentUrl, new RegExp('^https://www\\.coloringpagemaker\\.app/examples/' + dirOf(slug) + '/'));
      const r = await fetch(app.base + new URL(m.contentUrl).pathname);
      assert.equal(r.status, 200, m.contentUrl);
      await r.arrayBuffer();
      assert.ok(html.includes(new URL(m.contentUrl).pathname.replace(/\.png$/, '-400.webp')), slug + ': the thumbnail is on the page');
    }
  }
  // The ornament page keeps the folder its files already had, and no second copy exists.
  assert.equal(THEME_EXAMPLES['christmas-ornament-coloring-pages'].files, 'ornament-coloring-pages');
  assert.ok(!fs.existsSync(path.join(__dirname, '..', 'public', 'examples', 'christmas-ornament-coloring-pages')));
  // No example is shown on two pages.
  const names = Object.values(THEME_EXAMPLES).flatMap(e => e.items.map(i => i.name));
  assert.equal(new Set(names).size, names.length, 'every example name is used once');
  // The home page links to every new page in its in-season section, and the guides hub lists them.
  const home = pages.get('/');
  const season = home.slice(home.indexOf('id="in-season"'), home.indexOf('<h2>Popular themes</h2>'));
  for (const slug of [...CHRISTMAS, 'thanksgiving-coloring-pages', 'christmas-coloring-pages', 'hanukkah-coloring-pages', 'new-year-coloring-pages']) {
    assert.ok(season.includes(`href="/${slug}"`), 'home in-season links to ' + slug);
  }
  for (const slug of CHRISTMAS) assert.ok(pages.get('/blog').includes(`href="/${slug}"`), slug + ' in the guides hub');
  // Dates the copy states.
  assert.ok(pages.get('/thanksgiving-coloring-pages').includes('Thursday 26 November 2026'));
  assert.ok(pages.get('/hanukkah-coloring-pages').includes('Friday 4 December'));
  assert.ok(pages.get('/new-year-coloring-pages').includes('Friday 1 January 2027'));
  // The Pilgrim facts come from the museum's page.
  assert.ok(THEME_GUIDES['thanksgiving-coloring-pages'].sources.some(s => /plimoth\.org\/for-students\/homework-help\/what-to-wear/.test(s.href)));
  // The pages whose wording was reworked still say how free printing works, and honestly: PNG free, free PDF watermarked.
  for (const s of ['christmas', 'thanksgiving', 'turkey', 'fall', 'winter', 'new-year', 'hanukkah', 'snowman', 'gingerbread']) {
    const g = THEME_GUIDES[s + '-coloring-pages'];
    assert.ok(/^Print free /.test(g.lead), s + ': lead starts from the query');
    assert.ok(g.faq.some(f => /free to print/.test(f.q) && /watermark/.test(f.a)), s + ': free-to-print answer');
    assert.equal(g.updated, '2026-10-27');
  }
  // Facts on the pages that were only retitled keep their check date.
  for (const s of ['nativity', 'new-year', 'gingerbread', 'snowman', 'diwali', 'hanukkah']) {
    assert.equal(THEME_GUIDES[s + '-coloring-pages'].checked, '15 October 2026', s);
  }
});

// Every ImageObject in the JSON-LD of every page carries the image metadata Google's image report asks for (search console
// mail of 28 October 2026: license, acquireLicensePage, creditText and copyrightNotice were missing).
function imageObjects(html) {
  const found = [];
  const walk = n => {
    if (Array.isArray(n)) return n.forEach(walk);
    if (!n || typeof n !== 'object') return;
    if (n['@type'] === 'ImageObject') found.push(n);
    Object.values(n).forEach(walk);
  };
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) walk(JSON.parse(m[1]));
  return found;
}

test('every ImageObject names its creator, license, license page, credit and copyright, and the license page says how the pages may be used', async () => {
  let total = 0;
  for (const [p, html] of pages) {
    if (p === '/sitemap.xml') continue;
    const objects = imageObjects(html);
    if (THEME_EXAMPLES[p.slice(1)] && THEME_GUIDES[p.slice(1)]) assert.equal(objects.length, THEME_EXAMPLES[p.slice(1)].items.length, p + ': one ImageObject per example');
    for (const img of objects) {
      total++;
      const where = p + ' ' + img.name;
      assert.deepEqual(img.creator, { '@type': 'Organization', name: 'ColoringPageMaker', url: 'https://www.coloringpagemaker.app/' }, where + ': creator');
      assert.equal(img.creditText, 'ColoringPageMaker', where + ': creditText');
      assert.equal(img.copyrightNotice, '© 2026 ColoringPageMaker', where + ': copyrightNotice');
      assert.equal(img.license, 'https://www.coloringpagemaker.app/terms', where + ': license');
      assert.equal(img.acquireLicensePage, 'https://www.coloringpagemaker.app/terms', where + ': acquireLicensePage');
      // what was there before stays
      for (const k of ['name', 'description', 'encodingFormat', 'contentUrl']) assert.ok(typeof img[k] === 'string' && img[k], where + ': ' + k);
    }
  }
  assert.ok(total >= 90, 'the theme galleries have ImageObjects (' + total + ')');
  // The copyright line is the one in the footer, and the license page is a real page that states the usage.
  assert.ok(pages.get('/').includes('&copy; 2026 ColoringPageMaker.'));
  const terms = await fetch(app.base + '/terms');
  assert.equal(terms.status, 200);
  const text = await terms.text();
  assert.match(text, /Using the pages you make/);
  assert.match(text, /personal, non-commercial use/);
  assert.match(text, /your own classroom/);
  assert.match(text, /With Pro you may also sell the pages you make/);
});
