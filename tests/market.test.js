// node --test: the market layer. Demand is measured, never invented: sample sizes travel
// with every number, unobserved skills stay neutral, and undated stays unknown.
import { test } from "node:test";
import assert from "node:assert/strict";
import { demandWeight } from "../src/data/taxonomy.js";
import {
  laneOfJob, skillsOf, hasSkill, corpusForLane, sourceOf, corpusStats, salaryBand,
  marketIndex, blendedWeight, effectiveWeights, marketSignals, trendFromDates,
  trendFromMemory, trendFor, staleJobs, nextMemory, WEIGHT_MIN, WEIGHT_MAX,
  postingVolume, freshnessBands, companyDemand, skillSeries, activityDigest,
} from "../src/lib/market.js";

const NOW = Date.parse("2026-09-23T12:00:00.000Z");
const DAY = 86400000;
const ago = (days) => new Date(NOW - days * DAY).toISOString();
const blend = (prior, live) => Math.round(Math.min(WEIGHT_MAX, Math.max(WEIGHT_MIN, 0.5 * prior + 0.5 * live)) * 1000) / 1000;

const tech = (skills, extra = {}) => ({ id: `t-${nextId()}`, lane: "tech", role: "sde", loc: "Remote", src: "gh", skills, ...extra });
const ayush = (skills, extra = {}) => ({ id: `a-${nextId()}`, role: "ayush", loc: "Pune", apply: "https://ccras.nic.in/x", skills, ...extra });
let seq = 0;
function nextId() {
  return ++seq;
}

test("laneOfJob trusts the tag, then infers from the role", () => {
  assert.equal(laneOfJob({ lane: "tech", role: "ayush" }), "tech", "an explicit tag wins");
  assert.equal(laneOfJob({ role: "ayush" }), "ayush");
  assert.equal(laneOfJob({ role: "data" }), "tech");
  assert.equal(laneOfJob({}), "tech", "unlabelled rows count as tech, like the rest of the corpus");
});

test("corpusForLane keeps the portals apart, and a sub-lane reads the tech market", () => {
  const jobs = [tech(["react"]), tech(["sql"], { role: "data" }), ayush(["panchakarma"])];
  assert.equal(corpusForLane(jobs, "ayush").length, 1);
  assert.equal(corpusForLane(jobs, "tech").length, 2);
  assert.equal(corpusForLane(jobs, "sde").length, 2, "a tech sub-lane is scored against the tech market");
  assert.equal(corpusForLane([], "ayush").length, 0);
});

test("skillsOf canonicalizes, dedupes and drops junk", () => {
  assert.deepEqual(skillsOf({ skills: ["React", "react", "GCP", "", null, "unknown-thing"] }), ["react", "research", "unknown-thing"]);
  assert.equal(hasSkill({ skills: ["Power BI"] }, "power bi"), true);
  assert.equal(hasSkill({ skills: ["react"] }, "sql"), false);
  assert.equal(hasSkill({}, "react"), false);
});

test("sourceOf prefers the declared source and falls back to the apply host", () => {
  assert.equal(sourceOf({ src: "gh", apply: "https://stripe.com/x" }), "gh");
  assert.equal(sourceOf({ apply: "https://ccras.nic.in/vacancies" }), "ccras");
  assert.equal(sourceOf({ apply: "https://www.ncs.gov.in/" }), "ncs");
  assert.equal(sourceOf({ apply: "#" }), "unknown", "no host is not a guess");
  assert.equal(sourceOf({}), "unknown");
});

test("corpusStats reports the sample honestly, including what is undated", () => {
  const jobs = [
    tech(["react"], { postedAt: ago(1) }),
    tech(["react", "sql"], { postedAt: ago(40) }),
    ayush(["panchakarma"]),
  ];
  const s = corpusStats(jobs, NOW);
  assert.equal(s.total, 3);
  assert.equal(s.dated, 2);
  assert.equal(s.undated, 1);
  assert.equal(s.freshestAt, ago(1));
  assert.deepEqual(s.bySource, [{ key: "gh", count: 2 }, { key: "ccras", count: 1 }]);
  assert.equal(s.byRole.find((r) => r.key === "ayush").count, 1);
  assert.equal(corpusStats([], NOW).freshestAt, null, "an empty corpus makes no freshness claim");
});

