// The Pro offer on the generator pages (views/partials/pro-nudge.ejs, the seasonal line in views/theme.ejs):
// what the free visitor is shown when the free pages run out, and what a Pro buyer is not shown.
// server.js runs as a child process with no KV and no OpenAI key, which is enough to render pages.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const h = require('./helpers');

const root = path.join(__dirname, '..');
const PRO_URL = 'https://dorukctn.gumroad.com/l/uynqt';
// The pages that carry the seasonal Pro line: Thanksgiving, Christmas, winter and holiday pages.
const SEASONAL = ['fall', 'thanksgiving', 'turkey', 'winter', 'nativity', 'new-year', 'gingerbread', 'snowman', 'diwali', 'hanukkah',
  'santa', 'reindeer', 'christmas-tree', 'christmas-ornament', 'snowflake', 'christmas', 'christmas-for-adults']
  .map(s => (s === 'christmas-for-adults' ? '/christmas-coloring-pages-for-adults' : '/' + s + '-coloring-pages'));
const NOT_SEASONAL = ['/halloween-coloring-pages', '/unicorn-coloring-pages', '/dragon-coloring-pages', '/cat-coloring-pages', '/space-coloring-pages'];
const NICHE = ['/mandala-coloring-pages', '/flower-coloring-pages', '/easter-coloring-pages'];

let app;
const pages = new Map();
before(async () => {
  app = await h.startApp({ KV_REST_API_URL: '', OPENAI_API_KEY: '' });
  for (const p of ['/', ...SEASONAL, ...NOT_SEASONAL, ...NICHE]) {
    const r = await fetch(app.base + p);
    assert.equal(r.status, 200, p);
    pages.set(p, await r.text());
  }
});
after(async () => { if (app) await app.stop(); });

test('every generator page carries the hidden Pro offer card with the price, what Pro includes and a way to activate', () => {
  for (const [p, html] of pages) {
    assert.equal(html.split('id="proNudge"').length - 1, 1, p + ' has one card');
    const card = html.slice(html.indexOf('<aside class="pro-nudge"'), html.indexOf('</aside>', html.indexOf('<aside class="pro-nudge"')));
    assert.match(card, /id="proNudge"[^>]*\shidden/, p + ': hidden until a limit');
    // the plain product link: the tracking script swaps it for the visitor's channel link on the click
    assert.ok(card.includes(`href="${PRO_URL}"`), p + ': product link');
    assert.match(card, /\$9 once\./);
    assert.match(card, /No subscription/);
    for (const line of ['Up to 150 pages a day', 'Up to 50 HD pages a month, then standard quality', 'All your pages in one PDF book, no watermark', 'Commercial use: sell your pages on Etsy and KDP']) {
      assert.ok(card.includes(line), p + ': ' + line);
    }
    assert.match(card, /Not now/);
    assert.match(card, /stay free to download as PNG/, p + ': says what stays free');
    // a Pro buyer without a key on this browser finds the place to enter it
    if (p === '/') assert.match(card, /href="#pro" data-open-pro>Enter your license key/);
    else assert.match(card, /href="\/#activate">Enter your license key/);
  }
});

test('the seasonal Pro line is on the Thanksgiving, Christmas and winter pages and on no other page', () => {
  for (const p of SEASONAL) {
    const html = pages.get(p);
    assert.equal(html.split('class="season-pro"').length - 1, 1, p);
    const box = html.slice(html.indexOf('class="season-pro"'), html.indexOf('</aside>', html.indexOf('class="season-pro"')));
    assert.ok(box.includes(`href="${PRO_URL}"`), p + ': product link');
    assert.match(box, /\$9 once with no subscription/);
    assert.match(box, /up to 50 HD pages a month/);
    assert.match(box, /href="\/#pro">Compare Free and Pro/);
    // it comes after the free examples (value first) and before the prompts article
    assert.ok(html.indexOf('id="examples"') < html.indexOf('class="season-pro"'), p + ': after the free examples');
    assert.ok(html.indexOf('class="season-pro"') < html.indexOf('<article class="content">'), p + ': before the article');
    // a Pro buyer's browser hides the boxes that sell Pro
    assert.ok(box.length > 0 && html.includes('class="season-pro" data-sells-pro'), p + ': marked as selling Pro');
  }
  for (const p of [...NOT_SEASONAL, ...NICHE, '/']) assert.ok(!pages.get(p).includes('class="season-pro"'), p + ' has no seasonal line');
});

