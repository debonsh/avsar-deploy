// Skill Graph taxonomy — the one engine every portal reads.
// Hierarchy: Domain → Role → Skill → Proficiency (L1 Aware … L5 Expert).
// Stored as data, not code: industry proposes new skills, admin approves;
// demand weights recompute from live postings (see lib/match.js). NCrF/NSQF
// mapping per skill is what lets a completed internship translate into
// academic credit under NEP 2020.
import { loadJSON, saveJSON } from "../lib/storage.js";

export const PROFICIENCY = [
  { level: 1, id: "aware", label: "L1 Aware" },
  { level: 2, id: "beginner", label: "L2 Beginner" },
  { level: 3, id: "practitioner", label: "L3 Practitioner" },
  { level: 4, id: "advanced", label: "L4 Advanced" },
  { level: 5, id: "expert", label: "L5 Expert" },
];

export function proficiencyLabel(level = 0) {
  const p = PROFICIENCY.find((x) => x.level === level);
  return p ? p.label : "L0 Unrated";
}

export const DOMAINS = [
  { id: "ayush-clinical", label: "AYUSH Clinical Practice" },
  { id: "ayush-industry", label: "AYUSH Industry & Research" },
  { id: "cs-it", label: "Computer Science & IT" },
  { id: "data", label: "Data & Analytics" },
  { id: "design", label: "Design" },
  { id: "marketing", label: "Marketing" },
  { id: "core-engg", label: "Core Engineering" },
  { id: "soft-skills", label: "Soft Skills & Aptitude" },
];

