// ColoringPageMaker on Cloudflare Workers (Free plan).
//
// Every page, image, font, sitemap.xml and robots.txt is a static asset built by cloudflare/build.mjs from the
// same Express app (server.js), so the HTML is byte for byte what the old host served. Static assets never run
// this script. It runs only for the API routes, old-URL redirects, trailing slashes and unknown paths.
//
// Generation shield (Para Makinesi §4.6, PM-SAAS-01):
// - Free pages and Pro standard pages: Workers AI FLUX.1 [schnell] plus the Images binding (gray PNG). On the
//   Workers Free plan both stop with an error at their free allowance instead of billing, and AI_DAILY_LIMIT
//   keeps the site under the 10,000 daily neurons in any case.
// - Only Pro HD pages call OpenAI. Each HD page reserves HD_COST_USD before the call against a monthly and a
//   daily cap held in the Ledger Durable Object; when either is reached the page is drawn as a standard page.
//   Sales from HD_TERMS_FROM on also have a monthly HD allowance (written on the Gumroad page); earlier sales
//   keep their terms: up to 150 pages a day, HD while the shared budget lasts.
import { Buffer } from 'node:buffer';
import lineart from '../lineart.js';
import { decodePdfImage, buildPdf, PDF_MAX_PAGES } from './pdf.js';
import { FLUX_MODEL, fluxPrompt } from './flux.js';
import { pinsRoute, runScheduled } from './autopin/routes.js';

const FREE_DAILY_LIMIT = 2;
const GUMROAD_PRODUCT_ID = 'ZnIImoT1CFy75R8mnbEQDw=='; // dorukctn.gumroad.com/l/uynqt
const PRO_TOKEN_RE = /^[a-f0-9]{64}$/;

// Same retired pages and the same one-hop rules as server.js.
const RETIRED_PAGES = { '/pokemon-coloring-pages': '/animal-coloring-pages', '/cartoon-character-coloring-pages': '/' };
const API_GET_REDIRECTS = new Set(['/generate', '/download-pdf', '/gumroad-webhook', '/verify-pro']);
// Express matches these fixed routes without regard to case; the theme and guide slugs are case-sensitive.
const FIXED_PAGES = new Set(['/blog', '/privacy', '/terms', '/sitemap.xml', '/robots.txt']);

// OpenAI image models past their shutdown date fall back to the default (same table as server.js).
const DEFAULT_IMAGE_MODEL = 'gpt-image-2.5-flare';
const IMAGE_MODEL_SHUTDOWN = { 'dall-e-2': '2026-05-12', 'dall-e-3': '2026-05-12', 'gpt-image-1': '2026-10-23', 'gpt-image-1-mini': '2026-12-01', 'gpt-image-1.5': '2026-12-01' };
export function imageModel(wanted, now = new Date()) {
  wanted = String(wanted || '').trim();
  if (!wanted) return DEFAULT_IMAGE_MODEL;
  const shutdown = IMAGE_MODEL_SHUTDOWN[wanted];
  if (shutdown && now >= new Date(shutdown + 'T00:00:00Z')) return DEFAULT_IMAGE_MODEL;
  return wanted;
}

const numberVar = (v, d) => (v === undefined || v === null || v === '' || !Number.isFinite(Number(v)) ? d : Number(v));
export function config(env) {
  return {
    freeEngine: String(env.FREE_ENGINE || 'flux'),
    freeGlobal: numberVar(env.FREE_GLOBAL_DAILY_LIMIT, 120),
    aiDaily: numberVar(env.AI_DAILY_LIMIT, 160),
    fluxSteps: numberVar(env.FLUX_STEPS, 4),
    proDaily: numberVar(env.PRO_DAILY_LIMIT, 150),
    hdEnabled: String(env.HD_ENABLED || '1') === '1',
    // Estimated price of one HD page, set above the model's list price so the cap errs on the safe side.
    hdCostMicros: Math.round(numberVar(env.HD_COST_USD, 0.06) * 1e6),
    hdMonthCapMicros: Math.round(numberVar(env.HD_MONTHLY_CAP_USD, 9) * 1e6),
    hdDayCapMicros: Math.round(numberVar(env.HD_DAILY_CAP_USD, 1.5) * 1e6),
    hdAllowance: numberVar(env.HD_MONTHLY_ALLOWANCE, 50),
    hdTermsFrom: String(env.HD_TERMS_FROM || '2026-10-21'),
    imageQuality: String(env.IMAGE_QUALITY || 'medium'),
    hdLineart: String(env.HD_LINEART || '1') === '1',
    openaiBase: String(env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, ''),
    productId: String(env.GUMROAD_PRODUCT_ID || GUMROAD_PRODUCT_ID),
    legacyUrl: String(env.LEGACY_VERIFY_URL || '').replace(/\/+$/, '')
  };
}

