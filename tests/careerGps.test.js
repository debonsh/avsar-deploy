// node --test: Career GPS. What matters here is that a route cannot overpromise. A step
// only claims an unlock if the engine, re-run with that skill added, actually clears the
// posting's own bar, and a gap with no path in the graph is listed as a fresh start
// rather than quietly ranked as if it were reachable.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  skillGraph, rolesForLane, hopDistances, programsForSkill, effortHours,
  minScoreOf, simulate, routeTo, gapList, scoreCorpus,
} from "../src/lib/careerGps.js";


let seq = 0;
const job = (skills, extra = {}) => ({
  id: `j${++seq}`, lane: "tech", role: "sde", title: "Dev", company: "Acme",
  loc: "Remote", skills, minScore: 40, ...extra,
});
const ayushJob = (skills, extra = {}) => ({
  id: `a${++seq}`, lane: "ayush", role: "ayush", title: "Vaidya", company: "CCRAS",
  loc: "Pune", skills, minScore: 40, ...extra,
});

test("skillGraph is undirected and only joins skills the taxonomy knows", () => {
  const g = skillGraph();
  assert.ok(g.get("react")?.has("javascript"), "react relates to javascript");
  assert.ok(g.get("javascript")?.has("react"), "and the edge runs back the other way");
  assert.equal(g.get("react")?.has("react"), false, "a skill is not its own neighbour");
  for (const [id, set] of g) {
    for (const other of set) assert.ok(g.has(other), `${id} -> ${other} must be a real node`);
  }
  assert.ok(g.get("diagnosis")?.has("panchakarma"));
});

test("rolesForLane splits the taxonomy by domain, with no second list to drift", () => {
  const ayush = rolesForLane("ayush");
  const tech = rolesForLane("tech");
  assert.equal(ayush.length, 4, "four ayush roles");
  assert.equal(tech.length, 4, "four tech roles");
  assert.deepEqual(ayush.map((r) => r.id).sort(), ["ayush-cra", "ayush-qa", "ayush-research", "ayush-vaidya"]);
  assert.deepEqual(tech.map((r) => r.id).sort(), ["data-analyst", "govt-exams", "marketing-associate", "sde"]);
  for (const r of ayush) assert.ok(r.domain.startsWith("ayush"), `${r.id} belongs to the ayush lane`);
  for (const r of tech) assert.ok(!r.domain.startsWith("ayush"), `${r.id} belongs to the tech lane`);
  assert.deepEqual(rolesForLane("ayush"), rolesForLane("ayush"), "and the result is stable");
});

test("hopDistances measures from every held skill at once and records where it arrived from", () => {
  const { dist, via } = hopDistances(["react"]);
  assert.equal(dist.get("react"), 0);
  assert.equal(dist.get("javascript"), 1, "a direct neighbour is one hop");
  assert.equal(via.get("javascript"), "react", "and the walk remembers it came through react");
  assert.equal(via.get("react"), "react", "a held skill is its own origin");
  // The graph bridges domains, so a clinical skill is reachable from a web one, but only
  // down a chain. That is the whole reason a route is worth computing rather than listing.
  assert.ok(dist.get("diagnosis") > 3, "a cross-domain skill is reached, but not closely");
});

test("hopDistances leaves genuinely disconnected clusters out entirely", () => {
  const { dist } = hopDistances(["react"]);
  // The design and govt-exam clusters have no edge into the engineering cluster, so a
  // developer holding react has no path to them at all: absent, never Infinity.
  assert.equal(dist.get("figma"), undefined);
  assert.equal(dist.get("polity"), undefined);
  assert.ok(dist.size < 62, "so the walk does not pretend to reach the whole taxonomy");
});

