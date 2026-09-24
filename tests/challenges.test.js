// node --test: proof-of-skill. Two properties matter. Grading is deterministic and
// explainable, so the same submission scores the same everywhere and every point appears
// in why[]. And the reveal is gated on a recorded screening decision, so identity cannot be
// looked up before the decision that justifies looking it up.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  gradeSubmission, blindId, rankSubmissions, shortlist, revealIdentity, auditFor,
  recordSubmission, loadChallenges, seedChallenges, saveChallenge, challengeById,
  verifiedSkills, RUBRIC, loadSubmissions,
} from "../src/lib/challenges.js";
import { CHALLENGE_TEMPLATES, templatesForLane } from "../src/data/challengeTemplates.js";
import { signPayload, generateIssuerKeypair, verifySigned } from "../src/lib/sign.js";
import { profileForMatching, matchScore } from "../src/lib/match.js";
import { proofVerifiedSkills } from "../src/lib/challenges.js";

const words = (s = "") => String(s).trim().split(/\s+/).filter(Boolean);

const GOOD_URL = "https://github.com/student/retention-analysis";


const challenge = (over = {}) => ({
  id: "chal-t1", lane: "tech", title: "Answer a retention question", skill: "sql",
  kind: "build", checks: ["query", "assumption"], threshold: 60, ...over,
});

test("the rubric adds up to 100 and every term is named", () => {
  const total = RUBRIC.hostFit + RUBRIC.noteSubstance + RUBRIC.briefCoverage;
  assert.equal(total, 100, "the rubric must be a whole, not a number nobody can reconstruct");
  assert.equal(RUBRIC.evidenceLink, 0, "the link is a gate, not a scored term");
});

test("a submission with no usable link scores zero and says why", () => {
  for (const junk of ["", "   ", "not a url", "http://x.co", null, undefined]) {
    const g = gradeSubmission(challenge(), { evidenceUrl: junk, note: "a".repeat(200) });
    assert.equal(g.score, 0, JSON.stringify(junk));
    assert.equal(g.passed, false);
    assert.ok(g.why.length >= 2, "even a zero shows its reasoning");
    assert.match(g.why[0], /no usable evidence link/);
  }
});

test("grading is deterministic: same input, same score, same words", () => {
  const long = "I wrote a query joining events to users and explained every assumption I had to make about what counts as an active user, then checked the result against a hand count before trusting it, and said plainly which part I would verify first with a second day of work and proper access to the raw event table rather than the summary view";
  const sub = { evidenceUrl: GOOD_URL, note: long };
  const a = gradeSubmission(challenge(), sub);
  const b = gradeSubmission(challenge(), sub);
  assert.deepEqual(a, b);
  const wc = words(sub.note).length;
  assert.ok(wc >= 40, `the fixture must sit in the top word band, got ${wc} words from ${JSON.stringify(String(sub.note).slice(0, 30))}`);
  assert.equal(a.score, 100, "the fullest possible submission scores the whole rubric");
  assert.ok(a.why.every((w) => typeof w === "string" && w.length > 5));
});

test("every scored term appears in why[] with its points", () => {
  const g = gradeSubmission(challenge(), { evidenceUrl: GOOD_URL, note: "query and assumption" });
  const joined = g.why.join(" | ");
  assert.match(joined, /\(\+\d+\)/, "points are shown inline, not just totalled");
  assert.match(joined, /host/);
  assert.match(joined, /note/);
  assert.match(joined, /brief asks for/);
});

test("an unusual host earns half credit rather than a rejection", () => {
  const onHost = gradeSubmission(challenge(), { evidenceUrl: GOOD_URL, note: "query assumption".padEnd(60, " x") });
  const offHost = gradeSubmission(challenge(), { evidenceUrl: "https://example.com/my-work", note: "query assumption".padEnd(60, " x") });
  assert.ok(offHost.score < onHost.score, "host fit is worth something");
  assert.ok(offHost.score > 0, "but an unusual host is not disqualifying");
  assert.match(offHost.why.join(" "), /half credit/);
});

