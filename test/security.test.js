// End-to-end checks for Pro activation and the PDF route. server.js runs as a child process with
// OpenAI and Upstash replaced by local mocks; license keys are checked against the real Gumroad API.
//
// The valid-key tests need the creator's test-purchase key for this product. It is read from
// CPM_TEST_LICENSE_KEY, or from the file in CPM_TEST_KEYS_FILE (test-keys.json from the saas-factory
// test-purchase scripts, or a text file holding only the key). The key is never printed.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const h = require('./helpers');

const KV_TOKEN = 'test-kv-token';
const TEST_PURCHASE_DIR = 'C:/Users/doruk/.claude/skills/saas-factory/scripts/gumroad/test-purchase';

function readTestLicenseKey() {
  if (process.env.CPM_TEST_LICENSE_KEY) return process.env.CPM_TEST_LICENSE_KEY.trim();
  const files = [process.env.CPM_TEST_KEYS_FILE, `${TEST_PURCHASE_DIR}/test-key-uynqt.txt`, `${TEST_PURCHASE_DIR}/test-keys.json`].filter(Boolean);
  for (const f of files) {
    try {
      const raw = fs.readFileSync(f, 'utf8');
      if (f.endsWith('.json')) {
        const row = JSON.parse(raw).find(r => /^coloring\s*page\s*maker/i.test(r.title || '') && r.key);
        if (row) return row.key.trim();
      } else if (raw.trim()) {
        return raw.trim();
      }
    } catch (e) { /* try the next place */ }
  }
  return '';
}
const LICENSE_KEY = readTestLicenseKey();
const NO_KEY = LICENSE_KEY ? false : 'no ColoringPageMaker test-purchase key found (set CPM_TEST_KEYS_FILE)';

let kv, openai, canary, app;
const PNG_RGB = h.makePng({ width: 64, height: 64, colorType: 2 });
const PNG_RGBA = h.makePng({ width: 64, height: 64, colorType: 6 });
let ipCounter = 0;
const freshIp = () => `203.0.113.${++ipCounter}`;

async function post(path, body, ip = freshIp()) {
  const res = await fetch(app.base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: JSON.stringify(body),
    redirect: 'manual'
  });
  const buf = Buffer.from(await res.arrayBuffer());
  const text = buf.toString('utf8');
  let json = null;
  try { json = JSON.parse(text); } catch (e) {}
  return { status: res.status, type: res.headers.get('content-type') || '', buf, text, json };
}
const pdf = (imageUrls, extra = {}) => post('/download-pdf', { imageUrls, ...extra });

before(async () => {
  kv = await h.startKv(KV_TOKEN);
  openai = await h.startOpenAI(PNG_RGBA.toString('base64'));
  canary = await h.startCanary();
  app = await h.startApp({
    KV_REST_API_URL: kv.url,
    KV_REST_API_TOKEN: KV_TOKEN,
    OPENAI_API_KEY: 'sk-test-not-a-real-key',
    OPENAI_BASE_URL: openai.baseURL
  });
});

after(async () => {
  if (app) await app.stop();
  await Promise.all([kv && kv.close(), openai && openai.close(), canary && canary.close()]);
});

// ---------- verify-pro ----------

test('verify-pro with an email only returns pro:false and no email, even for a recorded buyer', async () => {
  // A buyer recorded by the Gumroad webhook before this change.
  kv.put('pro:buyer@example.com', { sale_id: 'legacy-sale', product_id: 'p', granted_at: '2026-10-01T00:00:00.000Z' });
  for (const email of ['buyer@example.com', 'nobody@example.com']) {
    const r = await post('/verify-pro', { email });
    assert.equal(r.status, 200);
    assert.deepEqual(r.json, { pro: false });
    assert.ok(!r.text.includes('@'), 'response must not contain an email address');
  }
});

test('verify-pro with an invalid license key returns pro:false', async () => {
  const r = await post('/verify-pro', { license_key: 'AAAAAAAA-BBBBBBBB-CCCCCCCC-DDDDDDDD', email: 'buyer@example.com' });
  assert.equal(r.status, 200);
  assert.deepEqual(r.json, { pro: false });
  assert.ok(!r.text.includes('@'));
});

test('verify-pro with an unknown or malformed token returns pro:false', async () => {
  for (const token of ['f'.repeat(64), 'not-a-token', '', 42]) {
    const r = await post('/verify-pro', { token });
    assert.deepEqual(r.json, { pro: false });
  }
});

// ---------- generate: free tier and legacy email ----------

test('free generate works twice a day per IP, then asks for Pro', async () => {
  const ip = freshIp();
  const a = await post('/generate', { prompt: 'a cat in a hat', style: 'simple' }, ip);
  assert.equal(a.status, 200, a.text);
  assert.equal(a.json.isPro, false);
  assert.equal(a.json.remaining, 1);
  assert.match(a.json.imageUrl, /^data:image\/png;base64,/);
  const b = await post('/generate', { prompt: 'a cat in a hat' }, ip);
  assert.equal(b.json.remaining, 0);
  const c = await post('/generate', { prompt: 'a cat in a hat' }, ip);
  assert.equal(c.status, 429);
  assert.equal(c.json.limitReached, true);
  assert.equal(c.json.reason, 'free_daily_cap', 'the page tells the visitor own limit from the shared pool and from a Pro cap');
});

