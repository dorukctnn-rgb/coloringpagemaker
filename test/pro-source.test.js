// Unit tests for views/partials/pro-source.ejs: the landing-tag, referrer and in-app browser classifier, the
// per-tab and per-browser source words, and the Pro link swap. The script runs exactly as browsers get it, inside a vm
// sandbox with a fake document, location, sessionStorage and localStorage. The last test renders every page
// and checks that each one carries the script.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const h = require('./helpers');

const PARTIAL = fs.readFileSync(path.join(__dirname, '..', 'views', 'partials', 'pro-source.ejs'), 'utf8');
const SCRIPT = /^<script>\r?\n([\s\S]*)<\/script>\s*$/.exec(PARTIAL)[1];
const PRO_URL = 'https://dorukctn.gumroad.com/l/uynqt';
const OWN = 'www.coloringpagemaker.app';
// The Gumroad UTM links made on 14 October 2026 (campaign "coloringpagemaker", one per kind of site).
const LINKS = {
  google: 'https://gum.co/u/dsikakff',
  bing: 'https://gum.co/u/rpturwob',
  'other-search': 'https://gum.co/u/f93wludz',
  'ai-assistant': 'https://gum.co/u/tuooex5a',
  pinterest: 'https://gum.co/u/pev97h5v',
  social: 'https://gum.co/u/mzojadhp',
  referral: 'https://gum.co/u/hdddyxaj',
  direct: 'https://gum.co/u/c5e3rwd5'
};
const CATEGORIES = Object.keys(LINKS);

// A storage area backed by a Map. mode 'methods-throw' throws on use, 'access-throws' throws as soon as the page
// reads window.sessionStorage or window.localStorage (Safari and Chrome with site data blocked), 'missing' is absent.
function area(ctx, name, map, mode, writes) {
  if (mode === 'ok') {
    ctx[name] = {
      getItem: k => (map.has(k) ? map.get(k) : null),
      setItem: (k, v) => { writes.push([name, k, String(v)]); map.set(k, String(v)); }
    };
  } else if (mode === 'methods-throw') {
    ctx[name] = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('QuotaExceededError'); } };
  } else if (mode === 'access-throws') {
    Object.defineProperty(ctx, name, { get() { throw new Error('SecurityError'); } });
  }
}
// One page load. Pass the same `browser` (its localStorage) and `tab` (its sessionStorage) to model later pages
// and later visits. `stored` and `first` preset the tab's and the browser's words.
// `ua` sets navigator.userAgent (no navigator at all when it is left out); UA_THROWS makes reading it throw.
const UA_THROWS = Symbol('throws');
function load({ referrer = '', search = '', host = OWN, stored, first, tab = new Map(), browser = new Map(), session = 'ok', local = 'ok', prerendering = false, ua } = {}) {
  if (stored !== undefined) tab.set('cpm_source', stored);
  if (first !== undefined) browser.set('cpm_first_source', first);
  const writes = [];
  const listeners = {};
  const ctx = {
    window: {},
    location: { hostname: host, search },
    document: {
      referrer,
      prerendering,
      addEventListener(type, fn, opts) { (listeners[type] = listeners[type] || []).push({ fn, opts }); }
    }
  };
  if (ua === UA_THROWS) ctx.navigator = { get userAgent() { throw new Error('blocked'); } };
  else if (ua !== undefined) ctx.navigator = { userAgent: ua };
  area(ctx, 'sessionStorage', tab, session, writes);
  area(ctx, 'localStorage', browser, local, writes);
  vm.createContext(ctx);
  vm.runInContext(SCRIPT, ctx);
  return {
    api: ctx.window.cpmSource,
    tab,
    browser,
    writes,
    listeners,
    fire(type, target) { for (const l of listeners[type] || []) l.fn({ type, target }); },
    // Where a Pro button sends this visitor right now.
    proLink() { const a = anchor(PRO_URL); this.fire('click', a); return a.href; }
  };
}
const api = load().api;
const classify = (referrer, host = OWN) => api.classify(referrer, host);
const classifyTag = (value, host = OWN) => api.classifyTag(value, host);
const fromUrl = (search, host = OWN) => api.fromUrl(search, host);
const fromAgent = ua => api.fromAgent(ua);
// A fake <a> element, and a <span> inside it.
function anchor(href) { const a = { href, closest: sel => (sel === 'a[href]' ? a : null) }; return a; }
const inside = a => ({ closest: sel => (sel === 'a[href]' ? a : null) });

