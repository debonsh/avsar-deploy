// Landing figs — proof windows rebuilt on the Ticket primitive.
// Same demo data the pages use, square chrome, mono labels. No page logic here.
import { Check } from "lucide-react";
import { Badge, CountUp, Meter, Ticket } from "../ui.jsx";

export function ScoreFig() {
  const rows = [
    { label: "Skills match", value: 82 },
    { label: "Experience", value: 64 },
    { label: "Projects", value: 71 },
    { label: "Education", value: 90 },
  ];
  const fixes = [
    "Add numbers to 2 project bullets",
    "Name the missing skill: REST APIs",
    "Move GitHub above Education",
  ];
  return (
    <Ticket label="fig.01 // avsar.app/resume" status="resume score 72/95">
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <p className="text-sm font-semibold text-zinc-100">resume score</p>
          <p className="mt-1 font-display text-5xl font-bold tabular-nums text-zinc-50">
            <CountUp to={72} />
            <span className="text-lg text-zinc-500">/95</span>
          </p>
          <div className="mt-4 space-y-2.5">
            {rows.map((r) => (
              <div key={r.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-zinc-300">{r.label}</span>
                  <span className="font-mono tabular-nums text-zinc-500">{r.value}</span>
                </div>
                <Meter value={r.value} max={100} />
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-zinc-800 pt-4 md:border-l md:border-t-0 md:pl-6 md:pt-0">
          <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
            3 fixes that raise it
          </p>
          <ul className="mt-3 space-y-2.5">
            {fixes.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm leading-6 text-zinc-200">
                <Check className="mt-1 size-4 shrink-0 text-blurple-soft" strokeWidth={3} aria-hidden />
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {["React", "REST APIs", "SQL"].map((s) => (
              <Badge key={s} tone={s === "REST APIs" ? "amber" : "green"}>
                {s}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </Ticket>
  );
}

export function QuestFig() {
  const items = [
    { t: "Finish the REST APIs course", done: true },
    { t: "Ship a CRUD mini project", done: true },
    { t: "Add proof link to portfolio", done: false },
  ];
  return (
    <Ticket label="FIG.02 // avsar.app/quests" status="Week 1 · 2/3 done">
      <Meter value={2} max={3} />
      <ul className="mt-4 space-y-1">
        {items.map((i) => (
          <li key={i.t} className="flex items-center gap-2.5 px-2 py-1.5 text-sm">
            <span
              className={`flex size-5 shrink-0 items-center justify-center border ${
                i.done ? "border-blurple bg-blurple" : "border-zinc-700"
              }`}
              aria-hidden
            >
              {i.done && <Check className="size-3.5 text-white" strokeWidth={3} />}
            </span>
            <span className={i.done ? "text-zinc-500 line-through" : "text-zinc-200"}>{i.t}</span>
          </li>
        ))}
      </ul>
    </Ticket>
  );
}

export function PipelineFig() {
  const cols = [
    { h: "Applied", items: ["Frontend Intern · Zeta", "SDE Trainee · TCS"] },
    { h: "Interview", items: ["Web Intern · Razorpay"] },
    { h: "Offer", items: [] },
  ];
  return (
    <Ticket label="FIG.03 // avsar.app/jobs" status="3 tracked">
      <div className="grid gap-3 sm:grid-cols-3">
        {cols.map((c) => (
          <div key={c.h}>
            <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
              {c.h} · {c.items.length}
            </p>
            <div className="mt-2 space-y-2">
              {c.items.map((j) => (
                <p key={j} className="border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs leading-5 text-zinc-200">
                  {j}
                </p>
              ))}
              {c.items.length === 0 && (
                <p className="border border-dashed border-zinc-800 px-3 py-2 text-xs text-zinc-600">
                  Nothing here yet
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </Ticket>
  );
}
