// node --test: ayush module contract — one file, guarded spreads, rollback-safe. Pure, no network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { AYUSH_ENABLED, AYUSH_ROLE, AYUSH_JOBS, AYUSH_TREE, AYUSH_COURSES, AYUSH_QUIZ, AYUSH_INTERVIEW_QS, AYUSH_QUESTIONNAIRE, AYUSH_FDPS } from "../src/ayush/seed.js";
import { ROLES } from "../src/lib/score.js";
import { QUEST_TREE } from "../src/data/quests.js";
import { COURSES } from "../src/data/courses.js";
import { QUIZ } from "../src/data/quiz.js";
import { INTERVIEW_QS } from "../src/data/interview.js";
import { QUESTIONNAIRE } from "../src/data/questionnaire.js";
import { FDPS } from "../src/data/fdps.js";

test("ayush seed shapes are valid", () => {
  assert.ok(AYUSH_ROLE.skills.length >= 8, "role needs skills");
  assert.ok(AYUSH_ROLE.keywords.length >= 5, "role needs keywords");
  for (const j of AYUSH_JOBS) {
    assert.equal(j.role, "ayush");
    for (const k of ["id", "title", "company", "skills", "minScore", "apply"]) assert.ok(j[k] !== undefined, `job needs ${k}`);
  }
  assert.ok(AYUSH_QUIZ.length >= 10, "quiz bank needs 10+");
  assert.equal(AYUSH_INTERVIEW_QS.length, 5);
  assert.ok(AYUSH_QUESTIONNAIRE.length >= 3);
  assert.ok(AYUSH_FDPS.length >= 3);
  assert.ok(Object.keys(AYUSH_COURSES).length >= 5);
  assert.ok(AYUSH_TREE.ayush.branches.length >= 2);
});

test("ayush spreads apply iff enabled (rollback contract)", () => {
  assert.equal(Boolean(ROLES.ayush), AYUSH_ENABLED);
  assert.equal(Boolean(QUEST_TREE.ayush), AYUSH_ENABLED);
  assert.equal(Boolean(QUIZ.ayush), AYUSH_ENABLED);
  assert.equal(Boolean(INTERVIEW_QS.ayush), AYUSH_ENABLED);
  assert.equal(Boolean(QUESTIONNAIRE.ayush), AYUSH_ENABLED);
  assert.equal(FDPS.some((f) => String(f.id).startsWith("a")), AYUSH_ENABLED);
  if (AYUSH_ENABLED) {
    assert.ok(COURSES.dravyaguna, "courses spread applied");
  }
});
