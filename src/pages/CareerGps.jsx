// Career GPS: the answer to "what does learning this actually unlock, and what is the
// shortest way there from what I already have". Every other platform answers the
// question with a course list; this answers it with a route and a counterfactual.
//
// Two rules keep it honest. A step's unlock count comes from re-running the real engine
// with that skill added, so the page can never promise a posting the feed would not have
// offered. And effort is expressed in course hours that a named provider actually
// publishes, never as a prediction about how long someone's life will take.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Page, Card, H2, Chip, Badge, Empty, Btn, CountUp, AsciiRule, cn } from "../components/ui.jsx";
import { RankBars, WeightArc, INK } from "../components/charts.jsx";
import { useAvsar } from "../app/store.jsx";
import { corpusWithLive, portalOf } from "../lib/corpus.js";
import { effectiveWeights, WEIGHT_MIN, WEIGHT_MAX } from "../lib/market.js";
import { routeTo, rolesForLane, simulate, gapList } from "../lib/careerGps.js";
import { listLiveJobs } from "../lib/store.js";
import { loadProfile } from "../lib/profile.js";
import { profileForMatching } from "../lib/match.js";
import { loadQuizBest } from "../data/quiz.js";
import { proficiencyLabel } from "../data/taxonomy.js";

// A gap with zero hops is a skill the student holds below the level the role wants, so the
// label is "level up" rather than "already held". Saying "already held" next to a gap reads
// as though the route were asking for nothing.
const hopLabel = (s) => {
  if (s.hops === 0) return "level up";
  if (s.hops === Infinity) return "no path yet";
  return `${s.hops} step${s.hops === 1 ? "" : "s"} away`;
};

// One stop on the route. The number is the order, and every claim under it is a number
// with a source: unlocks are postings the engine opens, hours are a provider's own figure.
function Stop({ step, index, checked, onToggle, verified, portal }) {
  const [open, setOpen] = useState(false);
  const hours = step.programs[0]?.hours;
  return (
    <li className="relative flex gap-3 pb-4 last:pb-0">
      <div className="flex flex-col items-center">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950 font-mono text-[11px] text-zinc-300">
          {index + 1}
        </span>
        <span aria-hidden className="mt-1 w-px flex-1 bg-zinc-800 last:hidden" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-zinc-100">{step.name}</p>
          <Badge tone="zinc">needs L{step.need}{step.have ? ` · has L${step.have}` : ""}</Badge>
          <Chip tone={step.hops === Infinity ? "amber" : step.hops <= 1 ? "green" : "zinc"}>{hopLabel(step)}</Chip>
          {step.unlocks > 0 && <Chip tone="green">{step.unlocks} unlocked</Chip>}
          {hours != null ? <Badge tone="blue">{hours}h course</Badge> : <Badge tone="amber">hours unknown</Badge>}
        </div>
        <p className="mt-1 text-pretty text-xs leading-5 text-zinc-400">{step.reason}</p>

        {step.programs.length > 0 && (
          <p className="mt-1.5 text-xs leading-5 text-zinc-500">
            {step.programs[0].title} <span className="text-zinc-600">· {step.programs[0].provider}</span>
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {/* "simulate" told the reader nothing: a bare verb with no object, whose only effect
              appeared in a different card. The label now states the hypothetical and names what
              changes, and levelling up an existing skill is not the same promise as learning one. */}
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-zinc-300">
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onToggle(step)}
              className={`size-3.5 ${portal === "ayush" ? "accent-[#1e7a4c]" : "accent-blurple"}`}
              aria-label={
                step.hops === 0
                  ? `Pretend I have ${step.name} at level ${step.need}, and see what changes`
                  : `Pretend I have learned ${step.name}, and see what changes`
              }
            />
            if I had this
          </label>
          {step.postings.length > 0 && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className="rounded-md px-1.5 py-0.5 text-xs text-blurple-soft underline decoration-dotted underline-offset-2 hover:text-blurple focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blurple"
            >
              {open ? "hide" : "show"} {step.postings.length} posting{step.postings.length === 1 ? "" : "s"}
            </button>
          )}
        </div>

        {open && (
          <ul className="mt-2 space-y-1.5 rounded-lg border border-zinc-800 bg-zinc-900 p-2.5">
            {step.postings.slice(0, 6).map((j) => (
              <li key={String(j.id)} className="flex items-baseline justify-between gap-2 text-xs">
                <Link to="/jobs" className="min-w-0 truncate text-zinc-300 underline decoration-dotted underline-offset-2 hover:text-blurple-soft" title={j.title}>
                  {j.title}
                </Link>
                <span className="shrink-0 truncate text-zinc-500" title={j.company}>{j.company}</span>
              </li>
            ))}
            {step.postings.length > 6 && (
              <li className="text-[11px] text-zinc-600">and {step.postings.length - 6} more</li>
            )}
          </ul>
        )}
        {checked && (
          <p className="mt-1.5 font-mono text-[10px] text-blurple-soft">
counted below as {verified ? "verified" : "claimed"} · nothing is saved
          </p>
        )}
      </div>
    </li>
  );
}

