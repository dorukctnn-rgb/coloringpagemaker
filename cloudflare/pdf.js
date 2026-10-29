// PDFs for /download-pdf on Cloudflare. The image checks are the same as server.js (PNG or JPEG data URLs
// only, no web addresses, size caps, a full PNG check before use). The PDF itself is written here instead of
// with pdfkit, which reads its fonts from disk: the page is US Letter, the image is fitted into the 30 pt
// margins and centred exactly as pdfkit's fit/align/valign did, and a free PDF gets the same two watermark lines.
// PNG image data goes into the PDF as it is (Flate with PNG predictors), JPEG as DCT, so nothing is re-encoded.
import { Buffer } from 'node:buffer';
import zlib from 'node:zlib';
import lineart from '../lineart.js';
import { HELVETICA_WIDTHS, HELVETICA_ASCENDER } from './helvetica-widths.js';

export const PDF_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const PDF_IMAGE_MAX_SIDE = 2048;
export const PDF_MAX_PAGES = 30;
const IMAGE_DATA_URL_RE = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/;
export const PDF_IMAGE_REFUSED = 'Only PNG or JPEG images made on this site can go in a PDF.';

export function sniffImageType(buf) {
  if (buf.length >= 8 && buf.readUInt32BE(0) === 0x89504e47 && buf.readUInt32BE(4) === 0x0d0a1a0a) return 'png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf.length >= 12 && buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') return 'webp';
  return null;
}

const PNG_CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
export function pngIsSafe(buf) {
  if (buf.length < 33 || buf.toString('latin1', 12, 16) !== 'IHDR') return false;
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
  const bits = buf[24], channels = PNG_CHANNELS[buf[25]], interlace = buf[28];
  if (!w || !h || w > PDF_IMAGE_MAX_SIDE || h > PDF_IMAGE_MAX_SIDE) return false;
  if (!channels || ![1, 2, 4, 8, 16].includes(bits) || interlace !== 0) return false;
  const idat = [];
  let off = 8, ended = false;
  while (off + 12 <= buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('latin1', off + 4, off + 8);
    const end = off + 8 + len;
    if (end + 4 > buf.length) return false;
    if (type === 'IDAT') idat.push(buf.subarray(off + 8, end));
    off = end + 4;
    if (type === 'IEND') { ended = true; break; }
  }
  if (!ended || !idat.length) return false;
  const rowBytes = Math.ceil((w * channels * bits) / 8);
  const expected = (rowBytes + 1) * h;
  let raw;
  try { raw = zlib.inflateSync(Buffer.concat(idat), { maxOutputLength: expected }); }
  catch (e) { return false; }
  if (raw.length !== expected) return false;
  for (let y = 0; y < h; y++) if (raw[y * (rowBytes + 1)] > 4) return false;
  return true;
}

export function decodePdfImage(src) {
  if (typeof src !== 'string') return { status: 400, error: PDF_IMAGE_REFUSED };
  if (src.length > 40 + Math.ceil(PDF_IMAGE_MAX_BYTES / 3) * 4) return { status: 413, error: 'Each image must be 8 MB or smaller.' };
  const m = IMAGE_DATA_URL_RE.exec(src);
  if (!m) return { status: 400, error: PDF_IMAGE_REFUSED };
  const buffer = Buffer.from(m[2], 'base64');
  if (buffer.length > PDF_IMAGE_MAX_BYTES) return { status: 413, error: 'Each image must be 8 MB or smaller.' };
  const type = sniffImageType(buffer);
  if (!type || type !== m[1]) return { status: 400, error: PDF_IMAGE_REFUSED };
  if (type === 'webp') return { status: 415, error: 'WebP images cannot go in a PDF. Use the PNG instead.' };
  if (type === 'png' && !pngIsSafe(buffer)) return { status: 400, error: PDF_IMAGE_REFUSED };
  return { buffer, type };
}

// --- image objects ---

function pngParts(buf) {
  const ihdr = { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), bits: buf[24], ct: buf[25] };
  const idat = [];
  let plte = null, off = 8;
  while (off + 12 <= buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('latin1', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IDAT') idat.push(data);
    else if (type === 'PLTE') plte = data;
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  return { ...ihdr, plte, data: Buffer.concat(idat) };
}

// Returns { dict, data, w, h } for an image XObject, or null if this image cannot be placed.
export function imageObject(buffer, type) {
  if (type === 'jpeg') {
    let off = 2;
    while (off + 9 < buffer.length) {
      if (buffer[off] !== 0xff) return null;
      const marker = buffer[off + 1];
      if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01 || marker === 0xff) { off += marker === 0xff ? 1 : 2; continue; }
      const len = buffer.readUInt16BE(off + 2);
      const sof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (sof) {
        const h = buffer.readUInt16BE(off + 5), w = buffer.readUInt16BE(off + 7), comps = buffer[off + 9];
        const cs = comps === 1 ? '/DeviceGray' : comps === 4 ? '/DeviceCMYK /Decode [1 0 1 0 1 0 1 0]' : '/DeviceRGB';
        if (!w || !h) return null;
        return { w, h, data: buffer, dict: `/Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace ${cs} /BitsPerComponent 8 /Filter /DCTDecode` };
      }
      off += 2 + len;
    }
    return null;
  }
  let png = pngParts(buffer);
  if (png.ct === 4 || png.ct === 6) {
    // Alpha channel: flatten to gray once (coloring pages are black and white), as pdfkit would have had to decode it too.
    const img = lineart.decodeLuma(buffer);
    if (!img) return null;
    png = pngParts(lineart.encodeGray(img.L, img.w, img.h));
  }
  const colors = png.ct === 2 ? 3 : 1;
  let cs;
  if (png.ct === 0) cs = '/DeviceGray';
  else if (png.ct === 2) cs = '/DeviceRGB';
  else if (png.ct === 3 && png.plte && png.plte.length >= 3) cs = `[/Indexed /DeviceRGB ${png.plte.length / 3 - 1} <${png.plte.toString('hex')}>]`;
  else return null;
  return {
    w: png.w, h: png.h, data: png.data,
    dict: `/Type /XObject /Subtype /Image /Width ${png.w} /Height ${png.h} /ColorSpace ${cs} /BitsPerComponent ${png.bits} /Filter /FlateDecode /DecodeParms << /Predictor 15 /Colors ${colors} /BitsPerComponent ${png.bits} /Columns ${png.w} >>`
  };
}

