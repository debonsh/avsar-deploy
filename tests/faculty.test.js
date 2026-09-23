// node --test: FDP seeds + interest store. Pure, no network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { FDPS } from "../src/data/fdps.js";
import { AYUSH_FDPS } from "../src/ayush/seed.js";
import { loadInterests, toggleInterest, recordInterest } from "../src/lib/store.js";

// tiny in-memory localStorage for node (guarded fns never throw without it, but persistence needs it)
const mem = {};
globalThis.localStorage = {
  getItem: (k) => (k in mem ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v); },
  removeItem: (k) => { delete mem[k]; },
};

test("FDPS: ayush-only board, required fields, unique ids", () => {
  assert.equal(FDPS.length, AYUSH_FDPS.length + 3);
  for (const f of FDPS) {
    assert.ok(String(f.id).startsWith("a"), `fdp ${f.id} lives on the ayush board`);
    for (const k of ["id", "kind", "title", "org", "loc", "url", "deadline"]) {
      assert.ok(f[k], `fdp ${f.id} needs ${k}`);
    }
  }
  assert.equal(new Set(FDPS.map((f) => f.id)).size, FDPS.length, "ids unique");
});

test("interests: toggle adds then removes, persists", () => {
  assert.deepEqual(loadInterests(), []);
  assert.deepEqual(toggleInterest("a1"), ["a1"]);
  assert.deepEqual(loadInterests(), ["a1"]);
  assert.deepEqual(toggleInterest("a1"), []);
});

test("recordInterest: offline saves local, returns false (seeds already showing)", async () => {
  const ok = await recordInterest({ id: "a2", title: "T" });
  assert.equal(ok, false);
  assert.deepEqual(loadInterests(), ["a2"]);
});
