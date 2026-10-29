// The addresses of the pin job, in front of the static files (worker.js calls pinsRoute first for every GET and HEAD):
//
//   /pins/feed.xml                 the Pinterest RSS feed (?group=halloween|autumn|winter|evergreen for one board's feed)
//   /pins/auto/<slug>.png          the 1000 x 1500 pin of a page made by the job
//   /printables                    the hub of all printable pages
//   /printables/<slug>             the landing page of one coloring page (where a pin's click lands)
//   /printables/img/<slug>.png     the printable page, and <slug>-400.png its thumbnail (the 30 Halloween seeds are static files)
//   /sitemap-printables.xml        the sitemap of the hub and the pages
//   /pins/admin/...                status, pause, resume, seeds, hide, run, selftest (Authorization: Bearer <AUTOPIN_ADMIN_KEY>)
//
// The Worker only forwards: every page, image and feed is made inside the Durable Object (store.js), because a Worker
// on the Free plan has 10 ms of CPU per request.
import { SEEDS } from './seeds.js';

const SLUG = /^[a-z0-9][a-z0-9-]{2,119}$/;
// The slugs of the pages that exist, kept in the Worker for a few minutes. A request for an address that is not one of
// them is answered with the site's 404 without waking the Durable Object, so a flood of made-up addresses cannot use up
// the account's daily Durable Object requests. An unknown address refreshes the list at most once every 30 seconds.
const SEED_SLUGS = new Set(SEEDS.map(s => s.slug));
const known = { set: null, at: 0, tried: 0 };
async function isKnown(stub, slug, now = Date.now()) {
  if (SEED_SLUGS.has(slug)) return true;
  if (known.set && known.set.has(slug) && now - known.at < 5 * 60 * 1000) return true;
  if (!known.set || now - known.at >= 5 * 60 * 1000 || now - known.tried >= 30 * 1000) {
    known.tried = now;
    try { known.set = new Set(await stub.slugs()); known.at = now; } catch (e) { return !known.set; }
  }
  return known.set.has(slug);
}
export const resetKnownSlugs = () => { known.set = null; known.at = 0; known.tried = 0; };
// For the tests: pretend that ms milliseconds have passed since the list was fetched.
export const ageKnownSlugs = ms => { known.at -= ms; known.tried -= ms; };
const stubOf = env => (env && env.PINS ? env.PINS.get(env.PINS.idFromName('main')) : null);
const hdr = (type, cache) => ({ 'Content-Type': type, 'Cache-Control': cache });
const json = (obj, status = 200) => new Response(JSON.stringify(obj, null, 1), { status, headers: hdr('application/json; charset=utf-8', 'no-store') });

// Pages and images are cached at the edge, so a visitor's request does not wake the object every time.
async function cached(request, ctx, make) {
  const cache = typeof caches !== 'undefined' && caches.default ? caches.default : null;
  const key = new Request(request.url, { method: 'GET' });
  if (cache) { try { const hit = await cache.match(key); if (hit) return hit; } catch (e) { /* no cache: build it */ } }
  const res = await make();
  if (cache && res && res.status === 200 && ctx && ctx.waitUntil) ctx.waitUntil(cache.put(key, res.clone()).catch(() => {}));
  return res;
}
const forMethod = (request, res) => (request.method === 'HEAD' ? new Response(null, { status: res.status, headers: res.headers }) : res);

const html = (body, ttl = 300) => new Response(body, { status: 200, headers: hdr('text/html; charset=utf-8', `public, max-age=${ttl}`) });
const imageResponse = bytes => new Response(bytes, { status: 200, headers: { ...hdr('image/png', 'public, max-age=31536000, immutable'), 'Content-Length': String(bytes.length) } });

