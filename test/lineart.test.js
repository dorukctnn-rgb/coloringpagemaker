// lineart.js: gray, pencil-shaded pages become clean black and white; clean line art passes through unchanged.
// Synthetic pages are drawn here and written with pngjs, an independent PNG library (devDependency only).
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const h = require('./helpers');
const lineart = require('../lineart.js');

// ---------- drawing helpers (luminance: 0 black .. 255 white) ----------
function blank(w, hgt) { return { w, h: hgt, L: new Uint8Array(w * hgt).fill(255) }; }
// Anti-aliased ring of half-width `half` around radius r: solid black core, one-pixel soft edge.
function ring(img, cx, cy, r, half) {
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    const d = Math.abs(Math.hypot(x + 0.5 - cx, y + 0.5 - cy) - r);
    const cover = Math.max(0, Math.min(1, half + 0.5 - d));
    const i = y * img.w + x;
    img.L[i] = Math.min(img.L[i], Math.round(255 * (1 - cover)));
  }
}
// Anti-aliased straight line of half-width `half` from (x0, y0) to (x1, y1), in tone `ink` (0 is black).
function line(img, x0, y0, x1, y1, half, ink = 0) {
  const dx = x1 - x0, dy = y1 - y0, len2 = dx * dx + dy * dy;
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
    const px = x + 0.5, py = y + 0.5;
    const t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / len2));
    const d = Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy));
    const cover = Math.max(0, Math.min(1, half + 0.5 - d));
    const i = y * img.w + x;
    img.L[i] = Math.min(img.L[i], Math.round(255 - cover * (255 - ink)));
  }
}
function fillRect(img, x0, y0, x1, y1, v) { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) img.L[y * img.w + x] = v; }
function toPng(img, { colorType = 2, filterType = -1, alpha = null } = {}) {
  const png = new PNG({ width: img.w, height: img.h });
  for (let i = 0; i < img.L.length; i++) {
    png.data[4 * i] = png.data[4 * i + 1] = png.data[4 * i + 2] = img.L[i];
    png.data[4 * i + 3] = alpha ? alpha[i] : 255;
  }
  return PNG.sync.write(png, { colorType, filterType });
}
function decodeWithPngjs(buf) {
  const p = PNG.sync.read(buf);
  const L = new Uint8Array(p.width * p.height);
  for (let i = 0; i < L.length; i++) L[i] = (77 * p.data[4 * i] + 150 * p.data[4 * i + 1] + 29 * p.data[4 * i + 2]) >> 8;
  return { w: p.width, h: p.height, L };
}
// A clean coloring page: rings and lines of several widths, black cores with anti-aliased edges.
function cleanPage(size) {
  const img = blank(size, size), s = size / 512;
  ring(img, 256 * s, 256 * s, 180 * s, 3 * s);
  ring(img, 180 * s, 200 * s, 50 * s, 2 * s);
  ring(img, 330 * s, 200 * s, 50 * s, 2 * s);
  line(img, 120 * s, 380 * s, 390 * s, 380 * s, 2.5 * s);
  line(img, 256 * s, 220 * s, 230 * s, 300 * s, 1.5 * s);
  return img;
}
// A pencil-shaded page: the same outline plus a gray fill, light hatching, dark hatching and stipple dots.
function shadedPage(size) {
  const img = blank(size, size), s = size / 512;
  ring(img, 256 * s, 256 * s, 200 * s, 3 * s);
  fillRect(img, Math.round(150 * s), Math.round(150 * s), Math.round(250 * s), Math.round(250 * s), 170); // gray fill
  for (let k = 0; k < 40; k++) line(img, (270 + 4 * k) * s, 150 * s, (250 + 4 * k) * s, 250 * s, 0.6 * s, 150); // light gray hatching
  for (let y = Math.round(280 * s); y < Math.round(370 * s); y++) for (let x = Math.round(150 * s); x < Math.round(250 * s); x++) img.L[y * size + x] = (x + y) % 4 === 0 ? 150 : img.L[y * size + x];
  for (let k = 0; k < 6; k++) line(img, 280 * s, (290 + 12 * k) * s, 360 * s, (290 + 12 * k) * s, 1.2 * s); // dark hatching
  for (let y = Math.round(395 * s); y < Math.round(430 * s); y += 5) for (let x = Math.round(200 * s); x < Math.round(290 * s); x += 5) fillRect(img, x, y, x + 2, y + 2, 40); // stipple dots, 5 px apart, inside the ring
  return img;
}

