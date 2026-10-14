// Unit tests for the referrer classifier and the Pro link swap in views/partials/pro-source.ejs.
// The script runs exactly as browsers get it, inside a vm sandbox with a fake document, location and
// sessionStorage. The last test renders every page and checks that each one carries the script.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const h = require('./helpers');

const PARTIAL = fs.readFileSync(path.join(__dirname, '..', 'views', 'partials', 'pro-source.ejs'), 'utf8');
const SCRIPT = /^<script>\r?\n([\s\S]*)<\/script>\s*$/.exec(PARTIAL)[1];
const PRO_URL = 'https://dorukctn.gumroad.com/l/uynqt';
const OWN = 'www.coloringpagemaker.app';
// The Gumroad UTM links made on 14 October 2026 (campaign "coloringpagemaker", one per kind of site).
const LINKS = {
  google: 'https://gum.co/u/dsikakff',
  bing: 'https://gum.co/u/rpturwob',
  'other-search': 'https://gum.co/u/f93wludz',
  'ai-assistant': 'https://gum.co/u/tuooex5a',
  pinterest: 'https://gum.co/u/pev97h5v',
  social: 'https://gum.co/u/mzojadhp',
  referral: 'https://gum.co/u/hdddyxaj',
  direct: 'https://gum.co/u/c5e3rwd5'
};

// Runs the script once, like one page load, and returns what it left behind.
function load({ referrer = '', host = OWN, stored, storage = 'ok', prerendering = false } = {}) {
  const store = new Map(stored === undefined ? [] : [['cpm_source', stored]]);
  const writes = [];
  const listeners = {};
  const ctx = {
    window: {},
    location: { hostname: host },
    document: {
      referrer,
      prerendering,
      addEventListener(type, fn, opts) { (listeners[type] = listeners[type] || []).push({ fn, opts }); }
    }
  };
  if (storage === 'ok') {
    ctx.sessionStorage = {
      getItem: k => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { writes.push([k, String(v)]); store.set(k, String(v)); }
    };
  } else if (storage === 'methods-throw') {
    ctx.sessionStorage = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('QuotaExceededError'); } };
  } else if (storage === 'access-throws') {
    // Safari and Chrome with site data blocked throw as soon as the page reads window.sessionStorage.
    Object.defineProperty(ctx, 'sessionStorage', { get() { throw new Error('SecurityError'); } });
  }
  vm.createContext(ctx);
  vm.runInContext(SCRIPT, ctx);
  return {
    api: ctx.window.cpmSource,
    writes,
    listeners,
    fire(type, target) { for (const l of listeners[type] || []) l.fn({ type, target }); }
  };
}
const classify = (referrer, host = OWN) => load().api.classify(referrer, host);
// A fake <a> element, and a <span> inside it.
function anchor(href) { const a = { href, closest: sel => (sel === 'a[href]' ? a : null) }; return a; }
const inside = a => ({ closest: sel => (sel === 'a[href]' ? a : null) });

