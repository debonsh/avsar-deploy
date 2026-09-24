// Tech home: the command center the tech portal lands on. Dark, square, no
// ceremony — readiness ring, today's three moves (learn / apply / ask), and
// the meters that make progress visible. Home.jsx picks this for track=tech.
import CIcon from "@coreui/icons-react";
import {
  cilDescription, cilBriefcase, cilBook, cilChatBubble, cilCheckCircle,
  cilArrowRight, cilChart, cilBadge, cilFire,
} from "@coreui/icons";
import { Page, Card, H2, Btn, Chip, Reveal, SectionHead, IconTile, NextStep, FirstRun } from "../components/ui.jsx";
import { nextStep } from "../lib/nextstep.js";
import { t } from "../lib/i18n.js";
import { useAvsar } from "../app/store.jsx";
import { TECH_JOBS, matchJobs } from "../data/jobs.js";
import { coursesFor } from "../data/courses.js";
import { calculateMainScore, questPairsToProof, engLevelFor, ROLES } from "../lib/score.js";
import { completedSkillIdsForRole } from "../lib/progress.js";
import { loadJSON } from "../lib/storage.js";
import { onboardingProgress } from "../lib/onboarding.js";
import StreakMeter from "../components/StreakMeter.jsx";
import XpMeter from "../components/XpMeter.jsx";

function Ring({ value }) {
  const r = 34;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(100, value)) / 100;
  return (
    <span className="relative inline-flex items-center justify-center text-zinc-700" role="img" aria-label={`Readiness ${value} of 100`}>
      <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90" aria-hidden>
        <circle cx="48" cy="48" r={r} fill="none" stroke="currentColor" strokeOpacity="0.45" strokeWidth="9" />
        <circle
          cx="48" cy="48" r={r} fill="none" stroke="#9aa4ff" strokeWidth="9" strokeLinecap="round"
          strokeDasharray={`${(frac * c).toFixed(1)} ${c.toFixed(1)}`}
        />
      </svg>
      <span className="absolute font-display text-2xl font-bold tabular-nums text-zinc-50">{value}</span>
    </span>
  );
}

