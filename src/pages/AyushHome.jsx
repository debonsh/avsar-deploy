// Ayush home: the dashboard the vaidya portal lands on. Built like a hospital
// notice board — morning rounds, not a spreadsheet. Hero band, stat strip,
// today's rounds (quest / match / coach). Every card links somewhere real.
// Home.jsx picks this component when the track is ayush.
import CIcon from "@coreui/icons-react";
import {
  cilLeaf, cilBriefcase, cilBook, cilChatBubble, cilCheckCircle, cilArrowRight,
  cilChart, cilBadge, cilCompass, cilMedicalCross, cilFire, cilStar, cilClock,
} from "@coreui/icons";
import { Page, Card, H2, Btn, Chip, Reveal } from "../components/ui.jsx";
import { useAvsar } from "../app/store.jsx";
import { loadProfile } from "../lib/profile.js";
import { JOBS, matchJobs } from "../data/jobs.js";
import { coursesFor } from "../data/courses.js";
import { calculateMainScore, questPairsToProof } from "../lib/score.js";
import { completedSkillIdsForRole } from "../lib/progress.js";
import { loadJSON } from "../lib/storage.js";
import { onboardingProgress } from "../lib/onboarding.js";
import { vaidyaLevel } from "../ayush/scoring.js";
import StreakMeter from "../components/StreakMeter.jsx";
import XpMeter from "../components/XpMeter.jsx";

const TONES = {
  emerald: "bg-emerald-100 text-emerald-800",
  amber: "bg-amber-100 text-amber-800",
  sky: "bg-sky-100 text-sky-800",
  rose: "bg-rose-100 text-rose-800",
};

function IconBadge({ icon, tone = "emerald", size = 18 }) {
  return (
    <span className={`inline-flex size-9 shrink-0 items-center justify-center rounded-xl ${TONES[tone]}`} aria-hidden>
      <CIcon icon={icon} width={size} height={size} />
    </span>
  );
}

function Ring({ value }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(100, value)) / 100;
  return (
    <span className="relative inline-flex items-center justify-center" role="img" aria-label={`Readiness ${value} of 100`}>
      <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90" aria-hidden>
        <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="9" />
        <circle
          cx="48" cy="48" r={r} fill="none" stroke="#fbbf24" strokeWidth="9" strokeLinecap="round"
          strokeDasharray={`${(frac * c).toFixed(1)} ${c.toFixed(1)}`}
        />
      </svg>
      <span className="absolute font-display text-2xl font-bold tabular-nums text-white">{value}</span>
    </span>
  );
}

