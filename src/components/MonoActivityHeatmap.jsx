// MonoActivityHeatmap — vendored from @subhanhq/amicro (mono-activity-purple).
// The published npm tarball ships no CLI binary, so `npx @subhanhq/amicro add`
// cannot run; this is the copy-to-code equivalent, adapted to Avsar conventions:
// cn from ./ui.jsx, exact transition props (no transition-all), live app data
// via the `days` prop with demo fallback, purple accent by default.
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { cn } from "./ui.jsx";
import { levelFor } from "../lib/streak.js";

function isoOf(d) {
  return d.toISOString().slice(0, 10);
}

function demoContributions(weeks) {
  const today = new Date();
  return Array.from({ length: weeks * 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (weeks * 7 - 1 - i));
    const rand = Math.random();
    let level = 0;
    let count = 0;
    if (rand > 0.35) {
      level = Math.floor(Math.random() * 4 + 1);
      count = level * 3 + Math.floor(Math.random() * 4);
    }
    return { date: isoOf(date), count, level };
  });
}

// Real app data: date -> count map (see collectDayCounts in lib/streak.js).
// Buckets reuse levelFor so this grid agrees with StreakMeter.
function liveContributions(days, weeks) {
  const today = new Date();
  return Array.from({ length: weeks * 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (weeks * 7 - 1 - i));
    const key = isoOf(date);
    const count = Number(days[key]) || 0;
    return { date: key, count, level: levelFor(count) };
  });
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function MonoActivityHeatmap({
  theme = "dark",
  accentColor = "purple",
  compact = false,
  weeks = 20,
  days = null,
}) {
  const isDark = theme === "dark";
  const [hoveredDay, setHoveredDay] = useState(null);

  const data = useMemo(
    () => (days ? liveContributions(days, weeks) : demoContributions(weeks)),
    [days, weeks]
  );
  const cols = useMemo(() => {
    const out = [];
    for (let i = 0; i < data.length; i += 7) out.push(data.slice(i, i + 7));
    return out;
  }, [data]);

  const total = useMemo(() => data.reduce((sum, d) => sum + d.count, 0), [data]);

  const color = useMemo(() => {
    switch (accentColor) {
      case "green":
        return { bg: "#39d353", badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30", label: "Emerald Matrix" };
      case "blue":
        return { bg: "#3b82f6", badge: "bg-blue-500/20 text-blue-400 border-blue-500/30", label: "Sky Blue Grid" };
      case "purple":
        return { bg: "#a855f7", badge: "bg-purple-500/20 text-purple-400 border-purple-500/30", label: "Violet Pulse" };
      case "mono":
      default:
        return { bg: isDark ? "#FFFFFF" : "#09090B", badge: "bg-white/10 text-white border-white/20", label: "Monochrome Heat" };
    }
  }, [accentColor, isDark]);

  const opacityFor = (lvl) => {
    switch (lvl) {
      case 0: return isDark ? 0.06 : 0.08;
      case 1: return 0.3;
      case 2: return 0.55;
      case 3: return 0.8;
      default: return 1;
    }
  };

  return (
    <div
      className={cn(
        "group relative flex w-full flex-col justify-between overflow-hidden rounded-[24px] p-4 font-sans transition-[background-color,box-shadow] duration-300 sm:p-5",
        compact ? "h-[220px] sm:h-[268px]" : "min-h-[290px]",
        isDark
          ? "bg-[#181818] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:bg-[#202020]"
          : "border border-neutral-100 bg-white text-black shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_6px_24px_rgba(0,0,0,0.06)]"
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-neutral-400" : "text-neutral-500")}>
              Activity Heatmap
            </span>
            <span className={cn("inline-flex items-center rounded-full border px-1.5 py-0.5 font-mono text-[10px]", color.badge)}>
              {color.label}
            </span>
          </div>
          <div className="mt-0.5 font-sans text-xl font-bold tabular-nums tracking-tight">
            {total} <span className="text-xs font-normal opacity-70">contributions</span>
          </div>
        </div>
      </div>

      <div className={cn(
        "relative flex w-full flex-1 flex-col items-center justify-center overflow-hidden rounded-[14px] p-3 transition-colors duration-300",
        isDark ? "bg-[#131313]" : "bg-[#f4f4f6]"
      )}>
        <div className="mb-2 flex w-[277px] max-w-full items-center justify-between px-1">
          {MONTH_NAMES.slice(0, 5).map((m, idx) => (
            <span key={idx} className={cn("flex-1 text-center font-mono text-[10px]", isDark ? "text-neutral-400" : "text-neutral-500")}>
              {m}
            </span>
          ))}
        </div>

        <div
          className="flex w-auto max-w-full items-center justify-center gap-[3px] overflow-x-auto py-1"
          onPointerLeave={() => setHoveredDay(null)}
        >
          {cols.map((week, wIdx) => (
            <div key={wIdx} className="flex shrink-0 flex-col items-center gap-[3px]">
              {week.map((day, dIdx) => (
                <motion.div
                  key={`${wIdx}-${dIdx}`}
                  onPointerEnter={() => setHoveredDay(day)}
                  onPointerDown={() => setHoveredDay(day)}
                  className="h-[10px] min-h-[10px] w-[10px] min-w-[10px] cursor-pointer rounded-[2px] transition-[background-color,opacity] duration-150 ease-out sm:h-[11px] sm:min-h-[11px] sm:w-[11px] sm:min-w-[11px]"
                  style={{ backgroundColor: color.bg, opacity: opacityFor(day.level) }}
                  whileHover={{ scale: 1.35, zIndex: 10 }}
                />
              ))}
            </div>
          ))}
        </div>

        <div className="mt-2 flex h-5 items-center justify-center">
          {hoveredDay ? (
            <span className={cn("font-mono text-[10px]", isDark ? "text-neutral-300" : "text-neutral-700")}>
              {hoveredDay.count} {hoveredDay.count === 1 ? "item" : "items"} on {hoveredDay.date}
            </span>
          ) : (
            <span className={cn("font-mono text-[10px]", isDark ? "text-neutral-400" : "text-neutral-500")}>
              Hover tiles for metrics
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-1 font-mono text-[11px]">
        <span className={isDark ? "text-neutral-400" : "text-neutral-600"}>
          {weeks} Weeks x 7 Days Grid
        </span>
        <span className={isDark ? "font-medium text-white" : "font-medium text-black"}>
          Avsar Activity
        </span>
      </div>
    </div>
  );
}