// halfLifeDays: how fast the skill goes stale without fresh evidence.
// demandWeight: editable multiplier; postings nudge it via match.js recompute.
// nsqf: NSQF/NCrF level the skill maps to (4.5–8 for UG→postgrad band).
export const SKILLS = [
  // AYUSH Clinical Practice
  { id: "diagnosis", name: "Ayurvedic Diagnosis (Nidana)", domain: "ayush-clinical", aliases: ["nidana", "clinical diagnosis"], related: ["panchakarma", "documentation"], halfLifeDays: 730, demandWeight: 1.4, nsqf: 6 },
  { id: "panchakarma", name: "Panchakarma Protocols", domain: "ayush-clinical", aliases: ["panchakarma therapy", "shodhana"], related: ["diagnosis", "pharmacy"], halfLifeDays: 730, demandWeight: 1.3, nsqf: 6 },
  { id: "dravyaguna", name: "Dravyaguna Identification", domain: "ayush-clinical", aliases: ["dravyaguna vigyan", "herb identification", "medicinal plants"], related: ["pharmacy", "gmp"], halfLifeDays: 1095, demandWeight: 1.2, nsqf: 5.5 },
  { id: "sanskrit", name: "Sanskrit for Classical Texts", domain: "ayush-clinical", aliases: ["samhita reading"], related: ["diagnosis"], halfLifeDays: 1825, demandWeight: 0.7, nsqf: 5 },
  { id: "anatomy", name: "Rachana Sharira (Anatomy)", domain: "ayush-clinical", aliases: ["rachana"], related: ["physiology", "diagnosis"], halfLifeDays: 1825, demandWeight: 0.8, nsqf: 5.5 },
  { id: "physiology", name: "Kriya Sharira (Physiology)", domain: "ayush-clinical", aliases: ["kriya"], related: ["anatomy", "diagnosis"], halfLifeDays: 1825, demandWeight: 0.8, nsqf: 5.5 },
  { id: "shishiksha", name: "SHISHIKSHA Orientation", domain: "ayush-clinical", aliases: ["orientation", "ncism orientation"], related: ["documentation"], halfLifeDays: 1825, demandWeight: 0.9, nsqf: 4.5 },

  // AYUSH Industry & Research
  { id: "gmp", name: "GMP for ASU Drugs", domain: "ayush-industry", aliases: ["good manufacturing practice", "asud gmp"], related: ["pharmacy", "pharmacovigilance"], halfLifeDays: 730, demandWeight: 1.3, nsqf: 6 },
  { id: "pharmacovigilance", name: "Pharmacovigilance (ADR Reporting)", domain: "ayush-industry", aliases: ["pvpi", "adr reporting", "pv"], related: ["documentation", "research"], halfLifeDays: 545, demandWeight: 1.4, nsqf: 6.5 },
  { id: "hims", name: "Hospital Information Systems (ABDM)", domain: "ayush-industry", aliases: ["him", "abdm", "digital health records"], related: ["documentation"], halfLifeDays: 545, demandWeight: 1.1, nsqf: 5.5 },
  { id: "research", name: "AYUSH Clinical Trial Documentation", domain: "ayush-industry", aliases: ["clinical research", "gcp", "trial documentation"], related: ["pharmacovigilance", "documentation"], halfLifeDays: 730, demandWeight: 1.3, nsqf: 6.5 },
  { id: "pharmacy", name: "Bhaishajya Kalpana (Ayurvedic Pharmacy)", domain: "ayush-industry", aliases: ["bhaishajya", "formulation"], related: ["dravyaguna", "gmp"], halfLifeDays: 730, demandWeight: 1.2, nsqf: 6 },
  { id: "documentation", name: "Clinical Case-Sheet Documentation", domain: "ayush-industry", aliases: ["case sheets", "medical records", "e-logbook"], related: ["hims", "research"], halfLifeDays: 730, demandWeight: 1.5, nsqf: 5.5 },
  { id: "herbal-qa", name: "Herbal Formulation QA", domain: "ayush-industry", aliases: ["quality assurance", "qa"], related: ["gmp", "pharmacy"], halfLifeDays: 730, demandWeight: 1.1, nsqf: 6 },

  // Computer Science & IT
  { id: "javascript", name: "JavaScript", domain: "cs-it", aliases: ["js", "es6"], related: ["react", "node"], halfLifeDays: 365, demandWeight: 1.2, nsqf: 5.5 },
  { id: "react", name: "React", domain: "cs-it", aliases: ["reactjs", "react.js"], related: ["javascript", "html", "css"], halfLifeDays: 365, demandWeight: 1.2, nsqf: 5.5 },
  { id: "node", name: "Node.js", domain: "cs-it", aliases: ["nodejs", "express"], related: ["javascript", "api"], halfLifeDays: 365, demandWeight: 1, nsqf: 5.5 },
  { id: "python", name: "Python", domain: "cs-it", aliases: ["py"], related: ["sql", "pandas"], halfLifeDays: 545, demandWeight: 1.2, nsqf: 5.5 },
  { id: "git", name: "Git & Version Control", domain: "cs-it", aliases: ["github", "version control"], related: ["javascript"], halfLifeDays: 730, demandWeight: 1, nsqf: 5 },
  { id: "sql", name: "SQL", domain: "cs-it", aliases: ["postgres", "mysql", "databases"], related: ["python", "excel"], halfLifeDays: 730, demandWeight: 1.1, nsqf: 5.5 },
  { id: "dsa", name: "Data Structures & Algorithms", domain: "cs-it", aliases: ["algorithms", "data structures"], related: ["python", "javascript"], halfLifeDays: 730, demandWeight: 1, nsqf: 6 },
  { id: "api", name: "REST API Design", domain: "cs-it", aliases: ["rest", "apis", "rest apis"], related: ["node", "javascript"], halfLifeDays: 545, demandWeight: 1.1, nsqf: 5.5 },
  { id: "html", name: "HTML", domain: "cs-it", aliases: ["html5"], related: ["css", "javascript"], halfLifeDays: 730, demandWeight: 0.9, nsqf: 4.5 },
  { id: "css", name: "CSS", domain: "cs-it", aliases: ["css3", "tailwind"], related: ["html", "react"], halfLifeDays: 545, demandWeight: 0.9, nsqf: 4.5 },

  // Data & Analytics
  { id: "excel", name: "Excel for Analysis", domain: "data", aliases: ["spreadsheets", "sheets"], related: ["statistics", "sql"], halfLifeDays: 730, demandWeight: 1, nsqf: 4.5 },
  { id: "pandas", name: "Pandas", domain: "data", aliases: ["dataframe"], related: ["python", "sql"], halfLifeDays: 545, demandWeight: 1, nsqf: 5.5 },
  { id: "tableau", name: "Tableau", domain: "data", aliases: [], related: ["visualization", "power-bi"], halfLifeDays: 545, demandWeight: 0.9, nsqf: 5 },
  { id: "power-bi", name: "Power BI", domain: "data", aliases: ["powerbi"], related: ["tableau", "visualization"], halfLifeDays: 545, demandWeight: 1, nsqf: 5 },
  { id: "statistics", name: "Applied Statistics", domain: "data", aliases: ["stats", "biostatistics"], related: ["research", "excel"], halfLifeDays: 1095, demandWeight: 1.1, nsqf: 6 },
  { id: "visualization", name: "Data Visualization", domain: "data", aliases: ["dashboards", "charts"], related: ["tableau", "power-bi"], halfLifeDays: 730, demandWeight: 0.9, nsqf: 5 },

  // Design
  { id: "figma", name: "Figma", domain: "design", aliases: [], related: ["ui-design", "prototyping"], halfLifeDays: 545, demandWeight: 1, nsqf: 5 },
  { id: "ui-design", name: "UI Design", domain: "design", aliases: ["ui", "interface design"], related: ["figma", "typography"], halfLifeDays: 730, demandWeight: 0.9, nsqf: 5.5 },
  { id: "ux-research", name: "UX Research", domain: "design", aliases: ["user research", "usability"], related: ["ui-design"], halfLifeDays: 730, demandWeight: 0.8, nsqf: 6 },
  { id: "typography", name: "Typography", domain: "design", aliases: ["type"], related: ["ui-design"], halfLifeDays: 1095, demandWeight: 0.7, nsqf: 5 },
  { id: "prototyping", name: "Prototyping", domain: "design", aliases: ["wireframing"], related: ["figma", "ui-design"], halfLifeDays: 730, demandWeight: 0.8, nsqf: 5 },
  { id: "design-systems", name: "Design Systems", domain: "design", aliases: ["component library"], related: ["ui-design", "figma"], halfLifeDays: 730, demandWeight: 0.8, nsqf: 6 },

  // Marketing
  { id: "seo", name: "SEO", domain: "marketing", aliases: ["search engine optimization"], related: ["content", "analytics"], halfLifeDays: 365, demandWeight: 1, nsqf: 5 },
  { id: "content", name: "Content Writing", domain: "marketing", aliases: ["copywriting", "content marketing"], related: ["seo", "social-media"], halfLifeDays: 730, demandWeight: 1, nsqf: 4.5 },
  { id: "social-media", name: "Social Media Marketing", domain: "marketing", aliases: ["smm", "instagram marketing"], related: ["content", "ads"], halfLifeDays: 365, demandWeight: 0.9, nsqf: 4.5 },
  { id: "analytics", name: "Marketing Analytics", domain: "marketing", aliases: ["growth analytics"], related: ["statistics", "excel"], halfLifeDays: 545, demandWeight: 0.9, nsqf: 5.5 },
  { id: "email", name: "Email Marketing", domain: "marketing", aliases: ["newsletters"], related: ["content"], halfLifeDays: 545, demandWeight: 0.7, nsqf: 4.5 },
  { id: "canva", name: "Canva Design", domain: "marketing", aliases: [], related: ["content", "social-media"], halfLifeDays: 730, demandWeight: 0.7, nsqf: 4 },
  { id: "ads", name: "Paid Ads (Meta/Google)", domain: "marketing", aliases: ["performance marketing", "ppc"], related: ["analytics", "social-media"], halfLifeDays: 365, demandWeight: 0.9, nsqf: 5 },
  { id: "branding", name: "Brand Communication", domain: "marketing", aliases: ["brand"], related: ["content", "presentation"], halfLifeDays: 1095, demandWeight: 0.7, nsqf: 5 },

  // Core Engineering
  { id: "autocad", name: "AutoCAD", domain: "core-engg", aliases: ["cad"], related: ["manufacturing"], halfLifeDays: 730, demandWeight: 0.8, nsqf: 5 },
  { id: "thermodynamics", name: "Thermodynamics", domain: "core-engg", aliases: ["thermal"], related: ["manufacturing"], halfLifeDays: 1825, demandWeight: 0.7, nsqf: 6 },
  { id: "manufacturing", name: "Manufacturing Processes", domain: "core-engg", aliases: ["production"], related: ["quality-control"], halfLifeDays: 1095, demandWeight: 0.8, nsqf: 5.5 },
  { id: "quality-control", name: "Quality Control", domain: "core-engg", aliases: ["qc"], related: ["gmp", "manufacturing"], halfLifeDays: 730, demandWeight: 0.9, nsqf: 5.5 },
  { id: "electronics", name: "Electronics & Circuits", domain: "core-engg", aliases: ["circuits"], related: ["matlab"], halfLifeDays: 1095, demandWeight: 0.7, nsqf: 5.5 },
  { id: "matlab", name: "MATLAB", domain: "core-engg", aliases: [], related: ["python", "statistics"], halfLifeDays: 730, demandWeight: 0.7, nsqf: 5.5 },

  // Soft Skills & Aptitude
  { id: "communication", name: "Communication", domain: "soft-skills", aliases: ["verbal communication"], related: ["presentation", "teamwork"], halfLifeDays: 1825, demandWeight: 1.3, nsqf: 5 },
  { id: "teamwork", name: "Teamwork", domain: "soft-skills", aliases: ["collaboration"], related: ["communication"], halfLifeDays: 1825, demandWeight: 1.1, nsqf: 4.5 },
  { id: "leadership", name: "Leadership", domain: "soft-skills", aliases: [], related: ["teamwork", "communication"], halfLifeDays: 1825, demandWeight: 0.9, nsqf: 5.5 },
  { id: "adaptability", name: "Adaptability", domain: "soft-skills", aliases: [], related: ["teamwork"], halfLifeDays: 1825, demandWeight: 0.9, nsqf: 4.5 },
  { id: "presentation", name: "Presentation Skills", domain: "soft-skills", aliases: ["public speaking"], related: ["communication"], halfLifeDays: 1825, demandWeight: 1, nsqf: 5 },
  { id: "reasoning", name: "Logical Reasoning", domain: "soft-skills", aliases: ["aptitude"], related: ["quant"], halfLifeDays: 1825, demandWeight: 1, nsqf: 5 },
  { id: "quant", name: "Quantitative Aptitude", domain: "soft-skills", aliases: ["maths", "numeracy"], related: ["reasoning", "statistics"], halfLifeDays: 1825, demandWeight: 1, nsqf: 5 },
  { id: "gk", name: "General Knowledge", domain: "soft-skills", aliases: ["general awareness"], related: ["current-affairs"], halfLifeDays: 365, demandWeight: 0.7, nsqf: 4 },
  { id: "current-affairs", name: "Current Affairs", domain: "soft-skills", aliases: ["news"], related: ["gk"], halfLifeDays: 180, demandWeight: 0.7, nsqf: 4 },
  { id: "english", name: "English Language", domain: "soft-skills", aliases: ["english comprehension"], related: ["communication"], halfLifeDays: 1825, demandWeight: 1, nsqf: 4.5 },
  { id: "polity", name: "Indian Polity", domain: "soft-skills", aliases: ["constitution"], related: ["gk"], halfLifeDays: 730, demandWeight: 0.6, nsqf: 4.5 },
  { id: "history", name: "Indian History", domain: "soft-skills", aliases: [], related: ["gk"], halfLifeDays: 1825, demandWeight: 0.6, nsqf: 4.5 },
];