const CASES = [
  ['', 'direct'],
  // Google search, every country domain, but not other Google products
  ['https://www.google.com/', 'google'],
  ['https://google.com/search?q=unicorn+coloring+pages', 'google'],
  ['https://www.google.co.uk/', 'google'],
  ['https://www.google.com.tr/', 'google'],
  ['https://www.google.de/', 'google'],
  ['https://m.google.com/', 'google'],
  ['https://images.google.com/', 'google'],
  ['HTTPS://WWW.GOOGLE.COM/', 'google'],
  ['https://www.google.com./', 'google'],
  ['https://www.google.com:443/url?q=x', 'google'],
  ['android-app://com.google.android.googlequicksearchbox/', 'google'],
  ['https://gemini.google.com/app', 'ai-assistant'],
  ['https://classroom.google.com/c/123', 'referral'],
  ['https://docs.google.com/document/d/x', 'referral'],
  ['https://notgoogle.com/', 'referral'],
  ['https://google.com.evil.example/', 'referral'],
  // Bing and the other search engines
  ['https://www.bing.com/', 'bing'],
  ['https://cn.bing.com/search?q=x', 'bing'],
  ['android-app://com.microsoft.bing/', 'bing'],
  ['https://duckduckgo.com/', 'other-search'],
  ['https://html.duckduckgo.com/', 'other-search'],
  ['https://search.yahoo.com/', 'other-search'],
  ['https://r.search.yahoo.com/', 'other-search'],
  ['https://search.yahoo.co.jp/', 'other-search'],
  ['https://yandex.ru/', 'other-search'],
  ['https://yandex.com.tr/', 'other-search'],
  ['https://ya.ru/', 'other-search'],
  ['https://www.ecosia.org/', 'other-search'],
  ['https://search.brave.com/', 'other-search'],
  ['https://www.baidu.com/', 'other-search'],
  ['https://m.baidu.com/', 'other-search'],
  ['https://search.naver.com/', 'other-search'],
  ['https://m.search.naver.com/', 'other-search'],
  ['https://search.seznam.cz/', 'other-search'],
  ['https://www.qwant.com/', 'other-search'],
  ['https://www.startpage.com/', 'other-search'],
  ['https://blog.naver.com/someone/123', 'referral'],
  // AI assistants
  ['https://chatgpt.com/', 'ai-assistant'],
  ['https://chat.openai.com/', 'ai-assistant'],
  ['https://www.perplexity.ai/', 'ai-assistant'],
  ['https://copilot.microsoft.com/', 'ai-assistant'],
  ['https://copilot.com/', 'ai-assistant'],
  ['https://claude.ai/', 'ai-assistant'],
  ['https://you.com/', 'ai-assistant'],
  ['https://www.phind.com/', 'ai-assistant'],
  ['android-app://com.openai.chatgpt/', 'ai-assistant'],
  // Pinterest, on any country domain and its short links
  ['https://www.pinterest.com/', 'pinterest'],
  ['https://pinterest.com/pin/123/', 'pinterest'],
  ['https://www.pinterest.co.uk/', 'pinterest'],
  ['https://br.pinterest.com/', 'pinterest'],
  ['https://www.pinterest.com.mx/', 'pinterest'],
  ['https://www.pinterest.de/', 'pinterest'],
  ['https://pin.it/abc', 'pinterest'],
  ['android-app://com.pinterest/', 'pinterest'],
  // Social networks, including their link redirectors
  ['https://l.facebook.com/', 'social'],
  ['https://lm.facebook.com/l.php?u=x', 'social'],
  ['https://m.facebook.com/', 'social'],
  ['https://www.facebook.com/groups/1', 'social'],
  ['https://l.instagram.com/', 'social'],
  ['https://www.reddit.com/r/coloring/', 'social'],
  ['https://old.reddit.com/', 'social'],
  ['https://out.reddit.com/', 'social'],
  ['https://x.com/', 'social'],
  ['https://t.co/abc', 'social'],
  ['https://mobile.twitter.com/', 'social'],
  ['https://www.youtube.com/', 'social'],
  ['https://m.youtube.com/', 'social'],
  ['https://www.tiktok.com/', 'social'],
  ['https://www.threads.net/', 'social'],
  ['https://www.threads.com/', 'social'],
  ['https://www.linkedin.com/', 'social'],
  ['https://lnkd.in/x', 'social'],
  ['https://www.quora.com/', 'social'],
  ['https://user:pw@reddit.com/', 'social'],
  ['android-app://com.reddit.frontpage/', 'social'],
  ['android-app://com.facebook.katana/', 'social'],
  // Everything else outside this site
  ['https://bit.co/', 'referral'],
  ['https://box.com/', 'referral'],
  ['https://www.etsy.com/listing/1', 'referral'],
  ['https://peakappsstudio.com/', 'referral'],
  ['http://example.org/page', 'referral'],
  ['android-app://com.google.android.gm/', 'referral'],
  ['android-app://org.telegram.messenger/', 'referral'],
  ['android-app://constructor/', 'referral'],
  // Not recorded: this site, Gumroad, or nothing readable
  ['https://www.coloringpagemaker.app/unicorn-coloring-pages', ''],
  ['https://coloringpagemaker.app/', ''],
  ['https://WWW.ColoringPageMaker.app/', ''],
  ['https://dorukctn.gumroad.com/l/uynqt', ''],
  ['https://gumroad.com/checkout', ''],
  ['https://gum.co/u/abc', ''],
  ['about:blank', ''],
  ['file:///C:/Users/me/page.html', ''],
  ['chrome-extension://abcdef/popup.html', ''],
  ['android-app://', ''],
  ['https:///nohost', ''],
  ['not a url', '']
];

