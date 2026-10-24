// A small software renderer for the Pinterest pins: antialiased polygons, text from the site's own font outlines,
// a blurred box shadow, area-averaged image scaling and PNG output. It needs no browser, no canvas and no image
// service, so it runs inside a Cloudflare Worker on the free plan and under plain Node in the tests.
import zlib from 'node:zlib';
import { Buffer } from 'node:buffer';
import { FONT_DATA } from './font-data.js';

// --- colors ---
export function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex));
  if (!m) throw new Error('bad color ' + hex);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
export function luminance(rgb) { return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]); }
// WCAG contrast ratio of two colors (hex strings or [r, g, b]).
export function contrast(a, b) {
  const la = luminance(typeof a === 'string' ? hexToRgb(a) : a), lb = luminance(typeof b === 'string' ? hexToRgb(b) : b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

// --- canvas ---
export class Canvas {
  constructor(w, h, rgb = [255, 255, 255]) {
    this.w = w; this.h = h;
    this.data = new Uint8ClampedArray(w * h * 3);
    for (let i = 0; i < this.data.length; i += 3) { this.data[i] = rgb[0]; this.data[i + 1] = rgb[1]; this.data[i + 2] = rgb[2]; }
  }
  // Blend `color` over the canvas with a coverage mask (Uint8Array, 0..255) covering the box x0,y0,mw,mh.
  blendMask(mask, x0, y0, mw, mh, color, opacity = 1) {
    const { w, h, data } = this;
    for (let my = 0; my < mh; my++) {
      const y = y0 + my;
      if (y < 0 || y >= h) continue;
      for (let mx = 0; mx < mw; mx++) {
        const a = mask[my * mw + mx];
        if (!a) continue;
        const x = x0 + mx;
        if (x < 0 || x >= w) continue;
        const k = (a / 255) * opacity, o = (y * w + x) * 3;
        data[o] = data[o] + (color[0] - data[o]) * k;
        data[o + 1] = data[o + 1] + (color[1] - data[o + 1]) * k;
        data[o + 2] = data[o + 2] + (color[2] - data[o + 2]) * k;
      }
    }
  }
}

// --- polygon rasterizer ---
// contours: array of arrays of [x, y] points (device pixels, y down); every contour is closed. Fill rule: nonzero.
// Returns { mask, x0, y0, w, h } with coverage 0..255 for the integer box that holds the shapes.
// Each pixel row is sampled at `ss` sub-scanlines with exact horizontal coverage on each.
export function rasterize(contours, { ss = 8, clip = null } = {}) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const c of contours) for (const p of c) {
    if (p[0] < minX) minX = p[0]; if (p[0] > maxX) maxX = p[0];
    if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1];
  }
  if (!isFinite(minX)) return { mask: new Uint8Array(0), x0: 0, y0: 0, w: 0, h: 0 };
  let x0 = Math.floor(minX) - 1, y0 = Math.floor(minY) - 1, x1 = Math.ceil(maxX) + 1, y1 = Math.ceil(maxY) + 1;
  if (clip) { x0 = Math.max(x0, clip[0]); y0 = Math.max(y0, clip[1]); x1 = Math.min(x1, clip[2]); y1 = Math.min(y1, clip[3]); }
  const w = x1 - x0, h = y1 - y0;
  if (w <= 0 || h <= 0) return { mask: new Uint8Array(0), x0, y0, w: 0, h: 0 };
  // Edges in box coordinates, bucketed by the pixel rows they touch.
  const edges = [];
  for (const c of contours) {
    for (let i = 0, n = c.length; i < n; i++) {
      const a = c[i], b = c[(i + 1) % n];
      const ax = a[0] - x0, ay = a[1] - y0, bx = b[0] - x0, by = b[1] - y0;
      if (ay === by) continue;
      edges.push(ay < by ? { x1: ax, y1: ay, x2: bx, y2: by, dir: 1 } : { x1: bx, y1: by, x2: ax, y2: ay, dir: -1 });
    }
  }
  const rows = Array.from({ length: h }, () => []);
  for (const e of edges) {
    const r0 = Math.max(0, Math.floor(e.y1)), r1 = Math.min(h - 1, Math.floor(e.y2));
    for (let r = r0; r <= r1; r++) rows[r].push(e);
  }
  const mask = new Uint8Array(w * h);
  const acc = new Float32Array(w + 2), diff = new Float32Array(w + 3);
  const xs = [];
  for (let r = 0; r < h; r++) {
    const list = rows[r];
    if (!list.length) continue;
    acc.fill(0); diff.fill(0);
    let any = false;
    for (let s = 0; s < ss; s++) {
      const y = r + (s + 0.5) / ss;
      xs.length = 0;
      for (const e of list) {
        if (y < e.y1 || y >= e.y2) continue;
        xs.push({ x: e.x1 + (y - e.y1) * (e.x2 - e.x1) / (e.y2 - e.y1), dir: e.dir });
      }
      if (xs.length < 2) continue;
      xs.sort((p, q) => p.x - q.x);
      let wind = 0;
      for (let i = 0; i < xs.length - 1; i++) {
        wind += xs[i].dir;
        if (wind === 0) continue;
        let xa = xs[i].x, xb = xs[i + 1].x;
        if (xa < 0) xa = 0; if (xb > w) xb = w;
        if (xb <= xa) continue;
        any = true;
        const ia = Math.floor(xa), ib = Math.floor(xb);
        if (ia === ib) acc[ia] += xb - xa;
        else {
          acc[ia] += ia + 1 - xa;
          acc[ib] += xb - ib;
          if (ib > ia + 1) { diff[ia + 1] += 1; diff[ib] -= 1; }
        }
      }
    }
    if (!any) continue;
    let run = 0;
    const base = r * w;
    for (let x = 0; x < w; x++) {
      run += diff[x];
      const v = (acc[x] + run) / ss;
      mask[base + x] = v >= 1 ? 255 : v <= 0 ? 0 : Math.round(v * 255);
    }
  }
  return { mask, x0, y0, w, h };
}

