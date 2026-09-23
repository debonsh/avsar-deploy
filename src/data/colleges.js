// ponytail: seeded avgs so leaderboard looks alive with 1 user
export const COLLEGES = [
  { name: "Govt. Ayurveda Medical College", avg: 71, members: 214 },
  { name: "Ayurveda Teaching Hospital College", avg: 64, members: 167 },
  { name: "Your College", avg: 58, members: 89, you: true },
];

export function recomputeCollegeAvg(rows, userScore, collegeName) {
  return rows.map((c) =>
    c.name === collegeName
      ? { ...c, avg: Math.round((c.avg * c.members + userScore) / (c.members + 1)), members: c.members + 1 }
      : c
  ).sort((a, b) => b.avg - a.avg);
}
