// Single navigation IA for the Avsar shell.
//
// The header pill bar only fits four primaries; everything else used to hide
// in one flat "More" list (desktop-only — mobile had no path to it at all).
// This module is the one place that decides which route is primary, which is
// secondary, and which themed group a secondary belongs to, so the desktop
// dropdown and the mobile Menu sheet can never drift apart.
export const NAV_GROUPS = [
  { id: "upskill", key: "nav.group.upskill" },
  { id: "career", key: "nav.group.career" },
  { id: "explore", key: "nav.group.explore" },
];

// Every student-engine destination. `icon` is a key into the icon map in
// app/nav-menu.jsx (pure strings here so this module stays UI-free and
// node-testable). `desc` is an i18n key for the one-line menu description.
export const NAV_ITEMS = {
  "/home": { to: "/home", key: "nav.home", desc: "nav.desc.home", icon: "home", group: "main" },
  "/journey": { to: "/journey", key: "nav.journey", desc: "nav.desc.journey", icon: "compass", group: "main", tracks: ["ayush"] },
  "/jobs": { to: "/jobs", key: "nav.internships", keyTech: "nav.jobs", desc: "nav.desc.jobs", icon: "briefcase", group: "main" },
  "/quests": { to: "/quests", key: "nav.quests", desc: "nav.desc.quests", icon: "book", group: "main" },
  "/resume": { to: "/resume", key: "more.resume", desc: "nav.desc.resume", icon: "resume", group: "upskill" },
  "/quiz": { to: "/quiz", key: "more.quiz", desc: "nav.desc.quiz", icon: "quiz", group: "upskill" },
  "/interview": { to: "/interview", key: "more.interview", desc: "nav.desc.interview", icon: "interview", group: "upskill" },
  "/portfolio": { to: "/portfolio", key: "more.portfolio", desc: "nav.desc.portfolio", icon: "portfolio", group: "career" },
  "/match": { to: "/match", key: "more.match", desc: "nav.desc.match", icon: "match", group: "career" },
  "/programs": { to: "/programs", key: "more.programs", desc: "nav.desc.programs", icon: "programs", group: "career" },
  "/workspace": { to: "/workspace", key: "more.workspace", desc: "nav.desc.workspace", icon: "workspace", group: "career" },
  "/ayush": { to: "/ayush", key: "more.ayush", desc: "nav.desc.ayush", icon: "ayush", group: "explore", tracks: ["ayush"] },
  "/profile": { to: "/profile", key: "nav.profile", desc: "nav.desc.profile", icon: "user", group: "account" },
};

// The four primaries that fit the header pill bar / mobile tab bar.
const PRIMARY_TOS = {
  ayush: ["/home", "/journey", "/jobs", "/quests"],
  tech: ["/home", "/resume", "/jobs", "/quests"],
};

// Everything else, in the exact order the old flat More list used.
const MORE_TOS = {
  ayush: ["/resume", "/quiz", "/interview", "/portfolio", "/ayush", "/match", "/programs", "/workspace"],
  tech: ["/quiz", "/interview", "/portfolio", "/match", "/programs", "/workspace"],
};

function trackKey(track) {
  return track === "tech" ? "tech" : "ayush";
}

// Label key for an item on a track (tech renames Internships → Jobs).
export function labelKeyFor(item, track) {
  if (trackKey(track) === "tech" && item.keyTech) return item.keyTech;
  return item.key;
}

export function primaryFor(track) {
  return PRIMARY_TOS[trackKey(track)].map((to) => NAV_ITEMS[to]);
}

export function secondaryFor(track) {
  return MORE_TOS[trackKey(track)].map((to) => NAV_ITEMS[to]);
}

// Secondary links bucketed into themed groups for the menus. Groups follow
// NAV_GROUPS order; items keep their MORE_TOS order inside each group.
export function secondaryGroupsFor(track) {
  const order = new Map(NAV_GROUPS.map((g, i) => [g.id, i]));
  const buckets = new Map();
  for (const item of secondaryFor(track)) {
    if (!buckets.has(item.group)) buckets.set(item.group, []);
    buckets.get(item.group).push(item);
  }
  return [...buckets.entries()]
    .sort((a, b) => (order.get(a[0]) ?? 99) - (order.get(b[0]) ?? 99))
    .map(([id, items]) => ({ id, items }));
}

// Full grouped map for the mobile Menu sheet: primaries first (as "Main"),
// then the secondary groups, then the account link.
export function sheetGroupsFor(track) {
  const groups = [{ id: "main", items: primaryFor(track) }];
  for (const g of secondaryGroupsFor(track)) groups.push(g);
  groups.push({ id: "account", items: [NAV_ITEMS["/profile"]] });
  return groups;
}

// True when the current path lives in the overflow (used to light up the
// Menu button so users can tell where they are).
export function isSecondaryPath(track, pathname = "") {
  const seg = `/${String(pathname).split("/")[1] || ""}`;
  return MORE_TOS[trackKey(track)].includes(seg);
}