const CASES = [
  ['', 'direct'],
  // Google search, every country domain, but not other Google products
  ['https://www.google.com/', 'google'],
  ['https://google.com/search?q=unicorn+coloring+pages', 'google'],
  ['https://www.google.co.uk/', 'google'],
  ['https://www.google.com.tr/', 'google'],
  ['https://www.google.de/', 'google'],
  ['https://m.google.com/', 'google'],
  ['https://images.google.com/', 'google'],
  ['HTTPS://WWW.GOOGLE.COM/', 'google'],
  ['https://www.google.com./', 'google'],
  ['https://www.google.com:443/url?q=x', 'google'],
  ['android-app://com.google.android.googlequicksearchbox/', 'google'],
  ['https://gemini.google.com/app', 'ai-assistant'],
  ['https://classroom.google.com/c/123', 'referral'],
  ['https://docs.google.com/document/d/x', 'referral'],
  ['https://notgoogle.com/', 'referral'],
  ['https://google.com.evil.example/', 'referral'],
  // Bing and the other search engines
  ['https://www.bing.com/', 'bing'],
  ['https://cn.bing.com/search?q=x', 'bing'],
  ['android-app://com.microsoft.bing/', 'bing'],
  ['https://duckduckgo.com/', 'other-search'],
  ['https://html.duckduckgo.com/', 'other-search'],
  ['https://search.yahoo.com/', 'other-search'],
  ['https://r.search.yahoo.com/', 'other-search'],
  ['https://search.yahoo.co.jp/', 'other-search'],
  ['https://yandex.ru/', 'other-search'],
  ['https://yandex.com.tr/', 'other-search'],
  ['https://ya.ru/', 'other-search'],
  ['https://www.ecosia.org/', 'other-search'],
  ['https://search.brave.com/', 'other-search'],
  ['https://www.baidu.com/', 'other-search'],
  ['https://m.baidu.com/', 'other-search'],
  ['https://search.naver.com/', 'other-search'],
  ['https://m.search.naver.com/', 'other-search'],
  ['https://search.seznam.cz/', 'other-search'],
  ['https://www.qwant.com/', 'other-search'],
  ['https://www.startpage.com/', 'other-search'],
  ['https://blog.naver.com/someone/123', 'referral'],
  // AI assistants
  ['https://chatgpt.com/', 'ai-assistant'],
  ['https://chat.openai.com/', 'ai-assistant'],
  ['https://www.perplexity.ai/', 'ai-assistant'],
  ['https://copilot.microsoft.com/', 'ai-assistant'],
  ['https://claude.ai/', 'ai-assistant'],
  ['https://you.com/', 'ai-assistant'],
  ['https://www.phind.com/', 'ai-assistant'],
  ['android-app://com.openai.chatgpt/', 'ai-assistant'],
  // Pinterest, on any country domain and its short links
  ['https://www.pinterest.com/', 'pinterest'],
  ['https://pinterest.com/pin/123/', 'pinterest'],
  ['https://www.pinterest.co.uk/', 'pinterest'],
  ['https://br.pinterest.com/', 'pinterest'],
  ['https://www.pinterest.com.mx/', 'pinterest'],
  ['https://www.pinterest.de/', 'pinterest'],
  ['https://pin.it/abc', 'pinterest'],
  ['android-app://com.pinterest/', 'pinterest'],
  // Social networks, including their link redirectors
  ['https://l.facebook.com/', 'social'],
  ['https://lm.facebook.com/l.php?u=x', 'social'],
  ['https://m.facebook.com/', 'social'],
  ['https://www.facebook.com/groups/1', 'social'],
  ['https://l.instagram.com/', 'social'],
  ['https://www.reddit.com/r/coloring/', 'social'],
  ['https://old.reddit.com/', 'social'],
  ['https://out.reddit.com/', 'social'],
  ['https://x.com/', 'social'],
  ['https://t.co/abc', 'social'],
  ['https://mobile.twitter.com/', 'social'],
  ['https://www.youtube.com/', 'social'],
  ['https://m.youtube.com/', 'social'],
  ['https://www.tiktok.com/', 'social'],
  ['https://www.threads.net/', 'social'],
  ['https://www.threads.com/', 'social'],
  ['https://www.linkedin.com/', 'social'],
  ['https://lnkd.in/x', 'social'],
  ['https://www.quora.com/', 'social'],
  ['https://user:pw@reddit.com/', 'social'],
  ['android-app://com.reddit.frontpage/', 'social'],
  ['android-app://com.facebook.katana/', 'social'],
  // Everything else outside this site
  ['https://bit.co/', 'referral'],
  ['https://box.com/', 'referral'],
  ['https://www.etsy.com/listing/1', 'referral'],
  ['https://peakappsstudio.com/', 'referral'],
  ['http://example.org/page', 'referral'],
  ['android-app://com.google.android.gm/', 'referral'],
  ['android-app://org.telegram.messenger/', 'referral'],
  ['android-app://constructor/', 'referral'],
  // Not recorded: this site, Gumroad, or nothing readable
  ['https://www.coloringpagemaker.app/unicorn-coloring-pages', ''],
  ['https://coloringpagemaker.app/', ''],
  ['https://WWW.ColoringPageMaker.app/', ''],
  ['https://dorukctn.gumroad.com/l/uynqt', ''],
  ['https://gumroad.com/checkout', ''],
  ['https://gum.co/u/abc', ''],
  ['about:blank', ''],
  ['file:///C:/Users/me/page.html', ''],
  ['chrome-extension://abcdef/popup.html', ''],
  ['android-app://', ''],
  ['https:///nohost', ''],
  ['not a url', '']
];