// --- text ---
function textWidth(s, size) {
  let w = 0;
  for (const ch of s) { const c = ch.charCodeAt(0); w += c >= 32 && c <= 126 ? HELVETICA_WIDTHS[c - 32] : 556; }
  return (w / 1000) * size;
}
const pdfString = s => '(' + s.replace(/[\\()]/g, m => '\\' + m) + ')';
const num = n => String(Math.round(n * 1000) / 1000);
// pdfkit's doc.text(s, x, top, { align: 'center', width }) on a 792 pt page: one line, baseline at top + ascender.
function centredLine(s, x, top, width, size, rgb) {
  const tx = x + (width - textWidth(s, size)) / 2;
  const baseline = 792 - top - (HELVETICA_ASCENDER / 1000) * size;
  return `${rgb} rg\nBT\n/F1 ${size} Tf\n1 0 0 1 ${num(tx)} ${num(baseline)} Tm\n${pdfString(s)} Tj\nET\n`;
}

export const WATERMARK_TOP = 'FREE PREVIEW. Not for resale. Get Pro for $9 (150 pages/day, commercial use): coloringpagemaker.app';
export const WATERMARK_BOTTOM = 'Generated free at coloringpagemaker.app';

// images: [{ buffer, type }]. Returns a Buffer with the PDF, or null if an image cannot be placed.
export function buildPdf(images, { watermark }) {
  const objs = [];            // index i holds object number i + 1
  const add = parts => { objs.push(parts); return objs.length; };
  const catalog = add(null), pages = add(null), font = add([Buffer.from('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')]);
  const kids = [];
  for (const img of images) {
    const io = imageObject(img.buffer, img.type);
    if (!io) return null;
    const imgNum = add([Buffer.from(`<< ${io.dict} /Length ${io.data.length} >>\nstream\n`), io.data, Buffer.from('\nendstream')]);
    // pdfkit fit [552, 732] at (30, 30), align and valign centre.
    const bw = 552, bh = 732, ip = io.w / io.h;
    let w, h;
    if (ip > bw / bh) { w = bw; h = bw / ip; } else { h = bh; w = bh * ip; }
    const x = 30 + bw / 2 - w / 2, top = 30 + bh / 2 - h / 2;
    let content = `q\n${num(w)} 0 0 ${num(h)} ${num(x)} ${num(792 - top - h)} cm\n/I1 Do\nQ\n`;
    if (watermark) {
      content += centredLine(WATERMARK_TOP, 20, 10, 572, 11, '0.8 0 0');
      content += centredLine(WATERMARK_BOTTOM, 20, 770, 572, 10, '0.4 0.4 0.4');
    }
    const c = Buffer.from(content, 'latin1');
    const contentNum = add([Buffer.from(`<< /Length ${c.length} >>\nstream\n`), c, Buffer.from('\nendstream')]);
    const pageNum = add(null);
    objs[pageNum - 1] = [Buffer.from(`<< /Type /Page /Parent ${pages} 0 R /MediaBox [0 0 612 792] /Resources << /ProcSet [/PDF /Text /ImageB /ImageC /ImageI] /XObject << /I1 ${imgNum} 0 R >> /Font << /F1 ${font} 0 R >> >> /Contents ${contentNum} 0 R >>`)];
    kids.push(pageNum);
  }
  objs[catalog - 1] = [Buffer.from(`<< /Type /Catalog /Pages ${pages} 0 R >>`)];
  objs[pages - 1] = [Buffer.from(`<< /Type /Pages /Kids [${kids.map(k => `${k} 0 R`).join(' ')}] /Count ${kids.length} >>`)];
  const info = add([Buffer.from(`<< /Producer (ColoringPageMaker) /Creator (ColoringPageMaker) >>`)]);

  const out = [Buffer.from('%PDF-1.4\n%\xff\xff\xff\xff\n', 'latin1')];
  let pos = out[0].length;
  const offsets = [];
  objs.forEach((parts, i) => {
    offsets.push(pos);
    const head = Buffer.from(`${i + 1} 0 obj\n`);
    const tail = Buffer.from('\nendobj\n');
    out.push(head, ...parts, tail);
    pos += head.length + parts.reduce((s, p) => s + p.length, 0) + tail.length;
  });
  const xref = ['xref', `0 ${objs.length + 1}`, '0000000000 65535 f ', ...offsets.map(o => String(o).padStart(10, '0') + ' 00000 n ')].join('\n') + '\n';
  out.push(Buffer.from(xref + `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${pos}\n%%EOF\n`));
  return Buffer.concat(out);
}
