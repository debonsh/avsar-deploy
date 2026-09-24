// Receipts for finished work. A submission is graded, the grade is signed, and the
// receipt travels with the student, so a recruiter can check offline that the record
// was not altered after grading.
//
// What this does and does not prove, stated plainly because a claim about cryptography
// is the easiest place in this app to overreach. It proves integrity: the payload has
// not changed by a single character since it was signed, and whoever signed it held the
// private key. It does not prove identity: the receipt carries the public key, and
// anyone can mint a keypair. Pin the key fingerprint out of band and it becomes an
// identity claim; without that, it is tamper-evidence and nothing more.
//
// Where WebCrypto is missing the module degrades to the same FNV hash the v1
// credentials use, labels the mode honestly on the receipt and in the UI, and never
// presents that hash as cryptographic.
import { hashStr } from "./quests.js";
import { loadJSON, saveJSON } from "./storage.js";

export const ISSUER_KEY = "avsar-issuer-key-v1";

// --- canonical form -------------------------------------------------------------------

// A signature over text is only as stable as the text. Key order in a JSON string is
// not, so the payload is canonicalised first: object keys sorted, arrays left in the
// author's order, undefined dropped rather than serialised as null.
export function canonical(value) {
  if (value === undefined) return null;
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonical);
  const out = {};
  for (const key of Object.keys(value).sort()) {
    if (value[key] === undefined) continue;
    out[key] = canonical(value[key]);
  }
  return out;
}

export function canonicalJSON(value) {
  return JSON.stringify(canonical(value));
}

// --- base64url for byte strings -------------------------------------------------------

