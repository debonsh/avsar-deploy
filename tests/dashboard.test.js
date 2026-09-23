// node --test: dashboard math. Pure, no DOM.
import { test } from "node:test";
import assert from "node:assert/strict";
import { donutSegments, weekTrend, recentActivity, briefing, demandHeatmap } from "../src/lib/dashboard.js";

test("donutSegments fractions sum to 1, empties to one gray slice", () => {
  const segs = donutSegments([["saved", 2], ["applied", 2]]);
  assert.ok(Math.abs(segs.reduce((a, s) => a + s.fraction, 0) - 1) < 1e-9);
  assert.equal(segs[0].start, 0);
  assert.equal(segs[1].start, 0.5);
  assert.deepEqual(donutSegments([]), [{ label: "none", value: 0, fraction: 1, start: 0 }]);
  assert.equal(donutSegments([["a", 0], ["b", 3]]).length, 1);
});

test("weekTrend buckets events into 7 weekday slots", () => {
  const now = Date.UTC(2026, 8, 13, 12);
  const days = weekTrend([
    { event: "applied", at: now },
    { event: "saved", at: now - 86400000 },
    { event: "applied", at: now - 30 * 86400000 },
  ], now);
  assert.equal(days.length, 7);
  assert.equal(days[6].applied, 1);
  assert.equal(days[5].saved, 1);
  assert.ok(days.every((d) => d.label.length >= 1));
});

test("recentActivity resolves titles, newest first, caps at n", () => {
  const byId = { a: { title: "FE Intern", company: "Z" } };
  const out = recentActivity(
    [{ jobId: "a", event: "saved", at: 2 }, { jobId: "b", event: "applied", at: 5 }, { jobId: null, at: 9 }],
    byId, 5
  );
  assert.equal(out[0].title, "A role");
  assert.equal(out[1].title, "FE Intern");
  assert.equal(out.length, 2);
});

test("briefing names strong matches, top blocker, interview state", () => {
  const jobs = [
    { id: "1", title: "FE Intern", eligible: true, skills: ["react", "html", "css", "git"] },
    { id: "2", title: "BE Intern", eligible: false, skills: ["node", "sql"] },
  ];
  const lines = briefing({ funnel: { interview: 1 }, jobs, found: ["react", "html", "css", "git"], missing: ["node"] });
  assert.ok(lines.some((l) => /75%/.test(l)), "strong match line");
  assert.ok(lines.some((l) => /node/.test(l)), "blocker line");
  assert.ok(lines.some((l) => /interview/.test(l)), "interview line");
  assert.ok(briefing({}).length > 0, "empty state still briefs");
});

test("demandHeatmap counts postings per skill, marks have/gap, sorts desc", () => {
  const jobs = [
    { skills: ["react", "sql"] },
    { skills: ["react", "node"] },
    { skills: ["sql"] },
  ];
  const heat = demandHeatmap(jobs, ["react"], 10);
  assert.deepEqual(heat, [
    { skill: "react", demand: 2, have: true },
    { skill: "sql", demand: 2, have: false },
    { skill: "node", demand: 1, have: false },
  ]);
  assert.deepEqual(demandHeatmap([], []), []);
});
