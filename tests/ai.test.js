// node --test: AI router — task→model mapping, key handling, offline null.
// No network here: with no keys set, chat() must resolve null without fetching.
import { test } from "node:test";
import assert from "node:assert/strict";
import { TASKS, modelFor, chat } from "../src/lib/ai.js";

test("five tasks, hard jobs on 120B, chat on fast 20B", () => {
  assert.deepEqual(Object.keys(TASKS).sort(), ["coach", "feedback", "interview", "questions", "rewrite"]);
  assert.match(modelFor("feedback"), /120b/i);
  assert.match(modelFor("rewrite"), /120b/i);
  assert.match(modelFor("questions"), /120b/i);
  assert.match(modelFor("interview"), /120b/i);
  assert.match(modelFor("coach"), /20b/i);
});

test("budgets are sane numbers", () => {
  for (const [name, t] of Object.entries(TASKS)) {
    assert.equal(typeof t.temp === "number" && t.temp > 0 && t.temp <= 1, true, `${name} temp`);
    assert.equal(Number.isInteger(t.maxTokens) && t.maxTokens >= 300, true, `${name} budget`);
  }
});

test("unknown task falls back to coach", () => {
  assert.equal(modelFor("nope"), modelFor("coach"));
});

test("no keys → null, no throw, no network", async () => {
  assert.equal(await chat("hello", "coach"), null);
  assert.equal(await chat("hello", "feedback"), null);
});
