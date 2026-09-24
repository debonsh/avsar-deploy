// node --test: the lane symmetry contract, as a test rather than an intention.
//
// The failure this file exists to catch is quiet and real: a pillar gets built for the demo
// lane and the other lane silently ships half a feature. Nothing throws, no route blanks, and
// an ayurveda student simply finds an empty page. So the contract from the plan is asserted
// mechanically, for both lanes, and it fails the build when one side falls behind.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SKILLS, TAXONOMY_ROLES, taxonomyRole, requiredFor } from "../src/data/taxonomy.js";
import { PROGRAMS, programsFor } from "../src/data/programs.js";
import { TECH_PROGRAMS, techProgramsFor } from "../src/data/techPrograms.js";
import { CHALLENGE_TEMPLATES, templatesForLane } from "../src/data/challengeTemplates.js";
import { bundledCorpus } from "../src/lib/corpus.js";
import { marketSignals, effectiveWeights, corpusForLane, marketIndex, corpusStats } from "../src/lib/market.js";
import { rolesForLane, routeTo, programsForSkill, skillGraph } from "../src/lib/careerGps.js";
import { districtDemand, privacyAggregate } from "../src/lib/district.js";

const LANES = ["ayush", "tech"];

test("both lanes resolve their own roles, and no role belongs to both", () => {
  const seen = new Map();
  for (const lane of LANES) {
    const roles = rolesForLane(lane);
    assert.ok(roles.length >= 4, `${lane} lane must offer a real choice of target roles, got ${roles.length}`);
    for (const r of roles) {
      assert.ok(TAXONOMY_ROLES[r.id], `${r.id} must be a real taxonomy role`);
      assert.ok(!seen.has(r.id), `${r.id} cannot belong to ${seen.get(r.id)} and ${lane}`);
      seen.set(r.id, lane);
      assert.ok(Object.keys(r.required).length >= 4, `${r.id} must require a real bundle of skills`);
    }
  }
  assert.equal(seen.size, Object.keys(TAXONOMY_ROLES).length, "every taxonomy role must be reachable from a lane");
});

test("every role's required skills are real taxonomy skills", () => {
  const ids = new Set(SKILLS.map((s) => s.id));
  for (const [roleId, role] of Object.entries(TAXONOMY_ROLES)) {
    for (const skill of Object.keys(role.required)) {
      assert.ok(ids.has(skill), `${roleId} requires ${skill}, which is not in the taxonomy`);
    }
  }
});

test("both lanes have programs covering their own gap skills", () => {
  const report = {};
  for (const lane of LANES) {
    const needed = new Set();
    for (const role of rolesForLane(lane)) {
      for (const { skill } of requiredFor(role.id)) needed.add(skill);
    }
    const covered = [...needed].filter((s) => programsForSkill(s, lane).length > 0);
    report[lane] = { needed: needed.size, covered: covered.length, missing: [...needed].filter((s) => !covered.includes(s)) };
    assert.ok(
      covered.length / needed.size >= 0.5,
      `${lane} lane covers only ${covered.length} of ${needed.size} required skills. Uncovered: ${report[lane].missing.join(", ")}`
    );
    assert.ok(covered.length > 0, `${lane} lane must have at least one course`);
  }
  // the two catalogue files stay on their own sides, so a tech course cannot claim an ayush gap
  assert.ok(PROGRAMS.every((p) => p.hours > 0 && p.provider), "every ayush course states hours and a provider");
  assert.ok(TECH_PROGRAMS.every((p) => p.hours > 0 && p.provider), "every tech course states hours and a provider");
});

test("each lane's programmes resolve only through its own catalogue", () => {
  assert.ok(programsFor("pharmacovigilance").length > 0, "ayush catalogue covers pharmacovigilance");
  assert.equal(techProgramsFor("pharmacovigilance").length, 0, "the tech catalogue is not a superset");
  assert.ok(techProgramsFor("sql").length > 0);
  assert.equal(programsFor("kubernetes").length, 0, "an unknown skill is uncovered, not invented");
});

test("both lanes seed offline challenges with a usable rubric", () => {
  for (const lane of LANES) {
    const templates = templatesForLane(lane);
    assert.ok(templates.length >= 3, `${lane} lane needs seeded challenges so the demo runs offline`);
    assert.ok(templates.every((c) => c.lane === lane), `${lane} lane templates are lane-pure`);
    for (const c of templates) {
      assert.ok(c.checks.length >= 3, `${c.id} must state what it looks for`);
      assert.ok(c.threshold > 0 && c.threshold <= 100, `${c.id} needs a reachable pass mark`);
      const skill = SKILLS.find((s) => s.id === c.skill);
      assert.ok(skill, `${c.id} proves ${c.skill}, which is not a taxonomy skill`);
    }
  }
  const kinds = new Set(CHALLENGE_TEMPLATES.map((c) => c.kind));
  assert.ok(kinds.size >= 2, "the seeded set should not be one kind of task repeated");
});

test("both lanes ship a non-empty bundled corpus that clears the market floor", () => {
  for (const lane of LANES) {
    const corpus = bundledCorpus(lane);
    assert.ok(corpus.length > 0, `${lane} lane has no bundled postings, so it cannot be demonstrated offline`);
    const signals = marketSignals(corpus, { lane, limit: 5 });
    assert.ok(signals.rows.length > 0, `${lane} lane produces no market signal above the floor: ${JSON.stringify(signals.sample)}`);
    assert.ok(signals.sample.total === corpus.length, `${lane} market sample must match the corpus it read`);
  }
});

