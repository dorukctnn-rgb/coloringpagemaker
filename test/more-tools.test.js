// The "More free tools" block (views/partials/more-tools.ejs): on the home page, every theme page and every
// blog post, as the last thing before the footer, so never above the generator or the main content. It is
// plain server-rendered HTML with followed links and nothing loaded, and it stays off the legal pages, the blog
// index and the 404. The KDP guide also carries one contextual link to the KDP interior maker.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');
const BLOG_POSTS = require('../blog-posts.js');
const THEME_GUIDES = require('../theme-guides.js');

const TITLE = 'More free tools for printables and sellers';
const TOOLS = ['kdp-coloring-book', 'etsy-tax-summary', 'name-cut-files', 'tumbler-template', 'cone-template'];
const NICHE_PAGES = ['mandala-coloring-pages', 'flower-coloring-pages', 'easter-coloring-pages'];
const KDP_GUIDE = 'coloring-pages-for-self-publishing-kdp';

test('the more-tools block renders on the pages it should, at the end of the main content', async () => {
  const app = await h.startApp({ KV_REST_API_URL: '', OPENAI_API_KEY: '' });
  try {
    const generatorPages = ['/', ...Object.keys(THEME_GUIDES).map(s => '/' + s), ...NICHE_PAGES.map(s => '/' + s)];
    const postPages = Object.keys(BLOG_POSTS).map(s => '/' + s);
    assert.ok(generatorPages.length >= 11 && postPages.length >= 5);
    for (const p of [...generatorPages, ...postPages]) {
      const r = await fetch(app.base + p);
      const html = await r.text();
      assert.equal(r.status, 200, p);
      assert.equal(html.split(TITLE).length - 1, 1, p + ': the block appears once');
      const start = html.indexOf('<section class="related more-tools"');
      const end = html.indexOf('</section>', start) + '</section>'.length;
      assert.ok(start > 0 && end > start, p + ': block found');
      const block = html.slice(start, end);
      for (const t of TOOLS) assert.ok(block.includes(`<a href="https://peakappsstudio.com/${t}/">`), p + ': links ' + t);
      assert.equal((block.match(/<a /g) || []).length, TOOLS.length, p + ': one link per tool');
      assert.doesNotMatch(block, /nofollow|target=|<img|<script|<iframe|style=/, p + ': plain followed links, nothing loaded');
      // The last section of <main>, just before the footer.
      const mainEnd = html.indexOf('</main>', end);
      assert.match(html.slice(end, mainEnd), /^\s*$/, p + ': nothing after the block inside main');
      assert.ok(html.indexOf('<footer', mainEnd) > mainEnd, p + ': footer follows');
      if (generatorPages.includes(p)) assert.ok(html.indexOf('id="generateBtn"') < start, p + ': below the generator');
      if (postPages.includes(p)) assert.ok(html.lastIndexOf('</article>', start) > 0, p + ': below the article');
    }
    for (const p of ['/privacy', '/terms', '/blog', '/no-such-page']) {
      const html = await (await fetch(app.base + p)).text();
      assert.ok(!html.includes(TITLE), p + ': no block');
    }
    // One contextual sentence, only in the KDP guide's article.
    for (const slug of Object.keys(BLOG_POSTS)) {
      const html = await (await fetch(app.base + '/' + slug)).text();
      const article = html.slice(html.indexOf('<article'), html.indexOf('</article>'));
      const links = (article.match(/href="https:\/\/peakappsstudio\.com\/kdp-coloring-book\/"/g) || []).length;
      assert.equal(links, slug === KDP_GUIDE ? 1 : 0, slug);
      if (slug === KDP_GUIDE) assert.doesNotMatch(article, /nofollow/);
    }
  } finally {
    await app.stop();
  }
});
