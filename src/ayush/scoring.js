// [ayush] bams-centric scoring overlay. the shared engine (scoreResume,
// calculateMainScore) is reused read-only; this layer reframes outputs for
// vaidya growth and weights the clinical proof ledger. rollback: delete src/ayush/.
import { scoreResume, calculateMainScore } from "../lib/score.js";
import { loadQuizBest } from "../data/quiz.js";
import { verifyState, skillConfidence } from "./proof.js";

// growth stages, seed to acharya
export function vaidyaLevel(readiness = 0) {
  if (readiness >= 80) return { id: "acharya", label: "acharya", hi: "आचार्य", note: "mentor others. your proof speaks." };
  if (readiness >= 65) return { id: "vaidya", label: "vaidya", hi: "वैद्य", note: "clinic-ready. apply broadly." };
  if (readiness >= 50) return { id: "paudha", label: "paudha", hi: "पौधा", note: "growing. one proof away from vaidya." };
  if (readiness >= 30) return { id: "ankur", label: "ankur", hi: "अंकुर", note: "sprouted. log cases, finish orientation." };
  return { id: "beej", label: "beej", hi: "बीज", note: "seed stage. score + first case log." };
}

// suggested proof path per skill family
export function pathForSkill(skill = "") {
  const s = String(skill || "").toLowerCase();
  if (["diagnosis", "panchakarma", "dravyaguna"].includes(s)) return "case-log";
  if (["gmp", "pharmacy", "pharmacovigilance", "research"].includes(s)) return "certificate";
  if (["hims", "documentation", "shishiksha", "sanskrit"].includes(s)) return "orientation";
  return "case-log";
}

// full ayush readout for a resume text. pure except quiz-best read.
export function ayushReadout(resumeText = "") {
  const res = scoreResume(resumeText, "ayush");
  const quizBest = loadQuizBest("ayush");
  const verified = (res.found || []).filter((s) => verifyState(s, quizBest).verified);
  const proofScore = Math.min(100, verified.length * 20);
  const readiness = calculateMainScore(res.total, quizBest, proofScore, "ayush");
  const skills = [...new Set([...(res.found || []), ...(res.missing || [])])].map((s) => ({
    name: s,
    found: (res.found || []).includes(s),
    verified: verified.includes(s),
    confidence: skillConfidence(s, quizBest),
    path: pathForSkill(s),
  }));
  return {
    total: res.total,
    readiness,
    level: vaidyaLevel(readiness),
    quizBest,
    verifiedCount: verified.length,
    skills,
    gaps: (res.missing || []).map((m) => ({ name: m, path: pathForSkill(m) })),
  };
}
