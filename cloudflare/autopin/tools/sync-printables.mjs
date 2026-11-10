// Writes printables-index.json at the root of the repository: the free printable pages as the theme pages need them for their
// "Free printable <theme> pages" block. The pages themselves live in the Worker's Durable Object, which the static build cannot
// read, so this file is the copy the build sees. Run it again when the daily job has added pages and you want them linked
// from the theme pages (the pages work and are in the sitemap without it).
//
//   node cloudflare/autopin/tools/sync-printables.mjs                     reads https://www.coloringpagemaker.app/sitemap-printables.xml
//   node cloudflare/autopin/tools/sync-printables.mjs --from <file|url>   another sitemap
//   node cloudflare/autopin/tools/sync-printables.mjs --check             exits 1 when the file is out of date
//
// A page of the sitemap is described by its slug: the 30 seeds come from seeds.js, the pages of the job from the subject banks
// (topics.js), the same words the page and the sitemap use. A slug that is in neither is left out and named.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { allSubjects, describe, pageHeadline, THEMES } from '../topics.js';
import { seedViews } from '../feed.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(here, '..', '..', '..', 'printables-index.json');
const SITEMAP = 'https://www.coloringpagemaker.app/sitemap-printables.xml';

// Theme pages that also show the printables of a narrower page: the Christmas pages of the site belong to the main Christmas page,
// the turkey pages to the Thanksgiving page.
export const ALSO_SHOWN_ON = {
  'santa-coloring-pages': ['christmas-coloring-pages'],
  'reindeer-coloring-pages': ['christmas-coloring-pages'],
  'christmas-tree-coloring-pages': ['christmas-coloring-pages'],
  'christmas-ornament-coloring-pages': ['christmas-coloring-pages'],
  'snowflake-coloring-pages': ['christmas-coloring-pages', 'winter-coloring-pages'],
  'turkey-coloring-pages': ['thanksgiving-coloring-pages'],
  'turkey-disguise-template': ['turkey-coloring-pages', 'thanksgiving-coloring-pages'],
  'thankful-coloring-pages': ['thanksgiving-coloring-pages']
};

export function slugsOfSitemap(xml) {
  return [...xml.matchAll(/<loc>https:\/\/www\.coloringpagemaker\.app\/printables\/([a-z0-9-]+)<\/loc>/g)].map(m => m[1]);
}

// items: one entry per slug, in the order of the sitemap.
export function describePages(slugs) {
  const seeds = new Map(seedViews().map(v => [v.slug, v]));
  const subjects = new Map(allSubjects().map(s => [s.slug, s]));
  const items = [];
  const missing = [];
  for (const slug of slugs) {
    const seed = seeds.get(slug);
    if (seed) {
      items.push({ slug, headline: seed.headline, alt: seed.alt, level: seed.level, theme: seed.theme, group: seed.group, site: seed.site || null });
      continue;
    }
    const s = subjects.get(slug);
    if (!s) { missing.push(slug); continue; }
    const d = describe(s);
    items.push({ slug, headline: pageHeadline(s), alt: d.alt, level: s.level, theme: s.theme, group: THEMES[s.theme].group, site: s.site || (THEMES[s.theme] && THEMES[s.theme].site) || null });
  }
  for (const it of items) it.shows = [...new Set([it.site, ...(ALSO_SHOWN_ON[it.site] || [])].filter(Boolean))];
  return { items, missing };
}

export const indexText = items => JSON.stringify({ count: items.length, items }, null, 1) + '\n';

async function readSitemap(from) {
  if (/^https?:\/\//.test(from)) {
    const r = await fetch(from);
    if (!r.ok) throw new Error(`${from} answered ${r.status}`);
    return r.text();
  }
  return fs.readFileSync(from, 'utf8');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf('--from');
  const xml = await readSitemap(i > 0 ? process.argv[i + 1] : SITEMAP);
  const { items, missing } = describePages(slugsOfSitemap(xml));
  if (missing.length) console.error('not in seeds.js or the banks, left out: ' + missing.join(', '));
  const next = indexText(items);
  if (process.argv.includes('--check')) {
    const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').replace(/\r\n/g, '\n') : '';
    if (cur !== next) { console.error('printables-index.json is out of date: run node cloudflare/autopin/tools/sync-printables.mjs'); process.exit(1); }
    console.log('printables-index.json is up to date');
  } else {
    fs.writeFileSync(OUT, next);
    console.log(`wrote ${OUT}: ${items.length} pages`);
  }
}
