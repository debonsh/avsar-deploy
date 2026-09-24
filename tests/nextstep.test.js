// node --test: the guidance rule is the contract behind every "where next"
// surface — one brain, many faces. Order is the product decision.
import { test } from "node:test";
import assert from "node:assert/strict";
import { NEXT_ORDER, LOOP_STEPS, nextStep } from "../src/lib/nextstep.js";

test("empty state starts at profile setup", () => {
  assert.deepEqual(nextStep({}), { id: "profile", to: "/journey" });
  assert.deepEqual(nextStep(), { id: "profile", to: "/journey" });
});

test("steps unlock strictly in loop order", () => {
  assert.equal(nextStep({ profileDone: true }).id, "resume");
  assert.equal(nextStep({ profileDone: true, resumeDone: true }).id, "quests");
  assert.equal(
    nextStep({ profileDone: true, resumeDone: true, questsDone: true }).id,
    "interview"
  );
  assert.equal(
    nextStep({ profileDone: true, resumeDone: true, questsDone: true, interviewDone: true }).id,
    "apply"
  );
});

test("a later-done step never skips an earlier gap", () => {
  assert.equal(nextStep({ interviewDone: true }).id, "profile");
  assert.equal(nextStep({ profileDone: true, interviewDone: true }).id, "resume");
});

test("first application moves the user to showcase", () => {
  const done = { profileDone: true, resumeDone: true, questsDone: true, interviewDone: true };
  assert.equal(nextStep({ ...done, appliedCount: 0 }).id, "apply");
  assert.deepEqual(nextStep({ ...done, appliedCount: 2 }), { id: "portfolio", to: "/portfolio" });
});

test("LOOP_STEPS is the public 4-step loop in order", () => {
  assert.deepEqual(LOOP_STEPS.map((s) => s.id), ["resume", "quests", "interview", "apply"]);
  for (const s of LOOP_STEPS) assert.ok(s.to.startsWith("/"), `${s.id} links somewhere real`);
});

test("NEXT_ORDER covers the full loop", () => {
  assert.deepEqual(NEXT_ORDER, ["profile", "resume", "quests", "interview", "apply", "portfolio"]);
});