test("salaryBand parses annual bands, refuses everything ambiguous", () => {
  assert.deepEqual(salaryBand({ salary: "3-4 Lacs PA" }), { min: 300000, max: 400000, unit: "year", currency: "INR", band: "₹3L to ₹4L a year", raw: "3-4 Lacs PA" });
  assert.equal(salaryBand({ salary: "3.75 Lacs PA" }).band, "₹3.75L a year");
  assert.equal(salaryBand({ salary: "$70k - $90k" }).band, "$70k to $90k a year");
  assert.equal(salaryBand({ salary: "$70k - $90k" }).currency, "USD");
  assert.deepEqual(salaryBand({ stipend: "₹37,000 + HRA" }), null, "a monthly stipend is not an annual band");
  for (const raw of ["Not disclosed", "unpaid · certificate", "self-financed · 65 seats", "2.3.5…", "negotiable", "", "₹50,000 scholarship"]) {
    assert.equal(salaryBand({ salary: raw }), null, `${JSON.stringify(raw)} must not become a band`);
  }
});

test("marketIndex on an empty corpus is empty, not a crash", () => {
  const idx = marketIndex([], { now: NOW });
  assert.equal(idx.weights.size, 0);
  assert.equal(idx.shifts.length, 0);
  assert.deepEqual([idx.sample.total, idx.sample.dated, idx.sample.undated], [0, 0, 0]);
  assert.equal(blendedWeight("react", idx), null);
});

test("a skill seen fewer than minPostings times earns no weight, it stays neutral", () => {
  const jobs = [tech(["react"]), tech(["react"]), tech(["react"]), tech(["sql"]), tech(["sql"])];
  const idx = marketIndex(jobs, { now: NOW, minPostings: 3 });
  assert.equal(idx.weights.has("sql"), false);
  assert.equal(blendedWeight("sql", idx), null, "two postings do not move a score");
  assert.equal(idx.sample.lowSample, 1);
  const loose = marketIndex(jobs, { now: NOW, minPostings: 1 });
  assert.equal(loose.weights.has("sql"), true, "the floor is a knob, not a hard rule");
});

test("the index blends the live share with the published prior, inside the band", () => {
  const jobs = Array.from({ length: 6 }, () => tech(["react", "sql"]));
  const idx = marketIndex(jobs, { now: NOW });
  const react = idx.shifts.find((s) => s.skill === "react");
  assert.equal(react.live, WEIGHT_MAX, "the most requested skill earns the top of the band");
  assert.equal(react.weight, blend(demandWeight("react"), WEIGHT_MAX));
  assert.equal(react.prior, demandWeight("react"), "the published prior is shown, not hidden");
  for (const s of idx.shifts) {
    assert.ok(s.weight >= WEIGHT_MIN && s.weight <= WEIGHT_MAX, `${s.skill} escaped the band: ${s.weight}`);
  }
});

test("a dominant skill outweighs a scarce one, and aliases resolve to one key", () => {
  const jobs = [
    ...Array.from({ length: 5 }, () => tech(["react"])),
    ...Array.from({ length: 3 }, () => tech(["Power BI"])),
  ];
  const idx = marketIndex(jobs, { now: NOW });
  const react = idx.weights.get("react");
  const powerBi = idx.weights.get("power-bi");
  assert.ok(react > powerBi, `react ${react} should outweigh power bi ${powerBi}`);
  assert.equal(blendedWeight("Power BI", idx), powerBi, "the same skill by any name");
  assert.equal(blendedWeight("GCP", idx), blendedWeight("research", idx));
});

