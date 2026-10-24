// One run of the daily job: pick the next subject of the season, draw it with the free image model, check the page,
// make the pin and the printable files, store them and open the page in the feed.
//
// Free-tier guards, all checked before anything is drawn:
//   - the kill switches (AUTOPIN_ENABLED, the "paused" flag set through the admin address),
//   - a cap of pages a day (AUTOPIN_DAILY_PAGES) and an even pace through the day's cron slots,
//   - a cap of model calls a day (AUTOPIN_MAX_FLUX_PER_DAY, 58 of the 10,000 free daily neurons each),
//   - the site's own daily image budget (the Ledger's ai counter, AI_DAILY_LIMIT), with a reserve left for visitors,
//   - a cap of Images-binding conversions a month and a cap on stored bytes.
// A cron slot is handled once (core.beginRun), so a repeated or overlapping trigger draws nothing twice.
import { decodeGrayPng, judge, whiten, artSquare } from './art.js';
import { composePin, skinFor, CARD } from './pin.js';
import { encodePngGray, resizeGray, xmpChunk } from './raster.js';
import { pickSubject, describe } from './topics.js';
import { SEEDS } from './seeds.js';
import { fluxPrompt } from '../flux.js';
import { isoDay } from './core.js';

// 1024 x 1024 at 4 steps: 4 tiles x 4.8 + 4 steps x 9.6 neurons (Workers AI pricing for FLUX.1 schnell).
export const FLUX_NEURONS = 58;
export const FREE_NEURONS_PER_DAY = 10000;
const HOUR = 3600 * 1000;

const num = (v, d) => (v === undefined || v === null || v === '' || !Number.isFinite(Number(v)) ? d : Number(v));
const off = v => ['0', 'false', 'off', 'no'].includes(String(v).trim().toLowerCase());
export function pinsConfig(env) {
  return {
    enabled: env.AUTOPIN_ENABLED === undefined ? true : !off(env.AUTOPIN_ENABLED),
    seeds: env.AUTOPIN_SEEDS === undefined ? true : !off(env.AUTOPIN_SEEDS),
    dailyPages: num(env.AUTOPIN_DAILY_PAGES, 4),
    maxFluxPerDay: num(env.AUTOPIN_MAX_FLUX_PER_DAY, 12),
    maxAttempts: num(env.AUTOPIN_MAX_ATTEMPTS, 3),
    slotHours: num(env.AUTOPIN_SLOT_HOURS, 3),
    imagesMonthlyCap: num(env.AUTOPIN_IMAGES_MONTHLY_CAP, 600),
    storageCapBytes: num(env.AUTOPIN_STORAGE_CAP_MB, 1500) * 1024 * 1024,
    aiDaily: num(env.AI_DAILY_LIMIT, 160),
    siteReserve: num(env.AUTOPIN_SITE_RESERVE, 60),
    fluxSteps: num(env.FLUX_STEPS, 4),
    feedDays: num(env.AUTOPIN_FEED_DAYS, 21),
    feedMax: num(env.AUTOPIN_FEED_MAX, 60)
  };
}

// "2026-10-24T12" for the cron slot that holds the time, and the slot's position in the day.
export function slotOf(ms, slotHours) {
  const size = slotHours * HOUR;
  const start = Math.floor(ms / size) * size;
  const dayStart = Math.floor(ms / (24 * HOUR)) * 24 * HOUR;
  return { key: new Date(start).toISOString().slice(0, 13), index: Math.round((start - dayStart) / size), perDay: Math.round(24 / slotHours) };
}

const VARIATIONS = ['', ' Centered, one clear subject.', ' Simple clean composition, nothing cut off at the edges.'];
const NO_FREE_NEURONS = /4006|daily free allocation|used up/i;

