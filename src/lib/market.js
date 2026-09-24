// Market Pulse: the live corpus recomputes what a skill is worth, and the matching
// engine reweights each posting's required skills accordingly. Every function here is
// pure and takes an injected `now`, because a market claim nobody can reproduce is a
// claim nobody should believe. Sample size travels with every number for the same reason.
import { canonSkill, demandWeight, skillById } from "../data/taxonomy.js";
import { toMs, toIso, daysSince, isStale, freshestAt } from "./dates.js";
import { loadJSON, saveJSON } from "./storage.js";
import { laneOfRole } from "./store.js";

const DAY = 86400000;
const round = (n, p = 3) => Math.round(n * 10 ** p) / 10 ** p;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
// the taxonomy's own band: no market signal may push a skill outside 0.6 to 1.5
export const WEIGHT_MIN = 0.6;
export const WEIGHT_MAX = 1.5;

// --- lanes ---------------------------------------------------------------------------

// Which portal a posting belongs to. Explicit when the source declared it, inferred
// from the role otherwise, because most of the bundled corpus predates the lane tag.
export function laneOfJob(job = {}) {
  return job?.lane || laneOfRole(job?.role);
}

export function skillsOf(job = {}) {
  return [...new Set((job.skills || []).map(canonSkill).filter(Boolean))];
}

export function hasSkill(job = {}, skill = "") {
  const k = canonSkill(skill);
  return k ? skillsOf(job).includes(k) : false;
}

// A tech sub-lane (sde, data, marketing, govt) reads the same tech market: the market
// is what employers ask for, the sub-lane is which rubric the student is scored against.
export function corpusForLane(jobs = [], lane = "tech") {
  const want = lane === "ayush" ? "ayush" : "tech";
  return (jobs || []).filter((j) => laneOfJob(j) === want);
}

// Curated seeds carry no src, so the apply host is the honest fallback.
export function sourceOf(job = {}) {
  if (job.src) return String(job.src);
  try {
    const host = new URL(String(job.apply || "")).hostname.replace(/^www\./, "");
    return host.split(".")[0] || "unknown";
  } catch {
    return "unknown";
  }
}

function tally(list, keyOf) {
  const m = new Map();
  for (const item of list) {
    const k = keyOf(item);
    if (k == null) continue;
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || String(a.key).localeCompare(String(b.key)));
}

export function corpusStats(jobs = [], now = Date.now()) {
  const list = jobs || [];
  const dated = list.filter((j) => toMs(j.postedAt, now) != null).length;
  return {
    total: list.length,
    skilled: list.filter((j) => skillsOf(j).length).length,
    dated,
    undated: list.length - dated,
    bySource: tally(list, sourceOf),
    byRole: tally(list, (j) => j.role || "unlabelled"),
    byCity: tally(list, (j) => j.loc || "unknown"),
    freshestAt: freshestAt(list, now),
    at: toIso(now, now),
  };
}

// --- salary --------------------------------------------------------------------------

// Only shapes with an unambiguous annual cue are parsed: "3-4 Lacs PA", "3.75 Lacs PA",
// "$70k - $90k". A monthly stipend ("₹37,000 + HRA") is left as raw text for the UI rather
// than reported as a band the data never stated. Undisclosed returns null, never a guess.
const UNDISCLOSED = /^(not disclosed|unpaid|self[- ]financed|negotiable|hidden|n\/a|unknown)\b/i;

function band(min, max, unit, currency, raw, sym) {
  const fmt = (n) => (unit === "year"
    ? (currency === "INR" ? `${sym}${round(n / 100000, 2)}L` : `${sym}${round(n / 1000, 1)}k`)
    : `${sym}${Math.round(n)}`);
  return {
    min,
    max,
    unit,
    currency,
    band: min === max ? `${fmt(min)} a year` : `${fmt(min)} to ${fmt(max)} a year`,
    raw,
  };
}

