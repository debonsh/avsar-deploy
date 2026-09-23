import { useEffect, useState } from "react";
import { Page, Card, H2, Btn, Chip, Empty } from "../components/ui.jsx";
import { COHORT, cohortStats, enrich, toCSV } from "../lib/cohort.js";
import { demandHeatmap } from "../lib/dashboard.js";
import { JOBS } from "../data/jobs.js";
import { AYUSH_JOBS } from "../data/ayushSeed.js";
import { loadAssessments, loadRemoteAssessments, loadFeedback, loadRemoteFeedback, analyticsSummary } from "../lib/backend.js";

// Real placement data first (local mirror, then Supabase). The demo cohort
// below is labeled as sample data, never presented as a real college (R-38).
export default function Institute() {
  const [real, setReal] = useState(() => loadAssessments());
  const [feedback, setFeedback] = useState(() => loadFeedback());

  useEffect(() => {
    loadRemoteAssessments().then((r) => { if (r && r.length) setReal(r); }).catch(() => {});
    loadRemoteFeedback().then((r) => { if (r) setFeedback(r); }).catch(() => {});
  }, []);

  const summary = analyticsSummary(real, feedback);

  function downloadCSV(rows, name) {
    const blob = new Blob([toCSV(rows)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  if (!real.length) {
    const stats = cohortStats(COHORT);
    const rows = enrich(COHORT);
    const heat = demandHeatmap([...AYUSH_JOBS, ...JOBS], [], 8);
    const heatMax = Math.max(1, ...heat.map((h) => h.demand));
    return (
      <Page
        title="Institute"
        sub="Cohort readiness for placement cells. Showing sample data until your students score."
        actions={<Btn variant="quiet" onClick={() => downloadCSV(rows, "sample-cohort.csv")}>Export sample CSV</Btn>}
      >
        <div className="grid gap-4 sm:grid-cols-4">
          <Card><H2>Students</H2><p className="text-3xl font-semibold tabular-nums">{stats.total}</p><p className="text-xs text-zinc-400">sample cohort</p></Card>
          <Card><H2>Gold or better</H2><p className="text-3xl font-semibold tabular-nums">{stats.goldPct}%</p><p className="text-xs text-zinc-400">readiness 65 plus</p></Card>
          <Card><H2>Scored</H2><p className="text-3xl font-semibold tabular-nums">{stats.funnel.scored}</p><p className="text-xs text-zinc-400">have a resume score</p></Card>
          <Card><H2>Applied</H2><p className="text-3xl font-semibold tabular-nums">{stats.funnel.applied}</p><p className="text-xs text-zinc-400">tracked applications</p></Card>
        </div>
        <Card className="mt-4">
          <H2>Average readiness by track</H2>
          <ul className="space-y-1.5">
            {Object.entries(stats.avgByRole).map(([k, v]) => (
              <li key={k} className="flex justify-between text-sm"><span className="text-zinc-400">{k}</span><span className="font-medium tabular-nums">{v}</span></li>
            ))}
          </ul>
          <H2 className="mt-4">Most common gaps</H2>
          <div className="flex flex-wrap gap-1.5">
            {stats.topGaps.map((g) => <Chip key={g.skill}>{g.skill} ({g.n})</Chip>)}
          </div>
        </Card>
        <Card className="mt-4">
          <H2>Policymaker view — live demand vs cohort supply</H2>
          <p className="mb-2 text-xs leading-5 text-zinc-400">
            Demand counted from the feed ({[...AYUSH_JOBS, ...JOBS].length} postings). Supply is the gap list above. The mismatch is the curriculum memo.
          </p>
          <ul className="space-y-1.5">
            {heat.map((h) => (
              <li key={h.skill} className="flex items-center gap-2 text-xs">
                <span className="w-32 shrink-0 truncate text-zinc-300">{h.skill}</span>
                <span className="h-2 flex-1 rounded-full bg-zinc-800">
                  <span className="block h-full rounded-full bg-blurple" style={{ width: `${Math.max(4, (h.demand / heatMax) * 100)}%` }} />
                </span>
                <span className="w-8 shrink-0 text-right font-mono tabular-nums text-zinc-500">{h.demand}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="mt-4">
          <H2>Sample cohort roster (demo data)</H2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="text-xs text-zinc-400"><th className="py-1 pr-3 font-medium">Name</th><th className="py-1 pr-3 font-medium">Track</th><th className="py-1 pr-3 font-medium">Readiness</th><th className="py-1 pr-3 font-medium">Rank</th><th className="py-1 font-medium">Applied</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.name} className="border-t border-zinc-100">
                    <td className="py-1.5 pr-3 text-zinc-200">{r.name}</td>
                    <td className="py-1.5 pr-3 text-zinc-400">{r.role}</td>
                    <td className="py-1.5 pr-3 tabular-nums">{r.main}</td>
                    <td className="py-1.5 pr-3"><Chip tone={r.main >= 65 ? "green" : "zinc"}>{r.rank}</Chip></td>
                    <td className="py-1.5 text-zinc-400">{r.applied ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Page>
    );
  }

  return (
    <Page
      title="Institute"
      sub={`${summary.total} scored assessments on this device and workspace.`}
      actions={<Btn variant="quiet" onClick={() => downloadCSV(real.map((a, i) => ({ name: `student-${i + 1}`, role: a.role_key, ats: a.ats, quiz: 0, quests: 0, main: a.ats, rank: "", applied: false })), "assessments.csv")}>Export CSV</Btn>}
    >
      <div className="grid gap-4 sm:grid-cols-4">
        <Card><H2>Assessments</H2><p className="text-3xl font-semibold tabular-nums">{summary.total}</p></Card>
        <Card><H2>Average rating</H2><p className="text-3xl font-semibold tabular-nums">{summary.avgRating || "not yet"}</p><p className="text-xs text-zinc-400">{summary.ratingCount} ratings</p></Card>
        {Object.entries(summary.byRole).slice(0, 2).map(([k, v]) => (
          <Card key={k}><H2>Track: {k}</H2><p className="text-3xl font-semibold tabular-nums">{v}</p></Card>
        ))}
      </div>
      <Card className="mt-4">
        <H2>Score bands (resume score)</H2>
        <ul className="space-y-1.5">
          {Object.entries(summary.bands).map(([b, n]) => (
            <li key={b} className="flex justify-between text-sm"><span className="text-zinc-400">{b}</span><span className="font-medium tabular-nums">{n}</span></li>
          ))}
        </ul>
        {summary.comments.length > 0 && (
          <>
            <H2 className="mt-4">Latest student comments</H2>
            <ul className="space-y-1.5">
              {summary.comments.map((c, i) => <li key={i} className="text-sm text-zinc-400">{c.rating ? `${c.rating}/5: ` : ""}{c.comment}</li>)}
            </ul>
          </>
        )}
        {summary.comments.length === 0 && (
          <div className="mt-4">
            <Empty title="No feedback yet" body="Students can leave a star rating on their Portfolio page. It appears here." />
          </div>
        )}
      </Card>
    </Page>
  );
}
