import { useEffect, useMemo, useState } from "react";
import CIcon from "@coreui/icons-react";
import { cilPuzzle } from "@coreui/icons";
import { Page, Card, H2, Btn, Chip, Empty } from "../components/ui.jsx";
import { useAvsar } from "../app/store.jsx";
import { QUIZ, gradeSet, quizSample, loadQuizBest, saveQuizBest, todayDay } from "../data/quiz.js";
import { recordDay } from "../lib/progress.js";
import { getOrCreateDeviceId } from "../lib/identity.js";
import { ROLES } from "../lib/score.js";

// timed aptitude: 10 questions, 10 minutes, auto-submit at zero.
// The clock is the point — recruiters read speed + accuracy, not just marks.
const LIMIT_S = 600;
const fmt = (s) => `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;

export default function Quiz() {
  const { lane } = useAvsar();
  const [started, setStarted] = useState(false);
  const [picks, setPicks] = useState([]);
  const [done, setDone] = useState(null);
  const [left, setLeft] = useState(LIMIT_S);

  // one bank per scoring lane: ayush on the vaidya portal, sde/data/marketing/govt on tech.
  const bank = QUIZ[lane] || [];
  const questions = useMemo(
    () => (started ? quizSample(lane, getOrCreateDeviceId(), todayDay(), 10) : []),
    [started, lane]
  );
  const best = loadQuizBest(lane);

  function submit(answers = picks) {
    const full = questions.map((_, i) => (answers[i] == null ? -1 : answers[i]));
    const g = gradeSet(questions, full);
    saveQuizBest(lane, g.score);
    recordDay("quiz");
    setDone(g);
  }

  useEffect(() => {
    if (!started || done) return;
    setLeft(LIMIT_S);
    const id = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [started, done]);

  // time up → grade what's answered, blanks count wrong
  useEffect(() => {
    if (started && !done && left <= 0) submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- submit reads live picks
  }, [left, started, done]);

  const isAyush = lane === "ayush";

  return (
    <Page
      title={isAyush ? "BAMS Quiz" : "Quiz"}
      kicker="Step 03 · Prove"
      sub={`${ROLES[lane]?.label || lane}: 10 questions sampled for you today. Best score counts toward your rank.`}
      actions={best > 0 && <Chip tone="green">Best: {best}/100</Chip>}
    >
      {bank.length === 0 && (
        <Empty title="No quiz bank for this track yet" body="Switch to a track with a question bank from the Resume page." icon={<CIcon icon={cilPuzzle} width={20} height={20} />} />
      )}

      {bank.length > 0 && !started && (
        <Card>
          <H2>Ready when you are</H2>
          <p className="text-sm text-zinc-400">10 questions, {fmt(LIMIT_S)} on the clock, one try per sitting. Unanswered questions count wrong when time runs out.</p>
          <Btn className="mt-4" onClick={() => { setStarted(true); setPicks([]); setDone(null); setLeft(LIMIT_S); }}>Start the timed quiz</Btn>
        </Card>
      )}

      {started && !done && (
        <Card>
          <div className="mb-4 flex items-center justify-between gap-2">
            <p className={`font-mono text-sm font-bold tabular-nums ${left < 60 ? "text-red-400" : "text-zinc-200"}`} role="timer" aria-label={`${fmt(left)} remaining`}>
              {fmt(left)} <span className="font-normal text-zinc-500">left</span>
            </p>
            <Chip tone={left < 60 ? "red" : "zinc"}>{picks.filter((p) => p != null).length}/{questions.length} answered</Chip>
          </div>
          <ol className="space-y-5">
            {questions.map((q, qi) => (
              <li key={qi}>
                <p className="text-sm font-medium text-zinc-100">{qi + 1}. {q.q}</p>
                <div className="mt-2 grid gap-1.5">
                  {q.opts.map((o, oi) => (
                    <label key={oi} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${picks[qi] === oi ? "border-blurple bg-blurple/10" : "border-zinc-800 hover:border-zinc-600"}`}>
                      <input type="radio" name={`q${qi}`} className="accent-[#5865F2]" checked={picks[qi] === oi} onChange={() => setPicks((p) => { const n = [...p]; n[qi] = oi; return n; })} />
                      {o}
                    </label>
                  ))}
                </div>
              </li>
            ))}
          </ol>
          <Btn className="mt-5" onClick={submit} disabled={picks.length < questions.length || picks.some((p) => p == null)}>
            Submit answers
          </Btn>
          {picks.some((p) => p == null) && <p className="mt-2 text-xs text-zinc-400">Answer every question to submit.</p>}
        </Card>
      )}

      {done && (
        <Card>
          <H2>Result: {done.score}/100 ({done.correct}/{done.total} correct)</H2>
          <p className="text-sm text-zinc-400">Best for this track: {loadQuizBest(lane)}/100. Quiz strength feeds your skill mastery on the Quests page.</p>
          <ol className="mt-4 space-y-3">
            {questions.map((q, qi) => (
              <li key={qi} className="text-sm">
                <p className="font-medium text-zinc-100">{qi + 1}. {q.q}</p>
                <p className={picks[qi] === q.ans ? "text-blurple-soft" : "text-red-400"}>
                  You: {q.opts[picks[qi]]} {picks[qi] === q.ans ? "(correct)" : `(correct answer: ${q.opts[q.ans]})`}
                </p>
              </li>
            ))}
          </ol>
          <Btn variant="quiet" className="mt-4" onClick={() => { setStarted(false); setDone(null); }}>Back</Btn>
        </Card>
      )}
    </Page>
  );
}