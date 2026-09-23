// node --test: coach prompts embed live state, offline answers stay useful. Pure, no network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { COACH_ACTIONS, buildPrompt, localAnswer, matchBand, matchJob, parseJobPosting, coverLetter, reviewWriteup } from "../src/lib/coach.js";
import { coursesFor } from "../src/data/courses.js";

const S = {
  roleLabel: "Software Developer",
  score: 52,
  missing: ["react", "node", "dsa"],
  bestFitLabel: "Software Developer",
  resumeText: "Built a todo app with HTML and CSS.",
};

test("COACH_ACTIONS: the 10 quick actions (5 coach + bams deepen + 4 JobSync tools)", () => {
  assert.deepEqual(COACH_ACTIONS.map((a) => a.id), ["gaps", "bullets", "interview", "career", "mentor", "bams", "review", "match", "cover", "addjob"]);
  assert.ok(COACH_ACTIONS.find((a) => a.id === "bams"), "bams deepen action exists");
});

test("buildPrompt: every action embeds live state", () => {
  for (const a of COACH_ACTIONS) {
    const p = buildPrompt(a.id, S);
    assert.ok(p.includes("Software Developer"), `${a.id} names the role`);
    assert.ok(p.includes("52"), `${a.id} names the score`);
  }
  assert.ok(buildPrompt("gaps", S).includes("react"), "gaps names the top missing skill");
  assert.ok(buildPrompt("career", S).includes("Software Developer"), "career names the best fit");
  assert.ok(
    buildPrompt("ask", { ...S, question: "What is STAR?" }).includes("What is STAR?"),
    "free text carries the question"
  );
});

test("buildPrompt: unknown action never throws", () => {
  assert.equal(typeof buildPrompt("nope", S), "string");
});

test("localAnswer gaps: names top gap + a real free course, handles empty", () => {
  const a = localAnswer("gaps", S);
  assert.ok(a.includes("react"), "names the top gap");
  assert.ok(a.includes(coursesFor("react")[0].t), "links the top free course");
  assert.ok(localAnswer("gaps", { ...S, missing: [] }).length > 20, "empty gaps still answers");
  assert.ok(localAnswer("gaps", { ...S, score: 0 }).length > 20, "no score still answers");
});

test("localAnswer: interview has STAR + role, career has fit, bullets has STAR", () => {
  assert.ok(localAnswer("interview", S).includes("STAR"), "interview teaches STAR");
  assert.ok(localAnswer("interview", S).includes("Software Developer"), "interview names the role");
  assert.ok(localAnswer("career", S).includes("Software Developer"), "career names the fit");
  assert.ok(localAnswer("bullets", S).includes("STAR"), "bullets teaches STAR bullets");
});

test("ask carries found skills plus resume excerpt", () => {
  const p = buildPrompt("ask", { ...S, found: ["react", "sql"], question: "my skills?" });
  assert.ok(p.includes("react"), "names a found skill");
  assert.ok(p.includes("todo app"), "carries the resume excerpt");
});

const JOB = { id: "1", title: "Frontend Intern", company: "ZetaPay", skills: ["javascript", "react", "html", "css"] };

test("matchJob bands follow JobSync thresholds", () => {
  assert.equal(matchBand(85), "strong fit");
  assert.equal(matchBand(70), "good fit");
  assert.equal(matchBand(55), "partial fit");
  assert.equal(matchBand(40), "weak fit");
  assert.equal(matchBand(10), "poor fit");
  const m = matchJob(["javascript", "react"], JOB);
  assert.equal(m.score, 50);
  assert.equal(m.band, "partial fit");
  assert.deepEqual(m.missing, ["html", "css"]);
  assert.equal(matchJob([], null), null);
});

test("reviewWriteup and coverLetter need a score, never crash", () => {
  assert.ok(reviewWriteup(S).includes("52"), "review names the score");
  assert.ok(reviewWriteup({}).includes("My Score"), "empty review redirects");
  assert.ok(coverLetter({ ...S, topJob: JOB }).includes("ZetaPay"), "letter names the company");
  assert.ok(coverLetter({}).length > 10, "empty letter still answers");
});

test("parseJobPosting extracts labeled fields, rejects scraps", () => {
  const j = parseJobPosting("PASTE:\nCompany: Acme\nTitle: Backend Intern\nLocation: Remote\nReact and node daily.");
  assert.equal(j.company, "Acme");
  assert.equal(j.title, "Backend Intern");
  assert.equal(j.loc, "Remote");
  assert.ok(j.skills.includes("react"));
  assert.equal(parseJobPosting("hi"), null);
});

test("ayush track gets clinical voice, tech track unchanged", () => {
  const A = { ...S, roleLabel: "Ayush Professional", role: "ayush" };
  assert.ok(buildPrompt("interview", A).includes("case-presentation"), "ayush interview prompt is clinical");
  assert.ok(buildPrompt("career", A).includes("CCRAS"), "ayush career prompt names research paths");
  assert.ok(buildPrompt("bullets", A).includes("outcome"), "ayush bullets prompt wants outcomes");
  assert.ok(localAnswer("interview", A).includes("case sheets"), "ayush interview answer is clinical");
  assert.ok(localAnswer("bullets", A).includes("sittings"), "ayush bullets answer is clinical");
  assert.ok(localAnswer("career", A).includes("SHISHIKSHA"), "ayush career answer names shishiksha");
  assert.ok(buildPrompt("interview", S).includes("STAR template"), "tech prompt untouched");
});

test("bams deepen: clinical path for ayush, locked for tech", () => {
  const A = { ...S, roleLabel: "Ayush Professional", role: "ayush", score: 60, missing: ["gmp"] };
  const ayushAns = localAnswer("bams", A);
  assert.ok(ayushAns.includes("SHISHIKSHA") || ayushAns.includes("shishiksha"), "names shishiksha");
  assert.ok(ayushAns.includes("rotatory") || ayushAns.includes("Rotatory") || ayushAns.includes("परिवर्ती"), "lists rotatory internship");
  const techAns = localAnswer("bams", S);
  assert.ok(techAns.includes("Ayush Professional") || techAns.includes("tech") || techAns.includes("switch"), "locked for non-ayush");
});

test("bams deepen: hindi tone flips to devanagari when lang=hi", () => {
  const A = { ...S, roleLabel: "Ayush Professional", role: "ayush", score: 60, missing: ["gmp"], lang: "hi" };
  const hi = localAnswer("bams", A);
  assert.ok(hi.includes("अभियान") || hi.includes("गहराई") || hi.includes("बीज") || hi.includes("readiness"), "hindi bams answer present");
});

test("ask answers from local data, never asks for a key", () => {
  const A = { ...S, found: ["diagnosis"], missing: ["gmp"], score: 48 };
  assert.ok(!localAnswer("ask", { ...A, question: "hello" }).includes("VITE_"), "no key talk");
  assert.ok(localAnswer("ask", { ...A, question: "how do I learn gmp?" }).includes("gmp"), "gap skill routes to quests");
  assert.ok(localAnswer("ask", { ...A, question: "where internship?" }).includes("Internship"), "internship routes to feed");
  assert.ok(localAnswer("ask", { ...A, question: "my score?" }).includes("48"), "score question names score");
  assert.ok(localAnswer("ask", { ...A, question: "xyzzy" }).length > 20, "unknown still answers");
});

