import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { XP_WEIGHTS, levelFor, collectXP } from "../src/lib/xp.js";

describe("levelFor", () => {
  it("Beej to Acharya arc", () => {
    assert.equal(levelFor(0).name, "Beej");
    assert.equal(levelFor(120).name, "Shishya");
    assert.equal(levelFor(600).name, "Vaidya");
    assert.equal(levelFor(5000).name, "Acharya");
    assert.equal(levelFor(5000).next, null);
  });
  it("progress into level", () => {
    const l = levelFor(150);
    assert.equal(l.into, 50);
    assert.equal(l.of, 150);
  });
});

describe("collectXP", () => {
  it("weights kinds into sources", () => {
    const xp = collectXP({
      "2026-09-20": { total: 4, kinds: { quest: 2, quiz: 1, applied: 1 } },
      "2026-09-19": { total: 1, kinds: { saved: 1 } },
    });
    assert.equal(xp.bySource.quest, 2 * XP_WEIGHTS.quest);
    assert.equal(xp.bySource.quiz, XP_WEIGHTS.quiz);
    assert.equal(xp.bySource.pipeline, XP_WEIGHTS.applied + XP_WEIGHTS.saved);
    assert.equal(xp.total, 2 * 20 + 15 + 15 + 5);
    assert.equal(xp.name, "Beej");
  });
  it("empty detail is zero, never crashes", () => {
    assert.deepEqual(collectXP({}).bySource, { quest: 0, quiz: 0, interview: 0, resume: 0, pipeline: 0 });
  });
});
