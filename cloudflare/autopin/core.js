// The small database of the pin job: pages with their three images, one row per cron slot, an error log, daily
// counters and the on/off flags. It runs inside one Durable Object (SQLite) in production and on node:sqlite in the
// tests, like the ledger (cloudflare/ledger-core.js).
//
// exec(sql, ...params) returns an array of row objects; txn(fn) runs fn atomically and returns its result.
// Images (BLOB) go in as Uint8Array and come out as Uint8Array or ArrayBuffer; bytesOf() makes them one type.

const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;
const COUNTER_TTL_DAY = 3 * DAY;
const COUNTER_TTL_MONTH = 40 * DAY;
export const RUN_STALE_MS = 10 * 60 * 1000;   // a run that says "running" for longer than this has died
export const MAX_RUNS_PER_SLOT = 3;
const ERROR_KEEP = 200;
const FETCH_KEEP = 60;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS counters (k TEXT PRIMARY KEY, n INTEGER NOT NULL, expires INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS pages (
     slug TEXT PRIMARY KEY, theme TEXT NOT NULL, grp TEXT NOT NULL, level TEXT NOT NULL, headline TEXT NOT NULL,
     title TEXT NOT NULL, description TEXT NOT NULL, alt TEXT NOT NULL, intro TEXT NOT NULL, meta_description TEXT NOT NULL,
     prompt TEXT NOT NULL, site TEXT, skin TEXT NOT NULL, created INTEGER NOT NULL, release INTEGER NOT NULL,
     slot TEXT, attempts INTEGER NOT NULL DEFAULT 1, metrics TEXT, pin_bytes INTEGER NOT NULL, page_bytes INTEGER NOT NULL,
     thumb_bytes INTEGER NOT NULL, hidden INTEGER NOT NULL DEFAULT 0)`,
  `CREATE INDEX IF NOT EXISTS pages_release ON pages (release)`,
  `CREATE TABLE IF NOT EXISTS blobs (slug TEXT NOT NULL, kind TEXT NOT NULL, bytes BLOB NOT NULL, PRIMARY KEY (slug, kind))`,
  `CREATE TABLE IF NOT EXISTS runs (
     slot TEXT PRIMARY KEY, started INTEGER NOT NULL, finished INTEGER, status TEXT NOT NULL, detail TEXT, source TEXT,
     attempts INTEGER NOT NULL DEFAULT 1)`,
  `CREATE TABLE IF NOT EXISTS errors (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, stage TEXT NOT NULL, msg TEXT NOT NULL, slot TEXT)`,
  `CREATE TABLE IF NOT EXISTS fetches (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, what TEXT NOT NULL, ua TEXT, n INTEGER)`
];

export const bytesOf = v => (v instanceof Uint8Array ? v : v instanceof ArrayBuffer ? new Uint8Array(v) : v == null ? null : new Uint8Array(v));
export const isoDay = ms => new Date(ms).toISOString().slice(0, 10);

export class PinCore {
  constructor(exec, txn, now = () => Date.now()) {
    this.exec = exec;
    this.txn = txn;
    this.now = now;
    for (const s of SCHEMA) exec(s);
  }

  // --- flags ---
  getMeta(k) { const r = this.exec('SELECT v FROM meta WHERE k = ?', k)[0]; return r ? String(r.v) : null; }
  setMeta(k, v) {
    this.exec('INSERT INTO meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v', k, String(v));
    return true;
  }
  delMeta(k) { this.exec('DELETE FROM meta WHERE k = ?', k); return true; }

  // --- counters (the date or month is in the key; they are kept a little past it) ---
  count(k) {
    const r = this.exec('SELECT n, expires FROM counters WHERE k = ?', k)[0];
    return r && r.expires > this.now() ? Number(r.n) : 0;
  }
  add(k, by, ttl = COUNTER_TTL_DAY) {
    const n = Math.max(0, this.count(k) + by);
    this.exec('INSERT INTO counters (k, n, expires) VALUES (?, ?, ?) ON CONFLICT(k) DO UPDATE SET n = excluded.n, expires = excluded.expires',
      k, n, this.now() + ttl);
    return n;
  }
  addMonth(k, by) { return this.add(k, by, COUNTER_TTL_MONTH); }

  // --- runs: one row per cron slot, so a slot that was handled is never handled again ---
  // Returns { ok: true, attempt } when this call may work on the slot, otherwise { ok: false, reason }.
  beginRun(slot, source) {
    return this.txn(() => {
      const t = this.now();
      const row = this.exec('SELECT status, started, attempts FROM runs WHERE slot = ?', slot)[0];
      if (!row) {
        this.exec('INSERT INTO runs (slot, started, status, source, attempts) VALUES (?, ?, ?, ?, 1)', slot, t, 'running', source || '');
        return { ok: true, attempt: 1 };
      }
      if (row.status === 'done' || row.status === 'skipped') return { ok: false, reason: 'slot_' + row.status };
      if (row.status === 'running' && t - Number(row.started) < RUN_STALE_MS) return { ok: false, reason: 'running' };
      if (Number(row.attempts) >= MAX_RUNS_PER_SLOT) return { ok: false, reason: 'slot_exhausted' };
      this.exec('UPDATE runs SET status = ?, started = ?, finished = NULL, attempts = attempts + 1, source = ? WHERE slot = ?', 'running', t, source || '', slot);
      return { ok: true, attempt: Number(row.attempts) + 1 };
    });
  }
  endRun(slot, status, detail) {
    this.exec('UPDATE runs SET status = ?, finished = ?, detail = ? WHERE slot = ?', status, this.now(), String(detail || '').slice(0, 400), slot);
    return true;
  }
  recentRuns(n = 12) {
    return this.exec('SELECT slot, status, started, finished, detail, source, attempts FROM runs ORDER BY started DESC LIMIT ?', n)
      .map(r => ({ slot: r.slot, status: r.status, started: Number(r.started), finished: r.finished == null ? null : Number(r.finished), detail: r.detail || '', source: r.source || '', attempts: Number(r.attempts) }));
  }

  // --- errors and feed fetches ---
  logError(stage, msg, slot) {
    this.exec('INSERT INTO errors (ts, stage, msg, slot) VALUES (?, ?, ?, ?)', this.now(), String(stage).slice(0, 40), String(msg).slice(0, 300), slot || null);
    this.exec('DELETE FROM errors WHERE id <= (SELECT MAX(id) FROM errors) - ?', ERROR_KEEP);
    return true;
  }
  recentErrors(n = 20) {
    return this.exec('SELECT ts, stage, msg, slot FROM errors ORDER BY id DESC LIMIT ?', n)
      .map(r => ({ ts: Number(r.ts), stage: r.stage, msg: r.msg, slot: r.slot || '' }));
  }
  logFetch(what, ua, n) {
    this.exec('INSERT INTO fetches (ts, what, ua, n) VALUES (?, ?, ?, ?)', this.now(), String(what).slice(0, 40), String(ua || '').slice(0, 120), n == null ? null : n);
    this.exec('DELETE FROM fetches WHERE id <= (SELECT MAX(id) FROM fetches) - ?', FETCH_KEEP);
    return true;
  }
  recentFetches(n = 10) {
    return this.exec('SELECT ts, what, ua, n FROM fetches ORDER BY id DESC LIMIT ?', n)
      .map(r => ({ ts: Number(r.ts), what: r.what, ua: r.ua || '', n: r.n == null ? null : Number(r.n) }));
  }

  // --- pages ---
  hasPage(slug) { return this.exec('SELECT 1 AS x FROM pages WHERE slug = ?', slug).length > 0; }
  usedSlugs() { return new Set(this.exec('SELECT slug FROM pages').map(r => r.slug)); }
  themeCounts() {
    const out = {};
    for (const r of this.exec('SELECT theme, COUNT(*) AS n FROM pages GROUP BY theme')) out[r.theme] = Number(r.n);
    return out;
  }
  // p: the text columns; blobs: { pin, page, thumb } as Uint8Array. Returns false when the slug already exists.
  insertPage(p, blobs) {
    return this.txn(() => {
      if (this.hasPage(p.slug)) return false;
      this.exec(`INSERT INTO pages (slug, theme, grp, level, headline, title, description, alt, intro, meta_description, prompt, site, skin,
                   created, release, slot, attempts, metrics, pin_bytes, page_bytes, thumb_bytes, hidden)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        p.slug, p.theme, p.grp, p.level, p.headline, p.title, p.description, p.alt, p.intro, p.metaDescription, p.prompt, p.site || null, p.skin,
        p.created, p.release, p.slot || null, p.attempts || 1, p.metrics ? JSON.stringify(p.metrics) : null,
        blobs.pin.length, blobs.page.length, blobs.thumb.length);
      for (const kind of ['pin', 'page', 'thumb']) this.exec('INSERT INTO blobs (slug, kind, bytes) VALUES (?, ?, ?)', p.slug, kind, blobs[kind]);
      return true;
    });
  }
  rowToPage(r) {
    return {
      slug: r.slug, theme: r.theme, group: r.grp, level: r.level, headline: r.headline, title: r.title, description: r.description, alt: r.alt,
      intro: r.intro, metaDescription: r.meta_description, prompt: r.prompt, site: r.site || null, skin: r.skin, created: Number(r.created),
      release: Number(r.release), pinBytes: Number(r.pin_bytes), pageBytes: Number(r.page_bytes), thumbBytes: Number(r.thumb_bytes),
      hidden: !!r.hidden, source: 'auto'
    };
  }
  getPage(slug) {
    const r = this.exec('SELECT * FROM pages WHERE slug = ?', slug)[0];
    return r ? this.rowToPage(r) : null;
  }
  // Pages that have been released (release <= upTo) and are not hidden, newest first.
  listPages({ upTo, limit = 100, since = 0 } = {}) {
    const to = upTo == null ? this.now() : upTo;
    return this.exec('SELECT * FROM pages WHERE hidden = 0 AND release <= ? AND release >= ? ORDER BY release DESC, slug LIMIT ?', to, since, limit)
      .map(r => this.rowToPage(r));
  }
  setHidden(slug, on) {
    this.exec('UPDATE pages SET hidden = ? WHERE slug = ?', on ? 1 : 0, slug);
    return this.hasPage(slug);
  }
  getBlob(slug, kind) {
    const r = this.exec('SELECT bytes FROM blobs WHERE slug = ? AND kind = ?', slug, kind)[0];
    return r ? bytesOf(r.bytes) : null;
  }
  storageBytes() {
    const r = this.exec('SELECT COALESCE(SUM(pin_bytes + page_bytes + thumb_bytes), 0) AS n, COUNT(*) AS c FROM pages')[0];
    return { bytes: Number(r.n), pages: Number(r.c) };
  }

  // Old counters, runs and errors go; pages stay.
  purge() {
    const t = this.now();
    this.exec('DELETE FROM counters WHERE expires <= ?', t);
    this.exec('DELETE FROM runs WHERE started < ?', t - 45 * DAY);
    this.exec('DELETE FROM errors WHERE ts < ?', t - 30 * DAY);
    return true;
  }
}