// ---------- unit tests ----------
test('decodeLuma reads 8-bit gray, RGB, gray+alpha and RGBA with every PNG filter exactly like pngjs', () => {
  const img = blank(61, 47);
  let seed = 7;
  for (let i = 0; i < img.L.length; i++) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; img.L[i] = seed % 256; }
  for (const colorType of [0, 2, 4, 6]) {
    for (const filterType of [0, 1, 2, 3, 4, -1]) {
      const buf = toPng(img, { colorType, filterType });
      const ours = lineart.decodeLuma(buf), ref = decodeWithPngjs(buf);
      assert.equal(ours.w, 61); assert.equal(ours.h, 47);
      assert.deepEqual(Buffer.from(ours.L), Buffer.from(ref.L), `colour type ${colorType}, filter ${filterType}`);
    }
  }
  // Colour: luminance from real RGB values.
  const png = new PNG({ width: 3, height: 1 });
  [[255, 0, 0], [0, 255, 0], [10, 20, 250]].forEach(([r, g, b], i) => { png.data.set([r, g, b, 255], 4 * i); });
  const L = lineart.decodeLuma(PNG.sync.write(png, { colorType: 2 })).L;
  assert.deepEqual([...L], [(77 * 255) >> 8, (150 * 255) >> 8, (77 * 10 + 150 * 20 + 29 * 250) >> 8]);
  // Transparent pixels count as white paper.
  const alpha = new Uint8Array(img.L.length).fill(0);
  const clear = lineart.decodeLuma(toPng(blank(61, 47), { colorType: 6, alpha })).L;
  assert.ok(clear.every(v => v === 255));
});

test('clean line art passes through byte for byte', () => {
  for (const size of [512, 1024]) {
    const buf = toPng(cleanPage(size));
    const r = lineart.cleanColoringPage(buf);
    assert.equal(r.cleaned, false, 'size ' + size);
    assert.equal(r.buffer, buf, 'the very same buffer comes back');
    assert.ok(r.before.detached < lineart.GATE / 4, 'well under the gate: ' + r.before.detached);
    assert.ok(r.before.gray > 0, 'the anti-aliased edges are there');
  }
});

