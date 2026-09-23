// ponytail: one home for board IO. Pure mappers (node --test) + local-first writes + best-effort remote.
// Remote never blocks: null/false means "seeds already showing", callers carry on.
import { getClient } from "./supabase.js";
import { getOrCreateDeviceId } from "./identity.js";
import { ROLES } from "./score.js";
import { loadJSON, saveJSON } from "./storage.js";
import { queryFromProfile } from "./profile.js";

// --- pure (tested) ---

export function toJobShape(r) {
  if (!r) return null;
  return {
    id: `remote-${r.id ?? r.title}`,
    role: r.role_key || "sde",
    title: r.title || "Untitled role",
    company: r.company || "Unknown",
    loc: r.location || "Remote",
    type: r.type || "Internship",
    skills: Array.isArray(r.required_skills) ? r.required_skills.map(String) : [],
    minScore: Number(r.min_score ?? 40),
    apply: r.apply_url || "#",
    description: r.description || "",
    remote: true,
  };
}

export function mergeJobs(...lists) {
  const seen = new Set();
  const out = [];
  for (const list of lists) {
    for (const j of list || []) {
      if (!j || seen.has(j.id)) continue;
      seen.add(j.id);
      out.push(j);
    }
  }
  return out;
}

// --- local-first (offline-safe) ---

const CKEY = "avsar-custom-jobs";
const AKEY = "avsar-applications";
const IKEY = "avsar-interests";

export function loadCustomJobs() {
  return loadJSON(CKEY, []);
}

export function saveCustomJob(job) {
  const all = [job, ...loadCustomJobs()];
  saveJSON(CKEY, all);
  return all;
}

export function loadApplications() {
  return loadJSON(AKEY, []);
}

export function countLocalApplications(jobId) {
  return loadApplications().filter((a) => a.jobId === jobId).length;
}

function saveApplicationLocal(app) {
  saveJSON(AKEY, [...loadApplications(), app]);
}

// --- remote best-effort (Supabase jobs_board / applications) ---

export async function listJobsBoard() {
  const sb = await getClient();
  if (!sb) return null;
  try {
    const { data, error } = await sb.from("jobs_board").select("*").order("created_at", { ascending: false }).limit(100);
    if (error || !data?.length) return null;
    return data.map(toJobShape).filter(Boolean);
  } catch {
    return null;
  }
}

export async function createJobBoard(p) {
  const sb = await getClient();
  if (!sb) return false;
  try {
    const { error } = await sb.from("jobs_board").insert({
      title: p.title, company: p.company, location: p.loc, type: p.type,
      role_key: p.role, required_skills: p.skills, min_score: p.minScore,
      apply_url: p.apply, description: p.description || "", created_by: getOrCreateDeviceId(),
    });
    return !error;
  } catch {
    return false;
  }
}

export async function recordApplication(job, ats, main = ats) {
  const app = { jobId: job.id, title: job.title, ats: Math.round(ats || 0), at: Date.now() };
  saveApplicationLocal(app);
  const sb = await getClient();
  if (!sb) return false;
  try {
    const { error } = await sb.from("applications").insert({
      job_id: String(job.id), student: getOrCreateDeviceId(), ats: app.ats, main: Math.round(main || ats || 0),
    });
    return !error;
  } catch {
    return false;
  }
}

export async function countRemoteApplications(jobId) {
  const sb = await getClient();
  if (!sb) return null;
  try {
    const { count, error } = await sb.from("applications").select("id", { count: "exact", head: true }).eq("job_id", String(jobId));
    return error ? null : count ?? 0;
  } catch {
    return null;
  }
}

// recruiter console: every application row for one posting, ranked by score.
// local rows (this device) + remote rows (supabase when keyed). offline → local only.
export async function listApplicants(jobId) {
  const out = [];
  try {
    for (const a of loadApplications().filter((x) => String(x.jobId) === String(jobId))) {
      out.push({ student: `${getOrCreateDeviceId()} (this device)`, score: Math.round(a.ats || 0), at: a.at || 0, local: true });
    }
  } catch {
    /* local store unreadable */
  }
  const sb = await getClient();
  if (sb) {
    try {
      const { data, error } = await sb.from("applications").select("student,ats,main,created_at").eq("job_id", String(jobId)).order("main", { ascending: false }).limit(100);
      if (!error && data) {
        for (const r of data) {
          out.push({ student: String(r.student || "unknown"), score: Math.round(r.main ?? r.ats ?? 0), at: r.created_at ? Date.parse(r.created_at) : 0, local: false });
        }
      }
    } catch {
      /* remote optional */
    }
  }
  const seen = new Set();
  return out
    .filter((a) => (seen.has(`${a.student}:${a.score}`) ? false : (seen.add(`${a.student}:${a.score}`), true)))
    .sort((a, b) => b.score - a.score || b.at - a.at);
}

