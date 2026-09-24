// Chart components. SVG and CSS only, no charting dependency, because the demo
// runs offline and the bundle must stay small enough to load from disk. Every
// chart carries measurements a judge is asked to trust, so each one renders a
// real aria-label with its numbers rather than a decorative shape, and every
// animation collapses under reduced motion. Geometry lives in lib/charts.js,
// which is the part the tests cover.
import { useId } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "./ui.jsx";
import {
  barRects, sparkPoints, linePath, areaPath, smoothPath, donutArcs, stackedBar,
  rankWidth, niceMax, ticks as tickValues, heatLevel, polar,
} from "../lib/charts.js";

// Dark-panel palette. These are deliberately brighter than the ink used on the
// light stone pages: an emerald that reads on white goes muddy on zinc-950.
export const INK = {
  emerald: "#10b981",
  amber: "#f59e0b",
  sky: "#38bdf8",
  violet: "#8b5cf6",
  blurple: "#5865f2",
  rose: "#fb7185",
  zinc: "#52525b",
  zincDim: "#3f3f46",
  grid: "#27272a",
};

export const SERIES_TONES = [INK.emerald, INK.sky, INK.violet, INK.amber, INK.rose, "#facc15"];

function Figure({ label, className, children, ...rest }) {
  return (
    <figure role="img" aria-label={label} className={cn("m-0", className)} {...rest}>
      {children}
    </figure>
  );
}

