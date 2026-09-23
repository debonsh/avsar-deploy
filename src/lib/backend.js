// ponytail: one home for the JobSync + Analyzer backend mirror. Pure row-shapers
// (node --test) + local-first saves + best-effort Supabase inserts. Remote never
// blocks: false means "local already saved", callers carry on.
import { getClient } from "./supabase.js";
import { getOrCreateDeviceId } from "./identity.js";
import { loadJSON, saveJSON } from "./storage.js";

// --- pure (tested) ---

export const JOB_EVENTS = ["saved", "applied", "dismissed", "interview", "offer", "rejected"];
export const ARTIFACT_KINDS = ["review", "match", "cover_letter"];
export const RESUME_SECTIONS = ["contact", "experience", "education", "skills", "certifications"];

export function isJobEvent(e) {
  return JOB_EVENTS.includes(String(e || "").toLowerCase());
}

export function isArtifactKind(k) {
  return ARTIFACT_KINDS.includes(String(k || "").toLowerCase());
}

export function normalizeSection(s) {
  const v = String(s || "").toLowerCase();
  return RESUME_SECTIONS.includes(v) ? v : null;
}

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, Math.round(n || 0)));

export function toAssessmentRow(p = {}) {
  if (p.ats == null && p.main == null) return null;
  return {
    student: p.student || "local",
    ats: clamp(p.ats, 0, 95),
    main: clamp(p.main, 0, 100),
    role_key: p.roleKey || "sde",
    // found travels with the row: a public passport can only prove what is here.
    found: Array.isArray(p.found) ? p.found.map(String).slice(0, 20) : [],
    gaps: Array.isArray(p.gaps) ? p.gaps.map(String).slice(0, 20) : [],
  };
}

export function toJobEventRow(p = {}) {
  if (!p.jobId || !isJobEvent(p.event)) return null;
  return { student: p.student || "local", job_id: String(p.jobId), event: String(p.event).toLowerCase() };
}

export function toArtifactRow(p = {}) {
  if (!isArtifactKind(p.kind) || !p.body) return null;
  return {
    student: p.student || "local",
    job_id: p.jobId ? String(p.jobId) : null,
    kind: String(p.kind).toLowerCase(),
    body: String(p.body).slice(0, 20000),
  };
}

export function toFeedbackRow(p = {}) {
  if (!p.comment && p.rating == null) return null;
  return {
    student: p.student || "local",
    rating: p.rating == null ? null : clamp(p.rating, 1, 5),
    comment: String(p.comment || "").slice(0, 2000),
  };
}

// Signed-in identity row (profiles). Anonymous devices stay local-only, so a
// missing user means "nothing to mirror" rather than a default row. Unknown
// portals are dropped, not guessed, so RLS never holds a bogus track.
export function toProfileRow(user, p = {}) {
  const id = user?.id ? String(user.id) : "";
  if (!id) return null;
  return {
    id,
    email: user.email ? String(user.email) : null,
    track: p.track === "ayush" || p.track === "tech" ? p.track : null,
    role: p.role ? String(p.role) : "student",
    answers: p.profile && typeof p.profile === "object" ? p.profile : {},
  };
}

// profiles row → the shape the store keeps locally. A row without a portal is
// still useful (role + answers) so it maps to track:null and the shell asks.
export function fromProfileRow(row) {
  if (!row?.id) return null;
  const answers = row.answers && typeof row.answers === "object" ? row.answers : {};
  const track = row.track === "ayush" || row.track === "tech" ? row.track : null;
  return {
    track,
    role: row.role || "student",
    profile: {
      ...answers,
      // old rows predate the lane field: back-fill it from the portal.
      track: answers.track || (track === "tech" ? "sde" : "ayush"),
      updatedAt: Date.parse(row.updated_at || "") || 0,
    },
  };
}

// Which side wins when a device and the cloud disagree. A device with no portal
// is fresh and adopts; a cloud row with no portal is behind and gets a push;
// two real rows are settled by the newer clock. Local always stays the fallback,
// so this only ever decides adopt vs push, never "delete".
export function reconcileProfile(local, remote) {
  const localHas = Boolean(local?.track);
  const remoteHas = Boolean(remote?.track);
  if (!localHas && !remoteHas) return "none";
  if (!localHas) return "adopt";
  if (!remoteHas) return "push";
  return (remote.profile?.updatedAt || 0) > (local.updatedAt || 0) ? "adopt" : "push";
}