test("effectiveWeights carries its own evidence: sources, freshness, sample", () => {
  const jobs = [tech(["react"], { postedAt: ago(2) }), tech(["react"], { postedAt: ago(4) }), tech(["react"], { postedAt: ago(6) }), ayush(["panchakarma"])];
  const eff = effectiveWeights(jobs, { now: NOW, lane: "tech" });
  assert.equal(eff.weights.get("react") > 1, true);
  assert.equal(eff.freshestAt, ago(2));
  assert.deepEqual(eff.sources, [{ key: "gh", count: 3 }]);
  assert.equal(eff.sample.dated, 3);
  assert.equal(eff.sample.total, 3, "the ayush posting is not part of the tech sample");
  assert.equal(eff.stats.total, 3);
  assert.equal(effectiveWeights(jobs, { now: NOW, lane: "ayush" }).sample.total, 1);
  assert.equal(effectiveWeights(jobs, { now: NOW }).sample.total, 4, "no lane means the corpus as given");
});

test("trendFromDates needs three dated postings before it names a direction", () => {
  const rising = [tech(["react"], { postedAt: ago(1) }), tech(["react"], { postedAt: ago(2) }), tech(["react"], { postedAt: ago(3) })];
  assert.equal(trendFromDates(rising, "react", { now: NOW }), "rising");
  const cooling = [tech(["react"], { postedAt: ago(20) }), tech(["react"], { postedAt: ago(25) }), tech(["react"], { postedAt: ago(28) })];
  assert.equal(trendFromDates(cooling, "react", { now: NOW }), "cooling");
  const flat = [tech(["react"], { postedAt: ago(1) }), tech(["react"], { postedAt: ago(2) }), tech(["react"], { postedAt: ago(20) }), tech(["react"], { postedAt: ago(25) })];
  assert.equal(trendFromDates(flat, "react", { now: NOW }), "stable");
  assert.equal(trendFromDates(rising.slice(0, 2), "react", { now: NOW }), "unknown", "two postings are not a direction");
  assert.equal(trendFromDates([ayush(["panchakarma"])], "panchakarma", { now: NOW }), "unknown", "an undated corpus cannot trend");
});

test("trendFromMemory takes over when the corpus has no dates, and needs two snapshots", () => {
  const one = nextMemory([], [tech(["react"]), tech(["sql"]), tech(["sql"]), tech(["sql"])], NOW - 2 * DAY);
  assert.equal(trendFromMemory("react", one, "tech"), "unknown", "one snapshot is not a trend");
  const two = nextMemory(one, [tech(["react"]), tech(["react"]), tech(["sql"]), tech(["sql"])], NOW);
  assert.equal(trendFromMemory("react", two, "tech"), "rising", "react went from a quarter to half of the corpus");
  const shrinking = nextMemory(two, [tech(["react"]), tech(["sql"]), tech(["sql"]), tech(["sql"]), tech(["sql"])], NOW + DAY);
  assert.equal(trendFromMemory("react", shrinking, "tech"), "cooling");
  assert.equal(trendFromMemory("react", two, "ayush"), "unknown", "lanes never share a trend");
});

test("trendFor prefers real dates and falls back to memory", () => {
  const dated = [tech(["react"], { postedAt: ago(1) }), tech(["react"], { postedAt: ago(2) }), tech(["react"], { postedAt: ago(3) })];
  assert.equal(trendFor("react", dated, [], { now: NOW, lane: "tech" }), "rising");
  const undated = [tech(["react"]), tech(["react"]), tech(["sql"]), tech(["sql"])];
  const first = nextMemory([], [tech(["react"]), tech(["sql"]), tech(["sql"]), tech(["sql"])], NOW - 2 * DAY);
  const memory = nextMemory(first, undated, NOW);
  assert.equal(trendFor("react", undated, memory, { now: NOW, lane: "tech" }), "rising");
  assert.equal(trendFor("react", undated, [], { now: NOW, lane: "tech" }), "unknown", "no dates and no history means no claim");
});

