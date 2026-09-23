// node --test: portal split — one codebase, two universes.
// Tech gets L0–L5 engineering levels (never vaidya stages), the front-door
// router assigns exactly one portal, and Tech programs never leak Ayush seats.
import { test } from "node:test";
import assert from "node:assert/strict";
import { engLevelFor, rankFor } from "../src/lib/score.js";
import { vaidyaLevel } from "../src/ayush/scoring.js";
import { ROUTER_QS, recommendTrack, questionsFromProfile } from "../src/lib/onboarding.js";
import { TECH_PROGRAMS } from "../src/data/techPrograms.js";
import { TECH_RESUMES } from "../src/data/techResumes.js";
import { PROGRAMS } from "../src/data/programs.js";
import { AYUSH_ROLE } from "../src/ayush/seed.js";
import { skillById } from "../src/data/taxonomy.js";
import { scoreResume } from "../src/lib/score.js";

test("tech leveling is its own L0–L5 ladder", () => {
  assert.equal(engLevelFor(0).id, "L0");
  assert.equal(engLevelFor(29).id, "L0");
  assert.equal(engLevelFor(30).id, "L1");
  assert.equal(engLevelFor(50).id, "L2");
  assert.equal(engLevelFor(65).id, "L3");
  assert.equal(engLevelFor(80).id, "L4");
  assert.equal(engLevelFor(95).id, "L5");
  assert.equal(engLevelFor(100).id, "L5");
});

test("tech levels never share names with vaidya stages", () => {
  const vaidyaNames = new Set(
    [0, 30, 50, 65, 80, 95].map((s) => vaidyaLevel(s).label)
  );
  for (const s of [0, 30, 50, 65, 80, 95]) {
    assert.ok(!vaidyaNames.has(engLevelFor(s).label), `collision at ${s}`);
  }
  // old console ranks still exist for compat, but the portal shows L-levels
  assert.equal(rankFor(95), "Diamond");
});

test("router routes ayush to vaidya portal, tech to tech", () => {
  assert.equal(recommendTrack({ who: "ayush" }).track, "ayush");
  assert.equal(recommendTrack({ who: "tech" }).track, "tech");
});

test("router blanks and other stay undecided so the user picks manually", () => {
  assert.equal(recommendTrack({}).track, "undecided");
  assert.equal(recommendTrack({ who: "other" }).track, "undecided");
  assert.equal(recommendTrack({ nope: "x" }).track, "undecided");
});

test("router is one direct question with a track per option", () => {
  assert.equal(ROUTER_QS.length, 1);
  assert.equal(ROUTER_QS[0].id, "who");
  assert.ok(ROUTER_QS[0].opts.length >= 2);
  for (const o of ROUTER_QS[0].opts) {
    assert.ok(o.track === "ayush" || o.track === "tech" || o.track === null, o.id);
  }
});

test("interview fallback speaks the portal's language", () => {
  const techQs = questionsFromProfile({ skills: "", track: "sde", goal: "internship" }, { missing: [] });
  assert.equal(techQs.length, 5);
  assert.match(techQs.join(" "), /feature|dashboard|campaign|mock-test/i);
  assert.doesNotMatch(techQs.join(" "), /OPD|panchakarma|BAMS/i);
  const ayushQs = questionsFromProfile({ skills: "", lane: "clinical", goal: "internship", year: "3rd year" }, { missing: [] });
  assert.match(ayushQs.join(" "), /OPD|BAMS/i);
});

test("tech programs are well-formed and ayush-free", () => {
  const ayushSkills = new Set(AYUSH_ROLE.skills);
  for (const p of TECH_PROGRAMS) {
    assert.ok(p.id && p.title && p.provider, p.id);
    assert.ok(/^https:\/\//.test(p.url), p.id);
    assert.ok(p.hours > 0, p.id);
    for (const s of p.skills) {
      assert.ok(skillById(s), `${p.id} → unknown skill ${s}`);
      assert.ok(!ayushSkills.has(s), `${p.id} leaks ayush skill ${s}`);
    }
  }
  for (const kind of ["program", "workshop", "mentorship", "challenge"]) {
    assert.ok(TECH_PROGRAMS.some((p) => p.kind === kind), `tech missing kind: ${kind}`);
  }
});

test("ayush and tech program catalogs do not overlap", () => {
  const ayushIds = new Set(PROGRAMS.map((p) => p.id));
  for (const p of TECH_PROGRAMS) assert.ok(!ayushIds.has(p.id), `shared id ${p.id}`);
});

test("tech sample resumes score on the tech lane with tech gaps", () => {
  assert.ok(TECH_RESUMES.length >= 2, "need a strong and a thin sample");
  const strong = scoreResume(TECH_RESUMES[0].text, "sde");
  assert.ok(strong.total > 40, `strong tech sample should clear 40, got ${strong.total}`);
  assert.ok(strong.found.some((s) => ["javascript", "react", "sql"].includes(s.toLowerCase())));
  const thin = scoreResume(TECH_RESUMES[1].text, "sde");
  assert.ok(thin.total < strong.total, "thin sample must score below the strong one");
});
