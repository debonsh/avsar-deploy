// Workspace: one internship, end to end — application pipeline, mentor
// feedback, completion record. Mentor sign-off writes a "mentor" proof into
// the ledger, which flips the skill to verified everywhere (portfolio,
// matching, readiness). That close-the-loop moment is the demo's payoff.
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import CIcon from "@coreui/icons-react";
import { cilTask } from "@coreui/icons";
import { Page, Card, H2, Btn, Chip, Field, Empty, inputCls } from "../components/ui.jsx";
import { useAvsar } from "../app/store.jsx";
import { JOBS } from "../data/jobs.js";
import { AYUSH_JOBS } from "../data/ayushSeed.js";
import { mergeJobs, loadApplications } from "../lib/store.js";
import { addProof, proofsFor, verifyState } from "../ayush/proof.js";

const FLOW = ["saved", "applied", "interview", "offer"];

function statusOf(events, id) {
  const mine = (events || []).filter((e) => e.jobId === String(id));
  if (mine.some((e) => e.event === "offer")) return "offer";
  if (mine.some((e) => e.event === "interview")) return "interview";
  if (mine.some((e) => e.event === "applied")) return "applied";
  if (mine.some((e) => e.event === "saved")) return "saved";
  return null;
}

function SignOff({ job, onDone }) {
  const [mentor, setMentor] = useState("");
  const [skill, setSkill] = useState(job.skills[0] || "");
  const [note, setNote] = useState("");
  function sign() {
    if (!mentor.trim() || !skill) return;
    addProof({ skill, kind: "mentor", detail: `${mentor.trim()} · ${job.title} · ${note.trim()}`.slice(0, 140) });
    onDone(skill);
  }
  return (
    <div className="grid gap-2">
      <Field label="Mentor name" hint="The supervisor who watched the work.">
        <input className={inputCls} value={mentor} onChange={(e) => setMentor(e.target.value)} placeholder="Dr. Rao, CCRAS unit head" />
      </Field>
      <Field label="Skill this verifies">
        <select className={inputCls} value={skill} onChange={(e) => setSkill(e.target.value)}>
          {(job.skills || []).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </Field>
      <Field label="Completion note (optional)">
        <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Filed 12 supervised case logs" />
      </Field>
      <Btn onClick={sign} disabled={!mentor.trim() || !skill}>Sign off & verify skill</Btn>
    </div>
  );
}

export default function Workspace() {
  const { jobId } = useParams();
  const { customJobs, events, addEvent } = useAvsar();
  const [flash, setFlash] = useState("");
  const pool = useMemo(() => mergeJobs(customJobs, AYUSH_JOBS, JOBS), [customJobs]);
  const apps = useMemo(() => loadApplications(), []);

  if (!jobId) {
    const touched = pool.filter((j) => statusOf(events, j.id) || apps.some((a) => String(a.jobId) === String(j.id)));
    return (
      <Page title="Workspace" kicker="Work · Verify" sub="Internship progress, mentor feedback, and completion records — the loop that turns work into verified skills.">
        {touched.length === 0 ? (
          <Empty
            title="No active internship yet"
            body="Save or apply to a role in the feed and it appears here with its pipeline and sign-off."
            action={<Btn to="/jobs">Browse the feed</Btn>}
            icon={<CIcon icon={cilTask} width={20} height={20} />}
          />
        ) : (
          <div className="space-y-3">
            {touched.map((j) => (
              <Card key={j.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-[15px] font-bold text-stone-900">{j.title}</h3>
                    <p className="text-[13px] text-stone-500">{j.company} · {j.loc}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusOf(events, j.id) && <Chip tone="blue">{statusOf(events, j.id)}</Chip>}
                    <Btn size="sm" to={`/workspace/${j.id}`}>Open workspace</Btn>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Page>
    );
  }

  const job = pool.find((j) => String(j.id) === String(jobId));
  if (!job) {
    return (
      <Page title="Workspace" kicker="Work · Verify" sub="Unknown posting.">
        <Empty title="Role not found" body="It may have been dismissed or removed." action={<Btn to="/workspace">Back to workspaces</Btn>} icon={<CIcon icon={cilTask} width={20} height={20} />} />
      </Page>
    );
  }

  const st = statusOf(events, job.id);
  const next = st && FLOW.includes(st) && st !== "offer" ? FLOW[FLOW.indexOf(st) + 1] : null;
  const mentorProofs = (job.skills || []).flatMap((s) => proofsFor(s).filter((p) => p.kind === "mentor").map((p) => ({ ...p, skill: s })));

  return (
    <Page
      title={job.title}
      kicker="Work · Verify"
      sub={`${job.company} · ${job.loc} · ${job.type}`}
      actions={<Btn variant="quiet" to="/workspace">All workspaces</Btn>}
    >
      {flash && <p className="mb-4 text-sm text-emerald-700">{flash}</p>}
      <Card>
        <H2>Pipeline</H2>
        <ol className="flex flex-wrap items-center gap-1.5" aria-label="Application pipeline">
          {FLOW.map((s) => {
            const reached = st ? FLOW.indexOf(s) <= FLOW.indexOf(st) : false;
            return (
              <li key={s} className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${reached ? "bg-emerald-700 text-white" : "bg-stone-100 text-stone-500"}`}>
                {s}
              </li>
            );
          })}
        </ol>
        <div className="mt-3 flex flex-wrap gap-2">
          {!st && <Btn size="sm" onClick={() => addEvent(String(job.id), "saved")}>Save</Btn>}
          {next && <Btn size="sm" onClick={() => addEvent(String(job.id), next)}>Move to {next}</Btn>}
          {job.apply && job.apply !== "#" && (
            <a className="inline-flex min-h-[32px] items-center text-xs font-semibold text-emerald-700 underline underline-offset-4" href={job.apply} target="_blank" rel="noreferrer">
              Apply page ↗
            </a>
          )}
        </div>
      </Card>

      <Card className="mt-4">
        <H2>Completion record → verified skill</H2>
        <p className="mb-3 text-sm leading-6 text-stone-500">
          When the internship ends, the mentor signs off. That single signature flips the skill to verified —
          portfolio badge, match score, and readiness all move.
        </p>
        {mentorProofs.length > 0 && (
          <ul className="mb-3 space-y-1.5">
            {mentorProofs.map((p, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 text-sm">
                <Chip tone="green">{p.skill} ✓ verified</Chip>
                <span className="text-xs text-stone-500">{p.detail}</span>
              </li>
            ))}
          </ul>
        )}
        <SignOff job={job} onDone={(s) => setFlash(`${s} is now verified under ${verifyState(s, 0).verified ? "mentor sign-off" : " review"}. Check your portfolio.`)} />
      </Card>

      <p className="mt-4 text-sm text-stone-500">
        <Link to="/portfolio" className="font-semibold text-emerald-700 underline underline-offset-4">See the verified badge on your portfolio →</Link>
      </p>
    </Page>
  );
}
