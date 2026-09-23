// node --test: the legacy key rename must not cost anyone their profile,
// resume, progress or device id. Old "c2c-*" keys move to the avsar- prefix
// once, values untouched, and a key already present under the new name wins.
import { test } from "node:test";
import assert from "node:assert/strict";
import { migrateLegacyKeys } from "../src/lib/storage.js";

// A faithful localStorage stand-in: like the real Storage, its own enumerable
// keys ARE the stored keys (that is what Object.keys(localStorage) returns in a
// browser), with the three API methods hanging off the same object.
function withStore(init = {}) {
  const ls = { ...init };
  ls.getItem = (k) => (k in ls ? ls[k] : null);
  ls.setItem = (k, v) => { ls[k] = String(v); };
  ls.removeItem = (k) => { delete ls[k]; };
  globalThis.localStorage = ls;
  return ls;
}

test("legacy keys move to the avsar prefix with their values intact", () => {
  const store = withStore({
    "c2c-track": "tech",
    "c2c-profile-v1": '{"skills":"python"}',
    "c2c-id": "AVSAR-ABC123",
  });
  assert.equal(migrateLegacyKeys(), 3);
  assert.equal(store["avsar-track"], "tech");
  assert.equal(store["avsar-profile-v1"], '{"skills":"python"}');
  assert.equal(store["avsar-id"], "AVSAR-ABC123");
  assert.equal("c2c-track" in store, false);
  assert.equal("c2c-id" in store, false);
  delete globalThis.localStorage;
});

test("a key that already exists under the new name wins, the stale copy goes", () => {
  const store = withStore({ "c2c-theme": '"dark"', "avsar-theme": '"light"', unrelated: "x" });
  assert.equal(migrateLegacyKeys(), 0);
  assert.equal(store["avsar-theme"], '"light"');
  assert.equal("c2c-theme" in store, false);
  assert.equal(store.unrelated, "x");
  delete globalThis.localStorage;
});

test("a clean device migrates nothing", () => {
  const store = withStore({ "avsar-track": "ayush" });
  assert.equal(migrateLegacyKeys(), 0);
  assert.equal(store["avsar-track"], "ayush");
  delete globalThis.localStorage;
});

test("no localStorage (node, SSR, private mode) is a no-op, never a throw", () => {
  assert.equal(migrateLegacyKeys(), 0);
});
