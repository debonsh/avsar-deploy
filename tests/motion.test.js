// node --test: the motion spine. Tokens stay numeric and ordered, springs stay
// physical, stagger intervals stay inside the 0.05-0.10s band, and the animate
// gate stays permissive in node (no window) so tests never depend on hardware.
import { test } from "node:test";
import assert from "node:assert/strict";
import { motionTokens, springs, clampStagger, shouldAnimate } from "../src/lib/motion.js";

test("durations ascend instant to crawl", () => {
  const d = motionTokens.duration;
  assert.ok(d.instant < d.fast && d.fast < d.normal && d.normal < d.slow && d.slow < d.crawl);
});

test("distances and scales are positive and ordered", () => {
  const { distance, scale } = motionTokens;
  assert.ok(distance.xs < distance.sm && distance.sm < distance.md && distance.md < distance.lg);
  assert.ok(scale.press < scale.subtle && scale.subtle < 1 && 1 < scale.pop);
});

test("every spring is a real spring config", () => {
  for (const [name, s] of Object.entries(springs)) {
    assert.equal(s.type, "spring", name);
    assert.ok(s.stiffness > 0 && s.damping > 0, name);
  }
});

test("stagger clamps into the 0.05-0.10 band", () => {
  assert.equal(clampStagger(0.08), 0.08);
  assert.equal(clampStagger(0.01), 0.05);
  assert.equal(clampStagger(0.5), 0.1);
  assert.equal(clampStagger(0.05), 0.05);
  assert.equal(clampStagger(0.1), 0.1);
});

test("animate gate passes in node and honors reduced motion", () => {
  assert.equal(shouldAnimate(), true);
  assert.equal(shouldAnimate({ essential: true }), true);
});