const BY_ID = new Map(SKILLS.map((s) => [s.id, s]));
const BY_ALIAS = new Map();
for (const s of SKILLS) {
  BY_ALIAS.set(s.id.toLowerCase(), s);
  BY_ALIAS.set(s.name.toLowerCase(), s);
  for (const a of s.aliases) BY_ALIAS.set(String(a).toLowerCase(), s);
}

export function skillById(id = "") {
  return BY_ID.get(String(id).toLowerCase()) || null;
}

// name/id/alias → canonical skill. Approved industry proposals resolve too.
export function resolveSkill(name = "") {
  const k = String(name).toLowerCase().trim();
  if (!k) return null;
  if (BY_ALIAS.has(k)) return BY_ALIAS.get(k);
  const approved = approvedSkills().find((s) => s.id === k || s.name.toLowerCase() === k || s.aliases.includes(k));
  return approved || null;
}

export function skillsByDomain(domainId = "") {
  return SKILLS.filter((s) => s.domain === domainId);
}

export function domainLabel(domainId = "") {
  return (DOMAINS.find((d) => d.id === domainId) || {}).label || domainId;
}

// proficiency decay: effective level halves every halfLifeDays without fresh
// evidence. L4 unused for one half-life reads as L2 to the matcher.
export function decayedLevel(skillId = "", level = 0, lastUsedAt = 0, now = Date.now()) {
  const lv = Math.max(0, Math.min(5, Number(level) || 0));
  if (!lv || !lastUsedAt) return lv;
  const half = Math.max(30, skillById(skillId)?.halfLifeDays || 365);
  const ageDays = Math.max(0, (now - lastUsedAt) / 86400000);
  return lv * Math.pow(0.5, ageDays / half);
}