// Values of utm_source, ref or source in the landing address.
const TAGS = [
  // AI assistants: ChatGPT tags the links it cites with utm_source=chatgpt.com
  ['chatgpt.com', 'ai-assistant'],
  ['ChatGPT.com', 'ai-assistant'],
  ['https://chatgpt.com/', 'ai-assistant'],
  ['chatgpt', 'ai-assistant'],
  ['ChatGPT', 'ai-assistant'],
  ['chat-gpt', 'ai-assistant'],
  ['Chat GPT', 'ai-assistant'],
  ['openai', 'ai-assistant'],
  ['perplexity', 'ai-assistant'],
  ['Perplexity AI', 'ai-assistant'],
  ['perplexity.ai', 'ai-assistant'],
  ['www.perplexity.ai', 'ai-assistant'],
  ['copilot', 'ai-assistant'],
  ['copilot.com', 'ai-assistant'],
  ['copilot.microsoft.com', 'ai-assistant'],
  ['gemini', 'ai-assistant'],
  ['gemini.google.com', 'ai-assistant'],
  ['claude', 'ai-assistant'],
  ['claude.ai', 'ai-assistant'],
  ['you.com', 'ai-assistant'],
  ['deepseek', 'ai-assistant'],
  ['grok', 'ai-assistant'],
  // Search engines
  ['google', 'google'],
  ['Google', 'google'],
  ['google.com', 'google'],
  ['www.google.com.tr', 'google'],
  ['bing', 'bing'],
  ['bing.com', 'bing'],
  ['duckduckgo', 'other-search'],
  ['ddg', 'other-search'],
  ['yandex', 'other-search'],
  ['brave', 'other-search'],
  // Pinterest
  ['pinterest', 'pinterest'],
  ['Pinterest', 'pinterest'],
  ['pinterest_ads', 'pinterest'],
  ['pinterest.com', 'pinterest'],
  ['www.pinterest.co.uk', 'pinterest'],
  ['pin.it', 'pinterest'],
  ['android-app://com.pinterest/', 'pinterest'],
  // Social networks
  ['facebook', 'social'],
  ['fb', 'social'],
  ['FacebookAds', 'social'],
  ['l.facebook.com', 'social'],
  ['instagram', 'social'],
  ['ig', 'social'],
  ['reddit', 'social'],
  ['reddit.com', 'social'],
  ['x', 'social'],
  ['x.com', 'social'],
  ['t.co', 'social'],
  ['twitter', 'social'],
  ['youtube', 'social'],
  ['tiktok', 'social'],
  ['linkedin', 'social'],
  // Anything else is a referral
  ['newsletter', 'referral'],
  ['producthunt', 'referral'],
  ['theresanaiforthat', 'referral'],
  ['mailchimp', 'referral'],
  ['direct', 'referral'],
  ['bingo', 'referral'],
  ['poetry', 'referral'],
  ['xyz', 'referral'],
  ['12345', 'referral'],
  ['news.ycombinator.com', 'referral'],
  ['futurepedia.io', 'referral'],
  // Not a tag at all: empty, or this site or Gumroad
  ['', ''],
  ['   ', ''],
  ['coloringpagemaker', ''],
  ['ColoringPageMaker.app', ''],
  ['www.coloringpagemaker.app', ''],
  ['gumroad', ''],
  ['gumroad.com', ''],
  ['dorukctn.gumroad.com', '']
];

// Landing addresses (location.search).
const URLS = [
  ['?utm_source=chatgpt.com', 'ai-assistant'],
  ['?utm_source=chatgpt.com&utm_medium=referral', 'ai-assistant'],
  ['?foo=1&utm_source=pinterest&utm_medium=social', 'pinterest'],
  ['?UTM_SOURCE=Google', 'google'],
  ['?utm_source=chatgpt%2Ecom', 'ai-assistant'],
  ['?utm_source=Chat+GPT', 'ai-assistant'],
  ['?utm_source=%E0%A4%A', 'referral'],
  ['?ref=producthunt', 'referral'],
  ['?ref=chatgpt', 'ai-assistant'],
  ['?source=pinterest', 'pinterest'],
  ['?utm_source=pinterest&ref=reddit&source=google', 'pinterest'],
  ['?ref=reddit&source=google', 'social'],
  ['?source=google&ref=reddit', 'social'],
  ['?utm_source=&ref=bing', 'bing'],
  ['?utm_source=gumroad&ref=reddit', 'social'],
  ['?fbclid=IwAR0abc', 'social'],
  ['?utm_source=newsletter&fbclid=IwAR0abc', 'referral'],
  ['?xref=chatgpt', ''],
  ['?utm_source_platform=chatgpt', ''],
  ['?resource=google', ''],
  ['?utm_source=coloringpagemaker.app', ''],
  ['?', ''],
  ['', '']
];

