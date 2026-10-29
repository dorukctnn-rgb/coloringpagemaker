// What the site publishes about its printable pages: the page records ("views") that the landing pages, the hub and the
// feed all read, the Pinterest RSS feed and the sitemap of the printable pages.
//
// Pinterest's "Auto-publish Pins" reads an RSS 2.x feed (help.pinterest.com, "Auto-publish Pins from your RSS feed"):
// the pin image comes from the item's <image>, <enclosure> or <media:content>, the title and description from the
// item's <title> and <description>, and every <link> must be on the claimed domain. New items become pins within 24
// hours, oldest first, at most 200 a day. So each item carries exactly one image tag (a second tag for the same image
// could open a second pin), and the feed only lists an item from the time it is released.
import { SEEDS } from './seeds.js';
import { SITE, LEVELS, THEMES, GROUPS } from './topics.js';

export const FEED_PATH = '/pins/feed.xml';
const SEED_THEME = THEMES.halloween;

const xmlText = s => String(s)
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const xmlAttr = s => xmlText(s).replace(/"/g, '&quot;');

// "Black line art coloring page of X, on white paper, under the title Y." -> without the title part, for the printable image.
export const printAlt = alt => String(alt).replace(/,? under the title [^.]*\.$/, '.');

// --- views: one shape for a seed and for a page made by the job ---
export function seedView(s) {
  const L = LEVELS[s.level];
  return {
    source: 'seed', slug: s.slug, theme: s.theme, group: SEED_THEME.group, level: s.level, headline: s.headline, sub: s.sub || L.sub,
    title: s.title, description: s.description, alt: printAlt(s.alt), intro: `${s.intro} ${L.line}.`, prompt: s.prompt,
    metaDescription: `${s.headline}: ${s.intro} Free to print as a PNG or a letter-size PDF.`,
    site: SEED_THEME.site, release: Date.parse(s.release), created: Date.parse(s.release),
    pinImage: `/pins/halloween-2026/${s.slug}.png`, pinBytes: s.pinBytes,
    pageImage: `/printables/img/${s.slug}.png`, thumbImage: `/printables/img/${s.slug}-400.png`
  };
}
export function autoView(p) {
  return {
    source: 'auto', slug: p.slug, theme: p.theme, group: p.group, level: p.level, headline: p.headline, sub: LEVELS[p.level].sub,
    title: p.title, description: p.description, alt: p.alt, intro: p.intro, prompt: p.prompt, metaDescription: p.metaDescription,
    site: p.site, release: p.release, created: p.created,
    pinImage: `/pins/auto/${p.slug}.png`, pinBytes: p.pinBytes,
    pageImage: `/printables/img/${p.slug}.png`, thumbImage: `/printables/img/${p.slug}-400.png`
  };
}
export const seedViews = () => SEEDS.map(seedView);
export const seedBySlug = slug => { const s = SEEDS.find(x => x.slug === slug); return s ? seedView(s) : null; };

// The released views, newest first: seeds whose time has come (unless seeds are off) and the pages of the job.
// frozenAt: when the kill switch froze the feed, nothing released later shows.
export function releasedViews({ now, autoPages, seedsOn = true, frozenAt = null }) {
  const cut = frozenAt == null ? now : Math.min(now, frozenAt);
  const all = [...autoPages.map(autoView), ...(seedsOn ? seedViews() : [])].filter(v => v.release <= cut);
  return all.sort((a, b) => b.release - a.release || (a.slug < b.slug ? -1 : 1));
}

// --- the Pinterest feed ---
export const pageUrl = slug => `${SITE}/printables/${slug}`;
export const itemLink = slug => `${pageUrl(slug)}?utm_source=pinterest&utm_medium=rss&utm_campaign=autopin&utm_content=${slug}`;
// The holiday pins (Thanksgiving, Christmas, Hanukkah, New Year, winter) link to the season page that matches the drawing
// (/santa-coloring-pages, /thanksgiving-coloring-pages, ...), tagged for the holiday2026 campaign; utm_content is the pin's slug,
// so each pin can be told apart in the site's traffic. Everything else keeps the link to its own printable page (itemLink).
export const HOLIDAY_CAMPAIGN = 'holiday2026';
export const holidayLink = (site, slug) => `${SITE}/${site}?utm_source=pinterest&utm_medium=social&utm_campaign=${HOLIDAY_CAMPAIGN}&utm_content=${slug}`;
export const linkOf = v => (THEMES[v.theme] && THEMES[v.theme].holiday && v.site ? holidayLink(v.site, v.slug) : itemLink(v.slug));
const rfc822 = ms => new Date(ms).toUTCString();

// days: how long an item stays in the feed (10 in production, tick.js). A feed connected late would otherwise start with a
// burst of everything from the last weeks, which Pinterest would turn into pins within 24 hours.
export function feedItems({ views, now, days = 21, max = 60, group = null }) {
  return views
    .filter(v => v.release <= now && v.release >= now - days * 24 * 3600 * 1000 && (!group || v.group === group))
    .slice(0, max);
}

export function buildFeed({ items, now, group = null }) {
  const self = SITE + FEED_PATH + (group ? `?group=${group}` : '');
  const built = items.length ? items[0].release : now;
  const title = group ? `ColoringPageMaker: ${GROUPS[group].short} printable coloring pages` : 'ColoringPageMaker: free printable coloring pages';
  const body = items.map(v => [
    '    <item>',
    `      <title>${xmlText(v.title)}</title>`,
    `      <link>${xmlText(linkOf(v))}</link>`,
    `      <description>${xmlText(v.description)}</description>`,
    `      <guid isPermaLink="false">cpm-pin-${xmlText(v.slug)}</guid>`,
    `      <pubDate>${rfc822(v.release)}</pubDate>`,
    `      <enclosure url="${xmlAttr(SITE + v.pinImage)}" length="${Math.max(0, Math.round(v.pinBytes || 0))}" type="image/png" />`,
    '    </item>'
  ].join('\n')).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xmlText(title)}</title>
    <link>${SITE}/printables</link>
    <description>Free printable coloring pages for kids and adults, drawn with ColoringPageMaker. A few new pages every day.</description>
    <language>en-us</language>
    <lastBuildDate>${rfc822(built)}</lastBuildDate>
    <ttl>60</ttl>
    <atom:link href="${xmlAttr(self)}" rel="self" type="application/rss+xml" />
${body}
  </channel>
</rss>
`;
}

// --- sitemap of the printable pages (the hub and every released page) ---
export function buildSitemap({ views, now }) {
  const lastmod = ms => new Date(ms).toISOString().slice(0, 10);
  const newest = views.length ? views[0].release : now;
  const urls = [`  <url>
    <loc>${SITE}/printables</loc>
    <lastmod>${lastmod(newest)}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`, ...views.map(v => `  <url>
    <loc>${xmlText(pageUrl(v.slug))}</loc>
    <lastmod>${lastmod(v.release)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`)].join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}
