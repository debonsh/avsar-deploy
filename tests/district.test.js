// node --test: the district thermometer. Two properties carry the whole pillar. A figure
// never mixes lanes, because an ayurveda cohort and an engineering cohort in one bar
// describe a job market that does not exist. And a bucket too small to be anonymous is
// withheld visibly, so a reader can tell "no demand" from "not permitted to say".
import { test } from "node:test";
import assert from "node:assert/strict";
import { districtDemand, unmetDemand, capacityPlan, privacyAggregate, DEFAULT_K, DEFAULT_BATCH } from "../src/lib/district.js";

let seq = 0;
const job = (skills, loc, extra = {}) => ({ id: `j${++seq}`, role: "ayush", loc, skills, ...extra });

test("districtDemand groups by the location a posting actually states", () => {
  const jobs = [
    job(["gmp", "documentation"], "Indore"),
    job(["gmp"], "Indore"),
    job(["panchakarma"], "Kochi"),
    job(["research"], null),
  ];
  const out = districtDemand(jobs);
  assert.equal(out.length, 3);
  assert.equal(out[0].city, "Indore", "the busiest city leads");
  assert.equal(out[0].total, 2);
  assert.deepEqual(out[0].skills.map((s) => s.skill), ["gmp", "documentation"], "skills rank by count");
  assert.equal(out[0].skills[0].count, 2);
  assert.equal(out.find((c) => c.city === "unknown").total, 1, "a missing location is unknown, not guessed");
  assert.ok(out.every((c) => c.skills.every((s) => s.name)), "every skill carries a readable name");
});

test("districtDemand respects its limit and survives an empty corpus", () => {
  const many = Array.from({ length: 20 }, (_, i) => job(["gmp"], `City ${i}`));
  assert.equal(districtDemand(many, { limit: 5 }).length, 5);
  assert.deepEqual(districtDemand([]), []);
});

test("unmetDemand subtracts verified supply and never goes negative", () => {
  const demand = [{ city: "Indore", total: 3, skills: [{ skill: "gmp", name: "GMP", count: 3 }, { skill: "research", name: "Research", count: 1 }] }];
  const rows = unmetDemand(demand, { gmp: 5, research: 0 });
  const gmp = rows.find((r) => r.skill === "gmp");
  assert.equal(gmp.demand, 3);
  assert.equal(gmp.supply, 5);
  assert.equal(gmp.unmet, 0, "more supply than demand is zero unmet, not negative unmet");
  const research = rows.find((r) => r.skill === "research");
  assert.equal(research.unmet, 1);
  assert.equal(rows[0].skill, "research", "the deepest gap sorts first");
});

test("unmetDemand reads a Map or a plain object, and canonicalises the skill key", () => {
  const demand = [{ city: "Pune", total: 2, skills: [{ skill: "power-bi", name: "Power BI", count: 4 }] }];
  const asMap = unmetDemand(demand, new Map([["power-bi", 1]]));
  assert.equal(asMap[0].supply, 1);
  const asObj = unmetDemand(demand, { "Power BI": 1 });
  assert.equal(asObj[0].supply, 1, "an alias resolves to the same skill");
  assert.equal(unmetDemand(demand, {}).at(0).unmet, 4, "no supply at all leaves the whole demand unmet");
});

test("capacityPlan rounds up, because a full batch that leaves people out has not closed the gap", () => {
  const unmet = [
    { city: "Indore", skill: "gmp", name: "GMP", demand: 41, supply: 0, unmet: 41 },
    { city: "Kochi", skill: "gmp", name: "GMP", demand: 3, supply: 0, unmet: 3 },
    { city: "Pune", skill: "research", name: "Research", demand: 20, supply: 20, unmet: 0 },
  ];
  const plan = capacityPlan(unmet, { batchSize: 20 });
  const gmp = plan.find((p) => p.skill === "gmp");
  assert.equal(gmp.unmet, 44, "the same skill across two cities is one training need");
  assert.equal(gmp.batches, 3, "44 people at 20 a batch is three batches, not 2.2");
  assert.deepEqual(gmp.cities.sort(), ["Indore", "Kochi"]);
  assert.equal(plan.find((p) => p.skill === "research"), undefined, "a met need is not a batch");
  assert.equal(plan[0].skill, "gmp", "the biggest need leads");
});

