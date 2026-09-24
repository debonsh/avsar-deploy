// ponytail: theme is a string in localStorage, default light. The shell root
// div carries ayush-light/ayush-dark; index.css does the rest. No context,
// no flash (class is set on first render from the same loader).
import { loadJSON, saveJSON } from "./storage.js";

const KEY = "avsar-theme";

export function loadTheme() {
  return loadJSON(KEY, "light") === "dark" ? "dark" : "light";
}

export function saveTheme(t) {
  saveJSON(KEY, t === "dark" ? "dark" : "light");
}

// The floor each scope paints, mirroring the .ayush-*/.tech-* rules in
// index.css. The landing has no portal yet and borrows the tech floor, so the
// theme — and the header toggle — work from the very first screen instead of
// only after a portal pick.
export const THEME_FLOORS = {
  ayush: { light: "#f6f3ea", dark: "#0d100e" },
  tech: { light: "#f3f5fa", dark: "#06060b" },
};

// track + theme → the scope class on the shell root. Every state has one:
// an unscoped root falls through to the dark body in index.css and the landing
// looks stuck in dark mode with nothing to toggle.
export function surfaceFor(track, theme) {
  const dark = theme === "dark";
  if (track === "ayush") return dark ? "ayush-dark" : "ayush-light";
  return dark ? "tech-dark" : "tech-light";
}

export function floorFor(track, theme) {
  return THEME_FLOORS[track === "ayush" ? "ayush" : "tech"][theme === "dark" ? "dark" : "light"];
}
