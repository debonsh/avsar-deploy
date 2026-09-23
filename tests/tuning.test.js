// node --test: pre-fed tuning — presets, custom instructions, preamble composition.
// Persistence is browser-only; here we verify defaults + composition (no network).
import { test } from "node:test";
import assert from "node:assert/strict";
import { TONES, DEFAULT_TONE, getTone, getCustom, systemPreamble } from "../src/data/tuning.js";

test("three tones, coach default", () => {
  assert.deepEqual(TONES.map((t) => t.id), ["coach", "drill", "hinglish"]);
  assert.equal(DEFAULT_TONE, "coach");
  assert.equal(getTone(), "coach");
});

test("preamble carries voice + tone prompt", () => {
  const p = systemPreamble();
  assert.match(p, /Placement-coach voice/);
  assert.match(p, /BAMS/);
});

test("custom empty by default, preamble stays short", () => {
  assert.equal(getCustom(), "");
  assert.equal(systemPreamble().length < 400, true);
});