test("note substance climbs in bands and never invents credit", () => {
  // coverage is held constant on purpose: this test is about the note term, and a longer
  // note that stops naming the checks would move two terms at once and prove nothing
  const short = gradeSubmission(challenge(), { evidenceUrl: GOOD_URL, note: "query assumption" });
  const medium = gradeSubmission(challenge(), { evidenceUrl: GOOD_URL, note: "the query and the assumption are both written up here" });
  const long = gradeSubmission(challenge(), { evidenceUrl: GOOD_URL, note: `query assumption ${"detail ".repeat(42)}` });
  assert.ok(short.score < medium.score, "an eight word note beats a two word one");
  assert.ok(medium.score < long.score, "and a long one beats a short one");
  assert.match(short.why.join(" "), /too short to show the reasoning/);
});

test("brief coverage counts the checks the submission actually names", () => {
  const c = challenge({ checks: ["query", "assumption", "decision", "caveat"] });
  const none = gradeSubmission(c, { evidenceUrl: GOOD_URL, note: "here is my work, please look" });
  const some = gradeSubmission(c, { evidenceUrl: GOOD_URL, note: "the query plus the assumption is documented at length in the readme file" });
  assert.ok(some.score > none.score);
  assert.match(none.why.join(" "), /names 0 of them/);
  assert.match(some.why.join(" "), /names 2 of them/);
});

test("a challenge with no checks listed grants coverage in full and says so", () => {
  const g = gradeSubmission(challenge({ checks: [] }), { evidenceUrl: GOOD_URL, note: "query assumption" });
  assert.match(g.why.join(" "), /no specific checks were listed/);
  assert.ok(g.matchedEvidence.length >= 1);
});

test("passing is decided by the challenge's own threshold", () => {
  const sub = { evidenceUrl: GOOD_URL, note: "query and assumption, explained" };
  const easy = gradeSubmission(challenge({ threshold: 40 }), sub);
  const hard = gradeSubmission(challenge({ threshold: 100 }), sub);
  assert.equal(easy.passed, true);
  assert.equal(hard.passed, hard.score >= 100, "a 100 bar is only cleared by a perfect score");
  assert.equal(hard.threshold, 100);
});

test("seeding is idempotent and every template is a usable challenge", () => {
  const first = seedChallenges();
  const second = seedChallenges();
  assert.equal(first.length, CHALLENGE_TEMPLATES.length);
  assert.equal(second.length, first.length, "seeding twice must not duplicate the store");
  assert.equal(loadChallenges().length, first.length);
  for (const c of CHALLENGE_TEMPLATES) {
    assert.ok(c.id && c.title && c.brief, `${c.id} is complete`);
    assert.ok(["ayush", "tech"].includes(c.lane));
    assert.ok(c.skill, `${c.id} names the skill it proves`);
    assert.ok(c.checks.length >= 3, `${c.id} states what it looks for`);
    assert.ok(c.threshold > 0 && c.threshold <= 100);
    assert.equal(c.blind, true, "screening is blind by default");
  }
});

test("each lane has its own offline challenges", () => {
  assert.equal(templatesForLane("ayush").length, 3);
  assert.equal(templatesForLane("tech").length, 3);
  assert.equal(templatesForLane("ayush").filter((c) => c.lane === "ayush").length, 3);
  assert.equal(templatesForLane("sde").length, 3, "a tech sub-lane reads the tech set");
});

test("a saved challenge round-trips and is validated on the way in", () => {
  const row = saveChallenge({ id: "chal-custom", title: "Audit a pipeline", skill: "gmp", kind: "nonsense", lane: "ayush", checks: ["A", "b"], threshold: "70" });
  assert.equal(row.kind, "build", "an unknown kind falls back rather than entering the store");
  assert.deepEqual(row.checks, ["a", "b"], "checks are normalised for matching");
  assert.equal(row.threshold, 70, "a numeric string is read as a number");
  assert.equal(row.blind, true);
  const found = challengeById("chal-custom");
  assert.equal(found.title, "Audit a pipeline");
  assert.equal(challengeById("nope"), null);
});