const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
const redirect = (location, status = 301) => new Response(`Moved Permanently. Redirecting to ${location}`, { status, headers: { Location: location, 'Content-Type': 'text/plain; charset=utf-8' } });
const ledgerOf = env => env.LEDGER.get(env.LEDGER.idFromName('main'));
const cleanProToken = t => (typeof t === 'string' && PRO_TOKEN_RE.test(t.trim()) ? t.trim() : '');
async function sha256Hex(s) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Buffer.from(d).toString('hex');
}
const randomHex = n => Buffer.from(crypto.getRandomValues(new Uint8Array(n))).toString('hex');
const today = () => new Date().toISOString().slice(0, 10);

async function readBody(request, limit) {
  const len = Number(request.headers.get('content-length') || 0);
  if (len > limit) return { status: 413, error: { error: 'Request too large' } };
  const text = await request.text();
  if (text.length > limit) return { status: 413, error: { error: 'Request too large' } };
  const ct = (request.headers.get('content-type') || '').toLowerCase();
  if (ct.includes('application/x-www-form-urlencoded')) return { data: Object.fromEntries(new URLSearchParams(text)) };
  if (!ct.includes('json') || !text) return { data: {} };
  try { return { data: JSON.parse(text) || {} }; } catch (e) { return { status: 400, error: { error: 'Invalid JSON' } }; }
}

// --- Gumroad ---
async function verifyGumroadLicense(cfg, licenseKey) {
  const key = String(licenseKey || '').trim();
  if (!key) return { ok: false, reason: 'No license key' };
  try {
    const r = await fetch('https://api.gumroad.com/v2/licenses/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ product_id: cfg.productId, license_key: key, increment_uses_count: 'false' })
    });
    const data = await r.json();
    if (!data || !data.success || !data.purchase) return { ok: false, reason: (data && data.message) || 'License not valid' };
    const p = data.purchase;
    const revoked = !!(p.refunded || p.chargebacked || (p.disputed && !p.dispute_won));
    return { ok: true, revoked, email: String(p.email || '').toLowerCase().trim(), sale_id: p.sale_id, product_id: p.product_id, created_at: String(p.created_at || '') };
  } catch (e) {
    console.error('Gumroad verify failed:', e.message);
    return { ok: false, reason: 'Could not reach Gumroad' };
  }
}

// --- Pro tokens ---
// A token this database does not know may still come from the old server (tokens made before the move).
// While LEGACY_VERIFY_URL is set, that server is asked once; a yes is remembered here as an older sale.
async function legacyToken(token, cfg, ledger) {
  if (!cfg.legacyUrl) return null;
  const h = await sha256Hex(token);
  if (await ledger.legacyMiss(h)) return null;
  if (!(await ledger.takeLegacyLookup({ day: today(), perDay: 300 }))) return null;
  try {
    const r = await fetch(cfg.legacyUrl + '/verify-pro', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) });
    const d = await r.json();
    if (r.ok && d && d.pro === true) {
      const rec = { token, sale_id: 'legacy:' + h.slice(0, 24), email: '', sale_created: '', legacy: true };
      await ledger.putToken(rec);
      return { sale_id: rec.sale_id, email: '', sale_created: '', legacy: true };
    }
    if (r.ok && d && d.pro === false) await ledger.noteLegacyMiss(h);
  } catch (e) { console.error('[pro] legacy check failed:', e.message); }
  return null;
}
// Resolves to the token's record, or null. Throws when the ledger cannot be reached.
async function lookupProToken(token, cfg, ledger) {
  const t = cleanProToken(token);
  if (!t) return null;
  return (await ledger.getToken(t)) || (await legacyToken(t, cfg, ledger));
}
async function proFromToken(token, cfg, ledger) {
  if (!cleanProToken(token)) return null;
  try { return await lookupProToken(token, cfg, ledger); }
  catch (e) { console.error('[pro] token lookup failed:', e.message); return null; }
}
export const isLegacySale = (pro, cfg) => !!pro.legacy || !pro.sale_created || String(pro.sale_created).slice(0, 10) < cfg.hdTermsFrom;

// --- drawing ---
// The prompt and the model live in flux.js: the daily Pinterest job draws with the same words.
export { fluxPrompt };

