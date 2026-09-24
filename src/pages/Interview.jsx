// Interview: prove experience first, then practice answers with grading.
// AI-first, never AI-gated: the evidence questionnaire and the 5 practice
// questions generate from YOUR resume + lane when a key is configured, and
// every AI call falls back to the offline bank/heuristic on any failure.
// Offline or keyless devices get the exact same screens, bank-driven.
import { useEffect, useMemo, useRef, useState } from "react";
import CIcon from "@coreui/icons-react";
import { cilMic } from "@coreui/icons";
import { Page, Card, H2, Btn, Field, Chip, Empty, inputCls } from "../components/ui.jsx";
import { useAvsar } from "../app/store.jsx";
import { QUESTIONNAIRE } from "../data/questionnaire.js";
import { visibleQuestions, compileEvidence, loadQAnswers, saveQAnswers } from "../lib/questionnaire.js";
import { scoreAnswer } from "../lib/interview.js";
import { recordDay } from "../lib/progress.js";
import { isVoiceSupported, listenOnce } from "../lib/speech.js";
import { saveJSON } from "../lib/storage.js";
import { ROLES } from "../lib/score.js";
import { loadProfile } from "../lib/profile.js";
import { hasAIKey } from "../lib/ai.js";
import { genQuestionnaire, genInterviewQs, gradeAnswerAI } from "../lib/aiQuestions.js";

const STAR_QS = [
  "Tell me about a project you built end to end.",
  "Describe a bug or problem that took real effort to fix.",
  "Tell me about a time you had to learn something fast.",
  "Describe working with someone difficult or a tight deadline.",
  "Why should we hire you for this track?",
];

function profileLineFor(lane, p = {}) {
  const parts = lane === "ayush"
    ? [p.year, p.lane && `${p.lane} lane`, p.college, p.goal && `goal: ${p.goal}`]
    : [p.track, p.loc, p.hours && `${p.hours} hrs/week`, p.goal && `goal: ${p.goal}`];
  return parts.filter(Boolean).join(", ");
}

