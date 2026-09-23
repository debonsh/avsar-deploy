// ponytail: shared leaderboard = 1 table, seeds stay fallback when keys missing/offline
// supabase-js is dynamically imported — offline runs never download it.
// SQL (human runs once in Supabase dashboard):
// create table public.college_scores(id uuid primary key default gen_random_uuid(), college_name text not null, score int check(score between 0 and 100), created_at timestamptz default now());
// alter table college_scores enable row level security;
// create policy "open read/insert" on college_scores for anon using(true) with check(true);
import { COLLEGES } from "../data/colleges.js";

let cached = null;

export function isSupabaseOn() {
  try {
    // ponytail: import.meta.env is undefined under node --test → optional chain, not a crash
    return Boolean(import.meta.env?.VITE_SUPABASE_URL && import.meta.env?.VITE_SUPABASE_ANON_KEY);
  } catch {
    return false;
  }
}

export async function getClient() {
  if (!isSupabaseOn()) return null;
  try {
    if (!cached) {
      const { createClient } = await import("@supabase/supabase-js");
      cached = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
    }
    return cached;
  } catch {
    return null;
  }
}

function aggregate(rows) {
  const map = new Map();
  for (const r of rows) {
    if (!r || !r.college_name) continue;
    const s = Math.max(0, Math.min(100, Math.round(r.score ?? 0)));
    const cur = map.get(r.college_name) || { name: r.college_name, total: 0, members: 0 };
    cur.total += s;
    cur.members += 1;
    map.set(r.college_name, cur);
  }
  return [...map.values()].map((g) => ({ name: g.name, avg: Math.round(g.total / g.members), members: g.members }));
}

// ponytail: weighted merge so seeded board looks alive until remote fills up
export function mergeBoards(seeds, remote) {
  if (!remote?.length) return seeds;
  const out = seeds.map((s) => ({ ...s }));
  for (const r of remote) {
    const hit = out.find((o) => o.name === r.name);
    if (hit) {
      const total = hit.avg * hit.members + r.avg * r.members;
      const members = hit.members + r.members;
      hit.avg = Math.round(total / members);
      hit.members = members;
    } else {
      out.push({ ...r });
    }
  }
  return out.sort((a, b) => b.avg - a.avg);
}

export async function loadBoard() {
  const sb = await getClient();
  if (!sb) return null;
  try {
    const { data, error } = await sb.from("college_scores").select("college_name,score").limit(1000);
    if (error || !data?.length) return null;
    return mergeBoards(COLLEGES, aggregate(data));
  } catch {
    return null;
  }
}

export async function submitScore(collegeName, score) {
  const sb = await getClient();
  if (!sb || !collegeName || score == null) return false;
  try {
    const { error } = await sb.from("college_scores").insert({ college_name: collegeName, score: Math.round(score) });
    return !error;
  } catch {
    return false;
  }
}
