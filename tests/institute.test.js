// node --test: demo cohort + stats + CSV. Pure, no network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { COHORT, mainOf, cohortStats, toCSV } from "../src/lib/cohort.js";
import { combineScores } from "../src/lib/score.js";

const FIX = [
  { name: "A", role: "sde", ats: 80, quiz: 100, quests: 5, gaps: ["react", "dsa"], applied: true },
  { name: "B", role: "sde", ats: 40, quiz: 0, quests: 0, gaps: ["react", "node"], applied: false },
  { name: "C", role: "marketing", ats: 70, quiz: 60, quests: 2, gaps: ["seo", "react"], applied: true },
  { name: "D", role: "data", ats: 50, quiz: 50, quests: 1, gaps: ["sql"], applied: false },
];

test("COHORT: 8 BAMS students, all ayush, required fields", () => {
  assert.equal(COHORT.length, 8);
  for (const s of COHORT) {
    assert.equal(s.role, "ayush");
    for (const k of ["name", "role", "ats", "quiz", "quests", "gaps", "applied"]) {
      assert.ok(s[k] !== undefined, `${s.name} needs ${k}`);
    }
    assert.ok(Array.isArray(s.gaps) && s.gaps.length > 0, `${s.name} needs gaps`);
  }
});

test("mainOf reuses the single MAIN formula", () => {
  const s = { ats: 80, quiz: 100, quests: 5, role: "sde" };
  assert.equal(mainOf(s), combineScores(80, 100, 5, "sde").main);
  assert.equal(mainOf(s), 90); // 0.5*80 + 0.3*100 + 0.2*100
});

test("cohortStats: avgs, gold%, top gaps, funnel", () => {
  const st = cohortStats(FIX);
  assert.equal(st.total, 4);
  assert.deepEqual(st.avgByRole, { sde: 55, marketing: 64, data: 44 });
  assert.equal(st.goldPct, 25); // only A (90) hits Gold+ ≥65; C lands 64
  assert.equal(st.topGaps[0].skill, "react");
  assert.equal(st.topGaps[0].n, 3);
  assert.equal(st.topGaps.length, 5);
  assert.deepEqual(st.funnel, { scored: 4, quiz: 3, gold: 1, applied: 2 });
});

test("toCSV: header, comma-quoting, Yes/No", () => {
  const csv = toCSV([{ name: "A, B", role: "sde", ats: 80, quiz: 100, quests: 5, main: 90, rank: "Diamond", applied: true }]);
  const lines = csv.split("\n");
  assert.equal(lines[0], "name,role,ats,quiz,quests,main,rank,applied");
  assert.equal(lines[1], '"A, B",sde,80,100,5,90,Diamond,Yes');
});
