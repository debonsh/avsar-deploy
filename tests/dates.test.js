// node --test: the date spine. Six source formats collapse to one ISO field,
// and anything unprovable must come back null rather than a guess.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseRelativeDate, toMs, toIso, daysSince, isStale, freshestAt } from "../src/lib/dates.js";

const NOW = Date.parse("2026-09-23T12:00:00.000Z");
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

test("relative strings resolve against the injected now", () => {
  const cases = [
    ["Just now", NOW],
    ["just now", NOW],
    ["Today", NOW],
    ["Yesterday", NOW - DAY],
    ["5 hours ago", NOW - 5 * HOUR],
    ["45 mins ago", NOW - 45 * MINUTE],
    ["1 day ago", NOW - DAY],
    ["3 days ago", NOW - 3 * DAY],
    ["2 weeks ago", NOW - 14 * DAY],
    ["30+ days ago", NOW - 30 * DAY],
    ["2 months ago", NOW - 60 * DAY],
    ["1 year ago", NOW - 365 * DAY],
    ["  3 days ago  ", NOW - 3 * DAY],
  ];
  for (const [input, want] of cases) {
    assert.equal(parseRelativeDate(input, NOW), want, `${JSON.stringify(input)}`);
  }
});

test("absolute dates and epochs pass through unchanged", () => {
  assert.equal(parseRelativeDate("2026-09-13T10:00:00.000Z", NOW), Date.parse("2026-09-13T10:00:00.000Z"));
  assert.equal(parseRelativeDate("2026-09-13", NOW), Date.parse("2026-09-13"));
  assert.equal(parseRelativeDate(1757000000, NOW), 1757000000000, "epoch seconds widen to ms");
  assert.equal(parseRelativeDate(1757000000000, NOW), 1757000000000, "epoch ms stay");
  assert.equal(parseRelativeDate("1757000000", NOW), 1757000000000, "numeric string treated as an epoch");
});

test("unprovable input returns null and never guesses", () => {
  for (const input of ["", "   ", null, undefined, "whenever", "soon", "next week", "1 day", "recruiter said", 0, -5, NaN]) {
    assert.equal(parseRelativeDate(input, NOW), null, `${JSON.stringify(input)} must not resolve`);
  }
});

test("toIso emits an ISO string or null, never an epoch", () => {
  assert.equal(toIso("3 days ago", NOW), new Date(NOW - 3 * DAY).toISOString());
  assert.equal(toIso(1757000000, NOW), new Date(1757000000000).toISOString());
  assert.equal(toIso("", NOW), null);
  assert.match(toIso("2026-09-13", NOW), /^\d{4}-\d{2}-\d{2}T/);
});

test("daysSince is fractional and null when undated", () => {
  assert.equal(daysSince(new Date(NOW - 36 * HOUR).toISOString(), NOW), 1.5);
  assert.equal(daysSince("", NOW), null);
});

test("isStale is three-state: undated is unknown, not stale", () => {
  assert.equal(isStale(new Date(NOW - 40 * DAY).toISOString(), NOW), true);
  assert.equal(isStale(new Date(NOW - 2 * DAY).toISOString(), NOW), false);
  assert.equal(isStale("", NOW), null);
  assert.equal(isStale(new Date(NOW - 40 * DAY).toISOString(), NOW, 60), false, "threshold is configurable");
});

test("toMs and toIso agree, and freshestAt picks the newest dated posting", () => {
  assert.equal(toMs("2 days ago", NOW), toMs(new Date(NOW - 2 * DAY).toISOString(), NOW));
  const jobs = [
    { id: "a", postedAt: new Date(NOW - 5 * DAY).toISOString() },
    { id: "b" },
    { id: "c", postedAt: "1 day ago" },
  ];
  assert.equal(freshestAt(jobs, NOW), new Date(NOW - DAY).toISOString());
  assert.equal(freshestAt([{ id: "b" }], NOW), null, "no dated posting means no freshness claim");
  assert.equal(freshestAt([], NOW), null);
});
