// Career GPS: the path from what a student holds to a target role, computed as a
// route rather than listed as courses. Two ideas do the work.
//
// The skill graph is traversed. Taxonomy `related[]` edges say one skill is reachable
// from another, so a gap two hops from something the student already has is cheaper to
// close than one with no path at all, and the route says which.
//
// The unlocks are earned, not asserted. A step only claims to unlock a posting if
// scoring that posting with the skill added actually clears its own minScore, using the
// same matchJobPost the feed uses. So the simulator cannot drift from the engine, and a
// route can never promise a job the engine would not have offered.
import { SKILLS, TAXONOMY_ROLES, canonSkill, skillById, requiredFor } from "../data/taxonomy.js";
import { PROGRAMS } from "../data/programs.js";
import { TECH_PROGRAMS } from "../data/techPrograms.js";
import { matchJobPost } from "./match.js";
import { corpusForLane, skillsOf } from "./market.js";

// Every posting states its own bar. This is the fallback for one that does not.
const DEFAULT_MIN = 40;

export const minScoreOf = (job) => {
  const n = Number(job?.minScore);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MIN;
};

// --- graph ---------------------------------------------------------------------------

// Undirected adjacency from `related[]`: "react is related to javascript" is the same
// knowledge as the reverse. Edges to ids the taxonomy does not know are dropped rather
// than invented as nodes. Derived data, so callers memoise it; caching at module scope
// would outlive a taxonomy edit.
export function skillGraph() {
  const g = new Map();
  for (const skill of SKILLS) {
    const own = g.get(skill.id) || new Set();
    for (const raw of skill.related || []) {
      const other = canonSkill(raw);
      if (!other || other === skill.id || !skillById(other)) continue;
      own.add(other);
      const back = g.get(other) || new Set();
      back.add(skill.id);
      g.set(other, back);
    }
    g.set(skill.id, own);
  }
  return g;
}

// Roles are derived from the taxonomy, never listed twice here: a role belongs to a lane
// by its domain, so adding one to taxonomy.js is enough to make it reachable.
export function rolesForLane(lane = "tech") {
  const want = lane === "ayush" ? "ayush" : "tech";
  const isAyush = (domain = "") => String(domain).startsWith("ayush");
  return Object.entries(TAXONOMY_ROLES)
    .filter(([, r]) => (want === "ayush" ? isAyush(r.domain) : !isAyush(r.domain)))
    .map(([id, r]) => ({ id, label: r.label, domain: r.domain, tags: r.tags || [], required: r.required }));
}

// One breadth-first walk from every held skill at once, returning both the distance to
// each reachable skill and which held skill the walk arrived from. The `via` map is what
// lets a route say "one step from react" without recomputing a search per gap.
export function hopDistances(held = [], graph = skillGraph()) {
  const dist = new Map();
  const via = new Map();
  const queue = [];
  for (const raw of held) {
    const k = canonSkill(raw);
    if (!k || dist.has(k)) continue;
    dist.set(k, 0);
    via.set(k, k);
    queue.push(k);
  }
  for (let i = 0; i < queue.length; i++) {
    const cur = queue[i];
    const d = dist.get(cur);
    const root = via.get(cur);
    for (const next of graph.get(cur) || []) {
      if (dist.has(next)) continue;
      dist.set(next, d + 1);
      via.set(next, root);
      queue.push(next);
    }
  }
  return { dist, via };
}

// --- programmes ----------------------------------------------------------------------

const programsForLane = (lane) => (lane === "ayush" ? PROGRAMS : TECH_PROGRAMS);

// The courses that actually close a gap, with the hours they cost, cheapest first.
// Effort is expressed in course hours and never as a calendar promise, because a
// calendar promise is a claim about someone's life that a hackathon has no business making.
export function programsForSkill(skill = "", lane = "tech") {
  const k = canonSkill(skill);
  if (!k) return [];
  return programsForLane(lane)
    .filter((p) => (p.skills || []).includes(k))
    .map((p) => ({ id: p.id, title: p.title, provider: p.provider, hours: p.hours, kind: p.kind, url: p.url, cert: Boolean(p.cert) }))
    .sort((a, b) => (a.hours || 0) - (b.hours || 0) || a.title.localeCompare(b.title));
}

