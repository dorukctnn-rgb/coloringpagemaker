const express = require('express');
const bodyParser = require('body-parser');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const zlib = require('zlib');
const OpenAI = require('openai');
const { cleanColoringPage } = require('./lineart.js');

// === Load .env file if exists (for local dev) ===
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const [key, ...valParts] = trimmed.split('=');
      const value = valParts.join('=').replace(/^["']|["']$/g, '');
      if (key && value && !process.env[key]) {
        process.env[key.trim()] = value.trim();
      }
    });
    console.log('Loaded .env file');
  }
} catch (e) { console.error('.env load error:', e); }

const BLOG_POSTS = require('./blog-posts.js');
const THEME_GUIDES = require('./theme-guides.js');
const THEME_EXAMPLES = require('./theme-examples.js');

// Inline markup for trusted page copy (theme guides, blog posts): [label](href) and **bold**.
function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function md(s) {
  return escHtml(s)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, href) => `<a href="${href}"${/^https?:/.test(href) ? ' rel="noopener"' : ''}>${label}</a>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}
function plain(s) {
  return String(s).replace(/\[([^\]]+)\]\([^)\s]+\)/g, '$1').replace(/\*\*([^*]+)\*\*/g, '$1');
}
// JSON for <script type="application/ld+json">: no raw "<" so the block cannot be closed early.
const jsonLd = obj => JSON.stringify(obj).replace(/</g, '\\u003c');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.locals.md = md;

// Retired pages: one 301 to the closest live page, with or without a trailing slash; the query string is dropped.
// This runs before the trailing-slash redirect below, so a slashed old URL also takes a single hop.
const RETIRED_PAGES = {
  '/pokemon-coloring-pages': '/animal-coloring-pages',
  '/cartoon-character-coloring-pages': '/'
};
app.use((req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD') {
    const target = RETIRED_PAGES[req.path.replace(/\/+$/, '')];
    if (target) return res.redirect(301, target);
  }
  next();
});

// One URL per page: /blog/ and /halloween-coloring-pages/ redirect to the path without the slash.
app.use((req, res, next) => {
  if ((req.method === 'GET' || req.method === 'HEAD') && req.path.length > 1 && req.path.endsWith('/')) {
    const query = req.url.slice(req.path.length);
    return res.redirect(301, req.path.replace(/\/+$/, '') + query);
  }
  next();
});
app.use('/fonts', express.static(path.join(__dirname, 'public', 'fonts'), { maxAge: '365d', immutable: true }));
// Example pages keep their file names once published (see theme-examples.js), so they can be cached for a month.
app.use('/examples', express.static(path.join(__dirname, 'public', 'examples'), { maxAge: '30d' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json({ limit: '20mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '20mb' }));

// === OpenAI Setup ===
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// === Image model ===
// Default: gpt-image-2.5-flare (OpenAI's "fast, high-quality everyday image generation"
// model; size 1024x1024, quality low|medium|high, output_format png and background opaque
// are all supported: https://developers.openai.com/api/docs/guides/image-generation).
// IMAGE_MODEL overrides it, but a model past its OpenAI shutdown date falls back to the
// default so generation keeps working: https://developers.openai.com/api/docs/deprecations
const DEFAULT_IMAGE_MODEL = 'gpt-image-2.5-flare';
const IMAGE_MODEL_SHUTDOWN = {
  'dall-e-2': '2026-05-12',
  'dall-e-3': '2026-05-12',
  'gpt-image-1': '2026-10-23',
  'gpt-image-1-mini': '2026-12-01',
  'gpt-image-1.5': '2026-12-01',
};
function imageModel(now = new Date()) {
  const wanted = (process.env.IMAGE_MODEL || '').trim();
  if (!wanted) return DEFAULT_IMAGE_MODEL;
  const shutdown = IMAGE_MODEL_SHUTDOWN[wanted];
  if (shutdown && now >= new Date(shutdown + 'T00:00:00Z')) {
    console.warn(`[image] IMAGE_MODEL=${wanted} was shut down on ${shutdown}; using ${DEFAULT_IMAGE_MODEL}`);
    return DEFAULT_IMAGE_MODEL;
  }
  return wanted;
}

// === Gumroad license verification ===
// POST https://api.gumroad.com/v2/licenses/verify needs no secret. The product must have
// "Generate a unique license key per sale" enabled, or no purchase can be verified.
const GUMROAD_PRODUCT_ID = process.env.GUMROAD_PRODUCT_ID || 'ZnIImoT1CFy75R8mnbEQDw=='; // dorukctn.gumroad.com/l/uynqt
async function verifyGumroadLicense(licenseKey) {
  const key = String(licenseKey || '').trim();
  if (!key) return { ok: false, reason: 'No license key' };
  try {
    const r = await fetch('https://api.gumroad.com/v2/licenses/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ product_id: GUMROAD_PRODUCT_ID, license_key: key, increment_uses_count: 'false' })
    });
    const data = await r.json();
    if (!data || !data.success || !data.purchase) return { ok: false, reason: (data && data.message) || 'License not valid' };
    const p = data.purchase;
    const revoked = !!(p.refunded || p.chargebacked || (p.disputed && !p.dispute_won));
    return { ok: true, revoked, email: String(p.email || '').toLowerCase().trim(), sale_id: p.sale_id, product_id: p.product_id };
  } catch (e) {
    console.error('Gumroad verify failed:', e.message);
    return { ok: false, reason: 'Could not reach Gumroad' };
  }
}

// === Storage (Vercel KV, which is Upstash Redis) ===
const USE_KV = !!process.env.KV_REST_API_URL;
let kv = null;
if (USE_KV) {
  try { kv = require('@vercel/kv').kv; console.log('Using Vercel KV'); }
  catch (e) { console.error('KV failed:', e.message); }
}

// === Pro tokens ===
// Pro turns on only with a Gumroad license key that Gumroad confirms (POST /verify-pro). The server then
// gives the browser a random token and stores it as protoken:<token> with the purchase email, the sale ID
// and the date, for about 400 days. Every Pro check reads that token. An email address never turns Pro on,
// and no response contains or confirms one.
const PRO_TOKEN_TTL_SECONDS = 400 * 24 * 60 * 60;
const PRO_TOKEN_RE = /^[a-f0-9]{64}$/;

function cleanProToken(token) {
  const t = typeof token === 'string' ? token.trim() : '';
  return PRO_TOKEN_RE.test(t) ? t : '';
}

// Resolves to the token's record when it may use Pro and to null when it may not.
// Rejects when the database cannot be reached, so each caller decides how to fail.
async function lookupProToken(token) {
  if (!kv) throw new Error('KV unavailable');
  const t = cleanProToken(token);
  if (!t) return null;
  const rec = await kv.get(`protoken:${t}`);
  if (!rec || typeof rec !== 'object' || !rec.sale_id) return null;
  // Set when Gumroad reports a refund or chargeback for the sale (see /gumroad-webhook).
  if (await kv.get(`prorevoked:${rec.sale_id}`)) return null;
  return rec;
}

async function proFromToken(token) {
  if (!cleanProToken(token)) return null;
  try { return await lookupProToken(token); }
  catch (e) { console.error('[pro] token lookup failed:', e.message); return null; }
}

// lic comes from verifyGumroadLicense. Returns the new token, or null if it could not be stored.
async function createProToken(lic) {
  if (!kv) return null;
  const token = crypto.randomBytes(32).toString('hex');
  try {
    await kv.set(`protoken:${token}`, { email: lic.email, sale_id: lic.sale_id, created: new Date().toISOString() }, { ex: PRO_TOKEN_TTL_SECONDS });
  } catch (e) {
    console.error('[pro] token store failed:', e.message);
    return null;
  }
  // Gumroad has just confirmed the sale is not refunded, so an older refund mark no longer applies.
  await clearSaleRevocation(lic.sale_id);
  return token;
}

// Ends Pro for every token made from a refunded or charged-back sale. The mark lives as long as
// the longest token could, and holds only the sale ID.
async function revokeSaleTokens(saleId) {
  if (!kv || !saleId) return;
  try { await kv.set(`prorevoked:${saleId}`, { revoked_at: new Date().toISOString() }, { ex: PRO_TOKEN_TTL_SECONDS }); }
  catch (e) { console.error('[pro] revoke mark failed:', e.message); }
}

async function clearSaleRevocation(saleId) {
  if (!kv || !saleId) return;
  try { await kv.del(`prorevoked:${saleId}`); } catch (e) {}
}

// === Pro sale records from the Gumroad webhook (local file fallback without KV) ===
// Kept as the record of each sale. They are never used to turn Pro on.
const PRO_FILE = path.join(__dirname, 'pro-emails.json');

async function grantPro(email, data) {
  const normalized = email.toLowerCase().trim();
  if (kv) {
    try { await kv.set(`pro:${normalized}`, { ...data, granted_at: new Date().toISOString() }); return true; }
    catch (e) { return false; }
  }
  try {
    let emails = {};
    if (fs.existsSync(PRO_FILE)) emails = JSON.parse(fs.readFileSync(PRO_FILE, 'utf8'));
    emails[normalized] = { ...data, granted_at: new Date().toISOString() };
    fs.writeFileSync(PRO_FILE, JSON.stringify(emails, null, 2));
    return true;
  } catch (e) { return false; }
}

async function revokePro(email) {
  const normalized = email.toLowerCase().trim();
  if (kv) { try { await kv.del(`pro:${normalized}`); return true; } catch (e) { return false; } }
  try {
    if (fs.existsSync(PRO_FILE)) {
      const emails = JSON.parse(fs.readFileSync(PRO_FILE, 'utf8'));
      delete emails[normalized];
      fs.writeFileSync(PRO_FILE, JSON.stringify(emails, null, 2));
    }
    return true;
  } catch (e) { return false; }
}

// === Daily rate limit (free users: 2/day per IP, OpenAI is expensive) ===
// Free tier: 2/day. Pro: fair-use cap so a shared license key can't drain the API budget.
const FREE_DAILY_LIMIT = 2;
const PRO_DAILY_LIMIT = Number(process.env.PRO_DAILY_LIMIT || 150);
// Ceiling on free pages across ALL visitors per UTC day, so many IP addresses cannot run up the image bill.
const FREE_GLOBAL_DAILY_LIMIT = Number(process.env.FREE_GLOBAL_DAILY_LIMIT || 60);

// pro: the record from proFromToken(), or null for a free visitor.
async function checkAndIncrementUsage(ip, pro) {
  const today = new Date().toISOString().split('T')[0];
  const isProUser = !!pro;

  // No KV = no way to count. Fail CLOSED so the OpenAI bill can't run away.
  if (!kv) {
    console.error('[usage] KV unavailable, denying generation (fail-closed)');
    return { allowed: false, remaining: 0, reason: 'storage_down' };
  }

  // Pro is counted per Gumroad sale, so every browser activated with the same key shares one cap.
  const key = isProUser
    ? `usage:pro:${today}:${pro.sale_id}`
    : `usage:${today}:${ip}`;
  const limit = isProUser ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT;

  try {
    const count = (await kv.get(key)) || 0;
    if (count >= limit) {
      return { allowed: false, remaining: 0, reason: isProUser ? 'pro_daily_cap' : 'free_daily_cap' };
    }
    if (!isProUser) {
      const totalKey = `usage:free:total:${today}`;
      const total = (await kv.get(totalKey)) || 0;
      if (total >= FREE_GLOBAL_DAILY_LIMIT) {
        return { allowed: false, remaining: 0, reason: 'free_global_cap' };
      }
      await kv.set(totalKey, total + 1, { ex: 86400 });
    }
    await kv.set(key, count + 1, { ex: 86400 });
    return { allowed: true, remaining: isProUser ? -1 : limit - count - 1 };
  } catch (e) {
    console.error('[usage] KV error, denying generation (fail-closed):', e.message);
    return { allowed: false, remaining: 0, reason: 'storage_down' };
  }
}

// === THEME PAGES ===
// Theme guides with their own content live in theme-guides.js (views/theme.ejs).
// The pages below still use the shorter shared layout (views/niche.ejs).
const NICHE_PAGES = {
  'mandala-coloring-pages': {
    updated: '2026-10-15',
    title: 'Free Mandala Coloring Pages (AI Generator for Adults)',
    h1: 'Mandala coloring pages',
    description: 'Free AI-generated mandala coloring pages for adults. Intricate, symmetrical designs for stress relief and mindfulness. Download printable PDFs.',
    keyword: 'mandala coloring pages',
    presetPrompt: 'intricate symmetrical mandala with floral patterns and geometric details',
    intro: 'Mandala coloring is a popular calm-down activity for adults: repetitive, symmetrical and absorbing. Generate your own symmetrical mandala designs; each one is unique. Good for relaxation, meditation, or a quiet evening.',
    examples: ['floral mandala with lotus center', 'geometric mandala with stars', 'animal mandala with deer', 'celtic knot mandala']
  },
  'flower-coloring-pages': {
    updated: '2026-10-15',
    title: 'Free Flower Coloring Pages (AI Generator for Kids and Adults)',
    h1: 'Flower coloring pages',
    description: 'Free AI flower coloring pages: roses, sunflowers, tulips, lilies, bouquets. Detailed adult or simple kid versions. Download PDFs.',
    keyword: 'flower coloring pages',
    presetPrompt: 'beautiful detailed bouquet of mixed flowers with leaves',
    intro: 'Flowers are a timeless coloring page subject. Kids like simple daisies; adults like intricate roses and detailed botanical illustrations. Generate any flower or arrangement you want. Each design is unique.',
    examples: ['rose with leaves and thorns', 'sunflower in a field', 'bouquet of mixed wildflowers', 'cherry blossom branch']
  },
  'easter-coloring-pages': {
    updated: '2026-10-15',
    title: 'Free Easter Coloring Pages (AI Generator for Bunnies and Eggs)',
    h1: 'Easter coloring pages',
    description: 'Free AI Easter coloring pages. Bunnies, eggs, chicks, spring scenes. Generate custom designs for kids and print instantly.',
    keyword: 'easter coloring pages',
    presetPrompt: 'cute easter bunny with decorated eggs in a basket',
    intro: 'Easter coloring pages are in demand in March and April. Generate Easter bunnies, decorated eggs, baby chicks, spring flowers, and Easter baskets. Good for classroom activities, church groups, or rainy spring afternoons.',
    examples: ['bunny holding decorated easter egg', 'baby chicks in a nest', 'easter basket overflowing with eggs', 'spring scene with bunny and tulips']
  }
};

// Every theme page in one order (used for "Browse more themes" and the sitemap).
const THEME_ORDER = [
  'unicorn-coloring-pages', 'dinosaur-coloring-pages', 'mandala-coloring-pages', 'halloween-coloring-pages',
  'christmas-coloring-pages', 'animal-coloring-pages', 'flower-coloring-pages', 'princess-coloring-pages',
  'easter-coloring-pages', 'adult-coloring-pages'
];
// Seasonal guides come after the original themes, so every existing list keeps its links and its order and
// the seasonal pages are only added at the end (sitemap, guides hub and the "Browse more themes" rotation).
const SEASONAL_THEMES = ['fall-coloring-pages', 'thanksgiving-coloring-pages', 'turkey-coloring-pages', 'winter-coloring-pages',
  'nativity-coloring-pages', 'new-year-coloring-pages', 'gingerbread-coloring-pages', 'snowman-coloring-pages',
  'diwali-coloring-pages', 'hanukkah-coloring-pages'];
// Evergreen guides come after the seasonal ones, appended to the same lists in the same way.
const EVERGREEN_THEMES = ['dragon-coloring-pages', 'cat-coloring-pages', 'car-coloring-pages', 'dog-coloring-pages',
  'mermaid-coloring-pages', 'horse-coloring-pages', 'fairy-coloring-pages', 'butterfly-coloring-pages',
  'space-coloring-pages', 'ocean-coloring-pages'];
// The Christmas and winter pages added on 27 October 2026 (Santa, reindeer, tree, ornaments, snowflakes, adults),
// appended after the evergreen guides in every list for the same reason.
const CHRISTMAS_THEMES = ['santa-coloring-pages', 'reindeer-coloring-pages', 'christmas-tree-coloring-pages',
  'christmas-ornament-coloring-pages', 'snowflake-coloring-pages', 'christmas-coloring-pages-for-adults'];
const ALL_THEMES = [...THEME_ORDER, ...SEASONAL_THEMES, ...EVERGREEN_THEMES, ...CHRISTMAS_THEMES];
// The pages that carry the seasonal Pro line under the free examples (views/theme.ejs): every Thanksgiving, Christmas,
// winter and holiday page. Halloween and the evergreen guides do not.
const PRO_SEASON_PAGES = new Set([...SEASONAL_THEMES, ...CHRISTMAS_THEMES, 'christmas-coloring-pages']);
// The "Free printable ... coloring pages" gallery for a theme page, or null.
const examplesFor = slug => (THEME_EXAMPLES[slug] ? { slug, ...THEME_EXAMPLES[slug] } : null);
const themeLabel = slug => (THEME_GUIDES[slug] ? THEME_GUIDES[slug].h1 : NICHE_PAGES[slug].h1);
const SITE = 'https://www.coloringpagemaker.app';
const LEVEL_NAMES = { simple: 'Simple', medium: 'Medium', detailed: 'Detailed' };
// Image metadata that Google's image report asks for on every ImageObject. The license page is the terms:
// "Using the pages you make" says free pages are for personal, non-commercial use (at home or in your own classroom)
// and that Pro adds selling them. The terms also describe how Pro is bought, so they are the page to acquire a license
// from. The copyright line is the one in the footer. Keep cloudflare/autopin/page.js in step.
const IMAGE_META = {
  creator: { '@type': 'Organization', name: 'ColoringPageMaker', url: SITE + '/' },
  creditText: 'ColoringPageMaker',
  copyrightNotice: '© 2026 ColoringPageMaker',
  license: SITE + '/terms',
  acquireLicensePage: SITE + '/terms'
};

function themeJsonLd(slug, g, examples) {
  const url = `${SITE}/${slug}`;
  const exampleDir = examples ? `${SITE}/examples/${examples.files || examples.slug}/` : '';
  return jsonLd({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage', '@id': url + '#webpage', url, name: g.title, description: g.description,
        dateModified: g.updated, isPartOf: { '@type': 'WebSite', name: 'ColoringPageMaker', url: SITE + '/' },
        breadcrumb: { '@id': url + '#breadcrumb' }
      },
      {
        '@type': 'WebApplication', name: g.eyebrow, url, applicationCategory: 'DesignApplication', operatingSystem: 'Web browser',
        offers: [
          { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'USD' },
          { '@type': 'Offer', name: 'Pro (one-time)', price: '9', priceCurrency: 'USD' }
        ]
      },
      {
        '@type': 'BreadcrumbList', '@id': url + '#breadcrumb',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' },
          { '@type': 'ListItem', position: 2, name: g.h1, item: url }
        ]
      },
      {
        '@type': 'FAQPage',
        mainEntity: g.faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: plain(f.a) } }))
      },
      // The example pages shown on the page, and nothing that is not there.
      ...(examples && examples.items.length ? [{
        '@type': 'ImageGallery', '@id': url + '#examples', name: examples.heading, url: url + '#examples',
        associatedMedia: examples.items.map(x => ({
          '@type': 'ImageObject', name: x.title, description: x.alt, encodingFormat: 'image/png',
          contentUrl: `${exampleDir}${x.name}.png`, thumbnailUrl: `${exampleDir}${x.name}-400.webp`,
          ...IMAGE_META
        }))
      }] : [])
    ]
  });
}

// === ROUTES ===

// Homepage
app.get('/', (req, res) => {
  res.render('index', {
    title: 'Free AI Coloring Book Page Generator (Printable PDF, No Signup)',
    description: 'Describe a scene and get a printable black-and-white coloring page in under a minute. Free for 2 pages a day, no signup. For parents, teachers and Etsy or KDP sellers.'
  });
});

// === GENERATE COLORING PAGE ===
app.post('/generate', async (req, res) => {
  try {
    // Pro comes only from the token. An "email" field sent by an older page is ignored.
    const { prompt, token, style } = req.body;
    if (typeof prompt !== 'string' || prompt.trim().length < 3) {
      return res.status(400).json({ error: 'Prompt must be at least 3 characters' });
    }

    if (!openai) {
      return res.status(500).json({ error: 'Image generation not configured. Please contact support.' });
    }

    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    const pro = await proFromToken(token);
    const usage = await checkAndIncrementUsage(ip, pro);

    if (!usage.allowed) {
      if (usage.reason === 'storage_down') {
        return res.status(503).json({
          error: 'We are having a temporary technical issue. Please try again in a few minutes.'
        });
      }
      if (usage.reason === 'free_global_cap') {
        return res.status(429).json({
          error: 'The free pages for today are all used. They reset at midnight UTC, or Pro gives you up to ' + PRO_DAILY_LIMIT + ' a day.',
          limitReached: true,
          reason: 'free_global_cap'
        });
      }
      if (usage.reason === 'pro_daily_cap') {
        return res.status(429).json({
          error: `Daily fair-use cap reached (${PRO_DAILY_LIMIT} pages). Resets at midnight UTC. Contact support if you need more.`,
          limitReached: true,
          reason: 'pro_daily_cap'
        });
      }
      return res.status(429).json({
        error: 'Daily limit reached (2 free pages per day). Upgrade to Pro for up to 150 a day.',
        limitReached: true,
        reason: 'free_daily_cap'
      });
    }

    // Build coloring book prompt
    const styleModifier = style === 'simple'
      ? 'Use simple thick black outlines with very few details. Designed for young children ages 3-6.'
      : style === 'detailed'
        ? 'Make it an adult coloring page with many elements and repeating patterns, bold clean outlines. Use simple thick black outlines and no tiny details.'
        : 'Use medium-detail clear black outlines. Designed for kids ages 6-12.';

    const fullPrompt = `Black and white coloring book page line art of: ${prompt.trim()}. ${styleModifier} Pure white background, only black outlines, NO color, NO shading, NO gray, NO gradients. Clean printable coloring page style with thick uniform black lines on white. Suitable for printing on standard paper.`;

    const result = await openai.images.generate({
      model: imageModel(),
      prompt: fullPrompt,
      n: 1,
      size: '1024x1024',
      quality: process.env.IMAGE_QUALITY || 'medium',
      output_format: 'png',
      background: 'opaque'
    });

    // GPT Image models always return base64, and the page is always sent to the browser as a PNG data URL.
    // /download-pdf accepts only image data, never a web address, so a reply without base64 is an error.
    const b64 = result && result.data && result.data[0] && result.data[0].b64_json;
    if (!b64) throw new Error('No image data returned');
    // A page drawn like a pencil sketch (gray shading, hatching, stippling) is turned into clean black and white;
    // clean line art comes back unchanged (lineart.js). Any problem here keeps the page as the model drew it.
    let pageB64 = b64;
    try {
      const lineart = cleanColoringPage(Buffer.from(b64, 'base64'));
      if (lineart.cleaned) pageB64 = lineart.buffer.toString('base64');
      const level = style === 'simple' || style === 'detailed' ? style : 'medium';
      if (lineart.before) console.log(`[lineart] ${level} detached=${lineart.before.detached.toFixed(4)} cleaned=${lineart.cleaned} ${lineart.ms}ms`);
    } catch (e) {
      console.error('[lineart] skipped:', e.message);
    }
    const imageUrl = `data:image/png;base64,${pageB64}`;

    res.json({
      success: true,
      imageUrl,
      remaining: usage.remaining,
      isPro: usage.remaining === -1
    });
  } catch (err) {
    console.error('Generate error:', err);
    const msg = err?.error?.message || err?.message || 'Image generation failed';
    res.status(500).json({ error: msg });
  }
});

// === PDF IMAGES ===
// /generate only ever returns base64 PNG data URLs, so the PDF route takes image data and never fetches
// a URL: no request to cloud metadata, localhost, file: or any other host can start here.
// PDFKit embeds PNG and JPEG only, so a WebP data URL is recognised and refused with 415.
const PDF_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
const PDF_IMAGE_MAX_SIDE = 2048; // generated pages are 1024 x 1024
const PDF_MAX_PAGES = 30; // the theme pages send one page; the home page builds its books in the browser
const IMAGE_DATA_URL_RE = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/;
const PDF_IMAGE_REFUSED = 'Only PNG or JPEG images made on this site can go in a PDF.';

// The real format of the bytes, whatever the data URL claims.
function sniffImageType(buf) {
  if (buf.length >= 8 && buf.readUInt32BE(0) === 0x89504e47 && buf.readUInt32BE(4) === 0x0d0a1a0a) return 'png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf.length >= 12 && buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') return 'webp';
  return null;
}

// PDFKit unpacks PNGs that have transparency, and its PNG decoder throws inside a zlib callback, which
// would take the whole process down. So every PNG is unpacked here first, synchronously and with a size
// cap: a known header, at most 2048 pixels a side, not interlaced, image data that inflates to exactly
// the expected size and a valid filter byte on every row.
const PNG_CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
function pngIsSafe(buf) {
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

// Returns { buffer } for an image PDFKit can embed, or { status, error }.
function decodePdfImage(src) {
  if (typeof src !== 'string') return { status: 400, error: PDF_IMAGE_REFUSED };
  // Base64 takes 4 characters for every 3 bytes; a longer string cannot decode to 8 MB or less.
  if (src.length > 40 + Math.ceil(PDF_IMAGE_MAX_BYTES / 3) * 4) return { status: 413, error: 'Each image must be 8 MB or smaller.' };
  const m = IMAGE_DATA_URL_RE.exec(src);
  if (!m) return { status: 400, error: PDF_IMAGE_REFUSED };
  const buffer = Buffer.from(m[2], 'base64');
  if (buffer.length > PDF_IMAGE_MAX_BYTES) return { status: 413, error: 'Each image must be 8 MB or smaller.' };
  const type = sniffImageType(buffer);
  if (!type || type !== m[1]) return { status: 400, error: PDF_IMAGE_REFUSED };
  if (type === 'webp') return { status: 415, error: 'WebP images cannot go in a PDF. Use the PNG instead.' };
  if (type === 'png' && !pngIsSafe(buffer)) return { status: 400, error: PDF_IMAGE_REFUSED };
  return { buffer };
}

// === DOWNLOAD AS PDF ===
app.post('/download-pdf', async (req, res) => {
  try {
    const { imageUrls, token } = req.body;
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return res.status(400).json({ error: 'No images provided' });
    }

    const userIsPro = !!(await proFromToken(token));

    // Free users: max 1 image, with watermark
    // Pro users: multi-page book
    const imagesToUse = userIsPro ? imageUrls : imageUrls.slice(0, 1);
    if (imagesToUse.length > PDF_MAX_PAGES) {
      return res.status(400).json({ error: `A PDF can hold up to ${PDF_MAX_PAGES} pages.` });
    }

    // Every image is checked before the PDF starts, so a bad one fails the request instead of leaving a blank page.
    const buffers = [];
    for (const src of imagesToUse) {
      const img = decodePdfImage(src);
      if (!img.buffer) return res.status(img.status).json({ error: img.error });
      buffers.push(img.buffer);
    }

    const doc = new PDFDocument({ margin: 30, size: 'LETTER', bufferPages: true });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => {
      const pdfData = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="coloring-book-${Date.now()}.pdf"`);
      res.send(pdfData);
    });

    // Add each image to PDF. Always pass a Buffer: given a string that is not a data URL, PDFKit reads a local file.
    for (let i = 0; i < buffers.length; i++) {
      if (i > 0) doc.addPage();
      try {
        // Letter size: 612 x 792 points, margin 30
        // Available: 552 x 732
        doc.image(buffers[i], 30, 30, {
          fit: [552, 732],
          align: 'center',
          valign: 'center'
        });
      } catch (e) {
        console.error('PDF image error:', String((e && e.message) || e));
        return res.status(400).json({ error: 'One of the images could not be read. Download the PNG instead.' });
      }
    }

    // Add watermark for free users
    if (!userIsPro) {
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        // The footer sits below the 30 pt margin; without this PDFKit moved it onto an extra blank page.
        doc.page.margins.bottom = 0;

        // Top watermark
        doc.fontSize(11).fillColor('#cc0000').opacity(1).text(
          'FREE PREVIEW. Not for resale. Get Pro for $9 (150 pages/day, commercial use): coloringpagemaker.app',
          20, 10, { align: 'center', width: 572 }
        );

        // Bottom footer
        doc.fontSize(10).fillColor('#666').opacity(1).text(
          'Generated free at coloringpagemaker.app',
          20, 770, { align: 'center', width: 572 }
        );
      }
    }

    doc.end();
  } catch (err) {
    console.error('PDF error:', err);
    res.status(500).json({ error: 'PDF generation failed' });
  }
});

