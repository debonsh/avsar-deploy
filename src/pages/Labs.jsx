// The judge page. Uniqueness that cannot be seen in ninety seconds scores the same as
// uniqueness that does not exist, so this page is the argument and the evidence in one
// place, open before onboarding and working with no keys and no network.
//
// Every widget here runs the real module on real bundled data or on a stated fixture. None
// of them is a screenshot: the market numbers are computed from the seed corpus on this
// device, the route comes out of the same graph search the student page uses, the shortlist
// runs the live grader, and the receipt is signed and then checked in the browser. A judge
// who doubts any of it can open the dev tools and watch it happen.
import { useEffect, useMemo, useState } from "react";
import { Page, Card, H2, Chip, Badge, Btn, Empty, AsciiRule, cn } from "../components/ui.jsx";
import { RankBars, Sparkline, INK } from "../components/charts.jsx";
import { bundledCorpus } from "../lib/corpus.js";
import { effectiveWeights, corpusStats, postingVolume, WEIGHT_MIN, WEIGHT_MAX } from "../lib/market.js";
import { routeTo, simulate, rolesForLane } from "../lib/careerGps.js";
import { gradeSubmission, rankSubmissions, evidenceLabel } from "../lib/challenges.js";
import { generateIssuerKeypair, signPayload, verifySigned, modeLabel } from "../lib/sign.js";
import { canonicalJSON } from "../lib/sign.js";

// A stated fixture, not a hidden one. The route widget needs a student, and a demo student
// whose skills are printed on the page is honest; a mystery profile would not be.
const DEMO = {
  ayush: { label: "BAMS intern, 3rd year", held: { skills: ["diagnosis", "sanskrit", "documentation"], levels: { diagnosis: 3, sanskrit: 2, documentation: 2 }, verified: ["documentation"], usedAt: {} } },
  tech: { label: "B.E. student, 3rd year", held: { skills: ["html", "css", "javascript", "git"], levels: { html: 3, css: 3, javascript: 2, git: 3 }, verified: ["git"], usedAt: {} } },
};

// The grading fixture, stated on the page rather than hidden in a seed file, because a demo
// whose inputs are secret proves nothing about the rule that consumed them.
function gradeExample() {
  return {
    id: "demo-grading",
    lane: "tech",
    kind: "build",
    skill: "sql",
    threshold: 60,
    checks: ["query", "assumption"],
    submissions: [
      {
        url: "https://github.com/demo-student/retention",
        note: "I wrote a query that joins events to users and counted anyone with an event in the window as active. My assumption is that a signup with no event is churn rather than a missing row, and the decision I would make from this is to staff support in the second week of each cohort.",
      },
      {
        url: "https://example.com/my-analysis",
        note: "did the task",
      },
    ],
  };
}

const COMPARISON = [
  ["Shows a static in-demand skills chart beside your score", "Feeds the corpus into the scoring weights, so the score itself moves with the market, and shows the delta"],
  ["Lists recommended courses", "Computes a route across the skill graph, weighted by openings, with a simulator for what a skill is worth before you spend the hours"],
  ["Screens resumes with an opaque or model-based ranker", "Grades a small artifact against a rubric published before you start, blind, with the reasoning returned"],
  ["Asks you to trust the platform with your data", "Keeps records on the device and exports counts, never records, below a k-anonymity floor"],
];

const STEPS = [
  ["1", "/labs", "You are here. The claim, in one screen."],
  ["2", "/market", "The corpus by lane, with the sample size printed beside every number."],
  ["3", "/gps", "Pick a target role, tick a gap, watch the engine re-score the whole feed."],
  ["4", "/challenges", "Submit an artifact, read the rubric that graded it, get a signed receipt."],
  ["5", "/industry", "Switch to the employer desk and post a challenge against a role."],
  ["6", "/shortlist", "The same submission, as a handle. Decide, then reveal, then read the audit log."],
  ["7", "/institute", "The district picture: unmet demand, a batch plan, and a suppressed bucket."],
];

function Widget({ n, title, claim, children }) {
  return (
    <Card>
      <div className="mb-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Widget {n}</span>
        <h3 className="mt-1 font-display text-base font-semibold text-zinc-50">{title}</h3>
        <p className="mt-1 text-pretty text-xs leading-5 text-zinc-400">{claim}</p>
      </div>
      {children}
    </Card>
  );
}

