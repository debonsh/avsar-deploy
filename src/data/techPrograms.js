// Tech-universe programs: the Tech portal's side of the Programs page.
// Mirrors src/data/programs.js in shape ({ id, kind, title, provider, hours,
// skills, url, ... }) so the page renders both with one component. Skills must
// be taxonomy ids (checked by tests/portal-split.test.js). Hand-verified
// free/govt sources only — links stay static, never AI-invented.
export const TECH_PROGRAM_KINDS = {
  program: "Learning program",
  workshop: "Workshop",
  mentorship: "Mentorship",
  challenge: "Innovation challenge",
};

export const TECH_PROGRAMS = [
  { id: "tg-web", kind: "program", title: "Responsive Web Design Certification", provider: "freeCodeCamp", hours: 30, skills: ["html", "css", "javascript"], url: "https://www.freecodecamp.org/", cert: true, mode: "Online", note: "Free certificate; the fastest SDE proof pair with a deployed page." },
  { id: "tg-js", kind: "program", title: "JavaScript Algorithms and Data Structures", provider: "freeCodeCamp", hours: 30, skills: ["javascript", "dsa"], url: "https://www.freecodecamp.org/", cert: true, mode: "Online" },
  { id: "tg-react", kind: "program", title: "Frontend Developer (React) Path", provider: "freeCodeCamp", hours: 25, skills: ["react", "api"], url: "https://www.freecodecamp.org/", cert: true, mode: "Online" },
  { id: "tg-python", kind: "program", title: "Programming in Python (Meta)", provider: "SWAYAM / NPTEL", hours: 20, skills: ["python", "dsa"], url: "https://swayam.gov.in/", cert: true, mode: "Online", note: "Free certificate; maps to NCrF credit." },
  { id: "tg-sql", kind: "program", title: "Databases and SQL for Data Science", provider: "NPTEL", hours: 12, skills: ["sql"], url: "https://swayam.gov.in/", cert: true, mode: "Online" },
  { id: "tg-data", kind: "program", title: "Data Analysis with Python", provider: "freeCodeCamp", hours: 20, skills: ["python", "pandas", "visualization"], url: "https://www.freecodecamp.org/", cert: true, mode: "Online" },
  { id: "tg-seo", kind: "program", title: "SEO Fundamentals", provider: "Google Digital Garage", hours: 6, skills: ["seo", "analytics"], url: "https://learndigital.withgoogle.com/", cert: true, mode: "Online" },
  { id: "tg-govt", kind: "program", title: "SSC / Banking Reasoning + Quant Foundation", provider: "SWAYAM", hours: 15, skills: ["reasoning", "quant"], url: "https://swayam.gov.in/", mode: "Online", note: "The gap that unlocks govt-exam shortlists." },
  { id: "ws-git", kind: "workshop", title: "Git & GitHub Hands-on Weekend", provider: "College Coding Club circuit", hours: 6, skills: ["git"], url: "https://docs.github.com/en/get-started", mode: "Hybrid" },
  { id: "ws-mock", kind: "workshop", title: "Mock Interview Weekend (STAR + DSA)", provider: "Placement cell circuit", hours: 4, skills: ["communication", "dsa"], url: "https://www.indiaskills.gov.in/", mode: "In person" },
  { id: "ms-oss", kind: "mentorship", title: "Open-Source First-PR Mentorship", provider: "Community maintainers", hours: 24, skills: ["git", "javascript"], url: "https://goodfirstissues.com/", note: "One merged PR with review comments → verified skill." },
  { id: "ms-data", kind: "mentorship", title: "Dashboard Buddy — Analytics Shadowing", provider: "Placement cell network", hours: 16, skills: ["sql", "tableau"], url: "https://swayam.gov.in/", mode: "Online", note: "Two reviewed dashboards → verified skill." },
  { id: "ch-hack", kind: "challenge", title: "Smart India Hackathon 2026", provider: "Ministry of Education", hours: 36, skills: ["javascript", "presentation", "teamwork"], url: "https://sih.gov.in/", deadline: "annual", note: "Inter-college; finalists demo to ministries." },
  { id: "ch-ds", kind: "challenge", title: "Inter-College Datathon", provider: "NPTEL / Spoken Tutorial", hours: 18, skills: ["python", "statistics", "visualization"], url: "https://spoken-tutorial.org/", mode: "Team of 3" },
];

export function techProgramsFor(skill = "") {
  const k = String(skill).toLowerCase();
  return TECH_PROGRAMS.filter((p) => p.skills.includes(k));
}