export function demandWeight(skillId = "") {
  return skillById(skillId)?.demandWeight ?? 1;
}

// Roles: each role is a bundle of required skills at target proficiency.
// Job postings default to L3 when they name a skill without a level.
export const DEFAULT_REQUIRED_LEVEL = 3;

export const TAXONOMY_ROLES = {
  "ayush-cra": {
    label: "Clinical Research Associate — Ayush",
    domain: "ayush-industry",
    tags: ["research", "clinical-trials", "pharmacovigilance", "ayush"],
    required: { research: 4, documentation: 4, pharmacovigilance: 4, diagnosis: 3, gmp: 2, hims: 2 },
  },
  "ayush-qa": {
    label: "Herbal Pharma QA (GMP)",
    domain: "ayush-industry",
    tags: ["gmp", "quality", "manufacturing", "ayush"],
    required: { gmp: 4, pharmacy: 3, dravyaguna: 3, documentation: 3, "herbal-qa": 3, pharmacovigilance: 2 },
  },
  "ayush-vaidya": {
    label: "OPD Vaidya (Clinical Practice)",
    domain: "ayush-clinical",
    tags: ["clinical", "opd", "panchakarma", "ayush"],
    required: { diagnosis: 4, panchakarma: 3, documentation: 3, dravyaguna: 3, sanskrit: 2, communication: 3 },
  },
  "ayush-research": {
    label: "AYUSH Research Fellow (CCRAS)",
    domain: "ayush-industry",
    tags: ["research", "ccras", "spark", "ayush"],
    required: { research: 4, statistics: 3, documentation: 4, pharmacovigilance: 2, diagnosis: 2 },
  },
  sde: {
    label: "Software Developer",
    domain: "cs-it",
    tags: ["software", "web", "engineering"],
    required: { javascript: 3, react: 3, node: 2, git: 3, sql: 2, api: 3, html: 3, css: 3, dsa: 2, python: 2 },
  },
  "data-analyst": {
    label: "Data Analyst",
    domain: "data",
    tags: ["data", "dashboards", "analytics"],
    required: { python: 3, sql: 3, excel: 3, pandas: 2, tableau: 2, "power-bi": 2, statistics: 3, visualization: 2 },
  },
  "marketing-associate": {
    label: "Marketing Associate",
    domain: "marketing",
    tags: ["marketing", "growth", "content"],
    required: { seo: 2, content: 3, "social-media": 2, analytics: 2, email: 2, canva: 2, ads: 2, communication: 3 },
  },
  "govt-exams": {
    label: "Govt Exams (SSC/UPSC/Bank)",
    domain: "soft-skills",
    tags: ["government", "exams", "aptitude"],
    required: { gk: 3, "current-affairs": 3, reasoning: 4, quant: 4, english: 3, polity: 3, history: 2 },
  },
};

