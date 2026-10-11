// Test helpers: a small Upstash REST mock (what @vercel/kv talks to), an OpenAI images mock,
// PNG/JPEG/WebP builders and a runner that starts server.js as a child process on a free port.
const http = require('http');
const zlib = require('zlib');
const path = require('path');
const { spawn } = require('child_process');

function listen(server) {
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
}
function readBody(req) {
  return new Promise(resolve => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

// --- Upstash REST mock: POST / with ["cmd", ...args]; string results base64 when asked ---
async function startKv(token) {
  const store = new Map(); // key -> { value: string, expiresAt: ms | null }
  const live = k => {
    const e = store.get(k);
    if (e && e.expiresAt !== null && e.expiresAt <= Date.now()) { store.delete(k); return null; }
    return e || null;
  };
  function run(args) {
    const [name, ...rest] = args;
    switch (String(name).toLowerCase()) {
      case 'get': { const e = live(rest[0]); return e ? e.value : null; }
      case 'set': {
        const [k, v, ...opts] = rest;
        let expiresAt = null;
        for (let i = 0; i < opts.length; i++) {
          const o = String(opts[i]).toLowerCase();
          if (o === 'ex') expiresAt = Date.now() + Number(opts[++i]) * 1000;
          else if (o === 'px') expiresAt = Date.now() + Number(opts[++i]);
        }
        store.set(String(k), { value: String(v), expiresAt });
        return 'OK';
      }
      case 'del': { let n = 0; for (const k of rest) if (live(k) && store.delete(k)) n++; return n; }
      default: throw new Error('mock does not support ' + name);
    }
  }
  const enc = v => (typeof v === 'string' && v !== 'OK' ? Buffer.from(v, 'utf8').toString('base64') : v);
  const server = http.createServer(async (req, res) => {
    const body = await readBody(req);
    res.setHeader('Content-Type', 'application/json');
    if (req.headers.authorization !== `Bearer ${token}`) { res.statusCode = 401; return res.end(JSON.stringify({ error: 'unauthorized' })); }
    try {
      const result = run(JSON.parse(body.toString('utf8')));
      res.end(JSON.stringify({ result: req.headers['upstash-encoding'] === 'base64' ? enc(result) : result }));
    } catch (e) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: e.message }));
    }
  });
  const port = await listen(server);
  return {
    url: `http://127.0.0.1:${port}`,
    store,
    get: k => { const e = live(k); return e ? JSON.parse(e.value) : null; },
    put: (k, v, ttlSeconds) => store.set(k, { value: JSON.stringify(v), expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null }),
    ttlSeconds: k => { const e = live(k); return e && e.expiresAt !== null ? (e.expiresAt - Date.now()) / 1000 : null; },
    keys: prefix => [...store.keys()].filter(k => k.startsWith(prefix) && live(k)),
    close: () => new Promise(r => server.close(r))
  };
}

// --- OpenAI images mock: POST /v1/images/generations returns one base64 PNG ---
async function startOpenAI(pngBase64) {
  let calls = 0;
  const server = http.createServer(async (req, res) => {
    await readBody(req);
    res.setHeader('Content-Type', 'application/json');
    if (req.method === 'POST' && req.url.startsWith('/v1/images/generations')) {
      calls++;
      return res.end(JSON.stringify({ created: Math.floor(Date.now() / 1000), data: [{ b64_json: pngBase64 }] }));
    }
    res.statusCode = 404;
    res.end(JSON.stringify({ error: { message: 'not found' } }));
  });
  const port = await listen(server);
  return { baseURL: `http://127.0.0.1:${port}/v1`, calls: () => calls, close: () => new Promise(r => server.close(r)) };
}

// --- A server that records every request, to prove the PDF route never fetches a URL ---
async function startCanary() {
  const hits = [];
  const server = http.createServer((req, res) => { hits.push(req.url); res.end('x'); });
  const port = await listen(server);
  return { port, hits, close: () => new Promise(r => server.close(r)) };
}