test("hopDistances treats an empty profile as an empty map, not a crash", () => {
  const { dist, via } = hopDistances([]);
  assert.equal(dist.size, 0);
  assert.equal(via.size, 0);
  const { dist: two } = hopDistances(["react", "sql"]);
  assert.equal(two.get("react"), 0);
  assert.equal(two.get("sql"), 0, "both roots start at zero");
  assert.equal(two.get("excel"), 1, "excel is one hop from sql");
  // An explicit graph proves the unreachable branch without depending on taxonomy shape.
  const isolated = hopDistances(["a"], new Map([["a", new Set()]]));
  assert.equal(isolated.dist.get("a"), 0);
  assert.equal(isolated.dist.size, 1);
});

test("minScoreOf uses the posting's own bar and falls back rather than trusting a junk value", () => {
  assert.equal(minScoreOf({ minScore: 35 }), 35);
  assert.equal(minScoreOf({ minScore: 0 }), 40, "zero is not a bar, it is a missing field");
  assert.equal(minScoreOf({ minScore: "nonsense" }), 40);
  assert.equal(minScoreOf({}), 40);
});

test("programsForSkill returns the real courses that close a gap, with hours", () => {
  const ayush = programsForSkill("pharmacovigilance", "ayush");
  assert.ok(ayush.length >= 1, "the PvPI course covers pharmacovigilance");
  assert.ok(ayush.every((p) => p.hours > 0), "every listed course states its hours");
  assert.ok(ayush.every((p) => p.provider), "and who runs it");
  assert.ok(ayush[0].hours <= ayush[ayush.length - 1].hours, "cheapest first");

  const tech = programsForSkill("javascript", "tech");
  assert.ok(tech.length >= 1);
  assert.ok(tech.every((p) => p.skills === undefined), "the returned rows are the page shape, not raw seed rows");
  assert.deepEqual(programsForSkill("not-a-skill", "tech"), []);
});

test("effortHours separates the steps a course covers from the ones nothing teaches", () => {
  const steps = [
    { skill: "pharmacovigilance", programs: programsForSkill("pharmacovigilance", "ayush") },
    { skill: "gmp", programs: programsForSkill("gmp", "ayush") },
    { skill: "not-a-skill", programs: [] },
  ];
  const e = effortHours(steps, "ayush");
  assert.equal(e.known, 2);
  assert.equal(e.unknown, 1, "the uncovered step is admitted, not dropped");
  assert.equal(e.hours, (programsForSkill("pharmacovigilance", "ayush")[0].hours) + (programsForSkill("gmp", "ayush")[0].hours));
});

test("effortHours on an empty route is zero and says so", () => {
  assert.deepEqual(effortHours([], "tech"), { hours: 0, known: 0, unknown: 0 });
});

test("gapList names what the role wants minus what the student holds", () => {
  const list = gapList("ayush-cra", { levels: { documentation: 4 } });
  assert.ok(list.length > 0);
  assert.ok(!list.some((g) => g.skill === "documentation"), "a met requirement is not a gap");
  assert.ok(list.every((g) => g.have < g.need));
  assert.ok(list.every((g) => g.name && g.name.length > 0), "every gap carries a readable name");
  assert.deepEqual(gapList("no-such-role", {}), []);
});

test("routeTo marks an already-satisfied role as having nothing left to do", () => {
  const held = { skills: ["diagnosis"], levels: { diagnosis: 5, panchakarma: 5, documentation: 5, dravyaguna: 5, sanskrit: 5, communication: 5 } };
  const route = routeTo("ayush-vaidya", held, { jobs: [ayushJob(["diagnosis"])], lane: "ayush" });
  assert.equal(route.role.id, "ayush-vaidya");
  assert.deepEqual(route.steps, [], "no gaps means no route");
  assert.equal(route.totalGaps, 0);
  assert.deepEqual(route.effort, { hours: 0, known: 0, unknown: 0 });
});

test("routeTo returns an empty, honest result for a role that does not exist", () => {
  const route = routeTo("not-a-role", {}, { jobs: [], lane: "tech" });
  assert.equal(route.role, null);
  assert.deepEqual(route.steps, []);
  assert.equal(route.baseEligible, 0);
});

