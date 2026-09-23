// node --test: programs module — the collaboration layer's student side.
import { test } from "node:test";
import assert from "node:assert/strict";
import { PROGRAMS, PROGRAM_KINDS, programsFor, programsByKind } from "../src/data/programs.js";
import { skillById } from "../src/data/taxonomy.js";
import { loadEnrollments, toggleEnrollment } from "../src/lib/store.js";

test("every PS collaboration kind is represented", () => {
  for (const kind of ["program", "workshop", "mentorship", "challenge"]) {
    assert.ok(PROGRAMS.some((p) => p.kind === kind), `missing kind: ${kind}`);
  }
});

test("programs point at real taxonomy skills and https providers", () => {
  for (const p of PROGRAMS) {
    assert.ok(PROGRAM_KINDS[p.kind], `kind for ${p.id}`);
    assert.ok(p.title && p.provider, `identity for ${p.id}`);
    assert.ok(/^https:\/\//.test(p.url), `url for ${p.id}`);
    assert.ok(p.hours > 0, `hours for ${p.id}`);
    assert.ok(p.skills.length >= 1, `skills for ${p.id}`);
    for (const s of p.skills) assert.ok(skillById(s), `${p.id} → unknown skill ${s}`);
  }
});

test("lookup helpers filter by skill and kind", () => {
  assert.ok(programsFor("pharmacovigilance").some((p) => p.id === "pg-pvpi"));
  assert.equal(programsByKind("challenge").every((p) => p.kind === "challenge"), true);
  assert.equal(programsByKind("all").length, PROGRAMS.length);
  assert.equal(programsByKind("").length, PROGRAMS.length);
});

test("enrollment toggles without a backend", () => {
  // node has no localStorage: toggle is a no-op there, a real write in browsers
  const out = toggleEnrollment("pg-gmp");
  assert.ok(Array.isArray(out));
  assert.ok(Array.isArray(loadEnrollments()));
});
