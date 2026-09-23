// ponytail: free links only, removes "where do I learn this?" friction
// c:true = free certificate. hrs = honest hours. kind: cert|course|practice.
// sourcing stays hand-verified (AI invents URLs); profile-driven ranking does the "smart" part offline.
export const COURSES = {
  dravyaguna: [{ t: "Ayurveda Biology: NPTEL (free cert)", u: "https://swayam.gov.in/", c: true, hrs: 20, kind: "cert" }],
  diagnosis: [{ t: "NCISM Competency Modules", u: "https://ncismindia.org/", hrs: 12 }],
  panchakarma: [{ t: "RAV CME: Panchakarma Practice", u: "https://ayush.gov.in/", hrs: 8 }, { t: "Panchakarma procedures: CCRAS video demos (free)", u: "https://www.youtube.com/results?search_query=ccras+panchakarma+procedure", hrs: 3, kind: "practice" }],
  documentation: [{ t: "SHISHIKSHA Case-Sheet Module (NCISM)", u: "https://ncismindia.org/", hrs: 4 }],
  gmp: [{ t: "SWAYAM Pharma Quality (free cert)", u: "https://swayam.gov.in/", c: true, hrs: 15, kind: "cert" }],
  pharmacovigilance: [{ t: "PvPI ADR Reporting Basics", u: "https://www.ipc.gov.in/", hrs: 4 }],
  hims: [{ t: "ABDM Digital Health Basics", u: "https://abdm.gov.in/", hrs: 6 }],
  research: [{ t: "CCRAS Research Orientation", u: "https://www.ccras.nic.in/", hrs: 10 }, { t: "Research methodology for AYUSH scholars (free)", u: "https://swayam.gov.in/", c: true, hrs: 12, kind: "cert" }],
  pharmacy: [{ t: "Bhaishajya Kalpana: SWAYAM", u: "https://swayam.gov.in/", hrs: 15 }],
  sanskrit: [{ t: "Sanskrit for Ayurveda: SWAYAM (free cert)", u: "https://swayam.gov.in/", c: true, hrs: 10, kind: "cert" }],
  shishiksha: [{ t: "Bench-to-Bedside 6-day Module (NCISM)", u: "https://ncismindia.org/", hrs: 6 }],
  anatomy: [{ t: "Rachana Sharira: NCISM modules", u: "https://ncismindia.org/", hrs: 12 }],
  physiology: [{ t: "Kriya Sharira: SWAYAM Ayurveda", u: "https://swayam.gov.in/", hrs: 12 }],
  // tech portal lanes (sde/data/marketing/govt) — ported from the earlier tech build
  javascript: [{ t: "freeCodeCamp JS (free cert)", u: "https://www.freecodecamp.org/learn/javascript-algorithms-and-data-structures/", c: true }, { t: "Namaste JS — YouTube (free)", u: "https://www.youtube.com/playlist?list=PLlasXeu85E9cQ32gLCvAvr9vNaUccPVNP" }],
  react: [{ t: "React Official Tutorial (free)", u: "https://react.dev/learn" }, { t: "NPTEL Modern Web (free cert)", u: "https://swayam.gov.in/", c: true }],
  node: [{ t: "Node.js Crash Course (free)", u: "https://www.youtube.com/watch?v=fBNz5xF-Kx4" }],
  python: [{ t: "Python for Everybody — NPTEL (free cert)", u: "https://swayam.gov.in/", c: true, hrs: 20, kind: "cert" }, { t: "freeCodeCamp Python (free cert)", u: "https://www.freecodecamp.org/learn/scientific-computing-with-python/", c: true, hrs: 12, kind: "cert" }],
  sql: [{ t: "SQLBolt (free, 1 hr)", u: "https://sqlbolt.com/", hrs: 1, kind: "practice" }, { t: "Khan Academy SQL (free)", u: "https://www.khanacademy.org/computing/computer-programming/sql", hrs: 6 }, { t: "HackerRank SQL (free cert)", u: "https://www.hackerrank.com/skills-verification/sql_basic", c: true, hrs: 2, kind: "cert" }],
  git: [{ t: "Git Handbook — GitHub (free)", u: "https://guides.github.com/introduction/git-handbook/" }],
  dsa: [{ t: "Striver A2Z DSA (free)", u: "https://takeuforward.org/strivers-a2z-dsa-course/strivers-a2z-dsa-course-sheet-2/" }, { t: "HackerRank Problem Solving (free cert)", u: "https://www.hackerrank.com/skills-verification/problem_solving_basic", c: true }],
  api: [{ t: "REST APIs — freeCodeCamp (free)", u: "https://www.youtube.com/watch?v=-MTSQjw5DrM" }],
  "power bi": [{ t: "MS Power BI Guided (free)", u: "https://learn.microsoft.com/en-us/training/paths/power-bi-fundamentals/" }],
  tableau: [{ t: "Tableau Free Training", u: "https://www.tableau.com/learn/training" }],
  excel: [{ t: "Excel for Analysts — NPTEL (free cert)", u: "https://swayam.gov.in/", c: true }],
  seo: [{ t: "Ahrefs SEO Course (free cert)", u: "https://ahrefs.com/academy/seo-training-course", c: true }, { t: "Google Digital Garage (free cert)", u: "https://learndigital.withgoogle.com/digitalgarage", c: true }],
  content: [{ t: "Google Digital Garage (free cert)", u: "https://learndigital.withgoogle.com/digitalgarage", c: true }],
  gk: [{ t: "Lucent GK + Affairs (free)", u: "https://www.ssc.gov.in/" }],
  "current affairs": [{ t: "PIB Daily (free, official)", u: "https://pib.gov.in/" }],
  reasoning: [{ t: "Reasoning — Indiabix (free)", u: "https://www.indiabix.com/" }],
  quant: [{ t: "Quant — NPTEL Aptitude (free cert)", u: "https://swayam.gov.in/", c: true }],
  default: [{ t: "SWAYAM Govt Certs (free cert)", u: "https://swayam.gov.in/", c: true }, { t: "NCISM Competency Modules", u: "https://ncismindia.org/" }, { t: "Ministry of Ayush learning resources", u: "https://ayush.gov.in/" }],
};

