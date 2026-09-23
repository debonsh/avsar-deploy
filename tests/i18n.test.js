// node --test: bilingual dictionary stays in lockstep. Parity is the feature.
import { test } from "node:test";
import assert from "node:assert/strict";
import { STRINGS, LANGS, t, loadLang, saveLang } from "../src/lib/i18n.js";

test("EN and HI carry exactly the same keys", () => {
  const en = Object.keys(STRINGS.en).sort();
  const hi = Object.keys(STRINGS.hi).sort();
  assert.deepEqual(hi, en, "dictionary drift — translate both ways");
  for (const k of en) {
    assert.ok(STRINGS.en[k].trim(), `en:${k} empty`);
    assert.ok(STRINGS.hi[k].trim(), `hi:${k} empty`);
  }
});

test("t() falls back to English, then to the key", () => {
  assert.equal(t("hi", "nav.home"), "होम");
  assert.equal(t("en", "nav.home"), "Home");
  assert.equal(t("xx", "nav.home"), "Home");
  assert.equal(t("en", "missing.key"), "missing.key");
});

test("lang persistence is binary-safe outside browsers", () => {
  assert.equal(loadLang(), "en", "default is English with no storage");
  saveLang("hi");
  saveLang("fr");
  assert.ok(LANGS.some((l) => l.id === "hi"));
});
