// Quests: turn every missing skill into proof. Progress is the reward:
// a live completion bar, per-week wins, springy checks, mastery pips.
// One tree per scoring lane: BAMS checklist on the vaidya portal, the
// course→project ladder on tech.
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { Check, ExternalLink } from "lucide-react";
import { Page, Card, Btn, Chip, CountUp, Field, Empty, Meter, inputCls } from "../components/ui.jsx";
import { useAvsar } from "../app/store.jsx";
import { roadmapGenerator } from "../lib/roadmapGenerator.js";
import { JOBS, TECH_JOBS } from "../data/jobs.js";
import {
  isCourseDone, isProjectDone, setQuestDone, getEvidence, setEvidence,
  completedSkillIdsForRole, masteryLevel,
} from "../lib/progress.js";
import { isEvidenceUrl } from "../lib/quests.js";
import { loadQuizBest } from "../data/quiz.js";

function QuestCheck({ done, onToggle, label }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={label}
      onClick={onToggle}
      className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
        done ? "border-blurple bg-blurple" : "border-zinc-700 hover:border-zinc-500"
      }`}
    >
      {done && (
        <motion.span
          key="on"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 600, damping: 22 }}
          className="flex"
        >
          <Check className="size-3.5 text-white" strokeWidth={3} aria-hidden />
        </motion.span>
      )}
    </button>
  );
}

function MasteryPips({ level }) {
  if (level <= 0) return null;
  return (
    <span className="inline-flex items-center gap-1" title={`Mastery ${level} of 3`}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`size-1.5 rounded-sm ${i <= level ? "bg-blurple" : "bg-zinc-800"}`}
          aria-hidden
        />
      ))}
      <span className="ml-1 font-mono text-[11px] tabular-nums text-zinc-500">Lv {level}</span>
    </span>
  );
}

// BAMS-specific quest weeks for the ayush lane
const AYUSH_WEEKS = [
  {
    week: 1,
    title: "Shishiksha Orientation",
    tasks: [
      { skill: "shishiksha", text: "Complete NCISM bench-to-bedside 6-day orientation module", link: { u: "https://ncismindia.org/", t: "NCISM portal" } },
      { skill: "shishiksha", text: "Log all 6 days in e-logbook with supervisor signature", link: null },
      { skill: "shishiksha", text: "Submit orientation checklist to college placement cell", link: null },
    ],
  },
  {
    week: 2,
    title: "OPD/IPD Clinical Exposure",
    tasks: [
      { skill: "diagnosis", text: "Document 5 OPD case sheets in standard format", link: null },
      { skill: "panchakarma", text: "Observe 2 panchakarma procedures with written log", link: null },
      { skill: "documentation", text: "Complete 10 IPD case summaries", link: null },
    ],
  },
  {
    week: 3,
    title: "Dravyaguna & Pharmacology",
    tasks: [
      { skill: "dravyaguna", text: "Build 20-plant herbarium with Latin names + uses", link: null },
      { skill: "pharmacology", text: "Complete SWAYAM Ayurveda Biology module", link: { u: "https://swayam.gov.in/", t: "SWAYAM" } },
      { skill: "dravyaguna", text: "Photograph and label herbarium specimens", link: null },
    ],
  },
  {
    week: 4,
    title: "GMP & Digital Health",
    tasks: [
      { skill: "gmp", text: "Write 1-page GMP gap note for college pharmacy unit", link: null },
      { skill: "hims", text: "Enter 15 cases in digital logbook template", link: { u: "https://abdm.gov.in/", t: "ABDM portal" } },
      { skill: "hims", text: "Complete ABDM Digital Health Basics course", link: { u: "https://abdm.gov.in/", t: "ABDM" } },
    ],
  },
  {
    week: 5,
    title: "Research & Pharmacovigilance",
    tasks: [
      { skill: "research", text: "Complete CCRAS Research Orientation module", link: { u: "https://www.ccras.nic.in/", t: "CCRAS" } },
      { skill: "pharmacovigilance", text: "Submit 3 ADR reports to PvPI portal", link: { u: "https://www.ipc.gov.in/", t: "PvPI portal" } },
      { skill: "research", text: "Write mini research proposal on ayush clinical topic", link: null },
    ],
  },
  {
    week: 6,
    title: "Proof Portfolio & Application",
    tasks: [
      { skill: "documentation", text: "Compile all evidence links into portfolio", link: null },
      { skill: "diagnosis", text: "Get mentor sign-off on 5 case sheets", link: null },
      { skill: "shishiksha", text: "Apply to ayush internship with verified portfolio", link: null },
    ],
  },
];

export default function Quests() {
  const { lane, track, resume } = useAvsar();
  const [, bump] = useState(0);
  const missing = useMemo(() => resume?.result?.missing || [], [resume]);
  const feed = track === "tech" ? TECH_JOBS : JOBS;
  const weeks = useMemo(() => roadmapGenerator(missing, lane, feed), [missing, lane, feed]);
  const quizBest = loadQuizBest(lane);
  const refresh = () => bump((n) => n + 1);

  // Ayush lane gets its own BAMS-centric quest track
  const isAyush = lane === "ayush";
  const displayWeeks = isAyush ? AYUSH_WEEKS : weeks;
  const planSub = isAyush
    ? "Shishiksha to rotatory to proof. Check things off and the bar moves with you."
    : "One course plus one project makes a verified pair. Check things off and the bar moves with you.";

  if (!resume) {
    return (
      <Page title="Quests" sub="Turn every missing skill into proof. Finish a week, unlock more roles.">
        <Empty
          title="No resume, no quests"
          body="Quests are built from the gaps in your resume. Score it once and your plan writes itself."
          action={<Btn to="/resume">Score your resume</Btn>}
        />
      </Page>
    );
  }

  if (!displayWeeks.length) {
    return (
      <Page title="Quests" sub="Turn every missing skill into proof. Finish a week, unlock more roles.">
        <Empty
          title="Nothing missing. Seriously."
          body="Your resume covers this track end to end. New scores rebuild this plan if anything slips."
          action={<Btn to="/jobs">Browse eligible roles</Btn>}
        />
      </Page>
    );
  }

  const all = displayWeeks.flatMap((w) => w.tasks.map((t) => ({ ...t, week: w.week })));
  const isDone = (t) =>
    t.link ? isCourseDone(lane, t.skill) : isProjectDone(lane, t.skill);
  const doneCount = all.filter(isDone).length;
  const pct = Math.round((doneCount / all.length) * 100);
  const verified = completedSkillIdsForRole(lane).length;
  const finished = doneCount === all.length;

  return (
    <Page
      title={isAyush ? "BAMS Quests" : "Quests"}
      sub={planSub}
    >
      <Card className="mb-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="font-display text-3xl font-bold tabular-nums text-zinc-50">
              <CountUp to={pct} />%
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              {doneCount} of {all.length} done · {verified} skill{verified === 1 ? "" : "s"} verified
            </p>
          </div>
          {finished && <Chip tone="blurple">Plan complete</Chip>}
        </div>
        <div className="mt-3">
          <Meter value={doneCount} max={all.length} />
        </div>
      </Card>

      {finished && (
        <Card className="mb-4 border-blurple/40 bg-blurple/10">
          <p className="text-sm font-semibold text-zinc-100">Every gap closed. That is the whole game.</p>
          <p className="mt-1 text-sm leading-6 text-zinc-400">
            Your proof links below are what recruiters actually open. Go get the interviews.
          </p>
          <Btn to="/jobs" size="sm" className="mt-3">Browse eligible roles</Btn>
        </Card>
      )}

      <div className="space-y-4">
        {displayWeeks.map((w) => {
          const total = w.tasks.length;
          const done = w.tasks.filter((t) =>
            t.link ? isCourseDone(lane, t.skill) : isProjectDone(lane, t.skill)
          ).length;
          const weekDone = done === total;
          return (
            <Card key={w.week} className={weekDone ? "border-zinc-700" : ""}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="font-display text-sm font-bold text-zinc-100">{isAyush ? w.title : `Week ${w.week}`}</h2>
                {weekDone ? (
                  <Chip tone="blurple">Week complete</Chip>
                ) : (
                  <span className="font-mono text-xs tabular-nums text-zinc-500">{done}/{total}</span>
                )}
              </div>
              <ul className="divide-y divide-zinc-800">
                {w.tasks.map((t, i) => {
                  const kind = t.link ? "course" : "project";
                  const doneTask = kind === "course" ? isCourseDone(lane, t.skill) : isProjectDone(lane, t.skill);
                  const ev = kind === "project" ? getEvidence(lane, t.skill) : "";
                  const level = masteryLevel(lane, t.skill, quizBest);
                  const toggle = () => {
                    setQuestDone(lane, t.skill, kind, !doneTask);
                    refresh();
                  };
                  return (
                    <li key={i} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-start gap-2.5">
                        <QuestCheck done={doneTask} onToggle={toggle} label={t.text} />
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm leading-6 ${doneTask ? "text-zinc-500 line-through" : "text-zinc-200"}`}>
                            {t.text}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2">
                            <Chip tone={kind === "course" ? "blurple" : "zinc"}>
                              {kind === "course" ? "Course" : "Project"}
                            </Chip>
                            {t.link && (
                              <a
                                className="inline-flex items-center gap-1 text-xs font-medium text-blurple-soft underline"
                                href={t.link.u}
                                target="_blank"
                                rel="noreferrer"
                              >
                                {t.link.t} <ExternalLink className="size-3" aria-hidden />
                              </a>
                            )}
                            <MasteryPips level={level} />
                          </div>
                          {kind === "project" && !doneTask && (
                            <div className="mt-2">
                              <Field
                                label="Your proof link"
                                hint="Link your e-logbook entry, case-log sheet, herbarium photos, or mentor sign-off. This link is what unlocks the skill."
                              >
                                <input
                                  className={inputCls}
                                  defaultValue={ev}
                                  placeholder="https://drive link to your case log"
                                  onBlur={(e) => {
                                    const v = e.target.value.trim();
                                    if (!v) return;
                                    if (!isEvidenceUrl(v)) {
                                      e.target.setCustomValidity("That does not look like a logbook or drive link.");
                                      e.target.reportValidity();
                                      e.target.setCustomValidity("");
                                      return;
                                    }
                                    setEvidence(lane, t.skill, v);
                                    refresh();
                                  }}
                                />
                              </Field>
                            </div>
                          )}
                          {kind === "project" && doneTask && ev && (
                            <a
                              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-blurple-soft underline"
                              href={ev}
                              target="_blank"
                              rel="noreferrer"
                            >
                              View proof <ExternalLink className="size-3" aria-hidden />
                            </a>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          );
        })}
      </div>
    </Page>
  );
}