// Desk roles outrank the student default: an institute admin who is also
// enrolled as a student must land on the institute desk, whatever the row order.
export const ROLE_PRIORITY = ["institute", "faculty", "industry", "ayush", "student"];

export function pickRole(rows = []) {
  const ids = new Set((rows || []).map((r) => r?.role).filter(Boolean));
  return ROLE_PRIORITY.find((r) => ids.has(r)) || null;
}

// The authorization ledger row for a signed-in user (user_roles). Only the
// student role is self-claimable per RLS; every desk role is an admin grant, so
// a junk role can never be written from the browser.
export function toUserRoleRow(user, role = "student", track = null) {
  const user_id = user?.id ? String(user.id) : "";
  if (!user_id) return null;
  return {
    user_id,
    role: ROLE_PRIORITY.includes(role) ? role : "student",
    track: track === "ayush" || track === "tech" ? track : null,
  };
}

// The public side of a scored resume: one row a visitor can read to render a
// passport for someone else's device id. Thin rows are fine, junk is not.
export function fromAssessmentRow(row) {
  if (!row?.student) return null;
  return {
    id: String(row.student),
    score: Number(row.ats) || 0,
    main: Number(row.main) || 0,
    roleKey: row.role_key || "ayush",
    found: Array.isArray(row.found) ? row.found.map(String) : [],
    missing: Array.isArray(row.gaps) ? row.gaps.map(String) : [],
    at: Date.parse(row.created_at || "") || 0,
  };
}

// dashboard funnel: counts per event, latest status per job wins
export function funnelCounts(events = []) {
  const latest = new Map();
  for (const e of events || []) {
    if (!e || !e.jobId || !isJobEvent(e.event)) continue;
    latest.set(String(e.jobId), String(e.event).toLowerCase());
  }
  const out = Object.fromEntries(JOB_EVENTS.map((k) => [k, 0]));
  for (const v of latest.values()) out[v] += 1;
  return out;
}

// --- local-first (offline-safe) ---

const AKEY = "avsar-assessments";
const EKEY = "avsar-job-events";
const RKEY = "avsar-artifacts";
const FKEY = "avsar-feedback";

export function loadAssessments() {
  return loadJSON(AKEY, []);
}

export function loadJobEvents() {
  return loadJSON(EKEY, []);
}

export function loadArtifacts() {
  return loadJSON(RKEY, []);
}

export function loadFeedback() {
  return loadJSON(FKEY, []);
}

// Analyzer admin: distribution aggregates over assessments + feedback. Pure.
export function analyticsSummary(assessments = [], feedback = []) {
  const byRole = {};
  const bands = { "0-44": 0, "45-64": 0, "65+": 0 };
  for (const a of assessments || []) {
    if (!a) continue;
    byRole[a.role_key || "sde"] = (byRole[a.role_key || "sde"] || 0) + 1;
    const ats = a.ats ?? 0;
    bands[ats >= 65 ? "65+" : ats >= 45 ? "45-64" : "0-44"] += 1;
  }
  const ratings = (feedback || []).map((f) => f.rating).filter((r) => r >= 1 && r <= 5);
  const avgRating = ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10 : 0;
  const comments = (feedback || []).filter((f) => (f.comment || "").trim()).slice(0, 5);
  return { total: (assessments || []).length, byRole, bands, avgRating, ratingCount: ratings.length, comments };
}

async function insert(table, row) {
  const sb = await getClient();
  if (!sb) return false;
  try {
    const { error } = await sb.from(table).insert(row);
    return !error;
  } catch {
    return false;
  }
}

export async function saveAssessment(p = {}) {
  const row = toAssessmentRow({ ...p, student: getOrCreateDeviceId() });
  if (!row) return false;
  saveJSON(AKEY, [row, ...loadAssessments()].slice(0, 50));
  return insert("assessments", row);
}

