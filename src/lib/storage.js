// ponytail: one guarded store. localStorage throws outside browsers (node --test,
// SSR) and on quota — every helper degrades to the fallback instead of crashing.
const hasLS = () => typeof localStorage !== "undefined";

export function loadJSON(key, fb) {
  try {
    if (!hasLS()) return fb;
    const v = JSON.parse(localStorage.getItem(key));
    return v ?? fb;
  } catch {
    return fb;
  }
}

export function saveJSON(key, val) {
  try {
    if (!hasLS()) return false;
    localStorage.setItem(key, JSON.stringify(val));
    return true;
  } catch {
    return false;
  }
}

export function loadText(key, fb = "") {
  try {
    if (!hasLS()) return fb;
    return localStorage.getItem(key) ?? fb;
  } catch {
    return fb;
  }
}

export function saveText(key, val) {
  try {
    if (!hasLS()) return false;
    localStorage.setItem(key, val);
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key) {
  try {
    if (!hasLS()) return false;
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

// One-time rename in the Avsar rollout: older devices stored the profile,
// resume, progress, quiz bests and device id under the legacy "c2c-" prefix.
// Move them across before the app reads anything, so nobody loses their work.
// A key that already exists under the new name wins; the stale copy is dropped.
export function migrateLegacyKeys(from = "c2c-", to = "avsar-") {
  try {
    if (!hasLS()) return 0;
    const legacy = Object.keys(localStorage).filter((k) => k.startsWith(from));
    let moved = 0;
    for (const key of legacy) {
      const target = to + key.slice(from.length);
      if (localStorage.getItem(target) === null) {
        localStorage.setItem(target, localStorage.getItem(key));
        moved++;
      }
      localStorage.removeItem(key);
    }
    return moved;
  } catch {
    return 0;
  }
}