export function coursesFor(skill) {
  const k = skill.toLowerCase();
  return COURSES[k] || COURSES.default;
}

// ponytail: certificate goal → cert links first, fall back to generic free certs
export function certsFor(skill) {
  const all = coursesFor(skill);
  const certs = all.filter((c) => c.c);
  return certs.length ? certs : COURSES.default.filter((c) => c.c);
}

const HOURS_BUDGET = { "2-4": 4, "5-8": 12, "9+": 999 };

// ponytail: the "AI-smart" ranker with no AI — goal picks the category, hours pick the size.
// goal=certificate → certs first · goal=portfolio/internship → practice first · hours → fits-week first.
// entries without hrs are assumed bite-size and never penalized.
export function recommendFor(skill, profile = {}) {
  const list = [...coursesFor(skill)];
  const budget = HOURS_BUDGET[profile.hours] ?? 999;
  const wantCert = profile.goal === "certificate";
  const wantPractice = profile.goal === "portfolio" || profile.goal === "internship";
  return list
    .map((c, i) => {
      let s = 0;
      if (wantCert && c.c) s -= 10;
      if (wantPractice && (c.kind === "practice" || /project/i.test(c.t))) s -= 10;
      if ((c.hrs ?? 2) > budget) s += 5;
      return { c, s, i };
    })
    .sort((a, b) => (a.s - b.s) || (a.i - b.i))
    .map((x) => x.c);
}

