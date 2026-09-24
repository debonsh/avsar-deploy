// ponytail: auth is one supabase call + session read. no supabase keys (or
// offline) → null user, guest device id keeps working and nothing gates. with
// keys configured, auth gates every non-public route (lib/authgate.js) — the
// cached session keeps the unplugged demo signed in.
import { getClient, isSupabaseOn, supabaseStatus } from "./supabase.js";

// The number-one login support ticket: keys were added to .env AFTER the dev
// server (or the dist build) started, so the running bundle cannot see them.
// Name the fix in the message, not just the file.
const CONFIG_HINT =
  "add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to avsar SIH 2026/.env, " +
  "then restart the dev server — or rebuild dist — so Vite picks them up.";

function notConfigured(action) {
  return { error: `supabase is not configured here (cannot ${action}). ${CONFIG_HINT}` };
}

// pure validators — node-testable, no client access.
export function validateEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
}

export function validatePassword(v) {
  return String(v || "").length >= 6;
}

export async function getUser() {
  const sb = await getClient();
  if (!sb) return null;
  try {
    const { data } = await sb.auth.getSession();
    return data?.session?.user || null;
  } catch {
    return null;
  }
}

export async function signInWithGoogle() {
  const sb = await getClient();
  if (!sb) return notConfigured("sign in with google");
  try {
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    return { error: error?.message || null };
  } catch {
    return { error: "sign-in failed. check connection and try again." };
  }
}

// email+password pair. both return { error } and never throw; signUp also
// returns { pending: true } when the project requires email confirmation
// (user created, no session yet) so the UI can say "check your inbox".
export async function signInWithEmail(email, password) {
  const sb = await getClient();
  if (!sb) return notConfigured("sign in");
  try {
    const { error } = await sb.auth.signInWithPassword({ email: String(email || "").trim(), password });
    return { error: error?.message || null };
  } catch {
    return { error: "sign-in failed. check connection and try again." };
  }
}

export async function signUpWithEmail(email, password) {
  const sb = await getClient();
  if (!sb) return notConfigured("sign up");
  try {
    const { data, error } = await sb.auth.signUp({ email: String(email || "").trim(), password });
    if (error) return { error: error.message || "sign-up failed." };
    return { error: null, pending: Boolean(data?.user && !data?.session) };
  } catch {
    return { error: "sign-up failed. check connection and try again." };
  }
}

export async function signOut() {
  const sb = await getClient();
  if (!sb) return;
  try {
    await sb.auth.signOut();
  } catch {
    /* guest mode carries on */
  }
}

// Subscribe to sign-in/out. Returns an unsubscribe fn so callers can clean up
// (React effects, hot reload) instead of leaking a listener per mount.
export function onAuthChange(cb) {
  let cancelled = false;
  let subscription = null;
  getClient()
    .then((sb) => {
      if (cancelled) return;
      if (!sb) {
        cb(null);
        return;
      }
      sb.auth
        .getSession()
        .then(({ data }) => {
          if (!cancelled) cb(data?.session?.user || null);
        })
        .catch(() => {
          if (!cancelled) cb(null);
        });
      const { data } = sb.auth.onAuthStateChange((_evt, session) => cb(session?.user || null));
      subscription = data?.subscription || null;
    })
    .catch(() => {
      if (!cancelled) cb(null);
    });
  return () => {
    cancelled = true;
    subscription?.unsubscribe?.();
  };
}

export function authLabel() {
  if (isSupabaseOn()) return "sign-in ready";
  const { missing } = supabaseStatus();
  return missing.length ? `guest mode · set ${missing.join(", ")}` : "guest mode (supabase off)";
}

// --- OAuth return ----------------------------------------------------------
// Google sends the browser back with ?code= (or ?error= when consent fails).
// supabase-js exchanges the code automatically on client creation, but a
// failure there used to vanish silently: no session, no message, and the
// auth gate just bounced the user back to /login forever. This runs once at
// boot, waits for the exchange to settle, strips the auth params (keeping
// the rest of the URL, e.g. ?chat=1), and returns "" on success or a human
// sentence the Login page can show.

// pure + tested: what did the provider send us back?
export function parseOAuthParams(search = "") {
  let q;
  try {
    q = new URLSearchParams(String(search).replace(/^[?#]/, ""));
  } catch {
    return { kind: "none" };
  }
  const error = q.get("error_description") || q.get("error") || "";
  if (error) return { kind: "provider-error", error };
  if (q.get("code")) return { kind: "code" };
  return { kind: "none" };
}

// pure + tested: provider errors are terse codes — say what happened.
export function friendlyOAuthError(raw = "") {
  const s = String(raw || "").toLowerCase();
  if (s.includes("access_denied") || s.includes("cancelled") || s.includes("denied")) {
    return "Google sign-in was cancelled before it finished. Try again when ready.";
  }
  if (s.includes("redirect_uri") || s.includes("redirect")) {
    return "Google rejected the return address. This app address must be allow-listed in Supabase → Auth → URL Configuration → Redirect URLs.";
  }
  return String(raw || "Google sign-in failed.").slice(0, 160) || "Google sign-in failed.";
}

function cleanOAuthParams() {
  try {
    const q = new URLSearchParams(window.location.search || "");
    let touched = false;
    for (const k of ["code", "error", "error_description", "state"]) {
      if (q.has(k)) {
        q.delete(k);
        touched = true;
      }
    }
    if (!touched) return;
    const rest = q.toString();
    window.history.replaceState(
      null,
      "",
      window.location.pathname + (rest ? `?${rest}` : "") + window.location.hash
    );
  } catch {
    /* private mode — the params just stay */
  }
}

async function waitForSession(sb, timeoutMs) {
  try {
    const { data } = await sb.auth.getSession();
    if (data?.session) return data.session;
  } catch {
    /* fall through to the listener */
  }
  return new Promise((resolve) => {
    let done = false;
    const timer = setTimeout(() => finish(null), timeoutMs);
    let sub = null;
    try {
      sub = sb.auth.onAuthStateChange((_evt, s) => {
        if (s) finish(s);
      })?.data?.subscription || null;
    } catch {
      finish(null);
    }
    function finish(s) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try {
        sub?.unsubscribe?.();
      } catch {
        /* ignore */
      }
      resolve(s);
    }
  });
}

export async function finishOAuthReturn({ timeoutMs = 4000 } = {}) {
  let parsed = { kind: "none" };
  try {
    parsed = parseOAuthParams(window.location.search || "");
  } catch {
    return "";
  }
  if (parsed.kind === "none") return "";
  if (parsed.kind === "provider-error") {
    cleanOAuthParams();
    return friendlyOAuthError(parsed.error);
  }
  const sb = await getClient();
  if (!sb) {
    cleanOAuthParams();
    return `sign-in returned, but this build cannot see supabase keys. ${CONFIG_HINT}`;
  }
  const session = await waitForSession(sb, timeoutMs);
  cleanOAuthParams();
  if (session?.user) return "";
  return (
    "Google sent us back but no session landed here. Usual causes: the code " +
    "expired, an extra tab raced this one, or this address (localhost vs " +
    "127.0.0.1) is not the one allow-listed in Supabase. Close extra tabs " +
    "and sign in once more from this page."
  );
}