// --- Images ---
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
  return t;
})();
function crc32(buf) { let c = 0xffffffff; for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
// colorType 2 = RGB, 6 = RGBA. A white page with a black square, like line art.
function makePng({ width = 64, height = 64, colorType = 2, interlace = 0, filterByte = 0, ihdrWidth, ihdrHeight } = {}) {
  const channels = colorType === 6 ? 4 : 3;
  const rows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(1 + width * channels, 255);
    row[0] = filterByte;
    for (let x = 0; x < width; x++) {
      if (x > width / 4 && x < (3 * width) / 4 && y > height / 4 && y < (3 * height) / 4) row.fill(0, 1 + x * channels, 1 + x * channels + 3);
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(ihdrWidth || width, 0); ihdr.writeUInt32BE(ihdrHeight || height, 4);
  ihdr[8] = 8; ihdr[9] = colorType; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = interlace;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0))
  ]);
}
// A 1x1 baseline JPEG.
const TINY_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////' +
  'wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64');
const TINY_WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.from([26, 0, 0, 0]), Buffer.from('WEBPVP8L'), Buffer.from([13, 0, 0, 0, 0x2f, 0, 0, 0, 0x10, 0x07, 0x10, 0x11, 0x11, 0x88, 0x88, 0xfe, 0x07, 0])]);
const dataUrl = (type, buf) => `data:image/${type};base64,${buf.toString('base64')}`;

// --- PDF inspection ---
function pdfPages(buf) { return (buf.toString('latin1').match(/\/Type \/Page\b(?!s)/g) || []).length; }
function pdfText(buf) {
  // PDFKit writes standard-font text as hex strings inside deflated content streams.
  const s = buf.toString('latin1');
  let out = '';
  const re = /stream\r?\n/g;
  let m;
  while ((m = re.exec(s))) {
    const start = m.index + m[0].length;
    const end = s.indexOf('endstream', start);
    if (end < 0) break;
    try { out += zlib.inflateSync(buf.subarray(start, end)).toString('latin1'); } catch (e) {}
  }
  const hex = (out.match(/<([0-9a-fA-F]+)>/g) || []).map(h => Buffer.from(h.slice(1, -1), 'hex').toString('latin1')).join('');
  return out + '\n' + hex;
}

// --- server.js as a child process ---
async function startApp(env) {
  const probe = http.createServer();
  const port = await listen(probe);
  await new Promise(r => probe.close(r));
  const clean = { ...process.env };
  for (const k of ['IMAGE_MODEL', 'IMAGE_QUALITY', 'PRO_DAILY_LIMIT', 'FREE_GLOBAL_DAILY_LIMIT', 'GUMROAD_PRODUCT_ID', 'KV_REST_API_READ_ONLY_TOKEN', 'KV_URL']) delete clean[k];
  const child = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
    cwd: path.join(__dirname, '..'),
    env: { ...clean, PORT: String(port), UPSTASH_DISABLE_TELEMETRY: '1', ...env },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let log = '';
  child.stdout.on('data', d => { log += d; });
  child.stderr.on('data', d => { log += d; });
  const base = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 15000;
  for (;;) {
    if (child.exitCode !== null) throw new Error('server exited early:\n' + log);
    try { const r = await fetch(base + '/robots.txt'); if (r.ok) break; } catch (e) {}
    if (Date.now() > deadline) { child.kill(); throw new Error('server did not start:\n' + log); }
    await new Promise(r => setTimeout(r, 100));
  }
  return {
    base,
    log: () => log,
    alive: () => child.exitCode === null,
    stop: () => new Promise(resolve => {
      if (child.exitCode !== null) return resolve();
      child.once('exit', () => resolve());
      child.kill();
    })
  };
}

module.exports = { startKv, startOpenAI, startCanary, startApp, makePng, TINY_JPEG, TINY_WEBP, dataUrl, pdfPages, pdfText };