export function fillContours(canvas, contours, color, opacity = 1, opts) {
  const r = rasterize(contours, opts);
  if (r.w) canvas.blendMask(r.mask, r.x0, r.y0, r.w, r.h, color, opacity);
  return r;
}

// --- shapes ---
export function roundedRectContour(x, y, w, h, r, seg = 12) {
  r = Math.min(r, w / 2, h / 2);
  const pts = [];
  const corner = (cx, cy, a0) => { for (let i = 0; i <= seg; i++) { const a = a0 + (Math.PI / 2) * (i / seg); pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } };
  corner(x + w - r, y + r, -Math.PI / 2);
  corner(x + w - r, y + h - r, 0);
  corner(x + r, y + h - r, Math.PI / 2);
  corner(x + r, y + r, Math.PI);
  return pts;
}
export function circleContour(cx, cy, r, seg = 48) {
  const pts = [];
  for (let i = 0; i < seg; i++) { const a = (2 * Math.PI * i) / seg; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
  return pts;
}

// --- blurred box shadow (CSS: 0 dy blur color), blur = the CSS blur radius, sigma = blur / 2 ---
export function boxShadow(canvas, { x, y, w, h, radius, dy, blur, color, opacity }) {
  const sigma = blur / 2, margin = Math.ceil(sigma * 3);
  const bx = x - margin, by = y + dy - margin, bw = w + margin * 2, bh = h + margin * 2;
  const shape = rasterize([roundedRectContour(x, y + dy, w, h, radius)]);
  // Place the shape's mask inside the padded blur box.
  const A = new Float32Array(bw * bh);
  for (let my = 0; my < shape.h; my++) {
    const ty = shape.y0 + my - by;
    if (ty < 0 || ty >= bh) continue;
    for (let mx = 0; mx < shape.w; mx++) {
      const tx = shape.x0 + mx - bx;
      if (tx < 0 || tx >= bw) continue;
      A[ty * bw + tx] = shape.mask[my * shape.w + mx] / 255;
    }
  }
  // Three box blurs approximate a Gaussian.
  const boxW = Math.max(1, Math.floor(Math.sqrt((12 * sigma * sigma) / 3 + 1)));
  const T = new Float32Array(bw * bh);
  for (let pass = 0; pass < 3; pass++) { boxBlurH(A, T, bw, bh, boxW); boxBlurV(T, A, bw, bh, boxW); }
  const mask = new Uint8Array(bw * bh);
  for (let i = 0; i < mask.length; i++) mask[i] = Math.round(Math.min(1, A[i]) * 255);
  canvas.blendMask(mask, bx, by, bw, bh, color, opacity);
}
// A running window of `size` pixels (a pixels before the center, b after); pixels outside the box count as 0.
function windowSides(size) { const a = Math.floor((size - 1) / 2); return [a, size - 1 - a]; }
function boxBlurH(src, dst, w, h, size) {
  const [a, b] = windowSides(size), inv = 1 / size;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let sum = 0;
    for (let x = 0; x <= b && x < w; x++) sum += src[row + x];
    for (let x = 0; x < w; x++) {
      dst[row + x] = sum * inv;
      const add = x + 1 + b, sub = x - a;
      if (add < w) sum += src[row + add];
      if (sub >= 0) sum -= src[row + sub];
    }
  }
}
function boxBlurV(src, dst, w, h, size) {
  const [a, b] = windowSides(size), inv = 1 / size;
  const col = new Float32Array(w);
  for (let y = 0; y <= b && y < h; y++) { const row = y * w; for (let x = 0; x < w; x++) col[x] += src[row + x]; }
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) dst[row + x] = col[x] * inv;
    const add = y + 1 + b, sub = y - a;
    if (add < h) { const ar = add * w; for (let x = 0; x < w; x++) col[x] += src[ar + x]; }
    if (sub >= 0) { const sr = sub * w; for (let x = 0; x < w; x++) col[x] -= src[sr + x]; }
  }
}

