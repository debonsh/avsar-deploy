// Mono area + stream charts — amicro `mono-rounded-area` / `mono-rounded-stream`
// designs, re-implemented with zero dependencies. The originals need recharts
// (which this project deliberately avoids: offline demo, small bundle), so the
// same card chrome, gradient fills and curve toggle are drawn as plain SVG.
// Data arrives via props, so every number on screen comes from the caller.
import { useId, useMemo, useState } from "react";
import { cn } from "./ui.jsx";

function bounds(values) {
  const max = Math.max(0, ...values);
  return Math.max(1, max);
}

// Catmull-Rom to bezier: the `natural` spline amicro uses on its waves.
function smoothPath(pts) {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

function linePath(pts) {
  if (pts.length < 2) return "";
  return `M${pts.map((p) => `${p[0]},${p[1]}`).join("L")}`;
}

function Shell({ theme, compact, children }) {
  const isDark = theme === "dark";
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
      {children}
    </div>
  );
}

function Stage({ theme, children }) {
  const isDark = theme === "dark";
  return (
    <div className={cn(
      "relative w-full flex-1 overflow-hidden rounded-[14px] p-2 transition-colors duration-300",
      isDark ? "bg-[#131313]" : "bg-[#f4f4f6]"
    )}>
      {children}
    </div>
  );
}

function Foot({ theme, left, right }) {
  const isDark = theme === "dark";
  return (
    <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-1 font-mono text-[11px]">
      <span className={isDark ? "text-neutral-400" : "text-neutral-600"}>{left}</span>
      <span className={isDark ? "font-medium text-white" : "font-medium text-black"}>{right}</span>
    </div>
  );
}

