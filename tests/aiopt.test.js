// node --test: token-optimization helpers — signal extraction + generation memo.
// No network: memoCall is tested with a local fn.
import { test } from "node:test";
import assert from "node:assert/strict";
import { extractProjectLines } from "../src/lib/ats.js";
import { memoCall } from "../src/lib/ai.js";

const RESUME = `
Ananya Sharma, ananya@xyz.edu
EDUCATION
B.Tech 2024
PROJECTS
- Built a React Todo app deployed on Vercel, used by 200+ classmates: https://todo.app.in
- I like music and movies
SKILLS
javascript, react
`;

test("extracts project lines, drops filler", () => {
  const out = extractProjectLines(RESUME);
  assert.match(out, /Todo app/);
  assert.match(out, /https:\/\/todo\.app\.in/);
  assert.equal(out.includes("music and movies"), false);
});

test("caps lines and chars", () => {
  const big = Array.from({ length: 30 }, (_, i) => `Built thing ${i} https://x${i}.in used by ${i * 10} users`).join("\n");
  const out = extractProjectLines(big, 5, 200);
  assert.equal(out.split("\n").length <= 5, true);
  assert.equal(out.length <= 200, true);
});

test("empty text → empty string, no crash", () => {
  assert.equal(extractProjectLines(""), "");
});

test("memoCall runs fn once per input", async () => {
  let n = 0;
  const fn = async () => `v${++n}`;
  const a = await memoCall("test-ns", "same-input", fn);
  const b = await memoCall("test-ns", "same-input", fn);
  const c = await memoCall("test-ns", "other-input", fn);
  assert.equal(a, "v1");
  assert.equal(b, "v1");
  assert.equal(c, "v2");
});
