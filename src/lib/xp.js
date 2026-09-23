// ponytail: XP economy in one pure module. Every countable action pays out;
// levels reuse the vaidya growth arc from the style lock. Sources feed the
// distribution bar on Home. Tested.
import { collectDayDetail } from "./streak.js";

// XP per counted event. Quest ticks pay most (proof-sized work); pipeline
// stages pay for forward motion; practice days pay a little, daily.
export const XP_WEIGHTS = {
  quest: 20,
  quiz: 15,
  interview: 10,
  resume: 10,
  saved: 5,
  applied: 15,
  pipeline: 25,
};

export const XP_SOURCES = [
  { id: "quest", label: "Quests", color: "#1e7a4c" },
  { id: "quiz", label: "Quiz", color: "#f59e0b" },
  { id: "interview", label: "Interview", color: "#0ea5e9" },
  { id: "resume", label: "Resume", color: "#f43f5e" },
  { id: "pipeline", label: "Pipeline", color: "#78716c" },
];

const SOURCE_OF = { quest: "quest", quiz: "quiz", interview: "interview", resume: "resume", saved: "pipeline", applied: "pipeline", pipeline: "pipeline" };

// Beej -> Acharya: thresholds chosen so one focused week (~150 XP) reaches L2.
const LEVELS = [
  { at: 0, name: "Beej" },
  { at: 100, name: "Shishya" },
  { at: 250, name: "Sadhak" },
  { at: 500, name: "Vaidya" },
  { at: 1000, name: "Acharya" },
];

export function levelFor(total = 0) {
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (total >= LEVELS[i].at) idx = i;
  }
  const cur = LEVELS[idx];
  const next = LEVELS[idx + 1] || null;
  return {
    level: idx + 1,
    name: cur.name,
    into: next ? total - cur.at : 0,
    of: next ? next.at - cur.at : 1,
    next: next ? next.name : null,
  };
}

export function collectXP(detail = collectDayDetail()) {
  const bySource = { quest: 0, quiz: 0, interview: 0, resume: 0, pipeline: 0 };
  for (const day of Object.values(detail)) {
    for (const [kind, n] of Object.entries(day.kinds || {})) {
      const src = SOURCE_OF[kind];
      if (!src) continue;
      bySource[src] += (XP_WEIGHTS[kind] || 0) * (Number(n) || 0);
    }
  }
  const total = Object.values(bySource).reduce((a, b) => a + b, 0);
  return { total, bySource, ...levelFor(total) };
}
