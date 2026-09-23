// All deck content. Single source of truth.
//
// Facts here are traced to the repo, never invented:
//   ATS dimensions + cap ............ src/lib/ats.js
//   MAIN weights + rank bands ....... src/lib/score.js
//   Match weights + band labels ..... src/lib/match.js, src/lib/coach.js
//   Taxonomy size ................... src/data/taxonomy.js
//   Routes .......................... src/app/shell.jsx
//   Business model .................. WINNING-STRATEGY.md (judge Q&A, "Business model?")
//   Competitor positioning .......... WINNING-STRATEGY.md, ABOUT-ME/PRD.md
//   External stats .................. ABOUT-ME/PRD.md (TestGorilla 2025, HackerRank 2025)

export const META = {
  team: "Zencoderss",
  teamId: "{{TEAM_ID}}",
  ideaTitle: "Avsar",
  tagline: "Skills today, opportunities tomorrow",
  psId: "26044",
  psTitle:
    "Portal for Academia - Industry collaboration for Skill Mapping, Internships and Placement",
  theme: "Smart Automation",
  category: "Software",
  org: "Ministry of Ayush — All India Institute of Ayurveda",
  demoUrl: "{{DEMO_URL}}",
  hackathon: "SMART INDIA HACKATHON 2026",
};

// Fields the team must fill before submitting. Reported, never silently shipped.
export const REQUIRED_FIELDS = [
  { key: "teamId", label: "Team ID (copy it from the SIH portal, do not retype)" },
  { key: "demoUrl", label: "Live demo / prototype URL (deployed, not a sleeping free host)" },
];

export const ACCENT_ROTATION = ["navy", "green", "navy", "saffron", "green", "navy"];

// ── Slide 1 ──────────────────────────────────────────────────────────────────
// The user's own title slide puts the event name in the pill and lists the portal
// fields as "Label:- Value". Their pill read 2025 next to a 2026 logo; corrected here.
export const SLIDE_1 = { pill: "SMART INDIA HACKATHON 2026" };

// ── Slide 2 ──────────────────────────────────────────────────────────────────
export const SLIDE_2 = {
  pill: "IDEA TITLE",
  chip: "Proposed Solution",
  oneLiner:
    "Avsar is one portal where an Ayush student finds the exact skills they lack for the role they want, closes each gap with free material and a proof-linked project, and applies to Ayush-sector roles through one tracked pipeline.",
  features: [
    {
      b: "Skill assessment.",
      t: "A resume scan plus a 10-question role questionnaire produce a readiness score across five weighted dimensions, each showing the points earned and why.",
    },
    {
      b: "Skill profile and gaps.",
      t: "Found versus missing skills for a target role, with the gap list ordered by how often that skill appears in live postings.",
    },
    {
      b: "Explainable skill mapping.",
      t: "Roles are matched on a published formula, not a black box. The weights are shown at the foot of this slide.",
    },
    {
      b: "Internships, jobs and learning programs.",
      t: "Industry posts against a minimum readiness bar and lands in the same feed students browse. Every gap ships a free course plus a proof-linked mini-project.",
    },
    {
      b: "Four portals, one engine.",
      t: "Student, academician, industry and institution each get their own surface: FDPs, faculty internships, consultancy and research for academicians; cohort bands and demand-versus-supply analytics for institutions.",
    },
  ],
  uniqueness: [
    {
      b: "Explainable by construction.",
      t: "Every recommendation publishes its weights and its reasons. No unexplained ranking.",
    },
    {
      b: "Verified is not claimed.",
      t: "A self-typed tick counts for nothing. Only a course, a project and an evidence link lift the score, and revocation stays visible.",
    },
    {
      b: "Offline-first.",
      t: "The device is the source of truth. Cut the network and every screen still renders, so a demo can never blank out.",
    },
  ],
  weights: [
    { label: "Skill coverage", value: 0.45, display: "45%" },
    { label: "Proficiency fit", value: 0.25, display: "25%" },
    { label: "Verified ratio", value: 0.15, display: "15%" },
    { label: "Recency of evidence", value: 0.1, display: "10%" },
    { label: "Interest alignment", value: 0.05, display: "5%" },
  ],
};