function bytesToB64url(bytes = new Uint8Array()) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToBytes(s = "") {
  const b = String(s).replace(/-/g, "+").replace(/_/g, "/");
  const padded = b + "=".repeat((4 - (b.length % 4)) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const utf8 = (s) => new TextEncoder().encode(s);

// --- capability check ------------------------------------------------------------------

// Node 19 and every current browser have this. Older browsers, and any environment with
// crypto present but subtle absent, fall through to the hash mode.
export function hasWebCrypto() {
  try {
    return typeof globalThis !== "undefined" && typeof globalThis.crypto?.subtle?.generateKey === "function";
  } catch {
    return false;
  }
}

export function signingMode() {
  return hasWebCrypto() ? "ecdsa-p256" : "hash-fallback";
}

// The label every surface must print beside a receipt. One home, so the honest wording
// cannot drift between the portfolio, the shortlist and the verify page.
export function modeLabel(mode = signingMode()) {
  return mode === "ecdsa-p256"
    ? "ECDSA P-256 signature, verifiable offline"
    : "weaker hash mode, this device has no WebCrypto";
}

// --- keys -------------------------------------------------------------------------------

export async function generateIssuerKeypair() {
  if (!hasWebCrypto()) return null;
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  return {
    publicJwk: await crypto.subtle.exportKey("jwk", pair.publicKey),
    privateJwk: await crypto.subtle.exportKey("jwk", pair.privateKey),
  };
}

// Short, stable handle for a public key: the first 16 base64url characters of the
// SHA-256 of its canonical form. Two receipts from the same device share a kid, so a
// reviewer can see they came from one issuer without seeing the key itself.
export async function fingerprint(publicJwk) {
  const body = canonicalJSON(publicKeyFor(publicJwk));
  if (hasWebCrypto()) {
    const digest = await crypto.subtle.digest("SHA-256", utf8(body));
    return bytesToB64url(new Uint8Array(digest)).slice(0, 16);
  }
  return hashStr(`avsar-kid:${body}`).toString(36).slice(0, 16);
}

// Key names that are either the private half or a statement about permitted use rather
// than about identity. Listed as data so the rule is readable in one place, and so this
// function carries no unused destructured bindings to explain away.
const NOT_PUBLIC = new Set(["d", "p", "q", "dp", "dq", "qi", "key_ops", "ext"]);

// The public view of a JWK, for two jobs at once.
//
// Never leak: `d` and the RSA-style CRT parameters are the private key, so they are
// dropped on the way into any receipt, fingerprint or log line.
//
// Identify the key material and nothing else: `key_ops` and `ext` describe what the holder
// is allowed to do with the key, not which key it is. Leaving them in would make the same
// key fingerprint differently depending on whether it was read from the public or the
// private half, so a receipt's id would change with how it was computed.
export function publicKeyFor(jwk = {}) {
  const out = {};
  for (const [key, value] of Object.entries(jwk || {})) {
    if (NOT_PUBLIC.has(key)) continue;
    out[key] = value;
  }
  return out;
}

// The device's issuer key, generated once and kept locally. The in-memory mirror is what
// lets node --test exercise signing twice and see the same key, and it keeps a single
// page from minting a second keypair mid-session. Returns null when the environment cannot
// do asymmetric keys, which is the signal to sign by hash instead.
const keyMem = { value: undefined };

export async function loadIssuerKey() {
  if (keyMem.value !== undefined) return keyMem.value;
  const stored = loadJSON(ISSUER_KEY, null);
  if (stored?.privateJwk?.d && stored?.publicJwk) {
    keyMem.value = stored;
    return stored;
  }
  const pair = await generateIssuerKeypair();
  if (!pair) {
    keyMem.value = null;
    return null;
  }
  const row = { ...pair, kid: await fingerprint(pair.publicJwk), at: Date.now() };
  keyMem.value = row;
  saveJSON(ISSUER_KEY, row);
  return row;
}

export function issuerKeySync() {
  const stored = keyMem.value ?? loadJSON(ISSUER_KEY, null);
  return stored?.publicJwk ? { kid: stored.kid, publicJwk: stored.publicJwk } : null;
}

// --- signing ---------------------------------------------------------------------------

// One receipt: the payload, its signature, which key signed it, and which mode was used.
// The public key rides along so the check works with no server and no lookup.
export async function signPayload(payload = {}, keypair = null) {
  const body = canonicalJSON(payload);
  const when = new Date().toISOString();
  if (hasWebCrypto() && keypair?.privateJwk?.d) {
    const key = await crypto.subtle.importKey("jwk", keypair.privateJwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
    const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, utf8(body));
    return {
      payload,
      sig: bytesToB64url(new Uint8Array(sig)),
      kid: keypair.kid || (await fingerprint(keypair.publicJwk)),
      alg: "ECDSA-P256-SHA256",
      mode: "ecdsa-p256",
      jwk: publicKeyFor(keypair.publicJwk),
      at: when,
    };
  }
  return {
    payload,
    sig: hashStr(`avsar-fallback:${body}`).toString(36),
    kid: "hash-fallback",
    alg: "FNV-1a",
    mode: "hash-fallback",
    jwk: null,
    at: when,
  };
}

// Verification, offline, from the receipt alone. A one-character change to the payload
// changes the signature input, so it fails; the failure says tampered rather than
// malformed so a reader knows the difference between junk and an edit.
export async function verifySigned(receipt = {}, publicJwk = null) {
  const mode = receipt?.mode || (receipt?.jwk ? "ecdsa-p256" : "hash-fallback");
  if (!receipt?.payload || typeof receipt.sig !== "string" || !receipt.sig) {
    return { ok: false, reason: "malformed receipt", mode };
  }
  const body = canonicalJSON(receipt.payload);

  if (mode === "ecdsa-p256") {
    const jwk = publicJwk || receipt.jwk;
    if (!hasWebCrypto()) return { ok: false, reason: "this device has no WebCrypto, so it cannot check an ECDSA receipt", mode };
    if (!jwk?.x) return { ok: false, reason: "receipt carries no public key to check against", mode };
    try {
      const key = await crypto.subtle.importKey("jwk", publicKeyFor(jwk), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
      const ok = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, b64urlToBytes(receipt.sig), utf8(body));
      if (!ok) return { ok: false, reason: "signature does not match the payload, so this record was altered after signing", mode };
      return { ok: true, mode, kid: receipt.kid, weak: false, publicOnly: !publicJwk, payload: receipt.payload };
    } catch {
      return { ok: false, reason: "the receipt key could not be read", mode };
    }
  }

  const expected = hashStr(`avsar-fallback:${body}`).toString(36);
  if (expected !== receipt.sig) {
    return { ok: false, reason: "hash does not match the payload, so this record was altered after signing", mode: "hash-fallback" };
  }
  return {
    ok: true,
    mode: "hash-fallback",
    kid: receipt.kid || "hash-fallback",
    weak: true,
    publicOnly: true,
    payload: receipt.payload,
  };
}

// --- chain ------------------------------------------------------------------------------

// Each receipt links to the one before it, so the sequence is tamper-evident as a whole
// and not only entry by entry. Removing a row breaks every link after it.
export async function chainHash(prev = "", payload = {}) {
  const body = `${prev}|${canonicalJSON(payload)}`;
  if (hasWebCrypto()) {
    const digest = await crypto.subtle.digest("SHA-256", utf8(body));
    return bytesToB64url(new Uint8Array(digest)).slice(0, 32);
  }
  return hashStr(`avsar-chain:${body}`).toString(36);
}

// --- presentation ------------------------------------------------------------------------

// The one-line badge text for a receipt, so three surfaces cannot describe the same
// cryptographic state three different ways.
export function receiptBadge(receipt = {}) {
  if (receipt.mode === "ecdsa-p256") return { tone: "green", text: `signed · ${String(receipt.kid || "").slice(0, 8)}` };
  if (receipt.mode === "hash-fallback") return { tone: "amber", text: "hash mode, weaker" };
  return { tone: "zinc", text: "unsigned" };
}

export async function verifyReceiptText(receipt = {}) {
  const res = await verifySigned(receipt);
  if (!res.ok) return res.reason;
  return res.weak
    ? "integrity holds, but this hash mode is weaker than a signature"
    : "signature holds against the payload that travelled with it";
}
