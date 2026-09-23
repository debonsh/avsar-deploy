// ponytail: demo cohort + stats, one home. MAIN reuses combineScores — single formula everywhere.
import { combineScores } from "./score.js";
import { rankFor } from "./score.js";

export const COHORT = [
  { name: "Ananya Das", role: "ayush", ats: 82, quiz: 90, quests: 4, gaps: ["pharmacovigilance"], applied: true },
  { name: "Aarav Mehta", role: "ayush", ats: 78, quiz: 85, quests: 4, gaps: ["gmp", "research"], applied: true },
  { name: "Diya Sharma", role: "ayush", ats: 62, quiz: 70, quests: 2, gaps: ["panchakarma", "documentation"], applied: true },
  { name: "Arjun Patel", role: "ayush", ats: 45, quiz: 0, quests: 1, gaps: ["diagnosis", "dravyaguna", "documentation"], applied: false },
  { name: "Sneha Iyer", role: "ayush", ats: 88, quiz: 92, quests: 5, gaps: ["research"], applied: true },
  { name: "Rohan Verma", role: "ayush", ats: 35, quiz: 40, quests: 0, gaps: ["sanskrit", "dravyaguna"], applied: false },
  { name: "Ishita Rao", role: "ayush", ats: 55, quiz: 60, quests: 3, gaps: ["hims", "documentation"], applied: true },
  { name: "Kabir Singh", role: "ayush", ats: 58, quiz: 45, quests: 1, gaps: ["pharmacy", "gmp"], applied: false },
];

export function mainOf(s) {
  return combineScores(s.ats, s.quiz, s.quests, s.role).main;
}

export function enrich(rows) {
  return rows.map((s) => {
    const main = mainOf(s);
    return { ...s, main, rank: rankFor(main) };
  });
}

export function cohortStats(students) {
  const rows = enrich(students);
  const byRole = {};
  for (const r of rows) (byRole[r.role] ??= []).push(r.main);
  const avgByRole = {};
  for (const [k, v] of Object.entries(byRole)) avgByRole[k] = Math.round(v.reduce((a, b) => a + b, 0) / v.length);
  const gold = rows.filter((r) => r.main >= 65).length;
  const gaps = {};
  for (const r of rows) for (const g of r.gaps || []) gaps[g] = (gaps[g] || 0) + 1;
  const topGaps = Object.entries(gaps)
    .map(([skill, n]) => ({ skill, n }))
    .sort((a, b) => b.n - a.n || (a.skill < b.skill ? -1 : 1))
    .slice(0, 5);
  return {
    total: rows.length,
    avgByRole,
    goldPct: rows.length ? Math.round((gold / rows.length) * 100) : 0,
    topGaps,
    funnel: {
      scored: rows.filter((r) => r.ats > 0).length,
      quiz: rows.filter((r) => r.quiz > 0).length,
      gold,
      applied: rows.filter((r) => r.applied).length,
    },
  };
}

const q = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));

export function toCSV(rows) {
  const lines = rows.map((r) =>
    [r.name, r.role, r.ats, r.quiz, r.quests, r.main, r.rank, r.applied ? "Yes" : "No"].map(q).join(",")
  );
  return ["name,role,ats,quiz,quests,main,rank,applied", ...lines].join("\n");
}
