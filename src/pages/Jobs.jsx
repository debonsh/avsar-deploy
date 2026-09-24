import { useEffect, useMemo, useState } from "react";
import CIcon from "@coreui/icons-react";
import { cilBriefcase, cilLocationPin, cilClock, cilExternalLink, cilSearch } from "@coreui/icons";
import { Page, Card, H2, Btn, Field, Chip, Empty, ErrorBox, Donut, DONUT_COLORS_EXPORT, SectionHead, inputCls } from "../components/ui.jsx";
import { useAvsar } from "../app/store.jsx";
import { JOBS, TECH_JOBS, matchJobs } from "../data/jobs.js";
import { EXTRA_JOBS } from "../data/seedJobsExtra.js";
import { NAUKRI_JOBS } from "../data/naukriSeed.js";
import { BOARDS_JOBS } from "../data/boardsSeed.js";
import { AYUSH_JOBS } from "../data/ayushSeed.js";
import { mergeJobs, listLiveJobs, recordApplication, saveCustomJob } from "../lib/store.js";
import { loadProfile } from "../lib/profile.js";
import { matchBand, parseJobPosting } from "../lib/coach.js";
import { matchJobPost, profileForMatching } from "../lib/match.js";
import { loadQuizBest } from "../data/quiz.js";
import { loadQAnswers, compileEvidence } from "../lib/questionnaire.js";
import { donutSegments, weekTrend, recentActivity, briefing, demandHeatmap } from "../lib/dashboard.js";
import { calculateMainScore } from "../lib/score.js";

const STATUS_FLOW = ["saved", "applied", "interview", "offer"];

// job-board card DNA: company mark tile, fit ring, meta rows, skill chips,
// one primary apply + quiet pipeline steps. Same data, half the noise.
function FitRing({ score, isTech }) {
  const r = 14;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(100, score || 0)) / 100;
  const col = score >= 65 ? (isTech ? "#5865f2" : "#1e7a4c") : score >= 50 ? "#2563eb" : "#a1a1aa";
  return (
    <span className="relative inline-flex items-center justify-center" role="img" aria-label={`Fit ${score} of 100`}>
      <svg width="44" height="44" viewBox="0 0 44 44" className="-rotate-90" aria-hidden>
        <circle cx="22" cy="22" r={r} fill="none" strokeWidth="4" className="stroke-stone-200" />
        <circle cx="22" cy="22" r={r} fill="none" stroke={col} strokeWidth="4" strokeLinecap="round" strokeDasharray={`${(frac * c).toFixed(1)} ${c.toFixed(1)}`} />
      </svg>
      <span className="absolute text-[11px] font-bold tabular-nums text-stone-800">{score}</span>
    </span>
  );
}

function statusOf(events, id) {
  const mine = events.filter((e) => e.jobId === String(id));
  if (mine.some((e) => e.event === "rejected")) return "rejected";
  if (mine.some((e) => e.event === "offer")) return "offer";
  if (mine.some((e) => e.event === "interview")) return "interview";
  if (mine.some((e) => e.event === "applied")) return "applied";
  if (mine.some((e) => e.event === "saved")) return "saved";
  return null;
}

// explainable match, same engine the recruiter sees: score + factor bars + why.
function EngineFit({ job, profile, isTech }) {
  const m = matchJobPost(job, profile);
  if (!m) return null;
  const rows = [
    ["coverage", "Skill coverage", 45],
    ["proficiency", "Proficiency fit", 25],
    ["verified", "Verified ratio", 15],
    ["recency", "Recency", 10],
    ["interest", "Interests", 5],
  ];
  return (
    <details className="mt-2 rounded-lg border border-stone-200/70 bg-stone-50/70 px-3 py-2">
      <summary className={`cursor-pointer text-xs font-semibold ${isTech ? "text-blurple-soft" : "text-emerald-800"}`}>
        Engine match {m.score}/100 · {m.band} — why this number?
      </summary>
      <ul className="mt-2 space-y-1">
        {rows.map(([k, label, w]) => (
          <li key={k} className="flex items-center gap-2 text-[11px]">
            <span className="w-28 shrink-0 text-stone-500">{label} <span className="font-mono tabular-nums">{w}%</span></span>
            <span className="h-1.5 flex-1 rounded-full bg-stone-200">
              <span className={`block h-full rounded-full ${isTech ? "bg-blurple" : "bg-emerald-600"}`} style={{ width: `${Math.round(m.breakdown[k] * 100)}%` }} />
            </span>
            <span className="w-9 shrink-0 text-right font-mono tabular-nums text-stone-600">{Math.round(m.breakdown[k] * 100)}%</span>
          </li>
        ))}
      </ul>
      <ul className="mt-1.5 space-y-0.5">
        {m.why.map((w, i) => (
          <li key={i} className="text-[11px] leading-5 text-stone-500">· {w}</li>
        ))}
      </ul>
    </details>
  );
}

