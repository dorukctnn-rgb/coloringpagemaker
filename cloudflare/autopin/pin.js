// The 1000 x 1500 Pinterest pin: a headline in the site's display font, one line under it, the coloring page on a white
// card with a soft shadow, and the site name with the real free limit at the bottom. The layout is the one used for
// the 30 Halloween pins (24 October 2026), drawn here with the software renderer in raster.js so it runs in a Worker.
import { Canvas, hexToRgb, contrast, fillContours, roundedRectContour, circleContour, boxShadow, drawText, wrapBalanced, textWidth, rasterize, encodePngRgb, xmpChunk } from './raster.js';
import { FONT_DATA } from './font-data.js';
import { hash, THEMES } from './topics.js';

export const PIN_W = 1000, PIN_H = 1500;
export const CARD = { x: 40, y: 392, size: 920, radius: 22 };

// bg, title, sub, foot: hex colors. shadow and edge: [hex, opacity]. Every text color has a contrast ratio of 4.5 or
// more against its background (pin.test.mjs checks it).
export const SKINS = {
  orange: { bg: '#F4781E', title: '#22103B', sub: '#2E1647', foot: '#22103B', shadow: ['#22103B', 0.32], edge: ['#22103B', 0.3] },
  plum: { bg: '#22103B', title: '#FFB75A', sub: '#E9DFFA', foot: '#E9DFFA', shadow: ['#000000', 0.5], edge: ['#E9DFFA', 0.55] },
  mist: { bg: '#ECE4F8', title: '#22103B', sub: '#4A3A6B', foot: '#22103B', shadow: ['#22103B', 0.2], edge: ['#22103B', 0.25] },
  rust: { bg: '#A94A1A', title: '#FFF3DC', sub: '#FFE9CF', foot: '#FFF3DC', shadow: ['#2B1204', 0.4], edge: ['#FFF3DC', 0.5] },
  wheat: { bg: '#F3DFAE', title: '#4A2A0F', sub: '#6B4423', foot: '#4A2A0F', shadow: ['#4A2A0F', 0.25], edge: ['#4A2A0F', 0.3] },
  forest: { bg: '#2F4A32', title: '#F6D98B', sub: '#E8EFDC', foot: '#E8EFDC', shadow: ['#0B1A0D', 0.5], edge: ['#E8EFDC', 0.5] },
  harvest: { bg: '#E59A2F', title: '#3B1F0A', sub: '#4A2A10', foot: '#3B1F0A', shadow: ['#3B1F0A', 0.3], edge: ['#3B1F0A', 0.3] },
  cranberry: { bg: '#8E2430', title: '#FFF1D6', sub: '#FBE3D0', foot: '#FFF1D6', shadow: ['#2A060B', 0.45], edge: ['#FFF1D6', 0.5] },
  cream: { bg: '#FBEFD6', title: '#5A2A12', sub: '#7A4A2A', foot: '#5A2A12', shadow: ['#5A2A12', 0.22], edge: ['#5A2A12', 0.28] },
  pine: { bg: '#1F5A3A', title: '#FFF1D0', sub: '#D8EBDD', foot: '#FFF1D0', shadow: ['#04140B', 0.5], edge: ['#FFF1D0', 0.5] },
  berry: { bg: '#B3202F', title: '#FFF5E6', sub: '#FFE7DE', foot: '#FFF5E6', shadow: ['#33050B', 0.45], edge: ['#FFF5E6', 0.5] },
  snow: { bg: '#E8F1F6', title: '#1F3A5A', sub: '#3F5C7D', foot: '#1F3A5A', shadow: ['#1F3A5A', 0.2], edge: ['#1F3A5A', 0.25] },
  ice: { bg: '#DCEBF7', title: '#14324F', sub: '#355675', foot: '#14324F', shadow: ['#14324F', 0.2], edge: ['#14324F', 0.25] },
  night: { bg: '#16304D', title: '#BFE3FF', sub: '#DCEBF7', foot: '#DCEBF7', shadow: ['#020A14', 0.55], edge: ['#DCEBF7', 0.5] },
  frost: { bg: '#BFD9EC', title: '#10283F', sub: '#2E4C6A', foot: '#10283F', shadow: ['#10283F', 0.25], edge: ['#10283F', 0.3] },
  sky: { bg: '#CFE6F5', title: '#12304A', sub: '#34536E', foot: '#12304A', shadow: ['#12304A', 0.22], edge: ['#12304A', 0.28] },
  meadow: { bg: '#DDEFC9', title: '#1E3A1A', sub: '#3F5E3A', foot: '#1E3A1A', shadow: ['#1E3A1A', 0.22], edge: ['#1E3A1A', 0.28] },
  sun: { bg: '#FFD66B', title: '#3A2A00', sub: '#5A430A', foot: '#3A2A00', shadow: ['#3A2A00', 0.25], edge: ['#3A2A00', 0.3] },
  lilac: { bg: '#E6DCF7', title: '#2B1B4D', sub: '#4D3C75', foot: '#2B1B4D', shadow: ['#2B1B4D', 0.22], edge: ['#2B1B4D', 0.28] },
  coral: { bg: '#FF8C6B', title: '#3D0F05', sub: '#5A1E10', foot: '#3D0F05', shadow: ['#3D0F05', 0.28], edge: ['#3D0F05', 0.3] }
};

