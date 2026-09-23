// node --test: backend row-shapers + funnel. Pure, no network, no localStorage touched.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isJobEvent, isArtifactKind, normalizeSection,
  toAssessmentRow, toJobEventRow, toArtifactRow, toFeedbackRow, toProfileRow,
  fromProfileRow, fromAssessmentRow, toUserRoleRow, reconcileProfile, pickRole,
  funnelCounts, analyticsSummary,
} from "../src/lib/backend.js";

test("job event + artifact kind guards accept only known values", () => {
  assert.equal(isJobEvent("applied"), true);
  assert.equal(isJobEvent("hired"), false);
  assert.equal(isArtifactKind("cover_letter"), true);
  assert.equal(isArtifactKind("essay"), false);
  assert.equal(normalizeSection("Education"), "education");
  assert.equal(normalizeSection("hobbies"), null);
});

test("toAssessmentRow clamps scores and caps gaps", () => {
  const r = toAssessmentRow({ ats: 120, main: 90, roleKey: "data", gaps: ["a", "b"] });
  assert.equal(r.ats, 95);
  assert.equal(r.main, 90);
  assert.deepEqual(r.gaps, ["a", "b"]);
  assert.equal(toAssessmentRow({}), null);
});

test("toAssessmentRow carries found skills too, so a shared row can prove something", () => {
  const r = toAssessmentRow({ ats: 70, found: ["python", "sql"], gaps: ["excel"] });
  assert.deepEqual(r.found, ["python", "sql"]);
  assert.deepEqual(toAssessmentRow({ ats: 70, found: null }).found, []);
});

test("toJobEventRow rejects bad events, toArtifactRow rejects empty body", () => {
  assert.equal(toJobEventRow({ jobId: "1", event: "hired" }), null);
  assert.equal(toJobEventRow({ jobId: "1", event: "Offer" }).event, "offer");
  assert.equal(toArtifactRow({ kind: "match", body: "" }), null);
  assert.equal(toArtifactRow({ kind: "match", body: "hi", jobId: 7 }).job_id, "7");
});

test("toFeedbackRow clamps rating 1-5", () => {
  assert.equal(toFeedbackRow({ rating: 9, comment: "great" }).rating, 5);
  assert.equal(toFeedbackRow({}), null);
  assert.equal(toFeedbackRow({ rating: 0 }).rating, 1);
});

test("toProfileRow needs a signed-in user", () => {
  assert.equal(toProfileRow(null, { track: "tech" }), null);
  assert.equal(toProfileRow({}, { track: "tech" }), null);
  assert.equal(toProfileRow({ id: "" }, { track: "tech" }), null);
});

test("toProfileRow keeps the portal identity and the answers", () => {
  const row = toProfileRow(
    { id: "u-1", email: "ananya@example.com" },
    { track: "tech", role: "student", profile: { track: "data", skills: "python, sql" } }
  );
  assert.equal(row.id, "u-1");
  assert.equal(row.email, "ananya@example.com");
  assert.equal(row.track, "tech");
  assert.equal(row.role, "student");
  assert.deepEqual(row.answers, { track: "data", skills: "python, sql" });
});

test("toProfileRow never invents a portal or a role", () => {
  const row = toProfileRow({ id: "u-1" }, { track: "mars", profile: null });
  assert.equal(row.track, null);
  assert.equal(row.role, "student");
  assert.deepEqual(row.answers, {});
  assert.equal(row.email, null);
});

test("fromProfileRow needs a row with an id", () => {
  assert.equal(fromProfileRow(null), null);
  assert.equal(fromProfileRow({}), null);
});

test("fromProfileRow maps the portal, role, answers and clock", () => {
  const out = fromProfileRow({
    id: "u-1",
    track: "tech",
    role: "faculty",
    answers: { track: "data", skills: "python, sql" },
    updated_at: "2026-09-22T10:00:00.000Z",
  });
  assert.equal(out.track, "tech");
  assert.equal(out.role, "faculty");
  assert.equal(out.profile.track, "data");
  assert.equal(out.profile.skills, "python, sql");
  assert.equal(out.profile.updatedAt, Date.parse("2026-09-22T10:00:00.000Z"));
});

test("fromProfileRow never invents a portal, and back-fills a lane for old rows", () => {
  const out = fromProfileRow({ id: "u-1", track: "mars", answers: null });
  assert.equal(out.track, null);
  assert.equal(out.role, "student");
  assert.deepEqual(out.profile, { track: "ayush", updatedAt: 0 });
});

