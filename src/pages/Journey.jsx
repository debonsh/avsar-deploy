// Journey: the first-login loop. Profile (40%) → resume (30%) → interview (30%)
// → congrats + confetti → home dashboard. One calm page per stage, tabs on the
// resume stage link score → quests → interview so nothing feels like a dead end.
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useReducedMotion } from "motion/react";
import CIcon from "@coreui/icons-react";
import { cilChart, cilBook, cilCompass, cilChatBubble, cilBadge, cilArrowRight } from "@coreui/icons";
import { Page, Card, H2, Btn, Field, Chip, Meter, Empty, CountUp, inputCls } from "../components/ui.jsx";
import { useAvsar } from "../app/store.jsx";
import { loadProfile } from "../lib/profile.js";
import { scoreResume, calculateMainScore, normalizeScoreResult, questPairsToProof } from "../lib/score.js";
import { AYUSH_RESUMES, SKILL_WHY } from "../ayush/resumes.js";
import { TECH_RESUMES } from "../data/techResumes.js";
import { coursesFor, resumeTips } from "../data/courses.js";
import { completedSkillIdsForRole } from "../lib/progress.js";
import { loadJSON, saveJSON } from "../lib/storage.js";
import { onboardingProgress, questionsFromProfile, resetOnboarding } from "../lib/onboarding.js";
import { recordDay } from "../lib/progress.js";
import { genInterviewQs, gradeAnswerAI } from "../lib/aiQuestions.js";
import { scoreAnswer } from "../lib/interview.js";
import { hasAIKey } from "../lib/ai.js";

const TABS = [
  { id: "score", label: "Score", icon: cilChart },
  { id: "improve", label: "Improve", icon: cilBook },
  { id: "quests", label: "Quests", icon: cilCompass },
  { id: "interview", label: "Interview", icon: cilChatBubble },
];

function JourneyBar({ progress }) {
  const segs = [
    { label: "Profile", v: progress.profile, w: 40 },
    { label: "Resume", v: progress.resume, w: 30 },
    { label: "Interview", v: progress.interview, w: 30 },
  ];
  return (
    <div className="mb-5">
      <div className="mb-1.5 flex items-baseline justify-between">
        <p className="text-xs font-semibold text-stone-500">Your Avsar profile</p>
        <p className="font-mono text-xs font-bold tabular-nums text-blurple-soft">{progress.total}% complete</p>
      </div>
      <div className="flex gap-1" role="progressbar" aria-valuenow={progress.total} aria-valuemin="0" aria-valuemax="100" aria-label="Profile completion">
        {segs.map((s) => (
          <span key={s.label} title={`${s.label} ${s.v}/${s.w}`} className="h-2 overflow-hidden rounded-full bg-stone-200" style={{ flex: s.w }}>
            <span className={`block h-full rounded-full ${s.v > 0 ? "bg-blurple" : ""}`} style={{ width: s.v > 0 ? "100%" : "0%" }} />
          </span>
        ))}
      </div>
    </div>
  );
}

// ponytail: canvas confetti, zero deps. ~80 rects, 1.3s, then done.
function confettiBurst() {
  const c = document.createElement("canvas");
  c.style.cssText = "position:fixed;inset:0;z-index:80;pointer-events:none";
  document.body.appendChild(c);
  const ctx = c.getContext("2d");
  c.width = innerWidth;
  c.height = innerHeight;
  const colors = ["#1e7a4c", "#f59e0b", "#0ea5e9", "#e11d48", "#a855f7"];
  const ps = Array.from({ length: 80 }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 120,
    y: innerHeight / 2,
    vx: (Math.random() - 0.5) * 14,
    vy: -Math.random() * 12 - 3,
    s: Math.random() * 7 + 3,
    r: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3,
    col: colors[Math.floor(Math.random() * colors.length)],
  }));
  const t0 = performance.now();
  (function tick(t) {
    const el = t - t0;
    ctx.clearRect(0, 0, c.width, c.height);
    for (const p of ps) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35;
      p.r += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.r);
      ctx.fillStyle = p.col;
      ctx.globalAlpha = Math.max(0, 1 - el / 1300);
      ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
      ctx.restore();
    }
    if (el < 1300) requestAnimationFrame(tick);
    else c.remove();
  })(t0);
}

