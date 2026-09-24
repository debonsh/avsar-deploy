// /login — the one auth surface. Email+password first (works in a demo hall
// with no Google account handy), Google OAuth as the one-tap alternative.
// Signed-in users never see this page: they bounce to their dashboard.
// Pre-portal the app owns a dark floor, so this page speaks plain zinc.
import { useState } from "react";
import { Navigate } from "react-router";
import { Page, Card, Field, inputCls, Button } from "../components/ui.jsx";
import { useAvsar } from "../app/store.jsx";
import { dashboardFor } from "../lib/rbac.js";
import { isSupabaseOn } from "../lib/supabase.js";
import { signInWithEmail, signInWithGoogle, signUpWithEmail, validateEmail, validatePassword } from "../lib/auth.js";

export default function Login() {
  const { user, track, role, authNotice } = useAvsar();
  const [mode, setMode] = useState("in"); // "in" | "up"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [pending, setPending] = useState(false);

  if (user) return <Navigate to={track ? dashboardFor(track, role) : "/"} replace />;

  async function submit(e) {
    e.preventDefault();
    setMsg("");
    if (!validateEmail(email)) return setMsg("enter a valid email address.");
    if (!validatePassword(password)) return setMsg("password needs at least 6 characters.");
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await signInWithEmail(email, password);
        if (error) setMsg(error);
        // success: onAuthChange in the store sets user, the Navigate above fires.
      } else {
        const { error, pending: needsConfirm } = await signUpWithEmail(email, password);
        if (error) setMsg(error);
        else if (needsConfirm) setPending(true);
        // no pending → session live → same onAuthChange path as sign-in.
      }
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setMsg("");
    const { error } = await signInWithGoogle();
    if (error) setMsg(error);
  }

  return (
    <Page
      title={mode === "in" ? "Sign in" : "Create your account"}
      sub="One account carries your skill passport, scores, and applications across devices."
    >
      <Card className="mx-auto max-w-md">
        {authNotice && !pending && (
          <p role="alert" className="mb-4 rounded-xl border border-amber-900 bg-amber-950 px-4 py-3 text-sm leading-6 text-amber-300">
            {authNotice}
          </p>
        )}
        {pending ? (
          <div className="text-center">
            <p className="text-sm font-semibold text-zinc-100">Confirm your email</p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              We sent a confirmation link to <span className="font-mono text-zinc-200">{email.trim()}</span>.
              Open it, then sign in.
            </p>
            <Button
              variant="quiet"
              className="mt-4 w-full"
              onClick={() => { setPending(false); setMode("in"); setPassword(""); }}
            >
              Back to sign in
            </Button>
          </div>
        ) : (
          <>
            <form onSubmit={submit} className="space-y-4" noValidate>
              <Field label="Email">
                <input
                  type="email"
                  className={inputCls}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@college.ac.in"
                  autoComplete="email"
                  required
                />
              </Field>
              <Field label="Password" hint={mode === "up" ? "At least 6 characters." : undefined}>
                <input
                  type="password"
                  className={inputCls}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "in" ? "current-password" : "new-password"}
                  required
                />
              </Field>
              {msg && <p role="alert" className="text-sm leading-5 text-red-400">{msg}</p>}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? "…" : mode === "in" ? "Sign in" : "Create account"}
              </Button>
            </form>

            <div className="my-4 flex items-center gap-3" aria-hidden>
              <span className="h-px flex-1 bg-zinc-800" />
              <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">or</span>
              <span className="h-px flex-1 bg-zinc-800" />
            </div>

            <Button variant="quiet" className="w-full" onClick={google} disabled={busy}>
              Continue with Google
            </Button>

            <p className="mt-4 text-center text-xs text-zinc-500">
              {mode === "in" ? (
                <>
                  New here?{" "}
                  <button type="button" className="font-semibold text-blurple-soft underline underline-offset-4" onClick={() => { setMode("up"); setMsg(""); }}>
                    Create an account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button type="button" className="font-semibold text-blurple-soft underline underline-offset-4" onClick={() => { setMode("in"); setMsg(""); }}>
                    Sign in
                  </button>
                </>
              )}
            </p>
          </>
        )}
      </Card>

      {!isSupabaseOn() && (
        <p className="mx-auto mt-4 max-w-md text-center text-xs leading-5 text-zinc-600">
          Supabase keys are not configured, so this build runs in guest mode — your device id keeps
          everything local and nothing is gated.
        </p>
      )}
    </Page>
  );
}
