// Proof-of-skill: small challenges attached to a role, graded by a rubric the candidate
// can read before they submit, signed so the grade cannot be quietly edited later, and
// screened without a name attached.
//
// The grading is deterministic and rule-based on purpose. An LLM could write a kinder
// paragraph about a submission, but then the score would be unexplainable, unrepeatable,
// and impossible to appeal, which defeats the point of preferring proof to a claim. So
// every point comes from a stated rule, every rule appears in `why[]`, and the same
// submission scores the same on any device.
import { hashStr, isEvidenceUrl } from "./quests.js";
import { hasWebCrypto } from "./sign.js";
import { loadJSON, saveJSON } from "./storage.js";
import { CHALLENGE_TEMPLATES } from "../data/challengeTemplates.js";

export const CHALLENGE_KEY = "avsar-challenges-v1";
export const SUBMISSION_KEY = "avsar-submissions-v1";
export const AUDIT_KEY = "avsar-shortlist-audit-v1";

const KINDS = ["build", "write", "case-log", "quiz"];

// What a credible artifact looks like for each kind of challenge. Used to award evidence
// fit, never to reject: a submission from an unusual host is worth less, not nothing.
const EVIDENCE_HOSTS = {
  build: ["github.", "gitlab.", "vercel.app", "netlify.app", "render.com", "pages.dev", "codesandbox."],
  write: ["docs.google.", "notion.", "medium.", "substack.", "wordpress.", "github."],
  "case-log": ["docs.google.", "drive.google.", "notion.", "onedrive.", "github."],
  quiz: ["forms.gle", "docs.google.", "drive.google.", "github."],
};

// --- storage ---------------------------------------------------------------------------

// node --test has no localStorage, and a function that cannot be tested against its own
// writes is a function whose bugs are found by a judge instead. So each store keeps an
// in-memory mirror, seeded once from localStorage where a browser has it, and every write
// goes to both. Same pattern the taxonomy proposals use.
const mem = new Map();

function rows(key) {
  if (!mem.has(key)) {
    const v = loadJSON(key, []);
    mem.set(key, Array.isArray(v) ? v : []);
  }
  return mem.get(key);
}

function write(key, value) {
  mem.set(key, value);
  saveJSON(key, value);
  return value;
}

const byId = (a) => String(a.id ?? a.challengeId ?? "");

export function loadChallenges() {
  return rows(CHALLENGE_KEY);
}

export function loadSubmissions() {
  return rows(SUBMISSION_KEY);
}

export function loadAudit() {
  return rows(AUDIT_KEY);
}

// Idempotent by id, so seeding on every load cannot grow the store, and a challenge the
// employer edited locally is not overwritten by the template it came from.
export function seedChallenges(templates = CHALLENGE_TEMPLATES) {
  const existing = loadChallenges();
  const seen = new Set(existing.map(byId));
  const added = templates.filter((t) => !seen.has(String(t.id)));
  if (!added.length) return existing;
  return write(CHALLENGE_KEY, [...existing, ...added]);
}

export function saveChallenge(challenge = {}) {
  const id = String(challenge.id || `chal-${Date.now()}`);
  const row = {
    id,
    jobId: challenge.jobId ?? null,
    lane: challenge.lane === "ayush" ? "ayush" : "tech",
    title: String(challenge.title || "Untitled challenge").slice(0, 120),
    brief: String(challenge.brief || "").slice(0, 700),
    skill: String(challenge.skill || ""),
    kind: KINDS.includes(challenge.kind) ? challenge.kind : "build",
    checks: (challenge.checks || []).map((c) => String(c).toLowerCase()).slice(0, 6),
    threshold: Number.isFinite(Number(challenge.threshold)) ? Number(challenge.threshold) : 60,
    deadline: challenge.deadline || null,
    blind: challenge.blind !== false,
    createdBy: String(challenge.createdBy || "industry"),
    at: Number(challenge.at) || Date.now(),
  };
  write(CHALLENGE_KEY, [...loadChallenges().filter((c) => byId(c) !== id), row]);
  return row;
}

export function challengeById(id = "") {
  return loadChallenges().find((c) => byId(c) === String(id)) || null;
}

