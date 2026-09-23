// ponytail: static banks are the rubric base — offline, instant, testable.
// AI customs (gemini.generateQuestions) layer on top; bank answers + AI answers
// compile to the same evidence shape for the ATS engine.
// Schema: { id, text, type: choice|yesno|text|url, options?, showIf: {id,value}? }
// One bank per scoring lane (see lib/track.js): ayush on the ayurveda portal,
// sde/data/marketing/govt on the tech portal.
import { AYUSH_QUESTIONNAIRE } from "../ayush/seed.js";

// shared spine of the tech banks: who you are, what is live, what you claim.
const COMMON = [
  { id: "level", text: "How would you describe yourself?", type: "choice", options: ["Fresher", "1-2 years", "3+ years"] },
  { id: "live", text: "Is any of your work live on the internet?", type: "yesno" },
  { id: "live-url", text: "Paste the live URL (or repo link)", type: "url", showIf: { id: "live", value: "yes" } },
  { id: "users", text: "How many people use it? (a number, or 'just me')", type: "text", showIf: { id: "live", value: "yes" } },
  { id: "top-skills", text: "Your top 3 skills, comma separated", type: "text" },
];

export const QUESTIONNAIRE = {
  ayush: [
    ...AYUSH_QUESTIONNAIRE,
    { id: "logbook", text: "Do you maintain a case logbook or e-logbook?", type: "yesno" },
    { id: "logbook-count", text: "Roughly how many cases logged so far?", type: "text", showIf: { id: "logbook", value: "yes" } },
    { id: "posting", text: "Have your postings appeared anywhere public (college site, retreat page)?", type: "yesno" },
    { id: "posting-url", text: "Paste the posting link", type: "url", showIf: { id: "posting", value: "yes" } },
  ],
  sde: [
    ...COMMON,
    { id: "deploy", text: "Have you deployed anything yourself (Vercel, VPS, Play Store)?", type: "yesno" },
    { id: "deploy-what", text: "What did you deploy, and where?", type: "text", showIf: { id: "deploy", value: "yes" } },
  ],
  data: [
    ...COMMON,
    { id: "dataset", text: "Have you worked with a real dataset (not coursework)?", type: "yesno" },
    { id: "dataset-what", text: "What dataset, and what did you find?", type: "text", showIf: { id: "dataset", value: "yes" } },
  ],
  marketing: [
    ...COMMON,
    { id: "campaign", text: "Have you run anything that got real views/clicks?", type: "yesno" },
    { id: "campaign-what", text: "What was it, and what numbers did it do?", type: "text", showIf: { id: "campaign", value: "yes" } },
  ],
  govt: [
    { id: "level", text: "How would you describe yourself?", type: "choice", options: ["Just started", "6-12 months in", "Giving mocks", "Mains stage"] },
    { id: "mocks", text: "Are you giving regular mock tests?", type: "yesno" },
    { id: "mock-score", text: "Your average mock score / percentile?", type: "text", showIf: { id: "mocks", value: "yes" } },
    { id: "top-skills", text: "Your 3 strongest subjects, comma separated", type: "text" },
  ],
};