// User agents of in-app browsers and real browsers, from public test corpora: ua-parser/uap-core
// (tests/test_ua.yaml), ua-parser/uap-cpp (benchmarks/useragents.txt) and shalanah/inapp-spy (src/tests). Strings
// built on IOS_WEBVIEW or ANDROID_WEBVIEW add an app's marker to a plain WebView, as PostHog's webview tests do
// (posthog-js, packages/core/src/utils/webview-app-utils.spec.ts).
const IOS_WEBVIEW = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148';
const ANDROID_WEBVIEW = 'Mozilla/5.0 (Linux; Android 13; Pixel 7 Build/TQ3A.230805.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.6099.230 Mobile Safari/537.36';
const UA = {
  pinterestIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 6_1_4 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Mobile/10B350 [Pinterest/iOS]',
  pinterestAndroid: 'Mozilla/5.0 (Linux; Android 9; SM-J737V Build/PPR1.180610.011; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/75.0.3770.101 Mobile Safari/537.36 [Pinterest/Android]',
  instagramIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22B83 Instagram 354.0.0.29.90 (iPhone12,8; iOS 18_1; en_US; en; scale=2.00; 750x1334; 654111336; IABMV/1)',
  googleIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/334.0.674067880 Mobile/15E148 Safari/604.1',
  safariIos: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'
};
const AGENTS = [
  // Pinterest's in-app browser
  [UA.pinterestIos, 'pinterest'],
  [UA.pinterestAndroid, 'pinterest'],
  [IOS_WEBVIEW + ' Pinterest for iOS/7.11 (iPhone7,2; 12.1.4)', 'pinterest'],
  [ANDROID_WEBVIEW + ' Pinterest for Android/9.0.4 (K83CA; 9)', 'pinterest'],
  // Instagram, and Threads, which calls itself Barcelona
  [UA.instagramIos, 'social'],
  ['Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A.240905.003; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.58 Mobile Safari/537.36 Instagram 355.1.0.44.103 Android (34/14; 420dpi; 1080x2205; Google/google; Pixel 8; shiba; shiba; en_US; 658190016)', 'social'],
  ['Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A.240905.003; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.58 Mobile Safari/537.36 Barcelona 355.0.0.39.109 Android (34/14; 420dpi; 1080x2205; Google/google; Pixel 8; shiba; shiba; en_US; 657318936)', 'social'],
  [IOS_WEBVIEW + ' Barcelona/300.0.0.17.109', 'social'],
  // Facebook and Messenger
  ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/482.2.0.68.110;FBBV/658316928;FBDV/iPhone12,8;FBMD/iPhone;FBSN/iOS;FBSV/18.1;FBSS/2;FBCR/;FBID/phone;FBLC/en_US;FBOP/80]', 'social'],
  ['Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A.240905.003; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.83 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/488.0.0.62.79;IABMV/1;]', 'social'],
  [IOS_WEBVIEW + ' [FBAN/MessengerForiOS;FBAV/132.0.0.41.90;]', 'social'],
  [IOS_WEBVIEW + ' [FBIOS;FBAV/440.0.0.35.117;]', 'social'],
  // TikTok (musical_ly, and trill in some countries)
  ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 BytedanceWebview/d8a21c6 musical_ly_33.2.1 JsSdk/2.0 NetType/WIFI Channel/App Store ByteLocale/en Region/US FalconTag/BDB55B46-0286-4504-847E-C8300CB9F79D', 'social'],
  ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_6_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari/604.1 musical_ly_41.9.0', 'social'],
  ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 BytedanceWebview/d8a21c6 trill_34.9.0 JsSdk/2.0 NetType/4G Channel/App Store ByteLocale/en Region/MY FalconTag/31CFA6E0-CAE5-4ECF-A13A-ADFCAFC2428F', 'social'],
  ['Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/UQ1A.240105.004; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/121.0.6167.143 Mobile Safari/537.36 musical_ly_2023303040 JsSdk/1.0 NetType/WIFI Channel/googleplay AppName/musical_ly app_version/33.3.4 ByteLocale/en ByteFullLocale/en Region/US AppId/1233 Spark/1.5.0.5-alpha.2 AppVersion/33.3.4 BytedanceWebview/d8a21c6', 'social'],
  // Snapchat
  ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Mobile/15E148 Snapchat/12.72.0.39 (like Safari/8617.2.4.10.8, panda)', 'social'],
  ['Mozilla/5.0 (iPhone; CPU iPhone OS 11_2_6 like Mac OS X) AppleWebKit/604.5.6 (KHTML, like Gecko) Snapchat/10.38.0.25 (iPhone8,1; iOS 11.2.6; gzip)', 'social'],
  // X (Twitter)
  ['Mozilla/5.0 (iPhone; CPU iPhone OS 11_2_1 like Mac OS X) AppleWebKit/604.4.7 (KHTML, like Gecko) Mobile/15C153 Twitter for iPhone/7.19', 'social'],
  ['Mozilla/5.0 (Linux; Android 9; Nokia 2.1 Build/PKQ1.181105.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/74.0.3729.157 Mobile Safari/537.36 TwitterAndroid', 'social'],
  // LinkedIn
  ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [LinkedInApp]/9.30.1753', 'social'],
  [ANDROID_WEBVIEW + ' LinkedInApp/2.295.106', 'social'],
  // Line
  ['Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Mobile/15A372 Safari Line/7.12.0', 'social'],
  ['Mozilla/5.0 (Linux; Android 6.0.1; D6653 Build/23.5.A.0.575; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/58.0.3029.83 Mobile Safari/537.36 Line/7.4.0/IAB', 'social'],
  // Reddit, a social network like reddit.com as a referrer
  ['Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A.240905.003; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.58 Mobile Safari/537.36 Reddit/Version 2024.41.0/Build 2102450/Android 14', 'social'],
  // The Google app, on iOS and Android
  [UA.googleIos, 'google'],
  ['Mozilla/5.0 (Linux; Android 9; Pixel 3 Build/PQ1A.181205.006; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/71.0.3578.99 Mobile Safari/537.36 GSA/8.65.5.21.arm64', 'google'],
  // Any other Android app's WebView
  [ANDROID_WEBVIEW, 'referral'],
  ['Mozilla/5.0 (Linux; Android 6.0.1; D6653 Build/23.5.A.0.575; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/58.0.3029.83 Mobile Safari/537.36 MicroMessenger/6.5.7.1041 NetType/WIFI Language/zh_TW', 'referral'],
  // Real browsers, desktop and mobile, stay direct
  ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15', ''],
  [UA.safariIos, ''],
  ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', ''],
  ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36', ''],
  ['Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36', ''],
  ['Mozilla/5.0 (iPhone; CPU iPhone OS 10_2_1 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) CriOS/58.0.3029.113 Mobile/14D27 Safari/602.1', ''],
  ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:141.0) Gecko/20100101 Firefox/141.0', ''],
  ['Mozilla/5.0 (Windows NT 6.1; WOW64; rv:53.0) Gecko/20100101 Firefox/53.0', ''],
  ['Mozilla/5.0 (Android 9; Mobile; rv:68.0) Gecko/68.0 Firefox/68.0', ''],
  ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/130.1  Mobile/15E148 Safari/605.1.15', ''],
  ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/75.0.3763.0 Safari/537.36 Edg/75.0.131.0', ''],
  ['Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) EdgiOS/128.0.2739.82 Version/18.0 Mobile/15E148 Safari/604.1', ''],
  ['Mozilla/5.0 (Linux; Android 5.1.1; SAMSUNG SM-G920F Build/LMY47X) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/3.2 Chrome/38.0.2125.102 Mobile Safari/537.36', ''],
  // Crawlers named after an app, and no user agent at all
  ['Mozilla/5.0 (compatible; Pinterestbot/1.0; +http://www.pinterest.com/bot.html)', ''],
  ['Twitterbot/1.0', ''],
  ['LinkedInBot/1.0', ''],
  ['facebookexternalhit/1.1', ''],
  ['', ''],
  [undefined, '']
];

