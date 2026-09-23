// Resume score. Operate surface: input console on top, then a 12-col result grid.
// Score rail left (sticky on desktop), evidence right. Same logic as before.
// The target track is pickable on the tech portal (sde/data/marketing/govt) and
// fixed to ayush on the vaidya portal; the pick writes profile.track, which is
// also the lane every other page scores with.
import { useMemo, useState } from "react";
import { ArrowRight, ExternalLink, Leaf, Play } from "lucide-react";
import { Page, Card, H2, Btn, Field, Chip, CountUp, Empty, Meter, inputCls, VaidyaLevel } from "../components/ui.jsx";
import { useAvsar } from "../app/store.jsx";
import { scoreResume, calculateMainScore, normalizeScoreResult, rankFor, engLevelFor, rankRoles, ROLES } from "../lib/score.js";
import { parseResumeFile, extractSections } from "../lib/parseResume.js";
import { AYUSH_RESUMES, RESUME_ANATOMY, RESUME_BULLETS, SKILL_WHY } from "../ayush/resumes.js";
import { TECH_RESUMES, TECH_RESUME_ANATOMY, TECH_RESUME_BULLETS, TECH_SKILL_WHY } from "../data/techResumes.js";
import { videosFor, resumeTips } from "../data/courses.js";
import { questPairsToProof } from "../lib/score.js";
import { recordDay } from "../lib/progress.js";
import { completedSkillIdsForRole } from "../lib/progress.js";
import { loadJSON } from "../lib/storage.js";
import { vaidyaLevel } from "../ayush/scoring.js";
import { TECH_LANES } from "../lib/track.js";

