// The site's small database on Cloudflare: Pro tokens, refund marks, sale records, daily counters and the
// OpenAI spend cap. It runs inside one Durable Object (SQLite) in production and on node:sqlite in the tests.
//
// Every "check, then count" step runs in a single transaction. A Durable Object handles one request at a
// time, so two visitors can never both take the last free page or the last cent of the HD budget.
//
// exec(sql, ...params) returns an array of row objects; txn(fn) runs fn atomically and returns its result.

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const COUNTER_TTL_DAY = 2 * DAY;      // daily counters carry the date in their key; kept a little past midnight
const COUNTER_TTL_MONTH = 40 * DAY;   // monthly counters carry the month in their key
export const TOKEN_TTL_MS = 400 * DAY; // same lifetime as the tokens on the old server

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS tokens (
     token TEXT PRIMARY KEY, sale_id TEXT NOT NULL, email TEXT, sale_created TEXT,
     created TEXT NOT NULL, expires INTEGER NOT NULL, legacy INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS revoked (sale_id TEXT PRIMARY KEY, at TEXT NOT NULL, expires INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS sales (email TEXT PRIMARY KEY, sale_id TEXT, product_id TEXT, granted_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS counters (k TEXT PRIMARY KEY, n INTEGER NOT NULL, expires INTEGER NOT NULL)`
];

export class LedgerCore {
  constructor(exec, txn, now = () => Date.now()) {
    this.exec = exec;
    this.txn = txn;
    this.now = now;
    for (const s of SCHEMA) exec(s);
  }

  // --- counters ---
  count(k) {
    const r = this.exec('SELECT n, expires FROM counters WHERE k = ?', k)[0];
    return r && r.expires > this.now() ? Number(r.n) : 0;
  }
  add(k, by, ttl) {
    const n = Math.max(0, this.count(k) + by);
    this.exec('INSERT INTO counters (k, n, expires) VALUES (?, ?, ?) ON CONFLICT(k) DO UPDATE SET n = excluded.n, expires = excluded.expires',
      k, n, this.now() + ttl);
    return n;
  }

  // Free page: at most perIp per address hash a day, globalFree for everyone a day, and the shared
  // Workers AI ceiling (aiDaily images a day keeps the account inside its free daily allocation).
  takeFree({ ipKey, day, perIp, globalFree, aiDaily }) {
    return this.txn(() => {
      const used = this.count(`free:ip:${day}:${ipKey}`);
      if (used >= perIp) return { allowed: false, reason: 'free_daily_cap', remaining: 0 };
      if (this.count(`free:all:${day}`) >= globalFree) return { allowed: false, reason: 'free_global_cap', remaining: 0 };
      if (this.count(`ai:${day}`) >= aiDaily) return { allowed: false, reason: 'free_global_cap', remaining: 0 };
      this.add(`free:ip:${day}:${ipKey}`, 1, COUNTER_TTL_DAY);
      this.add(`free:all:${day}`, 1, COUNTER_TTL_DAY);
      this.add(`ai:${day}`, 1, COUNTER_TTL_DAY);
      return { allowed: true, remaining: perIp - used - 1 };
    });
  }
  // A page that failed to generate is not counted.
  giveBackFree({ ipKey, day }) {
    return this.txn(() => {
      this.add(`free:ip:${day}:${ipKey}`, -1, COUNTER_TTL_DAY);
      this.add(`free:all:${day}`, -1, COUNTER_TTL_DAY);
      this.add(`ai:${day}`, -1, COUNTER_TTL_DAY);
      return true;
    });
  }

  // Pro fair-use cap: perDay pages a day per Gumroad sale, HD and standard together.
  takePro({ saleKey, day, perDay }) {
    return this.txn(() => {
      const used = this.count(`pro:${day}:${saleKey}`);
      if (used >= perDay) return { allowed: false, reason: 'pro_daily_cap' };
      this.add(`pro:${day}:${saleKey}`, 1, COUNTER_TTL_DAY);
      return { allowed: true, used: used + 1 };
    });
  }
  giveBackPro({ saleKey, day }) {
    return this.txn(() => { this.add(`pro:${day}:${saleKey}`, -1, COUNTER_TTL_DAY); return true; });
  }

  // One Workers AI image (a Pro standard page).
  takeAi({ day, aiDaily }) {
    return this.txn(() => {
      if (this.count(`ai:${day}`) >= aiDaily) return { allowed: false, reason: 'ai_daily_cap' };
      this.add(`ai:${day}`, 1, COUNTER_TTL_DAY);
      return { allowed: true };
    });
  }
  giveBackAi({ day }) {
    return this.txn(() => { this.add(`ai:${day}`, -1, COUNTER_TTL_DAY); return true; });
  }

  // The hard OpenAI spend cap. costMicros (millionths of a dollar) is reserved before the call, against the
  // month's cap and the day's cap; a sale on the new terms also needs HD pages left in its monthly allowance.
  // Nothing is reserved unless every check passes.
  reserveHd({ saleKey, legacy, month, day, costMicros, monthlyCapMicros, dailyCapMicros, allowance }) {
    return this.txn(() => {
      const usedHd = this.count(`hd:n:${month}:${saleKey}`);
      if (!legacy && usedHd >= allowance) return { ok: false, reason: 'hd_allowance' };
      if (this.count(`hd:usd:m:${month}`) + costMicros > monthlyCapMicros) return { ok: false, reason: 'hd_monthly_cap' };
      if (this.count(`hd:usd:d:${day}`) + costMicros > dailyCapMicros) return { ok: false, reason: 'hd_daily_cap' };
      this.add(`hd:usd:m:${month}`, costMicros, COUNTER_TTL_MONTH);
      this.add(`hd:usd:d:${day}`, costMicros, COUNTER_TTL_DAY);
      this.add(`hd:n:${month}:${saleKey}`, 1, COUNTER_TTL_MONTH);
      return { ok: true, used: usedHd + 1 };
    });
  }
  // Only for a call that OpenAI refused before drawing anything.
  refundHd({ saleKey, month, day, costMicros }) {
    return this.txn(() => {
      this.add(`hd:usd:m:${month}`, -costMicros, COUNTER_TTL_MONTH);
      this.add(`hd:usd:d:${day}`, -costMicros, COUNTER_TTL_DAY);
      this.add(`hd:n:${month}:${saleKey}`, -1, COUNTER_TTL_MONTH);
      return true;
    });
  }
  spend({ month, day }) {
    return { monthMicros: this.count(`hd:usd:m:${month}`), dayMicros: this.count(`hd:usd:d:${day}`), aiToday: this.count(`ai:${day}`) };
  }

  // --- Pro tokens ---
  getToken(token) {
    const r = this.exec('SELECT sale_id, email, sale_created, legacy, expires FROM tokens WHERE token = ?', token)[0];
    if (!r || r.expires <= this.now()) return null;
    const rev = this.exec('SELECT expires FROM revoked WHERE sale_id = ?', r.sale_id)[0];
    if (rev && rev.expires > this.now()) return null;
    return { sale_id: r.sale_id, email: r.email || '', sale_created: r.sale_created || '', legacy: !!r.legacy };
  }
  putToken({ token, sale_id, email, sale_created, legacy }) {
    return this.txn(() => {
      this.exec(`INSERT INTO tokens (token, sale_id, email, sale_created, created, expires, legacy) VALUES (?, ?, ?, ?, ?, ?, ?)
                 ON CONFLICT(token) DO UPDATE SET sale_id = excluded.sale_id, email = excluded.email, sale_created = excluded.sale_created,
                 created = excluded.created, expires = excluded.expires, legacy = excluded.legacy`,
        token, String(sale_id), email || '', sale_created || '', new Date(this.now()).toISOString(), this.now() + TOKEN_TTL_MS, legacy ? 1 : 0);
      // The sale has just been confirmed as not refunded, so an older refund mark no longer applies.
      this.exec('DELETE FROM revoked WHERE sale_id = ?', String(sale_id));
      return true;
    });
  }
  dropToken(token) { this.exec('DELETE FROM tokens WHERE token = ?', token); return true; }
  revokeSale(saleId) {
    this.exec('INSERT INTO revoked (sale_id, at, expires) VALUES (?, ?, ?) ON CONFLICT(sale_id) DO UPDATE SET at = excluded.at, expires = excluded.expires',
      String(saleId), new Date(this.now()).toISOString(), this.now() + TOKEN_TTL_MS);
    return true;
  }
  clearRevocation(saleId) { this.exec('DELETE FROM revoked WHERE sale_id = ?', String(saleId)); return true; }

  // --- sale records from the Gumroad ping (never used to turn Pro on) ---
  saveSale({ email, sale_id, product_id }) {
    this.exec(`INSERT INTO sales (email, sale_id, product_id, granted_at) VALUES (?, ?, ?, ?)
               ON CONFLICT(email) DO UPDATE SET sale_id = excluded.sale_id, product_id = excluded.product_id, granted_at = excluded.granted_at`,
      email, String(sale_id || ''), String(product_id || ''), new Date(this.now()).toISOString());
    return true;
  }
  dropSale(email) { this.exec('DELETE FROM sales WHERE email = ?', email); return true; }

  // A token the old server vouched for once, remembered so the old server is asked only once a day.
  legacyMiss(hash) { return this.count(`legacy:miss:${hash}`) > 0; }
  noteLegacyMiss(hash) { this.add(`legacy:miss:${hash}`, 1, DAY); return true; }
  takeLegacyLookup({ day, perDay }) {
    return this.txn(() => {
      if (this.count(`legacy:lookups:${day}`) >= perDay) return false;
      this.add(`legacy:lookups:${day}`, 1, COUNTER_TTL_DAY);
      return true;
    });
  }

  purge() {
    const t = this.now();
    this.exec('DELETE FROM counters WHERE expires <= ?', t);
    this.exec('DELETE FROM tokens WHERE expires <= ?', t);
    this.exec('DELETE FROM revoked WHERE expires <= ?', t);
    return true;
  }
}