// --- text ---
const pathCache = new Map();
// Path string -> array of command objects in font units.
function parsePath(d) {
  let cmds = pathCache.get(d);
  if (cmds) return cmds;
  cmds = [];
  const re = /([MLQZ])([^MLQZ]*)/g;
  let m;
  while ((m = re.exec(d))) {
    const nums = m[2].trim() ? m[2].trim().split(' ').map(Number) : [];
    cmds.push({ c: m[1], n: nums });
  }
  pathCache.set(d, cmds);
  return cmds;
}
// A glyph at a pen position as closed contours in pixels (quadratic curves flattened).
function glyphContours(font, ch, penX, baselineY, size) {
  const g = font.glyphs[ch];
  if (!g || !g.d) return [];
  const k = size / font.upm;
  const out = [];
  let cur = null, cx = 0, cy = 0;
  const X = v => penX + v * k, Y = v => baselineY - v * k;
  for (const { c, n } of parsePath(g.d)) {
    if (c === 'M') { cur = [[X(n[0]), Y(n[1])]]; cx = n[0]; cy = n[1]; }
    else if (c === 'L') { cur.push([X(n[0]), Y(n[1])]); cx = n[0]; cy = n[1]; }
    else if (c === 'Q') {
      const steps = Math.max(4, Math.min(14, Math.ceil((Math.abs(n[0] - cx) + Math.abs(n[1] - cy) + Math.abs(n[2] - n[0]) + Math.abs(n[3] - n[1])) * k / 3)));
      for (let i = 1; i <= steps; i++) {
        const t = i / steps, u = 1 - t;
        cur.push([X(u * u * cx + 2 * u * t * n[0] + t * t * n[2]), Y(u * u * cy + 2 * u * t * n[1] + t * t * n[3])]);
      }
      cx = n[2]; cy = n[3];
    } else if (c === 'Z') { if (cur && cur.length > 2) out.push(cur); cur = null; }
  }
  return out;
}