test("blindId is stable per device and challenge, and differs across devices", async () => {
  const a = await blindId("device-1", "chal-1");
  const again = await blindId("device-1", "chal-1");
  const otherDevice = await blindId("device-2", "chal-1");
  const otherChallenge = await blindId("device-1", "chal-2");
  assert.equal(a, again, "the same student is the same handle in the same challenge");
  assert.equal(a.length, 12);
  assert.notEqual(a, otherDevice);
  assert.notEqual(a, otherChallenge);
  assert.match(a, /^[0-9a-f]{12}$/, "handles are hex, so they leak nothing legible");
});

test("a recorded submission carries a grade and a handle, never an identity", async () => {
  const before = loadSubmissions().length;
  const c = saveChallenge({ id: "chal-rec", title: "Ship a page", skill: "react", kind: "build", checks: ["empty state"], threshold: 50 });
  const row = await recordSubmission({ challenge: c, deviceId: "dev-x", evidenceUrl: GOOD_URL, note: "I built the page with an empty state and a loading state and wrote about it at length here." });
  assert.equal(loadSubmissions().length, before + 1);
  assert.ok(row.grade.score > 0);
  assert.equal(row.grade.passed, true);
  assert.equal(row.blindId, await blindId("dev-x", "chal-rec"));
  const asText = JSON.stringify(row);
  assert.ok(!/dev-x/.test(asText), "the device id must not survive into the stored row");
});

test("ranking is total and reproducible, not insertion-ordered", () => {
  const rows = [
    { id: "a", at: 300, blindId: "bbb", grade: { score: 70 } },
    { id: "b", at: 100, blindId: "ccc", grade: { score: 90 } },
    { id: "c", at: 200, blindId: "aaa", grade: { score: 70 } },
    { id: "d", at: 200, blindId: "aaa", grade: { score: 70 } },
  ];
  const ranked = rankSubmissions(rows);
  assert.deepEqual(ranked.map((r) => r.id), ["b", "c", "d", "a"], "score first, then earliest, then handle");
  assert.deepEqual(rankSubmissions(ranked).map((r) => r.id), ranked.map((r) => r.id), "already sorted stays sorted");
  assert.deepEqual(rankSubmissions([]), []);
});

test("shortlisting splits the pool at the threshold and records the decision", () => {
  const rows = [
    { id: "s1", challengeId: "c1", at: 1, blindId: "u1", grade: { score: 80 } },
    { id: "s2", challengeId: "c1", at: 2, blindId: "u2", grade: { score: 40 } },
  ];
  const res = shortlist(rows, { threshold: 60, challengeId: "c1" });
  assert.deepEqual(res.in.map((r) => r.id), ["s1"]);
  assert.deepEqual(res.out.map((r) => r.id), ["s2"]);
  assert.equal(res.threshold, 60);
  const decisions = auditFor("s1").filter((e) => e.kind === "decision");
  assert.equal(decisions.length, 1);
  assert.equal(decisions[0].decision, "shortlisted");
  assert.equal(decisions[0].by, "industry");
  // re-running must not append a second decision for the same submission
  shortlist(rows, { threshold: 60, challengeId: "c1" });
  assert.equal(auditFor("s1").filter((e) => e.kind === "decision").length, 1);
});

test("identity cannot be revealed before a screening decision exists", () => {
  const refused = revealIdentity("never-screened", { by: "industry" });
  assert.equal(refused.ok, false);
  assert.match(refused.reason, /no shortlist decision/);
  assert.deepEqual(auditFor("never-screened"), [], "and a refused reveal leaves no trace claiming otherwise");

  shortlist([{ id: "s3", challengeId: "c2", at: 1, blindId: "u3", grade: { score: 90 } }], { threshold: 60, challengeId: "c2" });
  const allowed = revealIdentity("s3", { by: "industry", reason: "offer stage" });
  assert.equal(allowed.ok, true);
  assert.equal(allowed.entry.kind, "reveal");
  assert.equal(allowed.entry.by, "industry");
  const trail = auditFor("s3");
  assert.deepEqual(trail.map((e) => e.kind), ["decision", "reveal"], "the reveal is written after the decision it depends on");
});

