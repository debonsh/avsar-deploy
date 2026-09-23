// node --test: ayush proof ledger + scoring overlay. localStorage mocked.
import { test } from "node:test";
import assert from "node:assert/strict";

const mem = {};
globalThis.localStorage = {
  getItem: (k) => (k in mem ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v); },
  removeItem: (k) => { delete mem[k]; },
};

const { addProof, proofsFor, verifyState, skillConfidence, loadLedger } = await import("../src/ayush/proof.js");
const { vaidyaLevel, pathForSkill, ayushReadout } = await import("../src/ayush/scoring.js");

test("case logs accumulate, mentor sign-off verifies", () => {
  assert.deepEqual(proofsFor("dravyaguna"), []);
  for (let i = 0; i < 10; i++) addProof({ skill: "dravyaguna", kind: "case-log", detail: `case ${i}` });
  assert.equal(proofsFor("dravyaguna").length, 10);
  assert.equal(verifyState("dravyaguna", 0).verified, true);
  assert.equal(verifyState("gmp", 0).verified, false);
  addProof({ skill: "gmp", kind: "mentor", detail: "dr. rao" });
  assert.equal(verifyState("gmp", 0).verified, true);
});

test("confidence weights paths, caps at 100", () => {
  assert.equal(skillConfidence("unknown-skill-xyz", 0), 0);
  const c = skillConfidence("dravyaguna", 80);
  assert.ok(c > 30 && c <= 100, `confidence ${c} in range`);
  assert.deepEqual(loadLedger().entries.length >= 11, true);
});

test("vaidya levels grow seed to acharya", () => {
  assert.equal(vaidyaLevel(10).id, "beej");
  assert.equal(vaidyaLevel(35).id, "ankur");
  assert.equal(vaidyaLevel(55).id, "paudha");
  assert.equal(vaidyaLevel(70).id, "vaidya");
  assert.equal(vaidyaLevel(90).id, "acharya");
});

test("pathForSkill routes families without github", () => {
  assert.equal(pathForSkill("diagnosis"), "case-log");
  assert.equal(pathForSkill("gmp"), "certificate");
  assert.equal(pathForSkill("hims"), "orientation");
});

test("ayushReadout blends resume, quiz, and ledger", () => {
  const r = ayushReadout("BAMS student. OPD assistant. Panchakarma sittings. dravyaguna diagnosis documentation.");
  assert.ok(r.readiness >= 0 && r.readiness <= 100);
  assert.ok(r.level && r.level.hi, "level carries hindi gloss");
  assert.ok(Array.isArray(r.skills) && r.skills.length > 0);
  assert.ok(r.skills.every((s) => typeof s.confidence === "number" && s.path), "skills carry confidence + path");
});
