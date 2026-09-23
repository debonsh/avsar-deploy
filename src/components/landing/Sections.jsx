// Landing sections — problem strip, coach tease, v2 board preview, trio, boot cta.
// Static copy + links only; chat state stays in coach-widget.jsx.
// Voice: all lowercase mono-ish. no em dashes.
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { AsciiRule, Badge, Btn, Reveal, TermWindow, Ticket } from "../ui.jsx";

export function ProblemStrip() {
  const pains = [
    { k: "students", v: "no one names the exact skills your dream role screens for." },
    { k: "industry", v: "resumes pile up with no skill signal worth shortlisting on." },
    { k: "faculty", v: "no window into which industry skills to teach next semester." },
  ];
  return (
    <div className="border-t border-zinc-800 pt-10">
      <AsciiRule label="the gap" />
      <ul className="mt-4 space-y-2">
        {pains.map((p) => (
          <li key={p.k} className="font-mono text-sm leading-6 text-zinc-400">
            <span className="text-blurple-soft">[{p.k}]</span> {p.v}
          </li>
        ))}
      </ul>
      <p className="mt-3 font-mono text-sm leading-6 text-zinc-200">
        avsar closes it: one shared skill language across campus and industry.
      </p>
    </div>
  );
}

export function CoachFig() {
  return (
    <Ticket label="fig.04 // coach" status="offline_ok">
      <TermWindow url="avsar.app/?chat=1">
        <p className="text-zinc-500">{"you> how do i fix my resume?"}</p>
        <p className="mt-2">
          {"coach>"} <span className="text-zinc-100">3 fixes, biggest first:</span>
        </p>
        <p>{"[1] numbers on 2 bullets [2] name rest apis [3] github above education"}</p>
        <p className="mt-2 text-zinc-500">{"you> write my cover letter"}</p>
        <p className="mt-2">
          {"coach-ai>"} <span className="text-blurple-soft">drafted + saved to artifacts.</span>
        </p>
      </TermWindow>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {["review", "match", "cover", "mentor", "ask"].map((a) => (
          <Badge key={a}>[{a}]</Badge>
        ))}
      </div>
      <Link
        to="/?chat=1"
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blurple-soft hover:text-zinc-100"
      >
        open coach <ArrowRight className="size-4" aria-hidden />
      </Link>
    </Ticket>
  );
}

export function ClanSim() {
  const rows = [
    { c: "govt polytechnic pune", s: "312" },
    { c: "vjti mumbai", s: "298" },
    { c: "coep tech", s: "281" },
  ];
  return (
    <div className="border border-zinc-800 bg-zinc-950 opacity-70" aria-label="Season board v2 preview">
      <div className="flex items-center justify-between gap-4 border-b border-zinc-800 px-4 py-2">
        <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
          season board — v2 preview
        </span>
        <span className="inline-flex items-center border border-sage/40 bg-sage/10 px-2 py-0.5 font-mono text-xs font-medium tabular-nums text-sage">
          [SIMULATED]
        </span>
      </div>
      <ul className="divide-y divide-zinc-800 px-4">
        {rows.map((r, i) => (
          <li key={r.c} className="flex items-center justify-between py-2.5 text-sm">
            <span className="font-mono tabular-nums text-zinc-600">0{i + 1}</span>
            <span className="flex-1 px-3 text-zinc-400">{r.c}</span>
            <span className="font-mono tabular-nums text-zinc-400">{r.s}</span>
          </li>
        ))}
      </ul>
      <p className="border-t border-zinc-800 px-4 py-2 font-mono text-[11px] text-zinc-600">
        {"// a sketch of clan seasons. solo stays ladder-free."}
      </p>
    </div>
  );
}

export function Trio({ items }) {
  return (
    <div className="grid gap-8 border-t border-zinc-800 pt-10 sm:grid-cols-3 sm:gap-6">
      {items.map((t, i) => (
        <Reveal key={t.title} delay={i * 0.06}>
          <AsciiRule label={`0${i + 1}`} />
          <h2 className="mt-3 font-display text-lg font-bold text-zinc-50">{t.title}</h2>
          <p className="mt-2 max-w-md text-pretty text-sm leading-6 text-zinc-400">{t.body}</p>
        </Reveal>
      ))}
    </div>
  );
}

export function BootCta() {
  return (
    <Reveal>
      <div className="border border-zinc-600 bg-zinc-950 px-6 py-12 text-center sm:py-16">
        <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
          {"// boot_sequence"}
        </p>
        <h2 className="mx-auto mt-3 max-w-lg text-balance font-display text-3xl font-bold tracking-[-0.02em] text-zinc-50 sm:text-4xl">
          your next opportunity starts with one honest score.
        </h2>
        <p className="mx-auto mt-3 max-w-md text-pretty font-mono text-xs leading-6 text-zinc-500">
          step 1: score → step 2: quest → step 3: track. one evening, that is the whole onboarding.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <Btn to="/resume" size="lg" className="rounded-none">
            [score your resume] <ArrowRight aria-hidden />
          </Btn>
          <Btn to="/quests" variant="quiet" size="lg" className="rounded-none">
            [close your gaps]
          </Btn>
        </div>
      </div>
    </Reveal>
  );
}
