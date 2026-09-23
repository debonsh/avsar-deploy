import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { levelFor, heatmapWeeks, currentStreak, totalActive, collectDayCounts } from "../src/lib/streak.js";

describe("levelFor", () => {
  it("buckets GitHub-style", () => {
    assert.deepEqual([0, 1, 2, 3, 4, 5, 7, 8, 20].map(levelFor), [0, 1, 1, 2, 2, 3, 3, 4, 4]);
  });
});

describe("heatmapWeeks", () => {
  it("fixed 16x7 shape ending today", () => {
    const cols = heatmapWeeks({ "2026-09-20": 5 }, 16, "2026-09-20");
    assert.equal(cols.length, 16);
    assert.ok(cols.every((c) => c.length === 7));
    assert.equal(cols[15][6].date, "2026-09-20");
    assert.equal(cols[15][6].level, 3);
  });
});

describe("currentStreak", () => {
  it("counts back consecutive days, alive through yesterday", () => {
    const c = { "2026-09-18": 2, "2026-09-19": 1, "2026-09-20": 3 };
    assert.equal(currentStreak(c, "2026-09-20"), 3);
    assert.equal(currentStreak({ "2026-09-19": 1 }, "2026-09-20"), 1);
    assert.equal(currentStreak({ "2026-09-18": 1 }, "2026-09-20"), 0);
    assert.equal(currentStreak({}, "2026-09-20"), 0);
  });
});

describe("collectDayCounts", () => {
  it("merges interview map, quest days, and job events", () => {
    const store = {
      "avsar-progress-v1": JSON.stringify({ interview: { "interview:2026-09-20": 2 }, questDays: { "2026-09-19": 1 }, quests: {}, evidence: {}, streak: {}, }),
      "avsar-job-events": JSON.stringify([{ jobId: "1", event: "saved", at: new Date("2026-09-20T10:00:00").getTime() }]),
    };
    globalThis.localStorage = {
      removeItem: (k) => { delete store[k]; },
      getItem: (k) => store[k] ?? null,
      setItem: (k, v) => { store[k] = String(v); },
    };
    const c = collectDayCounts();
    assert.equal(c["2026-09-20"], 3);
    assert.equal(c["2026-09-19"], 1);
    assert.equal(totalActive(c), 2);
    delete globalThis.localStorage;
  });
});