test('classifies referrers into one kind of site', () => {
  for (const [referrer, want] of CASES) assert.equal(classify(referrer), want, JSON.stringify(referrer));
});

test('classifies landing tags: addresses like referrers, names by brand, anything else a referral', () => {
  for (const [value, want] of TAGS) assert.equal(classifyTag(value), want, JSON.stringify(value));
  assert.equal(classifyTag('cpm-git-branch.vercel.app', 'cpm-git-branch.vercel.app'), '', 'own host as a tag');
});

test('reads utm_source, then ref, then source, then fbclid from the landing address', () => {
  for (const [search, want] of URLS) assert.equal(fromUrl(search), want, JSON.stringify(search));
});

test('names the app of an in-app browser from its user agent; real browsers and crawlers name nothing', () => {
  for (const [ua, want] of AGENTS) assert.equal(fromAgent(ua), want, JSON.stringify(ua));
});

test('an in-app browser with no referrer counts for its app, stored like any other word', () => {
  const r = load({ ua: UA.pinterestAndroid });
  assert.equal(r.api.source, 'pinterest');
  assert.deepEqual(r.writes, [['sessionStorage', 'cpm_source', 'pinterest'], ['localStorage', 'cpm_first_source', 'pinterest']]);
  assert.equal(r.proLink(), LINKS.pinterest);
  for (const [ua, want] of [[UA.instagramIos, 'social'], [UA.googleIos, 'google'], [ANDROID_WEBVIEW, 'referral']]) {
    const v = load({ ua });
    assert.equal(v.api.source, want, ua);
    assert.deepEqual(v.writes, [['sessionStorage', 'cpm_source', want], ['localStorage', 'cpm_first_source', want]], ua);
    assert.equal(v.proLink(), LINKS[want], ua);
  }
  // A real browser with no referrer stays direct, and direct is never the browser's first word.
  const safari = load({ ua: UA.safariIos });
  assert.equal(safari.api.source, 'direct');
  assert.deepEqual(safari.writes, [['sessionStorage', 'cpm_source', 'direct']]);
  assert.equal(safari.proLink(), LINKS.direct);
});