test('theme pages: the bottom offer, the activation link and the Pro state', () => {
  for (const p of [...SEASONAL, ...NOT_SEASONAL]) {
    const html = pages.get(p);
    assert.ok(html.includes('<div class="wrap" data-sells-pro>'), p + ': the bottom offer is marked as selling Pro');
    assert.match(html, /Already bought Pro\? <a href="\/#activate">Enter your license key<\/a>/, p);
    assert.match(html, /<dt>Pro<\/dt><dd>\$9 once: up to 150 pages a day and up to 50 HD pages a month, no watermark/, p);
    // the wait is a few seconds on the free engine, not "10 to 40 seconds"
    assert.match(html, /id="loadingSub">This usually takes a few seconds</, p);
    // a Pro buyer is told Pro is active and the sales boxes go away, after the server confirms the token
    assert.match(html, /Pro is active on this browser: up to 150 pages a day\./, p);
    assert.match(html, /fetch\('\/verify-pro'/, p);
    assert.match(html, /\[data-sells-pro\]/, p);
  }
});

test('home page: the plan table and the Pro window name the HD pages, and the wait is honest', () => {
  const home = pages.get('/');
  assert.match(home, /<tr><th scope="row">Quality<\/th><td>Standard<\/td><td class="pro">Up to 50 HD pages a month, then standard<\/td><\/tr>/);
  assert.ok(home.includes('<li>Up to 50 HD pages a month, then standard quality</li>'), 'the window lists it');
  assert.match(home, /This usually takes a few seconds/);
  assert.doesNotMatch(home, /15 to 40 seconds|10-20 seconds/);
});

// The card's own script, run against a stub page.
function runCard({ pro = false, calm = false, hour = 'zz' } = {}) {
  const src = fs.readFileSync(path.join(root, 'views', 'partials', 'pro-nudge.ejs'), 'utf8');
  const m = /<script>([\s\S]*)<\/script>/.exec(src);
  assert.ok(m && !m[1].includes('<%'), 'the card script has no template tags');
  const els = {};
  const el = id => els[id] || (els[id] = { id, hidden: true, textContent: '', listeners: {}, scrolled: [],
    addEventListener(t, f) { this.listeners[t] = f; }, scrollIntoView(o) { this.scrolled.push(o); } });
  const win = { cpmPro: { token: () => (pro ? 'a'.repeat(64) : '') }, matchMedia: () => ({ matches: calm }) };
  const ctx = { window: win, document: { getElementById: el }, Date, console };
  vm.createContext(ctx);
  vm.runInContext(m[1], ctx);
  return { nudge: win.cpmNudge, el };
}

test('the card: titles, the reset time in the visitor clock, scrolling and the Not now button', () => {
  const a = runCard();
  assert.equal(a.nudge.show('last'), true);
  assert.equal(a.el('proNudge').hidden, false);
  assert.equal(a.el('proNudgeTitle').textContent, 'That was your last free page today');
  assert.equal(a.el('proNudge').scrolled.length, 0, 'the last free page does not move the page: the visitor is looking at it');
  assert.match(a.el('proNudgeLead').textContent, /^Your 2 free pages come back at .*\d.* \(midnight UTC\)\. Pro lets you keep drawing today\.$/);

  const b = runCard();
  b.nudge.show('limit');
  assert.equal(b.el('proNudgeTitle').textContent, 'You have used today’s free pages');
  assert.deepEqual(JSON.parse(JSON.stringify(b.el('proNudge').scrolled)), [{ behavior: 'smooth', block: 'start' }], 'a refused click scrolls the card into view');

  const c = runCard({ calm: true });
  c.nudge.show('pool');
  assert.equal(c.el('proNudgeTitle').textContent, 'Today’s free pages are all used');
  assert.match(c.el('proNudgeLead').textContent, /^The free pages are shared by every visitor and come back at /);
  assert.deepEqual(JSON.parse(JSON.stringify(c.el('proNudge').scrolled)), [{ behavior: 'auto', block: 'start' }], 'reduced motion: no smooth scroll');

  // Not now hides it and it stays hidden for the rest of the page view
  b.el('proNudgeDismiss').listeners.click();
  assert.equal(b.el('proNudge').hidden, true);
  assert.equal(b.nudge.show('limit'), false);
  assert.equal(b.el('proNudge').hidden, true);
});

test('the card: a Pro buyer never sees it', () => {
  const p = runCard({ pro: true });
  assert.equal(p.nudge.show('last'), false);
  assert.equal(p.nudge.show('limit'), false);
  assert.equal(p.el('proNudge').hidden, true);
  assert.equal(p.el('proNudge').scrolled.length, 0);
});

test('the reset time is the next midnight UTC in the visitor clock', () => {
  const { nudge, el } = runCard();
  nudge.show('last');
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const expected = next.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  assert.ok(el('proNudgeLead').textContent.includes('come back at ' + expected + ', your time (midnight UTC)'), el('proNudgeLead').textContent);
});

test('the offer copy has none of the banned glyphs or sales tricks', () => {
  const files = ['views/partials/pro-nudge.ejs', 'views/theme.ejs', 'views/index.ejs', 'views/niche.ejs'];
  for (const f of files) {
    const src = fs.readFileSync(path.join(root, f), 'utf8');
    assert.doesNotMatch(src, /—|→|✓|✨|!\s*<\/(p|h2|li|a)>/, f + ': no em dash, arrow, check mark or exclamation');
  }
  const card = fs.readFileSync(path.join(root, 'views', 'partials', 'pro-nudge.ejs'), 'utf8');
  assert.doesNotMatch(card, /limited time|only \d+ left|last chance|hurry|countdown|unlock|unleash/i, 'no fake scarcity or banned words');
});

test('theme pages: the spinner is removed before the offer card scrolls into view, so the scroll is not left short', () => {
  const html = pages.get('/christmas-coloring-pages');
  const handler = html.slice(html.indexOf("genBtn.addEventListener('click'"));
  const off = handler.indexOf("loading.classList.remove('active')");
  assert.ok(off > 0, 'the spinner is removed');
  assert.ok(off < handler.indexOf('cpmNudge.show('), 'before the card is shown');
  assert.ok(off < handler.indexOf('scrollTo(gallerySection)'), 'and before the gallery is scrolled to');
});
