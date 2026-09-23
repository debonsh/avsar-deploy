// ponytail: google auth is one supabase call + session read. no supabase keys
// (or offline) → null user, guest device id keeps working. auth never gates.
import { getClient, isSupabaseOn } from "./supabase.js";

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
  if (!sb) return { error: "supabase is not configured. add keys to .env to enable google sign-in." };
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
  return isSupabaseOn() ? "google sign-in ready" : "guest mode (supabase off)";
}