async function standardPage(env, cfg, userPrompt, level) {
  let out;
  try { out = await env.AI.run(FLUX_MODEL, { prompt: fluxPrompt(userPrompt, level), steps: cfg.fluxSteps }); }
  catch (e) {
    console.error('[flux] failed:', e && e.message);
    return { ok: false, status: 503, error: 'The drawing service is busy. Please try again in a minute.' };
  }
  const b64 = out && out.image;
  if (!b64) return { ok: false, status: 503, error: 'The drawing service is busy. Please try again in a minute.' };
  const jpeg = Buffer.from(b64, 'base64');
  // Gray PNG, like the pages from the old generator; the JPEG itself if the Images binding is unavailable.
  try {
    const res = await env.IMAGES.input(new Blob([jpeg]).stream()).transform({ saturation: 0 }).output({ format: 'image/png' });
    const png = Buffer.from(await res.response().arrayBuffer());
    if (png.length > 8 && png.readUInt32BE(0) === 0x89504e47) return { ok: true, imageUrl: 'data:image/png;base64,' + png.toString('base64') };
    throw new Error('not a PNG');
  } catch (e) {
    console.error('[images] gray PNG failed, sending the JPEG:', e && e.message);
  }
  return { ok: true, imageUrl: 'data:image/jpeg;base64,' + b64 };
}

// The OpenAI request and prompt are exactly those of server.js.
async function hdPage(env, cfg, userPrompt, level) {
  const styleModifier = level === 'simple'
    ? 'Use simple thick black outlines with very few details. Designed for young children ages 3-6.'
    : level === 'detailed'
      ? 'Make it an adult coloring page with many elements and repeating patterns, bold clean outlines. Use simple thick black outlines and no tiny details.'
      : 'Use medium-detail clear black outlines. Designed for kids ages 6-12.';
  const fullPrompt = `Black and white coloring book page line art of: ${userPrompt}. ${styleModifier} Pure white background, only black outlines, NO color, NO shading, NO gray, NO gradients. Clean printable coloring page style with thick uniform black lines on white. Suitable for printing on standard paper.`;
  let r;
  try {
    r = await fetch(cfg.openaiBase + '/images/generations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: imageModel(env.IMAGE_MODEL), prompt: fullPrompt, n: 1, size: '1024x1024', quality: cfg.imageQuality, output_format: 'png', background: 'opaque' })
    });
  } catch (e) {
    // No answer: OpenAI may have drawn (and billed) the page, so the reservation stays.
    console.error('[hd] request failed:', e && e.message);
    return { ok: false, refund: false };
  }
  let data = null;
  try { data = await r.json(); } catch (e) { data = null; }
  if (!r.ok) {
    const err = (data && data.error) || {};
    const msg = String(err.message || 'Image generation failed');
    console.error('[hd] OpenAI refused:', r.status, err.code || '', msg.slice(0, 200));
    // A refusal is not billed. A description OpenAI will not draw is not redrawn by another model.
    if (r.status === 400 && /moderation|safety|content.?policy/i.test(`${err.code || ''} ${err.type || ''} ${msg}`)) return { ok: false, refund: true, final: true, status: 400, error: msg };
    return { ok: false, refund: true };
  }
  const b64 = data && data.data && data.data[0] && data.data[0].b64_json;
  if (!b64) return { ok: false, refund: false };
  if (data.usage) console.log('[hd] usage', JSON.stringify(data.usage));
  let pageB64 = b64;
  if (!cfg.hdLineart) return { ok: true, imageUrl: `data:image/png;base64,${pageB64}` };
  try {
    const la = lineart.cleanColoringPage(Buffer.from(b64, 'base64'));
    if (la.cleaned) pageB64 = la.buffer.toString('base64');
    if (la.before) console.log(`[lineart] ${level} detached=${la.before.detached.toFixed(4)} cleaned=${la.cleaned} ${la.ms}ms`);
  } catch (e) { console.error('[lineart] skipped:', e.message); }
  return { ok: true, imageUrl: `data:image/png;base64,${pageB64}` };
}