test('classifies referrers into one kind of site', () => {
  for (const [referrer, want] of CASES) assert.equal(classify(referrer), want, JSON.stringify(referrer));
});

test('the page\'s own host is ignored, whatever it is', () => {
  assert.equal(classify('http://localhost:3000/blog', 'localhost'), '');
  assert.equal(classify('https://cpm-git-branch.vercel.app/', 'cpm-git-branch.vercel.app'), '');
  assert.equal(classify('http://127.0.0.1:3000/', 'localhost'), 'referral');
});

test('the first page of a visit stores only the category word', () => {
  const r = load({ referrer: 'https://www.pinterest.co.uk/pin/123456/?q=unicorn' });
  assert.equal(r.api.source, 'pinterest');
  assert.deepEqual(r.writes, [['cpm_source', 'pinterest']]);
  const empty = load({ referrer: '' });
  assert.equal(empty.api.source, 'direct');
  assert.deepEqual(empty.writes, [['cpm_source', 'direct']]);
});

test('later pages keep the first category of the tab', () => {
  for (const referrer of ['https://www.coloringpagemaker.app/', 'https://www.google.com/', '']) {
    const r = load({ referrer, stored: 'pinterest' });
    assert.equal(r.api.source, 'pinterest', referrer);
    assert.deepEqual(r.writes, [], referrer);
  }
});

test('this site or Gumroad as the referrer: nothing stored and the plain link stays', () => {
  for (const referrer of ['https://www.coloringpagemaker.app/blog', 'https://dorukctn.gumroad.com/l/uynqt', 'not a url']) {
    const r = load({ referrer });
    assert.equal(r.api.source, '', referrer);
    assert.deepEqual(r.writes, [], referrer);
    assert.deepEqual(Object.keys(r.listeners), [], 'no click listeners: ' + referrer);
  }
});

test('a stored value that is not a category is replaced', () => {
  for (const junk of ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'https://www.google.com/', 'GOOGLE', '']) {
    const r = load({ referrer: 'https://www.bing.com/', stored: junk });
    assert.equal(r.api.source, 'bing', junk);
    assert.deepEqual(r.writes, [['cpm_source', 'bing']], junk);
    const a = anchor(PRO_URL);
    r.fire('click', a);
    assert.equal(a.href, LINKS.bing, junk);
  }
});

test('blocked storage: the page still uses its own referrer and nothing throws', () => {
  for (const storage of ['methods-throw', 'access-throws']) {
    const r = load({ referrer: 'https://chatgpt.com/', storage });
    assert.equal(r.api.source, 'ai-assistant', storage);
    const a = anchor(PRO_URL);
    r.fire('click', a);
    assert.equal(a.href, LINKS['ai-assistant'], storage);
  }
});

test('a prerendered page stores its category only once the visitor opens it', () => {
  const r = load({ referrer: 'https://www.google.com/', prerendering: true });
  assert.equal(r.api.source, 'google');
  assert.deepEqual(r.writes, []);
  r.fire('prerenderingchange');
  assert.deepEqual(r.writes, [['cpm_source', 'google']]);
});

