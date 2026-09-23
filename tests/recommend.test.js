// node --test: demand-ordered recommendations + live-job shaping. Pure, no network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { orderMissingByDemand, jobDemand, roadmapGenerator } from "../src/lib/roadmapGenerator.js";
import { guessRole, extractSkills, toLiveJobShape } from "../src/lib/store.js";

const JOBS = [
  { skills: ["react", "javascript", "git"] },
  { skills: ["react", "node"] },
  { skills: ["python", "sql"] },
];

test("jobDemand counts skill frequency across jobs", () => {
  const d = jobDemand(JOBS);
  assert.equal(d.get("react"), 2);
  assert.equal(d.get("sql"), 1);
  assert.equal(d.get("go") || 0, 0);
});

test("orderMissingByDemand puts most-asked skills first (stable)", () => {
  assert.deepEqual(orderMissingByDemand(["sql", "react", "go"], JOBS), ["react", "sql", "go"]);
  assert.deepEqual(orderMissingByDemand([], JOBS), []);
});

test("roadmapGenerator leads week 1 with highest-demand skill + real quest project", () => {
  const AJOBS = [
    { skills: ["diagnosis", "documentation"] },
    { skills: ["gmp", "diagnosis"] },
  ];
  const weeks = roadmapGenerator(["gmp", "diagnosis"], "ayush", AJOBS);
  assert.ok(weeks.length >= 1);
  assert.match(weeks[0].tasks[0].text, /diagnosis/i);
  assert.match(weeks[0].tasks[0].text, /asked in 2 open roles/);
  const proj = weeks[0].tasks.find((t) => t.text.startsWith("Build:"));
  assert.ok(proj, "known quest skill should reuse quest project text");
});

test("guessRole maps titles to tracks, drops the unmappable", () => {
  assert.equal(guessRole("Senior React Developer"), "sde");
  assert.equal(guessRole("Data Analyst, SQL"), "data");
  assert.equal(guessRole("SEO Content Writer"), "marketing");
  assert.equal(guessRole("Office Assistant"), null);
});

test("extractSkills finds vocab hits incl. github→git alias", () => {
  const s = extractSkills("React developer, must know git. GitHub portfolio required.", ["react", "git"]);
  assert.deepEqual(s, ["react", "git"]);
});

test("toLiveJobShape builds a feed card, drops junk rows", () => {
  const j = toLiveJobShape({ id: 9, title: "Frontend Engineer", company_name: "Acme", url: "https://x", job_type: "full_time", category: "Software Development", description: "React and git daily." });
  assert.equal(j.id, "live-9");
  assert.equal(j.role, "sde");
  assert.equal(j.type, "Full-time");
  assert.equal(j.live, true);
  assert.ok(j.skills.includes("react"));
  assert.equal(toLiveJobShape({ title: "Office Assistant" }), null);
});
