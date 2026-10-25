// The logic of the pin job's Durable Object (store.js), without the Durable Object class, so the tests can run it on
// node:sqlite. It draws the pin, checks the page, writes the PNG files, answers the page and feed requests and takes the
// admin commands. It runs in the object and not in the Worker: a Workers Free request or cron run may use 10 ms of CPU,
// a Durable Object call 30 seconds.
import { Buffer } from 'node:buffer';
import { runTick, pinsConfig, pinsStatus } from './tick.js';
import { releasedViews, feedItems, buildFeed, buildSitemap, seedBySlug, seedViews, autoView, FEED_PATH } from './feed.js';
import { renderLanding, renderHub } from './page.js';
import { decodeGrayPng, judge, whiten, artSquare } from './art.js';
import { composePin, CARD } from './pin.js';
import { encodePngGray, resizeGray, xmpChunk } from './raster.js';
import { GROUPS } from './topics.js';
import { isoDay } from './core.js';
import { FLUX_MODEL } from '../flux.js';

// The bindings of the Worker as the tick wants them (tick.js has no idea what a Worker is).
export function makeDeps(env, cfg) {
  const ledger = () => env.LEDGER.get(env.LEDGER.idFromName('main'));
  return {
    now: () => Date.now(),
    async flux(prompt) {
      const out = await env.AI.run(FLUX_MODEL, { prompt, steps: cfg.fluxSteps });
      const b64 = out && out.image;
      if (!b64) throw new Error('the model returned no image');
      return new Uint8Array(Buffer.from(b64, 'base64'));
    },
    async toGray(jpeg) {
      const res = await env.IMAGES.input(new Blob([jpeg]).stream()).transform({ saturation: 0 }).output({ format: 'image/png' });
      return new Uint8Array(await res.response().arrayBuffer());
    },
    ledger: {
      async aiToday(day) { return Number((await ledger().spend({ month: day.slice(0, 7), day })).aiToday || 0); },
      // All of the Ledger's spend counters for the status page: images today, free pages today, OpenAI spend.
      counters: day => ledger().spend({ month: day.slice(0, 7), day }),
      takeAi: day => ledger().takeAi({ day, aiDaily: cfg.aiDaily }),
      giveBackAi: day => ledger().giveBackAi({ day })
    }
  };
}

// The pages next to a page in the group's list (newest first), up to n of them, so every page is linked from other
// pages and a crawler can walk the whole list. A page at the end of the list takes its neighbors from the other side.
export function neighbors(list, slug, n = 6) {
  const i = list.findIndex(x => x.slug === slug);
  if (i < 0) return list.slice(0, n);
  const out = [];
  for (let d = 1; out.length < n && (i - d >= 0 || i + d < list.length); d++) {
    if (i - d >= 0) out.push(list[i - d]);
    if (out.length < n && i + d < list.length) out.push(list[i + d]);
  }
  return out;
}

export class PinService {
  // depsFactory: the tests hand in stubs for the model and the image conversion.
  constructor(core, env, depsFactory = makeDeps, now = () => Date.now()) { this.core = core; this.env = env; this.depsFactory = depsFactory; this.now = now; }

  cfg() { return pinsConfig(this.env); }
  seedsOn() { return this.cfg().seeds && this.core.getMeta('seeds_off') !== '1'; }