// Mirror the signed-in user's portal identity after onboarding. Best-effort like
// every other write here: the local profile is already the source of truth.
export async function saveProfileRemote(user, p = {}) {
  const row = toProfileRow(user, p);
  if (!row) return false;
  const sb = await getClient();
  if (!sb) return false;
  try {
    const { error } = await sb.from("profiles").upsert({ ...row, updated_at: new Date().toISOString() });
    return !error;
  } catch {
    return false;
  }
}

// Read the cloud row back — this is what makes a second device pick up where the
// first one left off. Null means "no cloud row / offline / not signed in".
export async function loadRemoteProfile(user) {
  const sb = await getClient();
  if (!sb || !user?.id) return null;
  try {
    const { data, error } = await sb.from("profiles").select("*").eq("id", user.id).maybeSingle();
    return error ? null : fromProfileRow(data);
  } catch {
    return null;
  }
}

// user_roles is the ledger RLS trusts for a professional desk. Only the student
// role can be self-claimed; the rest are issued by an admin.
export async function loadRemoteRoles(user) {
  const sb = await getClient();
  if (!sb || !user?.id) return null;
  try {
    const { data, error } = await sb.from("user_roles").select("role, track").eq("user_id", user.id);
    return error ? null : data || [];
  } catch {
    return null;
  }
}

// Claim the student role on first sign-in so the ledger has a row for every
// account. A duplicate is success (already claimed), never an error to surface.
export async function claimStudentRole(user, track = null) {
  const row = toUserRoleRow(user, "student", track);
  if (!row) return false;
  const sb = await getClient();
  if (!sb) return false;
  try {
    const { error } = await sb.from("user_roles").insert(row);
    return !error || error.code === "23505";
  } catch {
    return false;
  }
}

// Someone else's passport: latest assessment row for that device id. Null when
// the table is missing, the visitor is offline, or that id never scored.
export async function loadPublicPassport(deviceId) {
  const id = deviceId ? String(deviceId) : "";
  if (!id) return null;
  const sb = await getClient();
  if (!sb) return null;
  try {
    const { data, error } = await sb
      .from("assessments")
      .select("*")
      .eq("student", id)
      .order("created_at", { ascending: false })
      .limit(1);
    if (error || !Array.isArray(data) || !data.length) return null;
    return fromAssessmentRow(data[0]);
  } catch {
    return null;
  }
}

export async function saveResumeSections(sections = []) {
  const rows = (sections || [])
    .map((s) => ({ student: getOrCreateDeviceId(), section: normalizeSection(s.section), payload: s.payload || {}, status: s.status === "skipped" ? "skipped" : "accepted" }))
    .filter((r) => r.section);
  if (!rows.length) return false;
  let ok = true;
  for (const r of rows) ok = (await insert("resume_sections", r)) && ok;
  return ok;
}

export async function recordJobEvent(jobId, event) {
  const row = toJobEventRow({ jobId, event, student: getOrCreateDeviceId() });
  if (!row) return false;
  saveJSON(EKEY, [...loadJobEvents(), { jobId: row.job_id, event: row.event, at: Date.now() }].slice(-200));
  return insert("job_events", row);
}

export async function saveArtifact(p = {}) {
  const row = toArtifactRow({ ...p, student: getOrCreateDeviceId() });
  if (!row) return false;
  saveJSON(RKEY, [row, ...loadArtifacts()].slice(0, 50));
  return insert("ai_artifacts", row);
}

export async function submitFeedback(p = {}) {
  const row = toFeedbackRow({ ...p, student: getOrCreateDeviceId() });
  if (!row) return false;
  saveJSON(FKEY, [row, ...loadJSON(FKEY, [])].slice(0, 50));
  return insert("feedback", row);
}

async function select(table) {
  const sb = await getClient();
  if (!sb) return null;
  try {
    const { data, error } = await sb.from(table).select("*").order("created_at", { ascending: false }).limit(200);
    return error ? null : data || [];
  } catch {
    return null;
  }
}

export async function loadRemoteAssessments() {
  return select("assessments");
}

export async function loadRemoteFeedback() {
  return select("feedback");
}
