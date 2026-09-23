// [ayush] proof ledger. bams students don't live on github, so verification
// runs on five clinical paths: supervised case logs, mentor sign-off,
// certificates, shishiksha orientation, quiz mastery. own localStorage key,
// shared storage helpers reused read-only. rollback: delete src/ayush/.
import { loadJSON, saveJSON } from "../lib/storage.js";

const KEY = "ayush-proof-v1";

// kinds: case-log | mentor | certificate | orientation | quiz
// entry: { id, skill, kind, detail, at }

function empty() {
  return { entries: [] };
}

export function loadLedger() {
  const v = loadJSON(KEY, null);
  if (!v || !Array.isArray(v.entries)) return empty();
  return v;
}

function persist(ledger) {
  saveJSON(KEY, { entries: ledger.entries.slice(-200) });
  return ledger;
}

export function addProof({ skill = "", kind = "case-log", detail = "" } = {}) {
  const ledger = loadLedger();
  const entry = {
    id: `pf-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    skill: String(skill || "").toLowerCase().trim(),
    kind,
    detail: String(detail || "").slice(0, 200),
    at: Date.now(),
  };
  if (!entry.skill) return null;
  ledger.entries.push(entry);
  persist(ledger);
  return entry;
}

export function removeProof(id) {
  const ledger = loadLedger();
  ledger.entries = ledger.entries.filter((e) => e.id !== id);
  persist(ledger);
  return ledger.entries;
}

export function proofsFor(skill = "") {
  const k = String(skill || "").toLowerCase().trim();
  return loadLedger().entries.filter((e) => e.skill === k);
}

export function caseCount(skill = "") {
  return proofsFor(skill).filter((e) => e.kind === "case-log").length;
}

// verified = mentor sign-off, or certificate, or 10+ supervised cases,
// or completed orientation (shishiksha skill only). assessed comes from quiz.
export function verifyState(skill = "", quizBest = 0) {
  const ps = proofsFor(skill);
  const kinds = new Set(ps.map((p) => p.kind));
  const verified =
    kinds.has("mentor") ||
    kinds.has("certificate") ||
    ps.filter((p) => p.kind === "case-log").length >= 10 ||
    (String(skill).toLowerCase() === "shishiksha" && kinds.has("orientation"));
  return {
    verified,
    assessed: Number(quizBest) > 0,
    paths: [...kinds],
    count: ps.length,
  };
}

// 0-100 confidence from paths: mentor 45, certificate 30, orientation 25,
// quiz 15, case-log 2 each (cap 20). claimed alone = 5.
export function skillConfidence(skill = "", quizBest = 0) {
  const ps = proofsFor(skill);
  if (!ps.length && !(Number(quizBest) > 0)) return 0;
  let c = ps.length ? 5 : 0;
  const kinds = new Set(ps.map((p) => p.kind));
  if (kinds.has("mentor")) c += 45;
  if (kinds.has("certificate")) c += 30;
  if (kinds.has("orientation")) c += 25;
  if (Number(quizBest) > 0) c += 15;
  c += Math.min(20, ps.filter((p) => p.kind === "case-log").length * 2);
  return Math.min(100, c);
}

export const PROOF_KINDS = [
  { id: "case-log", label: "case log", hint: "opd/ipd cases seen + supervisor name" },
  { id: "mentor", label: "mentor sign-off", hint: "teacher name who vouches for this skill" },
  { id: "certificate", label: "certificate", hint: "course / cme / program issuer" },
  { id: "orientation", label: "orientation", hint: "shishiksha checklist items" },
  { id: "quiz", label: "quiz", hint: "auto from ai assessment score" },
];