async function sha256(s) { return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s))); }
export async function authorized(request, env) {
  if (!env.AUTOPIN_ADMIN_KEY) return false;
  const got = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const a = await sha256(got), b = await sha256(String(env.AUTOPIN_ADMIN_KEY));
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function adminRoute(request, env, url) {
  // Without the key set there is no admin address at all.
  if (!env.AUTOPIN_ADMIN_KEY) return null;
  if (!(await authorized(request, env))) return json({ error: 'unauthorized' }, 401);
  const stub = stubOf(env);
  if (!stub) return json({ error: 'no PINS binding' }, 503);
  const name = url.pathname.slice('/pins/admin/'.length);
  const on = v => !['0', 'false', 'off', 'no'].includes(String(v || '').toLowerCase());
  if (name === 'status') return request.method === 'GET' ? json(await stub.status()) : json({ error: 'use GET' }, 405);
  // An image of any page, also one that is not released yet: the review of what the job drew before Pinterest sees it.
  const im = /^image\/([a-z0-9-]+)\/(pin|page|thumb)$/.exec(name);
  if (im) {
    if (request.method !== 'GET') return json({ error: 'use GET' }, 405);
    const img = await stub.adminImage(im[1], im[2]);
    return img ? new Response(img.bytes, { status: 200, headers: hdr('image/png', 'no-store') }) : json({ error: 'not found' }, 404);
  }
  const COMMANDS = ['pause', 'resume', 'seeds', 'hide', 'run', 'selftest'];
  if (request.method !== 'POST') return json(COMMANDS.includes(name) ? { error: 'use POST' } : { error: 'unknown address' }, COMMANDS.includes(name) ? 405 : 404);
  if (name === 'pause') return json(await stub.admin('pause'));
  if (name === 'resume') return json(await stub.admin('resume'));
  if (name === 'seeds') return json(await stub.admin('seeds', { on: on(url.searchParams.get('on')) }));
  if (name === 'hide') return json(await stub.admin('hide', { slug: url.searchParams.get('slug') || '', on: on(url.searchParams.get('on') === null ? '1' : url.searchParams.get('on')) }));
  if (name === 'run') return json(await stub.tick({ source: 'manual' }));
  if (name === 'selftest') {
    // The pin renderer and the page judge on a page that is already on the site, inside the object, nothing stored.
    const sample = await env.ASSETS.fetch(new Request(new URL('/printables/img/' + SEEDS[0].slug + '.png', url)));
    if (!sample.ok) return json({ error: 'the sample page is missing', status: sample.status }, 500);
    return json(await stub.selfTest(new Uint8Array(await sample.arrayBuffer())));
  }
  return json({ error: 'unknown command' }, 404);
}

// Returns a Response for an address of the job, or null when the path is not one of them (or the page does not exist).
export async function pinsRoute(request, env, ctx, url) {
  const path = url.pathname;
  const get = request.method === 'GET' || request.method === 'HEAD';
  if (path.startsWith('/pins/admin/')) return adminRoute(request, env, url);
  if (!get) return null;
  const stub = stubOf(env);
  if (!stub) return null;

  if (path === '/pins/feed.xml') {
    const group = url.searchParams.get('group');
    const xml = await stub.feedXml({ group: group || null, ua: request.headers.get('user-agent') || '' });
    return forMethod(request, new Response(xml, { status: 200, headers: hdr('application/rss+xml; charset=utf-8', 'public, max-age=120') }));
  }
  if (path === '/sitemap-printables.xml') {
    return forMethod(request, await cached(request, ctx, async () => new Response(await stub.sitemapXml(), { status: 200, headers: hdr('text/xml; charset=utf-8', 'public, max-age=900') })));
  }
  if (path === '/printables') return forMethod(request, await cached(request, ctx, async () => html(await stub.hub())));

  let m = /^\/pins\/auto\/([a-z0-9-]+)\.png$/.exec(path);
  if (m && SLUG.test(m[1])) {
    if (!(await isKnown(stub, m[1]))) return null;
    const res = await cached(request, ctx, async () => {
      const img = await stub.image(m[1], 'pin');
      return img ? imageResponse(img.bytes) : new Response(null, { status: 404 });
    });
    return res.status === 404 ? null : forMethod(request, res);
  }
  m = /^\/printables\/img\/([a-z0-9-]+?)(-400)?\.png$/.exec(path);
  if (m && SLUG.test(m[1])) {
    if (!(await isKnown(stub, m[1]))) return null;
    const res = await cached(request, ctx, async () => {
      const img = await stub.image(m[1], m[2] ? 'thumb' : 'page');
      return img ? imageResponse(img.bytes) : new Response(null, { status: 404 });
    });
    return res.status === 404 ? null : forMethod(request, res);
  }
  m = /^\/printables\/([a-z0-9-]+)$/.exec(path);
  if (m && SLUG.test(m[1])) {
    if (!(await isKnown(stub, m[1]))) return null;
    const res = await cached(request, ctx, async () => {
      const body = await stub.landing(m[1]);
      return body ? html(body, 600) : new Response(null, { status: 404 });
    });
    return res.status === 404 ? null : forMethod(request, res);
  }
  return null;
}

// The cron trigger: one tick of the job. The object does the work; this only starts it and writes down what happened.
export async function runScheduled(controller, env) {
  const stub = stubOf(env);
  if (!stub) return { skipped: 'no PINS binding' };
  try {
    const r = await stub.tick({ source: 'cron', scheduledTime: controller && controller.scheduledTime ? controller.scheduledTime : Date.now() });
    console.log('[autopin] ' + JSON.stringify(r));
    return r;
  } catch (e) {
    const msg = String(e && e.message || e).slice(0, 300);
    console.error('[autopin] tick failed: ' + msg);
    try { await stub.noteError('cron', msg); } catch (e2) { /* the object itself is unreachable */ }
    return { status: 'failed', reason: msg };
  }
}