// deps: { now(), flux(prompt) -> Promise<Uint8Array> (JPEG), toGray(jpeg) -> Promise<Uint8Array> (gray PNG),
//         ledger: { aiToday(day), takeAi(day), giveBackAi(day) } }
export async function runTick({ core, cfg, deps, source = 'cron', scheduledTime = null }) {
  const now = deps.now();
  const day = isoDay(now), month = day.slice(0, 7);
  const t = source === 'cron' && scheduledTime ? scheduledTime : now;
  const slot = source === 'cron' ? slotOf(t, cfg.slotHours) : { key: 'manual-' + now, index: null, perDay: null };
  const result = (status, reason, extra = {}) => ({ status, reason, slot: slot.key, day, ...extra });

  if (!cfg.enabled) return result('skipped', 'disabled');
  if (core.getMeta('paused') === '1') return result('skipped', 'paused');
  if (core.getMeta('ai_exhausted') === day) return result('skipped', 'ai_exhausted');

  const begin = core.beginRun(slot.key, source);
  if (!begin.ok) return result('skipped', begin.reason);
  const finish = (status, reason, extra) => { core.endRun(slot.key, status, reason + (extra && extra.slug ? ' ' + extra.slug : '')); return result(status, reason, extra); };

  try {
    const made = core.count('pages:' + day);
    if (made >= cfg.dailyPages) return finish('skipped', 'daily_cap');
    if (slot.index !== null) {
      const due = Math.ceil(cfg.dailyPages * (slot.index + 1) / slot.perDay);
      if (made >= due) return finish('skipped', 'not_due');
    }
    if (core.storageBytes().bytes >= cfg.storageCapBytes) return finish('skipped', 'storage_cap');
    if (core.count('flux:' + day) >= cfg.maxFluxPerDay) return finish('skipped', 'flux_cap');
    if (core.count('images:' + month) >= cfg.imagesMonthlyCap) return finish('skipped', 'images_cap');

    const used = core.usedSlugs();
    for (const s of SEEDS) used.add(s.slug);
    const pick = pickSubject({ date: new Date(now), used, counts: core.themeCounts() });
    if (!pick) { core.logError('topics', 'no subject left to draw', slot.key); return finish('failed', 'no_subject'); }
    const subject = pick.subject;
    const text = describe(subject);

    const aiToday = await deps.ledger.aiToday(day);
    if (aiToday >= cfg.aiDaily - cfg.siteReserve) return finish('skipped', 'site_reserve');

    const rejected = [];
    let lastErr = '';
    for (let attempt = 1; attempt <= cfg.maxAttempts; attempt++) {
      if (core.count('flux:' + day) >= cfg.maxFluxPerDay) { lastErr = 'flux_cap'; break; }
      if (core.count('images:' + month) >= cfg.imagesMonthlyCap) { lastErr = 'images_cap'; break; }
      const grant = await deps.ledger.takeAi(day);
      if (!grant.allowed) { lastErr = 'site_ai_cap'; break; }
      core.add('flux:' + day, 1);
      let jpeg;
      try {
        jpeg = await deps.flux(fluxPrompt(text.typedPrompt + VARIATIONS[(attempt - 1) % VARIATIONS.length], subject.level));
        if (!jpeg || !jpeg.length) throw new Error('the model returned no image');
      } catch (e) {
        // A call the model refused or that failed is not counted against the visitors' budget; the neurons of a
        // refused call are not billed, so the day's own call counter gives it back as well.
        await deps.ledger.giveBackAi(day);
        core.add('flux:' + day, -1);
        const msg = String(e && e.message || e);
        core.logError('flux', msg, slot.key);
        lastErr = 'flux: ' + msg.slice(0, 120);
        if (NO_FREE_NEURONS.test(msg)) { core.setMeta('ai_exhausted', day); break; }
        continue;
      }
      let png;
      try {
        core.addMonth('images:' + month, 1);
        png = await deps.toGray(jpeg);
      } catch (e) {
        core.logError('images', String(e && e.message || e), slot.key);
        lastErr = 'images: ' + String(e && e.message || e).slice(0, 120);
        continue;
      }
      let img, verdict;
      try {
        img = decodeGrayPng(png);
        verdict = judge(img.L, img.w, img.h, subject.level);
      } catch (e) {
        core.logError('decode', String(e && e.message || e), slot.key);
        lastErr = 'decode: ' + String(e && e.message || e).slice(0, 120);
        continue;
      }
      if (!verdict.ok) {
        core.add('rejected:' + day, 1);
        rejected.push(verdict.reasons.join('+'));
        lastErr = 'rejected: ' + verdict.reasons.join('+');
        continue;
      }

      // The page passed: make the three files and store them.
      const page = whiten(verdict.L);
      const meta = { title: text.headline, description: text.alt };
      const skin = skinFor(subject.theme, subject.slug);
      const art = artSquare(page, img.w, img.h, CARD.size);
      const pin = composePin({ headline: text.headline, sub: text.sub, art, skin, meta });
      const pagePng = encodePngGray(page, img.w, img.h, { depth: 8, level: 9, extra: [xmpChunk(meta)] });
      const thumb = encodePngGray(resizeGray(page, img.w, img.h, 400, 400), 400, 400, { depth: 4, level: 9, extra: [xmpChunk(meta)] });
      const m = verdict.metrics;
      const stored = core.insertPage({
        slug: subject.slug, theme: subject.theme, grp: text.group, level: subject.level, headline: text.headline, title: text.pinTitle,
        description: text.pinDescription, alt: text.alt, intro: text.intro, metaDescription: text.metaDescription, prompt: subject.draw,
        site: subject.site, skin, created: now, release: now, slot: slot.key, attempts: attempt,
        metrics: { ink: +m.ink.toFixed(4), thick: +m.thick.toFixed(4), gray: +m.gray.toFixed(4), patch: m.patch, headline: pin.layout.headlineSize }
      }, { pin: pin.png, page: pagePng, thumb });
      if (!stored) { core.logError('store', 'slug already exists: ' + subject.slug, slot.key); return finish('failed', 'duplicate', { slug: subject.slug }); }
      core.add('pages:' + day, 1);
      return finish('done', 'ok', { slug: subject.slug, theme: subject.theme, level: subject.level, attempts: attempt, rejected, pinBytes: pin.png.length });
    }
    return finish('failed', lastErr || 'no_page', { slug: subject.slug, rejected });
  } catch (e) {
    const msg = String(e && (e.stack || e.message) || e);
    core.logError('tick', msg.slice(0, 280), slot.key);
    core.endRun(slot.key, 'failed', msg.slice(0, 200));
    return result('failed', 'error: ' + String(e && e.message || e).slice(0, 160));
  }
}

