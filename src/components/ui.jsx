// Avsar UI primitives — shadcn pattern (cva variants + Slot + clsx/tailwind-merge).
// Professional light theme, herb-green accent, soft rounded panels.
// Typeset roles: Archivo display, Inter body, system mono for measurement only.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { animate, motion, useReducedMotion } from "motion/react";
import { t } from "../lib/i18n.js";
import { loadJSON, saveJSON } from "../lib/storage.js";
import { LOOP_STEPS } from "../lib/nextstep.js";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function Page({ title, sub, kicker, actions, children }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      {(title || actions) && (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div className="max-w-2xl">
            {kicker && (
              <p className="mb-1.5 font-mono text-[11px] uppercase tracking-widest text-zinc-500">{kicker}</p>
            )}
            {title && (
              <h1 className="text-balance font-display text-2xl font-bold tracking-[-0.02em] text-zinc-50 sm:text-3xl">
                {title}
              </h1>
            )}
            {sub && <p className="mt-2 text-pretty text-sm leading-6 text-zinc-400">{sub}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export function Card({ className = "", children, ...rest }) {
  return (
    <section className={cn("rounded-xl border border-zinc-800 bg-zinc-950 p-5", className)} {...rest}>
      {children}
    </section>
  );
}

export function H2({ children, className = "" }) {
  return <h2 className={cn("mb-3 text-sm font-semibold text-zinc-100", className)}>{children}</h2>;
}

const buttonVariants = cva(
  "inline-flex min-h-[40px] items-center justify-center gap-1.5 whitespace-nowrap rounded-xl text-sm font-medium transition-colors active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-blurple font-semibold text-white shadow-lg shadow-black/20 hover:bg-blurple-deep",
        quiet:
          "border border-zinc-800 bg-zinc-950 text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900",
        dangerQuiet: "border border-zinc-800 text-red-400 hover:bg-red-950",
        ghost: "text-zinc-300 hover:bg-zinc-900 hover:text-zinc-100",
      },
      size: {
        sm: "h-8 min-h-0 px-3 text-xs",
        md: "h-10 px-4 py-2",
        lg: "h-11 px-6",
        icon: "size-10 min-h-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

// shadcn Button: asChild renders a Radix Slot (e.g. <Button asChild><Link/>).
export function Button({ to, asChild, variant, size, className, ...rest }) {
  const cls = cn(buttonVariants({ variant, size }), className);
  if (asChild) return <Slot className={cls} {...rest} />;
  if (to) return <Link to={to} className={cls} {...rest} />;
  return <button type="button" className={cls} {...rest} />;
}

// Legacy alias — every page already imports Btn.
export const Btn = Button;

export function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium leading-none text-zinc-200">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs leading-5 text-zinc-500">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "flex h-10 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 hover:border-zinc-700";

export function Meter({ value, max }) {
  const reduce = useReducedMotion();
  const frac = Math.max(0, Math.min(1, value / max));
  return (
    <div
      className="h-2 overflow-hidden rounded-xl bg-zinc-800"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={`${value} of ${max}`}
    >
      <motion.div
        className="h-full w-full origin-left rounded-xl bg-blurple"
        initial={reduce ? { scaleX: frac } : { scaleX: 0 }}
        whileInView={{ scaleX: frac }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
    </div>
  );
}

const DONUT_COLORS = ["#1e7a4c", "#d6cfae", "#c77b21", "#166038", "#a1a1aa", "#78716c"];

// Zero-dependency donut, segments fade in with a stagger.
export function Donut({ segs = [], size = 120, thick = 16, label = "Distribution" }) {
  const reduce = useReducedMotion();
  const r = (size - thick) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#27272a" strokeWidth={thick} />
      {segs.map((s, i) => (
        <motion.circle
          key={s.label}
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={s.label === "none" ? "transparent" : DONUT_COLORS[i % DONUT_COLORS.length]}
          strokeWidth={thick}
          strokeDasharray={`${Math.max(0, s.fraction * c - 1.5)} ${c}`}
          strokeDashoffset={-s.start * c}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          initial={reduce ? { opacity: 1 } : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.4, ease: "easeOut", delay: i * 0.08 }}
        />
      ))}
    </svg>
  );
}

export const DONUT_COLORS_EXPORT = DONUT_COLORS;

// Zero-dependency radar: skill profile (emerald, filled) vs target role
// (amber, dashed). axes: [{ label, value, target }] on a shared 0–max scale.
// Theme-safe: grid uses currentColor at low opacity, series use brand hexes.
export function Radar({ axes = [], max = 5, size = 280, className = "h-auto w-full", label = "Skill radar" }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 34;
  const n = axes.length;
  if (!n) return null;
  const pt = (i, v) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2;
    const rr = (Math.max(0, Math.min(max, v)) / max) * r;
    return [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
  };
  const poly = (key) => axes.map((a, i) => pt(i, a[key]).join(",")).join(" ");
  const rings = [1, 2, 3, 4, 5].filter((x) => x <= max);
  // long axis names ("Pharmacovigilance") would cross the polygons and the
  // frame edge — truncate once here so no caller can collide.
  const short = (s) => {
    const t = String(s || "");
    return t.length > 12 ? `${t.slice(0, 11)}…` : t;
  };
  return (
    <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} className={className}>
      {rings.map((ring) => (
        <polygon
          key={ring}
          points={axes.map((_, i) => pt(i, (ring / max) * max).join(",")).join(" ")}
          fill="none" stroke="currentColor" strokeOpacity={ring === max ? 0.35 : 0.14} strokeWidth="1"
        />
      ))}
      {axes.map((_, i) => {
        const [x, y] = pt(i, max);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="currentColor" strokeOpacity="0.14" />;
      })}
      <polygon points={poly("target")} fill="#c77b21" fillOpacity="0.08" stroke="#c77b21" strokeWidth="1.5" strokeDasharray="5 3" />
      <polygon points={poly("value")} fill="#1e7a4c" fillOpacity="0.22" stroke="#1e7a4c" strokeWidth="2" strokeLinejoin="round" />
      {axes.map((a, i) => {
        const [x, y] = pt(i, max * 1.16);
        return (
          <text key={a.label} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="currentColor" fillOpacity="0.75">
            {short(a.label)}
          </text>
        );
      })}
    </svg>
  );
}

const badgeVariants = cva(
  "inline-flex items-center rounded-xl border px-2 py-0.5 font-mono text-xs font-medium tabular-nums",
  {
    variants: {
      tone: {
        zinc: "border-zinc-800 bg-zinc-900 text-zinc-300",
        blurple: "border-blurple/40 bg-blurple/10 text-blurple-soft",
        green: "border-green-900 bg-green-950 text-green-300",
        amber: "border-amber-900 bg-amber-950 text-amber-300",
        red: "border-red-900 bg-red-950 text-red-300",
        blue: "border-blue-900 bg-blue-950 text-blue-300",
      },
    },
    defaultVariants: { tone: "zinc" },
  }
);

export function Badge({ tone, className, ...rest }) {
  return <span className={cn(badgeVariants({ tone }), className)} {...rest} />;
}

// Legacy alias.
export function Chip({ children, tone = "zinc" }) {
  return <Badge tone={tone}>{children}</Badge>;
}

// Structural skeleton for loading states.
export function Skeleton({ className, ...rest }) {
  return <div aria-hidden className={cn("animate-pulse rounded-xl bg-zinc-800", className)} {...rest} />;
}

// One scroll reveal for section entrances: transform + opacity, ease-out, once.
export function Reveal({ children, delay = 0, className, ...rest }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className} {...rest}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, transform: "translateY(14px)" }}
      whileInView={{ opacity: 1, transform: "translateY(0px)" }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.45, ease: "easeOut", delay }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
// Animated integer for scores and stats. Static text when reduced motion.
export function CountUp({ to, className }) {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const [val, setVal] = useState(reduce ? to : 0);
  useEffect(() => {
    if (reduce) return;
    const controls = animate(0, to, {
      duration: 0.6,
      ease: "easeOut",
      onUpdate: (v) => setVal(Math.round(v)),
    });
    return () => controls.stop();
  }, [to, reduce]);
  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {val}
    </span>
  );
}

