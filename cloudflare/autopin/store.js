// The Durable Object of the pin job: a thin class around PinService (service.js) on the object's SQLite storage.
// One instance, named "main", holds everything: pages and their images (BLOB rows of at most 2 MB each), the run log,
// the counters and the flags (core.js).
import { DurableObject } from 'cloudflare:workers';
import { PinCore } from './core.js';
import { PinService } from './service.js';

const PURGE_EVERY_MS = 6 * 60 * 60 * 1000;
const toBinding = v => (v instanceof Uint8Array ? v.buffer.slice(v.byteOffset, v.byteOffset + v.byteLength) : v);

export class PinStore extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    const sql = ctx.storage.sql;
    this.core = new PinCore((q, ...p) => sql.exec(q, ...p.map(toBinding)).toArray(), fn => ctx.storage.transactionSync(fn));
    this.svc = new PinService(this.core, env);
    ctx.blockConcurrencyWhile(async () => {
      if (!(await ctx.storage.getAlarm())) await ctx.storage.setAlarm(Date.now() + PURGE_EVERY_MS);
    });
  }
  async alarm() {
    this.core.purge();
    await this.ctx.storage.setAlarm(Date.now() + PURGE_EVERY_MS);
  }
  tick(a) { return this.svc.tick(a); }
  status() { return this.svc.status(); }
  slugs() { return this.svc.slugs(); }
  selfTest(png) { return this.svc.selfTest(png); }
  adminImage(slug, kind) { return this.svc.adminImage(slug, kind); }
  noteError(stage, msg) { return this.svc.noteError(stage, msg); }
  feedXml(a) { return this.svc.feedXml(a); }
  sitemapXml() { return this.svc.sitemapXml(); }
  hub() { return this.svc.hub(); }
  landing(slug) { return this.svc.landing(slug); }
  image(slug, kind) { return this.svc.image(slug, kind); }
  admin(cmd, args) { return this.svc.admin(cmd, args); }
}
