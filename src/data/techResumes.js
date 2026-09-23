// Tech-universe sample resumes. Same job as src/ayush/resumes.js: realistic
// texts in the shapes the checker reads (contact line, sections, numbers,
// skills) powering "try a sample" on the Tech portal. One strong, one thin.
export const TECH_RESUMES = [
  {
    id: "aarav",
    label: "aarav · btech, strong sde",
    text: `Aarav Mehta
aarav.mehta22@gmail.com | 98110 22334 | Jaipur, Rajasthan | github.com/aaravm

OBJECTIVE
BTech CS pre-final year student seeking a frontend intern role. Strong in javascript and react with two deployed apps. Working toward node APIs and dsa depth.

EDUCATION
BTech Computer Science, Tier-3 college, Jaipur (2023-2027), CGPA 8.4

PROJECTS
Issue Tracker app (react, node, sql): 200+ issues tracked by 3 college clubs, deployed on Vercel. Cut club coordination time 40%.
Attendance dashboard (python, pandas, sql): cleaned 5,000+ rows, published findings used by the department office.

EXPERIENCE
Frontend Intern, ZetaPay (remote, 2 months): shipped an internal dashboard in react, owned Vercel deploys, added 30 tests.

SKILLS
javascript, react, node, python, git, sql, html, css

CERTIFICATES
Responsive Web Design, freeCodeCamp (2025).`,
  },
  {
    id: "sneha-thin",
    label: "sneha · fresher, thin resume",
    text: `Sneha Kulkarni
sneha.kulkarni01@yahoo.com | Nagpur

OBJECTIVE
To obtain a challenging position in a reputed organization and serve with hard work and sincerity.

EDUCATION
BCom, Nagpur University (2022-2025), 61%

SKILLS
computer knowledge, hardworking, sincere, team player

LANGUAGES
Hindi, English, Marathi`,
  },
];

// What a strong tech resume contains, in the order screeners skim.
// Rendered as the guide on the Resume page; shapes mirror the ATS dimensions.
export const TECH_RESUME_ANATOMY = [
  { section: "Contact line", what: "Name, email, phone, city, GitHub + LinkedIn links.", why: "No contact line is the most common auto-reject; links are what reviewers open first." },
  { section: "Objective (2 lines)", what: "Target role plus your two strongest skills.", why: "A reader decides in 10 seconds whether the rest is worth reading." },
  { section: "Education", what: "Degree, college, years, CGPA or percentage.", why: "Eligibility filters run on degree + year before a human reads on." },
  { section: "Projects", what: "What it does, stack, link, users or numbers.", why: "Numbers are the difference between Aarav (200+ users, 40% faster) and Sneha (one flat line)." },
  { section: "Experience", what: "Role, months, what shipped, measured outcome.", why: "Shipped + measured beats responsible-for every time." },
  { section: "Skills + certificates", what: "Role skills first, then freeCodeCamp / NPTEL / Google certs.", why: "Skills must match the posting words exactly or matching misses them." },
];

// Weak vs strong bullets, lifted from the Sneha (thin) and Aarav (strong) samples.
export const TECH_RESUME_BULLETS = [
  { weak: "To obtain a challenging position in a reputed organization.", strong: "BTech CS pre-final year student seeking a frontend intern role. Strong in javascript and react with two deployed apps.", note: "Name the role you want plus the two skills that qualify you for it." },
  { weak: "Skills: computer knowledge, hardworking.", strong: "Skills: javascript, react, node, python, git, sql, html, css.", note: "Postings match literal skill words. Traits are not skills." },
  { weak: "Worked on college project.", strong: "Issue Tracker app (react, node, sql): 200+ issues tracked by 3 college clubs, deployed on Vercel. Cut coordination time 40%.", note: "Stack, link, users, and one number turn a claim into evidence." },
];

// Per skill: why postings ask for it, and what counts as proof on your resume.
export const TECH_SKILL_WHY = {
  javascript: { why: "Every SDE posting screens on it first.", proof: "A deployed page with real users, linked." },
  react: { why: "Frontend internships filter on it explicitly.", proof: "One React app in production (Vercel link)." },
  node: { why: "Full-stack roles need an API story.", proof: "One REST endpoint serving your frontend, repo linked." },
  python: { why: "Data roles start here.", proof: "A script or notebook that cleaned a real dataset." },
  sql: { why: "Analyst and backend postings both demand it.", proof: "100+ queries on a real dataset, repo linked." },
  git: { why: "Teams assume it; missing it signals no collaboration.", proof: "A repo with branches plus one merged PR." },
  dsa: { why: "Screening rounds are built on it.", proof: "Contest profile or 100+ solved problems, linked." },
  api: { why: "Frontend roles consume them, backend roles build them.", proof: "Fetch + render from a public API, deployed." },
  seo: { why: "Marketing roles rank on it.", proof: "A page you ranked, with before/after traffic." },
  content: { why: "Growth loops need words that convert.", proof: "Two published pieces with view counts." },
  reasoning: { why: "Govt exams weight it heaviest.", proof: "Mock percentile trend, improving." },
  quant: { why: "SSC/Bank cutoffs punish weak quant.", proof: "Timed sectional scores, improving." },
};