test('each category sends the Pro click through its own Gumroad UTM link', () => {
  const seen = new Set();
  for (const [category, link] of Object.entries(LINKS)) {
    assert.match(link, /^https:\/\/gum\.co\/u\/[a-z0-9]{8}$/);
    seen.add(link);
    const r = load({ referrer: 'https://www.coloringpagemaker.app/', stored: category });
    const a = anchor(PRO_URL);
    r.fire('click', a);
    assert.equal(a.href, link, category);
  }
  assert.equal(seen.size, 8);
});

test('the Pro link is swapped as it is followed, by mouse, touch or keyboard', () => {
  for (const type of ['mousedown', 'touchstart', 'click']) {
    const r = load({ referrer: 'https://www.google.com/' });
    const a = anchor(PRO_URL);
    assert.equal(a.href, PRO_URL, 'unchanged before the visitor follows it');
    r.fire(type, inside(a));
    assert.equal(a.href, LINKS.google, type);
  }
  const r = load({ referrer: '' });
  const q = anchor(PRO_URL + '?wanted=true');
  r.fire('click', q);
  assert.equal(q.href, LINKS.direct);
  // Capture phase, so the link changes before any page handler runs; touchstart must not block scrolling.
  assert.equal(r.listeners.mousedown[0].opts, true);
  assert.equal(r.listeners.click[0].opts, true);
  assert.equal(r.listeners.touchstart[0].opts.capture, true);
  assert.equal(r.listeners.touchstart[0].opts.passive, true);
});

test('other links and odd click targets are left alone', () => {
  const r = load({ referrer: 'https://www.google.com/' });
  for (const href of ['https://www.coloringpagemaker.app/', 'https://dorukctn.gumroad.com/l/uynqtx', 'https://dorukctn.gumroad.com/l/other', 'https://gumroad.com/l/uynqt', 'http://dorukctn.gumroad.com/l/uynqt']) {
    const a = anchor(href);
    r.fire('click', a);
    r.fire('mousedown', inside(a));
    assert.equal(a.href, href);
  }
  for (const target of [null, undefined, {}, { closest: () => null }, { closest() { throw new Error('detached'); } }]) {
    assert.doesNotThrow(() => r.fire('click', target));
  }
});

test('every page carries the script in its head, and serves the plain product link', async () => {
  const app = await h.startApp({ KV_REST_API_URL: '', OPENAI_API_KEY: '' });
  try {
    const xml = await (await fetch(app.base + '/sitemap.xml')).text();
    const paths = [...xml.matchAll(/<loc>https:\/\/www\.coloringpagemaker\.app([^<]*)<\/loc>/g)].map(m => m[1] || '/');
    assert.ok(paths.length > 10);
    for (const p of [...paths, '/no-such-page']) {
      const r = await fetch(app.base + p, { redirect: 'manual' });
      const html = await r.text();
      assert.equal(r.status, p === '/no-such-page' ? 404 : 200, p);
      assert.equal(html.split(SCRIPT).length - 1, 1, p + ' has the script once, unchanged');
      assert.ok(html.indexOf(SCRIPT) < html.indexOf('</head>'), p + ' has it in the head');
      assert.doesNotMatch(html, /href="https:\/\/gum\.co/, p + ' serves no tracking link');
    }
    for (const p of ['/', '/unicorn-coloring-pages', '/mandala-coloring-pages']) {
      const html = await (await fetch(app.base + p)).text();
      assert.ok(html.includes('href="https://dorukctn.gumroad.com/l/uynqt"'), p + ' keeps the product link');
    }
    const privacy = await (await fetch(app.base + '/privacy')).text();
    assert.match(privacy, /what kind of site sent you/);
    assert.match(privacy, /no cookies and no analytics/);
    const sitemap = xml.replace(/\s+/g, '');
    assert.ok(sitemap.includes('privacy</loc><lastmod>2026-10-14'), 'privacy lastmod');
  } finally {
    await app.stop();
  }
});
