const express = require('express');
const bodyParser = require('body-parser');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const OpenAI = require('openai');

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

// === Pro Emails Storage (Vercel KV + local fallback) ===
const USE_KV = !!process.env.KV_REST_API_URL;
let kv = null;
if (USE_KV) {
  try { kv = require('@vercel/kv').kv; console.log('Using Vercel KV'); }
  catch (e) { console.error('KV failed:', e.message); }
}

const PRO_FILE = path.join(__dirname, 'pro-emails.json');

async function isPro(email) {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  if (kv) {
    try { return !!(await kv.get(`pro:${normalized}`)); }
    catch (e) { return false; }
  }
  try {
    if (fs.existsSync(PRO_FILE)) {
      const emails = JSON.parse(fs.readFileSync(PRO_FILE, 'utf8'));
      return !!emails[normalized];
    }
  } catch (e) {}
  return false;
}

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
// Free tier: 2/day. Pro: fair-use cap so a shared email can't drain the API budget.
const FREE_DAILY_LIMIT = 2;
const PRO_DAILY_LIMIT = Number(process.env.PRO_DAILY_LIMIT || 150);
// Ceiling on free pages across ALL visitors per UTC day, so many IP addresses cannot run up the image bill.
const FREE_GLOBAL_DAILY_LIMIT = Number(process.env.FREE_GLOBAL_DAILY_LIMIT || 60);

