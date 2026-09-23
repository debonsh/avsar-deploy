// ponytail: branching eval + evidence compile for questionnaire answers.
// Pure, tested. AI customs compile through the same shape — bank or AI, same seam.
import { loadJSON, saveJSON } from "./storage.js";
import { hashStr } from "./quests.js";

export function visibleQuestions(bank = [], answers = {}) {
  return bank.filter((q) => {
    if (!q.showIf) return true;
    return answers[q.showIf.id] === q.showIf.value;
  });
}

const URL_RE = /https?:\/\/[^\s)]+/gi;

// answers: { [questionId]: string } → { linkedProjects: [url], claims: [skill], level }
export function compileEvidence(answers = {}) {
  const linked = new Set();
  for (const v of Object.values(answers)) {
    for (const m of String(v || "").matchAll(URL_RE)) linked.add(m[0]);
  }
  const claims = String(answers["top-skills"] || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 8);
  return { linkedProjects: [...linked].slice(0, 6), claims, level: String(answers.level || "") };
}

// AI set cache: keyed by resume hash, LRU-capped — regenerable, never source of truth.
const QCACHE_KEY = "avsar-qgen-cache";
const QCACHE_MAX = 3;

export function qgenKey(text, role, kind) {
  return `${kind}:${role}:${hashStr(String(text || ""))}`;
}

export function loadCachedSet(text, role, kind) {
  const cache = loadJSON(QCACHE_KEY, {});
  const hit = cache[qgenKey(text, role, kind)];
  return Array.isArray(hit) && hit.length ? hit : null;
}

export function saveCachedSet(text, role, kind, items) {
  const cache = loadJSON(QCACHE_KEY, {});
  cache[qgenKey(text, role, kind)] = items;
  const keys = Object.keys(cache);
  for (const k of keys.slice(0, Math.max(0, keys.length - QCACHE_MAX))) delete cache[k];
  saveJSON(QCACHE_KEY, cache);
}

// answers persist per role so scoring can reuse them without re-asking
export function loadQAnswers(role) {
  return loadJSON(`avsar-q-${role}`, {});
}

export function saveQAnswers(role, answers) {
  saveJSON(`avsar-q-${role}`, answers || {});
}
