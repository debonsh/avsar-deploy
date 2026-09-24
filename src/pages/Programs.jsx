// Programs: the collaboration layer's student side — learning programs,
// workshops, mentorships, innovation challenges. Enrollments persist locally;
// "closes your gaps" ranks programs against your live gap vector.
import { useMemo, useState } from "react";
import CIcon from "@coreui/icons-react";
import { cilSchool } from "@coreui/icons";
import { Page, Card, H2, Btn, Chip, Empty } from "../components/ui.jsx";
import { useAvsar } from "../app/store.jsx";
import { PROGRAMS, PROGRAM_KINDS } from "../data/programs.js";
import { TECH_PROGRAMS, TECH_PROGRAM_KINDS } from "../data/techPrograms.js";
import { gapVector } from "../data/taxonomy.js";
import { profileForMatching } from "../lib/match.js";
import { loadQuizBest } from "../data/quiz.js";
import { loadEnrollments, toggleEnrollment } from "../lib/store.js";
import { targetRoleFor } from "../lib/track.js";

const KINDS = ["all", "program", "workshop", "mentorship", "challenge"];

function programsIn(list, skill = "") {
  const k = String(skill).toLowerCase();
  return list.filter((p) => p.skills.includes(k));
}

export default function Programs() {
  const { track, lane, resume } = useAvsar();
  const [kind, setKind] = useState("all");
  const [enrolled, setEnrolled] = useState(() => loadEnrollments());
  const found = useMemo(() => resume?.result?.found || [], [resume]);
  const quizBest = loadQuizBest(lane);
  // Each universe lists only its own programs: the Tech portal never shows
  // SHISHIKSHA/CCRAS seats, the Vaidya portal never shows hackathons.
  const isTech = track === "tech";
  const ALL = isTech ? TECH_PROGRAMS : PROGRAMS;
  const KINDS_FOR = isTech ? TECH_PROGRAM_KINDS : PROGRAM_KINDS;

  const held = useMemo(() => {
    const p = profileForMatching(lane, found, quizBest);
    const levels = {};
    for (const s of p.skills) levels[s] = p.levels[s];
    return levels;
  }, [lane, found, quizBest]);

  const gaps = useMemo(() => gapVector(targetRoleFor(lane), held).slice(0, 3), [held, lane]);
  const recIds = useMemo(() => {
    const ids = [];
    for (const g of gaps) for (const p of programsIn(ALL, g.skill)) if (!ids.includes(p.id)) ids.push(p.id);
    return ids.slice(0, 4);
  }, [gaps, ALL]);

  const list = ALL.filter((p) => kind === "all" || p.kind === kind);

  function toggle(id) {
    setEnrolled(toggleEnrollment(id));
  }

  return (
    <Page
      title="Programs"
      kicker="Learn · Closes gaps"
      sub={isTech
        ? "Tech learning programs, workshops, mentorships, and hackathons — each tagged with the skill gap it closes. Providers are hand-verified; links never AI-invented."
        : "Industry learning programs, workshops, mentorships, and innovation challenges — each tagged with the skill gap it closes. Providers are hand-verified; links never AI-invented."}
    >
      {recIds.length > 0 && (
        <Card className={isTech ? "border-blurple/40" : "border-emerald-200"}>
          <H2>Closes your gaps first</H2>
          <ul className="space-y-2">
            {recIds.map((id) => {
              const p = ALL.find((x) => x.id === id);
              if (!p) return null;
              return (
                <li key={id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className={`font-medium ${isTech ? "text-zinc-100" : "text-stone-800"}`}>{p.title} <span className={`font-normal ${isTech ? "text-zinc-500" : "text-stone-500"}`}>· {p.provider}</span></span>
                  <Btn size="sm" variant={enrolled.includes(id) ? "quiet" : "primary"} onClick={() => toggle(id)}>
                    {enrolled.includes(id) ? "Enrolled ✓" : "Enroll"}
                  </Btn>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <div className="mb-4 mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Program kinds">
        {KINDS.map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={kind === k}
            onClick={() => setKind(k)}
            className={`min-h-[40px] rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              kind === k
                ? isTech ? "bg-blurple text-white" : "bg-emerald-700 text-white"
                : isTech ? "border border-zinc-800 bg-zinc-950 text-zinc-200 hover:border-zinc-700" : "border border-emerald-200 bg-white text-emerald-900 hover:border-emerald-400"
            }`}
          >
            {k === "all" ? `All (${ALL.length})` : `${KINDS_FOR[k]}s`}
          </button>
        ))}
      </div>

      {list.length === 0 && <Empty title="Nothing here yet" body="No programs of this kind are listed right now." icon={<CIcon icon={cilSchool} width={20} height={20} />} />}
      <div className="space-y-3">
        {list.map((p) => (
          <Card key={p.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className={`text-[15px] font-bold ${isTech ? "text-zinc-100" : "text-stone-900"}`}>{p.title}</h3>
                <p className={`mt-0.5 text-[13px] ${isTech ? "text-zinc-500" : "text-stone-500"}`}>{p.provider}{p.mode ? ` · ${p.mode}` : ""}{p.hours ? ` · ~${p.hours} hrs` : ""}{p.stipend ? ` · ${p.stipend}` : ""}{p.deadline ? ` · ${p.deadline}` : ""}</p>
                {p.note && <p className={`mt-1 text-xs leading-5 ${isTech ? "text-zinc-500" : "text-stone-500"}`}>{p.note}</p>}
              </div>
              <Chip tone="green">{KINDS_FOR[p.kind]}</Chip>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {p.skills.map((s) => (
                <Chip key={s}>{s}</Chip>
              ))}
              {p.cert && <Chip tone="blue">certificate</Chip>}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Btn size="sm" variant={enrolled.includes(p.id) ? "quiet" : "primary"} onClick={() => toggle(p.id)}>
                {enrolled.includes(p.id) ? "Enrolled ✓ — tap to leave" : "Enroll"}
              </Btn>
              <a className={`inline-flex min-h-[32px] items-center text-xs font-semibold underline underline-offset-4 ${isTech ? "text-blurple-soft" : "text-emerald-700"}`} href={p.url} target="_blank" rel="noreferrer">
                Provider site ↗
              </a>
            </div>
          </Card>
        ))}
      </div>
    </Page>
  );
}