export default function Journey() {
  const navigate = useNavigate();
  // The journey scores in the portal's own lane: a Tech resume must produce
  // Tech gaps (which become Tech quests), never Ayush ones.
  const { lane, resume, saveResume } = useAvsar();
  const reduce = useReducedMotion();
  const profile = useMemo(() => loadProfile() || {}, []);
  const interviewBest = loadJSON("avsar-interview-best", 0);
  const result = resume?.result || null;
  const view = normalizeScoreResult(result);

  const progress = onboardingProgress({
    profileDone: Boolean(profile.skills && profile.goal),
    resumeDone: Boolean(result),
    interviewDone: interviewBest > 0,
  });
  const [stage, setStage] = useState(() =>
    interviewBest > 0 ? "congrats" : result ? "interview" : "resume"
  );
  const [tab, setTab] = useState("score");
  const [text, setText] = useState(() => resume?.text || "");
  const [notice, setNotice] = useState("");

  const profileLine = lane === "ayush"
    ? [profile.year, profile.lane && `${profile.lane} lane`, profile.college, profile.goal && `goal: ${profile.goal}`].filter(Boolean).join(", ")
    : [profile.track, profile.loc, profile.hours && `${profile.hours} hrs/week`, profile.goal && `goal: ${profile.goal}`].filter(Boolean).join(", ");
  const sampleText = lane === "ayush" ? AYUSH_RESUMES[0].text : TECH_RESUMES[0].text;

  // --- interview state ---
  const [qs, setQs] = useState(null);
  const [answers, setAnswers] = useState(["", "", "", "", ""]);
  const [grades, setGrades] = useState([null, null, null, null, null]);
  const [grading, setGrading] = useState(-1);
  const asked = useRef(false);

  useEffect(() => {
    if (stage !== "interview" || asked.current) return;
    asked.current = true;
    genInterviewQs(resume?.text || "", lane, profileLine).then((ai) => {
      setQs(ai && ai.length >= 3 ? ai.slice(0, 5) : questionsFromProfile(profile, result));
    });
  }, [stage, resume, profile, profileLine, result, lane]);

  async function onFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      setText(await parseResumeFile(f));
      setNotice("");
    } catch {
      setNotice("Could not read that file. Paste the text instead.");
    }
    e.target.value = "";
  }

  function score() {
    if (!text.trim()) {
      setNotice("Paste your resume text or upload a file first.");
      return;
    }
    saveResume(text, scoreResume(text, lane), lane);
    recordDay("resume");
    setNotice("");
    setTab("improve");
  }

  async function gradeOne(i) {
    if (!answers[i].trim() || grades[i] !== null || grading !== -1) return;
    setGrading(i);
    const ai = await gradeAnswerAI(qs[i], answers[i], profileLine, lane).catch(() => null);
    const g = ai !== null && ai !== undefined
      ? { score: ai, ai: true, tips: ai < 3 ? ["Add a concrete example with a number."] : [] }
      : { score: Math.max(0, scoreAnswer(answers[i]).micro - 1), ai: false, tips: scoreAnswer(answers[i]).tips.slice(0, 1) };
    setGrades((prev) => { const n = [...prev]; n[i] = g; return n; });
    setGrading(-1);
  }

  function finishInterview() {
    const done = grades.filter(Boolean);
    if (!done.length) return;
    const avg = done.reduce((a, g) => a + g.score, 0) / done.length;
    saveJSON("avsar-interview-best", Math.round(avg * 25));
    recordDay("interview");
    setStage("congrats");
  }

  function startJourney() {
    saveJSON("avsar-onboarded-v1", Date.now());
    if (!reduce) confettiBurst();
    setTimeout(() => navigate("/home"), reduce ? 0 : 900);
  }

  const tips = useMemo(() => (result ? resumeTips(result) : []), [result]);
  const pairs = completedSkillIdsForRole(lane).length;
  const main = result ? calculateMainScore(result.total, interviewBest, questPairsToProof(pairs), lane) : 0;
  const previewQs = useMemo(() => questionsFromProfile(profile, result).slice(0, 3), [profile, result]);
  const gradedCount = grades.filter(Boolean).length;

  return (
    <Page
      title={stage === "congrats" ? "You did it" : "Start your journey with Avsar"}
      sub={
        stage === "resume"
          ? "Add your resume, see your score, close the gaps."
          : stage === "interview"
            ? "Five questions from YOUR data — your skills, lane, goal, and resume gaps."
            : "Your first loop is complete. This is where it pays off."
      }
    >
      {stage !== "congrats" && <JourneyBar progress={progress} />}
      {stage !== "congrats" && progress.total > 0 && (
        <p className="mb-4 text-right">
          <button
            type="button"
            onClick={() => { if (window.confirm("Clear saved profile, resume, and interview answers?")) { resetOnboarding(); window.location.reload(); } }}
            className="text-xs font-medium text-stone-400 underline underline-offset-4 hover:text-red-600"
          >
            Reset saved test data
          </button>
        </p>
      )}

      {!profile.skills && (
        <Card className="mb-4 border-amber-900 bg-amber-950">
          <p className="text-sm text-stone-700">
            Finish your <Btn to="/profile" variant="quiet" size="sm">profile first</Btn> — it is worth 40% and shapes your interview questions.
          </p>
        </Card>
      )}

      {stage === "resume" && (
        <>
          <div className="mb-4 flex gap-1 rounded-xl border border-stone-200 bg-white p-1" role="tablist" aria-label="Resume steps">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-sm font-semibold transition-colors ${
                  tab === t.id ? "bg-blurple text-white" : "text-stone-500 hover:bg-emerald-50"
                }`}
              >
                <CIcon icon={t.icon} width={15} height={15} aria-hidden />
                {t.label}
              </button>
            ))}
          </div>

          {tab === "score" && (
            <Card>
              <H2>Paste your resume, get a number</H2>
              <Field label="Resume file" hint="PDF or text. Parsed on your device.">
                <input type="file" accept=".pdf,.txt,.md" onChange={onFile} className="text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border file:border-transparent file:bg-blurple file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white" />
              </Field>
              <div className="mt-3">
                <Field label="Resume text">
                  <textarea className={`${inputCls} min-h-36 font-mono text-xs leading-5`} value={text} onChange={(e) => setText(e.target.value)} placeholder="Paste your resume text here" />
                </Field>
              </div>
              {notice && <p className="mt-2 text-sm text-red-500" role="alert">{notice}</p>}
              <div className="mt-3 flex flex-wrap gap-2">
                <Btn onClick={score}>Score my resume</Btn>
                <Btn variant="quiet" onClick={() => setText(sampleText)}>Use a sample</Btn>
              </div>
              {result && (
                <div className="mt-5 border-t border-stone-100 pt-4">
                  <p className="font-mono text-[11px] uppercase tracking-wide text-stone-400">Readiness</p>
                  <p className="font-display text-5xl font-bold tabular-nums text-stone-900">
                    <CountUp to={main} /><span className="text-lg text-stone-400">/100</span>
                  </p>
                  <p className="mt-1 font-mono text-[11px] tabular-nums text-stone-500">
                    resume {view.total}/95 · interview {interviewBest} · {pairs} quest pair{pairs === 1 ? "" : "s"}
                  </p>
                  <div className="mt-3 space-y-3">
                    {view.breakdown.slice(0, 5).map((d) => (
                      <div key={d.label}>
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="font-medium text-stone-700">{d.label}</span>
                          <span className="font-mono tabular-nums text-stone-400">{d.pts}/{d.max}</span>
                        </div>
                        <Meter value={d.pts} max={d.max} />
                      </div>
                    ))}
                  </div>
                  <div className="mt-4">
                    <Btn onClick={() => setStage("interview")}>Continue to interview (+30%)</Btn>
                  </div>
                </div>
              )}
            </Card>
          )}

          {tab === "improve" && (
            <Card>
              <H2>Fixes that raise this score</H2>
              {!result ? (
                <Empty title="Score first" body="Tab back to Score and press the button — fixes appear here." />
              ) : (
                <>
                  <ol className="divide-y divide-stone-100">
                    {tips.map((t, i) => (
                      <li key={i} className="flex gap-3 py-2.5">
                        <span className="font-mono text-xs tabular-nums text-blurple-soft">{String(i + 1).padStart(2, "0")}</span>
                        <p className="text-sm leading-6 text-stone-700">{t}</p>
                      </li>
                    ))}
                  </ol>
                  {lane === "ayush" && view.missing.filter((s) => SKILL_WHY[s.toLowerCase()]).slice(0, 3).map((s) => {
                    const info = SKILL_WHY[s.toLowerCase()];
                    return (
                      <div key={s} className="mt-2 border-l-2 border-amber-400 py-2 pl-3">
                        <p className="text-sm font-semibold text-stone-800">{s}</p>
                        <p className="text-xs leading-5 text-stone-500">{info.why}</p>
                      </div>
                    );
                  })}
                </>
              )}
            </Card>
          )}

          {tab === "quests" && (
            <Card>
              <H2>Turn gaps into proof</H2>
              {!result ? (
                <Empty title="Score first" body="Your missing skills become quests here." />
              ) : view.missing.length === 0 ? (
                <Empty title="No gaps" body="Nothing missing. Head to the interview." action={<Btn onClick={() => setStage("interview")}>Start interview</Btn>} />
              ) : (
                <ul className="space-y-2">
                  {view.missing.slice(0, 4).map((s) => {
                    const link = coursesFor(s)[0];
                    return (
                      <li key={s} className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold capitalize text-stone-800">{s}</p>
                          {link && <p className="text-xs text-stone-500">{link.t}</p>}
                        </div>
                        <Btn to="/quests" variant="quiet" size="sm">Quest it</Btn>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          )}

          {tab === "interview" && (
            <Card>
              <H2>Then prove it out loud</H2>
              <p className="text-sm leading-6 text-stone-500">
                Five questions built from your skills{profile.lane && lane === "ayush" ? `, ${profile.lane} lane` : ""}{profile.track && lane !== "ayush" ? `, ${profile.track} track` : ""}{profile.goal ? `, and ${profile.goal} goal` : ""}. Finish the interview and your profile hits 100%.
              </p>
              <ol className="mt-3 space-y-2">
                {previewQs.map((q, i) => (
                  <li key={i} className="rounded-xl bg-stone-50 px-4 py-3 text-sm leading-6 text-stone-700">
                    <span className="font-mono text-xs text-blurple-soft">{i + 1}. </span>{q}
                  </li>
                ))}
              </ol>
              <div className="mt-4">
                <Btn onClick={() => setStage("interview")} disabled={!result}>Start my interview</Btn>
                {!result && <p className="mt-2 text-xs text-stone-400">Score your resume first — questions come from it.</p>}
              </div>
            </Card>
          )}
        </>
      )}

      {stage === "interview" && (
        <Card>
          <div className="mb-3 flex items-center justify-between gap-2">
            <H2 className="mb-0">Your interview</H2>
            <Chip tone={hasAIKey() ? "green" : "amber"}>{hasAIKey() ? "AI grading" : "offline grading"}</Chip>
          </div>
          {!qs ? (
            <Empty title="Writing your questions" body="Reading your skills, lane, goal, and resume gaps…" />
          ) : (
            <>
              {qs.map((q, i) => (
                <div key={i} className="mb-4">
                  <Field label={`${i + 1}. ${q}`}>
                    <textarea
                      className={`${inputCls} min-h-20 text-sm`}
                      value={answers[i]}
                      onChange={(e) => setAnswers((prev) => { const n = [...prev]; n[i] = e.target.value; return n; })}
                      placeholder="Answer like you would speak it. One example, one number."
                    />
                  </Field>
                  <div className="mt-1.5 flex items-center gap-3">
                    {grades[i] === null ? (
                      <button
                        type="button"
                        onClick={() => gradeOne(i)}
                        disabled={!answers[i].trim() || grading !== -1}
                        className="text-xs font-semibold text-blurple-soft underline underline-offset-4 disabled:text-zinc-600"
                      >
                        {grading === i ? "Grading…" : "Grade this answer"}
                      </button>
                    ) : (
                      <span className="text-xs text-stone-500">
                        {grades[i].score}/4{grades[i].ai ? " · AI" : " · offline"}{grades[i].tips[0] ? ` — ${grades[i].tips[0]}` : " — strong."}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-3">
                <Btn onClick={finishInterview} disabled={gradedCount === 0}>
                  Finish interview ({gradedCount}/5 graded)
                </Btn>
                {gradedCount === 0 && <span className="text-xs text-stone-400">Grade at least one answer to finish</span>}
              </div>
            </>
          )}
        </Card>
      )}

      {stage === "congrats" && (
        <Card className="overflow-hidden text-center">
          <p className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-amber-800">
            <CIcon icon={cilBadge} width={14} height={14} /> First loop complete
          </p>
          <div className="mx-auto mt-4 flex size-20 items-center justify-center rounded-full bg-blurple font-display text-2xl font-bold text-white">
            100
          </div>
          <h2 className="mt-4 font-display text-2xl font-bold text-stone-900">You did it</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-stone-500">
            Profile, resume, interview — {lane === "ayush" ? "hospitals" : "recruiters"} now see proof, not promises.
            {main > 0 && <> Your readiness sits at <strong className="text-blurple-soft">{main}/100</strong>.</>}
          </p>
          <div className="mx-auto mt-3 flex max-w-xs items-center gap-1" aria-hidden>
            {[40, 30, 30].map((w, i) => (
              <span key={i} className="h-2 rounded-full bg-blurple" style={{ flex: w }} />
            ))}
          </div>
          <div className="mt-6">
            <Btn onClick={startJourney} size="lg">Let&apos;s start your journey <CIcon icon={cilArrowRight} width={16} height={16} /></Btn>
          </div>
        </Card>
      )}
    </Page>
  );
}