// ── Slide 3 ──────────────────────────────────────────────────────────────────
export const SLIDE_3 = {
  pill: "TECHNICAL APPROACH",
  stack: [
    { name: "React 19", brand: "61DAFB" },
    { name: "Vite 8", brand: "646CFF" },
    { name: "Tailwind 4", brand: "06B6D4" },
    { name: "Router 8", brand: "CA4245" },
    { name: "Supabase", brand: "3ECF8E" },
    { name: "Postgres", brand: "4169E1" },
    { name: "Groq", brand: "F55036" },
    { name: "Gemini", brand: "4285F4" },
    { name: "PWA / SW", brand: "5A0FC8" },
    { name: "QR + PDF", brand: "0B2A4A" },
  ],
  stackNote:
    "Every dependency is free-tier. The LLM is an upgrade, never a gate: with no key the deterministic path produces the same output.",
  methodology: [
    "177 passing unit tests across 34 suites guard the scoring, matching and verification math.",
    "Pure-function logic layer (src/lib) so the engine is testable without a browser.",
  ],
  shots: [
    { key: "landing", caption: "Front door: Ayush student home" },
    { key: "home", caption: "Student dashboard" },
    { key: "journey", caption: "Skill journey timeline" },
    { key: "resume", caption: "Readiness score, 5 dimensions" },
    { key: "jobs", caption: "Role feed: fit and eligibility" },
    { key: "industry", caption: "Industry post, live in feed" },
  ],
};

// ── Slide 4 ──────────────────────────────────────────────────────────────────
export const SLIDE_4 = {
  pill: "FEASIBILITY AND VIABILITY",
  pillars: [
    {
      h: "Technical",
      rows: [
        "Static SPA plus managed Postgres. No server to operate, no ops burden at a nodal centre.",
        "Scoring, matching and credential signing are pure functions under test.",
        "Six tables and anon REST policies cover the whole lifecycle.",
      ],
    },
    {
      h: "Economic",
      rows: [
        "Zero infrastructure cost to reach the first cohort: free static host plus free database tier.",
        "The pilot unit is one Ayush college and one placement officer, not a state rollout.",
        "Industry shortlisting funds the platform, so students and institutes stay free.",
      ],
    },
    {
      h: "Operational",
      rows: [
        "Maps onto structures that already exist: the NCISM Shishiksha orientation and the rotatory internship.",
        "Every faculty and industry card links out to the official page. Nothing asks anyone to migrate.",
        "The institute dashboard is the placement cell's daily surface, not a report.",
      ],
    },
  ],
  risks: [
    ["Model key missing or rate-limited mid-demo", "Deterministic path renders identical output. AI is an upgrade, never a dependency."],
    ["Database unreachable on venue Wi-Fi", "Seeds render, writes queue locally, a banner reports local mode. Nothing blanks."],
    ["Taxonomy drifts from industry reality", "The taxonomy is data, not code. New sectors and skills are rows, not a release."],
    ["Adoption by people who did not ask for this", "Faculty and industry boards route intent out to official pages instead of demanding migration."],
  ],
  scope:
    "Honest scope: real authentication and row-level security, an in-app resume builder, chat, payments and job scraping are post-SIH. A device ID is the login stand-in today, and this deck says so rather than implying otherwise.",
};

// ── Slide 5 ──────────────────────────────────────────────────────────────────
export const SLIDE_5 = {
  pill: "IMPACT AND BENEFITS",
  metrics: [
    { value: "62", label: "skills across 8 domains, Ayush included" },
    { value: "5", label: "weighted dimensions behind every score" },
    { value: "4", label: "portals running on one skill engine" },
    { value: "24", label: "Ayush roles live in the feed" },
  ],
  beneficiaries: [
    ["Students", "A readiness number that traces to actual resume lines. Each dimension shows points earned out of points available, so the next action is never a guess."],
    ["Industry and hospitals", "Publish a role with a minimum readiness bar and receive a ranked, explainable shortlist instead of an inbox of PDFs."],
    ["Academicians", "Faculty internships, FDPs, consultancy and research on one board, each linking to the official application page."],
    ["Institutions and policymakers", "Cohort bands, share scoring Gold or better, the most common gaps, and a live demand-versus-supply view for the placement cell."],
  ],
  policy:
    "Alignment: NEP 2020 industry-linked learning, and skill levels mappable to NCrF so a completed internship can translate into academic credit. Sector framing follows the Ministry of Ayush statement this idea answers.",
  citations: [
    "85% of employers now use skills-based hiring and 76% use skills tests (TestGorilla, 2025).",
    "Entry-level hiring growth has flattened to +7% against +19% for senior roles (HackerRank, 2025).",
    "India graduates roughly 1.5 crore students a year into a market that cannot yet read their skills.",
  ],
  shots: [
    { key: "institute", caption: "Institute view: cohort bands and live demand versus supply" },
    { key: "portfolio", caption: "Portfolio: verified skills sign a QR-verifiable public credential" },
  ],
};

