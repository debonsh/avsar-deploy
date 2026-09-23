// ponytail: ATS v2 — transparent rubric, anti-gaming by construction.
// Same resume → same score (pure, deterministic). Scores never come from an LLM;
// AI proposes questions and feedback, this module disposes points.
// Shape matches scoreResume: { total, breakdown[{label,pts,max,why[]}], found, missing, strengths, earned, msg }.
//
// Two rubrics, one engine: the tech portal scores with pure engineering
// signals (the old console behavior), the vaidya portal layers clinical
// verbs + tokens on top. A tech resume never earns points for OPD/panchakarma
// words, and a BAMS resume is read in its own language.
import { ROLES } from "./score.js";

const TECH_VERBS = ["built", "shipped", "launched", "led", "designed", "deployed", "scaled", "optimized", "automated", "owned", "developed", "migrated"];
const AYUSH_VERBS = ["assisted", "treated", "diagnosed", "managed", "documented", "conducted", "supervised", "counselled", "counseled", "prescribed", "examined", "monitored", "performed"];
const STRONG_VERBS = [...TECH_VERBS, ...AYUSH_VERBS];
export { STRONG_VERBS };
export { TECH_VERBS, AYUSH_VERBS };

// ponytail: AI inputs — project-ish lines only (links, verbs, numbers), capped.
// Sending the whole resume wastes tokens; models probe projects, not headers.
export function extractProjectLines(text = "", maxLines = 8, maxChars = 1200, roleKey = "sde") {
  const verbs = roleKey === "ayush" ? STRONG_VERBS : TECH_VERBS;
  const lines = String(text || "").split("\n").map((l) => l.trim()).filter((l) => l.length > 20);
  const scored = [];
  for (const l of lines) {
    let s = 0;
    if (URL_RE.test(l)) s += 3;
    URL_RE.lastIndex = 0;
    if (/\d/.test(l)) s += 2;
    const low = l.toLowerCase();
    if (verbs.some((v) => low.includes(v))) s += 2;
    if (/project|built|app|website|tool|system|dashboard/i.test(l)) s += 1;
    if (roleKey === "ayush" && /case|opd|ipd|patient|internship|clinical|hospital|therapy|sitting|trial/i.test(l)) s += 1;
    if (s > 0) scored.push([s, l]);
  }
  scored.sort((a, b) => b[0] - a[0]);
  let out = "";
  for (const [, l] of scored.slice(0, maxLines)) {
    if ((out + l).length > maxChars) break;
    out += (out ? "\n" : "") + l;
  }
  return out;
}
const TECH_STACK = ["typescript", "javascript", "react", "node", "python", "sql", "docker", "aws", "vercel", "git", "api", "figma", "tailwind", "pandas", "tableau", "excel", "seo", "dsa"];
// clinical depth signals for bams resumes
const AYUSH_STACK = ["opd", "ipd", "panchakarma", "dravyaguna", "gmp", "hims", "case", "ncism", "nabh", "pharmacovigilance", "vaidya", "bams", "shishiksha"];
const HEADERS = ["experience", "project", "education", "skills", "internship", "certifications", "objective"];
const URL_RE = /https?:\/\/[^\s)]+/gi;
const NUM_RE = /\d+%|\d+\+|\(\d+\)|\b\d{4}\b|\b\d+\b/g;
const YEAR_RE = /\b(19|20)\d{2}\b/;

function countHits(text, words) {
  const t = text.toLowerCase();
  return words.filter((w) => t.includes(w.toLowerCase()));
}

function occurrences(text, words) {
  const t = ` ${text.toLowerCase()} `;
  let n = 0;
  for (const w of words) {
    const needle = w.toLowerCase();
    let i = t.indexOf(needle);
    while (i !== -1) { n++; i = t.indexOf(needle, i + needle.length); }
  }
  return n;
}

function distinctMatches(text, res) {
  const found = new Set();
  for (const m of text.matchAll(res)) found.add(m[0]);
  return found.size;
}