test('the user agent decides only when there is no tag, no usable referrer and no first word', () => {
  assert.equal(load({ ua: UA.pinterestAndroid, search: '?utm_source=chatgpt.com' }).api.source, 'ai-assistant', 'a tag wins');
  assert.equal(load({ ua: UA.pinterestAndroid, referrer: 'https://www.google.com/' }).api.source, 'google', 'a referrer wins');
  assert.equal(load({ ua: UA.googleIos, search: '?fbclid=IwAR0abc' }).api.source, 'social', 'fbclid wins');
  // The browser's first word wins: this visit stays direct and the click keeps the first word.
  const returning = load({ ua: UA.pinterestAndroid, first: 'bing' });
  assert.equal(returning.api.source, 'direct');
  assert.deepEqual(returning.writes, [['sessionStorage', 'cpm_source', 'direct']]);
  assert.equal(returning.proLink(), LINKS.bing);
  // Later pages keep the tab's word from its first page, even "direct".
  for (const [stored, first] of [['direct', undefined], ['google', 'google']]) {
    const later = load({ ua: UA.instagramIos, stored, first, referrer: 'https://www.coloringpagemaker.app/' });
    assert.equal(later.api.source, stored, stored);
    assert.deepEqual(later.writes, [], stored);
  }
  // No usable referrer (this site) and no tab word, as when session storage is blocked: the app still counts.
  const blocked = load({ ua: UA.instagramIos, referrer: 'https://www.coloringpagemaker.app/blog', session: 'methods-throw' });
  assert.equal(blocked.api.source, 'social');
  assert.equal(blocked.proLink(), LINKS.social);
  // No navigator, or one that throws: nothing changes and nothing throws.
  assert.equal(load({ referrer: '' }).api.source, 'direct');
  assert.equal(load({ ua: UA_THROWS }).api.source, 'direct');
  assert.equal(load({ ua: UA_THROWS }).proLink(), LINKS.direct);
});

test('the page\'s own host is ignored, whatever it is', () => {
  assert.equal(classify('http://localhost:3000/blog', 'localhost'), '');
  assert.equal(classify('https://cpm-git-branch.vercel.app/', 'cpm-git-branch.vercel.app'), '');
  assert.equal(classify('http://127.0.0.1:3000/', 'localhost'), 'referral');
});

test('a landing tag decides before the referrer, and works with no referrer at all', () => {
  assert.equal(load({ search: '?utm_source=chatgpt.com', referrer: 'https://www.google.com/' }).api.source, 'ai-assistant');
  assert.equal(load({ search: '?utm_source=chatgpt.com', referrer: '' }).api.source, 'ai-assistant', 'mobile app, no referrer');
  assert.equal(load({ search: '?ref=newsletter', referrer: '' }).api.source, 'referral', 'unknown tag');
  assert.equal(load({ search: '?utm_source=gumroad', referrer: 'https://www.bing.com/' }).api.source, 'bing', 'ignored tag');
  assert.equal(load({ search: '?fbclid=IwAR0abc', referrer: '' }).api.source, 'social');
  assert.equal(load({ search: '?utm_source=pinterest', referrer: '' }).proLink(), LINKS.pinterest);
});

test('the first page of a visit stores only words: the tab\'s, and the browser\'s first other than direct', () => {
  const r = load({ referrer: 'https://www.pinterest.co.uk/pin/123456/?q=unicorn' });
  assert.equal(r.api.source, 'pinterest');
  assert.deepEqual(r.writes, [['sessionStorage', 'cpm_source', 'pinterest'], ['localStorage', 'cpm_first_source', 'pinterest']]);
  const direct = load({ referrer: '' });
  assert.equal(direct.api.source, 'direct');
  assert.deepEqual(direct.writes, [['sessionStorage', 'cpm_source', 'direct']], 'direct is never the browser\'s first word');
});

test('later pages keep the tab\'s first word', () => {
  for (const referrer of ['https://www.coloringpagemaker.app/', 'https://www.google.com/', '']) {
    const r = load({ referrer, search: '?utm_source=reddit', stored: 'pinterest', first: 'pinterest' });
    assert.equal(r.api.source, 'pinterest', referrer);
    assert.deepEqual(r.writes, [], referrer);
  }
});