test("a route step only claims a posting the engine actually unlocks", () => {
  // documentation is required by ayush-cra. A posting needing it sits at minScore 40;
  // a profile with none of it scores below, and adding it must clear the bar for the
  // step to claim the unlock.
  const held = { skills: [], levels: {}, verified: [], usedAt: {} };
  const jobs = [ayushJob(["documentation", "research", "pharmacovigilance"])];
  const route = routeTo("ayush-cra", held, { jobs, lane: "ayush", limit: 0 });
  const doc = route.steps.find((s) => s.skill === "documentation");
  assert.ok(doc, "documentation is a gap for an empty profile");

  const claimed = doc.postings.map((j) => String(j.id));
  const real = scoreCorpus(jobs, held, null, [{ skill: "documentation", level: doc.need }])
    .filter((r) => r.fit.score >= minScoreOf(r.job))
    .map((r) => String(r.job.id));
  assert.deepEqual(claimed, real, "the claimed postings are exactly the ones the engine opens");
});

test("a step with no path in the graph is listed last and says it is a fresh start", () => {
  // The design and govt-exam clusters have no edge into the engineering cluster, so a
  // react-only profile has no route at all to the data-visualisation half of data-analyst.
  const held = { skills: ["react"], levels: { react: 3 }, verified: [], usedAt: {} };
  const route = routeTo("data-analyst", held, { jobs: [job(["tableau", "sql"])], lane: "tech", limit: 0 });
  const unreachable = route.steps.filter((s) => s.hops === Infinity);
  assert.ok(unreachable.length >= 3, `expected the isolated cluster in the route, got ${route.steps.length} steps`);
  for (const s of unreachable) {
    assert.equal(s.fromSkill, null, "nothing held leads there, so no origin is claimed");
    assert.match(s.reason, /fresh start/);
    assert.ok(Number.isFinite(s.rank), "and it still has a finite, comparable rank");
  }
  const last = route.steps.slice(-unreachable.length).map((s) => s.hops);
  assert.ok(last.every((h) => h === Infinity), "the unreachable steps are ranked below the reachable ones");
});

test("a reachable step names the held skill it travels from", () => {
  const held = { skills: ["react"], levels: { react: 3 }, verified: [], usedAt: {} };
  const route = routeTo("sde", held, { jobs: [job(["javascript"])], lane: "tech", limit: 0 });
  const js = route.steps.find((s) => s.skill === "javascript");
  assert.equal(js.hops, 1, "javascript is one edge from react");
  assert.equal(js.fromSkill, "react");
  assert.match(js.reason, /one step from react/);
});

test("routeTo on an empty profile still returns a usable route", () => {
  const route = routeTo("sde", { skills: [], levels: {} }, { jobs: [job(["javascript", "react"])], lane: "tech" });
  assert.ok(route.steps.length > 0, "a student with nothing is exactly who needs a route");
  assert.ok(route.steps.every((s) => s.hops === Infinity), "with no held skill every gap is a fresh start");
  assert.ok(route.steps.every((s) => typeof s.reason === "string" && s.reason.length > 10));
});

test("routeTo is deterministic and lands inside its limit", () => {
  const held = { skills: ["javascript"], levels: { javascript: 3 }, verified: [], usedAt: {} };
  const jobs = [job(["react", "css"]), job(["node", "api"]), job(["sql", "dsa"])];
  const a = routeTo("sde", held, { jobs, lane: "tech", limit: 5 });
  const b = routeTo("sde", held, { jobs, lane: "tech", limit: 5 });
  assert.deepEqual(a.steps.map((s) => s.skill), b.steps.map((s) => s.skill), "same input, same order");
  assert.ok(a.steps.length <= 5, "the limit holds");
  const unlimited = routeTo("sde", held, { jobs, lane: "tech", limit: 0 });
  assert.ok(unlimited.steps.length >= a.steps.length);
});

