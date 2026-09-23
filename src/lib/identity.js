// ponytail: stable demo identity, real Auth post-Sept. Slice I owns the UI; Slice B needs the key now.
import { loadJSON, saveJSON, loadText, saveText } from "./storage.js";
const ID_KEY = "avsar-id";
const NICK_KEY = "avsar-nick";
const ALPHA = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function getOrCreateDeviceId() {
  try {
    let v = loadText(ID_KEY);
    if (!v) {
      v = "AVSAR-" + Array.from({ length: 6 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join("");
      saveText(ID_KEY, v);
    }
    return v;
  } catch {
    return "AVSAR-DEMO";
  }
}

export function loadNickname() {
  return loadText(NICK_KEY);
}

export function saveNickname(n) {
  saveText(NICK_KEY, (n || "").trim().slice(0, 24));
}

// --- portfolio profile (Slice F): cert log + github handle, local-first ---

const CERTS_KEY = "avsar-certs";
const GH_KEY = "avsar-github";

export function loadCerts() {
  return loadJSON(CERTS_KEY, []);
}

export function addCert({ issuer, title, url }) {
  const next = [...loadCerts(), {
    issuer: (issuer || "").trim(), title: (title || "").trim(),
    url: (url || "").trim(), at: Date.now(),
  }];
  saveJSON(CERTS_KEY, next);
  return next;
}

export function removeCert(at) {
  const next = loadCerts().filter((c) => c.at !== at);
  saveJSON(CERTS_KEY, next);
  return next;
}

export function loadGithub() {
  return loadText(GH_KEY);
}

export function saveGithub(h) {
  const v = (h || "").trim().replace(/^@/, "");
  saveText(GH_KEY, v);
  return v;
}
