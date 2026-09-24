// Date spine: postings arrive with dates in six different shapes (Greenhouse
// updated_at, Ashby publishedAt, Lever createdAt, Remotive publication_date,
// Arbeitnow created_at, naukri's "3 days ago") and most were discarded. Every
// helper here takes an injected `now` so the corpus pipeline stays deterministic
// and testable, and every helper returns null for input it cannot prove — a
// guessed date would make every trend claim in the app a fiction.
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// month and year are nominal, not calendar-exact: the sources only ever speak in
// whole units, and "2 months ago" carries no finer precision than 60 days.
const UNITS = {
  min: MINUTE, mins: MINUTE, minute: MINUTE, minutes: MINUTE,
  hr: HOUR, hrs: HOUR, hour: HOUR, hours: HOUR,
  day: DAY, days: DAY,
  week: 7 * DAY, weeks: 7 * DAY,
  month: 30 * DAY, months: 30 * DAY,
  year: 365 * DAY, years: 365 * DAY,
};

const RELATIVE = /^(\d+)\s*(min|mins|minute|minutes|hr|hrs|hour|hours|day|days|week|weeks|month|months|year|years)\s*ago$/;

function normalizeEpoch(n) {
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n < 1e12 ? n * 1000 : n); // seconds -> ms
}

function parseAbsolute(s) {
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const t = Date.parse(s);
    return Number.isFinite(t) ? t : null;
  }
  if (/^\d{10}$/.test(s) || /^\d{13}$/.test(s)) return normalizeEpoch(Number(s));
  return null;
}

// "Just now" · "Today" · "3 days ago" · "2 weeks ago" · "30+ days ago" ·
// ISO strings · epoch seconds or ms. Anything else is null.
export function parseRelativeDate(input, now = Date.now()) {
  if (input == null) return null;
  if (typeof input === "number") return normalizeEpoch(input);
  const s = String(input).trim().toLowerCase();
  if (!s) return null;
  const abs = parseAbsolute(s);
  if (abs != null) return abs;
  if (/^(just now|now|today|few moments ago)$/.test(s)) return now;
  if (s === "yesterday") return now - DAY;
  const m = s.replace(/\+/g, "").match(RELATIVE);
  if (!m) return null;
  const unit = UNITS[m[2]];
  const n = Number(m[1]);
  if (!unit || !Number.isFinite(n)) return null;
  return now - n * unit;
}

export function toMs(input, now = Date.now()) {
  return parseRelativeDate(input, now);
}

export function toIso(input, now = Date.now()) {
  const ms = parseRelativeDate(input, now);
  return ms == null ? null : new Date(ms).toISOString();
}

// fractional days; floor at the call site when a whole count is displayed.
export function daysSince(input, now = Date.now()) {
  const ms = parseRelativeDate(input, now);
  return ms == null ? null : (now - ms) / DAY;
}

// three-state on purpose: true = stale, false = fresh, null = undated.
// Undated is not stale, it is unknown, and the feed must say so rather than
// collapse a missing date into a confident "possibly closed".
export function isStale(input, now = Date.now(), days = 30) {
  const d = daysSince(input, now);
  return d == null ? null : d > days;
}

// the newest postedAt in a corpus, or null when nothing is dated.
export function freshestAt(jobs = [], now = Date.now()) {
  const stamps = jobs.map((j) => parseRelativeDate(j?.postedAt, now)).filter((t) => t != null);
  return stamps.length ? new Date(Math.max(...stamps)).toISOString() : null;
}