export function taxonomyRole(roleId = "") {
  return TAXONOMY_ROLES[roleId] || null;
}

export function requiredFor(roleId = "") {
  const r = TAXONOMY_ROLES[roleId];
  if (!r) return [];
  return Object.entries(r.required)
    .map(([skill, level]) => ({ skill, level, name: skillById(skill)?.name || skill }))
    .sort((a, b) => b.level - a.level || (a.skill < b.skill ? -1 : 1));
}

// gap vector: what the target role needs minus what the student verifiably holds.
// held: { [skillId]: level } → [{ skill, need, have, gap }] sorted deepest first.
export function gapVector(roleId = "", held = {}) {
  return requiredFor(roleId)
    .map((r) => {
      const have = Math.max(0, Math.min(5, Number(held[r.skill]) || 0));
      return { ...r, have, gap: Math.max(0, r.level - have) };
    })
    .filter((r) => r.gap > 0)
    .sort((a, b) => b.gap - a.gap || b.level - a.level);
}

// --- taxonomy evolves with industry: propose → admin approves → resolvable ---
const PKEY = "avsar-taxonomy-proposals";
// in-memory mirror so node --test (no localStorage) roundtrips like a browser
let memRows = null;

export function listProposals(status = "") {
  if (memRows === null) {
    const all = loadJSON(PKEY, []);
    memRows = Array.isArray(all) ? all : [];
  }
  return status ? memRows.filter((p) => p.status === status) : memRows;
}

