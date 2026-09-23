// ponytail: AI asks the questions, banks are the fallback. every generator
// takes resume text, returns bank-shaped items, memoizes by resume hash.
// strict validators reject anything off-contract → caller falls back, never crashes.
import { chat, memoCall } from "./ai.js";
import { parseQuestionSet } from "./gemini.js";
import { parseAiGrade } from "./onboarding.js";

const ctx = (resumeText = "", role = "ayush") =>
  `Role: ${role}\nResume (truncated):\n"""\n${String(resumeText || "").slice(0, 1800)}\n"""`;

// One voice per universe: the vaidya portal prompts in clinical terms, the
// tech portal in engineering terms. A hardcoded BAMS prompt on the tech lane
// is exactly the live bug this avoids — every generator routes through here.
export function voiceFor(role = "ayush") {
  if (role === "ayush") {
    return {
      who: "a BAMS (ayurveda) student",
      probe: "their actual claims, clinical basics (tridosha, dravyaguna, panchakarma, GMP, documentation), and gaps",
      deep: "2 clinical deep-dives, 2 role-knowledge, 1 behavioral",
      proof: "clinical exposure, procedures assisted, documentation, projects, skills with evidence",
    };
  }
  const label = { sde: "software developer", data: "data analyst", marketing: "marketing associate", govt: "govt-exam aspirant" }[role] || "engineering student";
  return {
    who: `a Tier-2/3 Indian college ${label}`,
    probe: "their actual claims, engineering basics (code, systems, data, communication), and gaps",
    deep: "2 technical deep-dives on claimed skills, 2 role-knowledge, 1 behavioral",
    proof: "shipped work, live links, datasets or campaigns touched, skills with evidence",
  };
}

// --- validators (pure, tested) ---

export function parseQuizItems(raw) {
  try {
    if (!raw || typeof raw !== "string") return null;
    const arr = JSON.parse(raw.replace(/```json|```/g, "").trim());
    if (!Array.isArray(arr)) return null;
    const out = [];
    for (const it of arr) {
      const text = String((it && it.text) || "").trim();
      const opts = Array.isArray(it?.opts) ? it.opts.map((o) => String(o).trim()).filter(Boolean).slice(0, 4) : [];
      const ans = Number(it?.ans);
      if (!text || opts.length !== 4 || !(ans >= 0 && ans <= 3)) continue;
      out.push({ text, opts, ans });
      if (out.length >= 12) break;
    }
    return out.length >= 4 ? out : null;
  } catch {
    return null;
  }
}

export function parseInterviewItems(raw) {
  const set = parseQuestionSet(raw);
  if (!set) return null;
  return set.slice(0, 5).map((q) => q.text);
}

export function parseQuestionnaireItems(raw) {
  try {
    if (!raw || typeof raw !== "string") return null;
    const arr = JSON.parse(raw.replace(/```json|```/g, "").trim());
    if (!Array.isArray(arr)) return null;
    const out = [];
    for (const it of arr) {
      const text = String((it && it.text) || "").trim();
      const type = ["choice", "yesno", "text", "url"].includes(it?.type) ? it.type : null;
      if (!text || !type) continue;
      const item = { id: `ai-${out.length}`, text, type };
      if (type === "choice") {
        const options = (Array.isArray(it.options) ? it.options : []).map((o) => String(o).trim()).filter(Boolean).slice(0, 4);
        if (options.length < 2) continue;
        item.options = options;
      }
      out.push(item);
      if (out.length >= 8) break;
    }
    return out.length >= 3 ? out : null;
  } catch {
    return null;
  }
}

// --- generators (network + parse, memoized) ---

export async function genQuizItems(resumeText, role = "ayush", n = 10) {
  const v = voiceFor(role);
  const prompt = `You write a screening quiz for ${v.who} targeting "${role}".
${ctx(resumeText, role)}
Write ${n} multiple-choice questions PERSONALIZED to their resume lines: probe ${v.probe}. Mix recall + scenario.
Return ONLY a JSON array, no prose, no fences: [{"text": "...", "opts": ["a","b","c","d"], "ans": 0}]. ans is the 0-based index of the correct option.`;
  const raw = await memoCall("aigen-quiz", `${role}|${String(resumeText || "").slice(0, 1500)}`, () => chat(prompt, "questions"));
  return parseQuizItems(raw);
}

export async function genInterviewQs(resumeText, role = "ayush", profileLine = "") {
  const v = voiceFor(role);
  const prompt = `You write interview questions for ${v.who} targeting "${role}".
${ctx(resumeText, role)}${profileLine ? `\nStudent profile: ${profileLine}` : ""}
Write 5 questions PERSONALIZED to their resume AND profile: probe a claimed skill, their lane, their goal, and one resume gap. ${v.deep}. Short, spoken-style.
Return ONLY a JSON array, no prose, no fences: [{"text": "...", "dimension": "skill"}].`;
  const raw = await memoCall("aigen-interview", `${role}|${profileLine}|${String(resumeText || "").slice(0, 1500)}`, () => chat(prompt, "interview"));
  return parseInterviewItems(raw);
}

// AI grade for one interview answer, 0-4. Null when offline — caller falls
// back to the keyword heuristic, never blocks the student.
export async function gradeAnswerAI(question, answer, profileLine = "", role = "ayush") {
  if (!String(answer || "").trim()) return null;
  const v = voiceFor(role);
  const bar = role === "ayush"
    ? "0 blank/evasive, 1 vague, 2 partial, 3 solid with an example, 4 clinical + quantified"
    : "0 blank/evasive, 1 vague, 2 partial, 3 solid with an example, 4 technical + quantified";
  const prompt = `You grade ${v.who} interview answer 0-4 (${bar}).${profileLine ? ` Student: ${profileLine}.` : ""}
Question: ${String(question || "").slice(0, 300)}
Answer: ${String(answer || "").slice(0, 800)}
Reply with ONLY the single digit 0, 1, 2, 3, or 4.`;
  const raw = await memoCall("aigrade", `${role}|${question}|${answer}`.slice(0, 1500), () => chat(prompt, "feedback"));
  return parseAiGrade(raw);
}

export async function genQuestionnaire(resumeText, role = "ayush") {
  const v = voiceFor(role);
  const prompt = `You write an evidence questionnaire for ${v.who} targeting "${role}".
${ctx(resumeText, role)}
Write 5 items that extract PROOF: ${v.proof}. Prefer yesno/text/url types; use choice only with 2-4 real options.
Return ONLY a JSON array, no prose, no fences: [{"text": "...", "type": "yesno|text|url|choice", "options": [...]}]. options only for choice.`;
  const raw = await memoCall("aigen-qnr", `${role}|${String(resumeText || "").slice(0, 1500)}`, () => chat(prompt, "questions"));
  return parseQuestionnaireItems(raw);
}
