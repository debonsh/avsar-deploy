// node --test: ATS engine v2 — transparent dimensions, density caps, project quality.
// Rule: filler (keyword soup, no proof) must score BELOW project-strong. Same resume → same score.
import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreATS } from "../src/lib/ats.js";

const FILLER = `
My resume. Skills: javascript react node python git sql dsa api html css.
Keywords: project internship github developed deployed api project internship github developed deployed api.
I know javascript react node python git sql. Hire me for javascript react node.
`;

const BUILDER = `
Rohan Verma — rohan@xyz.edu | github.com/rohanv | +91-9000000001

EDUCATION
B.Tech IT, 2022-2026

PROJECTS
- Shipped a hostel mess feedback app (React + Node) live at mess.app.in, 400+ daily users: https://mess.app.in
- Built an attendance tracker, source on https://github.com/rohanv/attend; cut proxy marking by 60%
- Led a 3-person team; automated Excel reports with Python, saved 5 hrs/week

EXPERIENCE
Frontend Intern, Northwind (Jun–Aug 2025) — deployed vendor portal on Vercel
`;

test("project-strong beats keyword filler", () => {
  const filler = scoreATS(FILLER, "sde");
  const builder = scoreATS(BUILDER, "sde");
  assert.equal(builder.total > filler.total, true, `builder ${builder.total} should beat filler ${filler.total}`);
});

test("keyword stuffing is capped, not rewarded", () => {
  const base = "my skills: react node. I built things with react and node.";
  const stuffed = `my skills: react node. ${"react node ".repeat(20)}`;
  const a = scoreATS(`TITLE\n${base}\nCONTACT me at a@b.c | 2024`, "sde");
  const b = scoreATS(`TITLE\n${stuffed}\nCONTACT me at a@b.c | 2024`, "sde");
  const kwA = a.breakdown.find((d) => d.label === "Keyword Signal").pts;
  const kwB = b.breakdown.find((d) => d.label === "Keyword Signal").pts;
  assert.equal(kwB <= kwA, true, `stuffed kw ${kwB} must not beat clean kw ${kwA}`);
});

test("every dimension explains itself", () => {
  const r = scoreATS(BUILDER, "sde");
  for (const d of r.breakdown) {
    assert.equal(Array.isArray(d.why) && d.why.length > 0, true, `${d.label} needs reasons`);
  }
});

test("same resume, same score — deterministic", () => {
  const a = scoreATS(BUILDER, "sde");
  const b = scoreATS(BUILDER, "sde");
  assert.deepEqual(a, b);
});

test("verified project links add proof points", () => {
  const plain = scoreATS(BUILDER, "sde");
  const proved = scoreATS(BUILDER, "sde", { proof: { linkedProjects: ["https://github.com/rohanv/extra", "https://extra.app.in"] } });
  const pq = (r) => r.breakdown.find((d) => d.label === "Project Quality").pts;
  assert.equal(pq(proved) > pq(plain), true, "linked proof should lift Project Quality");
});

test("short text returns the no-op shape", () => {
  const r = scoreATS("hi", "sde");
  assert.equal(r.total, 0);
  assert.match(r.msg, /Upload a real resume/);
  assert.deepEqual(r.found, []);
});

test("clinical verbs and tokens count for bams resumes", () => {
  const base = "TITLE\nCONTACT me at a@b.c | 2024\nBAMS student. OPD assistant. Panchakarma sittings.";
  const clinical = `${base}\nAssisted 40 panchakarma sittings, documented 120 case sheets, supervised by vaidya. NABH hospital, HIMS entries.`;
  const a = scoreATS(base, "ayush");
  const b = scoreATS(clinical, "ayush");
  assert.equal(b.total > a.total, true, `clinical proof ${b.total} should beat bare claims ${a.total}`);
  assert.ok(b.found.includes("panchakarma"), "clinical skill detected");
});