export default function Jobs() {
  const { track, lane, resume, events, addEvent, dismissed, toggleDismiss, customJobs, addCustomJob, funnel } = useAvsar();
  const [kw, setKw] = useState("");
  const [loc, setLoc] = useState("");
  const [type, setType] = useState("all");
  const [section, setSection] = useState("intern"); // intern | jobs — internships first, jobs second
  const [eligibleOnly, setEligibleOnly] = useState(false);
  const [showDismissed, setShowDismissed] = useState(false);
  const [live, setLive] = useState([]);
  const [liveState, setLiveState] = useState("idle");
  const [paste, setPaste] = useState("");
  const [parsed, setParsed] = useState(null);
  const [notice, setNotice] = useState("");

  const found = useMemo(() => resume?.result?.found || [], [resume]);
  const score = resume?.result ? calculateMainScore(resume.result.total, 0, 0, lane) : 0;
  const isTech = track === "tech";
  // one held-profile for the explainable engine, shared by every card below
  const engineProfile = useMemo(() => {
    try {
      return profileForMatching(lane, found, loadQuizBest(lane), compileEvidence(loadQAnswers(lane)).claims);
    } catch {
      return { skills: found, levels: {}, verified: [], usedAt: {}, interests: [] };
    }
  }, [lane, found]);

  // each portal reads its own feeds: no ayurveda posting on a tech feed, and
  // the reverse. Live/scraped rows land in whichever portal asked for them.
  const feed = useMemo(
    () =>
      isTech
        ? mergeJobs(customJobs, TECH_JOBS, EXTRA_JOBS, NAUKRI_JOBS, BOARDS_JOBS, live)
        : mergeJobs(customJobs, AYUSH_JOBS, JOBS, live),
    [isTech, customJobs, live]
  );
  const pool = useMemo(
    () => matchJobs(lane, score, found, feed),
    [lane, score, found, feed]
  );
  // every posting here is this portal's lane, so sort eligible first.
  const sortedPool = useMemo(
    () => [...pool].sort((a, b) => (b.eligible - a.eligible) || ((b.fit?.score || 0) - (a.fit?.score || 0))),
    [pool]
  );

  const byId = useMemo(() => Object.fromEntries(sortedPool.map((j) => [String(j.id), j])), [sortedPool]);

  const filtered = sortedPool.filter((j) => {
    if (!showDismissed && dismissed.includes(String(j.id))) return false;
    if (eligibleOnly && !j.eligible) return false;
    if (section === "intern" ? j.type !== "Internship" : j.type === "Internship") return false;
    if (type !== "all" && j.type !== type) return false;
    if (kw && !`${j.title} ${j.company} ${j.skills.join(" ")}`.toLowerCase().includes(kw.toLowerCase())) return false;
    if (loc && !(j.loc || "").toLowerCase().includes(loc.toLowerCase())) return false;
    return true;
  });

  const segs = useMemo(
    () => donutSegments([["Saved", funnel.saved], ["Applied", funnel.applied], ["Interview", funnel.interview], ["Offer", funnel.offer], ["Rejected", funnel.rejected]]),
    [funnel]
  );
  const trend = useMemo(() => weekTrend(events), [events]);
  const trendMax = Math.max(1, ...trend.map((d) => d.saved + d.applied));
  const recent = useMemo(() => recentActivity(events, byId), [events, byId]);
  const brief = useMemo(
    () => briefing({ funnel, jobs: sortedPool, found, missing: resume?.result?.missing || [], mainScore: score }),
    [funnel, sortedPool, found, resume, score]
  );
  const heat = useMemo(() => demandHeatmap(sortedPool, found, 10), [sortedPool, found]);
  const heatMax = Math.max(1, ...heat.map((h) => h.demand));

  async function refreshLive() {
    setLiveState("loading");
    try {
      const jobs = await listLiveJobs(true, loadProfile() || {});
      setLive(jobs);
      setLiveState("done");
    } catch {
      setLiveState("error");
    }
  }

  useEffect(() => {
    listLiveJobs(false).then(setLive).catch(() => {});
  }, []);

  async function markApplied(job) {
    try {
      await recordApplication(job, job.apply || "#", score);
      addEvent(String(job.id), "applied");
      setNotice(`Marked applied: ${job.title}. Good luck.`);
    } catch {
      setNotice("Could not record that application. Try again.");
    }
  }

  function confirmPasted() {
    if (!parsed) return;
    const job = { ...parsed, role: lane, minScore: 0 };
    saveCustomJob(job);
    addCustomJob(job);
    setParsed(null);
    setPaste("");
    setNotice(`Added "${job.title}". It now appears in your feed.`);
  }

  const internCount = useMemo(() => sortedPool.filter((j) => j.type === "Internship").length, [sortedPool]);
  const jobCount = useMemo(() => sortedPool.filter((j) => j.type !== "Internship").length, [sortedPool]);

  // insights helpers: next action + closing soon, computed from the same pool
  const topGap = useMemo(() => heat.find((h) => !h.have), [heat]);
  const readyRoles = useMemo(
    () => sortedPool.filter((j) => j.eligible && !statusOf(events, j.id)).slice(0, 3),
    [sortedPool, events]
  );
  const closing = useMemo(
    () => sortedPool.filter((j) => j.deadline).slice(0, 4),
    [sortedPool]
  );

  return (
    <Page
      title="Internships & Jobs"
      kicker="Step 04 · Apply"
      sub={
        isTech
          ? `${pool.length} curated openings · internships first, then fresher roles. Fit is computed from your resume.`
          : `${pool.length} curated ayurveda openings · rotatory internships, hospital roles, research, ministry programs. Fit is computed from your resume.`
      }
      actions={<Btn variant="quiet" onClick={refreshLive}>{liveState === "loading" ? "Refreshing..." : "Refresh live roles"}</Btn>}
    >
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Opportunity sections">
        {[{ id: "intern", label: `Internships (${internCount})` }, { id: "jobs", label: `Jobs (${jobCount})` }, { id: "insights", label: "My insights" }].map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={section === t.id}
            onClick={() => setSection(t.id)}
            className={`min-h-[40px] rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              section === t.id
                ? isTech ? "bg-blurple text-white" : "bg-emerald-700 text-white"
                : isTech ? "border border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-blurple/60" : "border border-emerald-200 bg-white text-emerald-900 hover:border-emerald-400"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {liveState === "error" && (
        <ErrorBox message="Live boards did not respond. The curated feed below still works." onRetry={refreshLive} />
      )}

      {section === "insights" ? (
        <>
          <section aria-label="Your mission" className="overflow-hidden rounded-2xl border border-emerald-900/10 bg-white shadow-sm">
            <div className="grid gap-0 sm:grid-cols-[auto_1fr]">
              <div className="flex items-center gap-4 bg-emerald-700 px-6 py-5 text-white" style={isTech ? { backgroundColor: "#5865f2" } : undefined}>
                <p className="font-display text-5xl font-bold tabular-nums leading-none">
                  {resume ? score : "–"}
                </p>
                <div>
                  <p className={`text-xs font-semibold uppercase tracking-widest ${isTech ? "text-white/80" : "text-emerald-100"}`}>Readiness</p>
                  <p className={`mt-0.5 text-xs ${isTech ? "text-white/80" : "text-emerald-100"}`}>of 100 · unlocks the feed below</p>
                </div>
              </div>
              <div className="px-6 py-5">
                {!resume ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="max-w-md text-sm leading-6 text-stone-600">Scores unlock matches, eligibility, and fit numbers across every posting.</p>
                    <Btn to="/resume">Score my resume</Btn>
                  </div>
                ) : readyRoles.length > 0 ? (
                  <div>
                    <p className="text-sm text-stone-600">
                      You clear the bar for <strong className="text-stone-900">{readyRoles.length}</strong> open {readyRoles.length === 1 ? "role" : "roles"}:
                    </p>
                    <ul className="mt-2 divide-y divide-stone-100">
                      {readyRoles.map((j) => (
                        <li key={j.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                          <span className="truncate font-medium text-stone-800">{j.title} <span className="font-normal text-stone-500">at {j.company}</span></span>
                          <button type="button" onClick={() => { setSection(j.type === "Internship" ? "intern" : "jobs"); }} className={`shrink-0 text-xs font-semibold underline underline-offset-4 ${isTech ? "text-blurple-soft hover:text-blurple" : "text-emerald-700 hover:text-emerald-900"}`}>
                            Open in feed
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="max-w-md text-sm leading-6 text-stone-600">Nothing cleared yet. One quest pair is the fastest way to unlock the feed.</p>
                    <Btn to="/quests" variant="quiet">Open quests</Btn>
                  </div>
                )}
                {resume && topGap && (
                  <p className="mt-3 border-t border-stone-100 pt-3 text-xs leading-5 text-stone-500">
                    Biggest lever: <strong className="text-stone-800">{topGap.skill}</strong> is asked in {topGap.demand} {topGap.demand === 1 ? "posting" : "postings"}. Close it in Quests.
                  </p>
                )}
              </div>
            </div>
          </section>
          <section aria-label="Closing soon" className="mt-4">
            <SectionHead title="Closing soon" sub="Confirm dates on the source site" />
            {closing.length === 0 ? (
              <p className="mt-2 text-sm leading-6 text-zinc-400">No dated deadlines in the feed right now. Ministry and CCRAS cycles post quarterly.</p>
            ) : (
              <ol className="mt-2 divide-y divide-stone-200/70 rounded-2xl border border-stone-200/70 bg-white/60">
                {closing.map((j) => (
                  <li key={j.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <span className="min-w-0 truncate font-medium text-stone-800">{j.title} <span className="font-normal text-stone-500">· {j.company}</span></span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="text-xs tabular-nums text-stone-500">apply {j.deadline}</span>
                      {j.eligible
                        ? <Chip tone="green">eligible</Chip>
                        : <Chip tone="amber">needs {j.minScore}+</Chip>}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
        <Card>
          <H2>Where your pipeline stands</H2>
          <div className="flex items-center gap-4">
            <Donut segs={segs} label="Pipeline distribution across saved, applied, interview, offer, rejected" />
            <ul className="space-y-1.5">
              {segs.map((s, i) => (
                <li key={s.label} className="flex items-center gap-1.5 text-xs">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.label === "none" ? "#d4d4d8" : DONUT_COLORS_EXPORT[i % DONUT_COLORS_EXPORT.length] }} />
                  <span className="text-zinc-400">{s.label}</span>
                  <span className="ml-auto pl-3 font-medium tabular-nums text-zinc-200">{s.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
        <Card>
          <H2>Activity, last 7 days</H2>
          <div className="flex h-24 items-end gap-2">
            {trend.map((d) => (
              <div key={d.key} className="flex flex-1 flex-col items-center gap-1" title={`${d.saved} saved, ${d.applied} applied`}>
                <div className="flex h-16 w-full flex-col justify-end gap-0.5">
                  {d.applied > 0 && <div className="w-full rounded-sm bg-blurple" style={{ height: `${Math.max(8, (d.applied / trendMax) * 64)}px` }} />}
                  {d.saved > 0 && <div className="w-full rounded-sm bg-zinc-300" style={{ height: `${Math.max(6, (d.saved / trendMax) * 64)}px` }} />}
                </div>
                <span className="text-[10px] text-zinc-400">{d.label}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-zinc-400">Green bars are applications, grey bars are saves.</p>
        </Card>
        <Card>
          <H2>What matters today</H2>
          <ul className="space-y-1.5">
            {brief.map((b, i) => <li key={i} className="text-xs leading-snug text-zinc-400">{b}</li>)}
          </ul>
          {recent.length > 0 && (
            <ul className="mt-3 space-y-1 border-t border-zinc-100 pt-2.5">
              {recent.slice(0, 3).map((r, i) => (
                <li key={i} className="truncate text-[11px] text-zinc-400">
                  <span className="capitalize text-zinc-700">{r.event}</span>: {r.title}{r.company ? ` at ${r.company}` : ""}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Card>
          <H2>Skill demand vs your resume</H2>
          <ul className="space-y-1.5">
            {heat.map((h) => (
              <li key={h.skill} className="flex items-center gap-2 text-xs">
                <span className="w-28 shrink-0 truncate text-zinc-300">{h.skill}</span>
                <span className="h-2 flex-1 rounded-full bg-zinc-800">
                  <span className={`block h-full rounded-full ${h.have ? "bg-blurple" : "bg-zinc-500"}`} style={{ width: `${Math.max(4, (h.demand / heatMax) * 100)}%` }} />
                </span>
                <span className="w-8 shrink-0 text-right font-mono tabular-nums text-zinc-500">{h.demand}</span>
                <Chip tone={h.have ? "green" : "amber"}>{h.have ? "have" : "gap"}</Chip>
              </li>
            ))}
            {heat.length === 0 && <li className="text-xs text-zinc-500">no postings in the feed yet.</li>}
          </ul>
        </Card>
        <Card>
          <H2>How fit is computed</H2>
          <p className="text-xs leading-5 text-zinc-400">
            fit = share of required skills found on your resume. no black box:
          </p>
          <ul className="mt-2 space-y-1 font-mono text-xs tabular-nums text-zinc-400">
            <li><span className="text-zinc-200">80+</span> strong fit</li>
            <li><span className="text-zinc-200">65+</span> good fit</li>
            <li><span className="text-zinc-200">50+</span> partial fit</li>
            <li><span className="text-zinc-200">35+</span> weak fit</li>
            <li><span className="text-zinc-200">below</span> poor fit</li>
          </ul>
          <p className="mt-2 text-xs leading-5 text-zinc-400">
            eligibility is separate: your readiness must clear the role bar. close one gap to move both numbers.
          </p>
        </Card>
      </div>
        </>
      ) : (
        <>
      <Card>
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="Keyword">
            <input className={inputCls} value={kw} onChange={(e) => setKw(e.target.value)} placeholder={isTech ? "react, sql" : "panchakarma, vaidya"} />
          </Field>
          <Field label="Location">
            <input className={inputCls} value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="kerala, remote" />
          </Field>
          <Field label="Type">
            <select className={inputCls} value={type} onChange={(e) => setType(e.target.value)}>
              <option value="all">All types</option>
              <option value="Internship">Internship</option>
              <option value="Full-time">Full-time</option>
              <option value="Govt">Govt</option>
              <option value="ministry">Ministry</option>
              <option value="research">Research</option>
              <option value="training">Training</option>
            </select>
          </Field>
          <div className="flex items-end gap-4 pb-2 text-sm text-zinc-700">
            <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={eligibleOnly} onChange={(e) => setEligibleOnly(e.target.checked)} /> Eligible only</label>
            <label className="inline-flex items-center gap-1.5"><input type="checkbox" checked={showDismissed} onChange={(e) => setShowDismissed(e.target.checked)} /> Show dismissed</label>
          </div>
        </div>
      </Card>

      {notice && <p className="mt-3 text-sm text-blurple-soft">{notice}</p>}

      <p className="mt-4 px-1 font-mono text-xs tabular-nums text-stone-500" role="status">
        {filtered.length} role{filtered.length === 1 ? "" : "s"} · {filtered.filter((j) => j.eligible).length} eligible for you
      </p>

      {!resume && (
        <div className="mt-4">
          <Empty title="Scores unlock matches" body="Match percentages and eligibility gates appear after you score a resume. The feed below is still browsable." action={<Btn to="/resume">Score your resume</Btn>} icon={<CIcon icon={cilBriefcase} width={20} height={20} />} />
        </div>
      )}

      <div className="mt-4 space-y-3">
        {filtered.map((j) => {
          const st = statusOf(events, j.id);
          const isAyushJob = j.role === "ayush" || j.kind === "ministry" || j.kind === "research" || j.kind === "training";
          const have = new Set(found.map((f) => f.toLowerCase()));
          return (
            <Card key={j.id} className="overflow-hidden p-0">
              <div className="flex gap-3.5 p-4 sm:p-5">
                <span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl font-display text-lg font-bold text-white ${isTech ? "bg-blurple" : "bg-emerald-700"}`} aria-hidden>
                  {(j.company || "A").trim()[0]}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-[15px] font-bold leading-snug text-stone-900">{j.title}</h3>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-stone-500">
                        <span className="font-medium text-stone-700">{j.company}</span>
                        <span className="inline-flex items-center gap-0.5"><CIcon icon={cilLocationPin} width={12} height={12} aria-hidden />{j.loc}</span>
                        <span className="inline-flex items-center gap-0.5"><CIcon icon={cilBriefcase} width={12} height={12} aria-hidden />{j.type}</span>
                        {j.src && <span>via {j.src}</span>}
                      </p>
                      {(j.stipend || j.deadline) && (
                        <p className="mt-1 flex flex-wrap items-center gap-1 font-mono text-[11px] text-stone-500">
                          <CIcon icon={cilClock} width={12} height={12} aria-hidden />
                          {[j.stipend, j.deadline ? `apply: ${j.deadline}` : ""].filter(Boolean).join(" · ")}
                        </p>
                      )}
                    </div>
                    {j.fit && <FitRing score={j.fit.score} isTech={isTech} />}
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    {j.src === "ccras" && <Chip tone="blue">fresh · ccras</Chip>}
                    {j.fit && <Chip tone={j.fit.score >= 65 ? "green" : j.fit.score >= 50 ? "blue" : "zinc"}>{matchBand(j.fit.score)}</Chip>}
                    {j.eligible ? <Chip tone="green">eligible</Chip> : <Chip tone="amber">needs {j.minScore}+</Chip>}
                    {isAyushJob && <Chip tone="green">ayush</Chip>}
                    {st && <Chip tone="blue">{st}</Chip>}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {j.skills.map((s) => (
                      <span key={s} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${have.has(s.toLowerCase()) ? (isTech ? "bg-blurple/15 text-blurple-soft" : "bg-emerald-50 text-emerald-800") : "bg-stone-100 text-stone-500"}`}>{s}</span>
                    ))}
                  </div>
                  {resume && <EngineFit job={j} profile={engineProfile} isTech={isTech} />}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t border-stone-100 bg-stone-50/60 px-4 py-2.5 sm:px-5">
                {j.apply && j.apply !== "#" && (
                  <a className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold text-white ${isTech ? "bg-blurple hover:bg-blurple-deep" : "bg-emerald-700 hover:bg-emerald-800"}`} href={j.apply} target="_blank" rel="noreferrer">
                    Apply <CIcon icon={cilExternalLink} width={13} height={13} aria-hidden />
                  </a>
                )}
                {!st && <Btn variant="quiet" size="sm" onClick={() => addEvent(String(j.id), "saved")}>Save</Btn>}
                {st === "saved" && <Btn variant="quiet" size="sm" onClick={() => markApplied(j)}>Mark applied</Btn>}
                {st && STATUS_FLOW.includes(st) && st !== "offer" && (
                  <Btn variant="quiet" size="sm" onClick={() => addEvent(String(j.id), STATUS_FLOW[STATUS_FLOW.indexOf(st) + 1])}>
                    Move to {STATUS_FLOW[STATUS_FLOW.indexOf(st) + 1]}
                  </Btn>
                )}
                {st !== "rejected" && <Btn variant="dangerQuiet" size="sm" onClick={() => addEvent(String(j.id), "rejected")}>Rejected</Btn>}
                <button type="button" onClick={() => toggleDismiss(String(j.id))} className="ml-auto text-xs font-medium text-stone-400 underline underline-offset-4 hover:text-stone-600">
                  {dismissed.includes(String(j.id)) ? "Restore" : "Dismiss"}
                </button>
              </div>
            </Card>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <div className="mt-4">
          <Empty title="No roles match those filters" body="Loosen a filter, or paste a posting below to add it to your feed." icon={<CIcon icon={cilSearch} width={20} height={20} />} />
        </div>
      )}

      <Card className="mt-6">
        <H2>Add a role from a posting</H2>
        <Field label="Paste the job ad" hint="The parser reads title, company, location, and skills. Confirm before it saves.">
          <textarea className={`${inputCls} min-h-24 font-mono text-xs`} value={paste} onChange={(e) => { setPaste(e.target.value); setParsed(parseJobPosting(e.target.value)); }} placeholder="Paste the full posting here" />
        </Field>
        {parsed && (
          <div className="mt-3 rounded-lg border border-blurple/30 bg-blurple/10 p-4">
            <p className="text-sm font-semibold text-zinc-100">{parsed.title}</p>
            <p className="text-sm text-zinc-400">{parsed.company} · {parsed.loc} · {parsed.type}</p>
            <p className="mt-1 text-xs text-zinc-400">Skills read: {parsed.skills.join(", ") || "none"}</p>
            <Btn className="mt-3" onClick={confirmPasted}>Confirm and add to feed</Btn>
          </div>
        )}
      </Card>
        </>
      )}
    </Page>
  );
}
