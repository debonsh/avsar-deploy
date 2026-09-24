// The District Skill Thermometer: the same corpus that moves a student's score, read as a
// planning instrument for a placement cell. What a principal needs is not a student record
// but a count of unmet local demand, and what a district officer needs is a figure they can
// trust without seeing anybody's data.
//
// Two rules are enforced here rather than left to a caller's discipline. Figures never mix
// lanes, because an ayurveda cohort and an engineering cohort in one bar would describe a
// job market that does not exist. And any bucket too small to be anonymous is withheld
// visibly, so a reader can tell the difference between "no demand" and "we are not allowed
// to say".
import { canonSkill, skillById } from "../data/taxonomy.js";
import { skillsOf } from "./market.js";

export const DEFAULT_K = 5;

// Demand per city, with the skills each city is actually asking for. Cities are the raw
// strings the postings carry, so nothing is guessed into a district it did not name.
export function districtDemand(jobs = [], { limit = 12 } = {}) {
  const byCity = new Map();
  for (const job of jobs || []) {
    const city = String(job?.loc || "unknown").trim() || "unknown";
    const entry = byCity.get(city) || { city, total: 0, skills: new Map() };
    entry.total++;
    for (const skill of skillsOf(job)) entry.skills.set(skill, (entry.skills.get(skill) || 0) + 1);
    byCity.set(city, entry);
  }
  return [...byCity.values()]
    .map((e) => ({
      city: e.city,
      total: e.total,
      skills: [...e.skills]
        .map(([skill, count]) => ({ skill, name: skillById(skill)?.name || skill, count }))
        .sort((a, b) => b.count - a.count || a.skill.localeCompare(b.skill)),
    }))
    .sort((a, b) => b.total - a.total || a.city.localeCompare(b.city))
    .slice(0, limit);
}

// Demand minus the verified supply that could meet it. Supply arrives either as a Map or a
// plain object keyed by whatever the caller had to hand, so both sides are canonicalised
// into one table first: a supply written as "Power BI" and a demand written as "power-bi"
// are the same skill, and a lookup that only matched exact strings would report demand as
// unmet when it was already met.
export function unmetDemand(demand = [], supply = {}) {
  const table = new Map();
  const entries = supply instanceof Map ? supply.entries() : Object.entries(supply || {});
  for (const [key, value] of entries) table.set(canonSkill(key), Number(value) || 0);
  const held = (skill) => table.get(canonSkill(skill)) || 0;
  const rows = [];
  for (const city of demand || []) {
    for (const s of city.skills || []) {
      const have = held(s.skill);
      rows.push({
        city: city.city,
        skill: s.skill,
        name: s.name || skillById(s.skill)?.name || s.skill,
        demand: s.count,
        supply: have,
        unmet: Math.max(0, s.count - have),
      });
    }
  }
  return rows.sort((a, b) => b.unmet - a.unmet || b.demand - a.demand || a.skill.localeCompare(b.skill));
}

// How many training batches close each gap. Rounded up, because a batch of twenty that
// trains eighteen people has not closed the gap, and reporting it as though it had is how a
// plan starts lying in its second week.
//
// A batch size that is missing, zero or negative is not a plan, so it falls back to the
// default rather than to one: the intent of `0` is "I did not think about this", and the
// useful answer to that is the normal class size, not a class of one.
export const DEFAULT_BATCH = 20;

export function capacityPlan(unmet = [], { batchSize = DEFAULT_BATCH, city = null } = {}) {
  const raw = Number(batchSize);
  const size = Number.isFinite(raw) && raw > 0 ? Math.max(1, Math.floor(raw)) : DEFAULT_BATCH;
  const scoped = city ? unmet.filter((u) => u.city === city) : unmet;
  const bySkill = new Map();
  for (const row of scoped) {
    const entry = bySkill.get(row.skill) || { skill: row.skill, name: row.name, unmet: 0, cities: [] };
    entry.unmet += row.unmet;
    if (row.city && !entry.cities.includes(row.city)) entry.cities.push(row.city);
    bySkill.set(row.skill, entry);
  }
  return [...bySkill.values()]
    .filter((e) => e.unmet > 0)
    .map((e) => ({ ...e, batchSize: size, batches: Math.ceil(e.unmet / size) }))
    .sort((a, b) => b.unmet - a.unmet || a.skill.localeCompare(b.skill));
}

// k-anonymity. A bucket with fewer than k records is withheld, and withheld loudly: the
// suppressed list carries its own counts so the reader sees that something was removed and
// roughly how much. Suppressing silently would turn a privacy control into a lie about the
// size of the demand.
export function privacyAggregate(rows = [], k = DEFAULT_K) {
  const list = rows || [];
  const lanes = new Set(list.map((r) => r?.lane).filter(Boolean));
  if (lanes.size > 1) {
    return {
      buckets: [],
      suppressed: [],
      k,
      error: `refused: this holds ${lanes.size} lanes (${[...lanes].join(", ")}) and one figure must never mix them`,
    };
  }
  const threshold = Math.max(1, Number(k) || DEFAULT_K);
  const buckets = [];
  const suppressed = [];
  for (const row of list) {
    const count = Number(row?.count) || 0;
    const key = String(row?.key ?? "");
    if (count >= threshold) buckets.push({ ...row, count });
    else suppressed.push({ key, count, reason: `below k=${threshold}, so it is withheld to protect the people in it` });
  }
  return {
    buckets: buckets.sort((a, b) => b.count - a.count || String(a.key).localeCompare(String(b.key))),
    suppressed,
    k: threshold,
    error: null,
    total: list.length,
    suppressedCount: suppressed.reduce((a, s) => a + s.count, 0),
  };
}