// ponytail: Analyzer-style video recs with zero new URLs — reuse hand-verified
// YouTube links already in COURSES, fall back to generic free certs otherwise.
export function videosFor(skill) {
  return coursesFor(skill).filter((c) => /youtube\.com|youtu\.be/.test(c.u)).slice(0, 2);
}

// ponytail: Analyzer "resume tips + overall score" as deterministic rules over the
// ATS breakdown. No AI, no new copy deck — each tip names the failing dimension,
// in the language of the portal the student is actually on.
const TIPS = {
  ayush: {
    "Skills Match": [/capped at/, "Skills capped by proof volume — add 1 case log with a link instead of more keywords."],
    "Keyword Signal": [/repetition capped/, "Keyword repetition detected — cut repeats, add 1 quantified clinical outcome."],
    "Project Quality": [/0 quantified/, "No numbers on your resume — add 2-3 quantified outcomes (cases, sittings, %)."],
    "Sections & Recency": [/no dates/, "No dates found — add years to education and postings."],
    "Format & Contact": [/no contact/, "Contact block incomplete — email + phone + LinkedIn on line 1."],
    floor: "Foundation stage — 1 herbarium + 1 free cert moves this fastest.",
  },
  tech: {
    "Skills Match": [/capped at/, "Skills capped by proof volume — add 1 project with a link instead of more keywords."],
    "Keyword Signal": [/repetition capped/, "Keyword repetition detected — cut repeats, add 1 quantified outcome."],
    "Project Quality": [/0 quantified/, "No numbers on your resume — add 2-3 quantified outcomes (%, time, users)."],
    "Sections & Recency": [/no dates/, "No dates found — add years to experience and education."],
    "Format & Contact": [/no contact/, "Contact block incomplete — email + phone + GitHub/LinkedIn on line 1."],
    floor: "Foundation stage — 1 project + 1 free cert moves this fastest.",
  },
};

export function resumeTips(result = {}, lane = "ayush") {
  const copy = lane === "ayush" ? TIPS.ayush : TIPS.tech;
  const tips = [];
  const bd = Object.fromEntries((result.breakdown || []).map((b) => [b.label, b]));
  for (const [label, [re, tip]] of Object.entries(copy)) {
    if (label === "floor") continue;
    if ((bd[label]?.why || []).some((w) => re.test(w))) tips.push(tip);
  }
  if ((result.total ?? 0) > 0 && (result.total ?? 0) < 45) tips.push(copy.floor);
  return tips.slice(0, 4);
}

export const PROJECT_IDEAS = {
  ayush: [
    "20-plant herbarium with latin names + documented uses, photographed",
    "10 anonymized OPD case sheets in NCISM format, reviewed by a mentor",
    "Snehana-Swedana procedure log from 5 supervised sittings",
    "GMP gap note for the college pharmacy unit, 1 page",
    "SHISHIKSHA 6-day orientation checklist, fully signed",
    "Digital e-logbook: 15 cases entered in a spreadsheet template",
  ],
  sde: [
    "Todo API + React frontend, deploy on Vercel, add README with screenshots",
    "Clone Swiggy homepage in React + Tailwind, push to GitHub",
    "URL shortener with Node + SQLite, show API docs",
  ],
  data: [
    "IPL dashboard in Excel/PowerBI with 3 insights + charts",
    "Swiggy orders CSV analysis in Python + 1-page report",
    "SQL project: 10 queries on e-commerce DB, publish on GitHub",
  ],
  marketing: [
    "Run a 7-day meme page campaign, track reach in a sheet",
    "SEO audit of your college site, 2-page fix report",
    "Write 5 LinkedIn posts for a local shop, show engagement",
  ],
  govt: [
    "30-day current-affairs notes + 10 mock tests log",
    "PYQ analysis sheet: last 5 yrs SSC quant topics",
    "Daily 50 reasoning Qs tracker for 21 days",
  ],
  default: [
    "20-plant herbarium with latin names + documented uses",
    "SHISHIKSHA 6-day orientation checklist, fully signed",
  ],
};