test('gray fills, hatching and stipple become black and white, and the outline stays', () => {
  const size = 512, img = shadedPage(size);
  const r = lineart.cleanColoringPage(toPng(img), { measureAfter: true });
  assert.equal(r.cleaned, true);
  assert.ok(r.before.detached > lineart.GATE, 'over the gate before: ' + r.before.detached);
  assert.equal(r.after.detached, 0, 'no gray left that is not touching black ink');
  assert.deepEqual([...r.buffer.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const out = decodeWithPngjs(r.buffer); // independent decoder reads the result
  assert.equal(out.w, size); assert.equal(out.h, size);
  const at = (x, y) => out.L[y * size + x];
  // Every pixel is black, white, or the one-pixel rim right next to black.
  for (let y = 1; y < size - 1; y++) for (let x = 1; x < size - 1; x++) {
    const v = at(x, y);
    if (v === 0 || v === 255) continue;
    let touches = false;
    for (let dy = -1; dy <= 1 && !touches; dy++) for (let dx = -1; dx <= 1; dx++) if (at(x + dx, y + dy) === 0) { touches = true; break; }
    assert.ok(touches, `gray pixel ${v} at ${x},${y} is not on the rim of a line`);
  }
  assert.equal(at(256, 256 - 200), 0, 'the outline ring keeps its black core');
  assert.equal(at(200, 200), 255, 'the gray fill turns white');
  assert.equal(at(300, 200), 255, 'light hatching turns white');
  assert.equal(at(200, 320), 255, 'the gray texture turns white');
  assert.equal(at(320, 290), 0, 'dark hatching strokes stay as solid black lines');
  let stipple = 0;
  for (let y = 395; y < 432; y++) for (let x = 200; x < 292; x++) if (at(x, y) < 255) stipple++;
  assert.equal(stipple, 0, 'stipple dots are removed');
});

test('unsupported or broken files come back unchanged and never throw', () => {
  const example = fs.readFileSync(path.join(__dirname, '..', 'public', 'examples', 'turkey-coloring-pages', 'turkey-cartoon.png')); // 4-bit palette
  const good = toPng(cleanPage(64));
  for (const buf of [example, h.TINY_JPEG, Buffer.from('not a png'), good.subarray(0, 40), Buffer.alloc(0)]) {
    const r = lineart.cleanColoringPage(buf);
    assert.equal(r.cleaned, false);
    assert.equal(r.buffer, buf);
  }
});

test('a 1024 x 1024 page is measured and cleaned quickly', () => {
  const heavy = toPng(shadedPage(1024)), light = toPng(cleanPage(1024));
  const time = buf => { const t = []; for (let k = 0; k < 3; k++) { const s = process.hrtime.bigint(); lineart.cleanColoringPage(buf); t.push(Number(process.hrtime.bigint() - s) / 1e6); } return t.sort((a, b) => a - b)[1]; };
  const cleaned = time(heavy), kept = time(light);
  console.log(`# lineart timing on this machine: cleaned ${cleaned.toFixed(0)} ms, kept ${kept.toFixed(0)} ms (median of 3)`);
  // A generous ceiling against accidental slow paths; the production target is about 300 ms.
  assert.ok(cleaned < 1000, 'cleaning took ' + cleaned + ' ms');
  assert.ok(kept < 1000, 'measuring took ' + kept + ' ms');
});

// ---------- through the /generate route ----------
const SHADED = toPng(shadedPage(256)), CLEAN = toPng(cleanPage(256));
let kv, openai, app;
const prompts = [];
before(async () => {
  kv = await h.startKv('lineart-kv');
  // OpenAI images mock that answers with the shaded page when the prompt mentions "pencil".
  openai = http.createServer((req, res) => {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      const p = JSON.parse(body || '{}').prompt || '';
      prompts.push(p);
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ created: 1, data: [{ b64_json: (/pencil/.test(p) ? SHADED : CLEAN).toString('base64') }] }));
    });
  });
  await new Promise(r => openai.listen(0, '127.0.0.1', r));
  app = await h.startApp({
    KV_REST_API_URL: kv.url, KV_REST_API_TOKEN: 'lineart-kv', OPENAI_API_KEY: 'sk-test-not-a-real-key',
    OPENAI_BASE_URL: `http://127.0.0.1:${openai.address().port}/v1`
  });
});
after(async () => {
  if (app) await app.stop();
  if (kv) await kv.close();
  if (openai) await new Promise(r => openai.close(r));
});
let ip = 0;
async function generate(prompt, style) {
  const r = await fetch(app.base + '/generate', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-forwarded-for': `198.51.100.${++ip}` }, body: JSON.stringify({ prompt, style }) });
  return { status: r.status, json: await r.json() };
}

test('/generate returns clean line art unchanged and cleans a pencil-shaded page', async () => {
  const kept = await generate('a cat in a hat', 'simple');
  assert.equal(kept.status, 200);
  assert.equal(kept.json.imageUrl, 'data:image/png;base64,' + CLEAN.toString('base64'), 'exactly what the model returned');

  const fixed = await generate('a pencil drawing of an owl', 'detailed');
  assert.equal(fixed.status, 200);
  const m = /^data:image\/png;base64,(.+)$/.exec(fixed.json.imageUrl);
  assert.ok(m, 'still a PNG data URL');
  const png = Buffer.from(m[1], 'base64');
  assert.notEqual(m[1], SHADED.toString('base64'), 'the shaded page was cleaned');
  const out = lineart.decodeLuma(png);
  assert.equal(lineart.measure(out.L, out.w, out.h).detached, 0);
  assert.match(app.log(), /\[lineart\] detailed detached=0\.\d+ cleaned=true/);

  // The cleaned page still goes into a PDF.
  const pdf = await fetch(app.base + '/download-pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageUrls: [fixed.json.imageUrl] }) });
  assert.equal(pdf.status, 200);
  assert.match(pdf.headers.get('content-type'), /application\/pdf/);
  await pdf.arrayBuffer();
});

test('only the Detailed instruction changed in the prompt', async () => {
  prompts.length = 0;
  await generate('a lighthouse', 'simple');
  await generate('a lighthouse', 'medium');
  await generate('a lighthouse', 'detailed');
  const [simple, medium, detailed] = prompts;
  const shared = 'Pure white background, only black outlines, NO color, NO shading, NO gray, NO gradients. Clean printable coloring page style with thick uniform black lines on white. Suitable for printing on standard paper.';
  assert.ok(simple.includes('Use simple thick black outlines with very few details. Designed for young children ages 3-6.') && simple.endsWith(shared));
  assert.ok(medium.includes('Use medium-detail clear black outlines. Designed for kids ages 6-12.') && medium.endsWith(shared));
  // Detailed borrows Simple's thick-line wording and gets its richness from more elements and patterns: in a live test
  // (15 October 2026) that came out clean far more often than asking for intricate detail, which drew hairline sketches.
  assert.ok(detailed.includes('Make it an adult coloring page with many elements and repeating patterns, bold clean outlines. Use simple thick black outlines and no tiny details.') && detailed.endsWith(shared));
  assert.ok(!/intricate|hairline|highly detailed/.test(detailed), 'no wording that asks for fine detail');
});