// --- faculty interests (Slice D): local-first ids + best-effort interests table ---

export function loadInterests() {
  return loadJSON(IKEY, []);
}

export function toggleInterest(id) {
  const ids = loadInterests();
  const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
  saveJSON(IKEY, next);
  return next;
}

export async function recordInterest(fdp) {
  const ids = loadInterests();
  if (!ids.includes(fdp.id)) {
    saveJSON(IKEY, [...ids, fdp.id]);
  }
  const sb = await getClient();
  if (!sb) return false;
  try {
    const { error } = await sb.from("interests").insert({
      fdp_id: String(fdp.id), faculty: getOrCreateDeviceId(),
    });
    return !error;
  } catch {
    return false;
  }
}

// --- program enrollments (student side of the collaboration layer) ---
const EKEY = "avsar-enrollments";

export function loadEnrollments() {
  return loadJSON(EKEY, []);
}

export function toggleEnrollment(id) {
  const ids = loadEnrollments();
  const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
  saveJSON(EKEY, next);
  return next;
}

// --- portfolio (Slice F): verified ticks + kudos + shared showcase ---

export function isVerified(skill, earnedSkills = [], github = "") {
  const s = String(skill || "").toLowerCase();
  if (github) return true; // linked proof folder (logbook/drive) = proof of work behind every found skill
  return (earnedSkills || []).map((x) => String(x).toLowerCase()).includes(s);
}

const KGIVEN = "avsar-kudos-given";
const KCOUNT = "avsar-kudos-fallback";

export function hasGivenKudos(id) {
  return loadJSON(KGIVEN, []).includes(id);
}

export function loadKudosFallback(id) {
  return loadJSON(KCOUNT, {})[id] || 0;
}

export async function fetchKudos(id) {
  const sb = await getClient();
  if (!sb) return null;
  try {
    const { count, error } = await sb.from("kudos").select("id", { count: "exact", head: true }).eq("device_id", String(id));
    return error ? null : count ?? 0;
  } catch {
    return null;
  }
}

export async function giveKudos(id) {
  if (hasGivenKudos(id)) return null; // already counted — never double
  const given = loadJSON(KGIVEN, []);
  saveJSON(KGIVEN, [...given, id]);
  const counts = loadJSON(KCOUNT, {});
  counts[id] = (counts[id] || 0) + 1;
  saveJSON(KCOUNT, counts);
  const sb = await getClient();
  if (!sb) return null;
  try {
    const { error } = await sb.from("kudos").insert({ device_id: String(id) });
    return !error;
  } catch {
    return false;
  }
}

// read-only shared profile: best MAIN + application count + kudos, null when unknown/offline
export async function loadSharedShowcase(id) {
  const sb = await getClient();
  if (!sb) return null;
  try {
    const { data } = await sb.from("applications").select("ats,main").eq("student", String(id)).limit(50);
    const kudos = await fetchKudos(id);
    if (!data?.length && !kudos) return null;
    const mains = (data || []).map((a) => a.main ?? a.ats ?? 0);
    return { applications: (data || []).length, bestMain: Math.max(0, ...mains), kudos: kudos ?? 0 };
  } catch {
    return null;
  }
}

// --- live jobs (free keyless JSON APIs, no scraper needed in browser). Cached 6h, seeds survive offline.
// sources: Remotive (existing) + Arbeitnow (https://www.arbeitnow.com/api/job-board-api, no key, CORS-open).
// why not a real scraper here: CORS blocks most boards from the browser, ToS bans it,
// and stage wifi kills headless runs. Terminal-initiated deep runs live in scripts/scrape.mjs.

const LIVE_KEY = "avsar-live-jobs";
const LIVE_TTL = 6 * 3600 * 1000;