// === GUMROAD WEBHOOK ===
// Anyone can POST here, so a sale record is only kept when Gumroad confirms the ping's
// license key belongs to a real sale of this product. The record never turns Pro on by itself.
app.post('/gumroad-webhook', async (req, res) => {
  try {
    const lic = await verifyGumroadLicense(req.body.license_key);
    if (!lic.ok) {
      console.warn('[gumroad] ping rejected:', lic.reason);
      return res.status(401).send('Unverified');
    }
    if (!lic.email) return res.status(400).send('No email');
    if (lic.revoked) {
      await revokePro(lic.email);
      // Tokens made from this sale stop working too.
      await revokeSaleTokens(lic.sale_id);
    } else {
      await grantPro(lic.email, { sale_id: lic.sale_id, product_id: lic.product_id });
      await clearSaleRevocation(lic.sale_id);
    }
    res.send('OK');
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).send('Error');
  }
});

// === VERIFY PRO ===
// { license_key }: Gumroad checks the key. A valid key that is not refunded gets a new random token: { pro: true, token }.
// { token }: says whether a token from this server still works: { pro: true } or { pro: false }.
// An email address never turns Pro on, and no response contains or confirms one.
app.post('/verify-pro', async (req, res) => {
  const body = req.body || {};
  const licenseKey = typeof body.license_key === 'string' ? body.license_key.trim() : '';
  if (licenseKey) {
    if (licenseKey.length > 200) return res.json({ pro: false });
    const lic = await verifyGumroadLicense(licenseKey);
    if (!lic.ok || lic.revoked || !lic.sale_id) return res.json({ pro: false });
    const token = await createProToken(lic);
    if (!token) return res.status(503).json({ pro: false, error: 'Pro could not be turned on just now. Please try again in a few minutes.' });
    return res.json({ pro: true, token });
  }
  if (cleanProToken(body.token)) {
    try { return res.json({ pro: !!(await lookupProToken(body.token)) }); }
    catch (e) {
      console.error('[pro] token check failed:', e.message);
      return res.status(503).json({ pro: false, error: 'Pro could not be checked just now.' });
    }
  }
  res.json({ pro: false });
});

