// ponytail: RBAC is a pure map, not a maze of conditionals in the shell.
// One portal build serves five roles: students (and vaidyas) roam the engine,
// each professional role gets exactly one desk. Route matching is by first
// path segment, so /workspace/:jobId and /u/:id need no special cases.
export const STUDENT_ROLES = ["student", "ayush"];

// role → the one page that role lives on.
export const ROLE_HOME = {
  industry: "/industry",
  faculty: "/faculty",
  institute: "/institute",
};

// open to everyone: the chooser, public profiles, and email verification links.
const PUBLIC_SEGMENTS = new Set(["", "u", "verify"]);

// segment → the roles allowed in it.
// /profile is identity, not engine: every role opens it (Google connect,
// portal switching, role switching). Without this, a device holding a
// professional role can never leave its desk — the onboarding trap.
const ALL_ROLES = ["student", "ayush", "industry", "faculty", "institute"];

const DESK_SEGMENTS = {
  industry: ["industry"],
  faculty: ["faculty"],
  institute: ["institute"],
  profile: ALL_ROLES,
};

export function rolesForRoute(path = "") {
  const seg = String(path).split("/")[1] || "";
  return DESK_SEGMENTS[seg] || STUDENT_ROLES;
}

// A missing or unrecognized role is a student (the engine default), never a
// promotion: junk in localStorage must not unlock a professional desk.
const KNOWN_ROLES = new Set([...STUDENT_ROLES, ...Object.keys(ROLE_HOME)]);

function normalizeRole(role) {
  return KNOWN_ROLES.has(role) ? role : "student";
}

export function canAccess(role, path = "") {
  const seg = String(path).split("/")[1] || "";
  if (PUBLIC_SEGMENTS.has(seg)) return true;
  return rolesForRoute(path).includes(normalizeRole(role));
}

// Routes that must render before a portal has been picked: the chooser itself,
// public profiles, and emailed verification links.
export function isPublicPath(path = "") {
  return PUBLIC_SEGMENTS.has(String(path).split("/")[1] || "");
}

export function dashboardFor(_track, role = "student") {
  return ROLE_HOME[normalizeRole(role)] || "/home";
}