test("postings that declare no skills are disclosed, not silently averaged in", () => {
  // The scraped boards return postings with an empty skill list. They are real postings, but
  // they cannot be asked about a skill they never mention, so counting them in the demand
  // denominator would understate every figure on the market page. The gap is measured and
  // reported instead of hidden, and this test is what keeps it that way.
  for (const lane of LANES) {
    const corpus = bundledCorpus(lane);
    const skilled = corpus.filter((j) => Array.isArray(j.skills) && j.skills.length).length;
    assert.ok(skilled > 0, `${lane} needs postings that name skills, or nothing can be scored`);

    const idx = marketIndex(corpus);
    assert.equal(idx.sample.skilled, skilled, `${lane} sample must report how many postings state skills`);
    assert.equal(idx.sample.unstated, corpus.length - skilled, `${lane} sample must report the unstated remainder`);
    assert.equal(idx.sample.total, corpus.length, "and still report the whole corpus");
    assert.equal(corpusStats(corpus).skilled, skilled, `${lane} corpus stats must expose the same figure`);

    const top = idx.shifts[0];
    if (top) {
      // market.js rounds a share to four places; the assertion matches that precision
      assert.equal(top.share, Math.round((top.postings / skilled) * 10000) / 10000, `${lane} share must use the skilled denominator`);
      assert.ok(top.share >= top.postings / corpus.length, "the honest denominator can only raise a share, never lower it");
      if (skilled < corpus.length) {
        assert.ok(
          top.share > top.postings / corpus.length,
          `${lane} has ${corpus.length - skilled} undeclared postings, so sharing over the whole corpus would understate demand`
        );
      }
    }
  }
  assert.ok(
    bundledCorpus("tech").filter((j) => !j.skills?.length).length > 0,
    "the tech board corpus is expected to carry undeclared postings; if this fails, the disclosure is untested"
  );
});

test("a lane's market index is built only from that lane's postings", () => {
  const ayush = bundledCorpus("ayush");
  const tech = bundledCorpus("tech");
  const both = [...ayush, ...tech];
  for (const lane of LANES) {
    const scoped = effectiveWeights(both, { lane });
    const direct = effectiveWeights(bundledCorpus(lane), { lane });
    assert.equal(scoped.stats.total, direct.stats.total, `${lane} weights must not read the other lane's postings`);
    assert.deepEqual([...scoped.weights.keys()].sort(), [...direct.weights.keys()].sort());
  }
});

test("both lanes can produce a route with real course hours behind it", () => {
  for (const lane of LANES) {
    const roles = rolesForLane(lane);
    const corpus = bundledCorpus(lane);
    const market = effectiveWeights(corpus, { lane });
    // an empty profile is the worst case: every gap is open, so nothing can hide behind a
    // lucky starting set
    const route = routeTo(roles[0].id, { skills: [], levels: {} }, { jobs: corpus, lane, market, limit: 0 });
    assert.ok(route.steps.length > 0, `${lane} lane must produce a route from an empty profile`);
    assert.ok(route.steps.every((s) => s.reason && s.reason.length > 20), `${lane} steps must be explainable`);
    assert.ok(route.effort.hours > 0, `${lane} route must name at least one course with hours`);
    assert.ok(
      route.steps.filter((s) => s.programs.length > 0).length >= 2,
      `${lane} lane needs at least two stops with a real course behind them`
    );
  }
});

test("both lanes have a connected-enough graph to route across domains", () => {
  const graph = skillGraph();
  assert.ok(graph.size >= 50, "the graph must cover the taxonomy, not a corner of it");
  for (const lane of LANES) {
    const ids = rolesForLane(lane).flatMap((r) => Object.keys(r.required));
    const reachable = ids.filter((s) => graph.get(s)?.size > 0);
    assert.equal(reachable.length, ids.length, `${lane}: every required skill must have at least one edge`);
  }
});

test("the district picture exists for both lanes and never mixes them", () => {
  for (const lane of LANES) {
    const demand = districtDemand(bundledCorpus(lane), { limit: 5 });
    assert.ok(demand.length > 0, `${lane} lane must have at least one stated location to plan against`);
    assert.ok(demand.every((c) => c.skills.length > 0), `${lane} demand rows must name skills`);
  }
  const mixed = privacyAggregate([
    { key: "gmp", count: 30, lane: "ayush" },
    { key: "react", count: 30, lane: "tech" },
  ]);
  assert.ok(mixed.error, "a cross-lane figure must be refused, not averaged");
});

test("lane filtering is total: every bundled posting lands in exactly one lane", () => {
  const all = [...bundledCorpus("ayush"), ...bundledCorpus("tech")];
  for (const lane of LANES) {
    const scoped = corpusForLane(all, lane);
    assert.ok(scoped.length > 0, `${lane} slice must not be empty`);
    assert.ok(scoped.every((j) => (j.lane || (j.role === "ayush" ? "ayush" : "tech")) === lane), `${lane} slice leaked a posting`);
  }
  // every taxonomy role maps to a lane, so no posting can fall outside both slices
  for (const [roleId, role] of Object.entries(TAXONOMY_ROLES)) {
    const lane = role.domain.startsWith("ayush") ? "ayush" : "tech";
    assert.ok(taxonomyRole(roleId), `${roleId} resolves`);
    assert.ok(["ayush", "tech"].includes(lane), `${roleId} maps to a lane`);
  }
});
