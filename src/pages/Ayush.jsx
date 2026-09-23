// Avsar ayush front door: landing page of the ayurveda internship + upskilling portal (route "/").
import { Link, useNavigate } from "react-router";
import { ArrowRight, Check } from "lucide-react";
import { Btn, Reveal, Ticket } from "../components/ui.jsx";
import { useAvsar } from "../app/store.jsx";
import FractalMap from "../components/landing/FractalMap.jsx";
import { AYUSH_JOBS, AYUSH_TREE } from "../data/ayushSeed.js";
import { completedSkillIdsForRole, getEvidence, isCourseDone, isProjectDone } from "../lib/progress.js";

const ROTATORY = [
  { span: "months 1-6", where: "college ayurveda hospital", what: "opd/ipd, panchakarma, case sheets, pharmacovigilance" },
  { span: "months 7-12", where: "phc / chc / rural / district hospital", what: "national health programmes, community care, e-logbook" },
];

export default function Ayush() {
  const { setTrack } = useAvsar();
  const nav = useNavigate();

  const enter = (to) => {
    // landing here means the vaidya portal: keep the track in sync, then route.
    setTrack("ayush");
    nav(to);
  };

  const shishiksha = AYUSH_TREE.ayush.branches[1].skills.find((s) => s.id === "shishiksha");
  const courseDone = isCourseDone("ayush", "shishiksha");
  const projectDone = isProjectDone("ayush", "shishiksha");
  const evidence = getEvidence("ayush", "shishiksha");
  const logbook = completedSkillIdsForRole("ayush").filter((s) => getEvidence("ayush", s)).length;
  const postings = AYUSH_JOBS.length;

  return (
    <div>
      <section className="relative overflow-hidden border-b border-emerald-900/10" aria-label="Ayush entry">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <FractalMap palette="leaf" className="absolute inset-0 h-full w-full opacity-40" />
          {/* soft gradient overlay so text stays readable over the map */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#f6f3ea]/30 via-transparent to-[#f6f3ea]/60" />
        </div>
        <div className="relative mx-auto w-full max-w-5xl px-3 py-5 sm:px-6 sm:py-14">
          <div className="rounded-2xl border border-emerald-900/10 bg-white/90 shadow-sm backdrop-blur-sm">
            <div className="px-4 py-6 text-center sm:px-8 sm:py-12">
              <p className="inline-block rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-800 sm:px-3 sm:py-1 sm:text-[11px]">
                Ministry of Ayush · BAMS · NCISM aligned
              </p>
              <h1 className="mx-auto mt-4 max-w-3xl text-balance font-display text-3xl font-bold leading-[1.1] text-stone-900 sm:mt-6 sm:text-5xl md:text-6xl">
                Vaidya track: classroom to clinic, with proof.
              </h1>
              <p className="mx-auto mt-3 max-w-xl text-pretty text-sm leading-6 text-stone-500 sm:mt-5 sm:text-base sm:leading-7">
                Three questions tune your matches. Then score your BAMS resume,
                clear the SHISHIKSHA checklist, and apply to ayurveda internships.
              </p>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-3 sm:mt-7 sm:gap-4">
                <Btn size="lg" onClick={() => enter("/profile")}>
                  Set up my profile <ArrowRight aria-hidden />
                </Btn>
                <button
                  type="button"
                  onClick={() => enter("/jobs")}
                  className="text-sm text-stone-500 underline underline-offset-4 hover:text-emerald-800"
                >
                  or browse {postings} ayurveda roles
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 px-3 py-1.5 sm:px-4 sm:py-2">
              <span className="text-[10px] tabular-nums text-stone-400 sm:text-[11px]">
                Rotatory internships · SHISHIKSHA checklist · SIH 26044
              </span>
              <Link to="/jobs" className="text-[10px] font-medium text-emerald-700 hover:text-emerald-900 sm:text-[11px]">
                View openings
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pt-12 sm:px-6 sm:pt-16" aria-label="Rotatory tracker">
        <Reveal>
          <Ticket label="Rotatory internship · 12 months · NCISM" status="12 months">
            <ul className="space-y-3">
              {ROTATORY.map((r) => (
                <li key={r.span} className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-700">{r.span}</p>
                  <p className="mt-1 text-sm font-medium text-stone-900">{r.where}</p>
                  <p className="mt-0.5 text-xs leading-5 text-stone-500">{r.what}</p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-stone-400">
              Postings for each block land in Internships under the BAMS track.
            </p>
          </Ticket>
        </Reveal>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14" aria-label="Orientation checklist">
        <Reveal>
          <Ticket label="SHISHIKSHA checklist" status={evidence ? "evidence linked" : "open"}>
            <p className="text-sm text-zinc-300">{shishiksha.name}: {shishiksha.course.t}</p>
            <ul className="mt-3 space-y-1.5">
              {[
                { t: "orientation course done", done: courseDone },
                { t: "6-day checklist project done", done: projectDone },
                { t: "proof link attached", done: Boolean(evidence) },
              ].map((c) => (
                <li key={c.t} className="flex items-center gap-2.5 text-sm">
                  <span
                    className={`flex size-5 shrink-0 items-center justify-center border ${c.done ? "border-blurple bg-blurple" : "border-zinc-700"}`}
                    aria-hidden
                  >
                    {c.done && <Check className="size-3.5 text-white" strokeWidth={3} />}
                  </span>
                  <span className={c.done ? "text-zinc-500 line-through" : "text-zinc-200"}>{c.t}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 font-mono text-xs tabular-nums text-zinc-500">
              e-logbook entries with proof: {logbook}
            </p>
            <div className="mt-4">
              <Btn variant="quiet" onClick={() => enter("/quests")}>
                Continue checklist
              </Btn>
            </div>
          </Ticket>
        </Reveal>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6 sm:pb-24" aria-label="Ananya">
        <Reveal>
          <div className="rounded-2xl border border-emerald-900/10 bg-white px-6 py-10 text-center shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-700">
              Ananya · BAMS final year
            </p>
            <p className="mx-auto mt-3 max-w-xl text-pretty text-sm leading-6 text-stone-500">
              Scored 44. Missing GCP documentation. Strong in Dravyaguna.
              Cleared SHISHIKSHA, applied at 87% fit, mentor signed off,
              pharmacovigilance flipped to proof.
            </p>
            <div className="mt-5">
              <Btn size="lg" onClick={() => enter("/resume")}>
                Run her path <ArrowRight aria-hidden />
              </Btn>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
