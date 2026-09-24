// ponytail: the auth gate is one pure function, not conditionals smeared
// across the shell. Auth is required on every non-public route — but only
// when a Supabase backend exists to authenticate against. Zero keys → guest
// device-id mode, nothing gates (the offline demo promise survives).
import { isPublicPath } from "./rbac.js";

// "allow" → render the route. "login" → bounce to /login.
// "wait" → session read still in flight; render a splash, never flash /login
// at a signed-in user on reload.
export function authGate({ supabaseOn, authReady, user, path }) {
  if (isPublicPath(path)) return "allow";
  if (!supabaseOn) return "allow";
  if (!authReady) return "wait";
  return user ? "allow" : "login";
}
