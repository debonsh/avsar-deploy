// Seeded proof-of-skill challenges, three per lane, so the demo runs with no employer
// account, no network and no setup. Each one is small enough to finish in an evening,
// asks for an artifact a stranger could open and check, and names the checks it looks
// for up front: the candidate should be able to read the rubric before writing a line,
// which is the whole difference between this and an opaque screening step.
export const CHALLENGE_TEMPLATES = [
  {
    id: "chal-ayush-caselog",
    lane: "ayush",
    title: "Document one supervised case, end to end",
    brief:
      "Take one patient you saw under supervision and write the case up the way NCISM expects: presenting complaints, nadi and other examination findings, your diagnosis reasoning, the prescription with dose and anupana, and what you would change next visit. Redact every personal identifier. A shared document is fine.",
    skill: "documentation",
    kind: "case-log",
    checks: ["diagnosis", "prescription", "follow-up", "redact"],
    threshold: 60,
    deadline: null,
    blind: true,
    createdBy: "seed",
  },
  {
    id: "chal-ayush-adr",
    lane: "ayush",
    title: "Write a suspected ADR report to PvPI",
    brief:
      "Pick one suspected adverse reaction to an ASU formulation, real or from a published case, and write the report as it would go to PvPI: the suspect drug and batch, the reaction described in clinical terms, the timeline in hours or days, the seriousness criteria, and the causality assessment you would defend. Say explicitly which details you could not obtain and how you would get them.",
    skill: "pharmacovigilance",
    kind: "write",
    checks: ["suspect drug", "timeline", "seriousness", "causality", "batch"],
    threshold: 65,
    deadline: null,
    blind: true,
    createdBy: "seed",
  },
  {
    id: "chal-ayush-gmp",
    lane: "ayush",
    title: "Audit one GMP section of a herbal manufacturing line",
    brief:
      "Choose one section of Schedule T practice, such as raw material quarantine, in-process checks, or finished goods release, and audit it. Give the requirement, what you observed, the gap, and the corrective action with an owner. Two pages is enough. Name the record or register you would inspect to prove each finding.",
    skill: "gmp",
    kind: "write",
    checks: ["requirement", "observation", "corrective action", "record"],
    threshold: 60,
    deadline: null,
    blind: true,
    createdBy: "seed",
  },
  {
    id: "chal-tech-page",
    lane: "tech",
    title: "Ship one page that survives a slow phone",
    brief:
      "Build a single page that renders a list from a JSON file, with an empty state, a loading state and a failure state shown honestly. It must be usable on a 360px viewport with keyboard only. Post the repository and a live link. In your note, say what you cut and why, and what you would do with a second day.",
    skill: "react",
    kind: "build",
    checks: ["empty state", "loading", "keyboard", "responsive", "readme"],
    threshold: 60,
    deadline: null,
    blind: true,
    createdBy: "seed",
  },
  {
    id: "chal-tech-sql",
    lane: "tech",
    title: "Answer a retention question in SQL",
    brief:
      "Given any public dataset with a user and an event table, answer one retention question of your own choosing. Show the query, the result, and the one decision the number would change. Explain any assumption you had to make about what counts as an active user, and say what you would check before trusting the figure.",
    skill: "sql",
    kind: "build",
    checks: ["query", "assumption", "result", "decision"],
    threshold: 60,
    deadline: null,
    blind: true,
    createdBy: "seed",
  },
  {
    id: "chal-tech-dashboard",
    lane: "tech",
    title: "Turn a spreadsheet into a dashboard someone would act on",
    brief:
      "Take a dataset you already have access to and build three charts that answer three different questions. Each chart needs a title that states its finding, not its axes, and a caption saying what a reader should do differently. Say which chart you would delete first if the page had to load twice as fast.",
    skill: "visualization",
    kind: "build",
    checks: ["three charts", "caption", "finding", "tradeoff"],
    threshold: 60,
    deadline: null,
    blind: true,
    createdBy: "seed",
  },
];

export function templatesForLane(lane = "tech") {
  const want = lane === "ayush" ? "ayush" : "tech";
  return CHALLENGE_TEMPLATES.filter((c) => c.lane === want);
}

export function templateById(id = "") {
  return CHALLENGE_TEMPLATES.find((c) => c.id === String(id)) || null;
}