// Signing out of Pro on the home page deletes that browser's token here as well.
app.post('/pro-signout', async (req, res) => {
  const token = cleanProToken(req.body && req.body.token);
  if (token && kv) {
    try { await kv.del(`protoken:${token}`); }
    catch (e) { console.error('[pro] token delete failed:', e.message); }
  }
  res.json({ ok: true });
});

// === API endpoints - GET requests redirect to home (avoid 404s for crawlers) ===
app.get('/generate', (req, res) => res.redirect(301, '/'));
app.get('/download-pdf', (req, res) => res.redirect(301, '/'));
app.get('/gumroad-webhook', (req, res) => res.redirect(301, '/'));
app.get('/verify-pro', (req, res) => res.redirect(301, '/'));

// === NICHE PAGES (must come before catch-all) ===
const BLOG_GROUPS = [
  { id: 'selling', title: 'Selling coloring books', intro: 'Two marketplaces, two formats: printable PDFs on Etsy and printed paperbacks on Amazon KDP.', slugs: ['sell-coloring-books-on-etsy', 'coloring-pages-for-self-publishing-kdp'] },
  { id: 'tools', title: 'Choosing a generator', intro: 'Free limits, prices and commercial-use terms of the AI tools people compare, taken from each tool\'s own pages.', slugs: ['best-ai-coloring-page-generators-2026'] },
  { id: 'using', title: 'Coloring at school and at home', intro: 'Planning pages around a lesson, and what studies of adult coloring do and do not show.', slugs: ['coloring-pages-for-classroom-teachers', 'adult-coloring-mental-health-benefits'] }
];
const THEME_NOTES = {
  'halloween-coloring-pages': ['Halloween', 'Scare levels by age, class parties, Día de los Muertos'],
  'christmas-coloring-pages': ['Christmas', 'A 24-day Advent plan, cards and ornaments'],
  'dinosaur-coloring-pages': ['Dinosaurs', 'Which species lived together, with museum dates'],
  'adult-coloring-pages': ['Adult', 'Intricate or bold and easy, paper for markers'],
  'princess-coloring-pages': ['Princesses', 'Fairy tales that are free to draw'],
  'animal-coloring-pages': ['Animals', 'Black markings, life cycles, pet portraits'],
  'unicorn-coloring-pages': ['Unicorns', 'Winged unicorns, the narwhal, party pages'],
  'mandala-coloring-pages': ['Mandalas', 'Symmetrical designs for a quiet evening'],
  'flower-coloring-pages': ['Flowers', 'Roses, sunflowers and bouquets'],
  'easter-coloring-pages': ['Easter', 'Bunnies, eggs and chicks for spring'],
  'fall-coloring-pages': ['Fall', 'Leaves, scarecrows and why leaves turn red'],
  'thanksgiving-coloring-pages': ['Thanksgiving', "The kids' table, a thankful tree and 1621"],
  'turkey-coloring-pages': ['Turkeys', 'Cartoon, realistic or without feathers'],
  'winter-coloring-pages': ['Winter', 'Snow days, snowflakes and polar animals'],
  'nativity-coloring-pages': ['Nativity', 'The story in six pages, the ox and the donkey'],
  'new-year-coloring-pages': ['New Year', 'Fireworks, a countdown clock and the Times Square ball'],
  'gingerbread-coloring-pages': ['Gingerbread', 'Cookies, candy houses and the 1875 Gingerbread Boy'],
  'snowman-coloring-pages': ['Snowmen', 'A blank snowman to dress and the best snowman snow'],
  'diwali-coloring-pages': ['Diwali', 'Diyas, rangoli patterns and the festival of lights'],
  'hanukkah-coloring-pages': ['Hanukkah', 'A nine-branch menorah, dreidels and latkes'],
  'dragon-coloring-pages': ['Dragons', 'European and East Asian dragons, and the Komodo'],
  'cat-coloring-pages': ['Cats', 'Kittens and six breeds that are easy to draw'],
  'car-coloring-pages': ['Cars', 'The Model T and a buckle-up page'],
  'dog-coloring-pages': ['Dogs', 'The seven dog groups, a breed from each'],
  'mermaid-coloring-pages': ['Mermaids', 'Tails scale by scale, and where the legend came from'],
  'horse-coloring-pages': ['Horses', 'Hands, Miniature Horses and newborn foals'],
  'fairy-coloring-pages': ['Fairies', 'Fairy houses and the plants of fairy lore'],
  'butterfly-coloring-pages': ['Butterflies', "A monarch's real colors and life cycle"],
  'space-coloring-pages': ['Space', 'The eight planets and the first Moon landing'],
  'ocean-coloring-pages': ['Ocean', 'Blue whales and the unexplored deep sea'],
  'santa-coloring-pages': ['Santa', 'A smiling face, milk and cookies, and the 1955 phone call'],
  'reindeer-coloring-pages': ['Reindeer', 'Which reindeer still have antlers in December'],
  'christmas-tree-coloring-pages': ['Christmas trees', 'A tree to decorate and the first Rockefeller tree'],
  'christmas-ornament-coloring-pages': ['Ornaments', 'Blank baubles to design and cut out'],
  'snowflake-coloring-pages': ['Snowflakes', 'The snow crystal types and a paper snowflake'],
  'christmas-coloring-pages-for-adults': ['Christmas for adults', 'Wreaths, a village street and an ornament mandala']
};
app.get('/blog', (req, res) => {
  const listed = new Set(BLOG_GROUPS.flatMap(g => g.slugs));
  const extra = Object.keys(BLOG_POSTS).filter(s => !listed.has(s));
  const groups = [...BLOG_GROUPS, ...(extra.length ? [{ id: 'more', title: 'More guides', intro: '', slugs: extra }] : [])]
    .map(g => ({ ...g, posts: g.slugs.filter(s => BLOG_POSTS[s]).map(s => ({ slug: s, ...BLOG_POSTS[s] })) }));
  const themes = ALL_THEMES.filter(s => THEME_NOTES[s]).map(s => ({ slug: s, label: THEME_NOTES[s][0], note: THEME_NOTES[s][1] }));
  const ld = jsonLd({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage', '@id': SITE + '/blog#page', url: SITE + '/blog', name: 'Guides for making, using and selling coloring pages',
        dateModified: BLOG_INDEX_UPDATED,
        hasPart: Object.keys(BLOG_POSTS).map(s => ({ '@type': 'Article', headline: BLOG_POSTS[s].title, url: `${SITE}/${s}` }))
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' },
          { '@type': 'ListItem', position: 2, name: 'Guides', item: SITE + '/blog' }
        ]
      }
    ]
  });
  res.render('blog-index', { groups, themes, ld });
});