test("a route never mixes lanes", () => {
  const held = { skills: ["javascript"], levels: { javascript: 3 }, verified: [], usedAt: {} };
  const jobs = [job(["react"]), ayushJob(["panchakarma"]), ayushJob(["documentation"])];
  const tech = routeTo("sde", held, { jobs, lane: "tech", limit: 0 });
  for (const step of tech.steps) {
    assert.ok(!["panchakarma", "documentation"].includes(step.skill), `tech route must not contain ${step.skill}`);
  }
  for (const step of tech.steps) {
    for (const p of step.postings) assert.equal(p.lane ?? "tech", "tech", "and no ayush posting is claimed");
  }
});

test("every route step is explainable and carries its evidence", () => {
  const held = { skills: ["react"], levels: { react: 3 }, verified: [], usedAt: {} };
  const route = routeTo("data-analyst", held, { jobs: [job(["sql"]), job(["python"]), job(["excel"])], lane: "tech", limit: 0 });
  assert.ok(route.steps.length > 0);
  for (const s of route.steps) {
    assert.ok(s.skill && s.name, "a step names the skill");
    assert.ok(typeof s.reason === "string" && s.reason.length > 20, `reason: ${s.reason}`);
    assert.ok(Number.isFinite(s.need) && s.need >= 1 && s.need <= 5, "the target level is on the ladder");
    assert.ok(Array.isArray(s.postings), "the postings it opens are attached");
    assert.ok(Array.isArray(s.programs), "and the courses that get there");
    assert.equal(typeof s.unlocks, "number");
  }
});

test("simulate reports before and after from the engine, not from arithmetic on top of it", () => {
  const held = { skills: [], levels: {}, verified: [], usedAt: {} };
  const jobs = [job(["javascript", "react"]), job(["javascript"]), job(["sql"])];
  const sim = simulate({ add: [{ skill: "javascript", level: 3 }], held, jobs, lane: "tech" });
  assert.equal(sim.before.total, 3, "every posting is scored, before and after");
  assert.equal(sim.after.total, 3);
  assert.ok(sim.after.avgFit > sim.before.avgFit, "knowing a required skill can only help");
  assert.ok(sim.deltaFit > 0);
  assert.ok(sim.deltaEligible >= 0);
  assert.equal(sim.locked.length, 0, "adding a skill never takes an opening away");
});

test("simulate can unlock postings and says which ones", () => {
  const held = { skills: ["javascript"], levels: { javascript: 3 }, verified: [], usedAt: {} };
  const jobs = [job(["javascript", "react"])];
  const sim = simulate({ add: [{ skill: "react", level: 3 }], held, jobs, lane: "tech" });
  for (const j of sim.unlocked) assert.ok(!sim.before.jobs.some((b) => String(b.id) === String(j.id)));
  assert.equal(sim.unlocked.length + sim.before.eligible, sim.after.eligible, "unlocks and the before count account for the whole after count");
});

test("simulate with nothing added is a no-op, which is what makes the toggle honest", () => {
  const held = { skills: ["react"], levels: { react: 3 }, verified: [], usedAt: {} };
  const jobs = [job(["react", "javascript"]), job(["sql"])];
  const sim = simulate({ add: [], held, jobs, lane: "tech" });
  assert.equal(sim.deltaEligible, 0);
  assert.equal(sim.deltaFit, 0);
  assert.deepEqual(sim.unlocked, []);
});

test("simulate keeps lanes apart and tolerates an empty corpus", () => {
  const held = { skills: [], levels: {} };
  const jobs = [job(["react"]), ayushJob(["panchakarma"])];
  const ayush = simulate({ add: [{ skill: "panchakarma", level: 3 }], held, jobs, lane: "ayush" });
  assert.equal(ayush.before.total, 1, "only the ayush posting is in scope");
  const empty = simulate({ add: [{ skill: "react", level: 3 }], held, jobs: [], lane: "tech" });
  assert.equal(empty.before.total, 0);
  assert.equal(empty.before.avgFit, 0, "an empty corpus averages to zero, not to NaN");
  assert.deepEqual(empty.unlocked, []);
});