  // --- the job ---
  async tick({ source = 'cron', scheduledTime = null } = {}) {
    const cfg = this.cfg();
    return runTick({ core: this.core, cfg, deps: this.depsFactory(this.env, cfg), source, scheduledTime });
  }
  // Every slug of a page made by the job that is not hidden (the Worker keeps the list to refuse made-up addresses).
  slugs() { return this.core.listLight({ upTo: this.now() + 7 * 24 * 3600 * 1000, limit: 20000 }).map(p => p.slug); }
  // The heavy part of a tick (judge the page, draw the pin, write the three PNG files) on a page that is already there,
  // with no model call and nothing stored. The admin address runs it to show that the object can do the work inside its
  // CPU allowance. Returns the sizes of what it made.
  async selfTest(png) {
    // The Images binding does the same gray conversion as for a model's picture (a PNG goes in instead of the JPEG).
    const cfg = this.cfg();
    const gray = await this.depsFactory(this.env, cfg).toGray(png);
    const img = decodeGrayPng(gray);
    const verdict = judge(img.L, img.w, img.h, 'medium');
    const page = whiten(verdict.L);
    const meta = { title: 'Self test coloring page', description: 'Self test.' };
    const pin = composePin({ headline: 'Self test coloring page', sub: 'Clear lines and room to color, ages 6 to 12', art: artSquare(page, img.w, img.h, CARD.size), skin: 'orange', meta });
    const pagePng = encodePngGray(page, img.w, img.h, { depth: 8, level: 9, extra: [xmpChunk(meta)] });
    const thumb = encodePngGray(resizeGray(page, img.w, img.h, 400, 400), 400, 400, { depth: 8, level: 9, extra: [xmpChunk(meta)] });
    // The files go into the database and come back, inside a transaction that is rolled back: nothing is kept.
    let stored = false;
    try {
      this.core.txn(() => {
        this.core.exec('INSERT INTO blobs (slug, kind, bytes) VALUES (?, ?, ?)', 'selftest-probe', 'pin', pin.png);
        this.core.exec('INSERT INTO blobs (slug, kind, bytes) VALUES (?, ?, ?)', 'selftest-probe', 'thumb', thumb);
        const back = this.core.getBlob('selftest-probe', 'pin');
        stored = !!back && back.length === pin.png.length && back.every((x, i) => x === pin.png[i]) && this.core.getBlob('selftest-probe', 'thumb').length === thumb.length;
        throw new Error('selftest rollback');
      });
    } catch (e) { if (e.message !== 'selftest rollback') throw e; }
    return { ok: true, imagesBinding: gray.length, judged: verdict.ok, reasons: verdict.reasons, pinBytes: pin.png.length, pageBytes: pagePng.length, thumbBytes: thumb.length, storedAndRead: stored, leftBehind: this.core.getBlob('selftest-probe', 'pin') !== null };
  }
  // An image of a page for the admin (also before its release): { bytes } or null.
  adminImage(slug, kind) {
    if (!['pin', 'page', 'thumb'].includes(kind) || !this.core.hasPage(slug)) return null;
    const bytes = this.core.getBlob(slug, kind);
    return bytes ? { bytes, kind } : null;
  }
  // A failure the Worker saw while calling the object (the object itself may have been cut off).
  noteError(stage, msg) { this.core.logError(stage, msg, null); return true; }
  // The job's own counters and, from the Ledger, the site's (a Ledger that cannot be reached is reported, not fatal).
  async status() {
    const cfg = this.cfg(), now = this.now();
    let ledger = null;
    try {
      const l = this.depsFactory(this.env, cfg).ledger;
      if (l && l.counters) ledger = await l.counters(isoDay(now));
    } catch (e) { ledger = { error: String(e && e.message || e).slice(0, 160) }; }
    return pinsStatus({ core: this.core, cfg, now, ledger });
  }

  // --- what the site serves ---
  feedXml({ group = null, ua = '' } = {}) {
    const cfg = this.cfg(), now = this.now();
    if (group && !GROUPS[group]) group = null;
    const frozen = this.core.getMeta('frozen_at');
    const views = releasedViews({
      now, autoPages: this.core.listPages({ upTo: now, limit: 300 }), seedsOn: this.seedsOn(), frozenAt: frozen ? Number(frozen) : null
    });
    const items = feedItems({ views, now: frozen ? Math.min(now, Number(frozen)) : now, days: cfg.feedDays, max: cfg.feedMax, group });
    this.core.logFetch(FEED_PATH + (group ? '?group=' + group : ''), ua, items.length);
    return buildFeed({ items, now, group });
  }
  // The released pages (seeds and pages of the job), newest first; one group when given.
  allViews(now = this.now(), group = null) {
    const views = releasedViews({ now, autoPages: this.core.listPages({ upTo: now, limit: 500, group }), seedsOn: true });
    return group ? views.filter(v => v.group === group) : views;
  }
  // Every released page, from the light list (no text columns), so the sitemap never drops an old page.
  sitemapXml() {
    const now = this.now();
    const views = [...this.core.listLight({ upTo: now }), ...seedViews().filter(v => v.release <= now).map(v => ({ slug: v.slug, release: v.release }))]
      .sort((a, b) => b.release - a.release || (a.slug < b.slug ? -1 : 1));
    return buildSitemap({ views, now });
  }
  hub() { const now = this.now(); return renderHub(this.allViews(now), now); }
  // The landing page of one coloring page, or null.
  landing(slug) {
    const now = this.now();
    let v = seedBySlug(slug);
    if (!v) { const p = this.core.getPage(slug); if (p && !p.hidden && p.release <= now) v = autoView(p); }
    if (!v) return null;
    return renderLanding(v, neighbors(this.allViews(now, v.group), v.slug, 6));
  }
  // { bytes: Uint8Array, kind } for a stored image of a page made by the job, or null.
  image(slug, kind) {
    if (!['pin', 'page', 'thumb'].includes(kind)) return null;
    const p = this.core.getPage(slug);
    if (!p || p.hidden || p.release > this.now()) return null;
    const bytes = this.core.getBlob(slug, kind);
    return bytes ? { bytes, kind } : null;
  }

  // --- admin (the Worker has checked the key) ---
  admin(cmd, args = {}) {
    const now = this.now();
    switch (cmd) {
      case 'pause': this.core.setMeta('paused', '1'); this.core.setMeta('frozen_at', String(now)); return { ok: true, paused: true, feedFrozenAt: now };
      case 'resume': this.core.delMeta('paused'); this.core.delMeta('frozen_at'); this.core.delMeta('ai_exhausted'); return { ok: true, paused: false };
      case 'seeds':
        if (args.on) this.core.delMeta('seeds_off'); else this.core.setMeta('seeds_off', '1');
        return { ok: true, seedsInFeed: this.seedsOn() };
      case 'hide': return { ok: this.core.setHidden(String(args.slug || ''), !!args.on), slug: args.slug, hidden: !!args.on };
      default: return { ok: false, error: 'unknown command' };
    }
  }
}
