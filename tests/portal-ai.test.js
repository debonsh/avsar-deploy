// node --test: slice 2 — AI voices per portal, ATS rubric split, coach split.
// Pure, no network: offline generators must resolve null (fallback path),
// never throw — that is the live no-key behavior too.
import { test } from "node:test";
import assert from "node:assert/strict";
import { voiceFor, genQuestionnaire, genInterviewQs, gradeAnswerAI } from "../src/lib/aiQuestions.js";
import { scoreATS } from "../src/lib/ats.js";
import { COACH_ACTIONS, coachActionsFor, localAnswer, buildPrompt } from "../src/lib/coach.js";
import { TECH_RESUMES } from "../src/data/techResumes.js";

const TECH = {
  role: "sde",
  roleLabel: "Software Developer",
  score: 52,
  missing: ["react", "node", "dsa"],
  bestFitLabel: "Software Developer",
  resumeText: "Built a todo app with HTML and CSS.",
};
const AYUSH = { ...TECH, role: "ayush", roleLabel: "Ayush Professional" };

test("voiceFor speaks clinic for ayush, engineering for tech", () => {
  assert.match(voiceFor("ayush").who, /BAMS/i);
  assert.match(voiceFor("ayush").probe, /panchakarma/i);
  assert.match(voiceFor("sde").who, /software developer/i);
  assert.doesNotMatch(voiceFor("sde").probe, /panchakarma|tridosha/i);
  assert.match(voiceFor("data").who, /data analyst/i);
  assert.match(voiceFor("mystery").who, /engineering student/i);
});

test("offline AI generators resolve null so callers fall back, never throw", async () => {
  assert.equal(await genQuestionnaire(TECH_RESUMES[0].text, "sde"), null);
  assert.equal(await genInterviewQs(TECH_RESUMES[0].text, "sde", "sde track"), null);
  assert.equal(await gradeAnswerAI("Q?", "An answer with detail.", "", "sde"), null);
  assert.equal(await gradeAnswerAI("Q?", "   ", "", "sde"), null);
});

test("ATS: tech lane ignores clinical tokens, ayush lane reads them", () => {
  const base = "TITLE\nCONTACT me at a@b.c | 2024\nB.Tech student. Built a dashboard app, deployed on Vercel.";
  const clinical = `${base} panchakarma OPD vaidya HIMS NABH shishiksha dravyaguna case sheets.`;
  const sdeBase = scoreATS(base, "sde");
  const sdeClin = scoreATS(clinical, "sde");
  const pq = (r) => r.breakdown.find((d) => d.label === "Project Quality").pts;
  assert.equal(pq(sdeClin), pq(sdeBase), "clinical words must not lift tech Project Quality");
  const ayBase = scoreATS(base, "ayush");
  const ayClin = scoreATS(clinical, "ayush");
  assert.ok(ayClin.total > ayBase.total, "clinical proof must lift ayush scores");
  assert.ok(sdeClin.total <= ayClin.total, "same clinical text scores higher on its own lane");
});

test("ATS split keeps sde/filler invariants", () => {
  const filler = scoreATS("My resume. Skills: javascript react node python git sql dsa api html css.", "sde");
  const builder = scoreATS(TECH_RESUMES[0].text, "sde");
  assert.ok(builder.total > filler.total, "strong tech sample still beats filler");
  assert.deepEqual(scoreATS(builder ? TECH_RESUMES[0].text : "", "sde"), scoreATS(TECH_RESUMES[0].text, "sde"));
});

test("coach registry untouched; portal view swaps bams for roadmap on tech", () => {
  assert.ok(COACH_ACTIONS.some((a) => a.id === "bams"), "registry keeps bams");
  assert.deepEqual(coachActionsFor("ayush").map((a) => a.id), COACH_ACTIONS.map((a) => a.id));
  const techIds = coachActionsFor("sde").map((a) => a.id);
  assert.ok(!techIds.includes("bams"), "tech hides bams deepen");
  assert.ok(techIds.includes("roadmap"), "tech gets L0–L5 roadmap");
});

test("coach tech answers never speak clinic", () => {
  const mentor = localAnswer("mentor", TECH);
  assert.doesNotMatch(mentor, /NCISM|RAV|vaidya|SHISHIKSHA/i);
  assert.match(mentor, /mock-interview|GitHub|mini-project/i);
  const askInterview = localAnswer("ask", { ...TECH, found: ["react"], question: "how do I face interviews?" });
  assert.doesNotMatch(askInterview, /Clinical rounds|case presentation/i);
  assert.match(askInterview, /STAR/i);
  const askCert = localAnswer("ask", { ...TECH, found: [], question: "which certificate?" });
  assert.doesNotMatch(askCert, /SWAYAM pharma|Ayurveda Biology|ABDM/i);
  const askPay = localAnswer("ask", { ...TECH, found: [], question: "what stipend?" });
  assert.doesNotMatch(askPay, /JRF|SPARK|panchakarma/i);
  const gaps = localAnswer("gaps", TECH);
  assert.doesNotMatch(gaps, /logbook/i);
});

test("coach ayush answers keep clinical voice", () => {
  assert.match(localAnswer("mentor", AYUSH), /NCISM|RAV/i);
  assert.match(localAnswer("ask", { ...AYUSH, found: [], question: "interview tips?" }), /Clinical rounds/i);
});

test("roadmap deepens tech, locks for ayush (and vice versa for bams)", () => {
  const road = localAnswer("roadmap", TECH);
  assert.match(road, /L0 Explorer/);
  assert.match(road, /L3 Associate/);
  assert.match(localAnswer("roadmap", AYUSH), /Tech portal/i);
  assert.match(buildPrompt("roadmap", TECH), /L0–L5/i);
});