// Single rounded area wave. `data` is [{ label, value }]; the header names the
// latest reading so the ring never has to be measured by eye.
export function MonoAreaChart({
  data = [],
  theme = "dark",
  compact = false,
  title = "Mono Curved Wave",
  badge = "Soft Gradient",
  unit = "postings",
  label,
}) {
  const isDark = theme === "dark";
  const id = useId().replace(/:/g, "");
  const [curve, setCurve] = useState("monotone");
  const W = 560;
  const H = 160;
  const PAD = 8;

  const values = data.map((d) => Number(d.value) || 0);
  const max = bounds(values);
  const latest = values[values.length - 1] ?? 0;

  const pts = useMemo(() => {
    if (!values.length) return [];
    return values.map((v, i) => [
      PAD + (i / Math.max(1, values.length - 1)) * (W - PAD * 2),
      H - PAD - (v / max) * (H - PAD * 2 - 14),
    ]);
  }, [values, max]);

  const stroke = pts.length > 1 ? (curve === "natural" ? smoothPath(pts) : linePath(pts)) : "";
  const area = stroke ? `${stroke}L${pts[pts.length - 1][0]},${H}L${pts[0][0]},${H}Z` : "";
  const ink = isDark ? "#FFFFFF" : "#09090B";
  const summary = label || `${title}: ${values.length} points, latest ${latest} ${unit}, peak ${max} ${unit}`;

  return (
    <Shell theme={theme} compact={compact} label={summary}>
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-neutral-400" : "text-neutral-500")}>
              {title}
            </span>
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white">
              {badge}
            </span>
          </div>
          <div className="mt-0.5 font-sans text-xl font-bold tabular-nums tracking-tight">
            {latest} <span className="text-xs font-normal opacity-70">{unit} latest</span>
          </div>
        </div>
        <div className={cn("flex items-center gap-0.5 rounded-full border p-0.5", isDark ? "border-white/10 bg-white/5" : "border-neutral-200 bg-neutral-100")} role="group" aria-label="Curve type">
          {["monotone", "natural"].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCurve(c)}
              aria-pressed={curve === c}
              className={cn(
                "cursor-pointer rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize transition-colors",
                curve === c
                  ? isDark ? "bg-white font-semibold text-black shadow-sm" : "bg-black font-semibold text-white shadow-sm"
                  : isDark ? "text-neutral-400 hover:text-white" : "text-neutral-600 hover:text-black"
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <Stage theme={theme}>
        <figure role="img" aria-label={summary} className="m-0">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-32 w-full sm:h-40" aria-hidden>
            <defs>
              <linearGradient id={`${id}mono-area`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={ink} stopOpacity={isDark ? 0.35 : 0.25} />
                <stop offset="100%" stopColor={ink} stopOpacity={0} />
              </linearGradient>
            </defs>
            {[0.25, 0.5, 0.75].map((f) => (
              <line key={f} x1={PAD} x2={W - PAD} y1={H * f} y2={H * f}
                stroke={isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} strokeDasharray="2 2" />
            ))}
            {area && <path d={area} fill={`url(#${id}mono-area)`} />}
            {stroke && (
              <path d={stroke} fill="none" stroke={ink} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            )}
            {pts.length > 0 && (
              <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r={3.5} fill={ink}>
                <title>{`${data[data.length - 1]?.label}: ${latest} ${unit}`}</title>
              </circle>
            )}
          </svg>
        </figure>
      </Stage>

      <Foot theme={theme} left={`${values.length} points · peak ${max}`} right={`${latest} ${unit}`} />
    </Shell>
  );
}

// Dual stream wave. `waves` is [{ name, values }] (two entries) sharing one
// `labels` axis — the market page feeds the top skill against total volume.
export function MonoStreamChart({
  waves = [],
  labels = [],
  theme = "dark",
  compact = false,
  title = "Stream Wave",
  badge = "Fluid",
  unit = "postings",
  label,
}) {
  const isDark = theme === "dark";
  const id = useId().replace(/:/g, "");
  const W = 560;
  const H = 160;
  const PAD = 8;

  const max = bounds(waves.flatMap((w) => w.values.map((v) => Number(v) || 0)));
  const series = useMemo(() => waves.map((w) => {
    const vals = w.values.map((v) => Number(v) || 0);
    return {
      name: w.name,
      pts: vals.map((v, i) => [
        PAD + (i / Math.max(1, vals.length - 1)) * (W - PAD * 2),
        H - PAD - (v / max) * (H - PAD * 2 - 14),
      ]),
    };
  }), [waves, max]);

  const inks = [isDark ? "#FFFFFF" : "#09090B", isDark ? "#A1A1AA" : "#52525B"];
  const summary = label || `${title}: ${series.map((s) => s.name).join(" vs ")} across ${labels.length} periods`;

  return (
    <Shell theme={theme} compact={compact} label={summary}>
      <div className="mb-1 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-neutral-400" : "text-neutral-500")}>
              {title}
            </span>
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white">
              {badge}
            </span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-baseline gap-x-3 font-sans text-xl font-bold tabular-nums tracking-tight">
            {series.map((s, i) => (
              <span key={s.name}>
                <span className="mr-1.5 inline-block size-2 rounded-full" style={{ background: inks[i % 2] }} aria-hidden />
                {s.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      <Stage theme={theme}>
        <figure role="img" aria-label={summary} className="m-0">
          <svg viewBox={`0 0 ${W} ${H}`} className="h-32 w-full sm:h-40" aria-hidden>
            <defs>
              <linearGradient id={`${id}stream-g1`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={inks[0]} stopOpacity={0.4} />
                <stop offset="100%" stopColor={inks[0]} stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id={`${id}stream-g2`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={inks[1]} stopOpacity={0.2} />
                <stop offset="100%" stopColor={inks[1]} stopOpacity={0} />
              </linearGradient>
            </defs>
            {series.map((s, i) => {
              if (s.pts.length < 2) return null;
              const d = smoothPath(s.pts);
              const fill = `${d}L${s.pts[s.pts.length - 1][0]},${H}L${s.pts[0][0]},${H}Z`;
              return (
                <g key={s.name}>
                  <path d={fill} fill={`url(#${id}stream-g${i + 1})`} />
                  <path d={d} fill="none" stroke={inks[i % 2]} strokeWidth={i === 0 ? 2 : 1.5}
                    strokeLinecap="round" strokeLinejoin="round">
                    <title>{`${s.name}: peak ${Math.max(0, ...waves[i].values.map((v) => Number(v) || 0))} ${unit}`}</title>
                  </path>
                </g>
              );
            })}
          </svg>
        </figure>
      </Stage>

      <Foot theme={theme} left={labels.length ? `${labels[0]} → ${labels[labels.length - 1]}` : "no periods"} right="Dual Stream Wave" />
    </Shell>
  );
}