export default function CareerGps() {
  const { track, lane, resume, customJobs } = useAvsar();
  const portal = portalOf(track, lane);
  const [live, setLive] = useState([]);
  const roles = useMemo(() => rolesForLane(portal), [portal]);
  // The target is derived, not stored-and-resynced. A pick that does not exist in the
  // lane now on screen falls back to that lane's first role, which is what makes the
  // portal switch safe without an effect writing state on every render pass.
  const [picked, setPicked] = useState("");
  const target = roles.some((r) => r.id === picked) ? picked : roles[0]?.id ?? "";
  const [added, setAdded] = useState(() => new Set());
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    listLiveJobs(false, loadProfile() || {}, lane).then(setLive).catch(() => {});
  }, [lane]);

  const corpus = useMemo(() => corpusWithLive(portal, live, customJobs), [portal, live, customJobs]);
  const market = useMemo(() => effectiveWeights(corpus, { lane: portal }), [corpus, portal]);

  const held = useMemo(() => {
    try {
      const found = resume?.result?.found || [];
      if (!found.length) return { skills: [], levels: {}, verified: [], usedAt: {}, interests: [] };
      return profileForMatching(lane, found, loadQuizBest(lane));
    } catch {
      return { skills: [], levels: {}, verified: [], usedAt: {}, interests: [] };
    }
  }, [resume, lane]);

  const route = useMemo(
    () => routeTo(target, held, { jobs: corpus, lane: portal, market, limit: 8 }),
    [target, held, corpus, portal, market]
  );

  // The simulator always simulates the checked steps together, at the level the target
  // role wants, so the before-and-after matches the route drawn above it.
  const sim = useMemo(() => {
    const add = route.steps
      .filter((s) => added.has(s.skill))
      .map((s) => ({ skill: s.skill, level: s.need, verified }));
    if (!add.length) return null;
    return simulate({ add, held, jobs: corpus, lane: portal, market });
  }, [route.steps, added, verified, held, corpus, portal, market]);

  const gaps = useMemo(() => gapList(target, held), [target, held]);
  const routeHours = route.effort;
  const toggle = (step) => {
    setAdded((prev) => {
      const next = new Set(prev);
      if (next.has(step.skill)) next.delete(step.skill);
      else next.add(step.skill);
      return next;
    });
  };

  const allChecked = route.steps.length > 0 && route.steps.every((s) => added.has(s.skill));
  const simRows = sim
    ? [
        { key: "eligible", label: "Postings you qualify for", before: sim.before.eligible, after: sim.after.eligible },
        { key: "avgFit", label: "Average fit across the lane", before: sim.before.avgFit, after: sim.after.avgFit },
        { key: "avgEligible", label: "Average fit where you qualify", before: sim.before.avgEligibleFit, after: sim.after.avgEligibleFit },
      ]
    : [];

  return (
    <Page
      title="Career GPS"
      sub={`A route from what you already hold to the job you are aiming at, weighted by the ${portal === "ayush" ? "ayush" : "tech"} postings on this device. Every stop shows what it actually unlocks before you spend the hours.`}
      actions={<Btn variant="quiet" to="/market">What the market wants</Btn>}
    >
      <Card>
        <H2>Where are you heading</H2>
        <div className="flex flex-wrap gap-2">
          {roles.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setPicked(r.id)}
              aria-pressed={target === r.id}
              className={cn(
                "rounded-lg border px-3 py-2 text-left text-xs transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blurple",
                target === r.id ? "border-blurple bg-blurple/10 text-zinc-100" : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-zinc-100"
              )}
            >
              <span className="block font-semibold">{r.label}</span>
              <span className="mt-0.5 block font-mono text-[10px] text-zinc-500">{r.id}</span>
            </button>
          ))}
        </div>
        <AsciiRule label="Your starting point" className="my-4" />
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={held.skills.length ? "green" : "amber"}>
            {held.skills.length} skill{held.skills.length === 1 ? "" : "s"} held
          </Badge>
          <Badge tone={held.verified.length ? "green" : "zinc"}>
            {held.verified.length} verified
          </Badge>
          <Badge tone={route.baseEligible ? "green" : "zinc"}>
            {route.baseEligible} posting{route.baseEligible === 1 ? "" : "s"} within reach today
          </Badge>
          <Badge tone="zinc">{gaps.length} gap{gaps.length === 1 ? "" : "s"} to close</Badge>
          {routeHours.hours > 0 && <Badge tone="blue">{routeHours.hours}h of listed courses</Badge>}
          {routeHours.unknown > 0 && <Badge tone="amber">{routeHours.unknown} gap{routeHours.unknown === 1 ? "" : "s"} with no listed course</Badge>}
        </div>
        {held.skills.length === 0 && (
          <p className="mt-3 text-xs leading-5 text-zinc-400">
            With nothing scored yet there is no starting point to route from, so every gap below reads as a fresh start.{" "}
            <Btn to="/resume" size="sm" variant="quiet" className="ml-1">Score your resume</Btn>
          </p>
        )}
      </Card>

      <Card className="mt-4">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <H2 className="mb-1">The route</H2>
            <p className="text-xs leading-5 text-zinc-400">
              Ordered by postings opened per hop, so a quick win that opens five roles outranks a long climb that opens six.
              Nothing here counts as unlocked until the matching engine agrees, at the level the role asks for.
            </p>
            <p className="mt-1.5 text-xs leading-5 text-zinc-500">
              Each stop has an &ldquo;if I had this&rdquo; tick. It saves nothing: it just re-scores every posting as if you
              already had that skill, so you can see what it is worth before you spend the hours on the course.
            </p>
          </div>
          {route.totalGaps > route.steps.length && (
            <Badge tone="zinc">showing {route.steps.length} of {route.totalGaps} gaps</Badge>
          )}
        </div>
        {sim && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blurple/40 bg-blurple/5 px-3 py-2">
            <p className="text-xs leading-5 text-zinc-200">
              If you had{" "}
              <span className="font-semibold text-zinc-50">
                {route.steps.filter((x) => added.has(x.skill)).map((x) => x.name).join(", ")}
              </span>:
            </p>
            <p className="font-mono text-xs tabular-nums text-zinc-100">
              {sim.before.eligible} &rarr; {sim.after.eligible} postings qualify
              {sim.after.eligible !== sim.before.eligible && (
                <span className={sim.after.eligible > sim.before.eligible ? "text-emerald-400" : "text-amber-400"}>
                  {" "}({sim.after.eligible > sim.before.eligible ? "+" : ""}{sim.deltaEligible})
                </span>
              )}
              {/* Only shown when it actually moves. A figure pinned at "64 to 64" beside a real
                  "+2" reads as a broken calculation rather than as a small change. */}
              {(() => {
                const from = sim.before.eligible ? sim.before.avgEligibleFit : sim.before.avgFit;
                const to = sim.after.eligible ? sim.after.avgEligibleFit : sim.after.avgFit;
                return to === from ? null : <>{" · "}your average fit {from} &rarr; {to}</>;
              })()}
            </p>
          </div>
        )}

        {!route.role ? (
          <Empty title="Pick a target role" body="Choose one of the roles above and the route appears here." />
        ) : route.steps.length === 0 ? (
          <Empty
            title="You already qualify for this role"
            body={`Nothing in the ${route.role.label} rubric is a gap. The openings you qualify for are in the feed.`}
            action={<Btn to="/jobs">Open the feed</Btn>}
          />
        ) : (
          <ol>
            {route.steps.map((step, i) => (
              <Stop
                key={step.skill}
                step={step}
                index={i}
                checked={added.has(step.skill)}
                onToggle={toggle}
                verified={verified}
                portal={portal}
              />
            ))}
          </ol>
        )}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <H2>What-if simulator</H2>
          <p className="mb-3 text-xs leading-5 text-zinc-400">
            Detail for the stops you ticked above. Every posting in the lane is scored twice, once as you are and once with
            those skills added, using the same engine as the job feed.
          </p>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-zinc-300">
              <input
                type="checkbox"
                checked={verified}
                onChange={(e) => setVerified(e.target.checked)}
                  className={`size-3.5 ${lane === "ayush" ? "accent-[#1e7a4c]" : "accent-blurple"}`}
              />
              count these as verified proof
            </label>
            <button
              type="button"
              onClick={() => setAdded(allChecked ? new Set() : new Set(route.steps.map((s) => s.skill)))}
              className="rounded-md px-1.5 py-0.5 text-xs text-blurple-soft underline decoration-dotted underline-offset-2 hover:text-blurple focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blurple"
            >
              {allChecked ? "clear all" : "simulate the whole route"}
            </button>
          </div>

          {!sim ? (
            <p className="text-xs leading-5 text-zinc-500">
              Nothing ticked yet, so there is nothing to compare. Tick one stop to see what it is worth.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {simRows.map((row) => {
                const delta = row.after - row.before;
                return (
                  <li key={row.key} className="flex items-center justify-between gap-3">
                    <span className="min-w-0 text-xs text-zinc-400">{row.label}</span>
                    <span className="flex shrink-0 items-center gap-2 font-mono text-xs tabular-nums">
                      <span className="text-zinc-500">{row.before}</span>
                      <span aria-hidden className="text-zinc-500">→</span>
                      <span className="font-semibold text-zinc-100">{row.after}</span>
                      <span className={cn("w-10 text-right", delta > 0 ? "text-emerald-400" : delta < 0 ? "text-amber-400" : "text-zinc-600")}>
                        {delta > 0 ? "+" : ""}{delta}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          {sim && sim.unlocked.length > 0 && (
            <>
              <AsciiRule label={`${sim.unlocked.length} posting${sim.unlocked.length === 1 ? "" : "s"} unlocked`} className="my-4" />
              <ul className="space-y-1.5">
                {sim.unlocked.slice(0, 6).map((j) => (
                  <li key={String(j.id)} className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="min-w-0 truncate text-zinc-200" title={j.title}>{j.title}</span>
                    <span className="shrink-0 truncate text-zinc-500" title={j.company}>{j.company}</span>
                  </li>
                ))}
              </ul>
              {/* A route that ends in a list nobody can act on is a reading list again, so the
                  simulation exits into the same feed the postings came from. */}
              <p className="mt-3">
                <Btn to="/jobs" size="sm" variant="quiet">See these jobs</Btn>
              </p>
            </>
          )}
          {sim && sim.unlocked.length === 0 && (
            <p className="mt-3 text-xs leading-5 text-zinc-500">
              {sim.deltaEligible > 0
                ? "This raises your fit everywhere but does not yet carry a posting past its own bar."
                : "Adding these raises your scores without crossing a posting's own minimum yet. The remaining stops are what cross it."}
            </p>
          )}
        </Card>

        <Card>
          <H2>Where the route is anchored</H2>
          {market.sample.observed === 0 ? (
            <p className="text-xs leading-5 text-zinc-400">
              No skill in this lane clears the {market.sample.minPostings}-posting floor, so every requirement counts neutral
              and the route is ordered by unlocks alone.
            </p>
          ) : (
            <>
              <p className="mb-3 text-xs leading-5 text-zinc-400">
                The market moves what a skill is worth in a fit score, so a stop that closes a scarce skill opens more doors
                than one closing a common one. Showing the strongest signals in this lane.
              </p>
              <WeightArc
                weight={market.shifts[0]?.weight ?? 1}
                min={WEIGHT_MIN}
                max={WEIGHT_MAX}
                label={`Strongest market weight in this lane: ${market.shifts[0]?.skill} at ${market.shifts[0]?.weight}`}
              />
              <ul className="mt-3 space-y-2">
                {market.shifts.slice(0, 5).map((s) => {
                  const gap = gaps.find((g) => g.skill === s.skill);
                  return (
                    <li key={s.skill} className="flex items-center justify-between gap-3 text-xs">
                      <span className="min-w-0 truncate text-zinc-300" title={s.skill}>{s.skill}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span className="font-mono tabular-nums text-zinc-500">{s.postings} postings</span>
                        <span className={cn("font-mono tabular-nums", s.weight > 1 ? "text-emerald-400" : s.weight < 1 ? "text-amber-400" : "text-zinc-500")}>
                          {s.weight.toFixed(2)}x
                        </span>
                        {gap ? <Chip tone="amber">gap</Chip> : <Chip tone="green">held</Chip>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {gaps.length > 0 && (
            <>
              <AsciiRule label="Deepest gaps, before any market weighting" className="my-4" />
              <RankBars
                rows={gaps.slice(0, 6).map((g) => ({
                  key: g.skill,
                  label: g.name,
                  value: g.need - g.have,
                  meta: `needs L${g.need}, holding L${g.have} (${proficiencyLabel(g.have)})`,
                }))}
                tone={INK.amber}
                valueSuffix=" lvl"
                label="Gaps ranked by how many levels short this profile is"
              />
            </>
          )}
        </Card>
      </div>

      {route.steps.length > 0 && (
        <Card className="mt-4">
          <H2>Effort, in hours a provider actually publishes</H2>
          <div className="flex flex-wrap items-center gap-4">
            <p className="font-display text-3xl font-bold tracking-tight text-zinc-50">
              <CountUp to={routeHours.hours} />
              <span className="ml-1 font-mono text-sm font-normal text-zinc-400">hours</span>
            </p>
            <p className="max-w-md text-xs leading-5 text-zinc-400">
              {routeHours.known} of {route.steps.length} stops have a listed course and their cheapest published hours are
              summed here.
              {routeHours.unknown > 0
                ? ` The remaining ${routeHours.unknown} have no course in the catalogue, so their hours are unknown rather than zero.`
                : ""}{" "}
              No calendar dates appear anywhere on this page, because how fast someone learns is not ours to predict.
            </p>
          </div>
          <AsciiRule label="Course catalogue for this route" className="my-4" />
          <ul className="grid gap-2 sm:grid-cols-2">
            {route.steps.filter((s) => s.programs.length).map((s) => (
              <li key={s.skill} className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate text-sm text-zinc-100" title={s.programs[0].title}>{s.programs[0].title}</span>
                  <span className="shrink-0 font-mono text-xs text-emerald-400">{s.programs[0].hours}h</span>
                </div>
                <p className="mt-1 text-[11px] text-zinc-500">
                  {s.programs[0].provider} · closes {s.name}
                  {s.programs[0].cert ? " · certificate" : ""}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </Page>
  );
}