test('the browser\'s first word other than direct is set once and never replaced', () => {
  const browser = new Map();
  const visits = [
    [{ referrer: '' }, 'direct', ''],
    [{ referrer: 'https://www.pinterest.com/' }, 'pinterest', 'pinterest'],
    [{ referrer: 'https://www.google.com/' }, 'google', 'pinterest'],
    [{ search: '?utm_source=chatgpt.com' }, 'ai-assistant', 'pinterest'],
    [{ referrer: '' }, 'direct', 'pinterest']
  ];
  for (const [opts, visitWord, firstWord] of visits) {
    const r = load({ ...opts, browser }); // a new tab each time: fresh sessionStorage, same localStorage
    assert.equal(r.api.source, visitWord, JSON.stringify(opts));
    assert.equal(browser.get('cpm_first_source') || '', firstWord, JSON.stringify(opts));
    assert.equal(r.proLink(), LINKS[firstWord || visitWord], 'Pro click for ' + JSON.stringify(opts));
  }
});

test('a Pro click uses the browser\'s first word, else this visit\'s word, else direct', () => {
  assert.equal(load({ first: 'pinterest', referrer: 'https://www.google.com/' }).proLink(), LINKS.pinterest);
  assert.equal(load({ first: 'pinterest', referrer: '' }).proLink(), LINKS.pinterest, 'a returning visitor who types the address');
  assert.equal(load({ referrer: 'https://www.google.com/' }).proLink(), LINKS.google);
  assert.equal(load({ referrer: '' }).proLink(), LINKS.direct);
  // This site or Gumroad as the referrer, with nothing stored: nothing is recorded, and the click counts as direct.
  for (const referrer of ['https://www.coloringpagemaker.app/blog', 'https://dorukctn.gumroad.com/l/uynqt', 'not a url']) {
    const r = load({ referrer });
    assert.equal(r.api.source, '', referrer);
    assert.deepEqual(r.writes, [], referrer);
    assert.equal(r.proLink(), LINKS.direct, referrer);
    assert.equal(load({ referrer, first: 'social' }).proLink(), LINKS.social, referrer + ' with a first word');
  }
});

test('the browser\'s first word is read at click time, so an older tab picks it up', () => {
  const browser = new Map();
  const older = load({ referrer: '', browser });
  assert.equal(older.proLink(), LINKS.direct);
  load({ referrer: 'https://l.facebook.com/', browser }); // another tab, later
  assert.equal(browser.get('cpm_first_source'), 'social');
  assert.equal(older.proLink(), LINKS.social);
});

test('stored values that are not words are replaced', () => {
  for (const junk of ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'https://www.google.com/', 'GOOGLE', '']) {
    const r = load({ referrer: 'https://www.bing.com/', stored: junk, first: junk });
    assert.equal(r.api.source, 'bing', junk);
    assert.deepEqual(r.writes, [['sessionStorage', 'cpm_source', 'bing'], ['localStorage', 'cpm_first_source', 'bing']], junk);
    assert.equal(r.proLink(), LINKS.bing, junk);
  }
  // "direct" is never the browser's first word, so a stored "direct" gives way to the next kind of site.
  const r = load({ referrer: 'https://www.bing.com/', first: 'direct' });
  assert.deepEqual(r.writes.filter(w => w[0] === 'localStorage'), [['localStorage', 'cpm_first_source', 'bing']]);
});

test('blocked storage: the page still uses what it can, and nothing throws', () => {
  for (const mode of ['methods-throw', 'access-throws', 'missing']) {
    const noLocal = load({ referrer: 'https://chatgpt.com/', local: mode });
    assert.equal(noLocal.api.source, 'ai-assistant', 'local ' + mode);
    assert.equal(noLocal.proLink(), LINKS['ai-assistant'], 'local ' + mode);
    assert.deepEqual(noLocal.writes, [['sessionStorage', 'cpm_source', 'ai-assistant']], 'local ' + mode);
    const noSession = load({ referrer: 'https://chatgpt.com/', session: mode, first: 'pinterest' });
    assert.equal(noSession.proLink(), LINKS.pinterest, 'session ' + mode);
    const neither = load({ search: '?utm_source=reddit', session: mode, local: mode });
    assert.equal(neither.api.source, 'social', 'both ' + mode);
    assert.equal(neither.proLink(), LINKS.social, 'both ' + mode);
    assert.equal(load({ referrer: '', session: mode, local: mode }).proLink(), LINKS.direct, 'both ' + mode + ', direct');
  }
});

test('a prerendered page stores its words only once the visitor opens it', () => {
  const r = load({ referrer: 'https://www.google.com/', prerendering: true });
  assert.equal(r.api.source, 'google');
  assert.deepEqual(r.writes, []);
  r.fire('prerenderingchange');
  assert.deepEqual(r.writes, [['sessionStorage', 'cpm_source', 'google'], ['localStorage', 'cpm_first_source', 'google']]);
});

