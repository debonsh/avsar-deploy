// node --test: MAIN combiner per MASTER_PRD §4.1. Pure, no network.
// combineScores(ats, quiz, questPairs, role) → { main, rank }.
// Quest pairs → proof proxy min(100, pairs*20). Old calculateMainScore untouched.
import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateMainScore, rankFor, combineScores, questPairsToProof, normalizeScoreResult } from "../src/lib/score.js";

test("quest pairs map to proof: 0→0, 3→60, 5+→100 cap", () => {
  assert.equal(questPairsToProof(0), 0);
  assert.equal(questPairsToProof(3), 60);
  assert.equal(questPairsToProof(5), 100);
  assert.equal(questPairsToProof(99), 100);
});

test("tech weights 0.5/0.3/0.2 (sde, data)", () => {
  // proof = min(100, 5*20) = 100 → round(0.5*80 + 0.3*100 + 0.2*100) = 90
  assert.deepEqual(combineScores(80, 100, 5, "sde"), { main: 90, rank: "Diamond" });
  assert.deepEqual(combineScores(80, 100, 5, "data"), { main: 90, rank: "Diamond" });
});

test("non-tech weights 0.6/0.3/0.1 (marketing, govt)", () => {
  // round(0.6*80 + 0.3*100 + 0.1*100) = round(48+30+10) = 88
  assert.deepEqual(combineScores(80, 100, 5, "marketing"), { main: 88, rank: "Platinum" });
  assert.deepEqual(combineScores(80, 100, 5, "govt"), { main: 88, rank: "Platinum" });
});

test("MAIN rises when quiz/quests improve", () => {
  const base = combineScores(70, 0, 0, "sde").main;
  const quizUp = combineScores(70, 80, 0, "sde").main;
  const questUp = combineScores(70, 80, 3, "sde").main;
  assert.ok(quizUp > base, "quiz should lift MAIN");
  assert.ok(questUp > quizUp, "quests should lift MAIN further");
});

test("old calculateMainScore still matches PRD §4.1", () => {
  assert.equal(calculateMainScore(80, 100, 100, "sde"), 90);
  assert.equal(calculateMainScore(80, 100, 100, "marketing"), 88);
  assert.equal(rankFor(90), "Diamond");
  assert.equal(rankFor(65), "Gold");
});

test("inputs clamp, never NaN", () => {
  const r = combineScores(200, -5, 99, "sde");
  assert.ok(r.main >= 0 && r.main <= 100);
  assert.equal(typeof r.rank, "string");
});

test("normalizeScoreResult coerces stale shapes to safe empties", () => {
  assert.deepEqual(normalizeScoreResult(null), { total: 0, breakdown: [], found: [], missing: [] });
  assert.deepEqual(normalizeScoreResult({ total: 42, breakdown: null, found: null, missing: null }), { total: 42, breakdown: [], found: [], missing: [] });
  const good = { total: 70, breakdown: [{ label: "x", pts: 1, max: 2, why: ["y"] }], found: ["react"], missing: ["sql"] };
  assert.deepEqual(normalizeScoreResult(good), good);
});
