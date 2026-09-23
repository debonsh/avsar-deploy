// node --test: pure board mappers (TDD red first). No network, no localStorage touched.
import { test } from "node:test";
import assert from "node:assert/strict";
import { toJobShape, mergeJobs, listApplicants } from "../src/lib/store.js";

const ROW = {
  id: "abc-123", title: "ML Intern", company: "Acme", location: "Remote",
  type: "Internship", role_key: "data", required_skills: ["Python", "SQL"],
  min_score: 45, apply_url: "https://x.test/apply", description: "d",
};

test("toJobShape maps a board row to the JOBS card shape", () => {
  const j = toJobShape(ROW);
  assert.equal(j.id, "remote-abc-123");
  assert.equal(j.role, "data");
  assert.deepEqual(j.skills, ["Python", "SQL"]);
  assert.equal(j.minScore, 45);
  assert.equal(j.loc, "Remote");
  assert.equal(j.apply, "https://x.test/apply");
});

test("toJobShape fills sane defaults for sparse rows", () => {
  const j = toJobShape({ id: "z", title: "T" });
  assert.equal(j.role, "sde");
  assert.deepEqual(j.skills, []);
  assert.equal(j.minScore, 40);
});

test("mergeJobs dedupes by id, first list wins, order kept", () => {
  const a = [{ id: 1 }, { id: 2 }];
  const b = [{ id: 2 }, { id: 3 }];
  const out = mergeJobs(a, b, null);
  assert.deepEqual(out.map((j) => j.id), [1, 2, 3]);
});

test("listApplicants is empty offline with no local rows, never throws", async () => {
  const rows = await listApplicants("no-such-job");
  assert.deepEqual(rows, []);
});
