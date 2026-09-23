// ponytail: per-answer STAR micro-score — the preview shown BEFORE any AI grade.
// Pure keyword-family heuristics (same honesty as the ATS engine): deterministic,
// instant, offline. AI grades assist; this module disposes the visible micro-score.
import { STRONG_VERBS } from "./ats.js";

const S_RE = /\b(when|while|during|situation|context|at (my|the|our))\b/i;
const T_RE = /\b(needed|goal|tasked|had to|responsible for|objective|problem was)\b/i;
const R_WORDS = ["increased", "decreased", "reduced", "improved", "grew", "fell", "rose", "saved", "cut", "shipped", "launched", "selected", "hired", "%"];
const NUM_RE = /\d/;

function hasAny(text, words) {
  const t = text.toLowerCase();
  return words.some((w) => t.includes(w.toLowerCase()));
}

function hasVerb(text) {
  const t = text.toLowerCase();
  return STRONG_VERBS.some((v) => new RegExp(`\\b${v}\\b`, "i").test(t));
}

// 1-4: base 1, +1 action, +1 result/number, +1 all four STAR present.
export function scoreAnswer(text = "") {
  const clean = (text || "").trim();
  const s = S_RE.test(clean);
  const t = T_RE.test(clean);
  const a = hasVerb(clean);
  const hasNumber = NUM_RE.test(clean);
  const r = hasNumber || hasAny(clean, R_WORDS);
  let micro = 1;
  if (a) micro++;
  if (r) micro++;
  if (s && t && a && r) micro++;
  const tips = [];
  if (!s) tips.push("Set the scene: one line starting with When/While.");
  if (!t) tips.push("Name the goal: what needed to happen?");
  if (!a) tips.push("Say what YOU did: built, shipped, led…");
  if (!r) tips.push("Close with a result.");
  if (!hasNumber) tips.push("Add a number: users, %, hours, days.");
  return { micro, stars: { s, t, a, r }, hasNumber, tips };
}

// Skill readiness across answers: per-dimension averages, not one opaque number.
export function skillReadiness(scores = []) {
  const dims = ["s", "t", "a", "r"];
  const out = {};
  for (const d of dims) {
    const vals = scores.map((x) => (x && x.stars && x.stars[d] ? 1 : 0));
    out[d] = vals.length ? Math.round((vals.reduce((x, y) => x + y, 0) / vals.length) * 100) / 100 : 0;
  }
  const micros = scores.map((x) => (x && x.micro) || 0);
  out.avg = micros.length ? Math.round((micros.reduce((x, y) => x + y, 0) / micros.length) * 10) / 10 : 0;
  return out;
}