export const FONT_KEYS = Object.keys(FONT_DATA);
// Pen advance of every character of `text` (index i = x of char i) and the total width. letterSpacing in px,
// added after every character like CSS letter-spacing. Characters the font lacks are skipped.
export function layoutText(fontKey, text, size, letterSpacing = 0) {
  const font = FONT_DATA[fontKey];
  if (!font) throw new Error('unknown font ' + fontKey);
  const k = size / font.upm;
  const xs = [];
  let x = 0, prev = '';
  for (const ch of text) {
    if (!font.glyphs[ch]) { xs.push(x); continue; }
    if (prev) x += (font.kern[prev + ch] || 0) * k;
    xs.push(x);
    x += font.glyphs[ch].adv * k + letterSpacing;
    prev = ch;
  }
  return { xs, width: x - (prev ? letterSpacing : 0), font };
}
export const textWidth = (fontKey, text, size, letterSpacing = 0) => layoutText(fontKey, text, size, letterSpacing).width;
export function hasGlyphs(fontKey, text) {
  const font = FONT_DATA[fontKey];
  for (const ch of text) if (!font.glyphs[ch]) return false;
  return true;
}

// Draws one line; `x` is the left edge of the first character, `baseline` the y of the baseline.
export function drawText(canvas, fontKey, text, x, baseline, size, color, { letterSpacing = 0, opacity = 1, ss } = {}) {
  const { xs, font } = layoutText(fontKey, text, size, letterSpacing);
  const contours = [];
  let i = 0;
  for (const ch of text) { contours.push(...glyphContours(font, ch, x + xs[i], baseline, size)); i++; }
  return fillContours(canvas, contours, color, opacity, { ss: ss || (size >= 60 ? 16 : 8) });
}

// Splits text into at most `maxLines` lines no wider than maxWidth, balancing the line widths like CSS
// text-wrap: balance. Returns { lines, ok } where ok is false when it cannot fit.
export function wrapBalanced(fontKey, text, size, letterSpacing, maxWidth, maxLines = 2) {
  const words = text.split(/\s+/).filter(Boolean);
  const w = s => textWidth(fontKey, s, size, letterSpacing);
  if (!words.length) return { lines: [''], ok: true };
  if (w(words.join(' ')) <= maxWidth) return { lines: [words.join(' ')], ok: true };
  if (maxLines < 2) return { lines: [words.join(' ')], ok: false };
  let best = null;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    const wa = w(a), wb = w(b), m = Math.max(wa, wb);
    if (wa <= maxWidth && wb <= maxWidth && (!best || m < best.m)) best = { lines: [a, b], m };
  }
  if (best) return { lines: best.lines, ok: true };
  return { lines: [words.join(' ')], ok: false };
}

