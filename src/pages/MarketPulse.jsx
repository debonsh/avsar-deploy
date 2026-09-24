// Market pulse: the page where the corpus becomes visible. Three jobs, in this
// order. Report the market (the wire, volume, the skills worth learning). Report
// it against the student (demand versus what they already hold). And report its
// own limits, because a market signal from four postings and one from four
// hundred look identical on a chart and mean different things, so every number
// prints the sample it came from and every gap in the data says so out loud.
import { useEffect, useMemo, useState } from "react";
import { Page, Card, H2, Chip, Badge, Empty, Btn, CountUp, AsciiRule, Reveal } from "../components/ui.jsx";
import { cn } from "../components/ui.jsx";
import { Sparkline, RankBars, Stacked, ShareDonut, HeatGrid, WeightArc, AreaWave, StreamWaves, INK } from "../components/charts.jsx";
import { useAvsar } from "../app/store.jsx";
import { bundledCorpus, corpusWithLive, portalOf } from "../lib/corpus.js";
import {
  effectiveWeights, marketSignals, marketMemory, recordSnapshot, salaryBand, postingVolume,
  freshnessBands, companyDemand, skillSeries, WEIGHT_MIN, WEIGHT_MAX,
} from "../lib/market.js";
import { wireItems, sourceLabel } from "../lib/wire.js";
import { listLiveJobs } from "../lib/store.js";
import { loadProfile } from "../lib/profile.js";
import { profileForMatching } from "../lib/match.js";
import { loadQuizBest } from "../data/quiz.js";

const TREND_TONE = { rising: "green", stable: "zinc", cooling: "amber", unknown: "zinc" };
const TREND_LABEL = { rising: "rising", stable: "steady", cooling: "cooling", unknown: "no signal yet" };
const WIRE_TONE = { green: "green", amber: "amber", zinc: "zinc", sky: "blue" };

const day = (iso) => (iso ? new Date(iso).toISOString().slice(0, 10) : "never");
const WEEK_LABEL = (b) => b.label;

// One headline figure. The sub-line always names the sample, so no tile can be
// read as a bigger claim than the data supports.
function Stat({ label, value, sub, to, tone = "text-zinc-50" }) {
  return (
    <Card className="flex flex-col justify-between">
      <H2>{label}</H2>
      <p className={cn("font-display text-3xl font-bold tracking-tight", tone)}>
        {to == null ? value : <CountUp to={to} />}
      </p>
      <p className="mt-1 text-xs leading-5 text-zinc-400">{sub}</p>
    </Card>
  );
}

// The lane switch. A judge should be able to run the identical machinery on both
// markets without editing their profile, so this is a view toggle, not a track
// change, and it says when it is showing a live-feeds-missing preview.
function LaneSwitch({ value, onChange, activeLane }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-950 p-0.5" role="group" aria-label="Market lane">
        {[["ayush", "Ayush"], ["tech", "Tech"]].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            aria-pressed={value === id}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blurple",
              value === id ? "bg-blurple text-white" : "text-zinc-400 hover:text-zinc-100"
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {value !== activeLane && (
        <Badge tone="amber">previewing the {value} market from bundled seeds only</Badge>
      )}
    </div>
  );
}