test("a passed submission verifies its skill in the lane it was earned in", () => {
  const challenges = [
    { id: "c-ay", skill: "pharmacovigilance", lane: "ayush" },
    { id: "c-te", skill: "sql", lane: "tech" },
  ];
  const submissions = [
    { id: "s-1", challengeId: "c-ay", lane: "ayush", skill: "pharmacovigilance", at: 10, grade: { passed: true } },
    { id: "s-2", challengeId: "c-te", lane: "tech", skill: "sql", at: 20, grade: { passed: true } },
    { id: "s-3", challengeId: "c-te", lane: "tech", skill: "sql", at: 30, grade: { passed: false } },
  ];
  const out = verifiedSkills(submissions, challenges);
  assert.equal(out.length, 2, "a failed submission proves nothing");
  assert.deepEqual(out.map((v) => v.skill).sort(), ["pharmacovigilance", "sql"]);
  assert.deepEqual(out.map((v) => v.lane).sort(), ["ayush", "tech"], "both lanes are represented");
  assert.equal(out.find((v) => v.skill === "sql").submissionId, "s-2");
});

test("a graded submission can be signed, and the receipt survives a later edit check", async () => {
  const pair = await generateIssuerKeypair();
  const g = gradeSubmission(challenge(), { evidenceUrl: GOOD_URL, note: "query and assumption, explained properly" });
  const receipt = await signPayload({ submissionId: "sub-9", score: g.score, skill: "sql" }, pair);
  assert.equal((await verifySigned(receipt)).ok, true);
  assert.equal((await verifySigned({ ...receipt, payload: { ...receipt.payload, score: g.score + 10 } })).ok, false);
});

test("a passed challenge lifts the engine in both lanes, even for a skill the resume omits", async () => {
  // The failure this guards against is silent: the proof exists, the score ignores it, and
  // nobody sees an error. So the assertion is on the score itself, not on the store.
  const challengeRow = saveChallenge({
    id: "chal-parity",
    title: "Prove you can query",
    skill: "sql",
    kind: "build",
    lane: "tech",
    checks: ["query", "assumption"],
    threshold: 40,
  });
  await recordSubmission({
    challenge: challengeRow,
    deviceId: "parity-device",
    evidenceUrl: GOOD_URL,
    note: "I wrote a query and stated the assumption behind it, then checked the count by hand before trusting it.",
  });

  assert.ok(proofVerifiedSkills().includes("sql"), "the passed challenge reports its skill");

  // a resume that never mentions sql still gains it, at a level the engine can use
  const profile = profileForMatching("sde", ["react"], 0);
  assert.ok(profile.skills.includes("sql"), "a proved skill counts as held");
  assert.ok(profile.verified.includes("sql"), "and counts as verified");

  // and it is the score that moves, which is what a student would actually notice
  const withProof = matchScore({
    required: [{ skill: "sql", level: 3 }],
    held: profile.skills.map((k) => ({ skill: k, level: profile.levels[k], verified: profile.verified.includes(k), lastUsedAt: profile.usedAt[k] })),
  });
  const withoutProof = matchScore({ required: [{ skill: "sql", level: 3 }], held: [] });
  assert.equal(withoutProof.score, 0, "with nothing held the posting scores zero");
  assert.ok(withProof.score > 0, "the proof alone moves it off zero");
  assert.ok(withProof.breakdown.verified > 0, "and the verified term is what carries it");
});

test("an unpassed challenge proves nothing", async () => {
  const before = proofVerifiedSkills().length;
  const c = saveChallenge({ id: "chal-fail", title: "Weak attempt", skill: "node", kind: "build", lane: "tech", checks: ["x"], threshold: 100 });
  await recordSubmission({ challenge: c, deviceId: "parity-device-2", evidenceUrl: GOOD_URL, note: "short" });
  assert.equal(proofVerifiedSkills().length, before, "a submission below the bar must not verify its skill");
});