export default function TechHome() {
  const { lane, profile, resume, funnel } = useAvsar();
  const p = profile || {};
  const result = resume?.result || null;
  const found = result?.found || [];
  const missing = result?.missing || [];
  const interviewBest = loadJSON("avsar-interview-best", 0);
  const pairs = completedSkillIdsForRole(lane).length;
  const main = result ? calculateMainScore(result.total, interviewBest, questPairsToProof(pairs), lane) : 0;
  // Tech leveling is its own engineering ladder (L0–L5) — never the vaidya
  // growth stages. Same thresholds family as the old console ranks.
  const eng = engLevelFor(main);
  const loop = onboardingProgress({
    profileDone: Boolean(p.track && p.skills && p.goal),
    resumeDone: Boolean(result),
    interviewDone: interviewBest > 0,
  });
  // The single next action. Hero CTA, reminder card, and footer loop all
  // read this one value, so the page can never point two ways at once.
  const step = nextStep({
    profileDone: Boolean(p.track && p.skills && p.goal),
    resumeDone: Boolean(result),
    questsDone: pairs > 0,
    interviewDone: interviewBest > 0,
    appliedCount: funnel?.applied || 0,
  });
  const topJobs = matchJobs(lane, main, found, TECH_JOBS).slice(0, 3);
  const skills = String(p.skills || "").split(",").map((s) => s.trim()).filter(Boolean);
  const roleName = ROLES[lane]?.label || "your track";

  const stats = [
    { icon: cilChart, tone: "blurple", label: "Readiness", value: result ? `${main}/100` : "—" },
    { icon: cilBadge, tone: "zinc", label: "Skills proven", value: String(found.length || skills.length) },
    { icon: cilChatBubble, tone: "amber", label: "Interview best", value: interviewBest > 0 ? String(interviewBest) : "—" },
    { icon: cilCheckCircle, tone: "zinc", label: "Quest pairs", value: String(pairs) },
  ];

  return (
    <Page
      title="Your home"
      sub={
        result
          ? `${roleName} · readiness ${main}/100 · ${eng.label}`
          : `${roleName} · score a resume to start the loop`
      }
    >
      {/* fresh device: the loop as a table of contents, dismissable */}
      {loop.total === 0 && <FirstRun lang="en" className="mb-4" />}
      {/* hero band */}
      <Reveal>
        <section className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 px-5 py-6 sm:px-7">
          <div className="bg-dither-blurple mask-hero-fade pointer-events-none absolute inset-0" aria-hidden />
          <div className="pointer-events-none absolute -bottom-24 -right-24 size-72 rounded-full bg-blurple/25 blur-3xl" aria-hidden />
          <div className="relative">
          <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-blurple-soft">
            <CIcon icon={cilDescription} width={14} height={14} /> Tech command center
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-5">
            <div className="min-w-0">
              <h2 className="font-display text-2xl font-bold leading-tight text-zinc-50 sm:text-3xl">
                {p.track ? `On the ${roleName} track.` : "Pick your track and start scoring."}
              </h2>
              <p className="mt-1 max-w-md text-sm leading-6 text-zinc-400">
                {loop.total < 100
                  ? `Profile ${loop.total}% — finish the loop and recruiters read proof, not promises.`
                  : "Full loop done. Today's board: one quest, one application, one question for the coach."}
              </p>
              <div className="mt-3 flex max-w-xs items-center gap-1" aria-hidden>
                {[40, 30, 30].map((w, i) => (
                  <span key={i} className={`h-1.5 rounded-full ${loop.total >= 100 || (i === 0 && loop.total >= 40) || (i === 1 && loop.total >= 70) ? "bg-blurple" : "bg-zinc-800"}`} style={{ flex: w }} />
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Btn to={step.to}>
                  {t("en", `next.${step.id}.title`)} <CIcon icon={cilArrowRight} width={15} height={15} />
                </Btn>
                <Btn to="/home?chat=1" variant="quiet">
                  Ask the coach
                </Btn>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Ring value={main} />
              <span className="inline-flex items-center gap-1 rounded-full bg-blurple/15 px-2.5 py-1 text-[11px] font-semibold text-blurple-soft" title={eng.note}>
                <CIcon icon={cilFire} width={12} height={12} /> {eng.label}
              </span>
            </div>
          </div>
          </div>
        </section>
      </Reveal>

      {/* stat strip */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="flex items-center gap-3 p-4">
            <IconTile tone={s.tone}><CIcon icon={s.icon} width={18} height={18} /></IconTile>
            <div>
              <p className="font-display text-xl font-bold tabular-nums text-zinc-50">{s.value}</p>
              <p className="text-xs text-zinc-500">{s.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {loop.total < 100 && (
        <NextStep step={step} lang="en" className="mt-4" />
      )}

      {/* proof of work */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <StreakMeter />
        <XpMeter />
      </div>

      {/* today's moves */}
      <SectionHead kicker="Today" title="Today's moves" className="mt-6" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Reveal>
          <Card className="flex h-full flex-col">
            <div className="mb-2 flex items-center gap-2.5">
              <IconTile tone="amber"><CIcon icon={cilBook} width={18} height={18} /></IconTile>
              <H2 className="mb-0">Move 1 — learn</H2>
            </div>
            {missing.length === 0 && !result ? (
              <p className="text-sm leading-6 text-zinc-400">Score your resume and gaps turn into quests here.</p>
            ) : missing.length === 0 ? (
              <p className="text-sm leading-6 text-zinc-400">No gaps. Interview prep is your next win.</p>
            ) : (
              <ul className="space-y-2">
                {missing.slice(0, 3).map((s) => (
                  <li key={s} className="rounded-xl border border-zinc-800 px-3 py-2">
                    <p className="text-sm font-semibold capitalize text-zinc-100">{s}</p>
                    <p className="truncate text-xs text-zinc-500">{coursesFor(s)[0]?.t || "Free quest in the quest list"}</p>
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
              <IconTile tone="blurple"><CIcon icon={cilBriefcase} width={18} height={18} /></IconTile>
              <H2 className="mb-0">Move 2 — apply</H2>
            </div>
            <ul className="space-y-2">
              {topJobs.map((j) => (
                <li key={j.id} className="rounded-xl border border-zinc-800 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-zinc-100">{j.title}</p>
                    <Chip tone={j.eligible ? "green" : "amber"}>{j.eligible ? "eligible" : `${j.minScore} needed`}</Chip>
                  </div>
                  <p className="text-xs text-zinc-500">{j.company} · {j.type}</p>
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-3"><Btn to="/jobs" variant="quiet" size="sm">All internships & jobs <CIcon icon={cilArrowRight} width={14} height={14} /></Btn></div>
          </Card>
        </Reveal>

        <Reveal delay={0.12}>
          <Card className="flex h-full flex-col">
            <div className="mb-2 flex items-center gap-2.5">
              <IconTile tone="blurple"><CIcon icon={cilChatBubble} width={18} height={18} /></IconTile>
              <H2 className="mb-0">Move 3 — ask</H2>
            </div>
            <p className="flex items-start gap-1.5 text-sm leading-6 text-zinc-300">
              <CIcon icon={cilCheckCircle} width={15} height={15} className="mt-1 shrink-0 text-blurple-soft" />
              {p.track ? `Coached for your ${roleName} track` : "Coached on your answers"}
              {missing[0] ? ` — biggest gap today: ${missing[0]}.` : "."}
            </p>
            <p className="mt-2 flex items-start gap-1.5 text-sm leading-6 text-zinc-300">
              <CIcon icon={cilCheckCircle} width={15} height={15} className="mt-1 shrink-0 text-blurple-soft" />
              Lives in the bottom-right bubble, on every screen.
            </p>
            <div className="mt-auto pt-3"><Btn to="/home?chat=1" size="sm">Ask the coach <CIcon icon={cilArrowRight} width={14} height={14} /></Btn></div>
          </Card>
        </Reveal>
      </div>
    </Page>
  );
}
