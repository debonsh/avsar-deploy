// node --test: quiz banks + grading + seeded sampling. Pure, no network.
// 20-Q bank per scoring lane, 10 sampled per run seeded by device id + day.
import { test } from "node:test";
import assert from "node:assert/strict";
import { QUIZ, gradeQuiz, gradeSet, quizSample, loadQuizBest, saveQuizBest } from "../src/data/quiz.js";

test("banks exist for every lane, 20 Qs each, 4 opts, ans in range", () => {
  for (const role of ["ayush", "sde", "data", "marketing", "govt"]) {
    const bank = QUIZ[role];
    assert.ok(bank, `${role} needs a bank`);
    assert.equal(bank.length, 20, `${role} needs 20 Qs`);
    for (const item of bank) {
      assert.equal(typeof item.q, "string");
      assert.equal(item.opts.length, 4, `${role}: 4 opts`);
      assert.ok(item.ans >= 0 && item.ans < 4, `${role}: ans in range`);
    }
  }
});

test("gradeQuiz: full marks → 100, half → 50", () => {
  const bank = QUIZ.ayush;
  const perfect = bank.map((item) => item.ans);
  assert.deepEqual(gradeQuiz("ayush", perfect), { score: 100, correct: 20, total: 20 });
  const half = bank.map((item, i) => (i % 2 === 0 ? item.ans : (item.ans + 1) % 4));
  assert.deepEqual(gradeQuiz("ayush", half), { score: 50, correct: 10, total: 20 });
});

test("gradeQuiz: unknown role never throws", () => {
  assert.deepEqual(gradeQuiz("nope", [0, 1]), { score: 0, correct: 0, total: 0 });
});

test("gradeSet grades a sampled subset", () => {
  const sample = QUIZ.ayush.slice(0, 10);
  const picks = sample.map((item) => item.ans);
  assert.deepEqual(gradeSet(sample, picks), { score: 100, correct: 10, total: 10 });
});

test("quizSample: 10/20, stable per id+day, spread across ids", () => {
  const a1 = quizSample("ayush", "AVSAR-AAAAAA", "2026-09-30");
  const a2 = quizSample("ayush", "AVSAR-AAAAAA", "2026-09-30");
  assert.equal(a1.length, 10);
  assert.deepEqual(a1, a2, "same id+day → same sample");
  const bankQs = new Set(QUIZ.ayush.map((item) => item.q));
  for (const item of a1) assert.ok(bankQs.has(item.q), "sample is a subset of the bank");
  const seen = new Set(
    Array.from({ length: 12 }, (_, i) => quizSample("ayush", `AVSAR-ID${i}`, "2026-09-30").map((item) => item.q).join("|"))
  );
  assert.ok(seen.size > 1, "12 ids should not all get the same sample");
});

test("loadQuizBest never throws without a browser", () => {
  assert.equal(loadQuizBest("ayush"), 0);
});

test("a tech lane grades and samples exactly like ayush", () => {
  const bank = QUIZ.sde;
  assert.deepEqual(gradeQuiz("sde", bank.map((item) => item.ans)), { score: 100, correct: 20, total: 20 });
  const sample = quizSample("sde", "AVSAR-AAAAAA", "2026-09-30");
  assert.equal(sample.length, 10);
  assert.deepEqual(sample, quizSample("sde", "AVSAR-AAAAAA", "2026-09-30"));
  assert.ok(sample.every((item) => QUIZ.sde.includes(item)));
  assert.equal(loadQuizBest("marketing"), 0);
});

test("best score is tracked per lane, never shared across portals", () => {
  const store = {};
  globalThis.localStorage = {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
  saveQuizBest("ayush", 80);
  saveQuizBest("sde", 40);
  assert.equal(loadQuizBest("ayush"), 80);
  assert.equal(loadQuizBest("sde"), 40);
  delete globalThis.localStorage;
});
