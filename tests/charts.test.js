// node --test: chart geometry. The drawing maths is asserted here so the chart
// components stay dumb renderers, and the axis maths is checked against the
// cases that make a chart lie: an all-zero series, a single point, one slice.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  niceMax, ticks, polar, barRects, sparkPoints, linePath, areaPath, smoothPath,
  donutArcs, stackedBar, rankWidth, heatLevel, ringFraction, pct, clamp01,
} from "../src/lib/charts.js";

test("niceMax rounds up to a number a person would choose", () => {
  assert.equal(niceMax(23), 25);
  assert.equal(niceMax(7), 8);
  assert.equal(niceMax(1), 1);
  assert.equal(niceMax(0), 1, "an empty series still needs a non-zero top");
  assert.equal(niceMax(-4), 1, "negative input never produces a negative axis");
  assert.equal(niceMax(101), 150);
  assert.equal(niceMax(1000), 1000);
  assert.ok(niceMax(37) >= 37, "the top is never below the data it must contain");
});

test("ticks span zero to the nice top and land exactly on it", () => {
  const t = ticks(23, 4);
  assert.equal(t.length, 5);
  assert.equal(t[0], 0);
  assert.equal(t[4], niceMax(23));
  assert.deepEqual(t, [0, 6.25, 12.5, 18.75, 25]);
});

test("barRects keeps zero as zero height and never exceeds the track", () => {
  const { rects, max } = barRects([0, 5, 10], { width: 30, height: 60, gap: 0 });
  assert.equal(max, 10);
  assert.equal(rects.length, 3);
  assert.equal(rects[0].h, 0, "an empty bucket draws nothing rather than a stub");
  assert.equal(rects[2].h, 60, "the peak fills the track");
  assert.equal(rects[2].y, 0);
  assert.ok(rects.every((r) => r.y + r.h <= 60));
  for (const r of rects) assert.equal(r.w, 10, "columns divide the width evenly with no gap");
});

test("barRects survives an empty series", () => {
  assert.deepEqual(barRects([], { width: 100, height: 50 }).rects, []);
  assert.equal(barRects([], { width: 100, height: 50 }).max, 1);
});

test("sparkPoints flattens a flat series onto the middle line", () => {
  const pts = sparkPoints([3, 3, 3], { width: 100, height: 20, pad: 2 });
  assert.equal(pts.length, 3);
  const ys = new Set(pts.map((p) => p.y));
  assert.equal(ys.size, 1, "a flat line stays flat");
  assert.ok([...ys][0] > 2 && [...ys][0] < 18, "and sits inside the box, not on its floor");
  assert.equal(pts[0].x, 2);
  assert.equal(pts[2].x, 98);
});

test("sparkPoints handles zero, one and all-zero input", () => {
  assert.deepEqual(sparkPoints([]), []);
  assert.equal(sparkPoints([4]).length, 1);
  const zeros = sparkPoints([0, 0], { width: 10, height: 10, pad: 0 });
  assert.ok(zeros.every((p) => Number.isFinite(p.y)), "an all-zero series still yields real coordinates");
});

test("linePath and areaPath produce closed, well-formed path data", () => {
  const pts = sparkPoints([1, 4, 2], { width: 10, height: 10, pad: 0 });
  const line = linePath(pts);
  assert.ok(line.startsWith("M"), "a path starts with a move");
  assert.equal((line.match(/L/g) || []).length, 2, "one line command per following point");
  assert.equal(linePath([]), "");
  assert.equal(areaPath([pts[0]]), "", "one point cannot enclose an area");
  assert.ok(areaPath(pts, 10).endsWith("Z"), "the area closes back to its baseline");
});

test("donutArcs splits a circle by share and drops the gap on a lone slice", () => {
  const two = donutArcs([{ label: "a", value: 3 }, { label: "b", value: 1 }], { size: 100, thick: 10 });
  assert.equal(two.length, 2);
  assert.equal(two[0].share, 75);
  assert.equal(two[1].share, 25);
  assert.ok(two.every((s) => s.d.includes("A")), "each segment is an arc, not a wedge line");

  const one = donutArcs([{ label: "only", value: 5 }], { size: 100, thick: 10 });
  assert.equal(one.length, 1);
  assert.equal(one[0].share, 100);
  const arcSweep = (d) => Number(String(d).match(/A[\d.]+ [\d.]+ 0 (\d)/)?.[1] ?? -1);
  assert.equal(arcSweep(one[0].d), 1, "a full ring is one large-arc sweep with no notch");
});

