// node --test: each portal keeps its own curated job feed. Ids are namespaced
// (ayush 1-12, extra 101+, tech 301+) so a merge can never shadow a posting.
import { test } from "node:test";
import assert from "node:assert/strict";
import { JOBS, TECH_JOBS, matchJobs } from "../src/data/jobs.js";
import { EXTRA_JOBS } from "../src/data/seedJobsExtra.js";

test("the ayush feed is ayurveda-only, the tech feed never is", () => {
  assert.ok(JOBS.length > 0 && JOBS.every((j) => j.role === "ayush"));
  assert.ok(TECH_JOBS.length > 0 && TECH_JOBS.every((j) => j.role !== "ayush"));
});

test("the tech feed covers every tech lane", () => {
  const lanes = new Set(TECH_JOBS.map((j) => j.role));
  for (const lane of ["sde", "data", "marketing", "govt"]) assert.ok(lanes.has(lane), lane);
});

test("ids never collide across the curated feeds", () => {
  const ids = [...JOBS, ...TECH_JOBS, ...EXTRA_JOBS].map((j) => j.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("every posting is applicable: skills, minScore, apply url", () => {
  for (const j of [...JOBS, ...TECH_JOBS]) {
    assert.ok(Array.isArray(j.skills) && j.skills.length > 0, `${j.id} needs skills`);
    assert.equal(Number.isFinite(j.minScore), true, `${j.id} needs minScore`);
    assert.match(j.apply, /^https:\/\//, `${j.id} needs an apply url`);
  }
});

test("matchJobs keeps a feed on one lane and flags eligibility", () => {
  const sde = matchJobs("sde", 100, [], TECH_JOBS);
  assert.ok(sde.length > 0);
  assert.ok(sde.every((j) => j.role === "sde"));
  assert.ok(sde.every((j) => j.eligible === true));
  assert.equal(matchJobs("ayush", 0, [], TECH_JOBS).length, 0);
});
