import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ONBOARD_W, onboardingProgress, questionsFromProfile, parseAiGrade, resetOnboarding } from "../src/lib/onboarding.js";

describe("onboarding progress 40/30/30", () => {
  it("empty start is 0, full loop is 100", () => {
    assert.equal(onboardingProgress({}).total, 0);
    assert.equal(onboardingProgress({ profileDone: true, resumeDone: true, interviewDone: true }).total, 100);
  });
  it("profile alone is 40, resume adds 30", () => {
    assert.deepEqual(onboardingProgress({ profileDone: true }), { profile: 40, resume: 0, interview: 0, total: 40 });
    assert.equal(onboardingProgress({ profileDone: true, resumeDone: true }).total, 70);
  });
  it("weights sum to 100", () => {
    assert.equal(ONBOARD_W.profile + ONBOARD_W.resume + ONBOARD_W.interview, 100);
  });
});

describe("questionsFromProfile", () => {
  it("always returns 5, shaped by claimed skills", () => {
    const qs = questionsFromProfile({ skills: "dravyaguna, gmp", lane: "clinical", goal: "internship", year: "3rd year" }, {});
    assert.equal(qs.length, 5);
    assert.match(qs[0], /dravyaguna/);
    assert.match(qs[1], /gmp/);
  });
  it("lane and goal steer questions 3 and 4", () => {
    const qs = questionsFromProfile({ skills: "research", lane: "research", goal: "upskill", year: "Intern" }, {});
    assert.match(qs[2], /CCRAS|trial/i);
    assert.match(qs[3], /one skill/i);
  });
  it("resume gaps become question 5, empty profile still yields 5", () => {
    const qs = questionsFromProfile({}, { missing: ["gmp"] });
    assert.equal(qs.length, 5);
    assert.match(qs[4], /gmp/);
  });
});

describe("resetOnboarding", () => {
  it("wipes loop keys with a stub store", () => {
    const store = { "avsar-profile-v1": JSON.stringify({ skills: "x" }), "avsar-resume-v1": JSON.stringify({}) };
    globalThis.localStorage = {
      removeItem: (k) => { delete store[k]; },
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => { store[k] = String(v); },
    };
    resetOnboarding();
    assert.equal(store["avsar-profile-v1"], undefined);
    assert.equal(store["avsar-resume-v1"], undefined);
    delete globalThis.localStorage;
  });
});

describe("parseAiGrade", () => {
  it("accepts 0-4 alone or in prose", () => {
    assert.equal(parseAiGrade("3"), 3);
    assert.equal(parseAiGrade("Score: 2 — thin on numbers."), 2);
    assert.equal(parseAiGrade(4), 4);
  });
  it("rejects out-of-range and empty", () => {
    assert.equal(parseAiGrade("7"), null);
    assert.equal(parseAiGrade("great answer!"), null);
    assert.equal(parseAiGrade(null), null);
  });
});