// Total effort for a route. `known` counts steps a listed course covers, `unknown` the
// ones nothing in the catalogue teaches, so the page can say the hours are unknown
// instead of quietly reporting a smaller number than the work actually is.
export function effortHours(steps = [], lane = "tech") {
  let hours = 0;
  let known = 0;
  let unknown = 0;
  for (const step of steps) {
    const list = step.programs?.length ? step.programs : programsForSkill(step.skill, lane);
    const cheapest = list.reduce((m, p) => (m == null || (p.hours || 0) < m ? p.hours || 0 : m), null);
    if (cheapest == null) unknown++;
    else {
      hours += cheapest;
      known++;
    }
  }
  return { hours, known, unknown };
}

// --- scoring --------------------------------------------------------------------------

// The one place the engine is called for a set of postings. `add` grafts skills onto the
// held profile, so the route and the simulator both ask the engine the same question and
// cannot answer it two ways.
function profileWith(held = {}, add = []) {
  const skills = [...(held.skills || [])];
  const levels = { ...(held.levels || {}) };
  const verified = [...(held.verified || [])];
  const usedAt = { ...(held.usedAt || {}) };
  for (const a of add || []) {
    const k = canonSkill(a.skill);
    if (!k) continue;
    if (!skills.includes(k)) skills.push(k);
    levels[k] = Math.max(Number(levels[k]) || 0, Number(a.level) || 3);
    if (a.verified && !verified.includes(k)) verified.push(k);
    usedAt[k] = usedAt[k] || Date.now();
  }
  return { skills, levels, verified, usedAt, interests: held.interests || [] };
}

export function scoreCorpus(jobs = [], held = {}, market = null, add = []) {
  const profile = profileWith(held, add);
  return (jobs || [])
    .map((job) => ({ job, fit: matchJobPost(job, profile, market) }))
    .filter((r) => r.fit);
}

// Eligible, average fit and the eligible postings themselves, from one scoring pass.
function summarise(scored = [], threshold = 0) {
  const bar = (job) => Math.max(minScoreOf(job), Number(threshold) || 0);
  const eligible = scored.filter((r) => r.fit.score >= bar(r.job));
  return {
    total: scored.length,
    eligible: eligible.length,
    avgFit: scored.length ? Math.round(scored.reduce((a, r) => a + r.fit.score, 0) / scored.length) : 0,
    avgEligibleFit: eligible.length ? Math.round(eligible.reduce((a, r) => a + r.fit.score, 0) / eligible.length) : 0,
    jobs: eligible.map((r) => r.job),
  };
}

// What-if: graft skills onto the profile and re-score the lane corpus. This answers
// "what does learning this actually unlock", so before and after both come from the
// engine rather than from arithmetic layered on top of it.
export function simulate({ add = [], held = {}, jobs = [], lane = "tech", market = null, threshold = 0 } = {}) {
  const corpus = corpusForLane(jobs, lane);
  const scoredBefore = scoreCorpus(corpus, held, market);
  const scoredAfter = scoreCorpus(corpus, held, market, add);
  const before = summarise(scoredBefore, threshold);
  const after = summarise(scoredAfter, threshold);
  const beforeIds = new Set(before.jobs.map((j) => String(j.id)));
  const afterIds = new Set(after.jobs.map((j) => String(j.id)));
  return {
    lane,
    before,
    after,
    deltaEligible: after.eligible - before.eligible,
    deltaFit: after.avgFit - before.avgFit,
    unlocked: after.jobs.filter((j) => !beforeIds.has(String(j.id))),
    locked: before.jobs.filter((j) => !afterIds.has(String(j.id))),
  };
}

// --- the route ------------------------------------------------------------------------