test("reconcileProfile: fresh device adopts, local-only pushes, newest wins", () => {
  const remote = (at) => ({ track: "tech", role: "student", profile: { track: "data", updatedAt: at } });
  assert.equal(reconcileProfile(null, null), "none");
  assert.equal(reconcileProfile({ skills: "python" }, null), "none");
  assert.equal(reconcileProfile(null, remote(0)), "adopt");
  assert.equal(reconcileProfile({ skills: "python" }, remote(0)), "adopt");
  assert.equal(reconcileProfile({ track: "tech", updatedAt: 5 }, null), "push");
  assert.equal(reconcileProfile({ track: "tech", updatedAt: 1000 }, remote(2000)), "adopt");
  assert.equal(reconcileProfile({ track: "tech", updatedAt: 3000 }, remote(2000)), "push");
});

test("pickRole: a desk role always beats the student default", () => {
  assert.equal(pickRole([]), null);
  assert.equal(pickRole(null), null);
  assert.equal(pickRole([{ role: "student" }]), "student");
  assert.equal(pickRole([{ role: "student" }, { role: "faculty" }]), "faculty");
  assert.equal(pickRole([{ role: "faculty" }, { role: "institute" }]), "institute");
  assert.equal(pickRole([{ role: "nonsense" }]), null);
});

test("fromAssessmentRow turns a shared row into a public passport", () => {
  const out = fromAssessmentRow({
    student: "AVSAR-X7K2QA",
    ats: 72,
    main: 68,
    role_key: "data",
    gaps: ["sql", "excel"],
    found: ["python"],
    created_at: "2026-09-22T10:00:00.000Z",
  });
  assert.equal(out.id, "AVSAR-X7K2QA");
  assert.equal(out.score, 72);
  assert.equal(out.main, 68);
  assert.equal(out.roleKey, "data");
  assert.deepEqual(out.missing, ["sql", "excel"]);
  assert.equal(out.at, Date.parse("2026-09-22T10:00:00.000Z"));
});

test("fromAssessmentRow never crashes on a thin or junk row", () => {
  assert.equal(fromAssessmentRow(null), null);
  assert.equal(fromAssessmentRow({}), null);
  const thin = fromAssessmentRow({ student: "AVSAR-1", ats: "82", gaps: null });
  assert.equal(thin.score, 82);
  assert.deepEqual(thin.missing, []);
  assert.equal(thin.roleKey, "ayush");
  assert.equal(thin.at, 0);
});

test("toUserRoleRow claims a real role, never a made-up one", () => {
  assert.equal(toUserRoleRow(null, "student"), null);
  assert.equal(toUserRoleRow({}, "student"), null);
  const row = toUserRoleRow({ id: "u-1" }, "faculty", "tech");
  assert.deepEqual(row, { user_id: "u-1", role: "faculty", track: "tech" });
  assert.equal(toUserRoleRow({ id: "u-1" }, "nonsense").role, "student");
  assert.equal(toUserRoleRow({ id: "u-1" }, "student", "mars").track, null);
  assert.equal(toUserRoleRow({ id: "u-1" }, "student").track, null);
});

test("funnelCounts keeps latest status per job", () => {
  const out = funnelCounts([
    { jobId: "a", event: "saved" },
    { jobId: "a", event: "applied" },
    { jobId: "b", event: "saved" },
    { jobId: "c", event: "hired" },
  ]);
  assert.equal(out.saved, 1);
  assert.equal(out.applied, 1);
  assert.equal(out.rejected, 0);
});

test("analyticsSummary aggregates roles bands ratings comments", () => {
  const s = analyticsSummary(
    [{ role_key: "sde", ats: 70 }, { role_key: "sde", ats: 30 }, { role_key: "data", ats: 50 }],
    [{ rating: 5, comment: "great" }, { rating: 3, comment: "" }, { rating: 9, comment: "x" }]
  );
  assert.equal(s.total, 3);
  assert.equal(s.byRole.sde, 2);
  assert.deepEqual(s.bands, { "0-44": 1, "45-64": 1, "65+": 1 });
  assert.equal(s.avgRating, 4);
  assert.equal(s.ratingCount, 2);
  assert.equal(s.comments.length, 2);
  assert.deepEqual(analyticsSummary([], []).bands, { "0-44": 0, "45-64": 0, "65+": 0 });
});
