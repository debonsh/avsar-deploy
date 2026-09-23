// ponytail: the portal a student picked at / is one string in localStorage.
// null means "not onboarded" — the shell forces the chooser instead of
// guessing a default portal. Two portals, one build, no second shell.
import { loadText, saveText, removeKey } from "./storage.js";
import { ROLES } from "./score.js";

const KEY = "avsar-track";

export const TRACKS = [
  { id: "ayush", label: "Vaidya (AYUSH)", blurb: "AYUSH internships, herbal pharma, clinical research, wellness." },
  { id: "tech", label: "Tech", blurb: "Engineering, data, marketing internships and govt exams." },
];

// ponytail: every non-ayush rubric belongs to the tech portal. Derived from
// score.js so a new lane never needs a second list kept in sync.
export const TECH_LANES = Object.keys(ROLES).filter((k) => k !== "ayush");
export const DEFAULT_TECH_LANE = "sde";

export function loadTrack() {
  const v = loadText(KEY, "");
  return TRACKS.some((t) => t.id === v) ? v : null;
}

export function saveTrack(id) {
  if (!TRACKS.some((t) => t.id === id)) return false;
  saveText(KEY, id);
  return true;
}

export function clearTrack() {
  return removeKey(KEY);
}

// lane → the taxonomy role the matcher scores a student against.
export const TARGET_ROLE = {
  ayush: "ayush-cra",
  sde: "sde",
  data: "data-analyst",
  marketing: "marketing-associate",
  govt: "govt-exams",
};

// Unknown lane falls back to the ayush role so the match page always renders.
export function targetRoleFor(lane) {
  return TARGET_ROLE[lane] || TARGET_ROLE.ayush;
}

// Does this saved profile belong to the portal being viewed? One profile key is
// shared by both portals, so switching sides must re-ask instead of showing the
// other portal's card. Rows from the single-track build have no `track` and
// belong to ayush.
export function profileMatchesTrack(profile, track) {
  if (!profile) return false;
  return track === "tech" ? TECH_LANES.includes(profile.track) : !TECH_LANES.includes(profile.track);
}

// track + profile → the roleKey every scoring page feeds the engine.
// ayush always scores on its own rubric; a tech student's rubric is the lane
// they picked (sde/data/marketing/govt). No track, no lane — onboarding first.
export function laneFor(track, profile = {}) {
  if (track === "ayush") return "ayush";
  if (track !== "tech") return null;
  const picked = profile?.track;
  return TECH_LANES.includes(picked) ? picked : DEFAULT_TECH_LANE;
}
