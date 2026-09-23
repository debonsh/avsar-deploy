// ponytail: ONE provider seam, FIVE free models, routed per task.
// Groq first (fast LPU, free, no card), Gemini fallback. No keys → null → offline mode.
// Groq limits are per-organization: extra keys are spares, not extra quota.
// Both providers speak OpenAI-compatible chat completions — plain fetch, zero deps.

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

import { loadJSON, saveJSON } from "./storage.js";
import { hashStr } from "./quests.js";
import { systemPreamble } from "../data/tuning.js";

// one task = one job with its own model, temp, and budget. Hard jobs get 70B,
// chatty jobs get 8B-instant (faster + lighter on rate limits).
export const TASKS = {
  questions: { groq: "openai/gpt-oss-120b", temp: 0.7, maxTokens: 1500 },
  interview: { groq: "openai/gpt-oss-120b", temp: 0.7, maxTokens: 1500 },
  rewrite: { groq: "openai/gpt-oss-120b", temp: 0.6, maxTokens: 1200 },
  feedback: { groq: "openai/gpt-oss-120b", temp: 0.5, maxTokens: 1500 },
  coach: { groq: "openai/gpt-oss-20b", temp: 0.7, maxTokens: 800 },
};

export function modelFor(task) {
  return (TASKS[task] || TASKS.coach).groq;
}

// VITE_GROQ_KEY or VITE_GROQ_KEYS (comma list — first healthy key wins per call)
function groqKeys() {
  const raw = `${import.meta.env?.VITE_GROQ_KEY || ""},${import.meta.env?.VITE_GROQ_KEYS || ""}`;
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

// ponytail: one home for "are we online?" - Groq (either var) or Gemini. Views never sniff env directly.
export function hasAIKey() {
  return groqKeys().length > 0 || Boolean((import.meta.env?.VITE_GEMINI_KEY || "").trim());
}

async function postJSON(url, headers, body, timeoutMs = 20000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) return null; // 429 / dead key / down → caller fails over, never throws
    const data = await res.json().catch(() => null);
    return data?.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function groqChat(prompt, t) {
  const sys = systemPreamble();
  for (const key of groqKeys()) {
    const out = await postJSON(
      GROQ_URL,
      { Authorization: `Bearer ${key}` },
      { model: t.groq, messages: [{ role: "system", content: sys }, { role: "user", content: prompt }], temperature: t.temp, max_tokens: t.maxTokens }
    ).catch(() => null);
    if (out) return out;
  }
  return null;
}

async function geminiChat(prompt, t) {
  const key = (import.meta.env?.VITE_GEMINI_KEY || "").trim();
  if (!key) return null;
  const model = (import.meta.env?.VITE_GEMINI_MODEL || "gemini-2.0-flash").trim();
  return postJSON(
    GEMINI_URL,
    { Authorization: `Bearer ${key}` },
    { model, messages: [{ role: "system", content: systemPreamble() }, { role: "user", content: prompt }], temperature: t.temp, max_tokens: t.maxTokens }
  ).catch(() => null);
}

// the only function views call. Never throws, never bills: null means offline mode.
export async function chat(prompt, task = "coach") {
  const t = TASKS[task] || TASKS.coach;
  return (await groqChat(prompt, t)) ?? (await geminiChat(prompt, t)) ?? null;
}

// ponytail: memoize expensive generations by input hash — repeat visits cost zero
// calls. Same seam as the question-set cache, generalized: rewrite, feedback, coach.
const MEMO_KEY = "avsar-ai-memo";
const MEMO_MAX = 12;
// ponytail: in-memory fallback when localStorage is absent (node --test, SSR)
const memFallback = new Map();

function readMemo() {
  const fromLS = loadJSON(MEMO_KEY, null);
  if (fromLS) return { map: fromLS, persist: true };
  if (!memFallback.has(MEMO_KEY)) memFallback.set(MEMO_KEY, {});
  return { map: memFallback.get(MEMO_KEY), persist: false };
}

function writeMemo(map, persist) {
  const keys = Object.keys(map);
  for (const k of keys.slice(0, Math.max(0, keys.length - MEMO_MAX))) delete map[k];
  if (persist) saveJSON(MEMO_KEY, map);
}

export async function memoCall(namespace, keyText, fn) {
  const key = `${namespace}:${hashStr(String(keyText || ""))}`;
  const { map, persist } = readMemo();
  if (typeof map[key] === "string" && map[key]) return map[key];
  const out = await fn();
  if (out) {
    map[key] = out;
    writeMemo(map, persist);
  }
  return out;
}
