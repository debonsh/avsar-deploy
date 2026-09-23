// ponytail: one role string in localStorage decides which desk a person may
// open (see lib/rbac.js) and where onboarding drops them. The scoring rubric
// is NOT here — that is the lane (lib/track.js). "ayush" stays in the union so
// devices from the single-track build keep working after the merge.
import { loadText, saveText } from "./storage.js";

const KEY = "avsar-role";

export const APP_ROLES = [
  { value: "student", label: "Student" },
  { value: "industry", label: "Industry / Hospital" },
  { value: "faculty", label: "Faculty" },
  { value: "institute", label: "Institute" },
  { value: "ayush", label: "Ayush professional" },
];

export const DEFAULT_ROLE = "student";

export function loadRole() {
  const v = loadText(KEY, DEFAULT_ROLE);
  return APP_ROLES.some((r) => r.value === v) ? v : DEFAULT_ROLE;
}

export function saveRole(v) {
  if (!APP_ROLES.some((r) => r.value === v)) return false;
  saveText(KEY, v);
  return true;
}

export function roleLabel(v) {
  return APP_ROLES.find((r) => r.value === v)?.label || APP_ROLES[0].label;
}
