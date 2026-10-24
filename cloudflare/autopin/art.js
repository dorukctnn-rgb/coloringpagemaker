// Checks and prepares a generated coloring page before it is used for a pin or a printable page.
// The page arrives as an 8-bit gray PNG from the free Workers AI path (FLUX.1 schnell), 1024 x 1024.
//
// judge()     measures the page and rejects the ones that cannot be colored well: nearly empty pages, black fills,
//             gray patches, fake watermark text, pencil-shaded pages that cannot be cleaned, pages that are all detail.
// whiten()    turns the faint off-white haze of the paper into pure white, so the page prints clean.
// artSquare() crops a square around the drawing (12 percent air) and scales it to the card size of the pin.
import lineart from '../../lineart.js';
import { resizeGray } from './raster.js';

const { decodeLuma, measure, clean, GATE } = lineart;

// Square-window dilation of a 0/1 mask by r pixels (same algorithm as lineart.js, which does not export it).
export function dilate(mask, w, h, r) {
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

export function decodeGrayPng(png) {
  const img = decodeLuma(Buffer.isBuffer(png) ? png : Buffer.from(png));
  if (!img) throw new Error('page image is not a readable PNG');
  return img;
}

// Bounding box of the drawing: columns and rows with at least 3 dark pixels.
export function inkBox(L, w, h, dark = 110) {
  const col = new Uint32Array(w), row = new Uint32Array(h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (L[y * w + x] < dark) { col[x]++; row[y]++; }
  const first = (a, n) => { for (let i = 0; i < n; i++) if (a[i] >= 3) return i; return -1; };
  const last = (a, n) => { for (let i = n - 1; i >= 0; i--) if (a[i] >= 3) return i; return -1; };
  const x0 = first(col, w), x1 = last(col, w), y0 = first(row, h), y1 = last(row, h);
  if (x0 < 0 || y0 < 0) return null;
  return { x0, x1, y0, y1 };
}

// 8-connected components of the dark pixels (below thr): { area, x0, x1, y0, y1 } for each.
export function components(L, w, h, thr = 128) {
  const n = w * h, seen = new Uint8Array(n), queue = new Int32Array(n), out = [];
  for (let s = 0; s < n; s++) {
    if (L[s] >= thr || seen[s]) continue;
    let head = 0, tail = 0;
    queue[tail++] = s; seen[s] = 1;
    let x0 = w, x1 = 0, y0 = h, y1 = 0;
    while (head < tail) {
      const i = queue[head++], x = i % w, y = (i - x) / w;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          const j = yy * w + xx;
          if (L[j] < thr && !seen[j]) { seen[j] = 1; queue[tail++] = j; }
        }
      }
    }
    out.push({ area: tail, x0, x1, y0, y1 });
  }
  return out;
}

// Rows of small letter-sized marks along the top or bottom edge: the fake watermark text the image model sometimes
// writes under a page. Grass and leaf borders also make small marks, but in rows of far fewer than 12.
export function edgeText(comps, w, h) {
  let worst = { row: 0, span: 0 };
  for (const [lo, hi] of [[0.9 * h, h], [0, 0.1 * h]]) {
    const c = comps.filter(k => k.area >= 10 && k.area <= 1200 && k.y1 - k.y0 + 1 >= 7 && k.y1 - k.y0 + 1 <= 50 && k.x1 - k.x0 + 1 <= 60 && k.y0 >= lo && k.y1 <= hi);
    for (const a of c) {
      const row = c.filter(b => Math.abs(b.y1 - a.y1) <= 6 && Math.abs((b.y1 - b.y0) - (a.y1 - a.y0)) <= 22);
      if (row.length > worst.row) worst = { row: row.length, span: (Math.max(...row.map(r => r.x1)) - Math.min(...row.map(r => r.x0))) / w };
    }
  }
  return worst;
}

// Size of the largest patch of mid gray that touches no black line (a gray cheek, a gray fill, a smudge).
export function grayPatch(L, w, h) {
  const n = w * h, ink = new Uint8Array(n);
  for (let i = 0; i < n; i++) if (L[i] < 60) ink[i] = 1;
  const near = dilate(ink, w, h, 2);
  const mask = new Uint8Array(n);
  for (let i = 0; i < n; i++) { const v = L[i]; if (v >= 60 && v <= 215 && !near[i]) mask[i] = 1; }
  const seen = new Uint8Array(n), q = new Int32Array(n);
  let max = 0;
  for (let s = 0; s < n; s++) {
    if (!mask[s] || seen[s]) continue;
    let hd = 0, tl = 0;
    q[tl++] = s; seen[s] = 1;
    while (hd < tl) {
      const i = q[hd++], x = i % w;
      if (x > 0 && mask[i - 1] && !seen[i - 1]) { seen[i - 1] = 1; q[tl++] = i - 1; }
      if (x < w - 1 && mask[i + 1] && !seen[i + 1]) { seen[i + 1] = 1; q[tl++] = i + 1; }
      if (i >= w && mask[i - w] && !seen[i - w]) { seen[i - w] = 1; q[tl++] = i - w; }
      if (i < n - w && mask[i + w] && !seen[i + w]) { seen[i + w] = 1; q[tl++] = i + w; }
    }
    if (tl > max) max = tl;
  }
  return max;
}