async function checkAndIncrementUsage(ip, email) {
  const today = new Date().toISOString().split('T')[0];
  const isProUser = await isPro(email);

  // No KV = no way to count. Fail CLOSED so the OpenAI bill can't run away.
  if (!kv) {
    console.error('[usage] KV unavailable, denying generation (fail-closed)');
    return { allowed: false, remaining: 0, reason: 'storage_down' };
  }

  const key = isProUser
    ? `usage:pro:${today}:${(email || '').toLowerCase()}`
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
    title: 'Free Mandala Coloring Pages (AI Generator for Adults)',
    h1: 'Mandala coloring pages',
    description: 'Free AI-generated mandala coloring pages for adults. Intricate, symmetrical designs for stress relief and mindfulness. Download printable PDFs.',
    keyword: 'mandala coloring pages',
    presetPrompt: 'intricate symmetrical mandala with floral patterns and geometric details',
    intro: 'Mandala coloring is a popular calm-down activity for adults: repetitive, symmetrical and absorbing. Generate your own symmetrical mandala designs; each one is unique. Good for relaxation, meditation, or a quiet evening.',
    examples: ['floral mandala with lotus center', 'geometric mandala with stars', 'animal mandala with deer', 'celtic knot mandala']
  },
  'flower-coloring-pages': {
    title: 'Free Flower Coloring Pages (AI Generator for Kids and Adults)',
    h1: 'Flower coloring pages',
    description: 'Free AI flower coloring pages: roses, sunflowers, tulips, lilies, bouquets. Detailed adult or simple kid versions. Download PDFs.',
    keyword: 'flower coloring pages',
    presetPrompt: 'beautiful detailed bouquet of mixed flowers with leaves',
    intro: 'Flowers are a timeless coloring page subject. Kids like simple daisies; adults like intricate roses and detailed botanical illustrations. Generate any flower or arrangement you want. Each design is unique.',
    examples: ['rose with leaves and thorns', 'sunflower in a field', 'bouquet of mixed wildflowers', 'cherry blossom branch']
  },
  'easter-coloring-pages': {
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
const themeLabel = slug => (THEME_GUIDES[slug] ? THEME_GUIDES[slug].h1 : NICHE_PAGES[slug].h1);
const SITE = 'https://www.coloringpagemaker.app';
const LEVEL_NAMES = { simple: 'Simple', medium: 'Medium', detailed: 'Detailed' };

function themeJsonLd(slug, g) {
  const url = `${SITE}/${slug}`;
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
      }
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
    const { prompt, email, style } = req.body;
    if (!prompt || prompt.trim().length < 3) {
      return res.status(400).json({ error: 'Prompt must be at least 3 characters' });
    }

    if (!openai) {
      return res.status(500).json({ error: 'Image generation not configured. Please contact support.' });
    }

    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    const usage = await checkAndIncrementUsage(ip, email);

    if (!usage.allowed) {
      if (usage.reason === 'storage_down') {
        return res.status(503).json({
          error: 'We are having a temporary technical issue. Please try again in a few minutes.'
        });
      }
      if (usage.reason === 'free_global_cap') {
        return res.status(429).json({
          error: 'The free pages for today are all used. They reset at midnight UTC, or Pro gives you up to ' + PRO_DAILY_LIMIT + ' a day.',
          limitReached: true
        });
      }
      if (usage.reason === 'pro_daily_cap') {
        return res.status(429).json({
          error: `Daily fair-use cap reached (${PRO_DAILY_LIMIT} pages). Resets at midnight UTC. Contact support if you need more.`,
          limitReached: true
        });
      }
      return res.status(429).json({
        error: 'Daily limit reached (2 free pages per day). Upgrade to Pro for up to 150 a day.',
        limitReached: true
      });
    }

    // Build coloring book prompt
    const styleModifier = style === 'simple'
      ? 'Use simple thick black outlines with very few details. Designed for young children ages 3-6.'
      : style === 'detailed'
        ? 'Use highly detailed intricate lines with complex patterns. Designed for adults or older kids.'
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

    // GPT Image models return base64
    const imageData = result.data[0];
    let imageUrl;

    if (imageData.b64_json) {
      // Convert to data URL for client display
      imageUrl = `data:image/png;base64,${imageData.b64_json}`;
    } else if (imageData.url) {
      imageUrl = imageData.url;
    } else {
      throw new Error('No image data returned');
    }

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

// === DOWNLOAD AS PDF ===
app.post('/download-pdf', async (req, res) => {
  try {
    const { imageUrls, email } = req.body;
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return res.status(400).json({ error: 'No images provided' });
    }

    const userIsPro = email && await isPro(email);

    // Free users: max 1 image, with watermark
    // Pro users: unlimited multi-page book
    const imagesToUse = userIsPro ? imageUrls : imageUrls.slice(0, 1);

    const doc = new PDFDocument({ margin: 30, size: 'LETTER', bufferPages: true });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => {
      const pdfData = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="coloring-book-${Date.now()}.pdf"`);
      res.send(pdfData);
    });

    // Add each image to PDF
    for (let i = 0; i < imagesToUse.length; i++) {
      if (i > 0) doc.addPage();

      try {
        let imageBuffer;
        const src = imagesToUse[i];

        if (src.startsWith('data:image/')) {
          // Base64 data URL
          const base64Data = src.split(',')[1];
          imageBuffer = Buffer.from(base64Data, 'base64');
        } else {
          // External URL
          const response = await fetch(src);
          const arrayBuffer = await response.arrayBuffer();
          imageBuffer = Buffer.from(arrayBuffer);
        }

        // Letter size: 612 x 792 points, margin 30
        // Available: 552 x 732
        doc.image(imageBuffer, 30, 30, {
          fit: [552, 732],
          align: 'center',
          valign: 'center'
        });
      } catch (e) {
        console.error('Image fetch error:', e);
      }
    }

    // Add watermark for free users
    if (!userIsPro) {
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);

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
// Anyone can POST here, so Pro is only granted when Gumroad confirms the ping's
// license key belongs to a real sale of this product, and only to that sale's email.
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
    } else {
      await grantPro(lic.email, { sale_id: lic.sale_id, product_id: lic.product_id });
    }
    res.send('OK');
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).send('Error');
  }
});

// === VERIFY PRO ===
app.post('/verify-pro', async (req, res) => {
  const { email, license_key } = req.body;
  // A license key from the Gumroad receipt activates Pro even if the webhook never arrived.
  if (license_key) {
    const lic = await verifyGumroadLicense(license_key);
    if (!lic.ok || lic.revoked || !lic.email) return res.json({ pro: false });
    await grantPro(lic.email, { sale_id: lic.sale_id, product_id: lic.product_id });
    return res.json({ pro: true, email: lic.email });
  }
  if (!email) return res.json({ pro: false });
  const pro = await isPro(email);
  res.json({ pro, email: email.toLowerCase().trim() });
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
  'unicorn-coloring-pages': ['Unicorns', 'Winged unicorns, the narwhal, party pages']
};
app.get('/blog', (req, res) => {
  const listed = new Set(BLOG_GROUPS.flatMap(g => g.slugs));
  const extra = Object.keys(BLOG_POSTS).filter(s => !listed.has(s));
  const groups = [...BLOG_GROUPS, ...(extra.length ? [{ id: 'more', title: 'More guides', intro: '', slugs: extra }] : [])]
    .map(g => ({ ...g, posts: g.slugs.filter(s => BLOG_POSTS[s]).map(s => ({ slug: s, ...BLOG_POSTS[s] })) }));
  const themes = THEME_ORDER.filter(s => THEME_NOTES[s]).map(s => ({ slug: s, label: THEME_NOTES[s][0], note: THEME_NOTES[s][1] }));
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

app.get('/:slug', (req, res, next) => {
  const slug = req.params.slug;
  if (THEME_GUIDES[slug]) {
    return res.render('theme', {
      g: THEME_GUIDES[slug],
      slug,
      levelNames: LEVEL_NAMES,
      ld: themeJsonLd(slug, THEME_GUIDES[slug])
    });
  }
  if (NICHE_PAGES[slug]) {
    return res.render('niche', {
      page: NICHE_PAGES[slug],
      slug,
      allPages: THEME_ORDER.filter(s => s !== slug).slice(0, 6).map(s => ({ slug: s, h1: themeLabel(s) }))
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
const BLOG_INDEX_UPDATED = '2026-10-09';
app.get('/sitemap.xml', (req, res) => {
  res.set('Content-Type', 'text/xml');
  const entries = [
    ['/', SITEMAP_LASTMOD],
    ['/blog', BLOG_INDEX_UPDATED],
    ...THEME_ORDER.map(s => ['/' + s, (THEME_GUIDES[s] && THEME_GUIDES[s].updated) || SITEMAP_LASTMOD]),
    ...Object.keys(BLOG_POSTS).map(s => ['/' + s, BLOG_POSTS[s].updated || SITEMAP_LASTMOD])
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

Sitemap: https://www.coloringpagemaker.app/sitemap.xml`);
});

// === 404 ===
app.use((req, res) => {
  res.status(404).render('404');
});

app.listen(PORT, () => {
  console.log(`ColoringPageMaker running on ${PORT}`);
});

module.exports = app;
