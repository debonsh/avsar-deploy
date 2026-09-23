// roadmap generator: missing skills → week-by-week plan, ordered by employer demand.
// demand = how many open board jobs require the skill, so the first week unblocks
// the most applications. Project tasks reuse the quest text when known (no new sources).
import { coursesFor } from "../data/courses.js";
import { QUEST_TREE } from "../data/quests.js";

export function jobDemand(jobs = []) {
  const map = new Map();
  for (const j of jobs || []) {
    for (const s of j.skills || []) {
      const k = String(s).toLowerCase();
      map.set(k, (map.get(k) || 0) + 1);
    }
  }
  return map;
}

// ponytail: stable sort by demand desc — fixes "recommendations are not in order"
export function orderMissingByDemand(missing = [], jobs = []) {
  const demand = jobDemand(jobs);
  return [...missing].sort(
    (a, b) => (demand.get(String(b).toLowerCase()) || 0) - (demand.get(String(a).toLowerCase()) || 0)
  );
}

function questProjectFor(role, skill) {
  const tree = QUEST_TREE[role];
  if (!tree) return null;
  const k = String(skill).toLowerCase();
  for (const br of tree.branches) {
    for (const sk of br.skills) {
      if ((sk.name || "").toLowerCase() === k || sk.id === k) return sk.project;
    }
  }
  return null;
}

export function roadmapGenerator(missingSkills = [], role = "sde", jobs = []) {
  const ordered = orderMissingByDemand(missingSkills, jobs);
  if (!ordered.length) return [];
  const demand = jobDemand(jobs);
  const weeks = [];
  for (let i = 0; i < ordered.length; i += 3) {
    const tasks = [];
    for (const skill of ordered.slice(i, i + 3)) {
      const link = coursesFor(skill)[0] || null;
      const n = demand.get(String(skill).toLowerCase()) || 0;
      tasks.push({
        text: `Learn ${skill}: ${link ? link.t : "free course below"}${n ? `, asked in ${n} open role${n > 1 ? "s" : ""}` : ""}`,
        skill, link,
      });
      const proj = questProjectFor(role, skill);
      tasks.push({
        text: proj ? `Build: ${proj}` : `${skill}: log 1 supervised case, link it in your logbook`,
        skill, link: null,
      });
    }
    tasks.push({
      text: "Add 1 quantified number per new skill to your resume, re-upload, watch ATS rise",
      skill: "resume", link: null,
    });
    weeks.push({ week: weeks.length + 1, tasks });
  }
  return weeks;
}
