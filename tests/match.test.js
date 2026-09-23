// node --test: the published matching formula. Weights must stay explainable.
import { test } from "node:test";
import assert from "node:assert/strict";
import { MATCH_WEIGHTS, matchScore, levelFromSignals, matchJobPost, profileForMatching } from "../src/lib/match.js";
import { requiredFor } from "../src/data/taxonomy.js";

test("published weights sum to 1", () => {
  const sum = Object.values(MATCH_WEIGHTS).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9, `weights sum to ${sum}`);
  assert.deepEqual(MATCH_WEIGHTS, { coverage: 0.45, proficiency: 0.25, verified: 0.15, recency: 0.1, interest: 0.05 });
});

test("perfect verified recent match with aligned interests scores 100", () => {
  const required = [{ skill: "diagnosis", level: 3 }, { skill: "documentation", level: 3 }];
  const now = Date.now();
  const held = [
    { skill: "diagnosis", level: 4, verified: true, lastUsedAt: now },
    { skill: "documentation", level: 3, verified: true, lastUsedAt: now },
  ];
  const m = matchScore({ required, held, tags: ["clinical"], interests: ["clinical"], now });
  assert.equal(m.score, 100);
  assert.equal(m.band, "strong fit");
  assert.equal(m.gaps.length, 0);
});

test("no overlap scores near zero and lists every gap", () => {
  const m = matchScore({
    required: [{ skill: "gmp", level: 4 }, { skill: "pharmacy", level: 3 }],
    held: [{ skill: "sanskrit", level: 5 }],
  });
  assert.equal(m.score, 0);
  assert.equal(m.gaps.length, 2);
  assert.ok(m.why.some((w) => w.includes("missing")));
});

test("verification lifts the score: claimed < verified, same levels", () => {
  const required = [{ skill: "panchakarma", level: 3 }];
  const now = Date.now();
  const claimed = matchScore({ required, held: [{ skill: "panchakarma", level: 3, verified: false, lastUsedAt: now }], now });
  const proven = matchScore({ required, held: [{ skill: "panchakarma", level: 3, verified: true, lastUsedAt: now }], now });
  assert.ok(proven.score > claimed.score);
  assert.equal(proven.score - claimed.score, 15, "verified ratio is worth 15 points at full coverage");
});

test("stale evidence decays: old proof scores below fresh proof", () => {
  const required = [{ skill: "pharmacovigilance", level: 4 }];
  const now = Date.now();
  const twoHalfLives = now - 2 * 545 * 86400000;
  const fresh = matchScore({ required, held: [{ skill: "pharmacovigilance", level: 4, verified: true, lastUsedAt: now }], now });
  const stale = matchScore({ required, held: [{ skill: "pharmacovigilance", level: 4, verified: true, lastUsedAt: twoHalfLives }], now });
  assert.ok(stale.score < fresh.score, `${stale.score} < ${fresh.score}`);
  assert.ok(stale.breakdown.proficiency < fresh.breakdown.proficiency);
});

test("interests add the final five points", () => {
  const required = [{ skill: "research", level: 3 }];
  const now = Date.now();
  const held = [{ skill: "research", level: 3, verified: false, lastUsedAt: now }];
  const cold = matchScore({ required, held, tags: ["research"], interests: [], now });
  const warm = matchScore({ required, held, tags: ["research"], interests: ["research"], now });
  assert.equal(warm.score - cold.score, 5);
});

test("empty requirements never crash and never score", () => {
  const m = matchScore({ required: [], held: [] });
  assert.equal(m.score, 0);
  assert.ok(m.why.length);
});

test("levelFromSignals climbs the L1–L5 ladder", () => {
  assert.equal(levelFromSignals({}), 0);
  assert.equal(levelFromSignals({ mastery: 2 }), 2);
  assert.equal(levelFromSignals({ mastery: 3, quizBest: 80 }), 4);
  assert.equal(levelFromSignals({ mastery: 3, quizBest: 80, confidence: 75 }), 5);
  assert.equal(levelFromSignals({ mastery: 3, quizBest: 100, confidence: 100 }), 5, "capped at L5");
});

test("matchJobPost adapts plain job posts and profiles", () => {
  const job = { title: "CRA Intern", skills: ["research", "documentation", "pharmacovigilance"], role: "ayush", kind: "research" };
  const profile = { skills: ["research", "documentation"], levels: { research: 4, documentation: 3 }, verified: ["research"], interests: ["research"] };
  const m = matchJobPost(job, profile);
  assert.ok(m.score > 40 && m.score < 90, `partial fit scored ${m.score}`);
  assert.ok(m.gaps.some((g) => g.skill === "pharmacovigilance"));
  assert.equal(matchJobPost(null, profile), null);
  assert.equal(matchJobPost({ skills: [] }, profile), null);
});

test("Ananya seed story: CRA role lands in the high-80s band", () => {
  // BAMS final-year, strong research/docs/diagnosis, pharmacovigilance is her gap
  const held = [
    { skill: "research", level: 4, verified: true, lastUsedAt: Date.now() },
    { skill: "documentation", level: 4, verified: true, lastUsedAt: Date.now() },
    { skill: "diagnosis", level: 3, verified: true, lastUsedAt: Date.now() },
    { skill: "gmp", level: 2, verified: false, lastUsedAt: Date.now() },
    { skill: "hims", level: 2, verified: false, lastUsedAt: Date.now() },
  ];
  const m = matchScore({ required: requiredFor("ayush-cra"), held, tags: ["research"], interests: ["research"] });
  assert.ok(m.score >= 75 && m.score < 95, `expected a strong-but-not-perfect fit, got ${m.score}`);
  assert.ok(m.gaps.some((g) => g.skill === "pharmacovigilance"), "her one famous gap");
});

test("profileForMatching folds local signals without a backend", () => {
  // no localStorage in node: mastery/proof read empty, so resume skills are L2 claimed
  const p = profileForMatching("ayush", ["Diagnosis", "GCP", "unknown-thing"], 90, ["research"]);
  assert.ok(p.skills.includes("diagnosis"), "display name canonicalized");
  assert.ok(p.skills.includes("research"), "alias resolved");
  assert.ok(p.skills.includes("unknown-thing"), "unknown skills pass through lowercased");
  assert.equal(p.levels.diagnosis, 2, "quiz best ≥70 lifts mastery one level");
  assert.deepEqual(p.interests, ["research"]);
  assert.deepEqual(profileForMatching("ayush", []), { skills: [], levels: {}, verified: [], usedAt: {}, interests: [] });
});