// What the admin address reports (no secrets): flags, today's counters against the free allowances, the last runs
// and errors, and what the job would draw next.
export function pinsStatus({ core, cfg, now }) {
  const day = isoDay(now), month = day.slice(0, 7);
  const used = core.usedSlugs();
  for (const s of SEEDS) used.add(s.slug);
  const next = pickSubject({ date: new Date(now), used, counts: core.themeCounts() });
  const flux = core.count('flux:' + day);
  const store = core.storageBytes();
  return {
    now: new Date(now).toISOString(),
    flags: { enabled: cfg.enabled, paused: core.getMeta('paused') === '1', seedsInFeed: cfg.seeds && core.getMeta('seeds_off') !== '1', feedFrozenAt: core.getMeta('frozen_at'), aiExhaustedDay: core.getMeta('ai_exhausted') },
    limits: { dailyPages: cfg.dailyPages, maxFluxPerDay: cfg.maxFluxPerDay, slotHours: cfg.slotHours, siteReserve: cfg.siteReserve, aiDaily: cfg.aiDaily, imagesMonthlyCap: cfg.imagesMonthlyCap },
    today: {
      pagesMade: core.count('pages:' + day), modelCalls: flux, rejected: core.count('rejected:' + day),
      neuronsEstimate: flux * FLUX_NEURONS, freeNeuronsPerDay: FREE_NEURONS_PER_DAY,
      freeShareUsedPct: +((flux * FLUX_NEURONS) / FREE_NEURONS_PER_DAY * 100).toFixed(1)
    },
    month: { imageConversions: core.count('images:' + month) },
    storage: { pages: store.pages, megabytes: +(store.bytes / 1048576).toFixed(2), freeCapGb: 5 },
    next: next ? { slug: next.subject.slug, theme: next.subject.theme, level: next.subject.level, phase: next.phase } : null,
    runs: core.recentRuns(10),
    errors: core.recentErrors(10),
    feedFetches: core.recentFetches(8)
  };
}
