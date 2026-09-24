// One home for "which postings belong to this portal". Every page that shows a lane's
// corpus reads it from here, because a job visible on /jobs but missing from /market
// would make the market numbers a lie.
import { mergeJobs } from "./store.js";
import { laneOfJob } from "./market.js";
import { JOBS, TECH_JOBS } from "../data/jobs.js";
import { EXTRA_JOBS } from "../data/seedJobsExtra.js";
import { NAUKRI_JOBS } from "../data/naukriSeed.js";
import { BOARDS_JOBS } from "../data/boardsSeed.js";
import { AYUSH_JOBS } from "../data/ayushSeed.js";

export const PORTALS = ["ayush", "tech"];

// the portal a scoring lane reads. sde, data, marketing and govt are all tech.
export function portalOf(track, lane) {
  return track === "ayush" || lane === "ayush" ? "ayush" : "tech";
}

export function bundledCorpus(portal = "tech") {
  const want = portal === "ayush" ? "ayush" : "tech";
  const list = want === "ayush"
    ? mergeJobs(AYUSH_JOBS, JOBS)
    : mergeJobs(TECH_JOBS, EXTRA_JOBS, NAUKRI_JOBS, BOARDS_JOBS);
  return list.filter((j) => laneOfJob(j) === want);
}

export function corpusWithLive(portal = "tech", live = [], custom = []) {
  const bundled = bundledCorpus(portal);
  return mergeJobs(custom || [], bundled, (live || []).filter((j) => laneOfJob(j) === portal));
}
