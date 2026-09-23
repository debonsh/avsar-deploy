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