const ROLE_HINTS = [
  ["data", ["data", "analyst", "sql", "tableau", "power bi", "scientist", "machine learning", " ai ", "ml "]],
  ["marketing", ["marketing", "seo", "content", "social", "growth", "copywrit", "brand", " ads"]],
  ["sde", ["develop", "engineer", "software", "frontend", "backend", "full-stack", "full stack", "web", "react", "node", "javascript", "python", "mobile", "devops", " qa", "qa "]],
];

// ponytail: unmapped → null → dropped. A wrong-track job in the feed is worse than a missing one.
export function guessRole(text = "") {
  const t = ` ${String(text).toLowerCase()} `;
  for (const [role, hints] of ROLE_HINTS) {
    if (hints.some((h) => t.includes(h))) return role;
  }
  return null;
}

const VOCAB = [...new Set(Object.values(ROLES).flatMap((r) => r.skills))];

export function extractSkills(text = "", vocab = VOCAB) {
  const t = ` ${String(text).toLowerCase().replace(/\s+/g, " ")} `;
  const out = new Set(vocab.filter((v) => t.includes(` ${String(v).toLowerCase()} `)));
  if (t.includes("github")) out.add("git");
  return [...out].slice(0, 6);
}

export function toLiveJobShape(r, i = 0) {
  const text = `${r.title || ""} ${r.category || ""} ${r.description || ""}`;
  const role = guessRole(text);
  if (!role || !r.title) return null;
  return {
    id: `live-${r.id ?? i}`,
    role,
    title: r.title,
    company: r.company_name || "Remote co",
    loc: "Remote",
    type: /full/i.test(r.job_type || "") ? "Full-time" : "Internship",
    skills: extractSkills(text),
    minScore: 45,
    apply: r.url || "#",
    live: true,
  };
}

export function liveCacheAt() {
  return loadJSON(LIVE_KEY, {}).at || 0;
}

// ponytail: strip tags for skill-matching, no DOM needed
function stripHtml(s = "") {
  return String(s).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
}

export function toArbeitJobShape(r, i = 0) {
  const text = `${r.title || ""} ${(r.tags || []).join(" ")} ${stripHtml(r.description || "").slice(0, 600)}`;
  const role = guessRole(text);
  if (!role || !r.title) return null;
  const types = (r.job_types || []).join(" ");
  return {
    id: `arbeit-${r.slug ?? i}`,
    role,
    title: r.title,
    company: r.company_name || "Remote co",
    loc: r.remote ? "Remote" : (r.location || "Remote"),
    type: /full/i.test(types) ? "Full-time" : "Internship",
    skills: extractSkills(text),
    minScore: 45,
    apply: r.url || "#",
    live: true,
  };
}

async function fetchJSON(url, ms = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error("feed down");
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

// profile-aware: her top skill becomes the Remotive search, remote flag filters on-device
export async function listLiveJobs(force = false, profile = null) {
  const readCache = () => loadJSON(LIVE_KEY, {}).jobs || [];
  if (!force) {
    const c = loadJSON(LIVE_KEY, null);
    if (c && Date.now() - c.at < LIVE_TTL && c.jobs?.length) return c.jobs;
  }
  let search = "";
  try {
    const q = queryFromProfile(profile || {}, "developer");
    search = q.search;
    const rem = async () => {
      const data = await fetchJSON(`https://remotive.com/api/remote-jobs?limit=20${search ? `&search=${encodeURIComponent(search)}` : ""}`);
      return (data.jobs || []).map(toLiveJobShape).filter(Boolean);
    };
    const arb = async () => {
      const data = await fetchJSON("https://www.arbeitnow.com/api/job-board-api");
      return (data.data || []).slice(0, 30).map(toArbeitJobShape).filter(Boolean)
        .filter((j) => !search || `${j.title} ${j.skills.join(" ")}`.toLowerCase().includes(search.toLowerCase()) || j.loc === "Remote");
    };
    const [a, b] = await Promise.allSettled([rem(), arb()]);
    const seen = new Set();
    const jobs = [...(a.status === "fulfilled" ? a.value : []), ...(b.status === "fulfilled" ? b.value : [])]
      .filter((j) => (seen.has(j.id) ? false : (seen.add(j.id), true)));
    if (jobs.length) saveJSON(LIVE_KEY, { at: Date.now(), jobs });
    return jobs.length ? jobs : readCache();
  } catch {
    return readCache();
  }
}