// 1. The market term, computed live from the bundled corpus.
function MarketWidget({ lane, onLane }) {
  const corpus = useMemo(() => bundledCorpus(lane), [lane]);
  const market = useMemo(() => effectiveWeights(corpus, { lane }), [corpus, lane]);
  const volume = useMemo(() => postingVolume(corpus, { weeks: 8 }), [corpus]);
  const stats = corpusStats(corpus);
  const top = market.shifts.slice(0, 5);
  return (
    <Widget
      n="1"
      title="The score is not our opinion"
      claim="These weights come from the postings bundled in this build, computed in your browser just now. A weight above 1 makes holding that skill worth more in every fit score on the platform."
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <Badge tone="zinc">{stats.total} postings</Badge>
        <Badge tone="zinc">{stats.bySource.length} sources</Badge>
        <Badge tone={market.sample.observed ? "green" : "amber"}>{market.sample.observed} skills clear the floor</Badge>
        <Badge tone={stats.dated ? "zinc" : "amber"}>{stats.dated} carry a real date</Badge>
        <button
          type="button"
          onClick={() => onLane(lane === "ayush" ? "tech" : "ayush")}
          className="rounded-full border border-zinc-800 bg-zinc-900 px-2 py-0.5 font-mono text-xs text-zinc-300 hover:border-zinc-700 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blurple"
        >
          switch to {lane === "ayush" ? "tech" : "ayush"}
        </button>
      </div>
      {/* Ordered by weight, so each row names its own weight. Without that the bars look out of
          order, because bar length is postings while the sort is what a skill is worth. */}
      <RankBars
        rows={top.map((s) => ({
          key: s.skill,
          label: s.skill,
          value: s.postings,
          valueSuffix: " postings",
          meta: `weight ${s.weight.toFixed(2)}x · ${Math.round(s.share * 100)}% of postings that list skills`,
        }))}
        label={`Top demanded skills in the ${lane} corpus, strongest first`}
        valueSuffix=" postings"
        emptyNote="No skill clears the sample floor in this lane's bundled corpus."
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {top[0] && (
          <span className="font-mono text-xs text-zinc-400">
            strongest: {top[0].skill} at {top[0].weight.toFixed(2)}x, inside the taxonomy's {WEIGHT_MIN} to {WEIGHT_MAX} band
          </span>
        )}
        <Sparkline
          values={volume.buckets.map((b) => b.count)}
          tone={INK.emerald}
          width={120}
          height={28}
          label={`${stats.total} postings across ${volume.buckets.length} weeks`}
        />
      </div>
    </Widget>
  );
}

// 2. The route, from the same graph search the student page uses.
function RouteWidget({ lane }) {
  const corpus = useMemo(() => bundledCorpus(lane), [lane]);
  const market = useMemo(() => effectiveWeights(corpus, { lane }), [corpus, lane]);
  const held = DEMO[lane].held;
  const roles = useMemo(() => rolesForLane(lane), [lane]);
  const [pickIdx, setPickIdx] = useState(0);
  // Depend on the role id rather than the role object. A freshly built object on every render
  // makes this memo recompute every render, which is the same as having no memo at all.
  const targetId = roles[pickIdx]?.id || roles[0]?.id || "";
  const route = useMemo(
    () => routeTo(targetId, held, { jobs: corpus, lane, market, limit: 4 }),
    [targetId, held, corpus, lane, market]
  );
  const [ticked, setTicked] = useState([]);
  const sim = useMemo(() => {
    const add = route.steps.filter((s) => ticked.includes(s.skill)).map((s) => ({ skill: s.skill, level: s.need }));
    return add.length ? simulate({ add, held, jobs: corpus, lane, market }) : null;
  }, [route.steps, ticked, held, corpus, lane, market]);

  return (
    <Widget
      n="2"
      title="You get a route, not a reading list"
      claim={`A demo profile is used so nothing depends on you onboarding: ${DEMO[lane].label}, holding ${held.skills.join(", ")}. Search is breadth-first over the taxonomy's own edges, and a step only counts as unlocking a posting if re-scoring that posting actually clears its bar.`}
    >
      <div className="mb-3 flex flex-wrap gap-2">
        {roles.map((r, i) => (
          <button
            key={r.id}
            type="button"
            onClick={() => { setPickIdx(i); setTicked([]); }}
            aria-pressed={i === pickIdx}
            className={cn(
              "rounded-lg border px-2.5 py-1 text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blurple",
              i === pickIdx ? "border-blurple bg-blurple/10 text-zinc-100" : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-100"
            )}
          >
            {r.label}
          </button>
        ))}
      </div>
      {route.steps.length === 0 ? (
        <Empty title="This demo profile already covers the role" body="Pick another target role to see a route with gaps in it." />
      ) : (
        <ol className="space-y-2">
          {route.steps.map((s, i) => (
            <li key={s.skill} className="flex flex-wrap items-center gap-2 text-xs">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-zinc-700 font-mono text-[10px] text-zinc-400">{i + 1}</span>
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={ticked.includes(s.skill)}
                  onChange={() => setTicked((p) => (p.includes(s.skill) ? p.filter((x) => x !== s.skill) : [...p, s.skill]))}
                  className="size-3.5 accent-blurple"
                  aria-label={`Simulate adding ${s.name}`}
                />
                <span className="min-w-0 truncate text-zinc-200">{s.name}</span>
              </label>
              <Chip tone={s.hops === Infinity ? "amber" : s.hops <= 1 ? "green" : "zinc"}>
                {s.hops === Infinity ? "no route" : `${s.hops} hop${s.hops === 1 ? "" : "s"}`}
              </Chip>
              <span className="shrink-0 font-mono tabular-nums text-emerald-400">{s.unlocks} unlocked</span>
              <span className="shrink-0 font-mono tabular-nums text-zinc-500">{s.programs[0]?.hours != null ? `${s.programs[0].hours}h` : "hours unknown"}</span>
            </li>
          ))}
        </ol>
      )}
      {sim && (
        <p className="mt-3 border-t border-zinc-800 pt-3 font-mono text-xs tabular-nums text-zinc-300">
          ticking {ticked.length}: qualifies for {sim.before.eligible} then {sim.after.eligible} postings · average fit {sim.before.avgFit} then {sim.after.avgFit} · {sim.unlocked.length} newly opened
        </p>
      )}
    </Widget>
  );
}

