// node --test: questionnaire branching + evidence compile. Bank is fallback;
// AI customs layer on top (gemini.generateQuestions), same shape, validated.
import { test } from "node:test";
import assert from "node:assert/strict";
import { QUESTIONNAIRE } from "../src/data/questionnaire.js";
import { visibleQuestions, compileEvidence } from "../src/lib/questionnaire.js";

test("branches hide until their condition answers", () => {
  const bank = QUESTIONNAIRE.ayush;
  const none = visibleQuestions(bank, {});
  assert.equal(none.some((q) => q.id === "logbook-count"), false);
  const yes = visibleQuestions(bank, { logbook: "yes" });
  assert.equal(yes.some((q) => q.id === "logbook-count"), true);
  const no = visibleQuestions(bank, { logbook: "no" });
  assert.equal(yes.some((q) => q.id === "logbook-count"), true);
  assert.equal(no.some((q) => q.id === "logbook-count"), false);
});

test("every role bank is non-empty with unique ids", () => {
  for (const [role, bank] of Object.entries(QUESTIONNAIRE)) {
    assert.equal(bank.length >= 4, true, `${role} needs a real bank`);
    assert.equal(new Set(bank.map((q) => q.id)).size, bank.length, `${role} ids unique`);
  }
});

test("evidence compiles urls, skills, level", () => {
  const ev = compileEvidence({
    "posting-url": "https://college.edu.in/intern",
    "top-skills": "Dravyaguna, Diagnosis, Panchakarma",
    level: "Intern",
  });
  assert.deepEqual(ev.linkedProjects, ["https://college.edu.in/intern"]);
  assert.deepEqual(ev.claims, ["dravyaguna", "diagnosis", "panchakarma"]);
  assert.equal(ev.level, "Intern");
});

test("empty answers compile to empty evidence, no crash", () => {
  assert.deepEqual(compileEvidence({}), { linkedProjects: [], claims: [], level: "" });
});

test("tech lanes carry the common bank plus their own branch", () => {
  for (const lane of ["sde", "data", "marketing"]) {
    const ids = QUESTIONNAIRE[lane].map((q) => q.id);
    for (const id of ["level", "live", "live-url", "users", "top-skills"]) {
      assert.ok(ids.includes(id), `${lane} is missing ${id}`);
    }
  }
  assert.ok(QUESTIONNAIRE.sde.some((q) => q.id === "deploy"));
  assert.ok(QUESTIONNAIRE.data.some((q) => q.id === "dataset"));
  assert.ok(QUESTIONNAIRE.marketing.some((q) => q.id === "campaign"));
});

test("govt prep asks its own ladder, not deploy checks", () => {
  const ids = QUESTIONNAIRE.govt.map((q) => q.id);
  assert.ok(ids.includes("mocks"));
  assert.ok(ids.includes("mock-score"));
  assert.equal(ids.includes("live"), false);
});

test("the ayush bank survives the merge", () => {
  assert.ok(QUESTIONNAIRE.ayush.some((q) => q.id === "logbook"));
  assert.ok(QUESTIONNAIRE.ayush.find((q) => q.id === "level").options.includes("BAMS student"));
});

test("every tech branch hides until its own answer lands", () => {
  const sde = visibleQuestions(QUESTIONNAIRE.sde, {});
  assert.equal(sde.some((q) => q.id === "deploy-what"), false);
  assert.equal(visibleQuestions(QUESTIONNAIRE.sde, { deploy: "yes" }).some((q) => q.id === "deploy-what"), true);
});