// --- image scaling (8-bit gray) ---
// Area average when shrinking, bilinear when enlarging. Pixels outside the source count as white.
export function resizeGray(src, sw, sh, dw, dh) {
  const dst = new Uint8Array(dw * dh);
  if (dw <= sw && dh <= sh) {
    const fx = sw / dw, fy = sh / dh;
    const tmp = new Float32Array(dw * sh);
    for (let y = 0; y < sh; y++) {
      const row = y * sw;
      for (let x = 0; x < dw; x++) {
        const a = x * fx, b = a + fx;
        let i = Math.floor(a), sum = 0;
        const end = Math.min(sw, Math.ceil(b));
        for (; i < end; i++) { const wgt = Math.min(i + 1, b) - Math.max(i, a); sum += src[row + i] * wgt; }
        tmp[y * dw + x] = sum / fx;
      }
    }
    for (let y = 0; y < dh; y++) {
      const a = y * fy, b = a + fy;
      const i0 = Math.floor(a), i1 = Math.min(sh, Math.ceil(b));
      for (let x = 0; x < dw; x++) {
        let sum = 0;
        for (let i = i0; i < i1; i++) { const wgt = Math.min(i + 1, b) - Math.max(i, a); sum += tmp[i * dw + x] * wgt; }
        dst[y * dw + x] = Math.round(sum / fy);
      }
    }
    return dst;
  }
  const sx = sw / dw, sy = sh / dh;
  for (let y = 0; y < dh; y++) {
    const fy = Math.max(0, Math.min(sh - 1, (y + 0.5) * sy - 0.5)), y0 = Math.floor(fy), y1 = Math.min(sh - 1, y0 + 1), ty = fy - y0;
    for (let x = 0; x < dw; x++) {
      const fx = Math.max(0, Math.min(sw - 1, (x + 0.5) * sx - 0.5)), x0 = Math.floor(fx), x1 = Math.min(sw - 1, x0 + 1), tx = fx - x0;
      const a = src[y0 * sw + x0] * (1 - tx) + src[y0 * sw + x1] * tx;
      const b = src[y1 * sw + x0] * (1 - tx) + src[y1 * sw + x1] * tx;
      dst[y * dw + x] = Math.round(a * (1 - ty) + b * ty);
    }
  }
  return dst;
}

