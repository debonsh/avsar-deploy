// Proof of skill, from the student's side. A challenge is small enough to finish in an
// evening, asks for an artifact a stranger could open and check, and states its rubric
// before you write anything: the weights are printed on every card, so nobody is guessing
// at what the grader wants. Grading is rule-based, and every point it awards or withholds
// comes back in the `why[]` line under the score.
import { useMemo, useState } from "react";
import { Page, Card, H2, Chip, Badge, Empty, Btn, Field, inputCls, AsciiRule, cn } from "../components/ui.jsx";
import { ReceiptCard } from "../components/Receipt.jsx";
import { useAvsar } from "../app/store.jsx";
import { portalOf } from "../lib/corpus.js";
import { RUBRIC, gradeSubmission, loadChallenges, loadSubmissions, recordSubmission, seedChallenges } from "../lib/challenges.js";
import { loadIssuerKey, signPayload } from "../lib/sign.js";
import { verifyUrl, codeFromReceipt } from "../lib/verify.js";
import { getOrCreateDeviceId } from "../lib/identity.js";
import { skillById } from "../data/taxonomy.js";

const KIND_LABEL = { build: "Build something", write: "Written analysis", "case-log": "Case log", quiz: "Short answer" };

// The rubric, printed on the card. A grader whose weights are hidden is a grader nobody
// can prepare for, which is the failure mode this whole pillar exists to replace.
function RubricBox() {
  const rows = [
    ["Evidence link", RUBRIC.hostFit, "the artifact opens, and the host matches the kind of challenge"],
    ["Note substance", RUBRIC.noteSubstance, "how far you explain your own reasoning"],
    ["Brief coverage", RUBRIC.briefCoverage, "how many of the listed checks your submission names"],
  ];
  return (
    <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">The rubric, before you start</p>
      <ul className="space-y-1.5">
        {rows.map(([label, pts, why]) => (
          <li key={label} className="flex gap-3 text-xs">
            <span className="w-6 shrink-0 font-mono text-zinc-300">{pts}</span>
            <span className="min-w-0">
              <span className="text-zinc-200">{label}</span>
              <span className="text-zinc-500"> · {why}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] leading-5 text-zinc-600">
        No model reads your submission. Every point above is a stated rule, so the same submission scores the same on any
        device, and you can argue with a number instead of a vibe.
      </p>
    </div>
  );
}

function SubmissionResult({ submission, receipt, link }) {
  const g = submission.grade;
  return (
    <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-display text-2xl font-bold tabular-nums text-zinc-50">{g.score}</span>
        <span className="font-mono text-xs text-zinc-500">/ 100</span>
        <Chip tone={g.passed ? "green" : "amber"}>{g.passed ? "passed" : `below ${g.threshold}`}</Chip>
      </div>
      <ul className="mt-2 space-y-1">
        {g.why.map((w, i) => (
          <li key={i} className="flex gap-2 text-xs leading-5 text-zinc-400">
            <span aria-hidden className="text-zinc-600">·</span>
            <span>{w}</span>
          </li>
        ))}
      </ul>
      {g.matchedEvidence.length > 0 && (
        <p className="mt-2 font-mono text-[10px] text-zinc-600">matched: {g.matchedEvidence.join(", ")}</p>
      )}
      {receipt && <ReceiptCard receipt={receipt} qrValue={link} className="mt-3" title="Receipt for this submission" />}
    </div>
  );
}

export default function Challenges() {
  const { track, lane } = useAvsar();
  const portal = portalOf(track, lane);
  const [open, setOpen] = useState("");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  // Read once per mount, exactly as the app store reads the profile. Re-reading inside render
  // would make the page's output depend on when it happened to render, which is how a page
  // ends up disagreeing with itself between two paints.
  const [all, setAll] = useState(() => seedChallenges());
  const [mine, setMine] = useState(() => loadSubmissions());
  const [result, setResult] = useState(null);
  // getOrCreateDeviceId is synchronous. It was called with .then here, which threw at render
  // time and took the whole route down; the browser smoke test is what caught it, because the
  // unit suite never renders a page.
  const [device] = useState(() => {
    try {
      return getOrCreateDeviceId() || "device";
    } catch {
      return "device";
    }
  });

  const challenges = useMemo(() => all.filter((c) => c.lane === portal), [all, portal]);

  const preview = useMemo(() => {
    const c = challenges.find((x) => x.id === open);
    if (!c || (!url && !note)) return null;
    return gradeSubmission(c, { evidenceUrl: url, note });
  }, [challenges, open, url, note]);

  async function submit(challenge) {
    if (busy) return;
    setBusy(true);
    try {
      const row = await recordSubmission({ challenge, deviceId: device, evidenceUrl: url, note });
      const key = await loadIssuerKey();
      const receipt = await signPayload(
        {
          submissionId: row.id,
          challengeId: row.challengeId,
          skill: row.skill,
          score: row.grade.score,
          passed: row.grade.passed,
          lane: row.lane,
        },
        key
      );
      setMine(loadSubmissions());
      setAll(loadChallenges());
      setResult({ row, receipt, link: verifyUrl(codeFromReceipt(receipt)) });
      setUrl("");
      setNote("");
      setOpen("");
    } finally {
      setBusy(false);
    }
  }

  const myRows = mine.filter((s) => s.lane === portal);

  return (
    <Page
      title="Proof of skill"
      sub="A claim on a resume is a claim. These are small challenges with a published rubric: finish one, get a grade you can argue with and a receipt a recruiter can check offline."
      actions={<Btn variant="quiet" to="/portfolio">Your portfolio</Btn>}
    >
      <Card>
        <H2>How this differs from screening</H2>
        <ul className="space-y-2 text-sm text-zinc-400">
          <li className="flex gap-2"><span aria-hidden className="text-emerald-400">·</span><span>The rubric is printed before you start, so you know what earns points.</span></li>
          <li className="flex gap-2"><span aria-hidden className="text-emerald-400">·</span><span>Grading is a set of stated rules, not a model, so it is the same for everyone and it can be appealed.</span></li>
          <li className="flex gap-2"><span aria-hidden className="text-emerald-400">·</span><span>Your submission enters an employer's shortlist as a handle, not a name, until a decision has been recorded.</span></li>
          <li className="flex gap-2"><span aria-hidden className="text-emerald-400">·</span><span>The receipt is signed on this device. It proves integrity, and the page says plainly what it does not prove.</span></li>
        </ul>
      </Card>

      {result && (
        <Card className="mt-4">
          <H2>Submitted</H2>
          <p className="text-sm text-zinc-300">
            Your submission for <span className="text-zinc-100">{all.find((c) => c.id === result.row.challengeId)?.title || "this challenge"}</span> was graded and signed.
          </p>
          <SubmissionResult submission={result.row} receipt={result.receipt} link={result.link} />
        </Card>
      )}

      <div className="mt-4 grid gap-4">
        {challenges.length === 0 ? (
          <Empty
            title="No challenges in this lane yet"
            body="The seeded set covers both lanes. If this lane is empty, an employer has not posted here yet."
          />
        ) : (
          challenges.map((c) => {
            const isOpen = open === c.id;
            const skillName = skillById(c.skill)?.name || c.skill;
            return (
              <Card key={c.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-display text-base font-semibold text-zinc-50">{c.title}</h3>
                    <p className="mt-0.5 font-mono text-[11px] text-zinc-500">
                      proves {skillName} · {KIND_LABEL[c.kind] || c.kind} · pass mark {c.threshold}
                    </p>
                  </div>
                  <Badge tone="zinc">{c.checks.length} checks</Badge>
                </div>
                <p className="mt-3 text-pretty text-sm leading-6 text-zinc-300">{c.brief}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {c.checks.map((k) => (
                    <span key={k} className="rounded-md border border-zinc-800 bg-zinc-950 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">{k}</span>
                  ))}
                </div>
                <RubricBox />

                {!isOpen ? (
                  <Btn
                    variant="quiet"
                    className="mt-3"
                    onClick={() => {
                      setOpen(c.id);
                      setUrl("");
                      setNote("");
                      setResult(null);
                    }}
                  >
                    Submit evidence
                  </Btn>
                ) : (
                  <div className="mt-3 space-y-3 border-t border-zinc-800 pt-3">
                    <Field label="Evidence link" hint="A repo, a live page, a shared document. It has to open for someone who is not you.">
                      <input className={inputCls} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
                    </Field>
                    <Field label="What you did, and what you would do next" hint="Name the checks above in your own words. This is what the coverage term reads.">
                      <textarea className={cn(inputCls, "h-28 resize-y py-2")} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Two or three sentences beats a paragraph of adjectives." />
                    </Field>
                    {preview && (
                      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Where this stands right now</p>
                        <p className="font-mono text-sm tabular-nums text-zinc-200">
                          {preview.score} / 100 · {preview.passed ? "passes" : `needs ${preview.threshold}`}
                        </p>
                        <p className="mt-1 text-[11px] leading-5 text-zinc-500">
                          Exactly what the grader will return. Nothing about this changes when you press submit.
                        </p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Btn onClick={() => submit(c)} disabled={busy || !preview}>
                        {busy ? "Signing" : "Submit and sign"}
                      </Btn>
                      <Btn variant="ghost" onClick={() => setOpen("")}>Cancel</Btn>
                    </div>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      <Card className="mt-4">
        <H2>Your submissions in this lane</H2>
        {myRows.length === 0 ? (
          <p className="text-sm text-zinc-400">Nothing submitted yet. The seeded challenges above work offline with no setup.</p>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {[...myRows].reverse().map((s) => {
              const c = all.find((x) => x.id === s.challengeId);
              return (
                <li key={s.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-sm text-zinc-200" title={c?.title || s.challengeId}>{c?.title || s.challengeId}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="font-mono text-xs tabular-nums text-zinc-400">{s.grade.score}/100</span>
                      <Chip tone={s.grade.passed ? "green" : "amber"}>{s.grade.passed ? "passed" : "not yet"}</Chip>
                      <span className="font-mono text-[10px] text-zinc-600">as {s.blindId}</span>
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-5 text-zinc-500">{s.grade.why[0]}</p>
                </li>
              );
            })}
          </ul>
        )}
        <AsciiRule label="What the employer sees" className="my-4" />
        <p className="text-xs leading-5 text-zinc-500">
          A shortlist shows your handle, your score and this reasoning. Your name, college and device stay out of the room
          until a shortlisting decision has been recorded, and that reveal is written to an audit log the employer cannot
          delete.
        </p>
      </Card>
    </Page>
  );
}
