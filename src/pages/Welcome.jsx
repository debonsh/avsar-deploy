// Avsar 2026 front door. One question, one tap, one portal: pick a side and
// land straight on that portal's own home (AyushHome / TechHome at /home).
// The pick is one string in localStorage; Profile can switch it later.
// Pre-portal the app owns a dark floor, always — this page is a dark hero.
import { useState } from "react";
import { useNavigate } from "react-router";
import { Sprout, Cpu, Compass, ArrowRight, ArrowUpRight, Target, Flame, Briefcase } from "lucide-react";
import { Page, Btn } from "../components/ui.jsx";
import { useAvsar } from "../app/store.jsx";
import { TRACKS } from "../lib/track.js";
import { ROUTER_QS, recommendTrack } from "../lib/onboarding.js";
import { dashboardFor } from "../lib/rbac.js";

const OPT_STYLE = {
  ayush: {
    badge: "bg-emerald-500/15 text-emerald-300",
    ring: "hover:border-emerald-500/60",
    glow: "group-hover:bg-emerald-500/10",
  },
  tech: {
    badge: "bg-blurple/15 text-blurple-soft",
    ring: "hover:border-blurple/70",
    glow: "group-hover:bg-blurple/10",
  },
  other: {
    badge: "bg-zinc-800 text-zinc-300",
    ring: "hover:border-zinc-500",
    glow: "group-hover:bg-zinc-800",
  },
};

const OPT_ICON = { ayush: Sprout, tech: Cpu, other: Compass };