// Ordering is unlocks per hop. A step that opens five postings in one hop beats one that
// opens six from nowhere, because the six also cost every skill in between. A step with
// no path is still listed, ranked last, and says it is a fresh start.
export function routeTo(targetRoleId = "", held = {}, { jobs = [], lane = "tech", market = null, limit = 8 } = {}) {
  const role = TAXONOMY_ROLES[targetRoleId];
  if (!role) return { role: null, steps: [], effort: { hours: 0, known: 0, unknown: 0 }, lane, baseEligible: 0, totalGaps: 0 };
  const corpus = corpusForLane(jobs, lane);
  const levels = held.levels || {};
  const have = (held.skills || []).map(canonSkill).filter(Boolean);
  const { dist, via } = hopDistances(have, skillGraph());

  const base = scoreCorpus(corpus, held, market);
  const baseEligible = new Set(base.filter((r) => r.fit.score >= minScoreOf(r.job)).map((r) => String(r.job.id)));

  const gaps = requiredFor(targetRoleId).filter((r) => (Number(levels[r.skill]) || 0) < r.level);
  const steps = gaps.map((gap) => {
    // Only postings that require the skill can move: the engine counts required skills
    // only, so scoring the rest is wasted work with a known answer. This keeps a whole
    // route to one cheap pass per step instead of a corpus sweep.
    const candidates = base.filter((r) => skillsOf(r.job).includes(gap.skill));
    const after = scoreCorpus(candidates.map((r) => r.job), held, market, [{ skill: gap.skill, level: gap.level }]);
    const opened = after.filter((r) => r.fit.score >= minScoreOf(r.job) && !baseEligible.has(String(r.job.id)));
    const hops = dist.has(gap.skill) ? dist.get(gap.skill) : Infinity;
    const fromSkill = hops > 0 && hops < Infinity ? via.get(gap.skill) || null : null;
    const programs = programsForSkill(gap.skill, lane);
    return {
      skill: gap.skill,
      name: gap.name || skillById(gap.skill)?.name || gap.skill,
      need: gap.level,
      have: Number(levels[gap.skill]) || 0,
      hops,
      fromSkill,
      unlocks: opened.length,
      postings: opened.map((r) => r.job),
      programs,
      rank: opened.length / ((hops === Infinity ? 12 : hops) + 1),
      reason: reasonFor({ unlocks: opened.length, hops, fromSkill, programs: programs.length, lane }),
    };
  });

  steps.sort((a, b) => b.rank - a.rank || b.unlocks - a.unlocks || a.hops - b.hops || a.skill.localeCompare(b.skill));
  const kept = limit ? steps.slice(0, limit) : steps;
  return {
    role: { id: targetRoleId, label: role.label, domain: role.domain, tags: role.tags || [] },
    steps: kept,
    effort: effortHours(kept, lane),
    lane,
    baseEligible: baseEligible.size,
    totalGaps: steps.length,
  };
}

function reasonFor({ unlocks, hops, fromSkill, programs, lane }) {
  const where = lane === "ayush" ? "ayush" : "tech";
  const parts = [];
  if (hops === 0) parts.push("you hold this below the level this role wants, so it is a levelling up rather than a new skill");
  else if (hops === 1 && fromSkill) parts.push(`one step from ${fromSkill}`);
  else if (hops < Infinity && fromSkill) parts.push(`${hops} steps from ${fromSkill}`);
  else parts.push("no route from your current skills, so this is a fresh start");
  parts.push(
    unlocks > 0
      ? `unlocks ${unlocks} ${where} posting${unlocks === 1 ? "" : "s"} this profile does not reach today`
      : "unlocks nothing yet at the level this role wants"
  );
  parts.push(programs ? "a listed course covers it" : "no listed course covers it, so the hours are unknown");
  return parts.join("; ");
}

// The gap list for a role with no corpus at all: what the Improve tab can show before it
// knows anything about the market.
export function gapList(targetRoleId = "", held = {}) {
  const levels = held.levels || {};
  return requiredFor(targetRoleId)
    .map((r) => ({ skill: r.skill, name: r.name, need: r.level, have: Number(levels[r.skill]) || 0 }))
    .filter((r) => r.have < r.need)
    .sort((a, b) => (b.need - b.have) - (a.need - a.have) || a.skill.localeCompare(b.skill));
}