// The wire: job news the corpus can actually support. A feed of counted facts,
// newest first, each one naming what it counted.
function WireFeed({ items }) {
  return (
    <ol className="divide-y divide-zinc-800">
      {items.map((it) => (
        <li key={it.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
          <span
            aria-hidden
            className={cn(
              "mt-1.5 size-1.5 shrink-0 rounded-full",
              it.tone === "green" ? "bg-emerald-500" : it.tone === "amber" ? "bg-amber-500" : it.tone === "sky" ? "bg-sky-400" : "bg-zinc-600"
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <p className="text-sm font-medium text-zinc-100">{it.headline}</p>
              <Chip tone={WIRE_TONE[it.tone] || "zinc"}>{it.kind}</Chip>
            </div>
            <p className="mt-0.5 text-pretty text-xs leading-5 text-zinc-400">{it.detail}</p>
            {(it.meta || it.href) && (
              <p className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[11px] text-zinc-600">
                {it.meta && <span>{it.meta}</span>}
                {it.href && (
                  <a href={it.href} target="_blank" rel="noreferrer noopener" className="text-blurple-soft underline decoration-dotted underline-offset-2 hover:text-blurple">
                    open notice
                  </a>
                )}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function MarketPulse() {
  const { track, lane, resume, customJobs } = useAvsar();
  const portal = portalOf(track, lane);
  const [live, setLive] = useState([]);
  const [view, setView] = useState(portal);

  useEffect(() => setView(portal), [portal]);
  useEffect(() => {
    listLiveJobs(false, loadProfile() || {}, lane).then(setLive).catch(() => {});
  }, [lane]);

  // The active lane reads live feeds and anything the student pasted in. The other
  // lane reads its bundled seed, because live results were fetched for one lane
  // and re-labelling them as the other market's would be the exact lie this page
  // exists to avoid.
  const corpus = useMemo(() => {
    if (view === portal) return corpusWithLive(portal, live, customJobs);
    return bundledCorpus(view);
  }, [view, portal, live, customJobs]);

  const liveFeedsUsed = view === portal && live.length > 0;
  const memory = useMemo(() => (corpus.length ? recordSnapshot(corpus) : marketMemory()), [corpus]);
  const market = useMemo(() => effectiveWeights(corpus, { lane: view }), [corpus, view]);
  const signals = useMemo(() => marketSignals(corpus, { lane: view, memory, limit: 14 }), [corpus, view, memory]);
  const wire = useMemo(() => wireItems(corpus, memory, { now: Date.now(), lane: view, limit: 10 }), [corpus, memory, view]);
  const volume = useMemo(() => postingVolume(corpus, { weeks: 8 }), [corpus]);
  const bands = useMemo(() => freshnessBands(corpus), [corpus]);
  const employers = useMemo(() => companyDemand(corpus, 6), [corpus]);
  const stats = market.stats;
  const now = Date.now();

  // One weekly series per ranked skill, for the sparklines. Bounded by the signal
  // limit, so this stays a single pass over the corpus per visible row.
  const series = useMemo(
    () => new Map(signals.rows.map((r) => [r.skill, skillSeries(corpus, r.skill, { now, weeks: 8 }).buckets.map((b) => b.count)])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signals.rows, corpus]
  );

  // Stream waves: the top skill's weekly run against whole-market volume, so a
  // spike reads as skill momentum or market momentum at a glance.
  const stream = useMemo(() => {
    const top = signals.rows.find((r) => (series.get(r.skill) || []).length > 1);
    if (!top || volume.buckets.length < 2) return null;
    const n = Math.min(8, volume.buckets.length);
    const labels = volume.buckets.slice(-n).map((b) => WEEK_LABEL(b));
    const skillVals = (series.get(top.skill) || []).slice(-n);
    while (skillVals.length < n) skillVals.unshift(0);
    return {
      name: top.name,
      labels,
      waves: [
        { name: top.name, values: skillVals, tone: view === "tech" ? INK.blurple : INK.emerald },
        { name: "All postings", values: volume.buckets.slice(-n).map((b) => b.count), tone: INK.sky },
      ],
    };
  }, [signals.rows, series, volume.buckets, view]);

  // What this student already holds, so demand can be read against supply.
  const held = useMemo(() => {
    try {
      const found = resume?.result?.found || [];
      if (!found.length) return { have: new Set(), verified: new Set() };
      const p = profileForMatching(lane, found, loadQuizBest(lane));
      return { have: new Set(p.skills), verified: new Set(p.verified) };
    } catch {
      return { have: new Set(), verified: new Set() };
    }
  }, [resume, lane]);

  const payBands = useMemo(
    () => corpus.map((j) => ({ job: j, band: salaryBand(j) })).filter((r) => r.band).slice(0, 7),
    [corpus]
  );

  const cityRows = stats.byCity.slice(0, 8).map((c) => ({ key: c.key, label: c.key, value: c.count }));
  // The ring is read as shares of the corpus, so it has to sum to the corpus. Naming only
  // the top sources would make every percentage a share of the named ones instead, and
  // Greenhouse would read 41.7% when it is really 39.5% of these postings. The remainder
  // is carried as its own slice so the centre number and the slices describe one total.
  const sourceTop = stats.bySource.slice(0, 5);
  const sourceRest = stats.bySource.slice(5);
  const sourceSlices = [
    ...sourceTop.map((s) => ({ key: s.key, label: sourceLabel(s.key), value: s.count })),
    ...(sourceRest.length
      ? [{
          key: "__other",
          label: `other (${sourceRest.length} source${sourceRest.length === 1 ? "" : "s"})`,
          value: sourceRest.reduce((a, s) => a + s.count, 0),
          tone: "#52525b",
        }]
      : []),
  ];
  const roleRows = stats.byRole.slice(0, 8).map((r) => ({ key: r.key, label: r.key, value: r.count }));
  const freshnessParts = [
    { key: "7", label: "last 7 days", value: bands.last7, tone: INK.emerald },
    { key: "30", label: "8 to 30 days", value: bands.last30, tone: INK.sky },
    { key: "old", label: "older than 30", value: bands.older, tone: INK.amber },
    { key: "none", label: "no date", value: bands.undated, tone: INK.zinc },
  ];
  const trending = signals.rows.filter((r) => r.trend !== "unknown");
  const unheld = signals.rows.filter((r) => !held.have.has(r.skill)).slice(0, 6);

  return (
    <Page
      title="Market pulse"
      sub={`What the live corpus asks for in the ${view === "ayush" ? "ayush" : "tech"} market, and how much each requirement counts. The same numbers move your fit scores.`}
      actions={
        <>
          <LaneSwitch value={view} onChange={setView} activeLane={portal} />
          <Btn variant="quiet" to="/match">How the score uses this</Btn>
        </>
      }
    >
      <Reveal className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Jobs tracked"
          to={stats.total}
          sub={`${stats.bySource.length} sources${liveFeedsUsed ? ", including live feeds" : ", bundled seed only"}`}
        />
        <Stat
          label="Postings with skills"
          to={stats.skilled}
          tone={stats.unstated ? "text-amber-300" : "text-zinc-50"}
          sub={
            stats.unstated
              ? `${stats.unstated} posting${stats.unstated === 1 ? "" : "s"} list no skills, so they are left out of the demand percentages`
              : "every posting in this lane names at least one skill"
          }
        />
        <Stat
          label="Postings with a date"
          to={stats.dated}
          tone={stats.dated ? "text-zinc-50" : "text-amber-300"}
          sub={
            stats.dated
              ? `${Math.round((stats.dated / Math.max(1, stats.total)) * 100)}% of the corpus, which is what makes trend measurable`
              : "none in this lane, so trend comes from snapshot history instead of dates"
          }
        />
        <Stat
          label="Skills in demand"
          to={market.sample.observed}
          sub={`${market.sample.skills} seen in total. The ${market.sample.lowSample} seen fewer than ${market.sample.minPostings} times count as normal, not in demand`}
        />
        <Stat
          label="Newest posting"
          value={day(stats.freshestAt)}
          tone={stats.freshestAt ? "text-zinc-50" : "text-amber-300"}
          sub={
            stats.freshestAt
              ? `${Math.floor((now - Date.parse(stats.freshestAt)) / 86400000)} days old. This is how stale the market here is`
              : "no posting in this lane carries a date, so freshness cannot be measured"
          }
        />
      </Reveal>

      <Card className="mt-4">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <H2 className="mb-1">Live wire</H2>
            <p className="text-xs leading-5 text-zinc-400">
              Job news built from the postings on this device, not from a feed that would go stale between the pitch and the
              demo. Every line names the count it came from.
            </p>
          </div>
          <Badge tone="zinc">{wire.length} items</Badge>
        </div>
        <WireFeed items={wire} />
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <H2>Jobs posted, week by week</H2>
          <p className="mb-3 text-xs leading-5 text-zinc-400">
            {stats.dated
              ? `Real posting dates, bucketed by week. ${volume.recent} in the last four weeks against ${volume.prior} in the four before.`
              : "No posting in this lane carries a date, so volume over time cannot be drawn. The bars below would be an invention."}
          </p>
          {volume.recent || volume.prior ? (
            <>
              <AreaWave
                values={volume.buckets.map((b) => b.count)}
                labels={volume.buckets.map((b) => WEEK_LABEL(b))}
                tone={view === "tech" ? INK.blurple : INK.emerald}
                unit=" postings"
                label={`Weekly posting volume over ${volume.buckets.length} weeks, ${volume.recent} in the most recent four`}
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge tone={volume.recent >= volume.prior ? "green" : "amber"}>
                  {volume.recent >= volume.prior ? "up" : "down"} {Math.abs(volume.recent - volume.prior)} on the prior four weeks
                </Badge>
                {volume.older > 0 && <Badge tone="zinc">{volume.older} older than the window</Badge>}
                {volume.undated > 0 && <Badge tone="amber">{volume.undated} undated</Badge>}
              </div>
            </>
          ) : (
            <Empty
              title="No dated postings in this lane"
              body="Volume over time needs posted dates. This lane's bundle carries none, and drawing a chart from nothing would be the one thing this page refuses to do."
            />
          )}
        </Card>

        <Card>
          <H2>How fresh these postings are</H2>
          <p className="mb-3 text-xs leading-5 text-zinc-400">
            A market made of closed postings is not a market. This is the age profile of every posting being counted.
          </p>
          <Stacked
            parts={freshnessParts}
            unit=" postings"
            label={`Freshness: ${bands.last7} in the last 7 days, ${bands.last30} between 8 and 30 days, ${bands.older} older, ${bands.undated} undated`}
          />
          <p className="mt-3 text-xs leading-5 text-zinc-500">
            Undated postings are not stale, they are unknown, and they are kept out of the age bands rather than folded into
            whichever one would flatter the numbers.
          </p>
        </Card>
      </div>

      {stream && (
        <Card className="mt-4">
          <H2>Demand streams</H2>
          <p className="mb-3 text-xs leading-5 text-zinc-400">
            {stream.name} against everything posted. When the two waves rise together it is the market
            moving; when they split, it is the skill.
          </p>
          <StreamWaves
            waves={stream.waves}
            labels={stream.labels}
            unit=" postings"
            label={`${stream.name} weekly postings against total market volume across ${stream.labels.length} weeks`}
          />
        </Card>
      )}

      <Card className="mt-4">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <H2 className="mb-1">Demand against your supply</H2>
            <p className="text-xs leading-5 text-zinc-400">
              The weight column is what each skill is worth in a fit score right now. Above 1 means holding it is worth more
              than a plain requirement. The spark is that skill&rsquo;s own weekly volume.
            </p>
          </div>
          <Badge tone="zinc">
            {market.sample.observed} of {market.sample.skills} skills weighted
          </Badge>
        </div>
        {signals.rows.length === 0 ? (
          <Empty
            title="No skill clears the floor yet"
            body={`A skill has to appear in ${market.sample.minPostings} postings before it earns a weight. Below that it counts neutral, so two coincidences cannot move a score. Scores keep using the published taxonomy prior either way.`}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                  <th scope="col" className="py-2 pr-3 font-semibold">Skill</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Postings</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Last 8 weeks</th>
                  <th scope="col" className="py-2 pr-3 text-right font-semibold">Weight</th>
                  <th scope="col" className="py-2 pr-3 font-semibold">Trend</th>
                  <th scope="col" className="py-2 font-semibold">You</th>
                </tr>
              </thead>
              <tbody>
                {signals.rows.map((r) => {
                  const isVerified = held.verified.has(r.skill);
                  const has = isVerified || held.have.has(r.skill);
                  const spark = series.get(r.skill) || [];
                  const peak = Math.max(0, ...spark);
                  return (
                    <tr key={r.skill} className="border-t border-zinc-800 first:border-t-0">
                      <td className="py-2.5 pr-3">
                        <span className="block truncate text-zinc-100" title={r.name}>{r.name}</span>
                        <span className="block truncate font-mono text-[10px] text-zinc-600">{r.skill}</span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-900">
                            <span
                              className="block h-full rounded-full bg-emerald-500"
                              style={{ width: `${Math.max(4, (r.postings / Math.max(1, market.sample.maxCount)) * 100)}%` }}
                            />
                          </span>
                          <span className="font-mono text-xs tabular-nums text-zinc-400">{r.postings}</span>
                          <span className="font-mono text-[10px] tabular-nums text-zinc-600">
                            {Math.round((r.postings / Math.max(1, stats.skilled || stats.total)) * 100)}%
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 pr-3">
                        {spark.length ? (
                          <Sparkline
                            values={spark}
                            tone={peak ? INK.sky : INK.zinc}
                            width={96}
                            height={26}
                            label={`${r.name}, weekly postings for ${spark.length} weeks, peak ${peak}`}
                          />
                        ) : (
                          <span className="text-xs text-zinc-600">none</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-right">
                        <span
                          className={cn(
                            "font-mono text-xs tabular-nums",
                            r.weight > 1 ? "text-green-300" : r.weight < 1 ? "text-amber-300" : "text-zinc-400"
                          )}
                        >
                          {r.weight.toFixed(2)}x
                        </span>
                        <span className="ml-1 font-mono text-[10px] tabular-nums text-zinc-600">
                          {r.delta > 0 ? "+" : ""}{r.delta.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3">
                        <Chip tone={TREND_TONE[r.trend]}>{TREND_LABEL[r.trend]}</Chip>
                      </td>
                      <td className="py-2.5">
                        {isVerified ? <Chip tone="green">verified</Chip> : has ? <Chip tone="blue">held</Chip> : <Chip tone="amber">gap</Chip>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!resume?.result && signals.rows.length > 0 && (
          <p className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <Btn to="/resume" size="sm" variant="quiet">Score your resume</Btn>
            to see this demand read against your own skills instead of the amber gaps above.
          </p>
        )}
      </Card>

      {signals.rows.length > 0 && (
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <H2>Where the demand sits</H2>
            <p className="mb-3 text-xs leading-5 text-zinc-400">
              Skills down, recent weeks across. Brighter means more postings asked for it that week.
            </p>
            <HeatGrid
              rows={signals.rows.slice(0, 8).map((r) => ({ label: r.name, values: (series.get(r.skill) || []).slice(-6) }))}
              cols={volume.buckets.slice(-6).map((b) => b.label)}
              label="Demand intensity by skill and week"
            />
          </Card>
          <Card>
            <H2>Trend at a glance</H2>
            {trending.length === 0 ? (
              <p className="text-xs leading-5 text-zinc-400">
                {stats.dated
                  ? "Not enough postings per skill to call a direction yet. A direction needs at least three dated postings for that skill."
                  : `This device has ${memory.length} snapshot${memory.length === 1 ? "" : "s"}. A second day of history is what turns a share into a direction, and the column stays honest until then.`}
              </p>
            ) : (
              <ul className="space-y-3">
                {trending.slice(0, 6).map((r) => (
                  <li key={r.skill} className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate text-sm text-zinc-200" title={r.name}>{r.name}</span>
                    <Chip tone={TREND_TONE[r.trend]}>{TREND_LABEL[r.trend]}</Chip>
                  </li>
                ))}
              </ul>
            )}
            {unheld.length > 0 && (
              <>
                <AsciiRule label="Biggest gaps you hold nothing for" className="my-4" />
                <ul className="space-y-2">
                  {unheld.slice(0, 4).map((r) => (
                    <li key={r.skill} className="flex items-center justify-between gap-2 text-xs">
                      <span className="min-w-0 truncate text-zinc-300" title={r.name}>{r.name}</span>
                      <span className="shrink-0 font-mono tabular-nums text-amber-300">{r.postings} postings</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <H2>Where the jobs are</H2>
          <p className="mb-3 text-xs leading-5 text-zinc-400">
            Postings by location, from what each posting states. Locations are raw strings, so a posting that says nothing
            lands in &ldquo;unknown&rdquo; rather than being guessed into a city.
          </p>
          <RankBars
            rows={cityRows}
            label={`Demand by location, largest ${cityRows[0]?.label ?? "none"} at ${cityRows[0]?.value ?? 0}`}
            emptyNote="No posting in this lane states a location."
          />
          {stats.byCity.length > cityRows.length && (
            <p className="mt-3 text-[11px] text-zinc-600">
              Showing the top {cityRows.length} of {stats.byCity.length} locations.
            </p>
          )}
        </Card>

        <Card>
          <H2>Which boards these come from</H2>
          <p className="mb-3 text-xs leading-5 text-zinc-400">
            Source mix, so a market that is really one board is visible as one board.
          </p>
          <ShareDonut
            slices={sourceSlices}
            size={140}
            thick={18}
            label={`Source mix across ${stats.total} postings`}
            center={
              <>
                <span className="font-display text-xl font-bold tabular-nums text-zinc-50">{stats.total}</span>
                <span className="font-mono text-[9px] uppercase tracking-wider text-zinc-500">postings</span>
              </>
            }
          />
        </Card>
      </div>

      <Card className="mt-4">
        <H2>Who is hiring</H2>
        <p className="mb-4 text-xs leading-5 text-zinc-400">
          Employers come from the postings themselves, never from a curated list, so this cannot drift away from the corpus
          the scores are computed on.
        </p>
        {employers.length === 0 ? (
          <Empty title="No employer named in this lane" body="Every posting here is missing a company field, so there is nobody to rank." />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {employers.map((e) => (
              <li key={e.company} className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate text-sm font-medium text-zinc-100" title={e.company}>{e.company}</span>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-green-300">{e.postings}</span>
                </div>
                <p className="mt-1 truncate text-[11px] text-zinc-500" title={e.locs.join(", ")}>
                  {e.locs.join(", ") || "location not stated"}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {e.top.map((t) => (
                    <span key={t.skill} className="rounded-md border border-zinc-800 bg-zinc-950 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                      {t.skill}
                    </span>
                  ))}
                </div>
                <p className="mt-2 font-mono text-[10px] text-zinc-600">
                  {e.freshestAt ? `freshest ${e.freshestAt.slice(0, 10)}` : "no dated posting"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <H2>Pay bands</H2>
          {payBands.length === 0 ? (
            <Empty
              title="No annual band stated in this lane"
              body="Pay is only shown when a posting states an annual figure. Monthly stipends and undisclosed salaries stay as raw text on the job card rather than being guessed into a range."
            />
          ) : (
            <ul className="divide-y divide-zinc-800">
              {payBands.map(({ job, band }) => (
                <li key={String(job.id)} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm text-zinc-200" title={job.title}>{job.title}</p>
                    <p className="truncate text-xs text-zinc-500" title={job.company}>{job.company}</p>
                  </div>
                  <span className="shrink-0 font-mono text-xs tabular-nums text-green-300">{band.band}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <H2>What kind of work</H2>
          <p className="mb-3 text-xs leading-5 text-zinc-400">
            Postings by role, which is the same field the fit score uses to pick a rubric.
          </p>
          <RankBars
            rows={roleRows}
            tone={INK.sky}
            label={`Postings by role, largest ${roleRows[0]?.label ?? "none"} at ${roleRows[0]?.value ?? 0}`}
            emptyNote="No posting in this lane carries a role."
          />
        </Card>
      </div>

      <Card className="mt-4">
        <H2>What these numbers can and cannot tell you</H2>
        <ul className="space-y-2 text-sm text-zinc-400">
          <li className="flex gap-2">
            <span aria-hidden className="text-green-300">·</span>
            <span>
              Demand is the share of the {stats.skilled} postings that list skills, mapped onto the taxonomy&rsquo;s own{" "}
              {WEIGHT_MIN} to {WEIGHT_MAX} band and blended 50/50 with the published prior, so a thin scrape cannot swing a score.
            </span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden className="text-green-300">·</span>
            <span>
              {stats.dated} of them carry a posted date.{" "}
              {stats.dated === 0
                ? "This lane has no dated postings, so trend comes from snapshot history and says \u201cno signal yet\u201d until there is one."
                : "Trend is measured from those dates, in a window against the window before it."}
            </span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden className="text-green-300">·</span>
            <span>Undated postings still count toward demand. They are never called stale, because unknown is not the same as old.</span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden className="text-green-300">·</span>
            <span>
              {stats.unstated === 0
                ? "Every posting here names at least one skill, so the demand share has no undeclared rows in it."
                : `${stats.unstated} of the ${stats.total} postings name no skills at all. A posting cannot be asked about a skill it never mentions, so those are excluded from the demand share rather than counted as a no.`}
            </span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden className="text-green-300">·</span>
            <span>
              A skill needs {market.sample.minPostings} postings before it earns a weight. {market.sample.lowSample} of the{" "}
              {market.sample.skills} skills seen here are below that line and count neutral.
            </span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden className="text-green-300">·</span>
            <span>
              {liveFeedsUsed
                ? "This view includes live feeds fetched for your lane."
                : "This view is the bundled seed. Live feeds load when the portal has network and keys."}
            </span>
          </li>
        </ul>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge tone="zinc">{market.sample.observed} weighted skills</Badge>
          <Badge tone="zinc">{market.sample.lowSample} below the floor</Badge>
          {stats.dated === 0 && <Badge tone="amber">no dated postings in this lane</Badge>}
          {view !== portal && <Badge tone="amber">preview lane</Badge>}
        </div>
        {signals.rows.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <WeightArc
              weight={signals.rows[0].weight}
              min={WEIGHT_MIN}
              max={WEIGHT_MAX}
              label={`${signals.rows[0].name} weight ${signals.rows[0].weight} on the ${WEIGHT_MIN} to ${WEIGHT_MAX} band`}
            />
            <p className="max-w-sm text-xs leading-5 text-zinc-500">
              The strongest signal right now: {signals.rows[0].name}, in {signals.rows[0].postings} of {stats.total} postings.
              The arc is the taxonomy&rsquo;s {WEIGHT_MIN} to {WEIGHT_MAX} band with neutral 1.0 marked, which is the cap no scrape
              can push past.
            </p>
          </div>
        )}
      </Card>

      <Card className="mt-4">
        <H2>History on this device</H2>
        <p className="text-sm text-zinc-400">
          {memory.length === 0
            ? "No snapshot stored yet. One is written the first time this page opens."
            : `${memory.length} snapshot${memory.length === 1 ? "" : "s"}, oldest ${day(memory[0]?.at)}, newest ${day(memory[memory.length - 1]?.at)}.`}
        </p>
        <p className="mt-2 text-xs leading-5 text-zinc-500">
          Snapshots stay on this device and exist so that a second day of data can tell a trend honestly instead of inferring
          one from a single scrape.
        </p>
      </Card>
    </Page>
  );
}
