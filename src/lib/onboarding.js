// ponytail: first-login loop math + question shaping in one pure module.
// progress is Profile 40 / Resume 30 / Interview 30; interview closes it to 100.
// interview questions are built from what the student already told us
// (skills, lane, goal, year) plus resume gaps — AI personalizes further,
// this bank is the offline floor, never a crash.
import { saveJSON } from "./storage.js";
import { TECH_LANES } from "./track.js";

export const ONBOARD_W = { profile: 40, resume: 30, interview: 30 };

export function onboardingProgress({ profileDone, resumeDone, interviewDone } = {}) {
  const profile = profileDone ? ONBOARD_W.profile : 0;
  const resume = resumeDone ? ONBOARD_W.resume : 0;
  const interview = interviewDone ? ONBOARD_W.interview : 0;
  return { profile, resume, interview, total: profile + resume + interview };
}

const LANE_Q = {
  clinical: "A patient walks into OPD with chronic joint pain. Walk me through your examination before you name a treatment.",
  research: "You are assisting a CCRAS trial. What goes into a case record so another researcher could trust it?",
  industry: "A batch of churnam fails a GMP check. What do you look at first, and what do you document?",
  exploring: "OPD, research, and industry all need documentation. Show me what a good one-page case note looks like.",
};

const GOAL_Q = {
  internship: "Why should a hospital pick you as an intern over a classmate with the same marks?",
  upskill: "Which one skill, if proven this month, would change your applications most — and how will you prove it?",
  certificate: "Which certificate are you chasing, and what will you be able to DO the day after you earn it?",
  portfolio: "Pick one case or project you would showcase to a hospital. Present it in four lines.",
};

function skillQ(skill, year) {
  const junior = /1st|2nd/.test(year || "");
  return junior
    ? `You listed ${skill}. Explain it like you would to a first-year junior — one definition, one example.`
    : `You listed ${skill}. Describe a real moment you used it — where, on whom or what, and what happened.`;
}

// 5 questions, always: 2 from claimed skills, 1 lane, 1 goal, 1 gap-or-year.
// The offline bank speaks the portal's language: clinical voice for ayush,
// engineering voice for tech. AI personalizes further when keyed.
const TECH_LANE_Q = {
  sde: "You shipped a feature and users report it is slow. Walk me through how you find the bottleneck.",
  data: "You hand a dashboard to a manager and they do not trust the numbers. What do you check first?",
  marketing: "A campaign's click rate halves overnight. What do you look at first, and what do you change?",
  govt: "A mock-test score drops two weeks before the exam. How do you diagnose the weak section and fix it?",
};

const TECH_GOAL_Q = {
  internship: "Why should a team pick you as an intern over a classmate with the same marks?",
  upskill: "Which one skill, if proven this month, would change your applications most — and how will you prove it?",
  certificate: "Which certificate are you chasing, and what will you be able to DO the day after you earn it?",
  portfolio: "Pick one project you would showcase to a recruiter. Present it in four lines.",
};
export function questionsFromProfile(p = {}, resume = {}) {
  const skills = String(p.skills || "").split(",").map((s) => s.trim()).filter(Boolean);
  const missing = (resume?.missing || []).slice(0, 3);
  const isTech = TECH_LANES.includes(p.track);
  const laneQ = isTech ? TECH_LANE_Q[p.track] || TECH_LANE_Q.sde : LANE_Q[p.lane] || LANE_Q.exploring;
  const goalQ = isTech ? TECH_GOAL_Q[p.goal] || TECH_GOAL_Q.internship : GOAL_Q[p.goal] || GOAL_Q.internship;
  const fallbackSkill = isTech ? "a project you built" : "diagnosis";
  const fallbackGap = isTech ? "git" : "panchakarma";
  const out = [
    skillQ(skills[0] || fallbackSkill, p.year),
    skills[1]
      ? skillQ(skills[1], p.year)
      : `Your resume does not show ${missing[0] || fallbackGap} yet. What do you know about it today, honestly?`,
    laneQ,
    goalQ,
    missing[0]
      ? `Employers ask for ${missing[0]} and it is missing from your resume. How would you start learning it this week?`
      : isTech
        ? `You are on the ${p.track || "sde"} track. What does a readiness score of 100 look like for you, in your own words?`
        : `You are ${p.year || "a BAMS student"}. What does a readiness score of 100 look like for you, in your own words?`,
  ];
  return out.slice(0, 5);
}

// --- Unified front-door router -------------------------------------------
// One landing question routes newcomers to exactly one portal. Pure + tested —
// the Welcome page renders ROUTER_QS, calls recommendTrack, and asks for a
// confirm tap. "Something else" returns "undecided" so the user picks manually.
export const ROUTER_QS = [
  {
    id: "who",
    q: "AYUSH or Tech — where do you belong?",
    opts: [
      { id: "ayush", label: "AYUSH / Vaidya", hint: "BAMS·BSMS students, clinic, rotations, herbal pharma, research.", track: "ayush" },
      { id: "tech", label: "Tech / engineering / data", hint: "Code, dashboards, campaigns, govt prep.", track: "tech" },
      { id: "other", label: "Something else / just exploring", hint: "Pick a side after seeing both.", track: null },
    ],
  },
];

export function recommendTrack(answers = {}) {
  const q = ROUTER_QS[0];
  const opt = q.opts.find((o) => o.id === answers[q.id]);
  if (!opt || !opt.track) return { track: "undecided" };
  return { track: opt.track };
}

// test-drive reset: wipes every key the loop writes, so a fresh walkthrough
// starts at 0%. Device id and job pipeline are left alone.
const RESET_KEYS = [
  "avsar-profile-v1", "avsar-resume-v1", "avsar-interview-best", "avsar-onboarded-v1",
  "avsar-ai-memo", "avsar-q-ayush", "avsar-qgen-cache", "avsar-progress-v1",
];
export function resetOnboarding() {
  for (const k of RESET_KEYS) {
    try { saveJSON(k, null); } catch { /* private mode */ }
    try { localStorage.removeItem(k); } catch { /* node --test */ }
  }
}

// AI grade responses are free text — accept a lone 0-4 anywhere, else null.
export function parseAiGrade(raw) {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") return raw >= 0 && raw <= 4 ? Math.round(raw) : null;
  const m = String(raw).match(/(?:^|\D)([0-4])(?:\D|$)/);
  return m ? Number(m[1]) : null;
}