// The skin of a page: one of its theme's colors, chosen by the page's name so it never changes.
export function skinFor(theme, slug) {
  const list = (THEMES[theme] || THEMES.evergreen).skins;
  return list[hash('cpm-skin|' + slug) % list.length];
}

// Worst contrast ratio of the three text colors of a skin against its background.
export function skinContrast(name) {
  const s = SKINS[name];
  return Math.min(contrast(s.title, s.bg), contrast(s.sub, s.bg), contrast(s.foot, s.bg));
}

// Vertical position of a baseline inside a CSS line box: half the leading plus the font ascent.
function baselineIn(font, size, lineHeight, top) {
  const a = font.ascent / font.upm, d = -font.descent / font.upm;
  return top + (lineHeight - (a + d) * size) / 2 + a * size;
}

// The site logo (the dotted color wheel) at x, y, size px.
function drawLogo(cv, x, y, size, edge) {
  const k = size / 512, X = v => x + v * k, Y = v => y + v * k;
  // ring around it, like box-shadow 0 0 0 2px
  fillContours(cv, [roundedRectContour(x - 2, y - 2, size + 4, size + 4, 112 * k + 2)], hexToRgb(edge[0]), edge[1]);
  fillContours(cv, [roundedRectContour(x, y, size, size, 112 * k)], hexToRgb('#26211b'));
  fillContours(cv, [circleContour(X(256), Y(256), 178 * k, 72)], hexToRgb('#fbf6ec'));
  fillContours(cv, [circleContour(X(256), Y(256), 46 * k, 40)], hexToRgb('#26211b'));
  const dots = [[256, 118, '#d64533'], [354, 158, '#e8832a'], [394, 256, '#f0a81f'], [354, 354, '#4c9a5b'], [256, 394, '#2f6fb5'], [158, 354, '#7a4fa3'], [118, 256, '#d6568a'], [158, 158, '#3fa7b5']];
  for (const [cx, cy, c] of dots) fillContours(cv, [circleContour(X(cx), Y(cy), 33 * k, 32)], hexToRgb(c));
}

// Puts a gray image into the card, clipped to its rounded corners.
function blitCard(cv, art, size, card) {
  const m = rasterize([roundedRectContour(card.x, card.y, size, size, card.radius, 16)]);
  for (let my = 0; my < m.h; my++) {
    const y = m.y0 + my;
    if (y < 0 || y >= cv.h) continue;
    for (let mx = 0; mx < m.w; mx++) {
      const a = m.mask[my * m.w + mx];
      if (!a) continue;
      const x = m.x0 + mx;
      if (x < 0 || x >= cv.w) continue;
      const ax = x - card.x, ay = y - card.y;
      if (ax < 0 || ay < 0 || ax >= size || ay >= size) continue;
      const v = art[ay * size + ax], k = a / 255, o = (y * cv.w + x) * 3;
      cv.data[o] = cv.data[o] + (v - cv.data[o]) * k;
      cv.data[o + 1] = cv.data[o + 1] + (v - cv.data[o + 1]) * k;
      cv.data[o + 2] = cv.data[o + 2] + (v - cv.data[o + 2]) * k;
    }
  }
}