test("capacityPlan scopes to one city when asked, and a useless batch size falls back to the default", () => {
  const unmet = [
    { city: "Indore", skill: "gmp", name: "GMP", unmet: 30 },
    { city: "Kochi", skill: "gmp", name: "GMP", unmet: 30 },
  ];
  assert.equal(capacityPlan(unmet, { city: "Indore" })[0].unmet, 30, "one city is scoped on its own");
  // zero and negative are both "not a plan", and they resolve the same way rather than one
  // silently becoming a class of one and the other the normal class size
  assert.equal(capacityPlan(unmet, { batchSize: 0 })[0].batchSize, DEFAULT_BATCH);
  assert.equal(capacityPlan(unmet, { batchSize: -5 })[0].batchSize, DEFAULT_BATCH);
  assert.equal(capacityPlan(unmet, { batchSize: "nonsense" })[0].batchSize, DEFAULT_BATCH);
  assert.equal(capacityPlan(unmet, { batchSize: 7.8 })[0].batchSize, 7, "a fractional batch size floors");
  assert.deepEqual(capacityPlan([]), []);
});

test("a bucket below k is withheld, and the fact that it was withheld is reported", () => {
  const rows = [
    { key: "gmp", count: 12, lane: "ayush" },
    { key: "research", count: 3, lane: "ayush" },
    { key: "pharmacy", count: 1, lane: "ayush" },
  ];
  const agg = privacyAggregate(rows, 5);
  assert.deepEqual(agg.buckets.map((b) => b.key), ["gmp"]);
  assert.deepEqual(agg.suppressed.map((s) => s.key).sort(), ["pharmacy", "research"]);
  assert.equal(agg.suppressedCount, 4, "the withheld total is reported so the reader knows the size of the hole");
  assert.equal(agg.total, 3);
  assert.equal(agg.k, 5);
  assert.equal(agg.error, null);
  assert.ok(agg.suppressed.every((s) => /below k=5/.test(s.reason)), "each suppression explains itself");
});

test("suppression is never silent, even when it takes everything", () => {
  const agg = privacyAggregate([{ key: "a", count: 1, lane: "tech" }, { key: "b", count: 2, lane: "tech" }], 5);
  assert.deepEqual(agg.buckets, []);
  assert.equal(agg.suppressed.length, 2, "an empty chart still has to say why it is empty");
  assert.equal(agg.suppressedCount, 3);
});

test("privacyAggregate refuses to mix lanes rather than averaging them together", () => {
  const agg = privacyAggregate([
    { key: "gmp", count: 40, lane: "ayush" },
    { key: "react", count: 40, lane: "tech" },
  ], 5);
  assert.deepEqual(agg.buckets, [], "a mixed figure is worse than no figure");
  assert.match(agg.error, /never mix them/);
  assert.ok(agg.error.includes("ayush") && agg.error.includes("tech"), "and it names the lanes it found");
});

test("privacyAggregate treats a missing k as the default and never suppresses at k=1", () => {
  assert.equal(DEFAULT_K, 5);
  const rows = [{ key: "a", count: 1, lane: "tech" }];
  assert.equal(privacyAggregate(rows).k, DEFAULT_K);
  assert.equal(privacyAggregate(rows).buckets.length, 0, "one record is not a cohort");
  assert.equal(privacyAggregate(rows, 1).buckets.length, 1, "k=1 is a deliberate choice to publish everything");
  assert.deepEqual(privacyAggregate([], 5).buckets, []);
});

test("rows without a lane are allowed through, because a single-lane caller cannot mix", () => {
  const agg = privacyAggregate([{ key: "gmp", count: 9 }], 5);
  assert.equal(agg.error, null);
  assert.equal(agg.buckets.length, 1);
});