function persistProposals(rows) {
  memRows = rows;
  saveJSON(PKEY, rows);
}

export function proposeSkill({ name = "", domain = "cs-it", by = "industry", nsqf = 5 } = {}) {
  const n = String(name || "").trim();
  if (!n || n.length < 2) return null;
  const rows = listProposals();
  const dupe = resolveSkill(n) || rows.some((p) => p.status === "pending" && p.name.toLowerCase() === n.toLowerCase());
  if (dupe) return null;
  const row = {
    id: `prop-${Date.now()}-${Math.floor(Math.random() * 1e5)}`,
    name: n.slice(0, 60),
    domain: DOMAINS.some((d) => d.id === domain) ? domain : "cs-it",
    by: String(by || "industry").slice(0, 60),
    nsqf: Math.max(4, Math.min(8, Number(nsqf) || 5)),
    status: "pending",
    at: Date.now(),
  };
  persistProposals([...rows, row]);
  return row;
}

export function approveSkill(id = "") {
  const rows = listProposals();
  const hit = rows.find((p) => p.id === id && p.status === "pending");
  if (!hit) return null;
  hit.status = "approved";
  hit.approvedAt = Date.now();
  persistProposals(rows);
  return hit;
}

export function rejectSkill(id = "") {
  const rows = listProposals();
  const hit = rows.find((p) => p.id === id && p.status === "pending");
  if (!hit) return null;
  hit.status = "rejected";
  persistProposals(rows);
  return hit;
}

// approved proposals join the graph as first-class skills (demand weight 1, 1y half-life)
export function approvedSkills() {
  return listProposals("approved").map((p) => ({
    id: p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
    name: p.name,
    domain: p.domain,
    aliases: [],
    related: [],
    halfLifeDays: 365,
    demandWeight: 1,
    nsqf: p.nsqf,
    proposed: true,
  }));
}
