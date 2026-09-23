// ponytail: GitHub-style activity from data we already store. No new tracking
// schema for old stuff — interview/quiz day-counts and timestamped job events
// feed the heatmap; quest ticks stamp their day going forward (see progress.js).
// Pure math here, storage reads isolated in collectDayCounts. Tested.
import { loadJSON } from "./storage.js";
import { getProgress } from "./progress.js";

export function dayISO(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function shiftISO(iso, deltaDays) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + deltaDays);
  return dayISO(d.getTime());
}

// date -> { total, kinds } for tooltips and the XP economy. Kinds: quest,
// quiz, interview, resume (practice days) + saved, applied, pipeline (events).
export function collectDayDetail() {
  const days = {};
  const touch = (day) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day || "")) return null;
    days[day] = days[day] || { total: 0, kinds: {} };
    return days[day];
  };
  const add = (day, kind, n = 1) => {
    const d = touch(day);
    if (!d) return;
    d.total += Number(n) || 0;
    d.kinds[kind] = (d.kinds[kind] || 0) + (Number(n) || 0);
  };
  try {
    const p = getProgress() || {};
    for (const [k, n] of Object.entries(p.interview || {})) {
      const [kind, day] = k.split(":");
      add(day || k.split(":").slice(-1)[0], ["quiz", "interview", "resume"].includes(kind) ? kind : "interview", n);
    }
    for (const [day, n] of Object.entries(p.questDays || {})) add(day, "quest", n);
  } catch { /* private mode */ }
  try {
    for (const e of loadJSON("avsar-job-events", []) || []) {
      if (!e || !e.at) continue;
      const ev = String(e.event || "saved").toLowerCase();
      add(dayISO(e.at), ev === "saved" ? "saved" : ev === "applied" ? "applied" : "pipeline", 1);
    }
  } catch { /* private mode */ }
  return days;
}

// date -> activity count, merged across interview/quiz days, quest days, job events.
export function collectDayCounts() {
  const counts = {};
  const add = (day, n = 1) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day || "")) return;
    counts[day] = (counts[day] || 0) + (Number(n) || 0);
  };
  try {
    const p = getProgress() || {};
    for (const [k, n] of Object.entries(p.interview || {})) add(k.split(":").slice(-1)[0], n);
    for (const [day, n] of Object.entries(p.questDays || {})) add(day, n);
  } catch { /* private mode */ }
  try {
    for (const e of loadJSON("avsar-job-events", []) || []) {
      if (e && e.at) add(dayISO(e.at), 1);
    }
  } catch { /* private mode */ }
  return counts;
}

// GitHub buckets: 0, 1-2, 3-4, 5-7, 8+.
export function levelFor(n) {
  if (!n || n <= 0) return 0;
  if (n < 3) return 1;
  if (n < 5) return 2;
  if (n < 8) return 3;
  return 4;
}

// weeks columns of 7 days, oldest first, ending today. Fixed shape: weeks x 7.
export function heatmapWeeks(counts = {}, weeks = 16, today = dayISO()) {
  const total = weeks * 7;
  const start = shiftISO(today, -(total - 1));
  const days = [];
  for (let i = 0; i < total; i++) {
    const date = shiftISO(start, i);
    const count = counts[date] || 0;
    days.push({ date, count, level: levelFor(count) });
  }
  const cols = [];
  for (let w = 0; w < weeks; w++) cols.push(days.slice(w * 7, w * 7 + 7));
  return cols;
}

// consecutive active days ending today (or yesterday, streak still alive).
export function currentStreak(counts = {}, today = dayISO()) {
  let n = 0;
  let cursor = counts[today] > 0 ? today : shiftISO(today, -1);
  if (!counts[cursor]) return 0;
  while (counts[cursor] > 0) {
    n++;
    cursor = shiftISO(cursor, -1);
  }
  return n;
}

export function totalActive(counts = {}) {
  return Object.values(counts).filter((n) => n > 0).length;
}
