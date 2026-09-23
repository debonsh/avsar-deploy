// node --test: deterministic variant picker + evidence-URL gate. Pure, no storage.
import { test } from "node:test";
import assert from "node:assert/strict";
import { hashStr, pickForId, isEvidenceUrl } from "../src/lib/quests.js";
import { QUEST_TREE, questFor } from "../src/data/quests.js";

test("same id + salt always picks the same variant (stable per student)", () => {
  const pool = ["a", "b", "c"];
  assert.equal(pickForId(pool, "AVSAR-X7K2QA", "sde:react"), pickForId(pool, "AVSAR-X7K2QA", "sde:react"));
});

test("different ids spread across variants (unique-ish per student)", () => {
  const pool = ["a", "b", "c"];
  const picks = new Set(Array.from({ length: 12 }, (_, i) => pickForId(pool, `AVSAR-ID${i}`, "sde:react")));
  assert.ok(picks.size > 1, "12 ids should not all land on one variant");
});

test("empty pool returns null, never throws", () => {
  assert.equal(pickForId([], "AVSAR-X"), null);
});

test("hashStr is a stable uint32", () => {
  assert.equal(hashStr("abc"), hashStr("abc"));
  assert.ok(hashStr("abc") !== hashStr("abd"));
});

test("isEvidenceUrl accepts real links, rejects junk", () => {
  assert.equal(isEvidenceUrl("https://github.com/u/repo"), true);
  assert.equal(isEvidenceUrl("http://vercel.app/x-long-enough"), true);
  assert.equal(isEvidenceUrl("not a link"), false);
  assert.equal(isEvidenceUrl("https://x.co"), false); // too short to be proof
  assert.equal(isEvidenceUrl(""), false);
});

test("every scoring lane has its own skill tree", () => {
  for (const lane of ["ayush", "sde", "data", "marketing", "govt"]) {
    const tree = questFor(lane);
    assert.ok(tree.label, `${lane} needs a label`);
    assert.ok(tree.branches.length >= 3, `${lane} needs branches`);
    assert.ok(QUEST_TREE[lane] === tree, `${lane} must not fall back`);
  }
});

test("an unknown lane falls back to ayush, never to a blank screen", () => {
  assert.equal(questFor("nope"), QUEST_TREE.ayush);
});

test("every skill pairs a course with a project — pair-gating depends on it", () => {
  for (const lane of ["ayush", "sde", "data", "marketing", "govt"]) {
    for (const branch of questFor(lane).branches) {
      for (const skill of branch.skills) {
        assert.ok(skill.course?.t && skill.course?.u, `${lane}:${skill.id} needs a course`);
        assert.ok(skill.project, `${lane}:${skill.id} needs a project`);
      }
    }
  }
});
