// ponytail: uniqueness without a backend. Same device id → same variant (stable);
// different IDs → spread across variants. Evaluation uniqueness lives in quiz
// banks (Slice C samples 10/20 seeded by ID+day); quests stay curated —
// classrooms assign the same homework, uniqueness matters for tests, not lessons.
export function hashStr(s = "") {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function pickForId(pool = [], id = "", salt = "") {
  if (!pool.length) return null;
  return pool[hashStr(`${salt}:${id}`) % pool.length];
}

// evidence gate: a project counts as done only with a real link
// (repo, deploy, sheet, cert). Length floor rejects "https://x.co" junk.
export function isEvidenceUrl(u = "") {
  const t = (u || "").trim();
  return t.length > 12 && /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(t);
}
