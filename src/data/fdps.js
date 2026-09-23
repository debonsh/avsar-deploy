// ponytail: curated seeds for BAMS students + faculty. ids a1+ (ayush board).
import { AYUSH_FDPS } from "../ayush/seed.js";
export const FDP_KINDS = {
  "fdp": "FDP",
  "faculty-internship": "Faculty Internship",
  "consultancy": "Consultancy",
  "workshop": "Workshop",
};

export const FDPS = [
  ...AYUSH_FDPS,
  { id: "a6", kind: "workshop", title: "Case-Sheet Writing Masterclass for Interns", org: "NCISM Digital Cell", loc: "Online", url: "https://ncismindia.org/", deadline: "2026-11-20" },
  { id: "a7", kind: "workshop", title: "Herbarium + Dravyaguna Field Camp", org: "NMPB", loc: "Madhya Pradesh", url: "https://www.nmpb.nic.in/", deadline: "2026-12-01" },
  { id: "a8", kind: "fdp", title: "FDP: Teaching Rognidan with E-Logbooks", org: "NCISM", loc: "Online", url: "https://ncismindia.org/", deadline: "2026-12-10" },
];