export default function Welcome() {
  const { track, role, setTrack, setRole } = useAvsar();
  const nav = useNavigate();
  const [who, setWho] = useState(null);
  const rec = who ? recommendTrack({ who }) : null;

  // One tap assigns the portal AND lands on its home — no confirm screen, no
  // detour. Each home funnels unfinished setup (profile %, journey) itself.
  // A portal pick is a student-side choice: a lingering professional desk role
  // would bounce every engine route back to the desk, so it resets to student.
  // The desk is one Profile role-step away whenever it is actually wanted.
  function go(id) {
    if (["industry", "faculty", "institute"].includes(role)) setRole("student");
    setTrack(id);
    nav("/home");
  }

  return (
    <Page title="" sub="">
      {/* hero: dual-universe gradient, dot grid, mono status strip */}
      <section className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 px-5 py-10 sm:px-10 sm:py-14">
        <div className="bg-dither mask-hero-fade pointer-events-none absolute inset-0" aria-hidden />
        <div className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-emerald-500/20 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-24 -right-24 size-72 rounded-full bg-blurple/25 blur-3xl" aria-hidden />
        <div className="relative">
          <p className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] uppercase tracking-widest text-zinc-500">
            <span>Avsar 2026 // SIH 2026</span>
            <span className="text-blurple-soft">internships · upskilling · gamified</span>
          </p>
          <h1 className="mt-4 max-w-xl text-balance font-display text-3xl font-bold leading-[1.05] tracking-tight text-zinc-50 sm:text-5xl">
            Internships find you when your skills prove it.
          </h1>
          <p className="mt-3 max-w-lg text-pretty text-sm leading-6 text-zinc-400 sm:text-[15px]">
            Score your resume, close gaps with quests, streaks, and XP — then
            apply to match-scored internships with proof, not promises. Vaidya
            (AYUSH) or Tech: pick a side, one tap sets it all.
          </p>
          {/* the loop: assess → upskill → intern, numbered rail */}
          <ol className="mt-6 grid gap-2 sm:grid-cols-3">
            {[
              { n: "01", icon: Target, title: "Assess", body: "Resume score + quiz becomes a skill passport" },
              { n: "02", icon: Flame, title: "Upskill", body: "Quests, streaks, and XP close each gap" },
              { n: "03", icon: Briefcase, title: "Intern", body: "Match-scored roles, apply and track" },
            ].map((s) => (
              <li key={s.title} className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 px-3.5 py-3">
                <p className="font-mono text-[10px] tracking-widest text-zinc-600">{s.n}</p>
                <p className="mt-2 flex items-center gap-2.5">
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-zinc-300" aria-hidden>
                    <s.icon className="size-4" />
                  </span>
                  <span className="text-xs font-bold text-zinc-100">{s.title}</span>
                </p>
                <p className="mt-1.5 text-[11px] leading-4 text-zinc-500">{s.body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex items-center gap-3 font-mono text-[11px] uppercase tracking-widest" aria-hidden>
            <span className="flex items-center gap-1.5 text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-400" /> Vaidya
            </span>
            <span className="h-px w-8 bg-zinc-800" />
            <span className="flex items-center gap-1.5 text-blurple-soft">
              <span className="size-1.5 rounded-full bg-blurple" /> Tech
            </span>
          </div>
        </div>
      </section>

      {/* proof, not promises: checkable engine facts, no invented metrics */}
      <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["75", "skills mapped"],
          ["08", "domains"],
          ["05", "score dimensions"],
          ["04", "steps in the loop"],
        ].map(([v, l]) => (
          <div key={l} className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3.5">
            <dd className="font-display text-2xl font-bold tabular-nums text-zinc-50">{v}</dd>
            <dt className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-zinc-500">{l}</dt>
          </div>
        ))}
      </dl>

      {track && (
        <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
          <p className="text-sm text-zinc-300">
            You are already set up on the <strong className="text-zinc-100">{track === "ayush" ? "Vaidya" : "Tech"}</strong> portal.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Btn size="sm" to={dashboardFor(track, role)}>Continue to dashboard</Btn>
            <Btn size="sm" variant="quiet" to="/profile">Edit profile</Btn>
          </div>
        </div>
      )}

      {/* the one question */}
      <p className="mb-3 mt-8 font-mono text-[11px] uppercase tracking-widest text-zinc-500">
        <span className="text-blurple-soft">01</span> — who are you?
      </p>
      <h2 className="font-display text-xl font-bold tracking-tight text-zinc-50 sm:text-2xl">
        {ROUTER_QS[0].q}
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {ROUTER_QS[0].opts.map((o, i) => {
          const st = OPT_STYLE[o.id] || OPT_STYLE.other;
          const Icon = OPT_ICON[o.id] || Compass;
          const active = who === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => (o.track ? go(o.track) : setWho(o.track ? null : o.id))}
              aria-pressed={active}
              className={`group relative flex min-h-[168px] flex-col overflow-hidden rounded-xl border bg-zinc-950 p-4 text-left transition-all active:scale-[0.99] ${
                active ? "border-blurple bg-blurple/10" : `border-zinc-800 ${st.ring}`
              }`}
            >
              <span className={`pointer-events-none absolute inset-0 transition-colors ${st.glow}`} aria-hidden />
              <span className="relative flex items-center justify-between" aria-hidden>
                <span className={`inline-flex size-9 items-center justify-center rounded-xl ${st.badge}`}>
                  <Icon className="size-[18px]" />
                </span>
                <span className="font-mono text-[10px] tracking-widest text-zinc-600">0{i + 1}</span>
              </span>
              <span className="relative mt-3 block text-sm font-bold text-zinc-100">{o.label}</span>
              {o.hint && <span className="relative mt-1 block text-xs leading-5 text-zinc-500">{o.hint}</span>}
              <span className="relative mt-auto inline-flex items-center gap-1 pt-3 text-xs font-semibold text-zinc-400 transition-colors group-hover:text-zinc-100">
                Enter <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
            </button>
          );
        })}
      </div>

      {rec && rec.track === "undecided" && (
        <div className="mt-4 rounded-xl border border-dashed border-zinc-700 bg-zinc-950 p-4">
          <p className="text-sm text-zinc-300">Exploring? Compare both homes first — pick the one that pulls you.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {TRACKS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => go(t.id)}
                className="group rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-left transition-colors hover:border-blurple/60"
              >
                <span className="flex items-center justify-between gap-2 text-sm font-bold text-zinc-100">
                  {t.id === "ayush" ? "Vaidya (AYUSH)" : "Tech"}
                  <ArrowUpRight className="size-4 text-zinc-500 transition-colors group-hover:text-blurple-soft" aria-hidden />
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-zinc-500">{t.blurb}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="mt-6 text-xs leading-5 text-zinc-600">
        Nothing to install, nothing to sign in to. Answers stay on this device until you
        connect a Google account for backup.
      </p>
    </Page>
  );
}
