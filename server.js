const express = require('express');
const bodyParser = require('body-parser');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const OpenAI = require('openai');

const BLOG_POSTS = require('./blog-posts.js');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json({ limit: '20mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '20mb' }));

// === OpenAI Setup ===
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

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

// === Daily rate limit (free users: 2/day per IP — OpenAI is expensive) ===
async function checkAndIncrementUsage(ip, email) {
  const isProUser = await isPro(email);
  if (isProUser) return { allowed: true, remaining: -1 };

  const today = new Date().toISOString().split('T')[0];
  const key = `usage:${today}:${ip}`;

  if (kv) {
    try {
      const count = (await kv.get(key)) || 0;
      if (count >= 2) return { allowed: false, remaining: 0 };
      await kv.set(key, count + 1, { ex: 86400 });
      return { allowed: true, remaining: 2 - count - 1 };
    } catch (e) { return { allowed: true, remaining: 999 }; }
  }
  return { allowed: true, remaining: 999 };
}

// === NICHE SEO PAGES ===
const NICHE_PAGES = {
  'unicorn-coloring-pages': {
    title: 'Free Unicorn Coloring Pages — AI Generator (Printable PDF)',
    h1: 'Unicorn Coloring Pages',
    description: 'Free AI-generated unicorn coloring pages. Create custom unicorn designs and download printable PDFs instantly. No signup required.',
    keyword: 'unicorn coloring pages',
    presetPrompt: 'magical unicorn with flowing mane and sparkles, cute friendly expression',
    intro: 'Unicorns are the most-loved coloring page subject for kids ages 4-12. Generate your own unique unicorn coloring page using AI — magical scenes, fairy unicorns, baby unicorns, rainbow unicorns. Each design is a clean black-and-white outline ready to print. Free, no signup.',
    examples: ['baby unicorn in a flower field', 'unicorn with rainbow mane', 'unicorn princess with a castle', 'pegasus unicorn flying through clouds']
  },
  'dinosaur-coloring-pages': {
    title: 'Free Dinosaur Coloring Pages — AI Generator (Printable)',
    h1: 'Dinosaur Coloring Pages',
    description: 'Free AI-generated dinosaur coloring pages. T-Rex, Stegosaurus, Triceratops and more. Download printable PDFs instantly.',
    keyword: 'dinosaur coloring pages',
    presetPrompt: 'friendly cartoon dinosaur in jungle scene with palm trees',
    intro: 'Dinosaur coloring pages stay one of the top searched themes year after year. Use the AI generator below to create custom T-Rex, Triceratops, Stegosaurus, Brachiosaurus, or Velociraptor scenes. Perfect for ages 3 and up. Print-ready PDF.',
    examples: ['T-Rex roaring in the jungle', 'baby triceratops with mom', 'stegosaurus eating leaves', 'flying pterodactyl over volcano']
  },
  'mandala-coloring-pages': {
    title: 'Free Mandala Coloring Pages — AI Generator for Adults',
    h1: 'Mandala Coloring Pages',
    description: 'Free AI-generated mandala coloring pages for adults. Intricate, symmetrical designs for stress relief and mindfulness. Download printable PDFs.',
    keyword: 'mandala coloring pages',
    presetPrompt: 'intricate symmetrical mandala with floral patterns and geometric details',
    intro: 'Mandala coloring is the #1 mindfulness activity for adults — proven to reduce stress and anxiety. Generate your own intricate symmetrical mandala designs using AI. Each one is unique. Perfect for relaxation, meditation, or quiet evenings.',
    examples: ['floral mandala with lotus center', 'geometric mandala with stars', 'animal mandala with deer', 'celtic knot mandala']
  },
  'halloween-coloring-pages': {
    title: 'Free Halloween Coloring Pages — AI Generator (Printable)',
    h1: 'Halloween Coloring Pages',
    description: 'Free AI Halloween coloring pages — pumpkins, ghosts, witches, haunted houses. Generate custom designs and print at home.',
    keyword: 'halloween coloring pages',
    presetPrompt: 'cute friendly halloween pumpkin with bats and stars',
    intro: 'Halloween coloring page searches peak from September through October — over 90,000 monthly searches. Generate spooky-but-friendly Halloween designs perfect for kids: jack-o-lanterns, ghosts, witches, black cats, haunted houses. All age-appropriate. Print-ready PDF.',
    examples: ['cute jack-o-lantern with bats', 'friendly ghost with candy', 'witch flying on broomstick', 'haunted house with full moon']
  },
  'christmas-coloring-pages': {
    title: 'Free Christmas Coloring Pages — AI Generator (Santa, Tree, More)',
    h1: 'Christmas Coloring Pages',
    description: 'Free AI Christmas coloring pages. Santa, Christmas trees, snowmen, reindeer, presents. Download printable PDFs instantly.',
    keyword: 'christmas coloring pages',
    presetPrompt: 'jolly santa claus with christmas tree and presents',
    intro: 'Christmas is the biggest coloring page season — over 200,000 monthly searches in November and December. Create custom Santa, Christmas tree, snowman, reindeer, or nativity scenes. Each one is print-ready and totally free.',
    examples: ['santa delivering presents', 'snowman with carrot nose', 'christmas tree with ornaments', 'reindeer pulling sleigh']
  },
  'animal-coloring-pages': {
    title: 'Free Animal Coloring Pages — AI Generator (All Animals)',
    h1: 'Animal Coloring Pages',
    description: 'Free AI animal coloring pages — any animal you can imagine. Cats, dogs, horses, lions, dolphins, birds. Generate and print instantly.',
    keyword: 'animal coloring pages',
    presetPrompt: 'cute cartoon cat sitting in a garden with flowers',
    intro: 'Animal coloring pages are the most popular category for kids. With AI, you can generate any animal in any setting — your child\'s favorite pet doing something silly, a wild animal in its habitat, or a fantasy creature. Print-ready, free, no signup.',
    examples: ['golden retriever puppy playing', 'lion family in the savanna', 'dolphin jumping out of water', 'cat napping on a windowsill']
  },
  'flower-coloring-pages': {
    title: 'Free Flower Coloring Pages — AI Generator for Kids & Adults',
    h1: 'Flower Coloring Pages',
    description: 'Free AI flower coloring pages — roses, sunflowers, tulips, lilies, bouquets. Detailed adult or simple kid versions. Download PDFs.',
    keyword: 'flower coloring pages',
    presetPrompt: 'beautiful detailed bouquet of mixed flowers with leaves',
    intro: 'Flowers are timeless coloring page subjects — kids love simple daisies, adults love intricate roses and detailed botanical illustrations. Generate any flower or arrangement you want. Each design is unique.',
    examples: ['rose with leaves and thorns', 'sunflower in a field', 'bouquet of mixed wildflowers', 'cherry blossom branch']
  },
  'princess-coloring-pages': {
    title: 'Free Princess Coloring Pages — AI Generator (Disney-Style)',
    h1: 'Princess Coloring Pages',
    description: 'Free AI princess coloring pages. Beautiful princesses with castles, dresses, animals. Generate custom designs and print instantly.',
    keyword: 'princess coloring pages',
    presetPrompt: 'beautiful princess in flowing gown standing in front of castle',
    intro: 'Princess coloring pages are a top request from kids ages 3-10. Generate princesses in any style — fairy princess, mermaid princess, woodland princess, snow princess. Each one comes with castles, dresses, magic wands, or animal companions.',
    examples: ['princess with long flowing dress and crown', 'mermaid princess underwater', 'fairy princess with butterflies', 'princess riding a horse']
  },
  'easter-coloring-pages': {
    title: 'Free Easter Coloring Pages — AI Generator (Bunnies, Eggs)',
    h1: 'Easter Coloring Pages',
    description: 'Free AI Easter coloring pages. Bunnies, eggs, chicks, spring scenes. Generate custom designs for kids and print instantly.',
    keyword: 'easter coloring pages',
    presetPrompt: 'cute easter bunny with decorated eggs in a basket',
    intro: 'Easter coloring page searches peak in March-April. Generate cute Easter bunnies, decorated eggs, baby chicks, spring flowers, and Easter baskets. Perfect for classroom activities, church groups, or rainy spring afternoons.',
    examples: ['bunny holding decorated easter egg', 'baby chicks in a nest', 'easter basket overflowing with eggs', 'spring scene with bunny and tulips']
  },
  'pokemon-coloring-pages': {
    title: 'Free Pokemon-Style Coloring Pages — AI Creature Generator',
    h1: 'Pokemon-Style Coloring Pages',
    description: 'Free AI-generated Pokemon-style creature coloring pages. Create unique cute monster designs for kids. Print-ready PDF.',
    keyword: 'pokemon coloring pages',
    presetPrompt: 'cute cartoon monster creature with big eyes and friendly expression',
    intro: 'Pokemon-style cute monster coloring pages are massively popular. Since we can\'t legally generate copyrighted Pokemon, this AI tool creates ORIGINAL cute creature designs in the same style — perfect for kids who love monsters but want something new.',
    examples: ['cute electric mouse-like creature', 'fire-breathing baby dragon', 'water-type creature with fins', 'plant creature with leaves']
  },
  'cartoon-character-coloring-pages': {
    title: 'Free Cartoon Character Coloring Pages — AI Generator',
    h1: 'Cartoon Character Coloring Pages',
    description: 'Free AI cartoon character coloring pages. Generate custom cartoon kids, animals, robots, monsters. Print-ready PDFs.',
    keyword: 'cartoon coloring pages',
    presetPrompt: 'cute cartoon character with big eyes and friendly smile',
    intro: 'Generate original cartoon characters perfect for coloring. Cartoon kids playing, friendly robots, silly monsters, talking animals — anything imaginable. Each character is unique to your prompt.',
    examples: ['cartoon astronaut floating in space', 'friendly robot waving hello', 'silly monster eating ice cream', 'cartoon fairy with magic wand']
  },
  'adult-coloring-pages': {
    title: 'Free Detailed Adult Coloring Pages — AI Generator',
    h1: 'Adult Coloring Pages',
    description: 'Free AI-generated detailed coloring pages for adults. Intricate designs for stress relief, mindfulness, and creative expression.',
    keyword: 'adult coloring pages',
    presetPrompt: 'highly detailed intricate zentangle pattern with nature elements',
    intro: 'Adult coloring is a $1B+ industry built on stress relief and mindfulness. Generate complex, detailed designs perfect for grown-up colorists — zentangle patterns, intricate florals, geometric scenes, fantasy landscapes. Each design is print-ready at high resolution.',
    examples: ['intricate zentangle owl', 'detailed floral garden scene', 'geometric pattern with stars', 'fantasy forest with hidden details']
  }
};

// === ROUTES ===

// Homepage
app.get('/', (req, res) => {
  res.render('index', {
    title: 'Free AI Coloring Book Page Generator — Printable PDFs, No Signup',
    description: 'Create custom coloring pages with AI in seconds. Type anything and get a printable black-and-white outline. Free, no signup, perfect for kids and adults.'
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
      return res.status(429).json({
        error: 'Daily limit reached (2 free pages per day). Upgrade to Pro for unlimited.',
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

    // Generate with gpt-image-1
    const result = await openai.images.generate({
      model: 'gpt-image-1',
      prompt: fullPrompt,
      n: 1,
      size: '1024x1024',
      quality: 'medium',
      output_format: 'png',
      background: 'opaque'
    });

    // gpt-image-1 returns base64 by default
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
          '⚠ FREE PREVIEW — Not for resale. Get Pro for $9 (unlimited + commercial use): coloringpagemaker.app',
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
app.post('/gumroad-webhook', async (req, res) => {
  try {
    const { email, sale_id, product_id, refunded } = req.body;
    if (!email) return res.status(400).send('No email');

    if (refunded === 'true' || refunded === true) {
      await revokePro(email);
    } else {
      await grantPro(email, { sale_id, product_id });
    }
    res.send('OK');
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).send('Error');
  }
});

// === VERIFY PRO ===
app.post('/verify-pro', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.json({ pro: false });
  const pro = await isPro(email);
  res.json({ pro, email: email.toLowerCase().trim() });
});

// === NICHE PAGES (must come before catch-all) ===
app.get('/blog', (req, res) => {
  res.render('blog-index', {
    posts: Object.entries(BLOG_POSTS).map(([slug, p]) => ({ slug, ...p }))
  });
});

app.get('/:slug', (req, res, next) => {
  const slug = req.params.slug;
  if (NICHE_PAGES[slug]) {
    return res.render('niche', {
      page: NICHE_PAGES[slug],
      slug,
      allPages: Object.keys(NICHE_PAGES).filter(s => s !== slug).slice(0, 6).map(s => ({ slug: s, h1: NICHE_PAGES[s].h1 }))
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
app.get('/sitemap.xml', (req, res) => {
  res.set('Content-Type', 'text/xml');
  const base = 'https://coloringpagemaker.app';
  const urls = [
    '',
    '/blog',
    ...Object.keys(NICHE_PAGES).map(s => '/' + s),
    ...Object.keys(BLOG_POSTS).map(s => '/' + s)
  ].map(p => `
  <url>
    <loc>${base}${p}</loc>
    <changefreq>weekly</changefreq>
    <priority>${p === '' ? '1.0' : '0.8'}</priority>
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

Sitemap: https://coloringpagemaker.app/sitemap.xml`);
});

// === 404 ===
app.use((req, res) => {
  res.status(404).render('404');
});

app.listen(PORT, () => {
  console.log(`ColoringPageMaker running on ${PORT}`);
});

module.exports = app;
