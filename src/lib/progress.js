// progress layer: localStorage-backed quest completions + interview streak
// single source of truth for Part 2 gamification
import { QUEST_TREE } from "../data/quests.js";
import { isEvidenceUrl } from "./quests.js";
import { loadJSON, saveJSON } from "./storage.js";

const KEY = "avsar-progress-v1";

function emptyState() {
  return {
    quests: {},          // key: `${role}:${skillId}:${"course"|"project"}` = true
    evidence: {},        // key: `${role}:${skillId}` = proof URL (repo/deploy/sheet/cert)
    questDays: {},       // key: ISO day = ticks that day (feeds the streak heatmap)
    streak: { lastDay: null, count: 0, badges: [] }, // ISO day, day count, badges earned
    interview: {},       // key: `${role}:${dayISO}` = count of Qs answered
  };
}

function load() {
  const s = { ...emptyState(), ...loadJSON(KEY, null) };
  // ponytail: one-time backfill — ticks stored before day-stamping existed get
  // credited today, so past work lights the heatmap instead of vanishing.
  const days = s.questDays || {};
  const keys = Object.keys(s.quests || {});
  if (keys.length > 0 && Object.keys(days).length === 0) {
    days[todayISO()] = keys.length;
    s.questDays = days;
    save(s);
  }
  return s;
}

function save(state) {
  saveJSON(KEY, state);
}

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function yesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getProgress() { return load(); }

// ponytail: one load per render for quest views — N skills × 3 parses → 1.
// Keys match isCourseDone/isProjectDone/getEvidence exactly.
export function questSnapshot() {
  const s = load();
  return { quests: s.quests || {}, evidence: s.evidence || {} };
}

export function isCourseDone(roleKey, skillId) {
  return Boolean(load().quests[`${roleKey}:${skillId}:course`]);
}

export function isProjectDone(roleKey, skillId) {
  return Boolean(load().quests[`${roleKey}:${skillId}:project`]);
}

export function isSkillComplete(roleKey, skillId) {
  const s = load();
  return Boolean(s.quests[`${roleKey}:${skillId}:course`]) &&
         Boolean(s.quests[`${roleKey}:${skillId}:project`]);
}

export function setQuestDone(roleKey, skillId, kind, done) {
  const s = load();
  const k = `${roleKey}:${skillId}:${kind}`;
  if (done) {
    s.quests[k] = true;
    const t = todayISO();
    s.questDays = s.questDays || {};
    s.questDays[t] = (s.questDays[t] || 0) + 1;
  } else delete s.quests[k];
  save(s);
}

// evidence: project half counts toward score only with a proof link (verified vs claimed)
export function getEvidence(roleKey, skillId) {
  return load().evidence[`${roleKey}:${skillId}`] || "";
}

export function setEvidence(roleKey, skillId, url) {
  const s = load();
  const k = `${roleKey}:${skillId}`;
  if ((url || "").trim()) s.evidence[k] = url.trim();
  else delete s.evidence[k];
  save(s);
}

export function branchProgress(roleKey, branch) {
  const total = branch.skills.length * 2;
  let done = 0;
  for (const sk of branch.skills) {
    if (load().quests[`${roleKey}:${sk.id}:course`]) done++;
    if (load().quests[`${roleKey}:${sk.id}:project`]) done++;
  }
  return { done, total };
}

// mock-interview streak: call AFTER grading; bumps streak if lastDay === yesterday, else resets to 1
// ponytail: kind-aware ('interview'|'quiz'), gentle momentum — activeDays set never
// shames; public copy reads "X active days", streak count stays internal for badges
export function recordDay(kind = "interview") {
  const s = load();
  const t = todayISO();
  s.interview[`${kind}:${t}`] = (s.interview[`${kind}:${t}`] || 0) + 1;
  save(s);
}

export function weeklyActive(kind = null) {
  const s = load();
  const days = new Set();
  for (const k of Object.keys(s.interview || {})) {
    if (kind && !k.startsWith(`${kind}:`)) continue;
    const day = k.split(":").slice(-1)[0];
    days.add(day);
  }
  if (s.streak.lastDay) days.add(s.streak.lastDay);
  return days.size;
}

export function bumpStreak(kind = "interview") {
  recordDay(kind);
  const s = load();
  const t = todayISO();
  const y = yesterdayISO();
  if (s.streak.lastDay === t) return s.streak;          // already counted today
  if (s.streak.lastDay === y) s.streak.count += 1;      // continued
  else s.streak.count = 1;                              // broke or first time
  s.streak.lastDay = t;
  if (s.streak.count >= 5 && !s.streak.badges.includes("interview-ready")) {
    s.streak.badges.push("interview-ready");
  }
  if (s.streak.count >= 10 && !s.streak.badges.includes("sharp")) {
    s.streak.badges.push("sharp");
  }
  save(s);
  return s.streak;
}

// ponytail: mastery L0-L3 lite — course(1) + project&evidence(1) + quiz attempted(1). No backend.
export function masteryLevel(roleKey, skillId, quizBest = 0) {
  const s = load();
  let lv = 0;
  if (s.quests[`${roleKey}:${skillId}:course`]) lv++;
  if (s.quests[`${roleKey}:${skillId}:project`] && isEvidenceUrl(s.evidence[`${roleKey}:${skillId}`])) lv++;
  if (quizBest > 0) lv = Math.min(3, lv + 1);
  return Math.min(3, lv);
}

export function getStreak() { return load().streak; }

// returns the set of skill names (lowercased) that have course+project completed for the given role
// Resume re-score merges these into `result.found` so earned skills count as known
// ponytail: project half needs a proof URL — tick without evidence stays "claimed", never lifts score
export function completedSkillIdsForRole(roleKey) {
  const tree = QUEST_TREE[roleKey];
  if (!tree) return [];
  const s = load();
  const ids = [];
  const seen = new Set();
  for (const br of tree.branches) {
    for (const sk of br.skills) {
      const c = s.quests[`${roleKey}:${sk.id}:course`];
      const p = s.quests[`${roleKey}:${sk.id}:project`];
      const ev = s.evidence[`${roleKey}:${sk.id}`];
      if (c && p && isEvidenceUrl(ev) && sk.name) {
        const key = sk.name.toLowerCase();
        if (!seen.has(key)) { seen.add(key); ids.push(key); }
      }
    }
  }
  return ids;
}

export function clearProgress() {
  save(emptyState());
}