// Numbers that describe a page. ink: share of dark pixels. thick: share of pixels inside a solid black area
// (a 13 x 13 window of ink), which is what a filled shape looks like and a line is not. detached and gray as in
// lineart.js. patch: the largest loose gray patch in pixels. edge: the strongest row of letter-like marks on the
// top or bottom edge.
export function artMetrics(L, w, h) {
  const n = w * h, ink = new Uint8Array(n);
  let inkCount = 0;
  for (let i = 0; i < n; i++) if (L[i] < 128) { ink[i] = 1; inkCount++; }
  const notInk = new Uint8Array(n);
  for (let i = 0; i < n; i++) notInk[i] = 1 - ink[i];
  const near = dilate(notInk, w, h, 6);
  let thickCount = 0;
  for (let i = 0; i < n; i++) if (ink[i] && !near[i]) thickCount++;
  const m = measure(L, w, h);
  const box = inkBox(L, w, h);
  return {
    ink: inkCount / n, thick: thickCount / n, detached: m.detached, gray: m.gray, patch: grayPatch(L, w, h),
    edge: edgeText(components(L, w, h), w, h),
    box: box ? { ...box, share: ((box.x1 - box.x0 + 1) * (box.y1 - box.y0 + 1)) / n } : null
  };
}

// Limits found on the 30 pages that passed and the 31 that did not in the first Halloween run (October 2026):
// every page that passed is inside them, and so are most of the others (what is left is taste, not a measurable
// defect). inkMax depends on the detail level the page was asked for.
export const LIMITS = {
  inkMin: 0.012, inkMax: { simple: 0.17, medium: 0.22, detailed: 0.32 }, thickMax: 0.0075, grayMax: 0.2, patchMax: 600,
  detachedMax: GATE, boxMin: 0.08, edgeRow: 12, edgeSpan: 0.5
};

// Returns { ok, reasons, metrics, L } where L is the page to use (cleaned when it was a pencil-shaded page).
export function judge(L, w, h, level = 'medium', limits = LIMITS) {
  let page = L;
  let metrics = artMetrics(page, w, h);
  const reasons = [];
  if (metrics.detached > limits.detachedMax) {
    // A pencil-shaded page can be turned into clean black and white (lineart.js); the result is measured again.
    page = clean(L, w, h);
    metrics = artMetrics(page, w, h);
    if (metrics.detached > limits.detachedMax) reasons.push('shaded');
  }
  const inkMax = limits.inkMax[level] || limits.inkMax.medium;
  if (metrics.ink < limits.inkMin) reasons.push('almost empty');
  if (metrics.ink > inkMax) reasons.push('too dense');
  if (metrics.thick > limits.thickMax) reasons.push('black fill');
  if (metrics.gray > limits.grayMax) reasons.push('gray shading');
  if (metrics.patch > limits.patchMax) reasons.push('gray patch');
  if (metrics.edge.row >= limits.edgeRow && metrics.edge.span >= limits.edgeSpan) reasons.push('text on the edge');
  if (!metrics.box || metrics.box.share < limits.boxMin) reasons.push('drawing too small');
  return { ok: reasons.length === 0, reasons, metrics, L: page };
}

// Pure white paper: everything from 232 up becomes 255, the rest is stretched to match, so black stays black.
export function whiten(L) {
  const out = new Uint8Array(L.length), lut = new Uint8Array(256);
  for (let v = 0; v < 256; v++) lut[v] = v >= 232 ? 255 : Math.round((v * 255) / 232);
  for (let i = 0; i < L.length; i++) out[i] = lut[L[i]];
  return out;
}

// A square around the drawing, scaled to size x size. Art that already runs to the page edges keeps the whole
// page; smaller art gets a square with 12 percent air around it (never less than 780 px of the page). The square
// is padded with white where it leaves the page, so the drawing is never cut.
export function artSquare(L, w, h, size) {
  const box = inkBox(L, w, h) || { x0: 0, x1: w - 1, y0: 0, y1: h - 1 };
  const bw = box.x1 - box.x0 + 1, bh = box.y1 - box.y0 + 1, big = Math.max(bw, bh);
  const side = big >= 0.9 * Math.min(w, h) ? Math.min(w, h) : Math.max(Math.round(big * 1.12), Math.min(780, Math.min(w, h)));
  const cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2;
  const left = Math.round(cx - side / 2), top = Math.round(cy - side / 2);
  const sq = new Uint8Array(side * side).fill(255);
  for (let y = 0; y < side; y++) {
    const sy = top + y;
    if (sy < 0 || sy >= h) continue;
    for (let x = 0; x < side; x++) {
      const sx = left + x;
      if (sx >= 0 && sx < w) sq[y * side + x] = L[sy * w + sx];
    }
  }
  return side === size ? sq : resizeGray(sq, side, side, size, size);
}