app.get('/privacy', (req, res) => res.render('privacy'));
app.get('/terms', (req, res) => res.render('terms'));

app.get('/:slug', (req, res, next) => {
  const slug = req.params.slug;
  if (THEME_GUIDES[slug]) {
    return res.render('theme', {
      g: THEME_GUIDES[slug],
      slug,
      seasonal: PRO_SEASON_PAGES.has(slug),
      levelNames: LEVEL_NAMES,
      examples: examplesFor(slug),
      ld: themeJsonLd(slug, THEME_GUIDES[slug], examplesFor(slug))
    });
  }
  if (NICHE_PAGES[slug]) {
    return res.render('niche', {
      page: NICHE_PAGES[slug],
      slug,
      examples: examplesFor(slug),
      // The next six themes after this one, wrapping around, so every theme page gets links from six others,
      // followed by the seasonal guides.
      allPages: [...[...THEME_ORDER.slice(THEME_ORDER.indexOf(slug) + 1), ...THEME_ORDER.slice(0, Math.max(0, THEME_ORDER.indexOf(slug)))].filter(s => s !== slug).slice(0, 6), ...SEASONAL_THEMES, ...EVERGREEN_THEMES, ...CHRISTMAS_THEMES].map(s => ({ slug: s, h1: themeLabel(s) }))
    });
  }
  if (BLOG_POSTS[slug]) {
    return res.render('blog-post', {
      post: BLOG_POSTS[slug],
      slug,
      allPosts: Object.keys(BLOG_POSTS).filter(s => s !== slug).slice(0, 4).map(s => ({ slug: s, title: BLOG_POSTS[s].title }))
    });
  }
  next();
});

