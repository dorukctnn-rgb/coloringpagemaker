// Clean-up for generated coloring pages.
//
// Some pages come back as pencil sketches: gray shading, hatching, stippling and hairline strokes, which print as
// muddy gray. Each page is measured first. Clean line art has gray only in the anti-aliased rim of its black lines,
// so it is returned byte for byte. A page with a lot of gray that does not touch black ink is turned into black
// and white: pixels darker than INK become solid black, ink blobs smaller than MIN_SPECK pixels are removed, the
// one-pixel rim around the remaining ink keeps its original anti-aliasing, and everything else becomes white.
//
// The thresholds were tuned on 61 real pages from this generator (October 2026): every approved page scores 0.025 or
// less and every pencil-shaded page 0.043 or more. Only Node's zlib is used, so there is no image dependency to
// ship; a PNG this code cannot read (palette, 16-bit, interlaced) is returned unchanged.
const zlib = require('zlib');

const GATE = 0.035;     // share of "detached gray" pixels above which a page is cleaned
const INK = 128;        // after cleaning, luminance below this is black ink
const MIN_SPECK = 16;   // ink blobs (8-connected) smaller than this many pixels are removed
const GRAY_LO = 60;     // detached gray: luminance from GRAY_LO to GRAY_HI ...
const GRAY_HI = 200;
const NEAR_INK = 2;     // ... with no near-black pixel (below GRAY_LO) within this many pixels

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// 8-bit, non-interlaced grayscale, RGB, gray+alpha or RGBA PNG to luminance (0 black .. 255 white), or null.
function decodeLuma(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 33 || !buf.subarray(0, 8).equals(PNG_SIG)) return null;
  let off = 8, w = 0, h = 0, bits = 0, ct = -1, interlace = 0;
  const idat = [];
  while (off + 12 <= buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('latin1', off + 4, off + 8);
    const d = off + 8;
    if (d + len > buf.length) return null;
    if (type === 'IHDR') { w = buf.readUInt32BE(d); h = buf.readUInt32BE(d + 4); bits = buf[d + 8]; ct = buf[d + 9]; interlace = buf[d + 12]; }
    else if (type === 'IDAT') idat.push(buf.subarray(d, d + len));
    else if (type === 'IEND') break;
    off = d + len + 4;
  }
  const ch = { 0: 1, 2: 3, 4: 2, 6: 4 }[ct];
  if (!ch || bits !== 8 || interlace !== 0 || !w || !h || w > 4096 || h > 4096 || !idat.length) return null;
  const stride = w * ch;
  const raw = zlib.inflateSync(Buffer.concat(idat), { maxOutputLength: (stride + 1) * h + 1 });
  if (raw.length < (stride + 1) * h) return null;
  const L = new Uint8Array(w * h);
  let prev = new Uint8Array(stride), cur = new Uint8Array(stride);
  for (let y = 0; y < h; y++) {
    const base = y * (stride + 1), f = raw[base], s0 = base + 1;
    if (f === 0) cur.set(raw.subarray(s0, s0 + stride));
    else if (f === 1) {
      for (let i = 0; i < ch; i++) cur[i] = raw[s0 + i];
      for (let i = ch; i < stride; i++) cur[i] = raw[s0 + i] + cur[i - ch];
    } else if (f === 2) {
      for (let i = 0; i < stride; i++) cur[i] = raw[s0 + i] + prev[i];
    } else if (f === 3) {
      for (let i = 0; i < ch; i++) cur[i] = raw[s0 + i] + (prev[i] >> 1);
      for (let i = ch; i < stride; i++) cur[i] = raw[s0 + i] + ((cur[i - ch] + prev[i]) >> 1);
    } else if (f === 4) {
      for (let i = 0; i < ch; i++) cur[i] = raw[s0 + i] + prev[i];
      for (let i = ch; i < stride; i++) {
        const a = cur[i - ch], b = prev[i], c = prev[i - ch];
        const p = a + b - c, pa = p > a ? p - a : a - p, pb = p > b ? p - b : b - p, pc = p > c ? p - c : c - p;
        cur[i] = raw[s0 + i] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
      }
    } else return null;
    // Uint8Array stores wrap modulo 256, as PNG filters require.
    const row = y * w;
    if (ch >= 3) {
      for (let x = 0, i = 0; x < w; x++, i += ch) {
        let l = (77 * cur[i] + 150 * cur[i + 1] + 29 * cur[i + 2]) >> 8;
        if (ch === 4) l = 255 - (((255 - l) * cur[i + 3]) / 255 | 0); // transparent counts as white paper
        L[row + x] = l;
      }
    } else {
      for (let x = 0, i = 0; x < w; x++, i += ch) L[row + x] = ch === 2 ? 255 - (((255 - cur[i]) * cur[i + 1]) / 255 | 0) : cur[i];
    }
    const t = prev; prev = cur; cur = t;
  }
  return { w, h, L };
}

