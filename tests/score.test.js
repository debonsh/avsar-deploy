// node --test: built-in runner, no framework needed (PRD §6)
// covers quest-merge math + the existing rubric end-to-end against a known input
import { test } from "node:test";
import assert from "node:assert/strict";
import { scoreResume } from "../src/lib/score.js";

const RESUME = `
Ananya Sharma
Email: ananya@xyz.edu  |  github.com/ananyax  |  +91-9876543210

EDUCATION
B.Tech Computer Science, Tier-3 college, 2024-2026
CGPA: 8.4

PROJECTS
- Built a React Todo app deployed on Vercel, used by 200+ classmates
- Wrote 120 SQL queries on an e-commerce dataset, published on GitHub
- Python script that cleans CSV files; reduced manual cleanup by 30%

EXPERIENCE
Frontend Intern, ZetaPay (Jul–Sep 2024)
- Shipped an internal dashboard in React + TypeScript
- Owned deployment via Vercel, added basic tests
`;

test("counts resume skills against the role rubric", () => {
  const r = scoreResume(RESUME, "sde");
  assert.equal(r.found.includes("react"), true, "react should be found");
  assert.equal(r.found.includes("sql"), true, "sql should be found");
  assert.equal(r.total > 50, true, "well-written resume should score > 50");
  assert.equal(r.total <= 95, true, "score caps at 95");
});

test("merging a quest-earned skill boosts the skill line", () => {
  const baseline = scoreResume(RESUME, "sde");
  const withoutEarn = baseline.breakdown.find((b) => b.label === "Skills Match").pts;
  const boosted = scoreResume(RESUME, "sde", ["docker", "kubernetes"]);
  const withEarn = boosted.breakdown.find((b) => b.label === "Skills Match").pts;
  assert.equal(withEarn > withoutEarn, true, "earned skills should raise Skills Match");
  assert.deepEqual(boosted.earned, ["docker", "kubernetes"], "earned skills echoed on result");
});

test("earned skills are capped to role length so metric stays bounded", () => {
  const r = scoreResume(RESUME, "sde", ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"]);
  assert.equal(r.total <= 95, true, "earned skills must not break the cap");
});

test("empty text returns a no-op result, not a crash", () => {
  const r = scoreResume("", "sde");
  assert.equal(r.total, 0);
  assert.match(r.msg, /Upload a real resume/);
});