export default function AyushHome() {
  const { resume } = useAvsar();
  const profile = loadProfile() || {};
  const result = resume?.result || null;
  const found = result?.found || [];
  const missing = result?.missing || [];
  const interviewBest = loadJSON("avsar-interview-best", 0);
  const pairs = completedSkillIdsForRole("ayush").length;
  const main = result ? calculateMainScore(result.total, interviewBest, questPairsToProof(pairs), "ayush") : 0;
  const vaidya = vaidyaLevel(main);
  const loop = onboardingProgress({
    profileDone: Boolean(profile.skills && profile.goal),
    resumeDone: Boolean(result),
    interviewDone: interviewBest > 0,
  });
  const topJobs = matchJobs("ayush", main, found, JOBS).slice(0, 3);
  const skills = String(profile.skills || "").split(",").map((s) => s.trim()).filter(Boolean);

  const stats = [
    { icon: cilChart, tone: "emerald", label: "Readiness", value: `${main}/100` },
    { icon: cilBadge, tone: "sky", label: "Skills proven", value: String(found.length || skills.length) },
    { icon: cilChatBubble, tone: "amber", label: "Interview best", value: interviewBest > 0 ? String(interviewBest) : "—" },
    { icon: cilCheckCircle, tone: "rose", label: "Quest pairs", value: String(pairs) },
  ];

  return (
    <Page
      title="Your home"
      sub={
        profile.year || profile.lane
          ? `${profile.year || "BAMS"}${profile.lane ? ` · ${profile.lane} lane` : ""}${profile.goal ? ` · here to ${profile.goal}` : ""}`
          : "Your quests, matches, and coach — one screen."
      }
    >
      {/* hero band */}
      <Reveal>
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950 via-emerald-800 to-emerald-700 px-5 py-6 text-white sm:px-7">
          <CIcon
            icon={cilLeaf}
            width={220}
            height={220}
            className="pointer-events-none absolute -right-10 -top-10 text-white opacity-10"
          />
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-200">
            <CIcon icon={cilCompass} width={14} height={14} /> Avsar command center
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-5">
            <div className="min-w-0">
              <h2 className="font-display text-2xl font-bold leading-tight sm:text-3xl">
                Namaste{profile.lane && profile.lane !== "exploring" ? `, future ${profile.lane} vaidya` : ", vaidya"}.
              </h2>
              <p className="mt-1 max-w-md text-sm leading-6 text-emerald-100">
                {loop.total < 100
                  ? `Profile ${loop.total}% — one more round and hospitals see proof, not promises.`
                  : "Full loop done. Today's board: one quest, one match, one question for the coach."}
              </p>
              <div className="mt-3 flex max-w-xs items-center gap-1" aria-hidden>
                {[40, 30, 30].map((w, i) => (
                  <span key={i} className={`h-1.5 rounded-full ${loop.total >= 100 || (i === 0 && loop.total >= 40) || (i === 1 && loop.total >= 70) ? "bg-amber-400" : "bg-white/25"}`} style={{ flex: w }} />
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {loop.total < 100 ? (
                  <Btn to="/journey" className="bg-white text-emerald-900 hover:bg-emerald-50">
                    Continue journey <CIcon icon={cilArrowRight} width={15} height={15} />
                  </Btn>
                ) : (
                  <Btn to="/jobs" className="bg-white text-emerald-900 hover:bg-emerald-50">
                    Today&apos;s matches <CIcon icon={cilArrowRight} width={15} height={15} />
                  </Btn>
                )}
                <Btn to="/home?chat=1" variant="quiet" className="border border-white/30 bg-transparent text-white hover:bg-white/10">
                  Ask the coach
                </Btn>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Ring value={main} />
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold">
                <CIcon icon={cilStar} width={12} height={12} /> {vaidya.label}
              </span>
            </div>
          </div>
        </section>
      </Reveal>

      {/* stat strip */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="flex items-center gap-3 p-4">
            <IconBadge icon={s.icon} tone={s.tone} />
            <div>
              <p className="font-display text-xl font-bold tabular-nums text-stone-900">{s.value}</p>
              <p className="text-xs text-stone-500">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {loop.total < 100 && (
        <Card className="mt-4 flex flex-wrap items-center gap-3 border-amber-300 bg-amber-50">
          <IconBadge icon={cilFire} tone="amber" />
          <p className="min-w-0 flex-1 text-sm text-stone-700">
            Profile {loop.total}% — finish the loop to unlock full matches.
          </p>
          <Btn to="/journey" size="sm">Continue journey</Btn>
        </Card>
      )}

      {/* proof of work */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <StreakMeter />
        <XpMeter />
      </div>

      {/* today's rounds */}
      <h2 className="mb-3 mt-6 flex items-center gap-2 font-display text-lg font-bold text-stone-900">
        <CIcon icon={cilClock} width={18} height={18} className="text-emerald-700" /> Today&apos;s rounds
      </h2>
      <div className="grid gap-4 lg:grid-cols-3">
        <Reveal>
          <Card className="flex h-full flex-col">
            <div className="mb-2 flex items-center gap-2.5">
              <IconBadge icon={cilBook} tone="amber" />
              <H2 className="mb-0">Round 1 — learn</H2>
            </div>
            {missing.length === 0 && !result ? (
              <p className="text-sm leading-6 text-stone-500">Score your resume and gaps turn into quests here.</p>
            ) : missing.length === 0 ? (
              <p className="text-sm leading-6 text-stone-500">No gaps. Interview prep is your next win.</p>
            ) : (
              <ul className="space-y-2">
                {missing.slice(0, 3).map((s) => (
                  <li key={s} className="rounded-xl border border-stone-200 px-3 py-2">
                    <p className="text-sm font-semibold capitalize text-stone-800">{s}</p>
                    <p className="truncate text-xs text-stone-500">{coursesFor(s)[0]?.t || "Free quest in the quest list"}</p>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-auto pt-3"><Btn to="/quests" variant="quiet" size="sm">Open quests <CIcon icon={cilArrowRight} width={14} height={14} /></Btn></div>
          </Card>
        </Reveal>

        <Reveal delay={0.06}>
          <Card className="flex h-full flex-col">
            <div className="mb-2 flex items-center gap-2.5">
              <IconBadge icon={cilBriefcase} tone="emerald" />
              <H2 className="mb-0">Round 2 — apply</H2>
            </div>
            <ul className="space-y-2">
              {topJobs.map((j) => (
                <li key={j.id} className="rounded-xl border border-stone-200 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-stone-800">{j.title}</p>
                    <Chip tone={j.eligible ? "green" : "amber"}>{j.eligible ? "eligible" : `${j.minScore} needed`}</Chip>
                  </div>
                  <p className="text-xs text-stone-500">{j.company} · {j.type}</p>
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-3"><Btn to="/jobs" variant="quiet" size="sm">All internships & jobs <CIcon icon={cilArrowRight} width={14} height={14} /></Btn></div>
          </Card>
        </Reveal>

        <Reveal delay={0.12}>
          <Card className="flex h-full flex-col">
            <div className="mb-2 flex items-center gap-2.5">
              <IconBadge icon={cilChatBubble} tone="emerald" />
              <H2 className="mb-0">Round 3 — ask</H2>
            </div>
            <p className="flex items-start gap-1.5 text-sm leading-6 text-stone-600">
              <CIcon icon={cilMedicalCross} width={15} height={15} className="mt-1 shrink-0 text-emerald-700" />
              {profile.lane ? `Coached for your ${profile.lane} lane` : "Coached on your answers"}
              {missing[0] ? ` — biggest gap today: ${missing[0]}.` : "."}
            </p>
            <p className="mt-2 flex items-start gap-1.5 text-sm leading-6 text-stone-600">
              <CIcon icon={cilCheckCircle} width={15} height={15} className="mt-1 shrink-0 text-emerald-700" />
              Lives in the bottom-right bubble, on every screen.
            </p>
            <div className="mt-auto pt-3"><Btn to="/home?chat=1" size="sm">Ask the coach <CIcon icon={cilArrowRight} width={14} height={14} /></Btn></div>
          </Card>
        </Reveal>
      </div>
    </Page>
  );
}
