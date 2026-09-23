// node --test: AI question validators. Pure, no network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseQuizItems, parseInterviewItems, parseQuestionnaireItems } from "../src/lib/aiQuestions.js";

test("parseQuizItems accepts strict MCQ sets, rejects junk", () => {
  const good = JSON.stringify([
    { text: "Tridosha comprises?", opts: ["Vata Pitta Kapha", "Satva Rajas", "Prana Apana", "Dhatu Mala"], ans: 0 },
    { text: "GMP stands for?", opts: ["Good Manufacturing Practice", "General Protocol", "Graded Plan", "Good Marketing"], ans: 0 },
    { text: "NABH relates to?", opts: ["Hospital quality", "Drug pricing", "Crop yield", "Export"], ans: 0 },
    { text: "BAMS internship lasts?", opts: ["6 months", "12 months", "3 months", "24 months"], ans: 1 },
  ]);
  const out = parseQuizItems(good);
  assert.equal(out.length, 4);
  assert.equal(out[3].ans, 1);
  assert.equal(parseQuizItems("not json"), null);
  assert.equal(parseQuizItems(JSON.stringify([{ text: "x", opts: ["a", "b"], ans: 0 }])), null);
  assert.equal(parseQuizItems(JSON.stringify([{ text: "x", opts: ["a", "b", "c", "d"], ans: 9 }])), null);
  assert.equal(parseQuizItems(""), null);
});

test("parseInterviewItems reuses the strict question-set contract", () => {
  const good = JSON.stringify([{ text: "Q1?", dimension: "skill" }, { text: "Q2?", dimension: "skill" }]);
  assert.deepEqual(parseInterviewItems(good), ["Q1?", "Q2?"]);
  assert.equal(parseInterviewItems("garbage"), null);
});

test("parseQuestionnaireItems accepts typed items, needs 3+", () => {
  const good = JSON.stringify([
    { text: "Assisted OPD?", type: "yesno" },
    { text: "Which procedures?", type: "text" },
    { text: "Logbook link?", type: "url" },
    { text: "Level?", type: "choice", options: ["Student", "Intern"] },
  ]);
  const out = parseQuestionnaireItems(good);
  assert.equal(out.length, 4);
  assert.deepEqual(out[3].options, ["Student", "Intern"]);
  assert.equal(parseQuestionnaireItems(JSON.stringify([{ text: "Only one", type: "text" }])), null);
  assert.equal(parseQuestionnaireItems(JSON.stringify([{ text: "Bad type", type: "essay" }])), null);
});