export function salaryBand(job = {}) {
  const raw = String(job.salary ?? job.stipend ?? "").trim();
  if (!raw || UNDISCLOSED.test(raw)) return null;
  const lakh = raw.match(/(\d+(?:\.\d+)?)\s*(?:(?:-|to)\s*(\d+(?:\.\d+)?)\s*)?(?:lacs?|lakhs?|lpa)\b/i);
  if (lakh) {
    const a = Number(lakh[1]) * 100000;
    const b = Number(lakh[2] ?? lakh[1]) * 100000;
    return band(Math.min(a, b), Math.max(a, b), "year", "INR", raw, "₹");
  }
  const usd = [...raw.matchAll(/\$\s*(\d+(?:\.\d+)?)\s*(k)?/gi)].slice(0, 2)
    .map((m) => Number(m[1]) * (m[2] ? 1000 : 1));
  if (usd.length) return band(Math.min(...usd), Math.max(...usd), "year", "USD", raw, "$");
  return null;
}

// --- the index -----------------------------------------------------------------------

// Demand is measured as the share of postings asking for a skill, mapped onto the
// taxonomy's own 0.6 to 1.5 band against the most-requested skill in the corpus. A skill
// seen fewer than `minPostings` times is left out entirely: it counts as 1.0 (neutral)
// downstream instead of earning a weight off two coincidences.
//
// The live figure is then blended 50/50 with the taxonomy's published `demandWeight` prior,
// which is what makes a small scrape behave: the prior carries the sample, the corpus moves it.
export function marketIndex(jobs = [], { now = Date.now(), minPostings = 3 } = {}) {
  const list = jobs || [];
  const total = list.length;
  const counts = new Map();
  // A posting that names no skills cannot be asked about a skill, so it cannot belong in the
  // denominator of "the share of postings asking for this". Nearly a third of the scraped
  // board postings arrive with an empty skill list, and counting them as though they had
  // answered the question understates every demand figure in the app. They stay in the corpus
  // total and are reported separately, because the gap is information, not noise.
  let skilled = 0;
  for (const j of list) {
    const ss = skillsOf(j);
    if (ss.length) skilled++;
    for (const s of ss) counts.set(s, (counts.get(s) || 0) + 1);
  }
  const observed = [...counts].filter(([, n]) => n >= minPostings);
  const maxCount = observed.reduce((m, [, n]) => Math.max(m, n), 0);

  const weights = new Map();
  const shifts = [];
  for (const [skill, postings] of observed) {
    const share = skilled ? postings / skilled : 0;
    const live = round(WEIGHT_MIN + (WEIGHT_MAX - WEIGHT_MIN) * (maxCount ? postings / maxCount : 0));
    const prior = demandWeight(skill);
    const weight = round(clamp(0.5 * prior + 0.5 * live, WEIGHT_MIN, WEIGHT_MAX));
    weights.set(skill, weight);
    shifts.push({ skill, postings, share: round(share, 4), live, prior, weight, delta: round(weight - 1) });
  }
  shifts.sort((a, b) => b.weight - a.weight || b.postings - a.postings || a.skill.localeCompare(b.skill));

  const dated = list.filter((j) => toMs(j.postedAt, now) != null).length;
  return {
    weights,
    shifts,
    sample: {
      total,
      skilled,
      unstated: total - skilled,
      dated,
      undated: total - dated,
      skills: counts.size,
      observed: observed.length,
      minPostings,
      maxCount,
      lowSample: counts.size - observed.length,
    },
    at: toIso(now, now),
  };
}

// null means "no live evidence", and the caller must treat it as neutral 1.0.
export function blendedWeight(skill = "", index = null) {
  if (!index?.weights || !skill) return null;
  return index.weights.get(canonSkill(skill)) ?? null;
}

// Page-facing shape: pass the whole corpus plus your lane and the sample, the sources and
// the freshness clock all describe the same slice. Omit `lane` to use the corpus as given.
export function effectiveWeights(jobs = [], { lane = null, now = Date.now(), minPostings = 3 } = {}) {
  const corpus = lane ? corpusForLane(jobs, lane) : (jobs || []);
  const idx = marketIndex(corpus, { now, minPostings });
  return {
    ...idx,
    lane,
    sources: tally(corpus, sourceOf),
    freshestAt: freshestAt(corpus, now),
    stats: corpusStats(corpus, now),
  };
}

// --- trend ---------------------------------------------------------------------------