test('an email sent to generate does not turn Pro on', async () => {
  const r = await post('/generate', { prompt: 'a dog', email: 'buyer@example.com' });
  assert.equal(r.status, 200);
  assert.equal(r.json.isPro, false);
  assert.equal(r.json.remaining, 1);
});

test('an unknown token gets the free tier', async () => {
  const r = await post('/generate', { prompt: 'a dog', token: 'a'.repeat(64) });
  assert.equal(r.json.isPro, false);
});

// ---------- the valid key: token, Pro generate, Pro PDF, revocation, sign-out ----------

let token = '';
let saleId = '';

test('a valid license key returns a token and never an email', { skip: NO_KEY }, async () => {
  const r = await post('/verify-pro', { license_key: LICENSE_KEY });
  assert.equal(r.status, 200);
  assert.equal(r.json.pro, true);
  assert.match(r.json.token, /^[a-f0-9]{64}$/);
  assert.deepEqual(Object.keys(r.json).sort(), ['pro', 'token']);
  assert.ok(!r.text.includes('@'), 'response must not contain an email address');
  token = r.json.token;

  const rec = kv.get(`protoken:${token}`);
  assert.ok(rec, 'token is stored in Redis');
  assert.deepEqual(Object.keys(rec).sort(), ['created', 'email', 'sale_id']);
  assert.ok(rec.sale_id && rec.email.includes('@') && !Number.isNaN(Date.parse(rec.created)));
  saleId = rec.sale_id;
  const ttlDays = kv.ttlSeconds(`protoken:${token}`) / 86400;
  assert.ok(ttlDays > 399 && ttlDays <= 400, `TTL is about 400 days (got ${ttlDays.toFixed(1)})`);
  // The license key itself is not stored anywhere.
  for (const [, e] of kv.store) assert.ok(!e.value.includes(LICENSE_KEY), 'license key must not be stored');

  const again = await post('/verify-pro', { license_key: LICENSE_KEY });
  assert.notEqual(again.json.token, token, 'each activation gets a new random token');
  await post('/pro-signout', { token: again.json.token });
});

test('Pro works with that token: generate, token check and an unwatermarked multi-page PDF', { skip: NO_KEY }, async () => {
  assert.ok(token, 'needs the token from the previous test');
  const ip = freshIp();
  const g = await post('/generate', { prompt: 'a castle', token }, ip);
  assert.equal(g.status, 200, g.text);
  assert.equal(g.json.isPro, true);
  assert.equal(g.json.remaining, -1);
  const today = new Date().toISOString().split('T')[0];
  assert.equal(kv.get(`usage:pro:${today}:${saleId}`), 1, 'Pro usage is counted per sale');
  assert.equal(kv.get(`usage:${today}:${ip}`), null, 'no free counter for a Pro request');

  const check = await post('/verify-pro', { token });
  assert.deepEqual(check.json, { pro: true });

  const r = await pdf([g.json.imageUrl, h.dataUrl('png', PNG_RGB), h.dataUrl('jpeg', h.TINY_JPEG)], { token });
  assert.equal(r.status, 200, r.text);
  assert.match(r.type, /application\/pdf/);
  assert.equal(h.pdfPages(r.buf), 3);
  assert.ok(!h.pdfText(r.buf).includes('FREE PREVIEW'), 'Pro PDF has no watermark');
});

test('a refund reported by the webhook ends the token', { skip: NO_KEY }, async () => {
  assert.ok(token && saleId);
  kv.put(`prorevoked:${saleId}`, { revoked_at: new Date().toISOString() });
  const g = await post('/generate', { prompt: 'a castle', token });
  assert.equal(g.json.isPro, false);
  assert.deepEqual((await post('/verify-pro', { token })).json, { pro: false });
  kv.store.delete(`prorevoked:${saleId}`);
  assert.deepEqual((await post('/verify-pro', { token })).json, { pro: true });
});

test('signing out deletes the token from Redis', { skip: NO_KEY }, async () => {
  assert.ok(token);
  const r = await post('/pro-signout', { token });
  assert.deepEqual(r.json, { ok: true });
  assert.equal(kv.get(`protoken:${token}`), null);
  assert.deepEqual((await post('/verify-pro', { token })).json, { pro: false });
});

// ---------- download-pdf: only image data ----------

test('free PDF: one page with the watermark', async () => {
  const r = await pdf([h.dataUrl('png', PNG_RGB), h.dataUrl('png', PNG_RGB)]);
  assert.equal(r.status, 200, r.text);
  assert.equal(h.pdfPages(r.buf), 1);
  assert.ok(h.pdfText(r.buf).includes('FREE PREVIEW'));
});