test("marketSignals ranks by weight, names the skill, and carries cities and sources", () => {
  const jobs = [
    tech(["react"], { postedAt: ago(1), loc: "Bengaluru", src: "gh" }),
    tech(["react"], { postedAt: ago(2), loc: "Bengaluru", src: "gh" }),
    tech(["react"], { postedAt: ago(3), loc: "Pune", src: "ashby" }),
    ayush(["panchakarma"], { postedAt: ago(1) }),
  ];
  const { rows, sample } = marketSignals(jobs, { now: NOW, lane: "tech" });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, "React");
  assert.equal(rows[0].trend, "rising");
  assert.deepEqual(rows[0].cities[0], { key: "Bengaluru", count: 2 });
  assert.deepEqual(rows[0].sources.map((s) => s.key).sort(), ["ashby", "gh"]);
  assert.equal(sample.total, 3, "the ayush posting is not part of the tech sample");
  assert.equal(marketSignals(jobs, { now: NOW }).sample.total, 4, "no lane means the corpus as given");
});

test("staleJobs separates fresh, stale and undated, and undated is never stale", () => {
  const fresh = tech(["react"], { postedAt: ago(2) });
  const old = tech(["react"], { postedAt: ago(90) });
  const none = ayush(["panchakarma"]);
  const { fresh: f, stale, undated } = staleJobs([fresh, old, none], NOW, 30);
  assert.deepEqual([f.length, stale.length, undated.length], [1, 1, 1]);
  assert.equal(stale[0], old);
  assert.equal(undated[0], none);
});

test("postingVolume buckets real dates by week and refuses to fold in the unknowns", () => {
  const jobs = [
    tech(["react"], { postedAt: ago(1) }),
    tech(["react"], { postedAt: ago(2) }),
    tech(["react"], { postedAt: ago(9) }),
    tech(["react"], { postedAt: ago(60) }),
    ayush(["panchakarma"]),
  ];
  const v = postingVolume(jobs, { now: NOW, weeks: 4 });
  assert.equal(v.buckets.length, 4);
  assert.equal(v.buckets.reduce((a, b) => a + b.count, 0), 3, "only postings inside the window are charted");
  assert.equal(v.older, 1, "a posting older than the window is counted, not absorbed");
  assert.equal(v.undated, 1);
  assert.equal(v.buckets[v.buckets.length - 1].count, 2, "the two from this week land in the last bucket");
  // The window splits in half: recent is the newer half of the buckets, prior the older
  // half, and the sentence the page prints reads exactly that way. Nine days ago falls
  // inside a two-week recent half, so it is recent, and the older half of this window is
  // genuinely empty. Asserting the buckets themselves keeps the split honest rather than
  // pinning two totals that a reader has to reverse-engineer.
  assert.deepEqual(v.buckets.map((b) => b.count), [0, 0, 1, 2]);
  assert.equal(v.recent, 3, "both this week and nine days ago sit in the newer half");
  assert.equal(v.prior, 0, "the older half of this window holds nothing");
  assert.equal(v.recent + v.prior, v.buckets.reduce((a, b) => a + b.count, 0), "the two halves account for every charted posting");
  assert.equal(postingVolume([], { now: NOW }).peak, 0, "an empty corpus peaks at zero, not NaN");
});

test("freshnessBands splits the corpus by real age, undated kept separate", () => {
  const jobs = [
    tech(["react"], { postedAt: ago(2) }),
    tech(["react"], { postedAt: ago(20) }),
    tech(["react"], { postedAt: ago(90) }),
    ayush(["gmp"]),
  ];
  assert.deepEqual(freshnessBands(jobs, NOW), { last7: 1, last30: 1, older: 1, undated: 1 });
  assert.deepEqual(freshnessBands([], NOW), { last7: 0, last30: 0, older: 0, undated: 0 });
});