// Rising, stable or cooling, computed from dated postings inside one corpus: this window
// against the one before it. Fewer than three dated postings and the answer is "unknown",
// because two postings are not a direction.
export function trendFromDates(jobs = [], skill = "", { now = Date.now(), window = 14 } = {}) {
  const k = canonSkill(skill);
  if (!k) return "unknown";
  let recent = 0;
  let prev = 0;
  let dated = 0;
  for (const j of jobs || []) {
    if (!hasSkill(j, k)) continue;
    const t = toMs(j.postedAt, now);
    if (t == null) continue;
    dated++;
    const age = (now - t) / DAY;
    if (age <= window) recent++;
    else if (age <= 2 * window) prev++;
  }
  if (dated < 3 || recent + prev < 3) return "unknown";
  if (recent >= prev * 1.5) return "rising";
  if (prev >= recent * 1.5) return "cooling";
  return "stable";
}

// Snapshot trend, for corpora with no dates at all: compares the share a skill held at the
// first stored snapshot with its share now. Needs two snapshots, so the honest first-run
// answer is "unknown" and the UI says how many snapshots exist.
export function trendFromMemory(skill = "", memory = [], lane = "tech") {
  const k = canonSkill(skill);
  const points = [...(memory || [])]
    .sort((a, b) => Date.parse(a?.at || 0) - Date.parse(b?.at || 0))
    .map((e) => {
      const L = e?.lanes?.[lane];
      if (!L?.total) return null;
      return (L.perSkill?.[k] || 0) / L.total;
    })
    .filter((v) => v != null);
  if (points.length < 2) return "unknown";
  const first = points[0];
  const last = points[points.length - 1];
  if (!first) return last > 0 ? "rising" : "unknown";
  const ratio = last / first;
  if (ratio >= 1.25) return "rising";
  if (ratio <= 0.8) return "cooling";
  return "stable";
}

export function trendFor(skill = "", jobs = [], memory = [], opts = {}) {
  const fromDates = trendFromDates(jobs, skill, opts);
  return fromDates === "unknown" ? trendFromMemory(skill, memory, opts.lane) : fromDates;
}

// --- signals for the UI --------------------------------------------------------------

export function marketSignals(jobs = [], opts = {}) {
  const { now = Date.now(), memory = [], minPostings = 3, lane = null, limit = 0 } = opts;
  const corpus = lane ? corpusForLane(jobs, lane) : (jobs || []);
  const memoryLane = lane || "tech";
  const { weights, shifts, sample } = marketIndex(corpus, { now, minPostings });
  const rows = shifts.map((s) => {
    const holders = corpus.filter((j) => hasSkill(j, s.skill));
    return {
      ...s,
      name: skillById(s.skill)?.name || s.skill,
      trend: trendFor(s.skill, corpus, memory, { now, lane: memoryLane }),
      cities: tally(holders, (j) => j.loc || "unknown").slice(0, 4),
      sources: tally(holders, sourceOf).slice(0, 4),
    };
  });
  return { rows: limit ? rows.slice(0, limit) : rows, sample, weights, at: toIso(now, now) };
}

// --- time series and depth ------------------------------------------------------------

// Monday 00:00 UTC of the week a timestamp falls in: one bucket key everywhere.
function weekStart(t) {
  const d = new Date(t);
  d.setUTCHours(0, 0, 0, 0);
  const back = (d.getUTCDay() + 6) % 7;
  return d.getTime() - back * DAY;
}

function bucketsAround(now, weeks) {
  const thisWeek = weekStart(now);
  const out = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = thisWeek - i * 7 * DAY;
    out.push({ at: new Date(start).toISOString(), start, count: 0 });
  }
  return { thisWeek, out };
}