test("donutArcs ignores empty and zero-valued input", () => {
  assert.deepEqual(donutArcs([]), []);
  assert.deepEqual(donutArcs([{ label: "a", value: 0 }]), []);
  const mixed = donutArcs([{ label: "a", value: 0 }, { label: "b", value: 2 }], { size: 40, thick: 6 });
  assert.equal(mixed[0].d, "", "a zero slice draws nothing");
  assert.equal(mixed[1].share, 100, "and does not dilute the shares of the rest");
});

test("stackedBar keeps parts in order and fills the track exactly", () => {
  const { bars, total } = stackedBar([{ label: "a", value: 1 }, { label: "b", value: 3 }], { width: 100 });
  assert.equal(total, 4);
  assert.equal(bars[0].label, "a");
  assert.equal(bars[0].x, 0, "the first band starts at the origin");
  assert.equal(bars[0].w, 25);
  assert.equal(bars[1].x, 25, "the next band begins where the last ended");
  assert.equal(bars[1].w, 75);
  assert.equal(bars[0].w + bars[1].w, 100, "the bands fill the track with no gap");
});

test("stackedBar survives an empty corpus without dividing by zero", () => {
  const { bars, total } = stackedBar([], { width: 50 });
  assert.equal(total, 0);
  assert.deepEqual(bars, []);
  const zeroes = stackedBar([{ value: 0 }, { value: 0 }], { width: 50 });
  assert.ok(zeroes.bars.every((b) => b.w === 0 && Number.isFinite(b.share)));
});

test("rankWidth scales against the leader, not the sum", () => {
  assert.equal(rankWidth(10, 10), 100);
  assert.equal(rankWidth(5, 10), 50);
  assert.equal(rankWidth(4, 0), 0, "no leader means no bar");
  assert.equal(rankWidth(99, 10), 100, "a value above the leader cannot overflow the track");
});

test("heatLevel quantises into steps and keeps non-zero visible", () => {
  assert.equal(heatLevel(0, 10), 0);
  assert.ok(heatLevel(1, 100) > 0, "a single posting is still a visible cell");
  assert.equal(heatLevel(10, 10), 1);
  assert.equal(heatLevel(5, 0), 1, "no scale means no suppression");
});

test("scalar helpers refuse to divide by zero", () => {
  assert.equal(pct(1, 0), 0);
  assert.equal(pct(1, 4), 25);
  assert.equal(clamp01(-3), 0);
  assert.equal(clamp01(3), 1);
  assert.equal(clamp01("x"), 0, "junk is treated as zero, not as NaN");
  assert.equal(ringFraction(5, 0), 1);
  assert.equal(ringFraction(5, 10), 0.5);
});

test("smoothPath relaxes points into cubic segments without moving them", () => {
  const pts = [{ x: 0, y: 10 }, { x: 5, y: 0 }, { x: 10, y: 10 }];
  const d = smoothPath(pts);
  assert.ok(d.startsWith("M0 10"), "a path starts with a move to the first point");
  assert.equal((d.match(/C/g) || []).length, 2, "one cubic segment per following point");
  assert.ok(d.endsWith("10 10"), "segments land exactly on the data points");
  assert.equal(smoothPath([]), "");
  assert.equal(smoothPath([{ x: 3, y: 4 }]), "M3 4", "one point cannot curve");
  const line = smoothPath(sparkPoints([1, 4, 2], { width: 10, height: 10, pad: 0 }));
  assert.ok(/^M-?[\d.]+ -?[\d.]+( C-?[\d.]+ -?[\d.]+ -?[\d.]+ -?[\d.]+ -?[\d.]+ -?[\d.]+)+$/.test(line), "only moves and cubics, nothing else");
});

test("polar places angles clockwise from twelve o'clock", () => {
  const top = polar(50, 50, 10, -Math.PI / 2);
  assert.equal(top.x, 50);
  assert.equal(top.y, 40, "a negative quarter turn is up");
  const right = polar(50, 50, 10, 0);
  assert.equal(right.x, 60);
  assert.equal(right.y, 50);
});