export function scoreATS(text = "", roleKey = "sde", opts = {}) {
  const role = ROLES[roleKey] || ROLES.sde;
  const ayush = roleKey === "ayush";
  const verbs = ayush ? STRONG_VERBS : TECH_VERBS;
  const stack = ayush ? [...TECH_STACK, ...AYUSH_STACK] : TECH_STACK;
  const earnedSkills = opts.earnedSkills || [];
  const proofLinks = (opts.proof && opts.proof.linkedProjects) || [];
  const clean = (text || "").trim();
  if (clean.length < 50) {
    return {
      total: 0, breakdown: null, found: [], missing: role.skills,
      strengths: [], earned: earnedSkills,
      msg: "Upload a real resume (or paste text). Too little text to score.",
    };
  }

  // skills merge (quest-earned count, capped so the metric stays bounded)
  const foundSkills = countHits(clean, role.skills);
  const earnedUpper = earnedSkills.slice(0, Math.max(0, role.skills.length - foundSkills.length));
  const merged = [...foundSkills, ...earnedUpper.map((s) => s.toLowerCase())];
  const mergedLower = new Set(merged.map((x) => x.toLowerCase()));

  // D1 — Skills Match (30): claimed skills need project proof — naked keyword
  // lists cap at 8 + project-quality volume. Claims without evidence score low.
  const skillsRaw = Math.round((merged.length / role.skills.length) * 30);

  // D2 — Keyword Signal (15), density-capped: repetition past 4× unique adds nothing
  const foundKw = countHits(clean, role.keywords);
  const totalOcc = occurrences(clean, role.keywords);
  const density = foundKw.length ? totalOcc / foundKw.length : 0;
  const stuffed = density > 4;
  const kwRaw = Math.round((foundKw.length / role.keywords.length) * 15);
  const kwPts = stuffed ? Math.round(kwRaw / 2) : kwRaw;
  const d2 = {
    label: "Keyword Signal", pts: kwPts, max: 15,
    why: [`${foundKw.length}/${role.keywords.length} role keywords: ${foundKw.slice(0, 5).join(", ") || "none"}`],
  };
  if (stuffed) d2.why.push(`density ${density.toFixed(1)}× unique: repetition capped, add proof instead`);

  // D3 — Project Quality (25): links 8 + numbers 6 + verbs 6 + depth 5, quests fold in.
  // Verified links stack past what raw text can earn alone.
  const textLinks = distinctMatches(clean, URL_RE);
  const linkPts = Math.min(8, Math.min(6, textLinks * 3) + Math.min(4, proofLinks.length * 2));
  const numCount = distinctMatches(clean, NUM_RE);
  const numPts = numCount >= 3 ? 6 : numCount >= 1 ? 4 : 0;
  const verbHits = countHits(clean, verbs);
  const verbPts = Math.min(6, verbHits.length * 2);
  const depthHits = countHits(clean, stack);
  const depthPts = Math.min(5, depthHits.length);
  const questBonus = Math.min(8, earnedUpper.length * 2);
  const pqRaw = linkPts + numPts + verbPts + depthPts + questBonus;
  const pqPts = Math.min(25, pqRaw);
  const d3 = {
    label: "Project Quality", pts: pqPts, max: 25,
    why: [
      `links ${textLinks}${proofLinks.length ? ` +${proofLinks.length} verified` : ""} → ${linkPts}/8`,
      `${numCount} quantified outcomes → ${numPts}/6`,
      `${verbHits.length} strong verbs (${verbHits.slice(0, 4).join(", ") || "none"}) → ${verbPts}/6`,
      `${depthHits.length} stack signals → ${depthPts}/5`,
    ],
  };
  if (questBonus) d3.why.push(`${earnedUpper.length} quest-verified pairs → +${questBonus}`);

  // D1 — Skills Match (30), capped by proof volume (needs pqRaw above)
  const skillsCap = 8 + pqRaw;
  const skillsPts = Math.min(skillsRaw, skillsCap);
  const d1 = {
    label: "Skills Match", pts: skillsPts, max: 30,
    why: [`matched ${merged.length}/${role.skills.length}: ${merged.slice(0, 6).join(", ") || "none"}`],
  };
  if (skillsRaw > skillsCap) d1.why.push(ayush
    ? `skills capped at ${skillsCap} by proof volume: add case-log evidence, not keywords`
    : `skills capped at ${skillsCap} by proof volume: add proof links, not keywords`);

  // D4 — Sections & Recency (10)
  const headers = HEADERS.filter((s) => clean.toLowerCase().includes(s)).length;
  const headerPts = Math.min(6, headers * 2);
  const recencyPts = YEAR_RE.test(clean) ? 4 : 0;
  const d4 = {
    label: "Sections & Recency", pts: headerPts + recencyPts, max: 10,
    why: [`${headers}/4 sections (${HEADERS.filter((s) => clean.toLowerCase().includes(s)).join(", ") || "none"})`, recencyPts ? "dated entries present" : "no dates found: add years"],
  };

  // D5 — Format & Contact (10)
  const hasContact = /@|linkedin|github|phone|[0-9]{10}/i.test(clean);
  const contactPts = hasContact ? 5 : 0;
  const lenPts = Math.min(5, Math.floor(clean.length / 500));
  const d5 = {
    label: "Format & Contact", pts: contactPts + lenPts, max: 10,
    why: [hasContact ? "contact line present" : "no contact line: add email/phone", `length ${clean.length} chars → ${lenPts}/5`],
  };

  const breakdown = [d1, d2, d3, d4, d5];
  return {
    total: Math.min(95, breakdown.reduce((a, b) => a + b.pts, 0)),
    breakdown,
    found: merged,
    missing: role.skills.filter((s) => !mergedLower.has(s.toLowerCase())),
    strengths: foundKw,
    earned: earnedSkills,
    msg: "",
  };
}
