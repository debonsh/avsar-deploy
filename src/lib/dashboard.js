// ponytail: JobSync-style dashboard math without a chart lib. Pure functions,
// SVG donut via stroke-dasharray, bars via Meter. Tested, no DOM needed.

// shares of a funnel that always sum to 1 (empty → single gray slice)
export function donutSegments(entries = []) {
  const total = entries.reduce((a, [, v]) => a + Math.max(0, v || 0), 0);
  if (!total) return [{ label: "none", value: 0, fraction: 1, start: 0 }];
  let acc = 0;
  return entries
    .filter(([, v]) => v > 0)
    .map(([label, value]) => {
      const fraction = value / total;
      const seg = { label, value, fraction, start: acc };
      acc += fraction;
      return seg;
    });
}

// last 7 days of tracker activity → [{day, saved, applied}] oldest first
export function weekTrend(events = [], now = Date.now()) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    days.push({ key: d.toISOString().slice(0, 10), label: d.toLocaleDateString("en", { weekday: "narrow" }), saved: 0, applied: 0 });
  }
  const byKey = Object.fromEntries(days.map((d) => [d.key, d]));
  for (const e of events || []) {
    const k = new Date(e.at || 0).toISOString().slice(0, 10);
    const slot = byKey[k];
    if (!slot) continue;
    if (e.event === "applied") slot.applied += 1;
    else if (e.event === "saved") slot.saved += 1;
  }
  return days;
}

// latest tracker events with job titles resolved → newest first
export function recentActivity(events = [], byId = {}, n = 5) {
  return [...(events || [])]
    .filter((e) => e && e.jobId)
    .sort((a, b) => (b.at || 0) - (a.at || 0))
    .slice(0, n)
    .map((e) => ({ event: e.event, at: e.at, title: byId[e.jobId]?.title || "A role", company: byId[e.jobId]?.company || "" }));
}

// skill demand vs your supply: count how many postings require each skill,
// mark have/gap against the resume. pure, feeds the heatmap card.
export function demandHeatmap(jobs = [], found = [], n = 10) {
  const have = new Set((found || []).map((s) => String(s).toLowerCase()));
  const counts = new Map();
  for (const j of jobs || []) {
    for (const s of j?.skills || []) {
      const k = String(s).toLowerCase();
      counts.set(k, (counts.get(k) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([skill, demand]) => ({ skill, demand, have: have.has(skill) }))
    .sort((a, b) => b.demand - a.demand || (a.skill < b.skill ? -1 : 1))
    .slice(0, Math.max(0, n));
}

export function briefing({ funnel = {}, jobs = [], found = [], missing = [], mainScore = 0 } = {}) {
  const lines = [];
  const have = new Set((found || []).map((s) => String(s).toLowerCase()));
  const matched = (jobs || []).filter((j) => j.eligible);
  const strong = matched.filter((j) => (j.skills || []).filter((s) => have.has(String(s).toLowerCase())).length >= Math.max(1, Math.ceil((j.skills || []).length * 0.75)));
  if (strong.length) lines.push(`${strong.length} saved-or-open role${strong.length > 1 ? "s" : ""} fit 75%+ of your skills: apply first: ${strong.slice(0, 2).map((j) => j.title).join("; ")}.`);
  const locked = (jobs || []).filter((j) => !j.eligible);
  const blocker = (missing || []).map((m) => ({ m, n: locked.filter((j) => (j.skills || []).map((s) => String(s).toLowerCase()).includes(String(m).toLowerCase())).length }))
    .sort((a, b) => b.n - a.n)[0];
  if (blocker && blocker.n > 0) lines.push(`"${blocker.m}" locks ${blocker.n} role${blocker.n > 1 ? "s" : ""}: one quest pair here unlocks the most.`);
  if ((funnel.interview || 0) > 0) lines.push(`${funnel.interview} interview${funnel.interview > 1 ? "s" : ""} in flight: prep case presentations with numbers this week.`);
  else if ((funnel.applied || 0) > 0) lines.push(`${funnel.applied} applied, none in interview yet: tailor the top missing skill per role and follow up.`);
  if (!lines.length) lines.push(mainScore > 0 ? "Pipeline is empty: save 3 eligible roles to start the funnel." : "Score your resume first: the dashboard wakes up with data.");
  return lines.slice(0, 3);
}
