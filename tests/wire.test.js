// node --test: the wire. Every item must be a counted fact about the corpus in
// hand, so what is asserted here is traceability: each item carries evidence, a
// dated item sorts ahead of an undated one, and an empty corpus says so instead
// of emitting a reassuring line about a market that is not there.
import { test } from "node:test";
import assert from "node:assert/strict";
import { wireItems, latestPostings, officialNotices, isOfficial, agoLabel, sourceLabel } from "../src/lib/wire.js";

const NOW = Date.parse("2026-09-23T12:00:00.000Z");
const DAY = 86400000;
const ago = (days) => new Date(NOW - days * DAY).toISOString();

let seq = 0;
const tech = (skills, extra = {}) => ({
  id: `t${++seq}`, lane: "tech", role: "sde", company: "Acme", title: "Developer",
  loc: "Remote", src: "gh", apply: "https://stripe.com/jobs", skills, ...extra,
});
const ayush = (skills, extra = {}) => ({
  id: `a${++seq}`, lane: "ayush", role: "ayush", company: "CCRAS", title: "Research Officer",
  loc: "New Delhi", apply: "https://ccras.nic.in/vacancies", skills, ...extra,
});

test("agoLabel names the recent days and refuses to date an undated posting", () => {
  assert.equal(agoLabel(ago(0), NOW), "today");
  assert.equal(agoLabel(ago(1), NOW), "yesterday");
  assert.equal(agoLabel(ago(9), NOW), "9 days ago");
  assert.equal(agoLabel(ago(30), NOW), "a month ago");
  assert.equal(agoLabel(ago(95), NOW), "3 months ago");
  assert.equal(agoLabel(null, NOW), null, "no date is null, never 'today'");
  assert.equal(agoLabel("whenever", NOW), null);
});

test("isOfficial matches government hosts on the apply link", () => {
  assert.equal(isOfficial({ apply: "https://ccras.nic.in/x" }), true);
  assert.equal(isOfficial({ apply: "https://ayush.gov.in/vacancy" }), true);
  assert.equal(isOfficial({ apply: "https://aiia.gov.in/" }), true);
  assert.equal(isOfficial({ apply: "https://stripe.com/jobs" }), false);
  assert.equal(isOfficial({ apply: "#" }), false, "an unusable link is not evidence of anything");
  assert.equal(isOfficial({}), false);
});

test("sourceLabel reads board slugs as names and passes unknown ones through", () => {
  assert.equal(sourceLabel("gh"), "Greenhouse");
  assert.equal(sourceLabel("nic"), "Nic");
  assert.equal(sourceLabel(""), "unknown");
});

test("latestPostings returns the newest dated postings, newest first", () => {
  const jobs = [
    tech(["react"], { postedAt: ago(9) }),
    tech(["react"], { postedAt: ago(2) }),
    tech(["react"]), // undated, must not appear
    tech(["sql"], { postedAt: ago(4) }),
  ];
  const out = latestPostings(jobs, { now: NOW, limit: 2 });
  assert.equal(out.length, 2, "the limit is respected");
  assert.equal(out[0].ago, "2 days ago", "newest first");
  assert.equal(out[1].ago, "4 days ago");
  assert.ok(out.every((p) => p.ago !== null), "undated postings are excluded, not ranked last");
  assert.equal(out[0].company, "Acme");
  assert.equal(out[0].src, "Greenhouse", "the source reads as a name");
  assert.ok(out[0].title && out[0].loc && out[0].role, "every posting row is fully labelled");
});

test("latestPostings carries a parsed salary only when the posting states one", () => {
  const out = latestPostings([
    tech(["react"], { postedAt: ago(1), salary: "3-4 Lacs PA" }),
    tech(["react"], { postedAt: ago(2), salary: "Not disclosed" }),
  ], { now: NOW });
  assert.equal(out[0].salary.band, "₹3L to ₹4L a year");
  assert.equal(out[1].salary, null, "undisclosed is null rather than a guessed band");
});

test("officialNotices collects the government channel and sorts it by date", () => {
  const jobs = [
    ayush(["research"], { postedAt: ago(5) }),
    ayush(["panchakarma"], { postedAt: ago(1), apply: "https://ayush.gov.in/x" }),
    tech(["react"], { postedAt: ago(0) }),
  ];
  const out = officialNotices(jobs, { now: NOW, limit: 5 });
  assert.equal(out.length, 2, "board postings are excluded");
  assert.equal(out[0].ago, "yesterday", "newest notice first");
  assert.equal(out[1].ago, "5 days ago");
  assert.ok(out.every((n) => n.apply), "each notice keeps the link a student can act on");
});

test("wireItems on an empty corpus reports the gap rather than a reassuring zero", () => {
  const items = wireItems([], [], { now: NOW, lane: "ayush" });
  assert.equal(items.length, 1);
  assert.equal(items[0].kind, "empty");
  assert.equal(items[0].tone, "amber");
  assert.ok(items[0].headline.length > 0 && items[0].detail.length > 0);
});

