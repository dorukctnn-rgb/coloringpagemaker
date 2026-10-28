// The counting rules of the Pro-click counter (Peak Apps Tools). No cookies, no personal data, no IP address: the only thing
// ever stored is a daily total for one combination of
//   e  what happened   click (a Pro link was followed), gate (the Pro window opened on its own), open (the visitor opened it),
//                      view (a page opened), make (a page was made), key (the visitor opened the licence-key box)
//   t  the tool        a slug such as pay-gap-report
//   p  the page        the address path only, never a query or a #
//   w  where           which part of the page the button was in
//   s  the kind of site that sent the visitor: one of eight words, never an address
// The same file sits in the repository peak-tools (funnel-worker/core.js); keep the code identical. Here it runs in the Ledger
// Durable Object, in a second instance named "funnel" (worker.js), so no new binding or migration is needed.
//
// FunnelCore runs inside one Durable Object (SQLite) in production and on node:sqlite in the tests.
// exec(sql, ...params) returns an array of row objects; txn(fn) runs fn atomically and returns its result.

export const EVENTS = ['view', 'make', 'gate', 'open', 'click', 'key'];
export const SOURCES = ['google', 'bing', 'other-search', 'ai-assistant', 'pinterest', 'social', 'referral', 'direct'];
export const MAX_BODY = 600;          // bytes of one note
export const MAX_ROWS_PER_DAY = 3000; // distinct combinations a day; more are counted as "overflow" and nothing else
export const KEEP_DAYS = 400;         // daily totals are deleted after this many days

const TOOL_RE = /^[a-z0-9][a-z0-9-]{1,59}$/;
const PATH_RE = /^\/[a-z0-9\/._-]{0,119}$/;
const PLACE_RE = /^[a-z0-9][a-z0-9#._-]{0,39}$/;

// One note from a browser (JSON text or an object) -> the clean record, or null when it is not a note. A path or place that is
// not in the allowed shape is stored as '' (the note still counts); a tool or event that is not is refused.
export function cleanNote(raw) {
  let j = raw;
  if (typeof raw === 'string') {
    if (raw.length > MAX_BODY) return null;
    try { j = JSON.parse(raw); } catch (e) { return null; }
  }
  if (!j || typeof j !== 'object' || Array.isArray(j)) return null;
  const str = v => (typeof v === 'string' ? v.trim().toLowerCase() : '');
  const e = str(j.e), t = str(j.t);
  if (!EVENTS.includes(e) || !TOOL_RE.test(t)) return null;
  const p = str(j.p), w = str(j.w), s = str(j.s);
  return { e, t, p: PATH_RE.test(p) ? p : '', w: PLACE_RE.test(w) ? w : '', s: SOURCES.includes(s) ? s : '' };
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS funnel (
     day TEXT NOT NULL, e TEXT NOT NULL, t TEXT NOT NULL, p TEXT NOT NULL, w TEXT NOT NULL, s TEXT NOT NULL, n INTEGER NOT NULL,
     PRIMARY KEY (day, e, t, p, w, s))`
];
const DAY_MS = 24 * 60 * 60 * 1000;
const dayOf = ms => new Date(ms).toISOString().slice(0, 10);

export class FunnelCore {
  constructor(exec, txn, now = () => Date.now()) {
    this.exec = exec;
    this.txn = txn;
    this.now = now;
    for (const s of SCHEMA) exec(s);
  }

  // Adds one to today's total (UTC day) for the note. Returns true when counted, false when the day's room for new
  // combinations is used up (then only the "overflow" total grows).
  note(rec, maxRows = MAX_ROWS_PER_DAY) {
    return this.txn(() => {
      const day = dayOf(this.now());
      const key = [day, rec.e, rec.t, rec.p, rec.w, rec.s];
      const known = this.exec('SELECT n FROM funnel WHERE day = ? AND e = ? AND t = ? AND p = ? AND w = ? AND s = ?', ...key)[0];
      let at = key;
      let counted = true;
      if (!known && Number(this.exec('SELECT COUNT(*) AS c FROM funnel WHERE day = ?', day)[0].c) >= maxRows) { at = [day, 'overflow', '', '', '', '']; counted = false; }
      this.exec('INSERT INTO funnel (day, e, t, p, w, s, n) VALUES (?, ?, ?, ?, ?, ?, 1) ON CONFLICT(day, e, t, p, w, s) DO UPDATE SET n = n + 1', ...at);
      return counted;
    });
  }

  // Totals for the last `days` UTC days including today, grouped by the chosen columns (day, e, t, p, w, s; default all).
  rows({ days = 30, by = ['day', 'e', 't', 'p', 'w', 's'] } = {}) {
    const cols = ['day', 'e', 't', 'p', 'w', 's'].filter(c => by.includes(c));
    const from = dayOf(this.now() - (Math.max(1, Math.min(KEEP_DAYS, Math.floor(days))) - 1) * DAY_MS);
    // the column names come from the fixed list above, never from the caller
    const select = cols.length ? cols.join(', ') + ', ' : '';
    const group = cols.length ? ' GROUP BY ' + cols.join(', ') + ' ORDER BY ' + cols.join(', ') : '';
    return this.exec(`SELECT ${select}SUM(n) AS n FROM funnel WHERE day >= ?${group}`, from).map(r => ({ ...r, n: Number(r.n) }));
  }

  purge() {
    this.exec('DELETE FROM funnel WHERE day < ?', dayOf(this.now() - KEEP_DAYS * DAY_MS));
    return true;
  }
}