// === SITEMAP ===
// Only canonical URLs (www host, no trailing slash), each with the date its content last changed.
const SITEMAP_LASTMOD = '2026-10-07';
const BLOG_INDEX_UPDATED = '2026-10-15';
const HOME_UPDATED = '2026-10-15';
const PRIVACY_UPDATED = '2026-10-28';
const TERMS_UPDATED = '2026-10-11';
app.get('/sitemap.xml', (req, res) => {
  res.set('Content-Type', 'text/xml');
  const entries = [
    ['/', HOME_UPDATED],
    ['/blog', BLOG_INDEX_UPDATED],
    ...ALL_THEMES.map(s => ['/' + s, (THEME_GUIDES[s] || NICHE_PAGES[s] || {}).updated || SITEMAP_LASTMOD]),
    ...Object.keys(BLOG_POSTS).map(s => ['/' + s, BLOG_POSTS[s].updated || SITEMAP_LASTMOD]),
    ['/privacy', PRIVACY_UPDATED],
    ['/terms', TERMS_UPDATED]
  ];
  const urls = entries.map(([p, lastmod]) => `
  <url>
    <loc>${SITE}${p}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${p === '/' ? '1.0' : '0.8'}</priority>
  </url>`).join('');

  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}
</urlset>`);
});

// === ROBOTS ===
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *
Allow: /
Disallow: /generate
Disallow: /download-pdf
Disallow: /gumroad-webhook
Disallow: /verify-pro

Sitemap: https://www.coloringpagemaker.app/sitemap.xml
Sitemap: https://www.coloringpagemaker.app/sitemap-printables.xml`);
});

// === 404 ===
app.use((req, res) => {
  res.status(404).render('404');
});

app.listen(PORT, () => {
  console.log(`ColoringPageMaker running on ${PORT}`);
});

module.exports = app;
