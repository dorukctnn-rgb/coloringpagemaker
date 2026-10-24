// The logic of the pin job's Durable Object (store.js), without the Durable Object class, so the tests can run it on
// node:sqlite. It draws the pin, checks the page, writes the PNG files, answers the page and feed requests and takes the
// admin commands. It runs in the object and not in the Worker: a Workers Free request or cron run may use 10 ms of CPU,
// a Durable Object call 30 seconds.
import { Buffer } from 'node:buffer';
import { runTick, pinsConfig, pinsStatus } from './tick.js';
import { releasedViews, feedItems, buildFeed, buildSitemap, seedBySlug, autoView, FEED_PATH } from './feed.js';
import { renderLanding, renderHub } from './page.js';
import { decodeGrayPng, judge, whiten, artSquare } from './art.js';
import { composePin, CARD } from './pin.js';
import { encodePngGray, resizeGray, xmpChunk } from './raster.js';
import { GROUPS } from './topics.js';
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
  slugs() { return this.core.listPages({ upTo: this.now() + 7 * 24 * 3600 * 1000, limit: 5000 }).map(p => p.slug); }
  // The heavy part of a tick (judge the page, draw the pin, write the three PNG files) on a page that is already there,
  // with no model call and nothing stored. The admin address runs it to show that the object can do the work inside its
  // CPU allowance. Returns the sizes of what it made.
  selfTest(png) {
    const img = decodeGrayPng(png);
    const verdict = judge(img.L, img.w, img.h, 'medium');
    const page = whiten(verdict.L);
    const meta = { title: 'Self test coloring page', description: 'Self test.' };
    const pin = composePin({ headline: 'Self test coloring page', sub: 'Clear lines and room to color, ages 6 to 12', art: artSquare(page, img.w, img.h, CARD.size), skin: 'orange', meta });
    const pagePng = encodePngGray(page, img.w, img.h, { depth: 8, level: 9, extra: [xmpChunk(meta)] });
    const thumb = encodePngGray(resizeGray(page, img.w, img.h, 400, 400), 400, 400, { depth: 4, level: 9, extra: [xmpChunk(meta)] });
    return { ok: true, judged: verdict.ok, reasons: verdict.reasons, pinBytes: pin.png.length, pageBytes: pagePng.length, thumbBytes: thumb.length };
  }
  // A failure the Worker saw while calling the object (the object itself may have been cut off).
  noteError(stage, msg) { this.core.logError(stage, msg, null); return true; }
  status() { return pinsStatus({ core: this.core, cfg: this.cfg(), now: this.now() }); }

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
  allViews(now = this.now()) {
    return releasedViews({ now, autoPages: this.core.listPages({ upTo: now, limit: 500 }), seedsOn: true });
  }
  sitemapXml() { const now = this.now(); return buildSitemap({ views: this.allViews(now), now }); }
  hub() { const now = this.now(); return renderHub(this.allViews(now), now); }
  // The landing page of one coloring page, or null.
  landing(slug) {
    const now = this.now();
    let v = seedBySlug(slug);
    if (v && v.release > now + 7 * 24 * 3600 * 1000) v = null;
    if (!v) { const p = this.core.getPage(slug); if (p && !p.hidden && p.release <= now) v = autoView(p); }
    if (!v) return null;
    const same = this.allViews(now).filter(x => x.group === v.group);
    return renderLanding(v, neighbors(same, v.slug, 6));
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