async function generate(request, env) {
  const body = await readBody(request, 64 * 1024);
  if (body.error) return json(body.error, body.status);
  const { prompt, token, style } = body.data;
  if (typeof prompt !== 'string' || prompt.trim().length < 3) return json({ error: 'Prompt must be at least 3 characters' }, 400);
  const userPrompt = prompt.trim().slice(0, 1000);
  const level = style === 'simple' || style === 'detailed' ? style : 'medium';
  const cfg = config(env);
  const ledger = ledgerOf(env);
  const day = today(), month = day.slice(0, 7);

  let pro;
  try { pro = cleanProToken(token) ? await lookupProToken(token, cfg, ledger) : null; }
  catch (e) {
    console.error('[usage] ledger unavailable:', e.message);
    return json({ error: 'We are having a temporary technical issue. Please try again in a few minutes.' }, 503);
  }

  if (pro) {
    const saleKey = pro.sale_id;
    const q = await ledger.takePro({ saleKey, day, perDay: cfg.proDaily });
    if (!q.allowed) return json({ error: `Daily fair-use cap reached (${cfg.proDaily} pages). Resets at midnight UTC. Contact support if you need more.`, limitReached: true }, 429);
    if (cfg.hdEnabled && env.OPENAI_API_KEY) {
      const hold = { saleKey, month, day, costMicros: cfg.hdCostMicros };
      const res = await ledger.reserveHd({ ...hold, legacy: isLegacySale(pro, cfg), monthlyCapMicros: cfg.hdMonthCapMicros, dailyCapMicros: cfg.hdDayCapMicros, allowance: cfg.hdAllowance });
      if (res.ok) {
        const hd = await hdPage(env, cfg, userPrompt, level);
        if (hd.ok) return json({ success: true, imageUrl: hd.imageUrl, remaining: -1, isPro: true, quality: 'hd' });
        if (hd.refund) await ledger.refundHd(hold);
        if (hd.final) { await ledger.giveBackPro({ saleKey, day }); return json({ error: hd.error }, hd.status); }
      } else {
        console.log('[hd] standard page instead:', res.reason);
      }
    }
    const a = await ledger.takeAi({ day, aiDaily: cfg.aiDaily });
    if (!a.allowed) {
      await ledger.giveBackPro({ saleKey, day });
      return json({ error: "Today's pages are all drawn. They reset at midnight UTC." }, 429);
    }
    const page = await standardPage(env, cfg, userPrompt, level);
    if (!page.ok) { await ledger.giveBackAi({ day }); await ledger.giveBackPro({ saleKey, day }); return json({ error: page.error }, page.status); }
    return json({ success: true, imageUrl: page.imageUrl, remaining: -1, isPro: true, quality: 'standard' });
  }

  if (cfg.freeEngine !== 'flux') return json({ error: 'Free pages are paused for a moment. Please try again later.' }, 503);
  const ipKey = (await sha256Hex(`${env.IP_SALT || ''}|${request.headers.get('cf-connecting-ip') || 'unknown'}`)).slice(0, 32);
  const usage = await ledger.takeFree({ ipKey, day, perIp: FREE_DAILY_LIMIT, globalFree: cfg.freeGlobal, aiDaily: cfg.aiDaily });
  if (!usage.allowed) {
    if (usage.reason === 'free_global_cap') {
      return json({ error: 'The free pages for today are all used. They reset at midnight UTC, or Pro gives you up to ' + cfg.proDaily + ' a day.', limitReached: true }, 429);
    }
    return json({ error: 'Daily limit reached (2 free pages per day). Upgrade to Pro for up to 150 a day.', limitReached: true }, 429);
  }
  const page = await standardPage(env, cfg, userPrompt, level);
  if (!page.ok) { await ledger.giveBackFree({ ipKey, day }); return json({ error: page.error }, page.status); }
  return json({ success: true, imageUrl: page.imageUrl, remaining: usage.remaining, isPro: false });
}