// ── Slide 6 ──────────────────────────────────────────────────────────────────
export const SLIDE_6 = {
  pill: "RESEARCH AND REFERENCES",
  comparison: {
    columns: ["Capability", "Avsar", "LinkedIn", "NCS", "Internshala", "HackerRank"],
    rows: [
      ["Diagnoses the skill gap for a target role", "yes", "no", "no", "no", "no"],
      ["Closes the gap free, with a proof-linked project", "yes", "no", "no", "no", "no"],
      ["Separates verified skill from self-claimed", "yes", "no", "no", "no", "part"],
      ["Gates a role on a published readiness bar", "yes", "no", "no", "no", "part"],
      ["Faculty portal: FDP, consultancy, research", "yes", "no", "part", "no", "no"],
      ["Institute cohort analytics and gap heatmap", "yes", "part", "no", "no", "part"],
      ["Built for Ayush / Indian System of Medicine", "yes", "no", "no", "no", "no"],
    ],
  },
  comparisonNote:
    "They match on resumes and keywords. We match on a verified proficiency graph and then close the loop: assess, learn, prove, get placed. NCS has no gap engine; Internshala has no verification or faculty portal.",
  references: [
    { t: "SIH 2026 Problem Statement 26044 — Ministry of Ayush, All India Institute of Ayurveda", u: "sih.gov.in" },
    { t: "NCISM — Shishiksha programme, permitted BAMS colleges, rotatory internship", u: "ncismindia.org" },
    { t: "CCRAS — research programmes and fellowships seeded into the portal", u: "ccras.nic.in" },
    { t: "Ministry of Ayush Annual Report — sector benchmarks", u: "ayush.gov.in" },
    { t: "data.gov.in — public datasets for skill and placement baselines", u: "data.gov.in" },
    { t: "NEP 2020 / NCrF — the credit framework skill levels map to", u: "education.gov.in" },
    { t: "TestGorilla 2025 and HackerRank 2025 — the hiring statistics cited on slide 5", u: "cited inline" },
    { t: "Framework documentation (React, Vite, Supabase) — tooling docs, not research", u: "listed separately" },
  ],
  demoNote: "Prototype is deployed and reachable. Open the link rather than reading a screenshot.",
};

export const SLIDES = [
  { n: 1, pill: SLIDE_1.pill },
  { n: 2, pill: SLIDE_2.pill },
  { n: 3, pill: SLIDE_3.pill },
  { n: 4, pill: SLIDE_4.pill },
  { n: 5, pill: SLIDE_5.pill },
  { n: 6, pill: SLIDE_6.pill },
];

const PLACEHOLDER = /\{\{[^}]+\}\}/;

/**
 * Guards the deck against the failure modes the SIH format punishes.
 * `errors` block the build; `unresolved` is reported loudly and written to disk.
 */
export function validate() {
  const errors = [];
  const unresolved = [];

  if (SLIDES.length !== 6) {
    errors.push(`Deck must have exactly 6 slides, found ${SLIDES.length}.`);
  }

  const expected = [
    "SMART INDIA HACKATHON 2026",
    "IDEA TITLE",
    "TECHNICAL APPROACH",
    "FEASIBILITY AND VIABILITY",
    "IMPACT AND BENEFITS",
    "RESEARCH AND REFERENCES",
  ];
  SLIDES.forEach((s, i) => {
    if (s.pill !== expected[i]) {
      errors.push(`Slide ${i + 1} pill must be "${expected[i]}", found "${s.pill}".`);
    }
  });

  if (META.theme !== "Smart Automation") {
    errors.push(`Theme must be copied verbatim as "Smart Automation", found "${META.theme}".`);
  }
  if (META.psId !== "26044") errors.push(`Problem statement id must be 26044, found "${META.psId}".`);

  for (const f of REQUIRED_FIELDS) {
    if (PLACEHOLDER.test(String(META[f.key]))) unresolved.push(f.label);
  }

  // Any other placeholder anywhere in the content is an error, not a warning.
  const walk = (node, path) => {
    if (typeof node === "string") {
      if (PLACEHOLDER.test(node) && !REQUIRED_FIELDS.some((f) => node === META[f.key])) {
        errors.push(`Unresolved placeholder in ${path}: "${node}"`);
      }
      return;
    }
    if (Array.isArray(node)) return node.forEach((v, i) => walk(v, `${path}[${i}]`));
    if (node && typeof node === "object") {
      return Object.entries(node).forEach(([k, v]) => walk(v, `${path}.${k}`));
    }
  };
  walk({ SLIDE_2, SLIDE_3, SLIDE_4, SLIDE_5, SLIDE_6 }, "content");

  if (!SLIDE_6.references.every((r) => r.t && r.u)) {
    errors.push("Every reference must name a source and a location. Named sources only.");
  }
  if (!SLIDE_6.comparison.rows.length) {
    errors.push("Slide 6 must carry an existing-systems comparison table.");
  }
  if (!SLIDE_4.risks.length) {
    errors.push("Slide 4 must name real risks, not only reasons the idea will work.");
  }
  if (!SLIDE_5.metrics.length) {
    errors.push("Slide 5 must carry numbers, not adjectives.");
  }

  return { errors, unresolved };
}
