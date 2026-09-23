import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { queriesFromProfile, queryFromProfile, toMarkdown, profileQuestions, profileRowFor } from "../src/lib/profile.js";
import { toArbeitJobShape } from "../src/lib/store.js";
import { certsFor, coursesFor, recommendFor } from "../src/data/courses.js";

describe("profile interview → md + queries", () => {
  it("md carries every answer plus scrape queries", () => {
    const md = toMarkdown({ track: "ayush", skills: "dravyaguna, diagnosis", year: "3rd year", lane: "clinical", college: "GAC Patna", goal: "internship", loc: "remote", hours: "5-8" });
    assert.match(md, /# Avsar Profile/);
    assert.match(md, /track: ayurveda/);
    assert.match(md, /has skills: dravyaguna, diagnosis/);
    assert.match(md, /bams year: 3rd year/);
    assert.match(md, /lane: clinical/);
    assert.match(md, /college: GAC Patna/);
    assert.match(md, /## Scrape queries/);
  });
  it("queries prefer her skills, not the track", () => {
    assert.deepEqual(queriesFromProfile({ track: "ayush", skills: "dravyaguna, diagnosis" }).slice(0, 2), ["dravyaguna", "diagnosis"]);
  });
  it("lane sharpens the third query", () => {
    assert.ok(queriesFromProfile({ skills: "dravyaguna", lane: "research" }).includes("research"));
    assert.ok(queriesFromProfile({ skills: "dravyaguna", lane: "industry" }).includes("gmp"));
    assert.ok(queriesFromProfile({ skills: "dravyaguna", lane: "exploring" }).includes("ayurveda"));
  });
  it("india location keeps non-remote jobs", () => {
    assert.equal(queryFromProfile({ loc: "india" }, "data").remote, false);
    assert.equal(queryFromProfile({ loc: "remote" }, "data").remote, true);
  });
});

describe("profile is track-aware", () => {
  it("tech markdown asks for tech answers, never BAMS fields", () => {
    const md = toMarkdown({ track: "sde", skills: "react, sql", goal: "internship", loc: "remote", hours: "5-8" });
    assert.match(md, /# Avsar Profile/);
    assert.match(md, /track: tech/);
    assert.match(md, /has skills: react, sql/);
    assert.match(md, /lane: sde/);
    assert.doesNotMatch(md, /bams year|college/);
  });

  it("tech queries add the lane term the postings use", () => {
    assert.deepEqual(queriesFromProfile({ track: "sde", skills: "react, sql" }), ["react", "sql", "developer"]);
    assert.deepEqual(queriesFromProfile({ track: "data", skills: "python, excel" }), ["python", "excel", "data"]);
  });

  it("govt prep has no postings term to add, and a missing track falls back to ayush", () => {
    assert.deepEqual(queriesFromProfile({ track: "govt", skills: "reasoning, quant" }), ["reasoning", "quant"]);
    assert.deepEqual(queriesFromProfile({ skills: "dravyaguna" }), ["dravyaguna", "ayurveda"]);
  });

  it("question sets differ per portal and never run out", () => {
    const ayush = profileQuestions("ayush").map((q) => q.id);
    const tech = profileQuestions("tech").map((q) => q.id);
    assert.ok(ayush.includes("year") && ayush.includes("lane") && ayush.includes("college"));
    assert.ok(tech.includes("track") && tech.includes("skills") && tech.includes("goal"));
    assert.equal(tech.includes("year"), false);
    assert.deepEqual(profileQuestions("nonsense"), profileQuestions("ayush"));
  });

  it("a saved row keeps only its own portal's answers", () => {
    const stale = { track: "data", skills: "python, sql", year: "3rd year", lane: "clinical", college: "GAC Patna", goal: "internship" };
    const tech = profileRowFor(stale, "tech");
    assert.equal(tech.track, "data");
    assert.equal(tech.skills, "python, sql");
    assert.equal(tech.year, "");
    assert.equal(tech.lane, "");
    assert.equal(tech.college, "");
    const ayush = profileRowFor(stale, "ayush");
    assert.equal(ayush.track, "ayush");
    assert.equal(ayush.year, "3rd year");
  });
});

describe("arbeitnow mapper", () => {
  it("maps a dev posting, drops untracked roles", () => {
    const j = toArbeitJobShape({ slug: "x", title: "Frontend Developer", company_name: "Acme", tags: ["react"], job_types: ["full_time"], remote: true, url: "https://x", description: "<p>react job</p>" });
    assert.equal(j.role, "sde");
    assert.ok(j.skills.includes("react"));
    assert.equal(toArbeitJobShape({ title: "Truck Driver", description: "drive trucks" }), null);
  });
});

describe("free certs", () => {
  it("every ayush skill resolves at least one free cert link", () => {
    for (const s of ["dravyaguna", "gmp", "sanskrit", "research", "unknown-skill"]) {
      assert.ok(certsFor(s).length >= 1, s);
    }
  });
  it("certificate goal ranks cert first; tight hours keep short courses up", () => {
    assert.ok(recommendFor("research", { goal: "certificate" })[0].c);
    const light = recommendFor("research", { hours: "2-4" });
    assert.match(light[0].u, /ccras/);
    assert.match(light[light.length - 1].u, /swayam/);
  });
  it("no profile behaves like the plain list", () => {
    assert.deepEqual(recommendFor("research", {}).map((c) => c.u), coursesFor("research").map((c) => c.u));
  });
});
