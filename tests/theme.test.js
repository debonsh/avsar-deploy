// node --test: the theme scope every screen renders under.
// Regression: the pre-portal landing rendered with no scope class at all, so a
// fresh device opened on the dark body floor (#06060b) while `avsar-theme` said
// light, the header painted its dark chrome, and the toggle did nothing until a
// portal had been picked and the person navigated back.
import { test } from "node:test";
import assert from "node:assert/strict";
import { surfaceFor, floorFor, THEME_FLOORS, loadTheme, saveTheme } from "../src/lib/theme.js";

test("every track and theme resolves to a real scope class", () => {
  for (const track of [null, "ayush", "tech"]) {
    for (const theme of ["light", "dark"]) {
      const cls = surfaceFor(track, theme);
      assert.ok(cls, `${track}/${theme} rendered unscoped`);
      assert.match(cls, /^(ayush|tech)-(light|dark)$/, `${track}/${theme} → ${cls}`);
    }
  }
});

test("the landing borrows the tech floor so the theme works before a portal", () => {
  assert.equal(surfaceFor(null, "light"), "tech-light");
  assert.equal(surfaceFor(null, "dark"), "tech-dark");
  assert.equal(floorFor(null, "light"), THEME_FLOORS.tech.light);
  assert.notEqual(floorFor(null, "light"), "#06060b");
});

test("an onboarded portal keeps its own floor", () => {
  assert.equal(surfaceFor("tech", "light"), "tech-light");
  assert.equal(surfaceFor("tech", "dark"), "tech-dark");
  assert.equal(surfaceFor("ayush", "light"), "ayush-light");
  assert.equal(surfaceFor("ayush", "dark"), "ayush-dark");
  assert.equal(floorFor("ayush", "light"), "#f6f3ea");
  assert.equal(floorFor("ayush", "dark"), "#0d100e");
});

test("a light scope never resolves to a dark floor", () => {
  for (const track of [null, "ayush", "tech"]) {
    assert.match(floorFor(track, "light"), /^#f/, `${track} light floor must be a light colour`);
  }
});

test("theme defaults to light and round-trips through the store", () => {
  // node ships a built-in localStorage that cannot persist without
  // --localstorage-file, so stub the same in-memory store roles.test.js uses.
  const mem = {};
  globalThis.localStorage = {
    removeItem: (k) => { delete mem[k]; },
    getItem: (k) => mem[k] ?? null,
    setItem: (k, v) => { mem[k] = String(v); },
  };
  assert.equal(loadTheme(), "light");
  assert.equal(saveTheme("dark"), undefined);
  assert.equal(loadTheme(), "dark");
  saveTheme("light");
  assert.equal(loadTheme(), "light");
  delete globalThis.localStorage;
});