async function downloadPdf(request, env) {
  const body = await readBody(request, 20 * 1024 * 1024);
  if (body.error) return json(body.error, body.status);
  const { imageUrls, token } = body.data;
  if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) return json({ error: 'No images provided' }, 400);
  const userIsPro = !!(await proFromToken(token, config(env), ledgerOf(env)));
  const imagesToUse = userIsPro ? imageUrls : imageUrls.slice(0, 1);
  if (imagesToUse.length > PDF_MAX_PAGES) return json({ error: `A PDF can hold up to ${PDF_MAX_PAGES} pages.` }, 400);
  const images = [];
  for (const src of imagesToUse) {
    const img = decodePdfImage(src);
    if (!img.buffer) return json({ error: img.error }, img.status);
    images.push(img);
  }
  const pdf = buildPdf(images, { watermark: !userIsPro });
  if (!pdf) return json({ error: 'One of the images could not be read. Download the PNG instead.' }, 400);
  return new Response(pdf, {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="coloring-book-${Date.now()}.pdf"`, 'Cache-Control': 'no-store' }
  });
}

async function gumroadWebhook(request, env) {
  const body = await readBody(request, 64 * 1024);
  if (body.error) return new Response('Bad request', { status: 400 });
  const cfg = config(env), ledger = ledgerOf(env);
  try {
    const lic = await verifyGumroadLicense(cfg, body.data.license_key);
    if (!lic.ok) { console.warn('[gumroad] ping rejected:', lic.reason); return new Response('Unverified', { status: 401 }); }
    if (!lic.email) return new Response('No email', { status: 400 });
    if (lic.revoked) {
      await ledger.dropSale(lic.email);
      await ledger.revokeSale(lic.sale_id);
    } else {
      await ledger.saveSale({ email: lic.email, sale_id: lic.sale_id, product_id: lic.product_id });
      await ledger.clearRevocation(lic.sale_id);
    }
    return new Response('OK');
  } catch (err) {
    console.error('Webhook error:', err && err.message);
    return new Response('Error', { status: 500 });
  }
}

async function verifyPro(request, env) {
  const body = await readBody(request, 64 * 1024);
  if (body.error) return json(body.error, body.status);
  const b = body.data || {};
  const cfg = config(env), ledger = ledgerOf(env);
  const licenseKey = typeof b.license_key === 'string' ? b.license_key.trim() : '';
  if (licenseKey) {
    if (licenseKey.length > 200) return json({ pro: false });
    const lic = await verifyGumroadLicense(cfg, licenseKey);
    if (!lic.ok || lic.revoked || !lic.sale_id) return json({ pro: false });
    const token = randomHex(32);
    try { await ledger.putToken({ token, sale_id: lic.sale_id, email: lic.email, sale_created: lic.created_at, legacy: false }); }
    catch (e) {
      console.error('[pro] token store failed:', e.message);
      return json({ pro: false, error: 'Pro could not be turned on just now. Please try again in a few minutes.' }, 503);
    }
    return json({ pro: true, token });
  }
  if (cleanProToken(b.token)) {
    try { return json({ pro: !!(await lookupProToken(b.token, cfg, ledger)) }); }
    catch (e) {
      console.error('[pro] token check failed:', e.message);
      return json({ pro: false, error: 'Pro could not be checked just now.' }, 503);
    }
  }
  return json({ pro: false });
}

async function proSignout(request, env) {
  const body = await readBody(request, 64 * 1024);
  const token = cleanProToken(body.data && body.data.token);
  if (token) {
    try { await ledgerOf(env).dropToken(token); } catch (e) { console.error('[pro] token delete failed:', e.message); }
  }
  return json({ ok: true });
}

async function notFound(request, env) {
  const page = await env.ASSETS.fetch(new Request(new URL('/404', request.url)));
  return new Response(request.method === 'HEAD' ? null : page.body, { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const lower = path.toLowerCase();
    try {
      if (request.method === 'GET' || request.method === 'HEAD') {
        const bare = path.replace(/\/+$/, '');
        const retired = RETIRED_PAGES[bare];
        if (retired) return redirect(retired);
        if (path.length > 1 && path.endsWith('/')) return redirect((bare || '/') + url.search);
        if (API_GET_REDIRECTS.has(lower)) return redirect('/');
        if (lower !== path && FIXED_PAGES.has(lower)) return env.ASSETS.fetch(new Request(new URL(lower + url.search, url), request));
        // Pages live at their clean path only: the stored file names (x.html, index, 404) answer 404 as before.
        if (path === '/404' || path === '/index' || lower.endsWith('.html')) return notFound(request, env);
        // The Pinterest feed, the printable pages and their images are made by the pin job (autopin/routes.js).
        if (path.startsWith('/pins/') || path.startsWith('/printables') || path === '/sitemap-printables.xml') {
          const pins = await pinsRoute(request, env, ctx, url);
          if (pins) return pins;
        }
        const res = await env.ASSETS.fetch(request);
        if (res.status === 404) return notFound(request, env);
        return res;
      }
      if (request.method === 'POST') {
        if (path.startsWith('/pins/admin/')) { const pins = await pinsRoute(request, env, ctx, url); if (pins) return pins; }
        if (lower === '/generate') return await generate(request, env);
        if (lower === '/download-pdf') return await downloadPdf(request, env);
        if (lower === '/gumroad-webhook') return await gumroadWebhook(request, env);
        if (lower === '/verify-pro') return await verifyPro(request, env);
        if (lower === '/pro-signout') return await proSignout(request, env);
      }
      return await notFound(request, env);
    } catch (err) {
      console.error('Unhandled:', err && (err.stack || err.message));
      return json({ error: 'Something went wrong. Please try again.' }, 500);
    }
  },
  // The cron trigger of the daily Pinterest job (wrangler.production.jsonc, triggers.crons): see autopin/tick.js.
  async scheduled(controller, env, ctx) {
    const run = runScheduled(controller, env);
    ctx.waitUntil(run);
    return run;
  }
};
