// node --test: interview micro-score — client-side STAR heuristic shown BEFORE AI grade.
// Transparent tips, deterministic, no network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreAnswer } from "../src/lib/interview.js";

test("empty answer scores floor with actionable tips", () => {
  const r = scoreAnswer("");
  assert.equal(r.micro, 1);
  assert.deepEqual(r.stars, { s: false, t: false, a: false, r: false });
  assert.equal(r.hasNumber, false);
  assert.equal(r.tips.length > 0, true);
});

test("action + number + result lifts the micro-score", () => {
  const r = scoreAnswer("I built a mess feedback app used by 400 students, which cut complaints by 60%.");
  assert.equal(r.stars.a, true);
  assert.equal(r.stars.r, true);
  assert.equal(r.hasNumber, true);
  assert.equal(r.micro >= 3, true, `expected >=3, got ${r.micro}`);
});

test("full STAR answer scores 4", () => {
  const r = scoreAnswer("When mess complaints spiked, I needed a feedback channel. I built and shipped an app in a weekend. Complaints fell 60% in a month.");
  assert.equal(r.micro, 4);
  assert.equal(r.tips.length, 0);
});

test("tips name exactly what's missing", () => {
  const r = scoreAnswer("I did some work on a project.");
  assert.equal(r.tips.some((t) => /number/i.test(t)), true);
  assert.equal(r.tips.some((t) => /result/i.test(t)), true);
});

test("deterministic", () => {
  const a = "Led a team of 3; automated reports, saved 5 hrs weekly in 2024.";
  assert.deepEqual(scoreAnswer(a), scoreAnswer(a));
});