test("every wire item carries evidence and a readable headline", () => {
  const jobs = [
    tech(["react", "sql"], { postedAt: ago(1) }),
    tech(["react"], { postedAt: ago(3) }),
    tech(["react"], { postedAt: ago(5) }),
    tech(["sql"], { postedAt: ago(40) }),
    tech(["node"]), // undated
  ];
  const items = wireItems(jobs, [{ at: "2026-09-22T00:00:00.000Z", lanes: { tech: { total: 4, perSkill: {} } } }], { now: NOW, lane: null });
  assert.ok(items.length >= 5, "a real corpus produces a real feed");
  for (const it of items) {
    assert.ok(it.id, "every item is identifiable");
    assert.ok(it.headline && it.headline.length > 4, `headline: ${JSON.stringify(it.headline)}`);
    assert.ok(it.detail && it.detail.length > 4, `detail: ${JSON.stringify(it.detail)}`);
    assert.ok(it.evidence && it.evidence.kind, `evidence: ${JSON.stringify(it.evidence)}`);
    assert.ok(["green", "amber", "zinc", "sky", "red"].includes(it.tone), `tone: ${it.tone}`);
  }
});

test("dated items sort ahead of undated ones", () => {
  const jobs = [
    tech(["react", "sql"], { postedAt: ago(1) }),
    tech(["react"], { postedAt: ago(3) }),
    tech(["react"], { postedAt: ago(5) }),
  ];
  const items = wireItems(jobs, [], { now: NOW });
  const firstUndated = items.findIndex((i) => !i.at);
  const lastDated = items.reduce((best, it, i) => (it.at ? i : best), -1);
  assert.ok(lastDated >= 0, "dated items exist");
  if (firstUndated >= 0) assert.ok(lastDated < firstUndated, "all dated items precede the undated ones");
  const dated = items.filter((i) => i.at);
  for (let i = 1; i < dated.length; i++) {
    assert.ok(Date.parse(dated[i - 1].at) >= Date.parse(dated[i].at), "dated items run newest first");
  }
});

test("the wire reports staleness and undated gaps as their own lines", () => {
  const jobs = [
    tech(["react"], { postedAt: ago(1) }),
    tech(["react"], { postedAt: ago(2) }),
    tech(["react"], { postedAt: ago(3) }),
    tech(["sql"], { postedAt: ago(75) }),
    tech(["node"]),
  ];
  const items = wireItems(jobs, [], { now: NOW });
  const stale = items.find((i) => i.kind === "stale");
  const undated = items.find((i) => i.kind === "undated");
  assert.equal(stale.evidence.older, 1);
  assert.equal(undated.evidence.undated, 1);
  assert.equal(stale.tone, "amber", "a stale posting is a caution, not a celebration");
});

test("a rising skill is reported as rising only when the dates prove it", () => {
  const jobs = [
    tech(["react"], { postedAt: ago(1) }),
    tech(["react"], { postedAt: ago(3) }),
    tech(["react"], { postedAt: ago(5) }),
  ];
  const items = wireItems(jobs, [], { now: NOW });
  const skill = items.find((i) => i.kind === "skill" && i.evidence.skill === "react");
  assert.ok(skill, "a consistently requested skill earns a line");
  assert.equal(skill.evidence.trend, "rising");
  assert.equal(skill.evidence.sample, 3, "the line carries the sample it was measured against");
});

test("too few dated postings means no direction is claimed", () => {
  const jobs = [tech(["react"], { postedAt: ago(1) })];
  const items = wireItems(jobs, [], { now: NOW });
  assert.equal(items.find((i) => i.kind === "skill"), undefined, "one posting is not a trend");
});

test("the wire respects its limit and the lane it was asked for", () => {
  const jobs = [
    ...Array.from({ length: 6 }, (_, i) => tech(["react"], { postedAt: ago(i + 1) })),
    ayush(["panchakarma"], { postedAt: ago(1) }),
  ];
  const limited = wireItems(jobs, [], { now: NOW, limit: 3 });
  assert.equal(limited.length, 3, "the limit is a hard cap");

  const ayushOnly = wireItems(jobs, [], { now: NOW, lane: "ayush" });
  assert.ok(ayushOnly.length > 0, "a lane with a posting still produces a feed");
  for (const it of ayushOnly) {
    assert.ok(
      !/Acme|React|Sde/i.test(`${it.headline} ${it.detail}`),
      `an ayush feed must not cite a tech posting: ${it.headline}`
    );
  }
  assert.ok(ayushOnly.some((i) => i.kind === "notice"), "the official notice is this lane's real hiring news");
});

test("a lane with no postings at all reports the gap, not another lane's numbers", () => {
  const jobs = Array.from({ length: 4 }, (_, i) => tech(["react"], { postedAt: ago(i + 1) }));
  const empty = wireItems(jobs, [], { now: NOW, lane: "ayush" });
  assert.equal(empty.length, 1);
  assert.equal(empty[0].kind, "empty");
});