test("companyDemand ranks employers from the postings themselves", () => {
  const jobs = [
    tech(["react", "sql"], { company: "Acme" }),
    tech(["react"], { company: "Acme", postedAt: ago(3) }),
    tech(["react"], { company: "Acme", postedAt: ago(1) }),
    tech(["react"], { company: "Beta" }),
    ayush(["gmp"], { company: "" }),
  ];
  const rows = companyDemand(jobs);
  assert.equal(rows[0].company, "Acme");
  assert.equal(rows[0].postings, 3);
  assert.equal(rows[0].freshestAt, ago(1));
  assert.deepEqual(rows[0].top[0], { skill: "react", n: 3 });
  assert.equal(rows.length, 2, "a posting with no employer is not an employer called empty string");
});

test("skillSeries counts one skill per week, and its own unknowns", () => {
  const jobs = [
    tech(["react"], { postedAt: ago(1) }),
    tech(["react", "sql"], { postedAt: ago(2) }),
    tech(["sql"], { postedAt: ago(2) }),
    tech(["react"]),
  ];
  const s = skillSeries(jobs, "react", { now: NOW, weeks: 3 });
  assert.equal(s.buckets.length, 3);
  assert.equal(s.buckets[2].count, 2);
  assert.equal(s.undated, 1, "the undated react posting is reported, not charted");
  assert.deepEqual(skillSeries(jobs, "Power BI", { now: NOW }).buckets.map((b) => b.count), [0, 0, 0, 0, 0, 0, 0, 0]);
});

test("activityDigest reads out the corpus and invents nothing", () => {
  const jobs = [
    tech(["react"], { company: "Acme", postedAt: ago(1) }),
    tech(["react"], { company: "Acme", postedAt: ago(2) }),
    tech(["react"], { company: "Acme", postedAt: ago(3) }),
    tech(["react", "sql"], { company: "Beta", postedAt: ago(40) }),
    ayush(["panchakarma"]),
  ];
  const lines = activityDigest(jobs, [], { now: NOW, lane: "tech" });
  const text = lines.map((l) => l.text).join(" ");
  assert.match(text, /5 postings tracked across 2 sources, 4 with a real posted date/);
  assert.match(text, /Acme accounts for the most openings/);
  assert.match(text, /older than 30 days/);
  assert.match(text, /1 posting carry no date at all/);
  assert.match(text, /1 snapshot stored|0 snapshot stored/);
  assert.ok(lines.every((l) => typeof l.tone === "string" && typeof l.kind === "string"));
  assert.ok(lines.length <= 10);

  const empty = activityDigest([], [], { now: NOW });
  assert.equal(empty.length, 1);
  assert.match(empty[0].text, /nothing to report/);
});

test("activityDigest says so when a corpus has no dates at all", () => {
  const lines = activityDigest([ayush(["gmp"]), ayush(["gmp"])], [], { now: NOW, lane: "ayush" });
  const text = lines.map((l) => l.text).join(" ");
  assert.match(text, /cannot be measured/, "no dated posting means no volume claim");
  assert.ok(!/days ago/.test(text), "no freshness claim without a date");
});

test("nextMemory stores one entry per day, splits by lane, and caps its history", () => {
  const jobs = [tech(["react"]), ayush(["panchakarma", "gmp"])];
  const one = nextMemory([], jobs, NOW);
  assert.equal(one.length, 1);
  assert.equal(one[0].lanes.tech.total, 1);
  assert.equal(one[0].lanes.ayush.total, 1);
  assert.deepEqual(one[0].lanes.ayush.perSkill, { panchakarma: 1, gmp: 1 });
  assert.equal(nextMemory(one, jobs, NOW + 3600000).length, 1, "a second snapshot the same day replaces the first");
  const nextDay = nextMemory(one, jobs, NOW + DAY);
  assert.equal(nextDay.length, 2);
  let many = [];
  for (let i = 0; i < 70; i++) many = nextMemory(many, jobs, NOW + i * DAY);
  assert.equal(many.length, 60, "history is capped");
  assert.equal(many[0].at < many[many.length - 1].at, true, "oldest first");
});
