// The employer's side of proof-based screening. Nobody's name is in the room while the
// decision is being made: what a reviewer sees is a handle, a score, the reasoning behind
// it, and the kind of artifact that was submitted.
//
// Three things are stated rather than hidden.
//
// Shortlisting is a deliberate action here, not a side effect of opening the page. Taking a
// decision writes to the audit log, and a log that grows because someone rendered a
// component is not a record of anything.
//
// A reveal is refused until that decision exists, so identity follows the process instead of
// preceding it.
//
// An evidence link is not anonymous even when the handle is, so every row says so. github.com
// slash a name is a name.
import { useMemo, useState } from "react";
import { Page, Card, H2, Chip, Badge, Empty, Btn, Field, inputCls, AsciiRule, cn } from "../components/ui.jsx";
import { useAvsar } from "../app/store.jsx";
import {
  loadSubmissions, shortlist, revealIdentity, auditFor, evidenceLabel, seedChallenges,
} from "../lib/challenges.js";
import { skillById } from "../data/taxonomy.js";

const stamp = (ms) => (ms ? new Date(ms).toISOString().slice(0, 16).replace("T", " ") : "unknown");

function AuditTrail({ submissionId }) {
  const rows = auditFor(submissionId);
  if (!rows.length) return <p className="mt-2 text-[11px] text-zinc-600">No decisions recorded against this handle yet.</p>;
  return (
    <ol className="mt-2 space-y-1">
      {rows.map((e, i) => (
        <li key={`${e.kind}-${e.at}-${i}`} className="flex flex-wrap items-baseline gap-x-2 font-mono text-[10px] text-zinc-500">
          <span className="text-zinc-400">{e.kind}</span>
          <span>{stamp(e.at)}</span>
          <span>by {e.by}</span>
          {e.decision && <span className="text-zinc-400">{e.decision}</span>}
          {e.score != null && <span>score {e.score}</span>}
          {e.score != null && e.threshold != null && <span>bar {e.threshold}</span>}
          {e.reason && <span className="text-zinc-600">· {e.reason}</span>}
        </li>
      ))}
    </ol>
  );
}