test('only category words are ever stored, never an address or a tag value', () => {
  const browser = new Map();
  const tab = new Map();
  const all = [];
  const visits = [
    { referrer: 'https://www.pinterest.co.uk/pin/123456/?q=unicorn+coloring', search: '' },
    { referrer: 'https://www.google.com/search?q=private+words', search: '?utm_source=chatgpt.com&utm_term=secret' },
    { referrer: 'https://l.facebook.com/l.php?u=https%3A%2F%2Fx', search: '?fbclid=IwAR0abc&ref=my-newsletter-123' }
  ];
  for (const v of visits) all.push(...load({ ...v, browser }).writes, ...load({ ...v, tab, browser: new Map() }).writes);
  assert.ok(all.length >= 4);
  for (const [, key, value] of all) {
    assert.ok(['cpm_source', 'cpm_first_source'].includes(key), key);
    assert.ok(CATEGORIES.includes(value), value);
  }
});

test('each category sends the Pro click through its own Gumroad UTM link', () => {
  const seen = new Set();
  for (const [category, link] of Object.entries(LINKS)) {
    assert.match(link, /^https:\/\/gum\.co\/u\/[a-z0-9]{8}$/);
    seen.add(link);
    assert.equal(load({ referrer: 'https://www.coloringpagemaker.app/', stored: category }).proLink(), link, category);
  }
  assert.equal(seen.size, 8);
});

test('the Pro link is swapped as it is followed, by mouse, touch or keyboard', () => {
  for (const type of ['mousedown', 'touchstart', 'click']) {
    const r = load({ referrer: 'https://www.google.com/' });
    const a = anchor(PRO_URL);
    assert.equal(a.href, PRO_URL, 'unchanged before the visitor follows it');
    r.fire(type, inside(a));
    assert.equal(a.href, LINKS.google, type);
  }
  const r = load({ referrer: '' });
  const q = anchor(PRO_URL + '?wanted=true');
  r.fire('click', q);
  assert.equal(q.href, LINKS.direct);
  // Capture phase, so the link changes before any page handler runs; touchstart must not block scrolling.
  assert.equal(r.listeners.mousedown[0].opts, true);
  assert.equal(r.listeners.click[0].opts, true);
  assert.equal(r.listeners.touchstart[0].opts.capture, true);
  assert.equal(r.listeners.touchstart[0].opts.passive, true);
});

test('other links and odd click targets are left alone', () => {
  const r = load({ referrer: 'https://www.google.com/' });
  for (const href of ['https://www.coloringpagemaker.app/', 'https://dorukctn.gumroad.com/l/uynqtx', 'https://dorukctn.gumroad.com/l/other', 'https://gumroad.com/l/uynqt', 'http://dorukctn.gumroad.com/l/uynqt']) {
    const a = anchor(href);
    r.fire('click', a);
    r.fire('mousedown', inside(a));
    assert.equal(a.href, href);
  }
  for (const target of [null, undefined, {}, { closest: () => null }, { closest() { throw new Error('detached'); } }]) {
    assert.doesNotThrow(() => r.fire('click', target));
  }
});

test('every page carries the script in its head, and serves the plain product link', async () => {
  const app = await h.startApp({ KV_REST_API_URL: '', OPENAI_API_KEY: '' });
  try {
    const xml = await (await fetch(app.base + '/sitemap.xml')).text();
    const paths = [...xml.matchAll(/<loc>https:\/\/www\.coloringpagemaker\.app([^<]*)<\/loc>/g)].map(m => m[1] || '/');
    assert.ok(paths.length > 10);
    for (const p of [...paths, '/no-such-page']) {
      const r = await fetch(app.base + p, { redirect: 'manual' });
      const html = await r.text();
      assert.equal(r.status, p === '/no-such-page' ? 404 : 200, p);
      assert.equal(html.split(SCRIPT).length - 1, 1, p + ' has the script once, unchanged');
      assert.ok(html.indexOf(SCRIPT) < html.indexOf('</head>'), p + ' has it in the head');
      assert.doesNotMatch(html, /href="https:\/\/gum\.co/, p + ' serves no tracking link');
    }
    for (const p of ['/', '/unicorn-coloring-pages', '/mandala-coloring-pages']) {
      const html = await (await fetch(app.base + p)).text();
      assert.ok(html.includes('href="https://dorukctn.gumroad.com/l/uynqt"'), p + ' keeps the product link');
    }
    const privacy = await (await fetch(app.base + '/privacy')).text();
    assert.match(privacy, /what kind of site sent you/);
    assert.match(privacy, /the kind of app you opened the page in, for example Pinterest or Instagram, counts the same way/);
    assert.match(privacy, /local storage/);
    assert.match(privacy, /until you clear this site's data/);
    assert.match(privacy, /no cookies and no analytics/);
    const sitemap = xml.replace(/\s+/g, '');
    assert.ok(sitemap.includes('privacy</loc><lastmod>2026-10-28'), 'privacy lastmod');
  } finally {
    await app.stop();
  }
});