// Empty states name the cause and the one action that fills them.
export function Empty({ title, body, action, icon }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950 px-6 py-10 text-center">
      {icon && (
        <span className="mx-auto mb-4 flex size-12 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-900 text-zinc-400" aria-hidden>
          {icon}
        </span>
      )}
      <p className="text-balance text-sm font-semibold text-zinc-100">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-pretty text-sm leading-6 text-zinc-400">{body}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorBox({ message, onRetry }) {
  return (
    <div className="border border-red-900 bg-red-950 px-5 py-4 text-sm text-red-200" role="alert">
      <p className="font-semibold">Something failed to load</p>
      <p className="mt-1 text-pretty">{message}</p>
      {onRetry && (
        <Btn variant="quiet" size="sm" className="mt-3" onClick={onRetry}>
          Try again
        </Btn>
      )}
    </div>
  );
}

// Consistent section header: mono kicker, display title, sub, optional action.
// Replaces the ad-hoc h2 rows scattered across screens.
export function SectionHead({ kicker, title, sub, action, className = "" }) {
  return (
    <div className={cn("mb-4 flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="max-w-2xl">
        {kicker && (
          <p className="mb-1 font-mono text-[11px] uppercase tracking-widest text-zinc-500">{kicker}</p>
        )}
        {title && (
          <h2 className="font-display text-lg font-bold tracking-tight text-zinc-50">{title}</h2>
        )}
        {sub && <p className="mt-1 text-sm leading-6 text-zinc-400">{sub}</p>}
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}

// One icon tile, every screen the same. Tones reuse the badge contract so
// every theme remap (ayush-dark, tech-light) already covers them.
export function IconTile({ tone = "zinc", className, children }) {
  return (
    <span
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-xl border",
        badgeVariants({ tone }),
        className
      )}
      aria-hidden
    >
      {children}
    </span>
  );
}

// The single next action, computed by lib/nextstep.js. One brain, many faces:
// home heroes, journey exits, and empty states all render this card.
export function NextStep({ step, lang = "en", className = "" }) {
  if (!step) return null;
  return (
    <Link
      to={step.to}
      className={cn(
        "group flex min-h-[76px] items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 transition-colors hover:border-zinc-500",
        className
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="block font-mono text-[10px] uppercase tracking-widest text-zinc-500">
          {t(lang, "next.kicker")}
        </span>
        <span className="mt-0.5 block text-sm font-bold text-zinc-100">
          {t(lang, `next.${step.id}.title`)}
        </span>
        <span className="mt-0.5 block truncate text-xs leading-5 text-zinc-500">
          {t(lang, `next.${step.id}.body`)}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-blurple px-3.5 py-2 text-xs font-semibold text-white transition-colors group-hover:bg-blurple-deep">
        {t(lang, "next.cta")} <span aria-hidden>→</span>
      </span>
    </Link>
  );
}

// First-run strip for Home at loop 0: the public 4-step loop, each step a
// link. Dismissable, remembered per device. Not a tour, a table of contents.
export function FirstRun({ lang = "en", storageKey = "avsar-firstrun-v1", className = "" }) {
  const [dismissed, setDismissed] = useState(() => Boolean(loadJSON(storageKey, false)));
  if (dismissed) return null;
  const dismiss = () => {
    saveJSON(storageKey, true);
    setDismissed(true);
  };
  return (
    <section
      aria-label={t(lang, "firstrun.title")}
      className={cn("rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-5", className)}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
          {t(lang, "firstrun.title")}
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="rounded-lg px-2 py-1.5 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-200"
        >
          {t(lang, "firstrun.dismiss")}
        </button>
      </div>
      <ol className="mt-3 grid gap-2 sm:grid-cols-4">
        {LOOP_STEPS.map((s, i) => (
          <li key={s.id}>
            <Link
              to={s.to}
              className="flex h-full items-center gap-3 rounded-xl border border-zinc-800 px-3 py-2.5 transition-colors hover:border-zinc-500"
            >
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-blurple/15 font-mono text-xs font-bold text-blurple-soft" aria-hidden>
                {i + 1}
              </span>
              <span className="text-sm font-semibold text-zinc-200">{t(lang, `loop.${s.id}`)}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

// --- system24: sharp 1px chrome, mono labels, square corners. Landing + figs only. ---

// Thin mono status strip: `left … right`, 1px top/bottom borders via parent.
export function StatusBar({ left, right, className = "" }) {
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-2 px-4 py-2", className)}>
      <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-600">{left}</span>
      {right && (
        <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-600">{right}</span>
      )}
    </div>
  );
}

// ASCII divider: `// label ─────`. One line, no gradients.
export function AsciiRule({ label = "", className = "" }) {
  return (
    <div className={cn("flex items-center gap-2", className)} aria-hidden>
      <span className="shrink-0 font-mono text-[11px] uppercase tracking-widest text-zinc-600">
        {"//"} {label}
      </span>
      <span className="h-px flex-1 bg-zinc-800" />
    </div>
  );
}

// Square 1px panel with optional mono header row. The landing fig frame.
export function Ticket({ label, status, className = "", children, ...rest }) {
  return (
    <section className={cn("rounded-xl border border-zinc-800 bg-zinc-950", className)} {...rest}>
      {(label || status) && (
        <div className="flex items-center justify-between gap-4 border-b border-zinc-800 px-4 py-2">
          <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
            {label}
          </span>
          {status && (
            <span className="font-mono text-[11px] uppercase tracking-widest text-blurple-soft">
              {status}
            </span>
          )}
        </div>
      )}
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

// Terminal window: square frame, `> _` header, mono body. For coach/CLI previews.
export function TermWindow({ url, children, className = "" }) {
  return (
    <div className={cn("overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950", className)}>
      <div className="flex items-center gap-2 border-b border-zinc-800 px-4 py-2">
        <span className="font-mono text-[11px] text-zinc-600" aria-hidden>
          {">"} _
        </span>
        {url && (
          <span className="mx-auto hidden bg-zinc-900 px-3 py-0.5 font-mono text-[11px] text-zinc-500 sm:block">
            {url}
          </span>
        )}
      </div>
      <div className="p-5 font-mono text-sm leading-6 text-zinc-300 sm:p-6">{children}</div>
    </div>
  );
}

// --- ayush tokens + components (added for SIH 26044) ---

export const SAGE = "text-emerald-400";
export const GOLD = "text-amber-300";
export const SAGE_BG = "border-emerald-900 bg-emerald-950";
export const GOLD_BG = "border-amber-900 bg-amber-950";

// beej → ankur → paudha → vaidya → acharya growth display
export function VaidyaLevel({ level, className = "" }) {
  const stages = [
    { id: "beej", label: "बीज", hi: "seed" },
    { id: "ankur", label: "अंकुर", hi: "sprout" },
    { id: "paudha", label: "पौधा", hi: "seedling" },
    { id: "vaidya", label: "वैद्य", hi: "vaidya" },
    { id: "acharya", label: "आचार्य", hi: "acharya" },
  ];
  const idx = stages.findIndex((s) => s.id === level);
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {stages.map((s, i) => (
        <span
          key={s.id}
          className={`inline-flex size-6 items-center justify-center rounded-full border text-[10px] font-mono ${
            i <= idx ? "border-emerald-500 bg-emerald-600 text-white" : "border-zinc-700 text-zinc-500"
          }`}
          title={s.hi}
        >
          {i + 1}
        </span>
      ))}
      <span className="ml-1 font-mono text-xs text-emerald-400">{idx >= 0 ? stages[idx].label : ""}</span>
    </div>
  );
}

// BAMS semester syllabus table
export function SyllabusTable({ data = [] }) {
  if (!data.length) return null;
  return (
    <div className="overflow-x-auto border border-zinc-800">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-800 font-mono text-[11px] uppercase tracking-widest text-zinc-500">
            <th className="px-4 py-2 font-medium">Semester</th>
            <th className="px-4 py-2 font-medium">Focus</th>
            <th className="px-4 py-2 font-medium">Skills</th>
            <th className="px-4 py-2 text-right font-medium">Courses</th>
            <th className="px-4 py-2 text-right font-medium">Quests</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.sem} className="border-t border-zinc-800 first:border-t-0 hover:bg-zinc-900">
              <td className="px-4 py-2.5 font-mono text-zinc-100">{row.sem}</td>
              <td className="px-4 py-2.5 text-zinc-300">{row.label}</td>
              <td className="px-4 py-2.5">
                <div className="flex flex-wrap gap-1">
                  {row.skills.map((s) => (
                    <span key={s} className="inline-block rounded-xl border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">{s}</span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-2.5 text-right font-mono tabular-nums text-zinc-200">{row.courses}</td>
              <td className="px-4 py-2.5 text-right font-mono tabular-nums text-zinc-200">{row.quests}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