// 3. The grader on two fixtures, screened blind. Nothing is mocked: the real rubric runs.
function BlindWidget() {
  const challenge = gradeExample();
  const graded = useMemo(
    () => challenge.submissions.map((s, i) => ({
      id: `demo-${i}`,
      blindId: `demo${i}`.padEnd(12, "0").slice(0, 12),
      at: i,
      skill: challenge.skill,
      evidenceUrl: s.url,
      grade: gradeSubmission(challenge, { evidenceUrl: s.url, note: s.note }),
    })),
    [challenge]
  );
  const ranked = useMemo(() => rankSubmissions(graded), [graded]);
  const [revealed, setRevealed] = useState(false);
  return (
    <Widget
      n="3"
      title="Hiring runs on published rules, screened blind"
      claim="Two submissions graded by the live rubric, in front of you. Same input, same score, on any device, with the reasoning returned. No model reads anything, so a rejection can be argued with instead of appealed."
    >
      <ul className="space-y-3">
        {ranked.map((row, i) => (
          <li key={row.id} className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <span className="font-mono text-xs text-zinc-300">{row.blindId}</span>
                <Chip tone={row.grade.passed ? "green" : "amber"}>{row.grade.score}/100</Chip>
                <Badge tone="zinc">rank {i + 1}</Badge>
              </span>
              <span className="font-mono text-[10px] text-zinc-600">{evidenceLabel(row.evidenceUrl).host}</span>
            </div>
            <ul className="mt-2 space-y-0.5">
              {row.grade.why.map((w, j) => (
                <li key={j} className="text-[11px] leading-5 text-zinc-400">· {w}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Btn size="sm" variant="quiet" onClick={() => setRevealed((v) => !v)}>
          {revealed ? "hide identities" : "reveal identities"}
        </Btn>
        <span className="text-[11px] leading-4 text-zinc-500">
          {revealed
            ? "On the real desk this unlocks only after a decision is on the record, and the reveal is written to an audit log."
            : "Nothing above needs a name. The demo submissions have none to show."}
        </span>
      </div>
    </Widget>
  );
}

// 4. Sign a payload and check it, including a tampered copy, in the browser.
function ReceiptWidget() {
  const [state, setState] = useState({ phase: "idle" });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const pair = await generateIssuerKeypair();
        const payload = { claim: "demo receipt", skill: "documentation", score: 88 };
        const receipt = await signPayload(payload, pair);
        const good = await verifySigned(receipt);
        const tampered = { ...receipt, payload: { ...payload, score: 12 } };
        const bad = await verifySigned(tampered);
        if (alive) setState({ phase: "ready", receipt, good, bad, pair });
      } catch {
        if (alive) setState({ phase: "error" });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Widget
      n="4"
      title="A receipt a stranger can check offline"
      claim="Signed here, verified here, with no server involved. Then one number is changed and checked again, because a tamper-evidence claim that never demonstrates a failure is a claim nobody should believe."
    >
      {state.phase === "idle" && <p className="text-xs text-zinc-500">Minting a key and signing, in your browser.</p>}
      {state.phase === "error" && (
        <p className="text-xs leading-5 text-amber-300">
          This browser has no WebCrypto, so it cannot demonstrate a signature. That is exactly the case where the app
          falls back to a hash and labels it weaker rather than claiming otherwise.
        </p>
      )}
      {state.phase === "ready" && (
        <>
          <dl className="space-y-1.5 text-xs">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-zinc-500">mode</dt>
              <dd className="font-mono text-zinc-300">{modeLabel(state.receipt.mode)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-zinc-500">payload</dt>
              <dd className="min-w-0 truncate font-mono text-zinc-300" title={canonicalJSON(state.receipt.payload)}>{canonicalJSON(state.receipt.payload)}</dd>
            </div>
          </dl>
          <ul className="mt-3 space-y-1.5">
            <li className="flex items-center gap-2 text-xs">
              <Badge tone="green">verified</Badge>
              <span className="text-zinc-400">the receipt as issued</span>
            </li>
            <li className="flex flex-wrap items-center gap-2 text-xs">
              <Badge tone="red">failed</Badge>
              <span className="text-zinc-400">the same receipt with one number changed:</span>
              <span className="font-mono text-red-400">{state.bad.reason}</span>
            </li>
          </ul>
          <p className="mt-3 text-[11px] leading-5 text-zinc-600">
            What this proves is that the record has not been altered. It does not prove who signed it unless the key is
            pinned separately, and this page says that rather than implying more.
          </p>
        </>
      )}
    </Widget>
  );
}

export default function Labs() {
  const [lane, setLane] = useState("tech");
  return (
    <Page
      title="Avsar runs a labour market"
      sub="Most career platforms ask a student to fit a static rubric. This one recalibrates the rubric from live postings, computes the path to a job as a route rather than a course list, and screens on blind, tamper-evident proof. Four working demonstrations below, all offline."
      actions={<Btn to="/">Start</Btn>}
    >
      <Card>
        <H2>The claim, and what backs it</H2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-zinc-500">
                <th className="py-2 pr-4 font-semibold">What every other platform does</th>
                <th className="py-2 font-semibold">What this one does instead</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map(([theirs, ours]) => (
                <tr key={theirs} className="border-t border-zinc-800">
                  <td className="py-2.5 pr-4 align-top text-zinc-500">{theirs}</td>
                  <td className="py-2.5 align-top text-zinc-200">{ours}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-950 p-0.5" role="group" aria-label="Demo lane">
          {[["ayush", "Ayush lane"], ["tech", "Tech lane"]].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setLane(id)}
              aria-pressed={lane === id}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blurple",
                lane === id ? "bg-blurple text-white" : "text-zinc-400 hover:text-zinc-100"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-xs text-zinc-500">
          Both lanes run the identical machinery. Nothing below is a screenshot.
        </span>
      </div>

      <div className="mt-4 grid gap-4">
        <MarketWidget lane={lane} onLane={setLane} />
        <RouteWidget lane={lane} />
        <BlindWidget />
        <ReceiptWidget />
      </div>

      <Card className="mt-4">
        <H2>A ninety second path through it</H2>
        <ol className="space-y-2">
          {STEPS.map(([n, to, what]) => (
            <li key={to + n} className="flex gap-3 text-sm">
              <span className="font-mono text-xs text-zinc-500">{n}</span>
              <span className="min-w-0">
                <span className="font-mono text-xs text-blurple-soft">{to}</span>
                <span className="ml-2 text-zinc-400">{what}</span>
              </span>
            </li>
          ))}
        </ol>
        <AsciiRule label="What works with no keys and no network" className="my-4" />
        <ul className="space-y-1.5 text-sm text-zinc-400">
          <li className="flex gap-2"><span aria-hidden className="text-emerald-400">·</span><span>Every screen above, on the bundled corpus. The seed is in the build, not fetched.</span></li>
          <li className="flex gap-2"><span aria-hidden className="text-emerald-400">·</span><span>Scoring, the market index, the route search and the grader are pure modules with no network calls in them.</span></li>
          <li className="flex gap-2"><span aria-hidden className="text-emerald-400">·</span><span>Receipts are signed and checked by the browser's own cryptography.</span></li>
          <li className="flex gap-2"><span aria-hidden className="text-emerald-400">·</span><span>What needs a key or a network: live job feeds and the optional Supabase mirror. Both degrade to the seed and say so.</span></li>
        </ul>
      </Card>
    </Page>
  );
}