const label = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`; // dd/mm, week of

// Posting volume per week: the shape of the market, from real dates only. Undated and
// older-than-window postings are counted separately rather than folded in, because a
// chart that silently absorbs unknowns is a chart that lies about its own sample.
export function postingVolume(jobs = [], { now = Date.now(), weeks = 8 } = {}) {
  const { thisWeek, out } = bucketsAround(now, weeks);
  const oldest = thisWeek - (weeks - 1) * 7 * DAY;
  const byStart = new Map(out.map((b) => [b.start, b]));
  let undated = 0;
  let older = 0;
  for (const j of jobs || []) {
    const t = toMs(j.postedAt, now);
    if (t == null) { undated++; continue; }
    const w = weekStart(t);
    if (w < oldest) { older++; continue; }
    const bucket = byStart.get(w);
    if (bucket) bucket.count++;
  }
  const buckets = out.map(({ at, count }) => ({ at, week: at.slice(0, 10), label: label(at), count }));
  const half = Math.floor(buckets.length / 2);
  const recent = buckets.slice(half).reduce((a, b) => a + b.count, 0);
  const prior = buckets.slice(0, half).reduce((a, b) => a + b.count, 0);
  return { buckets, undated, older, recent, prior, peak: buckets.reduce((m, b) => Math.max(m, b.count), 0) };
}

// When roughly is this corpus from. The answer to "is this market stale".
export function freshnessBands(jobs = [], now = Date.now()) {
  const bands = { last7: 0, last30: 0, older: 0, undated: 0 };
  for (const j of jobs || []) {
    const d = daysSince(j.postedAt, now);
    if (d == null) bands.undated++;
    else if (d <= 7) bands.last7++;
    else if (d <= 30) bands.last30++;
    else bands.older++;
  }
  return bands;
}

// Who is actually hiring in this lane, and for what. Names come from the postings, not a
// curated employer list, so this cannot drift from the corpus.
export function companyDemand(jobs = [], limit = 8) {
  const byCompany = new Map();
  for (const j of jobs || []) {
    const name = String(j.company || "").trim();
    if (!name) continue;
    const entry = byCompany.get(name) || { company: name, postings: 0, skills: new Map(), freshestAt: null, locs: new Set() };
    entry.postings++;
    if (j.loc) entry.locs.add(j.loc);
    const t = toMs(j.postedAt);
    if (t != null) {
      const iso = new Date(t).toISOString();
      if (!entry.freshestAt || iso > entry.freshestAt) entry.freshestAt = iso;
    }
    for (const s of skillsOf(j)) entry.skills.set(s, (entry.skills.get(s) || 0) + 1);
    byCompany.set(name, entry);
  }
  return [...byCompany.values()]
    .map((e) => ({
      company: e.company,
      postings: e.postings,
      freshestAt: e.freshestAt,
      locs: [...e.locs].slice(0, 3),
      top: [...e.skills].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 3).map(([skill, n]) => ({ skill, n })),
    }))
    .sort((a, b) => b.postings - a.postings || a.company.localeCompare(b.company))
    .slice(0, limit);
}

// One skill's own weekly volume, for the sparkline beside its weight.
export function skillSeries(jobs = [], skill = "", { now = Date.now(), weeks = 8 } = {}) {
  const k = canonSkill(skill);
  const { thisWeek, out } = bucketsAround(now, weeks);
  const oldest = thisWeek - (weeks - 1) * 7 * DAY;
  const byStart = new Map(out.map((b) => [b.start, b]));
  let undated = 0;
  for (const j of jobs || []) {
    if (!hasSkill(j, k)) continue;
    const t = toMs(j.postedAt, now);
    if (t == null) { undated++; continue; }
    const w = weekStart(t);
    if (w < oldest) continue;
    const bucket = byStart.get(w);
    if (bucket) bucket.count++;
  }
  return { buckets: out.map(({ at, count }) => ({ at, week: at.slice(0, 10), label: label(at), count })), undated };
}

// Market activity, written as sentences a placement officer can read out loud. Every line
// is derived from the corpus on this device: no news API, no key, nothing that can go
// stale between the scrape and the demo. Lines that cannot be proven are not emitted.
export function activityDigest(jobs = [], memory = [], { now = Date.now(), lane = "tech", limit = 10 } = {}) {
  const corpus = jobs || [];
  const lines = [];
  const volume = postingVolume(corpus, { now });
  const bands = freshnessBands(corpus, now);
  const stats = corpusStats(corpus, now);

  if (corpus.length) {
    lines.push({ kind: "sample", tone: "zinc", text: `${corpus.length} postings tracked across ${stats.bySource.length} sources, ${stats.dated} with a real posted date.` });
  } else {
    return [{ kind: "empty", tone: "amber", text: "No postings in this lane yet, so there is nothing to report." }];
  }

  lines.push({
    kind: "volume",
    tone: volume.recent >= volume.prior ? "green" : "amber",
    text: volume.recent || volume.prior
      ? `${volume.recent} postings in the last ${Math.floor(volume.buckets.length / 2)} weeks against ${volume.prior} in the ${Math.floor(volume.buckets.length / 2)} before it.`
      : "No posting in this lane carries a date, so volume over time cannot be measured.",
  });

  if (stats.freshestAt) {
    const age = Math.floor(daysSince(stats.freshestAt, now));
    lines.push({ kind: "fresh", tone: age <= 7 ? "green" : age <= 30 ? "zinc" : "amber", text: `Freshest posting landed ${age === 0 ? "today" : `${age} day${age === 1 ? "" : "s"} ago`} (${stats.freshestAt.slice(0, 10)}).` });
  }

  const top = companyDemand(corpus, 1)[0];
  if (top && top.postings > 1) {
    lines.push({ kind: "employer", tone: "zinc", text: `${top.company} accounts for the most openings in this lane: ${top.postings} posting${top.postings === 1 ? "" : "s"}${top.top.length ? `, mostly ${top.top.map((t) => t.skill).join(", ")}` : ""}.` });
  }

  const { shifts } = marketIndex(corpus, { now });
  const ranked = shifts.filter((s) => s.postings >= 3).slice(0, 3);
  for (const s of ranked) {
    const trend = trendFor(s.skill, corpus, memory, { now, lane });
    if (trend === "unknown") continue;
    lines.push({
      kind: transientKind(trend),
      tone: trend === "rising" ? "green" : trend === "cooling" ? "amber" : "zinc",
      text: `${skillById(s.skill)?.name || s.skill} is ${trend === "rising" ? "picking up" : trend === "cooling" ? "cooling off" : "steady"}: asked for by ${s.postings} of ${corpus.length} postings (weight ${s.weight.toFixed(2)}x).`,
    });
  }

  if (bands.older > 0) {
    lines.push({ kind: "stale", tone: "amber", text: `${bands.older} posting${bands.older === 1 ? " is" : "s are"} older than 30 days and may already be closed. The feed marks them instead of hiding them.` });
  }
  if (bands.undated > 0) {
    lines.push({ kind: "undated", tone: "amber", text: `${bands.undated} posting${bands.undated === 1 ? "" : "s"} carry no date at all, so they count toward demand but never toward trend.` });
  }

  const snaps = (memory || []).length;
  lines.push({
    kind: "history",
    tone: "zinc",
    text: snaps < 2
      ? `${snaps} snapshot stored on this device. A second day of history is what turns a share into a direction.`
      : `${snaps} snapshots stored, so share movement is measured rather than inferred.`,
  });

  return lines.slice(0, limit);
}

const transientKind = (trend) => (trend === "rising" ? "rising" : trend === "cooling" ? "cooling" : "steady");

// --- staleness -----------------------------------------------------------------------

// Three groups, not two: undated is unknown, and collapsing it into "fresh" or "stale"
// would invent information the corpus does not have.
export function staleJobs(jobs = [], now = Date.now(), days = 30) {
  const fresh = [];
  const stale = [];
  const undated = [];
  for (const j of jobs || []) {
    const s = isStale(j.postedAt, now, days);
    if (s === null) undated.push(j);
    else if (s) stale.push(j);
    else fresh.push(j);
  }
  return { fresh, stale, undated };
}

// --- snapshot history ----------------------------------------------------------------

export const MEMORY_KEY = "avsar-market-history-v1";
const MEMORY_CAP = 60;

// One entry per calendar day, so a re-rendering page cannot spam history and a second
// snapshot taken a minute later does not pretend to be a trend.
export function nextMemory(memory = [], jobs = [], now = Date.now()) {
  const at = toIso(now, now);
  const day = at.slice(0, 10);
  const entry = { at, lanes: {} };
  for (const lane of ["tech", "ayush"]) {
    const corpus = corpusForLane(jobs, lane);
    if (!corpus.length) continue;
    const perSkill = {};
    for (const j of corpus) for (const s of skillsOf(j)) perSkill[s] = (perSkill[s] || 0) + 1;
    entry.lanes[lane] = { total: corpus.length, perSkill };
  }
  const kept = (memory || []).filter((e) => String(e?.at || "").slice(0, 10) !== day);
  return [...kept, entry].slice(-MEMORY_CAP);
}

export function marketMemory() {
  const m = loadJSON(MEMORY_KEY, []);
  return Array.isArray(m) ? m : [];
}

export function recordSnapshot(jobs = [], now = Date.now()) {
  const next = nextMemory(marketMemory(), jobs, now);
  saveJSON(MEMORY_KEY, next);
  return next;
}
