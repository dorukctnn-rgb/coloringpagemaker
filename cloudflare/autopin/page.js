// The HTML of the printable pages: one landing page for each coloring page (where a pin's click lands) and the hub
// that lists them. They use the same shell (head assets, navigation, footer) and the same styles as every other page of
// the site, plus a few rules of their own for the page image and for printing.
import { SHELL } from './shell.js';
import { SITE, LEVELS, GROUPS } from './topics.js';
import { pageUrl, CONTENT_REVISED } from './feed.js';
import { pageNotes, relatedViews, META_TAIL } from './notes/index.js';

export const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// JSON for <script type="application/ld+json">: no raw "<", so the block cannot be closed early.
const jsonLd = obj => JSON.stringify(obj).replace(/</g, '\\u003c');
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const dateText = ms => { const d = new Date(ms); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const isoDate = ms => new Date(ms).toISOString().slice(0, 10);
const LEVEL_LABEL = { simple: 'Easy', medium: 'Medium', detailed: 'Detailed' };
// How the call to action names a site page whose address does not end in -coloring-pages.
const SITE_NAMES = { 'christmas-coloring-pages-for-adults': 'adult Christmas' };

const HEAD_COMMON = `<meta name="google-site-verification" content="FbTHVuCc47YEKFw9nyT2XbH2ZgpbtjZPZce7boWZgH0" />
<meta name="p:domain_verify" content="13cf5111c1b82113fad5ae7932381a41"/>
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">`;

const STYLE = `<style>
/* Full width: every block is as wide as the screen between the site's gutters (the navigation and the footer of these pages too).
   From 1024 px the title and the buttons sit beside the picture, and the four notes run in two columns below. */
:root{--pr-g:clamp(16px,4vw,64px)}
.nav-inner,.site-footer-inner,.hero-wide>.wrap,.pr-wide{max-width:none;width:min(100% - 2 * var(--pr-g),2240px);margin-left:auto;margin-right:auto}
.nav-inner,.site-footer-inner{padding-left:0;padding-right:0}
.hero-wide>.wrap,.pr-wide{padding:0}
.pr-top .hero-wide>.wrap{width:auto}
.pr-text{margin-top:28px}
.pr-text section{margin:0 0 8px}
.pr-text h2{font-size:clamp(1.55rem,3vw,2.05rem);margin:34px 0 12px}
.pr-text section:first-child h2{margin-top:0}
.pr-text p{margin-bottom:16px;line-height:1.7;max-width:68ch}
.pr-text .list{margin:0 0 18px;padding-left:1.2em;max-width:68ch}
.pr-text .list li{margin:0 0 10px;line-height:1.65;padding-left:2px}
.printable-fig{margin:0;background:#fff;border:1px solid var(--line);border-radius:14px;overflow:hidden}
.printable-fig picture{display:block}
.printable-fig img{display:block;width:100%;height:auto;aspect-ratio:1/1;background:#fff}
.printable-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:14px}
.printable-actions .btn-small{display:inline-block;text-decoration:none;font-size:14px;padding:9px 16px}
.printable-meta{margin-top:12px;color:var(--muted);font-size:14px}
.crumbs{font-size:14px;color:var(--muted);margin-bottom:14px}
.crumbs a{color:inherit}
.print-sheet{display:none}
.hub-group{max-width:none;width:min(100% - 2 * var(--pr-g),2240px);padding:0}
.hub-group .examples-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.hub-group .examples-grid figure{margin:0}
.related-three .examples-grid{grid-template-columns:minmax(0,1fr)}
.pr-cta{max-width:none;margin-top:clamp(40px,6vw,64px)}
.hub-card{display:block;text-decoration:none;color:inherit}
/* the list of older pages: plain links, in columns */
.older-title{font-family:var(--body);font-size:12px;color:var(--muted);margin:26px 0 10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em}
.older-list{list-style:none;columns:2;column-gap:28px;font-size:15px}
.older-list li{padding:3px 0;break-inside:avoid}
.hub-card:hover strong{text-decoration:underline;text-underline-offset:4px;text-decoration-color:var(--accent)}
@media (min-width:640px){.related-three .examples-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.hub-group .examples-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}}
@media (min-width:1024px){
  .pr-top{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,6fr);grid-template-areas:"head fig" "tools fig" "meta fig" "rest fig";grid-template-rows:auto auto auto 1fr;column-gap:clamp(32px,4.5vw,88px);align-items:start}
  .pr-top .printable{display:contents}
  .pr-head{grid-area:head}
  .printable-fig{grid-area:fig;margin-top:clamp(36px,5vw,64px)}
  .printable-actions{grid-area:tools;margin-top:6px}
  .printable-meta{grid-area:meta}
  .pr-text{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));column-gap:clamp(32px,4.5vw,88px);margin-top:clamp(36px,5vw,64px)}
  .pr-text section{margin-bottom:28px}
  .pr-text h2{margin-top:0}
  .pr-cta{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px clamp(24px,4vw,64px);align-items:center}
  .pr-cta h2,.pr-cta p{grid-column:1}
  .pr-cta p{margin-bottom:0}
  .pr-cta .btn{grid-column:2;grid-row:1 / span 2}
}
@media (min-width:1100px){.hub-group .examples-grid{grid-template-columns:repeat(6,minmax(0,1fr))}.related-three .examples-grid{grid-template-columns:repeat(3,minmax(0,480px))}}
@media print{
  @page{margin:.4in}
  body > :not(.print-sheet){display:none !important}
  .print-sheet{display:block !important}
  .print-sheet img{display:block;width:100%;height:auto;max-height:10in;object-fit:contain}
}
</style>`;

function pinSaveHref(v) {
  return 'https://www.pinterest.com/pin/create/button/?url=' + encodeURIComponent(pageUrl(v.slug) + '?utm_source=pinterest&utm_medium=save&utm_campaign=printables')
    + '&media=' + encodeURIComponent(SITE + v.pinImage)
    + '&description=' + encodeURIComponent(v.headline + '. Free printable coloring page from ColoringPageMaker.');
}

const PDF_SCRIPT = `<script>
// "Letter PDF" sends the page PNG through the same /download-pdf route as the pages made on the home page, so a free
// visitor gets the usual free PDF and a Pro visitor gets it without the watermark. If anything fails, the PNG opens.
(function () {
  function save(blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 10000);
  }
  document.addEventListener('click', function (e) {
    var p = e.target && e.target.closest ? e.target.closest('[data-print]') : null;
    if (p) { window.print(); return; }
    var b = e.target && e.target.closest ? e.target.closest('[data-example-pdf]') : null;
    if (!b || b.disabled) return;
    var png = b.getAttribute('data-example-pdf'), label = b.textContent;
    b.disabled = true; b.textContent = 'Making PDF...';
    fetch(png).then(function (r) { if (!r.ok) throw new Error('png'); return r.blob(); })
      .then(function (blob) {
        return new Promise(function (ok, fail) { var fr = new FileReader(); fr.onload = function () { ok(fr.result); }; fr.onerror = fail; fr.readAsDataURL(blob); });
      })
      .then(function (dataUrl) {
        return fetch('/download-pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageUrls: [dataUrl], token: '' }) });
      })
      .then(function (r) { if (!r.ok) throw new Error('pdf'); return r.blob(); })
      .then(function (pdf) { save(pdf, b.getAttribute('data-name') + '.pdf'); })
      .catch(function () { window.open(png, '_blank', 'noopener'); })
      .then(function () { b.disabled = false; b.textContent = label; });
  });
})();
</script>`;

function shell({ title, description, canonical, ogImage, ogAlt, ld, body, afterMain = '', extraHead = '' }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${esc(ogImage)}">
<meta property="og:image:alt" content="${esc(ogAlt)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${esc(ogImage)}">
${HEAD_COMMON}
<link rel="canonical" href="${esc(canonical)}">
${SHELL.headAssets}
${STYLE}
<script type="application/ld+json">${jsonLd(ld)}</script>
${extraHead}
</head>
<body>

${SHELL.nav}

<main id="main">
${body}
</main>

${SHELL.footer}
${afterMain}

${PDF_SCRIPT}
</body>
</html>
`;
}

function card(v) {
  return `    <li class="image-card">
      <a class="hub-card" href="/printables/${esc(v.slug)}">
        <figure>
          <img src="${esc(v.thumbImage)}" width="400" height="400" alt="${esc(v.alt)}" loading="lazy" decoding="async">
          <figcaption><strong>${esc(v.headline)}</strong><span>${LEVEL_LABEL[v.level]}, added ${dateText(v.release)}</span></figcaption>
        </figure>
      </a>
    </li>`;
}

// Image metadata that Google's image report asks for on every ImageObject; the same values as server.js (theme pages).
// The terms say free pages are for personal, non-commercial use (at home or in your own classroom) and that Pro adds selling.
const IMAGE_META = {
  creator: { '@type': 'Organization', name: 'ColoringPageMaker', url: SITE + '/' },
  creditText: 'ColoringPageMaker',
  copyrightNotice: '© 2026 ColoringPageMaker',
  license: SITE + '/terms',
  acquireLicensePage: SITE + '/terms'
};

// The title and the meta description of a landing page. The title keeps "Free Printable" unless that would run past 60 characters.
export function titleOf(v) {
  const t = `${v.headline}, Free Printable`;
  return t.length <= 60 ? t : `${v.headline}, Free PDF`;
}
export function metaOf(n, v) {
  const m = `${n.m}${META_TAIL}`;
  return m.length <= 155 ? m : `${String(n.m).slice(0, 155 - META_TAIL.length).replace(/\s+\S*$/, '')}${META_TAIL}`;
}

// v: a view (feed.js); neighbors: other views of the same group, newest first ("More <group>");
// related3: the three pages named as related to this one (service.js passes them from all the released pages; without them
// they are picked from the neighbors).
export function renderLanding(v, neighbors = [], related3 = null) {
  const url = pageUrl(v.slug);
  const L = LEVELS[v.level];
  const group = GROUPS[v.group];
  const siteHref = '/' + (v.site || '') + (v.site ? '#generator' : '');
  const siteName = v.site ? (SITE_NAMES[v.site] || v.site.replace(/-coloring-pages$/, '').replace(/-/g, ' ')) : '';
  const notes = pageNotes(v);
  const rel = (related3 || relatedViews(v, neighbors, 3)).filter(r => r.slug !== v.slug).slice(0, 3);
  const relSlugs = new Set(rel.map(r => r.slug));
  const more = neighbors.filter(r => r.slug !== v.slug && !relSlugs.has(r.slug)).slice(0, 6);
  const webp = v.pageImage.replace(/\.png$/, '.webp');
  const modified = isoDate(Math.max(v.release, Date.parse(CONTENT_REVISED)));
  const description = metaOf(notes, v);
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage', '@id': url + '#webpage', url, name: v.headline, description,
        dateModified: modified, isPartOf: { '@type': 'WebSite', name: 'ColoringPageMaker', url: SITE + '/' },
        breadcrumb: { '@id': url + '#breadcrumb' }, primaryImageOfPage: { '@id': url + '#image' }
      },
      {
        '@type': 'ImageObject', '@id': url + '#image', url: SITE + v.pageImage, contentUrl: SITE + v.pageImage, thumbnailUrl: SITE + v.thumbImage,
        name: v.headline, description: v.alt, encodingFormat: 'image/png', width: 1024, height: 1024, datePublished: isoDate(v.release),
        ...IMAGE_META
      },
      {
        '@type': 'BreadcrumbList', '@id': url + '#breadcrumb',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' },
          { '@type': 'ListItem', position: 2, name: 'Free printables', item: SITE + '/printables' },
          { '@type': 'ListItem', position: 3, name: v.headline, item: url }
        ]
      }
    ]
  };
  const body = `<div class="pr-wide pr-top">
<header class="hero hero-wide pr-head">
  <div class="wrap">
    <p class="crumbs"><a href="/">Home</a> / <a href="/printables">Free printables</a> / ${esc(group.short)}</p>
    <p class="eyebrow">${esc(group.short)}</p>
    <h1>${esc(v.headline)}</h1>
    <p class="lead">${esc(v.intro)}</p>
    <ul class="facts-inline">
      <li>Free for personal use</li>
      <li>PNG and letter PDF</li>
      <li>${LEVEL_LABEL[v.level]} level, ${esc(L.ages)}</li>
    </ul>
  </div>
</header>
<section class="printable" aria-label="The coloring page">
  <figure class="printable-fig">
    <picture>
      <source type="image/webp" srcset="${esc(webp)}">
      <img src="${esc(v.pageImage)}" width="1024" height="1024" alt="${esc(v.alt)}" fetchpriority="high">
    </picture>
  </figure>
  <div class="printable-actions">
    <a class="btn-small" href="${esc(v.pageImage)}" download="${esc(v.slug)}.png">Download PNG</a>
    <button type="button" class="btn-small btn-small-outline" data-example-pdf="${esc(v.pageImage)}" data-name="${esc(v.slug)}">Letter PDF</button>
    <button type="button" class="btn-small btn-small-outline" data-print>Print</button>
    <a class="btn-small btn-small-outline" href="${esc(pinSaveHref(v))}" target="_blank" rel="noopener" data-pin-save>Save to Pinterest</a>
  </div>
  <p class="printable-meta">Added ${dateText(v.release)}. Drawn with the ColoringPageMaker generator from the sentence &ldquo;${esc(v.prompt)}&rdquo;.</p>
</section>
</div>

<article class="pr-wide pr-text">
  <section>
    <h2>About this coloring page</h2>
    <p>${esc(notes.a)}</p>
    <p>${esc(notes.l)}</p>
  </section>
  <section>
    <h2>Printing and coloring tips</h2>
    <p>${esc(notes.p)}</p>
    <p>${esc(notes.c)}</p>
  </section>
  <section>
    <h2>How to use it</h2>
    <p>${esc(notes.u)}</p>
  </section>
  <section>
    <h2>How to print it</h2>
    <ul class="list">
      <li>Download the PNG and print it at 100 percent on US Letter or A4 paper. The page is 1024 by 1024 pixels, about 136 DPI on a letter page.</li>
      <li>The Letter PDF puts the page in the middle of a US Letter sheet with even margins.</li>
      <li>Free pages are for personal use, at home or in your own classroom. They may not be sold.</li>
    </ul>
  </section>
</article>
${rel.length ? `
<section class="examples hub-group related-three" aria-labelledby="related-title">
  <h2 id="related-title">Related printable coloring pages</h2>
  <ul class="examples-grid">
${rel.map(card).join('\n')}
  </ul>
</section>
` : ''}${more.length ? `
<section class="examples hub-group" aria-labelledby="more-title">
  <h2 id="more-title">More ${esc(group.label)}</h2>
  <ul class="examples-grid">
${more.map(card).join('\n')}
  </ul>
  <p class="examples-intro" style="margin-top:16px"><a href="/printables">See all free printable coloring pages</a></p>
</section>
` : ''}
<div class="pr-wide">
  <div class="pricing-cta pr-cta">
    <h2>Draw a page of your own</h2>
    <p>Type what you want to color, pick the detail level and get a printable page in under a minute. Two pages a day are free, with no account.</p>
    <a href="${esc(siteHref)}" class="btn">${v.site ? 'Make your own ' + esc(siteName) + ' page' : 'Open the generator'}</a>
  </div>
</div>`;
  // The sheet that prints is a child of <body> itself: the print rules hide every other child of <body>.
  const afterMain = `<div class="print-sheet"><img src="${esc(v.pageImage)}" width="1024" height="1024" alt=""></div>`;
  return shell({
    title: titleOf(v),
    description, canonical: url, ogImage: SITE + v.pageImage, ogAlt: v.alt, ld, body, afterMain
  });
}

// views: released views, newest first (feed.js releasedViews).
export function renderHub(views, now) {
  const url = SITE + '/printables';
  const order = [];
  for (const v of views) if (!order.includes(v.group)) order.push(v.group);
  const sections = order.map(g => {
    const all = views.filter(v => v.group === g);
    const items = all.slice(0, 36), older = all.slice(36, 400);
    return `<section class="examples hub-group" aria-labelledby="g-${g}">
  <h2 id="g-${g}">${esc(GROUPS[g].label)}</h2>
  <ul class="examples-grid">
${items.map(card).join('\n')}
  </ul>${older.length ? `
  <h3 class="older-title">Older pages</h3>
  <ul class="older-list">
${older.map(v => `    <li><a href="/printables/${esc(v.slug)}">${esc(v.headline)}</a></li>`).join('\n')}
  </ul>` : ''}
</section>`;
  }).join('\n\n');
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage', '@id': url + '#page', url, name: 'Free printable coloring pages',
        description: 'Free printable coloring pages for kids and adults, a few new pages every day.',
        dateModified: isoDate(views.length ? views[0].release : now), isPartOf: { '@type': 'WebSite', name: 'ColoringPageMaker', url: SITE + '/' }
      },
      {
        '@type': 'ItemList', itemListElement: views.slice(0, 50).map((v, i) => ({ '@type': 'ListItem', position: i + 1, url: pageUrl(v.slug), name: v.headline }))
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' },
          { '@type': 'ListItem', position: 2, name: 'Free printables', item: url }
        ]
      }
    ]
  };
  const body = `<header class="hero hero-wide">
  <div class="wrap">
    <p class="eyebrow">Free printables</p>
    <h1>Free printable coloring pages</h1>
    <p class="lead">A few new pages every day, drawn with ColoringPageMaker for kids and adults. Open a page to download the PNG or a letter-size PDF and print it at home.</p>
    <ul class="facts-inline">
      <li>Free for personal use</li>
      <li>No account</li>
      <li>PNG and letter PDF</li>
    </ul>
  </div>
</header>

${sections || `<section class="examples"><p class="examples-intro">The first pages arrive soon. Meanwhile, <a href="/">draw your own page</a> with the free generator.</p></section>`}

<div class="pr-wide">
  <div class="pricing-cta pr-cta">
    <h2>Draw a page of your own</h2>
    <p>Type what you want to color, pick the detail level and get a printable page in under a minute. Two pages a day are free, with no account.</p>
    <a href="/" class="btn">Open the generator</a>
  </div>
</div>`;
  return shell({
    title: 'Free Printable Coloring Pages for Kids and Adults',
    description: 'Free printable coloring pages for kids and adults: Halloween, fall, Thanksgiving, Christmas, winter and animals. A few new pages every day, as a PNG or a letter-size PDF.',
    canonical: url, ogImage: SITE + '/og-image.png', ogAlt: 'ColoringPageMaker free printable coloring pages', ld, body
  });
}