// The headline: two lines at most, 92 px stepping down by 2 until it fits, as in the HTML the first pins came from.
export function fitHeadline(text, maxWidth = PIN_W - 128) {
  for (let size = 92; size >= 60; size -= 2) {
    const ls = -0.014 * size;
    const w = wrapBalanced('serif', text, size, ls, maxWidth, 2);
    if (w.ok) return { size, lines: w.lines, letterSpacing: ls };
  }
  return null;
}

// art: Uint8Array of 920 x 920 gray pixels (art.js artSquare). Returns { png, layout } for the pin.
export function composePin({ headline, sub, art, skin, meta }) {
  const s = SKINS[skin];
  if (!s) throw new Error('unknown skin ' + skin);
  if (art.length !== CARD.size * CARD.size) throw new Error('the art must be 920 x 920');
  const fit = fitHeadline(headline);
  if (!fit) throw new Error('headline does not fit: ' + headline);
  const cv = new Canvas(PIN_W, PIN_H, hexToRgb(s.bg));
  const serif = FONT_DATA.serif, sans = FONT_DATA.sans560;

  // Title block: bottom-aligned, 34 px above the card's top margin, as in the original layout.
  const subSize = 37, subLine = subSize * 1.2, bottom = 372 - 34;
  const subTop = bottom - subLine;
  const h1Line = fit.size * 1.03, h1Bottom = subTop - 18, h1Top = h1Bottom - fit.lines.length * h1Line;
  fit.lines.forEach((line, i) => {
    drawText(cv, 'serif', line, 64, baselineIn(serif, fit.size, h1Line, h1Top + i * h1Line), fit.size, hexToRgb(s.title), { letterSpacing: fit.letterSpacing });
  });
  drawText(cv, 'sans560', sub, 64, baselineIn(sans, subSize, subLine, subTop), subSize, hexToRgb(s.sub));
  const subW = textWidth('sans560', sub, subSize);
  if (subW > PIN_W - 128) throw new Error('the line under the headline is too wide: ' + sub);

  // Card.
  boxShadow(cv, { x: CARD.x, y: CARD.y, w: CARD.size, h: CARD.size, radius: CARD.radius, dy: 26, blur: 54, color: hexToRgb(s.shadow[0]), opacity: s.shadow[1] });
  fillContours(cv, [roundedRectContour(CARD.x, CARD.y, CARD.size, CARD.size, CARD.radius, 16)], [255, 255, 255]);
  blitCard(cv, art, CARD.size, CARD);

  // Footer: logo and site name at the left, the free limit at the right, centered on y = 1406.
  const mid = 1312 + 94;
  drawLogo(cv, 64, mid - 25, 50, s.edge);
  const brandSize = 33, noteSize = 29;
  const fontOf = k => FONT_DATA[k];
  const normalLine = (font, size) => (font.ascent - font.descent) / font.upm * size;
  const brandTop = mid - normalLine(fontOf('sans680'), brandSize) / 2;
  drawText(cv, 'sans680', 'coloringpagemaker.app', 130, baselineIn(fontOf('sans680'), brandSize, normalLine(fontOf('sans680'), brandSize), brandTop), brandSize, hexToRgb(s.foot), { letterSpacing: -0.005 * brandSize });
  const note = '2 free pages a day';
  const noteW = textWidth('sans560', note, noteSize);
  const noteTop = mid - normalLine(sans, noteSize) / 2;
  drawText(cv, 'sans560', note, PIN_W - 64 - noteW, baselineIn(sans, noteSize, normalLine(sans, noteSize), noteTop), noteSize, hexToRgb(s.foot), { opacity: 0.92 });

  const extra = meta ? [xmpChunk(meta)] : [];
  const png = encodePngRgb(cv.data, PIN_W, PIN_H, 9, extra);
  return { png, layout: { headlineSize: fit.size, headlineLines: fit.lines.length } };
}
