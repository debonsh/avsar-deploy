// The wire: job news built from the corpus on this device rather than from a
// news API. A headline nobody can reproduce is a headline nobody should defend,
// the demo runs with no network and no key, and a scraping feed would go stale
// between the pitch and the demo. So every item here is a counted fact about
// postings already in hand, and each one carries the evidence that produced it.
// Items with a real date sort by it, newest first; undated ones follow in the
// order their evidence ranks them, never pretending to a timestamp.
import { toMs, daysSince } from "./dates.js";
import { skillById } from "../data/taxonomy.js";
import {
  corpusForLane, sourceOf, marketIndex, trendFor,
  postingVolume, freshnessBands, companyDemand, salaryBand,
} from "./market.js";


// Public vacancy notices, the only postings whose source is a government office
// rather than a job board. Matched on the apply host so a curated seed row and a
// scraped row are treated the same way.
const OFFICIAL = /(\.gov\.in|\.nic\.in|\.ac\.in|\.gov)$/i;

export function isOfficial(job = {}) {
  try {
    return OFFICIAL.test(new URL(String(job.apply || "")).hostname);
  } catch {
    return false;
  }
}

// Board and portal names read as proper nouns; the corpus stores them as slugs.
const SOURCE_LABEL = {
  gh: "Greenhouse",
  lever: "Lever",
  ashby: "Ashby",
  remotive: "Remotive",
  arbeitnow: "Arbeitnow",
  naukri: "Naukri",
  ncs: "NCS",
};

export function sourceLabel(src = "") {
  const k = String(src || "");
  return SOURCE_LABEL[k] || (k ? k.charAt(0).toUpperCase() + k.slice(1) : "unknown");
}

