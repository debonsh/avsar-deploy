// StreakMeter: GitHub-style heatmap + flame count. Reads the activity the app
// already stores (quest ticks, quiz/interview days, applications) — no new
// tracking to wire. Centered grid, month labels, today ring, per-day
// breakdowns. Empty state points at the first action, never shames.
import { useMemo } from "react";
import CIcon from "@coreui/icons-react";
import { cilFire } from "@coreui/icons";
import { Card } from "./ui.jsx";
import { collectDayCounts, collectDayDetail, heatmapWeeks, currentStreak, totalActive, dayISO } from "../lib/streak.js";

const KIND_LABEL = {
  quest: "quest ticks", quiz: "quiz answers", interview: "interview answers",
  resume: "resume scores", saved: "saves", applied: "applications", pipeline: "pipeline moves",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function StreakMeter({ weeks = 16 }) {
  const counts = useMemo(() => collectDayCounts(), []);
  const detail = useMemo(() => collectDayDetail(), []);
  const cols = useMemo(() => heatmapWeeks(counts, weeks), [counts, weeks]);
  const streak = currentStreak(counts);
  const total = totalActive(counts);
  const contributions = Object.values(counts).reduce((a, b) => a + b, 0);
  const today = dayISO();

  const monthAt = (wi) => {
    const first = cols[wi][0].date;
    const prev = wi > 0 ? cols[wi - 1][0].date : null;
    if (prev && first.slice(0, 7) === prev.slice(0, 7)) return "";
    return MONTHS[Number(first.slice(5, 7)) - 1];
  };

  const tip = (d) => {
    const parts = Object.entries((detail[d.date] || {}).kinds || {})
      .filter(([, n]) => n > 0)
      .map(([k, n]) => `${n} ${KIND_LABEL[k] || k}`);
    return parts.length ? `${parts.join(", ")} on ${d.date}` : `No activity on ${d.date}`;
  };

  return (
    <Card>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <span className={`inline-flex size-8 items-center justify-center rounded-xl ${streak > 0 ? "bg-amber-100 text-amber-800" : "bg-stone-100 text-stone-400"}`} aria-hidden>
            <CIcon icon={cilFire} width={16} height={16} />
          </span>
          {streak > 0 ? `${streak}-day streak` : "No streak yet"}
        </p>
        <p className="font-mono text-xs tabular-nums text-zinc-500">
          {contributions} contribution{contributions === 1 ? "" : "s"} · {total} active day{total === 1 ? "" : "s"}
        </p>
      </div>
      {total === 0 ? (
        <p className="text-sm leading-6 text-zinc-400">
          Tick a quest, finish a quiz, or save an application — today becomes day one.
        </p>
      ) : (
        <div className="overflow-x-auto pb-1" role="img" aria-label={`Activity heatmap, ${contributions} contributions, ${streak} day streak`}>
          <div className="mx-auto w-max">
            <div className="flex gap-[3px]">
              {cols.map((col, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  <span className="h-3.5 text-[9px] font-medium tabular-nums text-zinc-500" aria-hidden>
                    {monthAt(wi)}
                  </span>
                  {col.map((d) => (
                    <span
                      key={d.date}
                      title={tip(d)}
                      className={`size-3.5 rounded-[4px] heat-${d.level} transition-transform hover:scale-125 hover:ring-1 hover:ring-emerald-600 ${d.date === today ? "ring-1 ring-emerald-700" : ""}`}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-end gap-1 text-[11px] text-zinc-500">
              Less
              {[0, 1, 2, 3, 4].map((l) => (
                <span key={l} className={`size-3 rounded-[3px] heat-${l}`} aria-hidden />
              ))}
              More
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