// Inline trend line. Values arrive oldest first; the last point is marked so the
// most recent reading is identifiable without a hover or a tooltip.
export function Sparkline({ values = [], tone = INK.emerald, width = 104, height = 30, label, className }) {
  const reduce = useReducedMotion();
  const gid = useId().replace(/:/g, "");
  const pts = sparkPoints(values, { width, height, pad: 4 });
  const baseline = height - 3;
  const line = linePath(pts);
  const area = areaPath(pts, baseline);
  const last = pts[pts.length - 1];
  const total = values.reduce((a, b) => a + (Number(b) || 0), 0);
  const summary = label || `${values.length} periods, ${total} total, peak ${niceMax(Math.max(0, ...values))}`;

  if (!line)
    return <Figure label="No periods to plot" className={className}><svg width={width} height={height} aria-hidden /></Figure>;

  return (
    <Figure label={summary} className={className}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
        <defs>
          <linearGradient id={`sp-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={tone} stopOpacity="0.34" />
            <stop offset="100%" stopColor={tone} stopOpacity="0" />
          </linearGradient>
        </defs>
        {area && <path d={area} fill={`url(#sp-${gid})`} />}
        <motion.path
          d={line}
          fill="none"
          stroke={tone}
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduce ? false : { pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, margin: "-30px" }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
        {last && <circle cx={last.x} cy={last.y} r="2.5" fill={tone} />}
      </svg>
    </Figure>
  );
}

// Vertical columns over a real axis. `rows` is [{ label, value, note }] so a
// caller can name every bucket; the axis top comes from niceMax, never from the
// peak, so the tallest column does not touch the frame and read as clipped.
export function Columns({ rows = [], height = 130, tone = INK.emerald, label, className, unit = "" }) {
  const reduce = useReducedMotion();
  const cols = rows.map((r) => ({ label: r.label, value: r.value, note: r.note }));
  const { rects, max } = barRects(cols.map((c) => c.value), { width: 100, height });
  const grid = tickValues(max, 3);
  const total = cols.reduce((a, c) => a + (Number(c.value) || 0), 0);
  const peak = cols[rects.reduce((best, r, i) => (r.value > (rects[best]?.value ?? -1) ? i : best), 0)];
  const summary = label || `${cols.length} periods, ${total} total${unit}, peak ${peak?.value ?? 0} in ${peak?.label ?? "none"}`;

  if (!cols.length) return <Figure label="No periods to plot" className={className}><div className="h-24" /></Figure>;

  return (
    <Figure label={summary} className={className}>
      <div className="relative">
        <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="h-32 w-full" aria-hidden>
          {grid.map((g, i) => {
            const y = height - (g / max) * height;
            return (
              <line
                key={g}
                x1="0" x2="100" y1={y} y2={y}
                stroke={i === 0 ? INK.zinc : INK.grid}
                strokeWidth={i === 0 ? 0.5 : 0.4}
                strokeDasharray={i === 0 ? "" : "1.5 2"}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
          {rects.map((r) => (
            // Grow the bar by animating its own y and height, not a scaleY transform.
            // An SVG transform is applied about the user-space origin rather than the
            // element's box, so a scaled column floats at mid-height instead of rising
            // from the baseline, and every column then disagrees about where zero is.
            <motion.rect
              key={r.i}
              x={r.x}
              width={r.w}
              rx="1.5"
              fill={r.value === 0 ? INK.zincDim : tone}
              fillOpacity={r.value === 0 ? 0.5 : 0.85}
              initial={reduce ? false : { y: height, height: 0 }}
              whileInView={{ y: r.y, height: r.h }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.3, ease: "easeOut", delay: Math.min(r.i * 0.04, 0.3) }}
            >
              <title>{`${cols[r.i]?.label}: ${r.value}${unit}`}</title>
            </motion.rect>
          ))}
        </svg>
        <div className="mt-1 flex justify-between gap-0.5">
          {cols.map((c) => (
            <span key={c.label} className="flex-1 truncate text-center font-mono text-[10px] text-zinc-500" title={c.note || c.label}>
              {c.label}
            </span>
          ))}
        </div>
      </div>
    </Figure>
  );
}

// Horizontal ranked bars. Width is a share of the leader, not of the sum, so the
// top row always fills the track and the rest are readable against it.
export function RankBars({ rows = [], tone = INK.emerald, label, className, valueSuffix = "", emptyNote }) {
  const max = rows.reduce((m, r) => Math.max(m, Number(r.value) || 0), 0);
  const summary = label || `Ranked list, largest ${rows[0]?.label ?? "none"} at ${rows[0]?.value ?? 0}`;
  if (!rows.length) return <p className="text-xs text-zinc-500">{emptyNote || "Nothing to rank yet."}</p>;
  return (
    <Figure label={summary} className={className}>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.key ?? r.label}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-xs text-zinc-300" title={r.label}>{r.label}</span>
              <span className="shrink-0 font-mono text-xs tabular-nums text-zinc-400">
                {r.value}{r.valueSuffix ?? valueSuffix}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-900">
              <div
                className="h-full w-full origin-left rounded-full transition-[scale] duration-300 ease-out"
                style={{ transform: `scaleX(${(rankWidth(r.value, max) / 100).toFixed(4)})`, background: r.tone || tone }}
              />
            </div>
            {r.meta && <p className="mt-1 truncate text-[11px] text-zinc-600">{r.meta}</p>}
          </li>
        ))}
      </ul>
    </Figure>
  );
}

// One stacked bar plus its legend. Parts keep their input order in both, so the
// legend cannot be read in a different order from the bar it explains.
export function Stacked({ parts = [], label, className, unit = "" }) {
  const { bars, total } = stackedBar(parts, { width: 100 });
  const summary = label || `Composition of ${total}${unit}: ${parts.map((p) => `${p.label} ${p.value}`).join(", ")}`;
  if (!total) return <p className="text-xs text-zinc-500">Nothing to compose yet.</p>;
  return (
    <Figure label={summary} className={className}>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-zinc-900">
        {bars.map((b) => (
          <div
            key={b.key ?? b.label}
            style={{ width: `${b.fraction * 100}%`, background: b.tone || INK.zinc }}
            title={`${b.label}: ${b.value} (${b.share}%)`}
          />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {bars.map((b) => (
          <li key={b.key ?? b.label} className="flex items-center gap-1.5 text-[11px] text-zinc-400">
            <span aria-hidden className="size-2 rounded-full" style={{ background: b.tone || INK.zinc }} />
            <span className="text-zinc-300">{b.label}</span>
            <span className="font-mono tabular-nums text-zinc-500">{b.value}</span>
            <span className="font-mono tabular-nums text-zinc-600">{b.share}%</span>
          </li>
        ))}
      </ul>
    </Figure>
  );
}

// Donut with a centre reading and a legend that carries the counts. The centre
// slot is the headline number, so the ring never has to be measured by eye.
export function ShareDonut({ slices = [], size = 136, thick = 18, label, center, className }) {
  const reduce = useReducedMotion();
  const arcs = donutArcs(slices, { size, thick });
  const total = slices.reduce((a, s) => a + (Number(s.value) || 0), 0);
  const summary = label || `Distribution of ${total}: ${slices.map((s) => `${s.label} ${s.value}`).join(", ")}`;
  if (!total) return <p className="text-xs text-zinc-500">Nothing to distribute yet.</p>;
  return (
    <Figure label={summary} className={cn("flex flex-wrap items-center gap-5", className)}>
      <div className="relative shrink-0">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
          <circle cx={size / 2} cy={size / 2} r={(size - thick) / 2 - 1} fill="none" stroke={INK.grid} strokeWidth={thick} />
          {arcs.map((a, i) => (
            <motion.path
              key={a.key ?? a.label}
              d={a.d}
              fill={slices[i]?.tone || SERIES_TONES[i % SERIES_TONES.length]}
              initial={reduce ? false : { opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ duration: 0.25, ease: "easeOut", delay: i * 0.07 }}
            >
              <title>{`${a.label}: ${a.value} (${a.share}%)`}</title>
            </motion.path>
          ))}
        </svg>
        {center && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            {center}
          </div>
        )}
      </div>
      <ul className="min-w-0 flex-1 space-y-2">
        {arcs.map((a, i) => (
          <li key={a.key ?? a.label} className="flex items-center gap-2 text-xs">
            <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ background: slices[i]?.tone || SERIES_TONES[i % SERIES_TONES.length] }} />
            <span className="min-w-0 flex-1 truncate text-zinc-300" title={a.label}>{a.label}</span>
            <span className="shrink-0 font-mono tabular-nums text-zinc-400">{a.value}</span>
            <span className="w-9 shrink-0 text-right font-mono tabular-nums text-zinc-600">{a.share}%</span>
          </li>
        ))}
      </ul>
    </Figure>
  );
}

// Intensity grid: skills down, weeks across. Cells are quantised into steps so
// two rows can be compared by eye, which is the whole reason to draw it.
export function HeatGrid({ rows = [], cols = [], label, className, unit = "postings" }) {
  const max = rows.reduce((m, r) => Math.max(m, ...r.values.map((v) => Number(v) || 0)), 0);
  const summary = label || `Intensity grid, ${rows.length} rows by ${cols.length} columns, peak ${max}`;
  if (!rows.length) return <p className="text-xs text-zinc-500">Nothing to plot yet.</p>;
  return (
    <Figure label={summary} className={className}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-separate border-spacing-[3px]">
          <thead>
            <tr>
              <th scope="col" className="w-32" />
              {cols.map((c) => (
                <th key={c} scope="col" className="text-center font-mono text-[10px] font-normal text-zinc-600">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <th scope="row" className="truncate pr-2 text-left text-[11px] font-normal text-zinc-400" title={r.label}>{r.label}</th>
                {r.values.map((v, i) => {
                  const level = heatLevel(v, max);
                  return (
                    <td key={cols[i] ?? i} className="p-0">
                      <span
                        className={`block h-5 rounded-[3px] border ${level === 0 ? "border-zinc-800 bg-zinc-900" : "border-transparent"}`}
                        title={`${r.label}, ${cols[i]}: ${v} ${unit}`}
                        style={
                          level === 0
                            ? undefined
                            : { background: `color-mix(in oklab, ${INK.emerald} ${Math.round(level * 100)}%, #18181b)` }
                        }
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Figure>
  );
}

// Rounded area wave over week buckets. The spline (lib smoothPath) reads as a
// trend where a polyline through sparse weeks would imply a sampling precision
// that was never there. Gridlines ride currentColor, so the ayush and tech
// light remaps re-tint them for free instead of stranding dark strokes on paper.
export function AreaWave({ values = [], labels = [], tone = INK.emerald, unit = "", label, className }) {
  const reduce = useReducedMotion();
  const gid = useId().replace(/:/g, "");
  const W = 560;
  const H = 150;
  const PAD = 8;
  const BASE = H - PAD;
  const list = (values || []).map((v) => Number(v) || 0);
  const max = niceMax(Math.max(0, ...list));
  const n = list.length;
  const pts = list.map((v, i) => ({
    x: PAD + (n < 2 ? (W - PAD * 2) / 2 : (i / (n - 1)) * (W - PAD * 2)),
    y: PAD + (H - PAD * 2 - 14) - (v / max) * (H - PAD * 2 - 14),
    value: v,
  }));
  const line = smoothPath(pts);
  const fill = line && n > 1
    ? `${line} L${pts[n - 1].x} ${BASE} L${pts[0].x} ${BASE} Z`
    : "";
  const latest = n ? list[n - 1] : 0;
  const summary = label || `Area wave over ${n} periods, latest ${latest}${unit}, peak ${max}${unit}`;
  if (!n) return <p className="text-xs text-zinc-500">Nothing to plot yet.</p>;
  const ends = labels.length > 6
    ? [labels[0], labels[labels.length - 1]]
    : labels;

  return (
    <Figure label={summary} className={className}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-36 w-full" aria-hidden>
        <defs>
          <linearGradient id={`aw-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={tone} stopOpacity="0.35" />
            <stop offset="100%" stopColor={tone} stopOpacity="0" />
          </linearGradient>
        </defs>
        {tickValues(max, 3).map((g) => {
          const y = BASE - (g / max) * (BASE - PAD);
          return <line key={g} x1={PAD} x2={W - PAD} y1={y} y2={y} stroke="currentColor" strokeOpacity="0.12" strokeDasharray="2 2" />;
        })}
        <motion.g
          initial={reduce ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-30px" }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {fill && <path d={fill} fill={`url(#aw-${gid})`} />}
          {line && <path d={line} fill="none" stroke={tone} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
        </motion.g>
        {n > 0 && (
          <circle cx={pts[n - 1].x} cy={pts[n - 1].y} r="4" fill={tone} stroke="var(--color-panel, #0c0c12)" strokeWidth="1.5">
            <title>{`${labels[n - 1] || "latest"}: ${latest}${unit}`}</title>
          </circle>
        )}
      </svg>
      {ends.length > 0 && (
        <div className="mt-1 flex justify-between gap-2">
          {ends.map((l) => (
            <span key={l} className="truncate font-mono text-[10px] text-zinc-500" title={l}>{l}</span>
          ))}
        </div>
      )}
    </Figure>
  );
}

// Dual stream waves sharing one scale: the top skill against total market
// volume, so a spike reads as skill momentum or market momentum at a glance.
// Shared max is the whole point — normalising each wave to itself would make
// any two shapes look equally loud.
export function StreamWaves({ waves = [], labels = [], unit = "", label, className }) {
  const reduce = useReducedMotion();
  const W = 560;
  const H = 150;
  const PAD = 8;
  const all = (waves || []).flatMap((w) => (w.values || []).map((v) => Number(v) || 0));
  const max = niceMax(Math.max(0, ...all));
  const innerW = W - PAD * 2;
  const innerH = H - PAD * 2 - 14;
  const rows = (waves || []).map((w, i) => {
    const list = (w.values || []).map((v) => Number(v) || 0);
    const m = list.length;
    return {
      ...w,
      list,
      pts: list.map((v, j) => ({
        x: PAD + (m < 2 ? innerW / 2 : (j / (m - 1)) * innerW),
        y: PAD + innerH - (v / max) * innerH,
        value: v,
      })),
      peak: Math.max(0, ...list),
      tone: w.tone || SERIES_TONES[i % SERIES_TONES.length],
    };
  });
  const summary = label || `Stream waves: ${rows.map((r) => r.name).join(" against ")} across ${labels.length} periods`;
  if (!rows.length || !rows.some((r) => r.list.length > 1)) {
    return <p className="text-xs text-zinc-500">Not enough history to draw two waves yet.</p>;
  }

  return (
    <Figure label={summary} className={className}>
      <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1">
        {rows.map((r) => (
          <li key={r.name} className="flex items-baseline gap-1.5 text-xs">
            <span aria-hidden className="size-2 rounded-full" style={{ background: r.tone }} />
            <span className="truncate text-zinc-300" title={r.name}>{r.name}</span>
            <span className="font-mono tabular-nums text-zinc-500">{r.peak}{unit}</span>
          </li>
        ))}
      </ul>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-36 w-full" aria-hidden>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={PAD} x2={W - PAD} y1={H * f} y2={H * f} stroke="currentColor" strokeOpacity="0.1" strokeDasharray="2 2" />
        ))}
        <motion.g
          initial={reduce ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-30px" }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          {rows.map((r) => (
            <path
              key={r.name}
              d={smoothPath(r.pts)}
              fill="none"
              stroke={r.tone}
              strokeWidth={r === rows[0] ? 2.5 : 1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeOpacity={r === rows[0] ? 1 : 0.85}
              vectorEffect="non-scaling-stroke"
            >
              <title>{`${r.name}: peak ${r.peak}${unit}`}</title>
            </path>
          ))}
        </motion.g>
      </svg>
      {labels.length > 1 && (
        <div className="mt-1 flex justify-between gap-2">
          <span className="truncate font-mono text-[10px] text-zinc-500">{labels[0]}</span>
          <span className="truncate font-mono text-[10px] text-zinc-500">{labels[labels.length - 1]}</span>
        </div>
      )}
    </Figure>
  );
}

// Weight gauge: one skill's market weight on the taxonomy's own 0.6 to 1.5 band,
// with the neutral 1.0 marked so "above or below the middle" is legible at a
// glance. The arc is the point; the number is inside it.
export function WeightArc({ weight = 1, min = 0.6, max = 1.5, size = 92, label, className, tone }) {
  const reduce = useReducedMotion();
  const span = Math.max(0.0001, max - min);
  const frac = Math.min(1, Math.max(0, (Number(weight) - min) / span));
  const neutral = Math.min(1, Math.max(0, (1 - min) / span));
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 8;
  const start = Math.PI * 0.75;
  const sweep = Math.PI * 1.5;
  const at = (f) => polar(cx, cy, r, start + sweep * f);
  const a0 = at(0);
  const a1 = at(frac);
  const large = sweep * frac > Math.PI ? 1 : 0;
  const d = `M${a0.x} ${a0.y} A${r} ${r} 0 ${large} 1 ${a1.x} ${a1.y}`;
  const full = `M${a0.x} ${a0.y} A${r} ${r} 0 1 1 ${at(1).x} ${at(1).y}`;
  const n = at(neutral);
  const color = tone || (Number(weight) > 1 ? INK.emerald : Number(weight) < 1 ? INK.amber : INK.zinc);
  return (
    <Figure label={label || `Weight ${weight} on a ${min} to ${max} band, neutral 1`} className={cn("relative inline-flex", className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <path d={full} fill="none" stroke={INK.grid} strokeWidth="7" strokeLinecap="round" />
        <motion.path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          initial={reduce ? false : { pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, margin: "-30px" }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
        <circle cx={n.x} cy={n.y} r="2" fill={INK.zinc} />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-sm font-semibold tabular-nums" style={{ color }}>
          {Number(weight).toFixed(2)}x
        </span>
        <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-600">weight</span>
      </span>
    </Figure>
  );
}
