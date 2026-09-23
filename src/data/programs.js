// Industry learning programs, workshops, mentorships, innovation challenges.
// Hand-verified free/govt sources only — AI invents URLs, so links stay static.
// skills = taxonomy ids the program closes; hours = honest effort estimate.
export const PROGRAM_KINDS = {
  program: "Learning program",
  workshop: "Workshop",
  mentorship: "Mentorship",
  challenge: "Innovation challenge",
};

export const PROGRAMS = [
  { id: "pg-gmp", kind: "program", title: "GMP for ASU Drugs — Certificate Course", provider: "SWAYAM", hours: 15, skills: ["gmp"], url: "https://swayam.gov.in/", cert: true, mode: "Online", note: "Free certificate; maps to NCrF credit." },
  { id: "pg-research", kind: "program", title: "Research Methodology for AYUSH Scholars", provider: "SWAYAM / CCRAS", hours: 12, skills: ["research", "documentation"], url: "https://swayam.gov.in/", cert: true, mode: "Online", note: "Required base for SPARK applicants." },
  { id: "pg-pvpi", kind: "program", title: "Pharmacovigilance: ADR Reporting Basics", provider: "PvPI, IPC Ghaziabad", hours: 4, skills: ["pharmacovigilance"], url: "https://www.ipc.gov.in/", mode: "Online", note: "The gap that unlocks CRA roles." },
  { id: "pg-dravya", kind: "program", title: "Ayurveda Biology (Dravyaguna focus)", provider: "NPTEL", hours: 20, skills: ["dravyaguna"], url: "https://swayam.gov.in/", cert: true, mode: "Online" },
  { id: "pg-hims", kind: "program", title: "ABDM Digital Health Basics", provider: "National Health Authority", hours: 6, skills: ["hims", "documentation"], url: "https://abdm.gov.in/", mode: "Online" },
  { id: "ws-panchakarma", kind: "workshop", title: "Panchakarma Hands-on CME", provider: "Rashtriya Ayurveda Vidyapeeth (RAV)", hours: 8, skills: ["panchakarma"], url: "https://ayush.gov.in/", mode: "In person", deadline: "semester break cohorts" },
  { id: "ws-casesheet", kind: "workshop", title: "NCISM Case-Sheet Writing Clinic", provider: "NCISM", hours: 4, skills: ["documentation"], url: "https://ncismindia.org/", mode: "Hybrid" },
  { id: "ms-ccras", kind: "mentorship", title: "SPARK Mentor Track — UG Research", provider: "CCRAS", hours: 40, skills: ["research", "documentation"], url: "https://ccras.nic.in/", stipend: "₹50,000 studentship", note: "Faculty guide co-signs; completion verifies research." },
  { id: "ms-vaidya", kind: "mentorship", title: "Vaidya-under-tree: Clinical Shadowing", provider: "NABH Hospital Network", hours: 24, skills: ["diagnosis", "panchakarma"], url: "https://ayush.gov.in/", mode: "In person", note: "10 supervised case logs → verified skill." },
  { id: "ch-ayush", kind: "challenge", title: "AYUSH Innovation Challenge 2026", provider: "Ministry of Ayush", hours: 30, skills: ["research", "presentation", "teamwork"], url: "https://ayush.gov.in/", deadline: "annual", note: "Inter-college; finalists present to the ministry." },
  { id: "ch-herbal", kind: "challenge", title: "Herbal Formulation QA Hackathon", provider: "ASU Manufacturers Association", hours: 18, skills: ["gmp", "herbal-qa", "pharmacy"], url: "https://ayush.gov.in/", mode: "Team of 3" },
  { id: "pg-sanskrit", kind: "program", title: "Sanskrit for Ayurveda", provider: "SWAYAM", hours: 10, skills: ["sanskrit"], url: "https://swayam.gov.in/", cert: true, mode: "Online" },
];

export function programsFor(skill = "") {
  const k = String(skill).toLowerCase();
  return PROGRAMS.filter((p) => p.skills.includes(k));
}

export function programsByKind(kind = "") {
  return kind && kind !== "all" ? PROGRAMS.filter((p) => p.kind === kind) : PROGRAMS;
}