export default function Interview() {
  const { lane, resume } = useAvsar();
  const alive = useRef(true);
  const [answers, setAnswers] = useState(() => loadQAnswers(lane));
  const [qa, setQa] = useState(["", "", "", "", ""]);
  const [grades, setGrades] = useState([null, null, null, null, null]);
  const [grading, setGrading] = useState(-1);
  const [listening, setListening] = useState(-1);
  // AI resolutions land here; render derives bank fallbacks below, so effects
  // never setState synchronously (no cascading renders, no content flash).
  const [qnrAi, setQnrAi] = useState(null);
  const [qsAi, setQsAi] = useState(null);
  const [notice, setNotice] = useState("");
  useEffect(() => () => { alive.current = false; }, []);

  const profile = useMemo(() => loadProfile() || {}, []);
  const profileLine = useMemo(() => profileLineFor(lane, profile), [lane, profile]);
  const keyed = hasAIKey();
  const resumeText = resume?.text?.trim() || "";

  const bank = QUESTIONNAIRE[lane] || QUESTIONNAIRE.sde || [];
  const qnr = qnrAi && qnrAi.lane === lane ? { source: "ai", items: qnrAi.items } : { source: "bank", items: bank };
  const qnrLoading = keyed && Boolean(resumeText) && !(qnrAi && qnrAi.lane === lane);
  const questions = qsAi && qsAi.lane === lane ? qsAi.items : STAR_QS;
  const qsLoading = keyed && !(qsAi && qsAi.lane === lane);

  // Evidence questionnaire: AI from the resume when possible, bank otherwise.
  // One attempt per lane+resume — any failure lands on the bank, never a spinner.
  useEffect(() => {
    let cancelled = false;
    if (!keyed || !resumeText) return;
    genQuestionnaire(resumeText, lane)
      .then((ai) => {
        if (cancelled || !alive.current) return;
        if (ai && ai.length >= 3) setQnrAi({ lane, items: ai });
      })
      .catch(() => { /* bank already renders */ });
    return () => { cancelled = true; };
  }, [lane, resumeText, keyed]);

  // Practice questions: AI from resume+profile when keyed, STAR bank otherwise.
  useEffect(() => {
    let cancelled = false;
    if (!keyed) return;
    genInterviewQs(resumeText, lane, profileLine)
      .then((ai) => {
        if (cancelled || !alive.current) return;
        if (ai && ai.length >= 3) setQsAi({ lane, items: ai.slice(0, 5) });
      })
      .catch(() => { /* STAR bank already renders */ });
    return () => { cancelled = true; };
  }, [lane, resumeText, profileLine, keyed]);

  const visible = useMemo(() => visibleQuestions(qnr.items, answers), [qnr.items, answers]);
  const evidence = useMemo(() => compileEvidence(answers), [answers]);
  const gradedCount = grades.filter(Boolean).length;

  function setAns(id, v) {
    setAnswers((prev) => {
      const next = { ...prev, [id]: v };
      saveQAnswers(lane, next);
      return next;
    });
  }

  async function gradeOne(i) {
    if (!qa[i].trim() || grades[i] !== null || grading !== -1) return;
    setGrading(i);
    setNotice("");
    let g = null;
    if (keyed) {
      const ai = await gradeAnswerAI(questions[i], qa[i], profileLine, lane).catch(() => null);
      if (ai !== null && ai !== undefined) {
        g = { score: ai, ai: true, tips: ai < 3 ? ["Add a concrete example with a number."] : [] };
      }
    }
    if (!g) {
      const h = scoreAnswer(qa[i]);
      g = { score: Math.max(0, h.micro - 1), ai: false, tips: h.tips.slice(0, 1) };
    }
    if (!alive.current) return;
    setGrades((prev) => { const n = [...prev]; n[i] = g; return n; });
    setGrading(-1);
  }

  function finish() {
    const done = grades.filter(Boolean);
    if (!done.length) return;
    const avg = done.reduce((a, g) => a + g.score, 0) / done.length;
    saveJSON("avsar-interview-best", Math.round(avg * 25));
    recordDay("interview");
    setNotice(`Saved: interview best ${Math.round(avg * 25)} from ${done.length} graded answer${done.length === 1 ? "" : "s"}.`);
  }

  async function dictate(i) {
    if (!isVoiceSupported()) return;
    setListening(i);
    try {
      const text = await listenOnce();
      setQa((prev) => { const n = [...prev]; n[i] = (n[i] ? n[i] + " " : "") + text; return n; });
    } catch {
      // user stopped or timed out, typed text stands
    }
    setListening(-1);
  }

  return (
    <Page title="Interview" kicker="Step 03 · Prove" sub="Prove your experience first, then practice answers with grading. AI reads your resume when a key is set — otherwise the offline bank does.">
      <Card>
        <div className="mb-3 flex items-center justify-between gap-2">
          <H2 className="mb-0">Evidence questionnaire ({ROLES[lane]?.label || lane})</H2>
          <Chip tone={qnr?.source === "ai" ? "green" : "amber"}>{qnr?.source === "ai" ? "AI questions" : "offline bank"}</Chip>
        </div>
        {!qnrLoading ? (
          <Empty title="Reading your resume" body="Writing evidence questions from your lines…" />
        ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {visible.map((q) => (
            <Field key={q.id} label={q.text}>
              {q.type === "choice" && (
                <select className={inputCls} value={answers[q.id] || ""} onChange={(e) => setAns(q.id, e.target.value)}>
                  <option value="">Choose</option>
                  {q.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              )}
              {q.type === "yesno" && (
                <select className={inputCls} value={answers[q.id] || ""} onChange={(e) => setAns(q.id, e.target.value)}>
                  <option value="">Choose</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              )}
              {(q.type === "text" || q.type === "url") && (
                <input className={inputCls} value={answers[q.id] || ""} onChange={(e) => setAns(q.id, e.target.value)} placeholder={q.type === "url" ? "https://" : "Your answer"} />
              )}
            </Field>
          ))}
        </div>
        )}
        {keyed && !resume && (
          <p className="mt-3 text-xs leading-5 text-zinc-500">Score a resume and these questions rewrite themselves around it.</p>
        )}
        {(evidence.claims.length > 0 || evidence.linkedProjects.length > 0 || evidence.level) && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {evidence.level && <Chip tone="blue">{evidence.level}</Chip>}
            {evidence.claims.map((c) => <Chip key={c} tone="green">{c}</Chip>)}
            {evidence.linkedProjects.map((u) => (
              <a key={u} className="text-xs font-medium text-blurple-soft underline" href={u} target="_blank" rel="noreferrer">proof link</a>
            ))}
          </div>
        )}
      </Card>

      <Card className="mt-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <H2 className="mb-0">Practice: 5 questions, graded one by one</H2>
          <Chip tone={keyed ? "green" : "amber"}>{keyed ? "AI grading" : "offline grading"}</Chip>
        </div>
        {qsLoading ? (
          <Empty title="Writing your questions" body="Reading your resume, lane, and goal…" />
        ) : (
        <>
        {questions.map((q, i) => (
          <div key={i} className="mb-4">
            <Field label={`${i + 1}. ${q}`}>
              <textarea
                className={`${inputCls} min-h-20 text-sm`}
                value={qa[i]}
                onChange={(e) => setQa((prev) => { const n = [...prev]; n[i] = e.target.value; return n; })}
                placeholder={lane === "ayush" ? "Answer like you would speak it. One example, one number." : "Situation, task, action, result. Include one number."}
              />
            </Field>
            <div className="mt-1.5 flex items-center gap-3">
              {isVoiceSupported() && (
                <button type="button" className="text-xs font-medium text-blurple-soft underline" onClick={() => dictate(i)} disabled={listening === i}>
                  {listening === i ? "Listening, speak now" : "Dictate instead of typing"}
                </button>
              )}
              {grades[i] === null ? (
                <button
                  type="button"
                  onClick={() => gradeOne(i)}
                  disabled={!qa[i].trim() || grading !== -1}
                  className="text-xs font-semibold text-blurple-soft underline underline-offset-4 disabled:text-zinc-600"
                >
                  {grading === i ? "Grading…" : "Grade this answer"}
                </button>
              ) : (
                <span className="text-xs text-zinc-400">
                  {grades[i].score}/4{grades[i].ai ? " · AI" : " · offline"}{grades[i].tips[0] ? ` — ${grades[i].tips[0]}` : " — strong."}
                </span>
              )}
            </div>
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-3">
          <Btn onClick={finish} disabled={gradedCount === 0}>
            Save interview best ({gradedCount}/5 graded)
          </Btn>
          {gradedCount === 0 && <span className="text-xs text-zinc-500">Grade at least one answer to save</span>}
        </div>
        </>
        )}
        {notice && <p className="mt-3 text-sm text-zinc-400" role="status">{notice}</p>}
      </Card>

      {!resume && (
        <div className="mt-4">
          <Empty title="Scores make practice personal" body="Answer the questionnaire and practice above without an account. Scoring a resume connects it all." action={<Btn to="/resume">Score your resume</Btn>} icon={<CIcon icon={cilMic} width={20} height={20} />} />
        </div>
      )}
    </Page>
  );
}