// --- PNG output ---
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; }
  return t;
})();
function crc32(buf) { let c = -1; for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; }
const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function ihdr(w, h, depth, colorType) {
  const b = Buffer.alloc(13);
  b.writeUInt32BE(w, 0); b.writeUInt32BE(h, 4); b[8] = depth; b[9] = colorType;
  return b;
}
// Picks, for each row, the PNG filter with the smallest sum of absolute differences.
function filterRows(pix, w, h, bpp) {
  const stride = w * bpp;
  const out = Buffer.alloc((stride + 1) * h);
  const cand = [new Uint8Array(stride), new Uint8Array(stride), new Uint8Array(stride), new Uint8Array(stride), new Uint8Array(stride)];
  const zero = new Uint8Array(stride);
  for (let y = 0; y < h; y++) {
    const row = pix.subarray(y * stride, (y + 1) * stride);
    const prev = y ? pix.subarray((y - 1) * stride, y * stride) : zero;
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? row[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0, x = row[i];
      cand[0][i] = x;
      cand[1][i] = (x - a) & 255;
      cand[2][i] = (x - b) & 255;
      cand[3][i] = (x - ((a + b) >> 1)) & 255;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      cand[4][i] = (x - (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
    }
    let bestF = 0, bestS = Infinity;
    for (let f = 0; f < 5; f++) {
      let s = 0;
      const cf = cand[f];
      for (let i = 0; i < stride; i++) { const v = cf[i]; s += v < 128 ? v : 256 - v; }
      if (s < bestS) { bestS = s; bestF = f; }
    }
    out[y * (stride + 1)] = bestF;
    out.set(cand[bestF], y * (stride + 1) + 1);
  }
  return out;
}
export function encodePngRgb(rgb, w, h, level = 6, extra = []) {
  const raw = filterRows(rgb, w, h, 3);
  return Buffer.concat([PNG_SIG, chunk('IHDR', ihdr(w, h, 8, 2)), ...extra, chunk('IDAT', zlib.deflateSync(raw, { level })), chunk('IEND', Buffer.alloc(0))]);
}
// 8-bit gray, or 4-bit gray (16 levels) when depth is 4.
export function encodePngGray(G, w, h, { depth = 8, level = 9, extra = [] } = {}) {
  let pix, bpp = 1;
  if (depth === 4) {
    const stride = Math.ceil(w / 2);
    pix = new Uint8Array(stride * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = Math.round(G[y * w + x] / 17);
      pix[y * stride + (x >> 1)] |= x & 1 ? v : v << 4;
    }
    const raw = filterRows(pix, stride, h, 1);
    return Buffer.concat([PNG_SIG, chunk('IHDR', ihdr(w, h, 4, 0)), ...extra, chunk('IDAT', zlib.deflateSync(raw, { level })), chunk('IEND', Buffer.alloc(0))]);
  }
  pix = G instanceof Uint8Array ? G : Uint8Array.from(G);
  const raw = filterRows(pix, w, h, bpp);
  return Buffer.concat([PNG_SIG, chunk('IHDR', ihdr(w, h, 8, 0)), ...extra, chunk('IDAT', zlib.deflateSync(raw, { level })), chunk('IEND', Buffer.alloc(0))]);
}

// --- metadata ---
const xmlEsc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// An XMP packet in an iTXt chunk ("XML:com.adobe.xmp"). It states what the image is: made by an image model
// (IPTC digital source type trainedAlgorithmicMedia), which is what Pinterest and other platforms read for the
// "AI generated" label. title and description are plain text.
export function xmpChunk({ title, description, creator = 'ColoringPageMaker' }) {
  const xmp = [
    '<?xpacket begin="" id="W5M0MpCehiHzreSzNTczkc9d"?>',
    '<x:xmpmeta xmlns:x="adobe:ns:meta/">',
    '<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">',
    '<rdf:Description rdf:about="" xmlns:Iptc4xmpExt="http://iptc.org/std/Iptc4xmpExt/2008-02-29/" xmlns:dc="http://purl.org/dc/elements/1.1/">',
    '<Iptc4xmpExt:DigitalSourceType>http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia</Iptc4xmpExt:DigitalSourceType>',
    `<dc:title><rdf:Alt><rdf:li xml:lang="x-default">${xmlEsc(title)}</rdf:li></rdf:Alt></dc:title>`,
    `<dc:description><rdf:Alt><rdf:li xml:lang="x-default">${xmlEsc(description)}</rdf:li></rdf:Alt></dc:description>`,
    `<dc:creator><rdf:Seq><rdf:li>${xmlEsc(creator)}</rdf:li></rdf:Seq></dc:creator>`,
    '</rdf:Description>',
    '</rdf:RDF>',
    '</x:xmpmeta>',
    '<?xpacket end="w"?>'
  ].join('\n');
  // keyword, NUL, compression flag 0, compression method 0, empty language tag, NUL, empty translated keyword, NUL, text
  return chunk('iTXt', Buffer.concat([Buffer.from('XML:com.adobe.xmp', 'latin1'), Buffer.from([0, 0, 0, 0, 0]), Buffer.from(xmp, 'utf8')]));
}
// The text of the XMP chunk of a PNG, or ''.
export function readXmp(buf) {
  let off = 8;
  while (off + 12 <= buf.length) {
    const len = buf.readUInt32BE(off), type = buf.toString('latin1', off + 4, off + 8);
    if (type === 'iTXt' && buf.toString('latin1', off + 8, off + 8 + 17) === 'XML:com.adobe.xmp') return buf.toString('utf8', off + 8 + 22, off + 8 + len);
    if (type === 'IEND') break;
    off += 12 + len;
  }
  return '';
}
// Reads width and height from a PNG header, or null.
export function pngSize(buf) {
  if (!buf || buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

// --- PNG reading ---
// The header of a PNG as { w, h, depth, ct, interlace }, or null. (ct: 0 gray, 2 RGB, 3 palette, 4 gray + alpha, 6 RGBA)
export function pngInfo(buf) {
  if (!buf || buf.length < 29 || buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), depth: buf[24], ct: buf[25], interlace: buf[28] };
}

// Any non-interlaced PNG to luminance (0 black .. 255 white), as { w, h, L }: gray at 1, 2, 4, 8 or 16 bits, RGB, palette
// (1 to 8 bits), gray + alpha and RGBA (transparent counts as white paper). The model's pictures come through the Images
// binding as PNG, and what color type and depth that service writes is not something to bet the whole job on.
export function decodePngLuma(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const info = pngInfo(buf);
  if (!info) throw new Error('not a PNG');
  const { w, h, depth, ct, interlace } = info;
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[ct];
  if (!channels || ![1, 2, 4, 8, 16].includes(depth) || interlace !== 0 || !w || !h || w > 8192 || h > 8192) {
    throw new Error(`unsupported PNG (color type ${ct}, ${depth} bit, interlace ${interlace}, ${w} x ${h})`);
  }
  const idat = []; let plte = null;
  for (let off = 8; off + 12 <= buf.length;) {
    const len = buf.readUInt32BE(off), type = buf.toString('latin1', off + 4, off + 8), d = off + 8;
    if (d + len > buf.length) throw new Error('truncated PNG');
    if (type === 'IDAT') idat.push(buf.subarray(d, d + len));
    else if (type === 'PLTE') plte = buf.subarray(d, d + len);
    else if (type === 'IEND') break;
    off = d + len + 4;
  }
  if (!idat.length) throw new Error('PNG without image data');
  if (ct === 3 && (!plte || plte.length < 3)) throw new Error('palette PNG without a palette');
  const bits = depth * channels, rowBytes = Math.ceil(w * bits / 8), bpp = Math.max(1, bits >> 3);
  const raw = zlib.inflateSync(Buffer.concat(idat), { maxOutputLength: (rowBytes + 1) * h + 1 });
  if (raw.length < (rowBytes + 1) * h) throw new Error('PNG image data is short');
  const L = new Uint8Array(w * h);
  let prev = new Uint8Array(rowBytes), cur = new Uint8Array(rowBytes);
  const maxv = (1 << Math.min(depth, 8)) - 1;
  for (let y = 0; y < h; y++) {
    const base = y * (rowBytes + 1), f = raw[base], s0 = base + 1;
    for (let i = 0; i < rowBytes; i++) {
      const x = raw[s0 + i], a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      let v;
      if (f === 0) v = x; else if (f === 1) v = x + a; else if (f === 2) v = x + b; else if (f === 3) v = x + ((a + b) >> 1);
      else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); }
      else throw new Error('bad PNG filter ' + f);
      cur[i] = v & 255;
    }
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let l;
      if (ct === 0 || ct === 3) {
        let s;
        if (depth === 8) s = cur[x];
        else if (depth === 16) s = cur[x * 2];
        else { const bit = x * depth, shift = 8 - depth - (bit & 7); s = (cur[bit >> 3] >> shift) & maxv; }
        if (ct === 3) { const o = s * 3; l = o + 2 < plte.length ? (77 * plte[o] + 150 * plte[o + 1] + 29 * plte[o + 2]) >> 8 : 0; }
        else l = depth >= 8 ? s : Math.round(s * 255 / maxv);
      } else if (ct === 2) {
        const o = x * 3 * (depth >> 3), st = depth >> 3;
        l = (77 * cur[o] + 150 * cur[o + st] + 29 * cur[o + 2 * st]) >> 8;
      } else if (ct === 4) {
        const st = depth >> 3, o = x * 2 * st, g = cur[o], al = cur[o + st];
        l = 255 - (((255 - g) * al) / 255 | 0);
      } else {
        const st = depth >> 3, o = x * 4 * st, al = cur[o + 3 * st];
        l = (77 * cur[o] + 150 * cur[o + st] + 29 * cur[o + 2 * st]) >> 8;
        l = 255 - (((255 - l) * al) / 255 | 0);
      }
      L[row + x] = l;
    }
    const t = prev; prev = cur; cur = t;
  }
  return { w, h, L };
}
