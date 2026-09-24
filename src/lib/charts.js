// Chart geometry, pure. Every function returns numbers or SVG path strings and
// touches no DOM, so the drawing maths is what the tests assert and the elements
// in components/charts.jsx stay dumb renderers. Charts here carry measurements
// that a judge is meant to trust, which is also why they stay SVG and CSS rather
// than a charting package the offline build would have to ship.
const round = (n, p = 2) => {
  const f = 10 ** p;
  return Math.round((Number.isFinite(n) ? n : 0) * f) / f;
};

const num = (n) => (Number.isFinite(Number(n)) ? Math.max(0, Number(n)) : 0);

export const clamp01 = (n) => Math.min(1, Math.max(0, Number.isFinite(Number(n)) ? Number(n) : 0));

export function pct(part, whole, digits = 0) {
  const w = num(whole);
  if (!w) return 0;
  return round((num(part) / w) * 100, digits);
}

// The axis top: the smallest round number at or above the peak. A gridline
// labelled 20 or 25 reads as a number a person would choose; one labelled 23
// reads as a machine's output and makes the reader do the rounding themselves.
export function niceMax(value, steps = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) {
  const v = num(value);
  if (v <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(v));
  const norm = v / mag;
  for (const s of steps) if (norm <= s + 1e-9) return round(s * mag, 6);
  return round(10 * mag, 6);
}

// Gridline values from 0 to the nice top, always ending exactly on the top so
// the last line and the axis label cannot disagree.
export function ticks(max, count = 4) {
  const top = niceMax(max);
  const n = Math.max(1, Math.floor(count));
  return Array.from({ length: n + 1 }, (_, i) => round((top * i) / n, 6));
}

export function polar(cx, cy, r, angle) {
  return { x: round(cx + r * Math.cos(angle)), y: round(cy + r * Math.sin(angle)) };
}

// Vertical columns, oldest first. A zero value keeps zero height so an empty
// week reads as an empty week instead of a one-pixel stub that looks like data.
export function barRects(values = [], { width = 100, height = 60, gap = 2, minHeight = 2 } = {}) {
  const list = (values || []).map(num);
  const n = list.length;
  if (!n) return { rects: [], max: 1, width: 0 };
  const max = niceMax(Math.max(...list));
  const slot = width / n;
  const w = Math.max(1, round(slot - gap));
  const rects = list.map((v, i) => {
    const h = v === 0 ? 0 : Math.max(minHeight, round((v / max) * height));
    return { i, value: v, x: round(i * slot + gap / 2), y: round(height - h), w, h };
  });
  return { rects, max, width: slot };
}

// Sparkline points. A flat series sits on the middle line rather than on the
// baseline, because a flat line drawn at zero and a missing line look alike.
export function sparkPoints(values = [], { width = 96, height = 24, pad = 3 } = {}) {
  const list = (values || []).map(num);
  const n = list.length;
  if (!n) return [];
  const innerH = Math.max(1, height - pad * 2);
  const innerW = Math.max(1, width - pad * 2);
  const max = Math.max(...list);
  // "flat" means the series has no shape to show: every value equal, zeros included.
  // Drawing those against the max would pin them to the top or the floor, and a line
  // pinned to the floor is indistinguishable from a series with no data at all.
  const flat = list.every((v) => v === list[0]);
  if (n === 1) return [{ x: round(pad), y: round(pad + innerH / 2), value: list[0] }];
  const step = innerW / (n - 1);
  return list.map((v, i) => ({
    x: round(pad + i * step),
    y: round(flat ? pad + innerH / 2 : pad + innerH - (v / max) * innerH),
    value: v,
  }));
}

export function linePath(points = []) {
  if (!points.length) return "";
  return points.map((p, i) => `${i ? "L" : "M"}${round(p.x)} ${round(p.y)}`).join(" ");
}

