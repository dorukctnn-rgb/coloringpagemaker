import { DurableObject } from 'cloudflare:workers';
import { LedgerCore } from './ledger-core.js';

const PURGE_EVERY_MS = 6 * 60 * 60 * 1000;

// One instance (named "main") holds the whole ledger. SQLite storage, which the Workers Free plan supports.
export class Ledger extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    const sql = ctx.storage.sql;
    this.core = new LedgerCore((q, ...p) => sql.exec(q, ...p).toArray(), fn => ctx.storage.transactionSync(fn));
    ctx.blockConcurrencyWhile(async () => {
      if (!(await ctx.storage.getAlarm())) await ctx.storage.setAlarm(Date.now() + PURGE_EVERY_MS);
    });
  }
  async alarm() {
    this.core.purge();
    await this.ctx.storage.setAlarm(Date.now() + PURGE_EVERY_MS);
  }
  takeFree(a) { return this.core.takeFree(a); }
  giveBackFree(a) { return this.core.giveBackFree(a); }
  takePro(a) { return this.core.takePro(a); }
  giveBackPro(a) { return this.core.giveBackPro(a); }
  takeAi(a) { return this.core.takeAi(a); }
  giveBackAi(a) { return this.core.giveBackAi(a); }
  reserveHd(a) { return this.core.reserveHd(a); }
  refundHd(a) { return this.core.refundHd(a); }
  spend(a) { return this.core.spend(a); }
  getToken(t) { return this.core.getToken(t); }
  putToken(r) { return this.core.putToken(r); }
  dropToken(t) { return this.core.dropToken(t); }
  revokeSale(s) { return this.core.revokeSale(s); }
  clearRevocation(s) { return this.core.clearRevocation(s); }
  saveSale(r) { return this.core.saveSale(r); }
  dropSale(e) { return this.core.dropSale(e); }
  legacyMiss(h) { return this.core.legacyMiss(h); }
  noteLegacyMiss(h) { return this.core.noteLegacyMiss(h); }
  takeLegacyLookup(a) { return this.core.takeLegacyLookup(a); }
}