export default function Resume() {
  const { lane, resume, saveResume, updateProfile } = useAvsar();
  const [text, setText] = useState(() => resume?.text || "");
  const [notice, setNotice] = useState("");

  const result = resume?.result || null;
  // ponytail: stored scores predate the current shape (breakdown/found/missing
  // were null in old builds). normalize once so every reader below is safe.
  const view = normalizeScoreResult(result);
  const staleShape = Boolean(result) && view.breakdown.length === 0;
  const pairs = completedSkillIdsForRole(lane).length;
  const proof = questPairsToProof(pairs);
  const interviewBest = loadJSON("avsar-interview-best", 0);
  const main = result ? calculateMainScore(result.total, interviewBest, proof, lane) : 0;

  const sections = useMemo(() => (result ? extractSections(resume.text) : []), [result, resume]);
  const tips = useMemo(() => (result ? resumeTips(result, lane) : []), [result, lane]);
  // a scored text may read more like another tech lane — offer the switch, never force it.
  const bestFit = useMemo(() => {
    if (lane === "ayush" || !text.trim()) return null;
    return rankRoles(text).find((r) => TECH_LANES.includes(r.key) && r.key !== lane) || null;
  }, [lane, text]);

  const isAyush = lane === "ayush";
  const vaidya = isAyush ? vaidyaLevel(main) : null;
  const eng = isAyush ? null : engLevelFor(main);
  // Gap guidance speaks the portal's language: case-log proof for vaidya,
  // shipped proof for tech.
  const WHY = isAyush ? SKILL_WHY : TECH_SKILL_WHY;
  const ANATOMY = isAyush ? RESUME_ANATOMY : TECH_RESUME_ANATOMY;
  const BULLETS = isAyush ? RESUME_BULLETS : TECH_RESUME_BULLETS;

  async function onFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      setText(await parseResumeFile(f));
      setNotice("");
    } catch {
      setNotice("Could not read that file. Paste the text instead.");
    }
    e.target.value = "";
  }

  function score() {
    if (!text.trim()) {
      setNotice("Paste your resume text or upload a file first.");
      return;
    }
    saveResume(text, scoreResume(text, lane), lane);
    recordDay("resume");
    setNotice("");
  }

  return (
    <Page
      title="Resume score"
      sub="Five dimensions, every point traced to a line. Nothing hidden, nothing averaged away."
      actions={result && <Btn to="/quests">Turn gaps into quests <ArrowRight aria-hidden /></Btn>}
    >
      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Target track" hint={isAyush ? undefined : "Scoring switches instantly — the pick is saved to your profile."}>
            {isAyush ? (
              <p className="flex h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900">
                <Leaf className="size-4" aria-hidden /> Ayush Professional (BAMS)
              </p>
            ) : (
              <select className={inputCls} value={lane} onChange={(e) => updateProfile({ track: e.target.value })}>
                {TECH_LANES.map((k) => (
                  <option key={k} value={k}>{ROLES[k]?.label || k}</option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Resume file" hint="PDF or plain text. Parsed on your device.">
            <input type="file" accept=".pdf,.txt,.md" onChange={onFile} className="text-sm text-zinc-400 file:mr-3 file:rounded-lg file:border file:border-stone-300 file:bg-stone-100 file:px-3 file:py-1.5 file:text-sm file:text-zinc-200 hover:file:border-zinc-600" />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Resume text">
            <textarea
              className={`${inputCls} min-h-44 font-mono text-xs leading-5`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your resume text here"
            />
          </Field>
        </div>
        {notice && <p className="mt-2 text-sm text-red-400" role="alert">{notice}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Btn onClick={score}>Score my resume</Btn>
          <Btn variant="quiet" onClick={() => setText(isAyush ? AYUSH_RESUMES[0].text : TECH_RESUMES[0].text)}>Use a sample resume</Btn>
          {bestFit && (
            <p className="w-full text-sm text-zinc-400">
              This text reads more like <strong className="text-zinc-100">{bestFit.label}</strong>{" "}
              <span className="font-mono tabular-nums">({bestFit.total}/95)</span>.{" "}
              <button
                type="button"
                className="font-medium text-blurple-soft underline underline-offset-4"
                onClick={() => updateProfile({ track: bestFit.key })}
              >
                Switch track
              </button>
            </p>
          )}
        </div>
      </Card>

      {!result && (
        <div className="mt-4 space-y-4">
          <Empty
            title="No score yet"
            body="Press Score and this page turns into your breakdown: dimensions, skills, sections, and the exact fixes."
          />
          <Card>
            <H2>{isAyush ? "What a strong BAMS resume contains" : "What a strong tech resume contains"}</H2>
            <p className="mb-4 text-xs leading-5 text-zinc-500">The order screeners skim. Miss a row and the reader stops there.</p>
            <ol className={`relative space-y-4 border-l-2 pl-0 ${isAyush ? "border-emerald-200" : "border-blurple/40"}`}>
              {ANATOMY.map((a, i) => (
                <li key={a.section} className="relative pl-8">
                  <span className={`absolute -left-[13px] top-0.5 flex size-6 items-center justify-center rounded-full text-[11px] font-bold tabular-nums text-white ${isAyush ? "bg-emerald-700" : "bg-blurple"}`}>{i + 1}</span>
                  <p className="text-sm font-semibold text-zinc-100">{a.section}</p>
                  <p className="text-sm leading-6 text-zinc-300">{a.what}</p>
                  <p className="text-xs leading-5 text-zinc-500">{a.why}</p>
                </li>
              ))}
            </ol>
          </Card>
          <Card>
            <H2>Same line, weak vs strong</H2>
            <p className="mb-4 text-xs leading-5 text-zinc-500">{isAyush ? "Every strong line names a place, a duration, and a number." : "Every strong line names a stack, a link, and a number."}</p>
            <div className="space-y-5">
              {BULLETS.map((b, i) => (
                <figure key={i} className="overflow-hidden rounded-xl border border-stone-200">
                  <blockquote className="border-b border-stone-200 bg-stone-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">Instead of this</p>
                    <p className="mt-1 text-sm leading-6 text-stone-500">{b.weak}</p>
                  </blockquote>
                  <blockquote className={`px-4 py-3 ${isAyush ? "bg-emerald-50/70" : "bg-blurple/10"}`}>
                    <p className={`text-[11px] font-semibold uppercase tracking-wide ${isAyush ? "text-emerald-700" : "text-blurple-soft"}`}>Write this</p>
                    <p className="mt-1 text-sm font-medium leading-6 text-stone-800">{b.strong}</p>
                  </blockquote>
                  <figcaption className="bg-white px-4 py-2.5 text-xs leading-5 text-zinc-500">{b.note}</figcaption>
                </figure>
              ))}
            </div>
          </Card>
        </div>
      )}

      {result && (
        <div className="mt-4 grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Card className="lg:sticky lg:top-20">
              <p className="font-mono text-[11px] uppercase tracking-wide text-zinc-500">Readiness</p>
              <p className="mt-1 font-display text-6xl font-bold tabular-nums tracking-[-0.03em] text-zinc-50">
                <CountUp to={main} />
                <span className="text-xl text-zinc-500">/100</span>
              </p>
              {vaidya && (
                <div className="mt-3">
                  <VaidyaLevel level={vaidya.id} />
                  <p className="mt-1 font-mono text-xs text-emerald-400">{vaidya.label} · {vaidya.hi}</p>
                </div>
              )}
              <p className="mt-2">
                <Chip tone="green">{isAyush ? rankFor(main) : eng.label}</Chip>
              </p>
              <p className="mt-2 font-mono text-[11px] tabular-nums leading-5 text-zinc-500">
                resume score {view.total}/95 · {pairs} quest-verified pair{pairs === 1 ? "" : "s"} · interview {interviewBest}
              </p>
              {staleShape && (
                <p className="mt-2 font-mono text-[11px] leading-5 text-amber-300">
                  saved score is from an older version: press score again to rebuild the breakdown.
                </p>
              )}
              <div className="mt-5 space-y-4 border-t border-zinc-800 pt-4">
                {view.breakdown.map((d) => (
                  <div key={d.label}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-2 text-xs">
                      <span className="font-medium text-zinc-200">{d.label}</span>
                      <span className="font-mono tabular-nums text-zinc-500">{d.pts}/{d.max}</span>
                    </div>
                    <Meter value={d.pts} max={d.max} />
                    <ul className="mt-1.5 space-y-1">
                      {(Array.isArray(d.why) ? d.why : []).map((w, i) => (
                        <li key={i} className="text-xs leading-5 text-zinc-500">· {w}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="space-y-4 lg:col-span-8">
            {tips.length > 0 && (
              <Card>
                <H2>Fixes that raise this score</H2>
                <ol className="divide-y divide-zinc-800">
                  {tips.map((t, i) => (
                    <li key={i} className="flex items-baseline gap-3 py-2.5 first:pt-0 last:pb-0">
                      <span className="font-mono text-xs tabular-nums text-blurple-soft">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <p className="text-sm leading-6 text-zinc-200">{t}</p>
                    </li>
                  ))}
                </ol>
              </Card>
            )}

            <Card>
              <H2>
                Skills on your resume{" "}
                <span className="font-mono font-normal tabular-nums text-zinc-500">{view.found.length}</span>
              </H2>
              <div className="flex flex-wrap gap-1.5">
                {view.found.map((s) => <Chip key={s} tone="green">{s}</Chip>)}
                {view.found.length === 0 && <p className="text-sm text-zinc-400">None detected yet.</p>}
              </div>
              <H2 className="mt-5">
                Missing for this track{" "}
                <span className="font-mono font-normal tabular-nums text-zinc-500">{view.missing.length}</span>
              </H2>
              <div className="flex flex-wrap gap-1.5">
                {view.missing.map((s) => <Chip key={s} tone="amber">{s}</Chip>)}
                {view.missing.length === 0 && <p className="text-sm text-zinc-400">Nothing missing. Apply now.</p>}
              </div>
              {view.missing.filter((s) => WHY[s.toLowerCase()]).length > 0 && (
                <div className="mt-4 border-t border-zinc-800 pt-4">
                  <p className="mb-2 text-sm font-semibold text-zinc-100">What to add for each gap</p>
                  <dl className="space-y-0 divide-y divide-stone-100">
                    {view.missing.filter((s) => WHY[s.toLowerCase()]).slice(0, 4).map((s) => {
                      const info = WHY[s.toLowerCase()];
                      return (
                        <div key={s} className="border-l-2 border-amber-400 py-2.5 pl-3">
                          <dt className="text-sm font-semibold text-stone-800">{s}</dt>
                          <dd className="mt-0.5 text-xs leading-5 text-stone-600">{info.why}</dd>
                          <dd className="mt-0.5 text-xs leading-5 text-stone-600"><span className="font-semibold text-emerald-800">Counts as proof: </span>{info.proof}</dd>
                        </div>
                      );
                    })}
                  </dl>
                </div>
              )}
            </Card>

            <Card>
              <H2>Sections detected</H2>
              {sections.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {sections.map((s) => <Chip key={s.section}>{s.title}</Chip>)}
                </div>
              ) : (
                <p className="text-sm leading-6 text-zinc-400">
                   No standard sections found. Add headers like Experience, Postings, Skills, Education:
                   parsers and humans both skim for them.
                </p>
              )}
            </Card>

            {view.missing.slice(0, 3).map((s) => {
              const vids = videosFor(s);
              if (!vids.length) return null;
              return (
                <Card key={s}>
                  <div className="flex items-center justify-between gap-2">
                    <H2 className="mb-0">Start {s} today</H2>
                    <Btn to="/quests" variant="quiet" size="sm">Make it a quest</Btn>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {vids.slice(0, 2).map((v, i) => (
                      <li key={i}>
                        <a
                          className="group flex items-center gap-2.5 rounded-lg border border-zinc-800 px-3 py-2.5 hover:border-zinc-600"
                          href={v.u}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Play className="size-4 shrink-0 text-blurple-soft" aria-hidden />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-200 group-hover:text-zinc-50">
                            {v.t}
                          </span>
                          <ExternalLink className="size-3.5 shrink-0 text-zinc-600" aria-hidden />
                        </a>
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </Page>
  );
}