function hostOf(url = "") {
  try {
    return new URL(String(url)).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

const words = (s = "") => String(s || "").trim().split(/\s+/).filter(Boolean);
const round = (n) => Math.max(0, Math.min(100, Math.round(n)));

// --- grading ------------------------------------------------------------------------------

// A challenge the candidate can read before submitting. The weights are fixed and stated
// here so the same numbers appear on the brief and in the returned `why[]`.
export const RUBRIC = Object.freeze({
  evidenceLink: 0,
  hostFit: 40,
  noteSubstance: 30,
  briefCoverage: 30,
});

// Points are awarded for evidence a stranger could open and check. Nothing here reads for
// quality of prose or originality of idea, because those are judgements, and a judgement
// is exactly what a claim-based process already gives us.
export function gradeSubmission(challenge = {}, submission = {}) {
  const url = String(submission.evidenceUrl || "").trim();
  const note = String(submission.note || "");
  const why = [];
  const matchedEvidence = [];

  if (!isEvidenceUrl(url)) {
    return {
      score: 0,
      passed: false,
      why: ["no usable evidence link, so there is nothing to grade", `a link must be a real http URL longer than ${12} characters`],
      matchedEvidence: [],
      rubric: RUBRIC,
    };
  }
  const host = hostOf(url);
  why.push(`evidence link accepted (${host || "unknown host"})`);

  const wanted = EVIDENCE_HOSTS[challenge.kind] || [];
  const hostFit = wanted.some((w) => host.includes(w));
  const hostPoints = hostFit ? RUBRIC.hostFit : Math.round(RUBRIC.hostFit / 2);
  if (hostFit) matchedEvidence.push(host);
  why.push(
    hostFit
      ? `host matches what a ${challenge.kind} challenge expects (+${hostPoints})`
      : `host is unusual for a ${challenge.kind} challenge, so it earns half credit (+${hostPoints})`
  );

  const wc = words(note).length;
  const notePoints = wc >= 40 ? RUBRIC.noteSubstance : wc >= 20 ? 22 : wc >= 8 ? 12 : 0;
  why.push(
    notePoints
      ? `note explains the work in ${wc} words (+${notePoints})`
      : `note is ${wc} word${wc === 1 ? "" : "s"}, too short to show the reasoning (+0)`
  );

  const checks = (challenge.checks || []).filter(Boolean);
  const haystack = `${note} ${url}`.toLowerCase();
  const hits = checks.filter((c) => haystack.includes(c));
  const coverage = checks.length ? Math.round((hits.length / checks.length) * RUBRIC.briefCoverage) : RUBRIC.briefCoverage;
  why.push(
    checks.length
      ? `brief asks for ${checks.join(", ")} and the submission names ${hits.length} of them (+${coverage})`
      : `no specific checks were listed, so brief coverage is granted in full (+${coverage})`
  );
  for (const h of hits) matchedEvidence.push(h);

  const skill = String(challenge.skill || "").toLowerCase();
  const namesSkill = skill ? haystack.includes(skill) || haystack.includes(skill.replace(/-/g, " ")) : false;
  if (skill) {
    why.push(namesSkill ? `the submission is tagged to ${challenge.skill}` : `the note never mentions ${challenge.skill}, which this challenge is for`);
  }

  const score = round(hostPoints + notePoints + coverage);
  const threshold = Number.isFinite(Number(challenge.threshold)) ? Number(challenge.threshold) : 60;
  return {
    score,
    passed: score >= threshold,
    threshold,
    why,
    matchedEvidence: [...new Set(matchedEvidence)],
    rubric: RUBRIC,
  };
}

// What a blind reviewer is allowed to see of an evidence link. A raw URL is not anonymous:
// github.com/john-doe names the student, and so does a personal subdomain. Screening shows
// the host, which is enough to judge the kind of artifact, and the reviewer is told plainly
// that opening it may identify the author. Pretending a link is anonymous would be the
// easiest lie in this whole feature, so it is stated instead of implied.
export function evidenceLabel(url = "") {
  const host = hostOf(url);
  if (!host) return { host: "unknown host", path: "", identifiable: false };
  let segments = [];
  try {
    segments = new URL(String(url)).pathname.split("/").filter(Boolean);
  } catch {
    segments = [];
  }
  const last = segments[segments.length - 1] || segments[0] || "";
  return { host, path: last ? `…/${last.slice(0, 24)}` : "", identifiable: true };
}

// --- blind handles -------------------------------------------------------------------------

async function sha256Hex(s = "") {
  if (!hasWebCrypto()) return null;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Stable per device and per challenge: the same student is the same handle in a challenge
// twice, and two students are different handles. It is a pseudonym, not anonymity from a
// determined observer who already holds the device id, and the UI says so.
export async function blindId(deviceId = "", challengeId = "", salt = "avsar-blind-v1") {
  const body = `${salt}:${deviceId}:${challengeId}`;
  const hex = await sha256Hex(body);
  return hex ? hex.slice(0, 12) : `h${hashStr(body).toString(36)}`.slice(0, 12);
}

// --- submissions -------------------------------------------------------------------------

export async function recordSubmission({ challenge = null, deviceId = "", evidenceUrl = "", note = "" } = {}) {
  if (!challenge?.id) return null;
  const grade = gradeSubmission(challenge, { evidenceUrl, note });
  const row = {
    id: `sub-${Date.now()}-${hashStr(`${deviceId}:${challenge.id}`).toString(36).slice(0, 5)}`,
    challengeId: String(challenge.id),
    lane: challenge.lane === "ayush" ? "ayush" : "tech",
    skill: challenge.skill || "",
    blindId: await blindId(deviceId, challenge.id),
    evidenceUrl: String(evidenceUrl || "").trim(),
    note: String(note || "").slice(0, 1200),
    at: Date.now(),
    grade: { score: grade.score, why: grade.why, matchedEvidence: grade.matchedEvidence, passed: grade.passed, threshold: grade.threshold },
  };
  write(SUBMISSION_KEY, [...loadSubmissions(), row]);
  return row;
}

// Highest score first. Ties break on the earlier submission and then on the handle, so the
// order a recruiter sees is reproducible rather than dependent on insertion order.
export function rankSubmissions(list = []) {
  return [...list].sort(
    (a, b) =>
      (b.grade?.score || 0) - (a.grade?.score || 0) ||
      (Number(a.at) || 0) - (Number(b.at) || 0) ||
      String(a.blindId || "").localeCompare(String(b.blindId || ""))
  );
}

// --- shortlist and reveal -------------------------------------------------------------------

// Splitting the pool records a decision for each row. The record is what unlocks a reveal,
// so identity can only be looked up after the screening decision exists, never before it.
export function shortlist(list = [], { threshold = 60, challengeId = "", by = "industry", record = true } = {}) {
  const rows = rankSubmissions(list).map((s) => ({
    ...s,
    decision: (s.grade?.score || 0) >= threshold ? "shortlisted" : "not-shortlisted",
  }));
  const kept = rows.filter((r) => r.decision === "shortlisted");
  const dropped = rows.filter((r) => r.decision !== "shortlisted");
  if (record && rows.length) {
    const at = Date.now();
    const existing = loadAudit();
    const additions = rows
      .filter((r) => !existing.some((e) => e.submissionId === r.id && e.kind === "decision"))
      .map((r) => ({
        kind: "decision",
        submissionId: r.id,
        challengeId: String(challengeId || r.challengeId || ""),
        decision: r.decision,
        score: r.grade?.score ?? 0,
        threshold,
        by: String(by || "industry"),
        at,
      }));
    if (additions.length) write(AUDIT_KEY, [...existing, ...additions]);
  }
  return { in: kept, out: dropped, threshold };
}

// Which skills a student has proved, for the matcher to read as verified. A passed
// submission counts in the lane it was earned in, and the caller is what decides whether
// to let it lift the other lane, so the rule lives in one place instead of two.
export function verifiedSkills(submissions = [], challenges = []) {
  const byChallenge = new Map(challenges.map((c) => [String(c.id), c]));
  const out = [];
  for (const s of submissions) {
    if (!s.grade?.passed) continue;
    const skill = s.skill || byChallenge.get(String(s.challengeId))?.skill;
    if (!skill) continue;
    out.push({ skill, lane: s.lane === "ayush" ? "ayush" : "tech", at: Number(s.at) || 0, submissionId: s.id });
  }
  return out;
}

// One call for the matcher. A passed challenge has to lift the score in both lanes, not only
// the lane it was earned in: a parity rule that held in one portal would boost half the
// students and leave the other half reading a score that ignores their proof.
export function proofVerifiedSkills() {
  return verifiedSkills(loadSubmissions(), loadChallenges()).map((v) => v.skill);
}

// The reveal, and the only place a name is attached to a screened handle. Refused until a
// shortlist decision exists for that submission, so the audit trail is a consequence of
// the process rather than a note written afterwards.
export function revealIdentity(submissionId = "", { by = "industry", reason = "post-decision review" } = {}) {
  const id = String(submissionId);
  const audit = loadAudit();
  const decided = audit.some((e) => e.kind === "decision" && String(e.submissionId) === id);
  if (!decided) return { ok: false, reason: "no shortlist decision recorded for this submission, so there is nothing to reveal yet" };
  const entry = {
    kind: "reveal",
    submissionId: id,
    by: String(by || "industry"),
    reason: String(reason || "").slice(0, 200),
    at: Date.now(),
  };
  write(AUDIT_KEY, [...audit, entry]);
  return { ok: true, entry };
}

export function auditFor(submissionId = "") {
  return loadAudit().filter((e) => String(e.submissionId) === String(submissionId));
}
