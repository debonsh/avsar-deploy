// The one-brain guidance rule: given loop state, return the single next
// step. Home heroes, NextStep cards, FirstRun strips, and empty-state CTAs
// all read this, so a user who reads nothing but buttons still walks the
// whole loop in order: profile, resume, quests, interview, apply, portfolio.
export const NEXT_ORDER = ["profile", "resume", "quests", "interview", "apply", "portfolio"];

// The 4 public loop steps shown on the FirstRun strip (profile setup lives
// inside Journey, so the strip starts at scoring).
export const LOOP_STEPS = [
  { id: "resume", to: "/resume" },
  { id: "quests", to: "/quests" },
  { id: "interview", to: "/interview" },
  { id: "apply", to: "/jobs" },
];

const STEP_TO = {
  profile: "/journey",
  resume: "/resume",
  quests: "/quests",
  interview: "/interview",
  apply: "/jobs",
  portfolio: "/portfolio",
};

export function nextStep({ profileDone, resumeDone, questsDone, interviewDone, appliedCount } = {}) {
  const first = NEXT_ORDER.find((id) => {
    if (id === "profile") return !profileDone;
    if (id === "resume") return !resumeDone;
    if (id === "quests") return !questsDone;
    if (id === "interview") return !interviewDone;
    if (id === "apply") return !appliedCount;
    return true;
  }) || "portfolio";
  return { id: first, to: STEP_TO[first] };
}