// 1 where a mask pixel is set within r pixels (square window): a horizontal running window, then a vertical one
// kept as per-column counts so both passes walk memory row by row.
function dilate(mask, w, h, r) {
  const tmp = new Uint8Array(mask.length), out = new Uint8Array(mask.length);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let count = 0;
    for (let x = 0; x < r && x < w; x++) count += mask[row + x];
    for (let x = 0; x < w; x++) {
      if (x + r < w) count += mask[row + x + r];
      if (x - r - 1 >= 0) count -= mask[row + x - r - 1];
      tmp[row + x] = count > 0 ? 1 : 0;
    }
  }
  const col = new Int32Array(w);
  for (let y = 0; y < r && y < h; y++) { const row = y * w; for (let x = 0; x < w; x++) col[x] += tmp[row + x]; }
  for (let y = 0; y < h; y++) {
    const add = y + r < h ? (y + r) * w : -1, sub = y - r - 1 >= 0 ? (y - r - 1) * w : -1, row = y * w;
    for (let x = 0; x < w; x++) {
      let c = col[x];
      if (add >= 0) c += tmp[add + x];
      if (sub >= 0) c -= tmp[sub + x];
      col[x] = c;
      out[row + x] = c > 0 ? 1 : 0;
    }
  }
  return out;
}

// detached: gray pixels with no near-black pixel close by (shading, hatching, pencil strokes, hairlines).
// gray: every mid-gray pixel, including the anti-aliased edges of clean lines.
function measure(L, w, h) {
  const n = L.length, ink = new Uint8Array(n);
  let gray = 0;
  for (let i = 0; i < n; i++) {
    const v = L[i];
    if (v < GRAY_LO) ink[i] = 1;
    if (v >= 40 && v <= 215) gray++;
  }
  const near = dilate(ink, w, h, NEAR_INK);
  let detached = 0;
  for (let i = 0; i < n; i++) { const v = L[i]; if (v >= GRAY_LO && v <= GRAY_HI && !near[i]) detached++; }
  return { detached: detached / n, gray: gray / n };
}

// Black and white version of a pencil-shaded page, keeping the anti-aliased rim of the lines that stay.
function clean(L, w, h) {
  const n = L.length, ink = new Uint8Array(n);
  for (let i = 0; i < n; i++) ink[i] = L[i] < INK ? 1 : 0;
  // Remove small 8-connected ink blobs: stipple dots and pencil grain.
  const seen = new Uint8Array(n), queue = new Int32Array(n);
  for (let s = 0; s < n; s++) {
    if (!ink[s] || seen[s]) continue;
    let head = 0, tail = 0;
    queue[tail++] = s; seen[s] = 1;
    while (head < tail) {
      const i = queue[head++];
      const x = i % w, y = (i - x) / w;
      const x0 = x > 0 ? -1 : 0, x1 = x < w - 1 ? 1 : 0, y0 = y > 0 ? -1 : 0, y1 = y < h - 1 ? 1 : 0;
      for (let dy = y0; dy <= y1; dy++) {
        for (let dx = x0; dx <= x1; dx++) {
          const j = i + dy * w + dx;
          if (ink[j] && !seen[j]) { seen[j] = 1; queue[tail++] = j; }
        }
      }
    }
    if (tail < MIN_SPECK) for (let k = 0; k < tail; k++) ink[queue[k]] = 0;
  }
  const rim = dilate(ink, w, h, 1);
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) out[i] = ink[i] ? 0 : rim[i] ? L[i] : 255;
  return out;
}

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
  return t;
})();
function crc32(buf) { let c = -1; for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
// 8-bit grayscale PNG, every row with the Sub filter (long runs of white and black compress well).
function encodeGray(G, w, h) {
  const raw = Buffer.alloc((w + 1) * h);
  for (let y = 0; y < h; y++) {
    const o = y * (w + 1), r = y * w;
    raw[o] = 1;
    raw[o + 1] = G[r];
    for (let x = 1; x < w; x++) raw[o + 1 + x] = (G[r + x] - G[r + x - 1]) & 0xff;
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 0; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([PNG_SIG, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 3 })), chunk('IEND', Buffer.alloc(0))]);
}

// Returns { buffer, cleaned, before, ms } (and `after` with { measureAfter: true }, for reports and tests).
// buffer is the input itself unless the page was cleaned.
function cleanColoringPage(png, { measureAfter = false } = {}) {
  const t0 = Date.now();
  let img = null;
  try { img = decodeLuma(png); } catch (e) { img = null; }
  if (!img) return { buffer: png, cleaned: false, skipped: 'unsupported PNG', ms: Date.now() - t0 };
  const before = measure(img.L, img.w, img.h);
  if (before.detached <= GATE) return { buffer: png, cleaned: false, before, ms: Date.now() - t0 };
  const out = clean(img.L, img.w, img.h);
  const buffer = encodeGray(out, img.w, img.h);
  const result = { buffer, cleaned: true, before, ms: Date.now() - t0 };
  if (measureAfter) result.after = measure(out, img.w, img.h);
  return result;
}

module.exports = { cleanColoringPage, decodeLuma, measure, clean, encodeGray, GATE, INK, MIN_SPECK };
