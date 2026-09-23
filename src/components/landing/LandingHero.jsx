// Landing hero — shipping-site panel over a living fractal map, system24 voice.
// DM Mono light, ASCII channel title, prompt headline with block cursor,
// 2px panel, panel labels, palette switch [MONO] [HARBOR] [RAINBOW].
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { Btn } from "../ui.jsx";
import { useAvsar } from "../../app/store.jsx";
import FractalMap from "./FractalMap.jsx";

const NAV = [
  { label: "score", to: "/resume" },
  { label: "quests", to: "/quests" },
  { label: "roles", to: "/jobs" },
  { label: "coach", to: "/interview" },
];

const PALETTES = ["mono", "harbor", "rainbow"];

function NextStep() {
  const { resume, events } = useAvsar();
  const step = !resume
    ? { n: "step 1", text: "score your resume", to: "/resume" }
    : (events?.length || 0) === 0
      ? { n: "step 2", text: "close your first gap", to: "/quests" }
      : { n: "step 3", text: "track an application", to: "/jobs" };
  return (
    <p className="mt-5 font-mono text-xs tabular-nums text-zinc-500">
      {`> ${step.n}: `}
      <Link to={step.to} className="text-blurple-soft underline underline-offset-4 hover:text-zinc-100">
        {step.text} →
      </Link>
    </p>
  );
}

export default function LandingHero({ palette, setPalette }) {
  return (
    <section className="relative overflow-hidden border-b border-zinc-800" aria-label="Intro">
      {/* living fractal map full-bleed behind panel */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <FractalMap palette={palette} className="absolute inset-0 h-full w-full opacity-80" />
        <div className="hatch-lines absolute inset-0 opacity-30" />
      </div>

      <div className="relative mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-widest text-zinc-600">
          {"// FIG.00 — hero"}
        </p>
        <div className="border-2 border-zinc-700 bg-panel/95">
          {/* mono nav row, shipping style */}
          <div className="flex items-center justify-between gap-4 border-b border-zinc-800 px-4 py-2.5">
            <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
              # avsar · singleplayer · offline_ok
            </span>
            <nav className="hidden items-center gap-4 sm:flex" aria-label="Primary">
              {NAV.map((n) => (
                <Link
                  key={n.label}
                  to={n.to}
                  className="font-mono text-[11px] uppercase tracking-widest text-zinc-400 hover:text-zinc-100"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
            <Link
              to="/resume"
              className="border border-zinc-700 bg-zinc-950 px-2.5 py-1 font-mono text-[11px] uppercase tracking-widest text-zinc-200 hover:border-zinc-500"
            >
              log in → score
            </Link>
          </div>

          {/* ascii title + prompt headline */}
          <div className="px-4 py-10 text-center sm:px-8 sm:py-14">
            <p className="inline-block border border-zinc-800 bg-zinc-950 px-3 py-1 font-mono text-[11px] tabular-nums text-zinc-400">
              free for students · no account needed
            </p>
            <h1 className="mx-auto mt-6 max-w-3xl text-balance font-mono text-4xl font-normal leading-[1.08] text-zinc-50 sm:text-6xl">
              <span className="text-blurple-soft">{">"} </span>
              your degree, translated into an offer letter.
              <span className="cursor-blink" aria-hidden />
            </h1>
            <p className="mt-4 font-mono text-xs tabular-nums text-zinc-500">
              resume score 0–95 · 5 dimensions · every point traced to a resume line
            </p>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-7 text-zinc-400">
              score your resume in plain language, close each gap with a free
              course and a verified project, and track every application in one pipeline.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
              <Btn to="/resume" size="lg" className="rounded-none">
                [score your resume] <ArrowRight aria-hidden />
              </Btn>
              <Link to="/jobs" className="font-mono text-xs text-zinc-500 underline underline-offset-4 hover:text-zinc-200">
                or browse open roles →
              </Link>
            </div>
            <NextStep />
            <p className="mt-3 font-mono text-xs text-zinc-600">
              bams student? <Link to="/ayush" className="text-blurple-soft underline underline-offset-4 hover:text-zinc-100">enter the ayush door →</Link> {/* [ayush-door] rollback: delete block */}
            </p>
          </div>

          {/* status footer + palette switch */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800 px-4 py-2">
            <span className="font-mono text-[11px] tabular-nums text-zinc-600">
              {palette === "rainbow"
                ? "[*] fractal_map v1 · live · rainbow"
                : "[*] fractal_map v1 · live · pixel 10 · seed 7"}
            </span>
            <div className="flex gap-1" role="group" aria-label="Map palette">
              {PALETTES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPalette(p)}
                  aria-pressed={palette === p}
                  className={`border px-2 py-0.5 font-mono text-[11px] uppercase tracking-widest ${
                    palette === p
                      ? "border-blurple bg-blurple/15 text-blurple-soft"
                      : "border-zinc-800 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
                  }`}
                >
                  [{p}]
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
