// XpMeter: the economy at a glance. Level arc (Beej to Acharya), progress to
// next, and a stacked distribution bar showing where XP came from. Same
// collectXP math as the tests, so the bar and the level never disagree.
import { useMemo } from "react";
import CIcon from "@coreui/icons-react";
import { cilBolt } from "@coreui/icons";
import { Card } from "./ui.jsx";
import { collectXP, XP_SOURCES } from "../lib/xp.js";

export default function XpMeter() {
  const xp = useMemo(() => collectXP(), []);
  const parts = XP_SOURCES.filter((s) => xp.bySource[s.id] > 0);

  return (
    <Card>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <span className="inline-flex size-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800" aria-hidden>
            <CIcon icon={cilBolt} width={16} height={16} />
          </span>
          Level {xp.level} · {xp.name}
        </p>
        <p className="font-mono text-xs tabular-nums text-zinc-500">{xp.total} XP</p>
      </div>
      {xp.next ? (
        <>
          <div className="h-2 overflow-hidden rounded-full bg-stone-200" role="progressbar" aria-valuenow={xp.into} aria-valuemin="0" aria-valuemax={xp.of} aria-label={`Progress to ${xp.next}`}>
            <div className="h-full rounded-full bg-emerald-600" style={{ width: `${Math.min(100, Math.round((xp.into / xp.of) * 100))}%` }} />
          </div>
          <p className="mt-1 text-xs text-zinc-500">{xp.of - xp.into} XP to {xp.next}</p>
        </>
      ) : (
        <p className="text-xs text-zinc-500">Max level. The wards are yours.</p>
      )}
      {parts.length > 0 ? (
        <>
          <div className="mt-3 flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full" aria-hidden>
            {parts.map((s) => (
              <span key={s.id} title={`${s.label}: ${xp.bySource[s.id]} XP`} style={{ width: `${(xp.bySource[s.id] / xp.total) * 100}%`, background: s.color }} />
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
            {parts.map((s) => (
              <span key={s.id} className="flex items-center gap-1 text-[11px] text-zinc-500">
                <span className="size-2 rounded-sm" style={{ background: s.color }} aria-hidden />
                {s.label} <span className="font-mono tabular-nums">{xp.bySource[s.id]}</span>
              </span>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-2 text-xs leading-5 text-zinc-500">
          Earn XP: quest ticks pay 20, quiz days 15, applications 15, interview days 10.
        </p>
      )}
    </Card>
  );
}