test('download-pdf accepts PNG (with and without alpha) and JPEG data URLs', async () => {
  for (const src of [h.dataUrl('png', PNG_RGB), h.dataUrl('png', PNG_RGBA), h.dataUrl('jpeg', h.TINY_JPEG)]) {
    const r = await pdf([src]);
    assert.equal(r.status, 200, r.text);
    assert.match(r.type, /application\/pdf/);
    assert.equal(r.buf.toString('latin1', 0, 5), '%PDF-');
  }
});

test('download-pdf rejects URLs and never fetches them', async () => {
  const urls = [
    'http://169.254.169.254/latest/meta-data/',
    'http://169.254.169.254/',
    'http://localhost/',
    `http://localhost:${canary.port}/a.png`,
    `http://127.0.0.1:${canary.port}/a.png`,
    `http://[::1]:${canary.port}/a.png`,
    'https://oaidalleapiprodscus.blob.core.windows.net/a.png',
    'https://example.com/page.png',
    'file:///C:/Windows/win.ini',
    'file:///etc/passwd',
    'C:/Windows/win.ini',
    'server.js',
    'ftp://example.com/a.png',
    'gopher://127.0.0.1:6379/_INFO'
  ];
  for (const u of urls) {
    const r = await pdf([u]);
    assert.equal(r.status, 400, `${u} should be refused`);
    assert.ok(r.json && r.json.error);
  }
  // A Pro request takes the same path.
  const pro = await pdf([`http://127.0.0.1:${canary.port}/b.png`], { token: token || 'b'.repeat(64) });
  assert.equal(pro.status, 400);
  assert.equal(canary.hits.length, 0, 'the server must not make any request');
});

test('download-pdf rejects data that is not a PNG or JPEG image', async () => {
  const cases = [
    'data:text/html;base64,' + Buffer.from('<script>alert(1)</script>').toString('base64'),
    'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>').toString('base64'),
    'data:image/gif;base64,R0lGODlhAQABAAAAACw=',
    'data:image/png;base64,' + Buffer.from('not an image at all').toString('base64'),
    h.dataUrl('png', h.TINY_JPEG), // declared PNG, bytes are JPEG
    h.dataUrl('jpeg', PNG_RGB), // declared JPEG, bytes are PNG
    'data:image/png,' + PNG_RGB.toString('base64'), // not base64-marked
    'data:image/png;base64,' + PNG_RGB.toString('base64') + '"><img>',
    h.dataUrl('png', h.makePng({ width: 8, height: 8, ihdrWidth: 100000, ihdrHeight: 100000 })),
    h.dataUrl('png', h.makePng({ width: 8, height: 8, colorType: 6, filterByte: 9 })),
    h.dataUrl('png', h.makePng({ width: 8, height: 8, interlace: 1 })),
    h.dataUrl('png', PNG_RGBA.subarray(0, PNG_RGBA.length - 20)), // truncated
    123,
    { url: 'http://169.254.169.254/' },
    null
  ];
  for (const src of cases) {
    const r = await pdf([src]);
    assert.equal(r.status, 400, `should refuse: ${String(typeof src === 'string' ? src.slice(0, 40) : JSON.stringify(src))}`);
  }
  assert.equal((await pdf('http://169.254.169.254/')).status, 400);
  assert.equal((await pdf([])).status, 400);
  assert.ok(app.alive(), 'a broken PNG must not crash the server');
});

test('download-pdf refuses WebP with 415, since PDFKit cannot embed it', async () => {
  const r = await pdf([h.dataUrl('webp', h.TINY_WEBP)]);
  assert.equal(r.status, 415);
});

test('download-pdf refuses images over 8 MB', async () => {
  const big = Buffer.concat([PNG_RGB.subarray(0, 33), Buffer.alloc(8 * 1024 * 1024 + 10)]);
  const r = await pdf([h.dataUrl('png', big)]);
  assert.equal(r.status, 413);
});

test('the server is still up and has not printed any license key', { skip: NO_KEY }, async () => {
  assert.ok(app.alive());
  assert.ok(!app.log().includes(LICENSE_KEY));
});

test('every page in the sitemap still renders', async () => {
  const xml = await (await fetch(app.base + '/sitemap.xml')).text();
  const paths = [...xml.matchAll(/<loc>https:\/\/www\.coloringpagemaker\.app([^<]*)<\/loc>/g)].map(m => m[1] || '/');
  assert.ok(paths.length > 10);
  for (const p of paths) {
    const r = await fetch(app.base + p, { redirect: 'manual' });
    assert.equal(r.status, 200, p);
  }
  const privacy = await (await fetch(app.base + '/privacy')).text();
  assert.match(privacy, /400 days/);
  assert.doesNotMatch(privacy, /activate with your email/i);
  const terms = await (await fetch(app.base + '/terms')).text();
  assert.match(terms, /only with the license key/);
});
