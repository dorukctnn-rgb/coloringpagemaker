// Builds cloudflare/dist: every page of the Express app (server.js) rendered once and saved as a static file,
// plus everything in public/. The pages come from the real server, so their bytes are what the old host sends.
//
//   node cloudflare/build.mjs [git ref]  -> cloudflare/dist + cloudflare/dist-manifest.json (sha256 per file)
//
// The site is built from a commit (default HEAD), exported with git's own line endings: on this Windows
// checkout core.autocrlf turns LF into CRLF, and the old host serves the LF bytes from git.
// The server runs as a child process on a free local port without API keys or a database: no page needs them.
import { spawn, execSync } from 'node:child_process';
import os from 'node:os';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..');
const dist = path.join(here, 'dist');
const require = createRequire(import.meta.url);
const ref = process.argv[2] || 'HEAD';
const commit = execSync(`git rev-parse --verify ${JSON.stringify(ref + '^{commit}')}`, { cwd: repo }).toString().trim();
// The commit's files, byte for byte as git stores them.
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cpm-build-'));
execSync(`git -c core.autocrlf=false archive --format=tar ${commit} | tar -x -C "${root}"`, { cwd: repo, stdio: ['ignore', 'ignore', 'inherit'] });

const freePort = () => new Promise((resolve, reject) => {
  const s = net.createServer();
  s.once('error', reject);
  s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); });
});

async function waitFor(base, child) {
  for (let i = 0; i < 900; i++) {
    if (child.exitCode !== null) throw new Error('server.js exited with ' + child.exitCode);
    try { const r = await fetch(base + '/robots.txt'); if (r.ok) return; } catch (e) {}
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('server.js did not start');
}

function fileFor(urlPath) {
  if (urlPath === '/') return 'index.html';
  const slug = urlPath.slice(1);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) throw new Error('unexpected page path ' + urlPath);
  return slug + '.html';
}

const HEADERS = `# Response headers for the static files (Cloudflare Workers static assets).
/*
  Strict-Transport-Security: max-age=63072000
/fonts/*
  Cache-Control: public, max-age=31536000, immutable
/examples/*
  Cache-Control: public, max-age=2592000
/sitemap.xml
  Content-Type: text/xml; charset=utf-8
`;

async function main() {
  const port = await freePort();
  const env = { ...process.env, PORT: String(port), NODE_PATH: path.join(repo, 'node_modules') };
  for (const k of ['OPENAI_API_KEY', 'KV_REST_API_URL', 'KV_REST_API_TOKEN', 'KV_URL', 'REDIS_URL']) delete env[k];
  const child = spawn(process.execPath, [path.join(root, 'server.js')], { cwd: root, env, stdio: ['ignore', 'ignore', 'pipe'] });
  let stderr = '';
  child.stderr.on('data', d => { stderr += d; });
  const base = `http://127.0.0.1:${port}`;
  try {
    await waitFor(base, child);
    fs.rmSync(dist, { recursive: true, force: true });
    fs.mkdirSync(dist, { recursive: true });

    // Every page: the sitemap's URLs plus every theme guide and blog post, whether or not it is in the sitemap.
    const sitemap = await (await fetch(base + '/sitemap.xml')).text();
    const pages = new Set(['/']);
    for (const m of sitemap.matchAll(/<loc>https:\/\/www\.coloringpagemaker\.app([^<]*)<\/loc>/g)) pages.add(m[1] || '/');
    for (const s of Object.keys(require(path.join(root, 'theme-guides.js')))) pages.add('/' + s);
    for (const s of Object.keys(require(path.join(root, 'blog-posts.js')))) pages.add('/' + s);

    const manifest = { builtFrom: null, pages: {}, files: {} };
    for (const p of [...pages].sort()) {
      const r = await fetch(base + p, { redirect: 'manual' });
      if (r.status !== 200) throw new Error(`${p} answered ${r.status}`);
      const buf = Buffer.from(await r.arrayBuffer());
      const file = fileFor(p);
      if (fs.existsSync(path.join(dist, file))) throw new Error('two pages map to ' + file);
      fs.writeFileSync(path.join(dist, file), buf);
      manifest.pages[p] = { file, sha256: createHash('sha256').update(buf).digest('hex'), bytes: buf.length };
    }
    for (const [p, file] of [['/sitemap.xml', 'sitemap.xml'], ['/robots.txt', 'robots.txt']]) {
      const buf = Buffer.from(await (await fetch(base + p)).arrayBuffer());
      fs.writeFileSync(path.join(dist, file), buf);
      manifest.files[p] = { file, sha256: createHash('sha256').update(buf).digest('hex'), bytes: buf.length };
    }
    const nf = await fetch(base + '/this-page-does-not-exist-cpm-build');
    if (nf.status !== 404) throw new Error('404 page answered ' + nf.status);
    const nfBuf = Buffer.from(await nf.arrayBuffer());
    fs.writeFileSync(path.join(dist, '404.html'), nfBuf);
    manifest.files['404'] = { file: '404.html', sha256: createHash('sha256').update(nfBuf).digest('hex'), bytes: nfBuf.length };

    // public/ goes in as it is; a generated file never overwrites a public one (or the reverse).
    const pub = path.join(root, 'public');
    let copied = 0;
    (function copy(dir) {
      for (const name of fs.readdirSync(dir)) {
        const src = path.join(dir, name);
        const rel = path.relative(pub, src);
        const dst = path.join(dist, rel);
        if (fs.statSync(src).isDirectory()) { fs.mkdirSync(dst, { recursive: true }); copy(src); continue; }
        if (fs.existsSync(dst)) throw new Error('public file collides with a page: ' + rel);
        fs.copyFileSync(src, dst);
        copied++;
      }
    })(pub);
    fs.writeFileSync(path.join(dist, '_headers'), HEADERS);
    manifest.builtFrom = commit;
    fs.writeFileSync(path.join(here, 'dist-manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
    console.log(`pages ${Object.keys(manifest.pages).length}, public files ${copied}, dist ${dist}`);
  } finally {
    child.kill();
    setTimeout(() => fs.rmSync(root, { recursive: true, force: true, maxRetries: 5 }), 300);
    if (stderr.trim()) process.stderr.write(stderr.split('\n').filter(l => !/Loaded \.env|Using Vercel KV/.test(l)).join('\n'));
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