// The same points as a rounded spline: Catmull-Rom control points relaxed into
// cubic segments, so a weekly series reads as a wave rather than a zigzag.
// A straight polyline through sparse week buckets implies a precision the
// sampling never had; the spline says "trend" out loud instead.
export function smoothPath(points = []) {
  const list = (points || []).map((p) => ({ x: num(p.x), y: num(p.y) }));
  if (list.length < 2) return list.length ? `M${round(list[0].x)} ${round(list[0].y)}` : "";
  let d = `M${round(list[0].x)} ${round(list[0].y)}`;
  for (let i = 0; i < list.length - 1; i++) {
    const p0 = list[Math.max(0, i - 1)];
    const p1 = list[i];
    const p2 = list[i + 1];
    const p3 = list[Math.min(list.length - 1, i + 2)];
    const c1x = round(p1.x + (p2.x - p0.x) / 6);
    const c1y = round(p1.y + (p2.y - p0.y) / 6);
    const c2x = round(p2.x - (p3.x - p1.x) / 6);
    const c2y = round(p2.y - (p3.y - p1.y) / 6);
    d += ` C${c1x} ${c1y} ${c2x} ${c2y} ${round(p2.x)} ${round(p2.y)}`;
  }
  return d;
}

// The same line closed down to a baseline, for the soft fill beneath it.
export function areaPath(points = [], baseline = 0) {
  if (points.length < 2) return "";
  const first = points[0];
  const last = points[points.length - 1];
  return `${linePath(points)} L${round(last.x)} ${round(baseline)} L${round(first.x)} ${round(baseline)} Z`;
}

// Donut segments as path data. Slices get an angular gap so two similar values
// stay legible as two values; a lone 100% slice gets no gap, because a notch in
// a full ring looks like a bug rather than a divider.
export function donutArcs(slices = [], { size = 120, thick = 16, gapDeg = 2 } = {}) {
  const total = (slices || []).reduce((a, s) => a + num(s.value), 0);
  if (!total) return [];
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = round(size / 2 - 1);
  const rInner = round(Math.max(1, rOuter - thick));
  const visible = (slices || []).filter((s) => num(s.value) > 0).length;
  const gap = visible > 1 ? (gapDeg * Math.PI) / 180 : 0;
  let angle = -Math.PI / 2;
  return (slices || []).map((s, i) => {
    const frac = num(s.value) / total;
    const sweep = frac * Math.PI * 2;
    const a0 = angle + gap / 2;
    const a1 = angle + sweep - gap / 2;
    angle += sweep;
    if (sweep <= 0 || a1 <= a0) return { ...s, i, d: "", fraction: round(frac, 4), share: round(frac * 100, 1) };
    const o0 = polar(cx, cy, rOuter, a0);
    const o1 = polar(cx, cy, rOuter, a1);
    const i1 = polar(cx, cy, rInner, a1);
    const i0 = polar(cx, cy, rInner, a0);
    const large = a1 - a0 > Math.PI ? 1 : 0;
    const d = [
      `M${o0.x} ${o0.y}`,
      `A${rOuter} ${rOuter} 0 ${large} 1 ${o1.x} ${o1.y}`,
      `L${i1.x} ${i1.y}`,
      `A${rInner} ${rInner} 0 ${large} 0 ${i0.x} ${i0.y}`,
      "Z",
    ].join(" ");
    return { ...s, i, d, fraction: round(frac, 4), share: round(frac * 100, 1) };
  });
}

// One horizontal stacked bar. Parts keep their input order so the legend and
// the bar can never be read in two different orders.
export function stackedBar(parts = [], { width = 100 } = {}) {
  const total = (parts || []).reduce((a, p) => a + num(p.value), 0);
  let x = 0;
  const bars = (parts || []).map((p, i) => {
    const frac = total ? num(p.value) / total : 0;
    const w = total ? round(frac * width) : 0;
    const bar = { ...p, i, x: round(x), w, fraction: round(frac, 4), share: round(frac * 100, 1) };
    x += w;
    return bar;
  });
  return { bars, total };
}

// Column index for a horizontal rank list: every row is scaled against the
// largest value, never against the sum, so the top row always fills the track.
export function rankWidth(value, max) {
  const m = num(max);
  if (!m) return 0;
  return round(clamp01(num(value) / m) * 100, 2);
}

// Intensity for a heat cell, quantised so neighbouring cells read as steps
// rather than as a smooth gradient the eye cannot compare across rows.
export function heatLevel(value, max, steps = 4) {
  const f = clamp01(num(value) / (num(max) || 1));
  if (f === 0) return 0;
  return Math.max(1, Math.ceil(f * steps)) / steps;
}

// A ring gauge fraction, clamped, for a value shown against its own maximum.
export function ringFraction(value, max) {
  return clamp01(num(value) / (num(max) || 1));
}

export const chartMath = { round, num };