const titleCase = (s = "") =>
  String(s || "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();

// "today" / "yesterday" / "12 days ago", or null when the posting is undated.
// Never rounds a missing date into "just now".
export function agoLabel(iso, now = Date.now()) {
  const d = daysSince(iso, now);
  if (d == null) return null;
  const n = Math.floor(d);
  if (n <= 0) return "today";
  if (n === 1) return "yesterday";
  if (n < 30) return `${n} days ago`;
  const months = Math.floor(n / 30);
  return months === 1 ? "a month ago" : `${months} months ago`;
}

// The newest dated postings, which is the literal job news in this corpus.
export function latestPostings(jobs = [], { now = Date.now(), limit = 6 } = {}) {
  return (jobs || [])
    .map((job) => ({ job, ms: toMs(job.postedAt, now) }))
    .filter((r) => r.ms != null)
    .sort((a, b) => b.ms - a.ms)
    .slice(0, limit)
    .map(({ job, ms }) => ({
      id: String(job.id ?? `${job.company}-${job.title}`),
      title: job.title || "Untitled role",
      company: job.company || "Undisclosed employer",
      loc: job.loc || "Location not stated",
      role: titleCase(job.role) || "Unlabelled",
      src: sourceLabel(sourceOf(job)),
      official: isOfficial(job),
      at: new Date(ms).toISOString(),
      ago: agoLabel(new Date(ms).toISOString(), now),
      salary: salaryBand(job),
      job,
    }));
}

// Government and institution notices: the AYUSH lane's real hiring channel, and
// the one source a placement officer can act on without an ATS account.
export function officialNotices(jobs = [], { now = Date.now(), limit = 5 } = {}) {
  return (jobs || [])
    .filter(isOfficial)
    .map((job) => ({ job, ms: toMs(job.postedAt, now) }))
    .sort((a, b) => (b.ms ?? -1) - (a.ms ?? -1))
    .slice(0, limit)
    .map(({ job, ms }) => ({
      id: String(job.id ?? `${job.company}-${job.title}`),
      title: job.title || "Vacancy notice",
      company: job.company || "Government body",
      loc: job.loc || "India",
      at: ms == null ? null : new Date(ms).toISOString(),
      ago: ms == null ? null : agoLabel(new Date(ms).toISOString(), now),
      apply: job.apply || null,
      job,
    }));
}

// The feed. Each item names what it counted, so a judge who doubts a line can see
// the number and the sample it came from. `tone` maps to a badge: green for
// fresh and rising, amber for cooling, stale and thin samples, zinc for context.
export function wireItems(jobs = [], memory = [], { now = Date.now(), lane = null, limit = 14 } = {}) {
  const corpus = lane ? corpusForLane(jobs, lane) : jobs || [];
  const laneKey = lane || "tech";
  const items = [];
  const stats = { total: corpus.length, dated: corpus.filter((j) => toMs(j.postedAt, now) != null).length };
  stats.undated = stats.total - stats.dated;

  if (!corpus.length) {
    return [{
      id: "empty",
      kind: "empty",
      tone: "amber",
      at: null,
      headline: "No postings in this lane yet",
      detail: "Nothing can be reported until this lane has a corpus. The bundled seed is what the market reads offline.",
      evidence: null,
    }];
  }

  for (const p of latestPostings(corpus, { now, limit: 4 })) {
    items.push({
      id: `new-${p.id}`,
      kind: "opening",
      tone: "green",
      at: p.at,
      headline: `${p.company} opened ${p.title}`,
      detail: [p.loc, p.role, p.salary?.band || null].filter(Boolean).join(" · "),
      meta: `${p.ago} · via ${p.src}`,
      evidence: { kind: "posting", id: p.id },
      job: p.job,
    });
  }

  const volume = postingVolume(corpus, { now, weeks: 8 });
  const half = Math.max(1, Math.floor(volume.buckets.length / 2));
  if (volume.recent || volume.prior) {
    const delta = volume.recent - volume.prior;
    items.push({
      id: "volume",
      kind: "volume",
      tone: delta >= 0 ? "green" : "amber",
      at: null,
      headline:
        delta === 0
          ? `Hiring is flat: ${volume.recent} postings in the last ${half} weeks`
          : `Hiring is ${delta > 0 ? "up" : "down"} ${Math.abs(delta)} on the previous ${half} weeks`,
      detail: `${volume.recent} postings in the last ${half} weeks against ${volume.prior} before that, from ${stats.dated} dated postings.`,
      evidence: { kind: "volume", recent: volume.recent, prior: volume.prior, sample: stats.total },
      chart: { buckets: volume.buckets },
    });
  }

  const top = companyDemand(corpus, 1)[0];
  if (top && top.postings > 1) {
    items.push({
      id: "employer",
      kind: "employer",
      tone: "zinc",
      at: top.freshestAt,
      headline: `${top.company} is the busiest employer here, with ${top.postings} openings`,
      detail: top.top.length
        ? `Mostly ${top.top.map((t) => skillById(t.skill)?.name || t.skill).join(", ")}${top.locs.length ? ` · ${top.locs.join(", ")}` : ""}`
        : top.locs.join(", ") || "No location stated",
      evidence: { kind: "employer", company: top.company, postings: top.postings, sample: stats.total },
    });
  }

  const { shifts } = marketIndex(corpus, { now });
  const ranked = shifts.filter((s) => trendFor(s.skill, corpus, memory, { now, lane: laneKey }) !== "unknown").slice(0, 3);
  for (const s of ranked) {
    const trend = trendFor(s.skill, corpus, memory, { now, lane: laneKey });
    const name = skillById(s.skill)?.name || s.skill;
    items.push({
      id: `skill-${s.skill}`,
      kind: "skill",
      tone: trend === "rising" ? "green" : trend === "cooling" ? "amber" : "zinc",
      at: null,
      headline:
        trend === "rising" ? `${name} is picking up`
          : trend === "cooling" ? `${name} is cooling off`
            : `${name} is steady`,
      detail: `Asked for by ${s.postings} of ${stats.total} postings, worth ${s.weight.toFixed(2)}x in a fit score.`,
      evidence: { kind: "skill", skill: s.skill, postings: s.postings, sample: stats.total, trend },
    });
  }

  const notices = officialNotices(corpus, { now, limit: 2 });
  for (const n of notices) {
    items.push({
      id: `notice-${n.id}`,
      kind: "notice",
      tone: "sky",
      at: n.at,
      headline: `Official notice: ${n.company}`,
      detail: `${n.title}${n.loc ? ` · ${n.loc}` : ""}`,
      meta: n.ago ? `posted ${n.ago}` : "no date on the notice",
      evidence: { kind: "notice", id: n.id },
      href: n.apply,
    });
  }

  const bands = freshnessBands(corpus, now);
  if (bands.older) {
    items.push({
      id: "stale",
      kind: "stale",
      tone: "amber",
      at: null,
      headline: `${bands.older} posting${bands.older === 1 ? " is" : "s are"} older than 30 days`,
      detail: "The feed marks these rather than hiding them, so nobody spends an evening on a closed role.",
      evidence: { kind: "staleness", older: bands.older, sample: stats.total },
    });
  }
  if (bands.undated) {
    items.push({
      id: "undated",
      kind: "undated",
      tone: "amber",
      at: null,
      headline: `${bands.undated} posting${bands.undated === 1 ? " carries" : "s carry"} no date at all`,
      detail: "They still count toward demand, because a posting with no date is still a posting. They never count toward trend.",
      evidence: { kind: "completeness", undated: bands.undated, sample: stats.total },
    });
  }

  const snaps = (memory || []).length;
  items.push({
    id: "history",
    kind: "history",
    tone: "zinc",
    at: null,
    headline: snaps < 2
      ? `${snaps} snapshot stored on this device`
      : `${snaps} snapshots stored, so movement is measured rather than inferred`,
    detail:
      snaps < 2
        ? "A second day of history is what turns a share into a direction. Until then the trend column says so instead of guessing."
        : "Share movement is compared against the first snapshot on this device, so the direction is a measurement.",
    evidence: { kind: "history", snapshots: snaps },
  });

  const sorted = items.sort((a, b) => {
    if (a.at && b.at) return toMs(b.at, now) - toMs(a.at, now);
    if (a.at) return -1;
    if (b.at) return 1;
    return 0;
  });
  return limit ? sorted.slice(0, limit) : sorted;
}