export default function Shortlist() {
  const { role, track, lane } = useAvsar();
  const portal = track === "ayush" || lane === "ayush" ? "ayush" : "tech";
  const [threshold, setThreshold] = useState(60);
  const [pick, setPick] = useState("");
  const [revealed, setRevealed] = useState([]);
  const [notice, setNotice] = useState("");
  // Read once per mount so the pool cannot change under the reviewer mid-decision.
  const [all] = useState(() => seedChallenges());
  const [submissions, setSubmissions] = useState(() => loadSubmissions());

  const challenges = useMemo(() => all.filter((c) => c.lane === portal), [all, portal]);
  const active = challenges.find((c) => c.id === pick) || challenges[0] || null;
  const pool = useMemo(
    () => submissions.filter((s) => !active || s.challengeId === active.id),
    [submissions, active]
  );

  // Pure: this decides and displays, and records nothing. The split is recomputed as the bar
  // moves, which is what makes the threshold control worth having.
  const split = useMemo(
    () => shortlist(pool, { threshold, challengeId: active?.id || "", record: false }),
    [pool, threshold, active]
  );
  // How many decisions are on the record, as state written by the action that writes them.
  // Reading the audit log during render would make the page's output depend on when it
  // happened to render, and a decision log that grows from a re-render is not a log.
  const [recorded, setRecorded] = useState(0);

  function record() {
    const res = shortlist(pool, { threshold, challengeId: active?.id || "", by: role || "industry", record: true });
    setRecorded(res.in.length + res.out.length);
    setSubmissions(loadSubmissions());
    setNotice("");
  }

  function doReveal(row) {
    const out = revealIdentity(row.id, { by: role || "industry", reason: `revealed after shortlisting at bar ${threshold}` });
    if (!out.ok) {
      setNotice(out.reason);
      return;
    }
    setNotice("");
    setRevealed((prev) => [...prev, row.id]);
    setSubmissions(loadSubmissions());
  }

  return (
    <Page
      title="Blind shortlist"
      sub="Ranked on demonstrated ability, screened without a name. Identity is not in the room while the decision is made, and looking it up afterwards is recorded."
      actions={<Btn variant="quiet" to="/industry">Post a challenge</Btn>}
    >
      <Card>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <H2 className="mb-1">Which challenge</H2>
            <div className="flex flex-wrap gap-2">
              {challenges.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { setPick(c.id); setRevealed([]); setNotice(""); }}
                  aria-pressed={active?.id === c.id}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blurple",
                    active?.id === c.id ? "border-blurple bg-blurple/10 text-zinc-100" : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-100"
                  )}
                >
                  {c.title}
                </button>
              ))}
            </div>
          </div>
          <Field label="Shortlist at or above">
            <input
              type="number"
              min="0"
              max="100"
              value={threshold}
              onChange={(e) => setThreshold(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
              className={cn(inputCls, "w-24")}
            />
          </Field>
        </div>

        {active && (
          <p className="mt-3 text-xs leading-5 text-zinc-500">
            {active.brief.slice(0, 220)}{active.brief.length > 220 ? "…" : ""}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Btn size="sm" onClick={record} disabled={!pool.length}>Record this shortlist</Btn>
          <span className="text-[11px] leading-4 text-zinc-500">
            {recorded > 0
              ? `${recorded} decision${recorded === 1 ? "" : "s"} already on the record for this challenge.`
              : "Moving the bar decides nothing on its own. Recording writes the bar and the outcome to the audit log."}
          </span>
        </div>
      </Card>

      {notice && (
        <Card className="mt-4 border-amber-900">
          <p className="text-sm text-amber-300">{notice}</p>
        </Card>
      )}

      <Card className="mt-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <H2 className="mb-0">Shortlisted</H2>
          <Badge tone={split.in.length ? "green" : "zinc"}>
            {split.in.length} of {pool.length} submissions
          </Badge>
        </div>
        {split.in.length === 0 ? (
          <Empty
            title={pool.length ? "Nothing clears the threshold yet" : "No submissions for this challenge"}
            body={
              pool.length
                ? `With the bar at ${threshold}, no submission in this challenge qualifies. Lower the bar, or wait for more. Nothing is hidden: the ones below it are listed underneath.`
                : "Submit one from the student side to see the whole loop: post, submit, screen blind, decide, reveal."
            }
            action={pool.length ? null : <Btn to="/challenges">Open proof of skill</Btn>}
          />
        ) : (
          <ul className="space-y-3">
            {split.in.map((row) => {
              const ev = evidenceLabel(row.evidenceUrl);
              const isRevealed = revealed.includes(row.id);
              return (
                <li key={row.id} className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-sm text-zinc-200">{row.blindId}</span>
                      <Chip tone="green">{row.grade.score}/100</Chip>
                      <Badge tone="zinc">{skillById(row.skill)?.name || row.skill}</Badge>
                    </span>
                    <span className="font-mono text-[10px] text-zinc-600">submitted {stamp(row.at)}</span>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-zinc-400">{row.grade.why[0]}</p>
                  <p className="mt-1.5 font-mono text-[10px] text-zinc-500">
                    evidence {ev.host}{ev.path}
                  </p>
                  {ev.identifiable && (
                      <p className="mt-1 text-[10px] leading-4 text-amber-600">
                      Opening this artifact may identify the author. The handle is blind, the link is not.
                    </p>
                  )}
                  <AuditTrail submissionId={row.id} />
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {isRevealed ? (
                      <Badge tone="amber">identity revealed, and logged</Badge>
                    ) : (
                      <Btn size="sm" variant="quiet" onClick={() => doReveal(row)}>Reveal identity</Btn>
                    )}
                    <span className="text-[10px] leading-4 text-zinc-600">
                      Only unlocks once a decision is on the record.
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {split.out.length > 0 && (
        <Card className="mt-4">
          <H2>Below the bar</H2>
          <p className="mb-3 text-xs leading-5 text-zinc-400">
            Listed rather than hidden. A screen whose rejections are invisible cannot be audited, and the reasons are
            already computed, so showing them costs nothing.
          </p>
          <ul className="divide-y divide-zinc-800">
            {split.out.map((row) => (
              <li key={row.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                <span className="min-w-0">
                  <span className="font-mono text-xs text-zinc-300">{row.blindId}</span>
                  <span className="ml-2 text-xs text-zinc-500">{row.grade.why[0]}</span>
                </span>
                <span className="shrink-0 font-mono text-xs tabular-nums text-amber-400">{row.grade.score}/100</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="mt-4">
        <H2>What this screen does and does not do</H2>
        <ul className="space-y-2 text-sm text-zinc-400">
          <li className="flex gap-2"><span aria-hidden className="text-emerald-400">·</span><span>The score is a published rule set, not a model, so two reviewers looking at one pool see the same order.</span></li>
          <li className="flex gap-2"><span aria-hidden className="text-emerald-400">·</span><span>Handles are stable pseudonyms per device and challenge. They are not cryptographic anonymity, and this page does not claim they are.</span></li>
          <li className="flex gap-2"><span aria-hidden className="text-emerald-400">·</span><span>An evidence link can identify its author, which is inherent to screening on proof rather than pedigree. Every row flags it.</span></li>
          <li className="flex gap-2"><span aria-hidden className="text-emerald-400">·</span><span>This desk never sees a college, a gender or a device id, because none of those fields exist in the screened record.</span></li>
        </ul>
        <AsciiRule label="Audit log on this device" className="my-4" />
        <p className="text-xs leading-5 text-zinc-500">
          {submissions.length === 0
            ? "No submissions on this device yet. Post a challenge and submit one as a student to run the whole loop."
            : `${submissions.length} submission${submissions.length === 1 ? "" : "s"} stored locally, with every decision and reveal written beside it.`}
        </p>
      </Card>
    </Page>
  );
}
