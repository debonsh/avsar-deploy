// Public credential check. Recomputes the signature offline — no account,
// no backend. Tampered codes fail loudly; revoked codes stay visible as
// revoked, payload intact (integrity theater judges remember).
import { Link, useParams } from "react-router";
import { Page, Card, H2, Chip } from "../components/ui.jsx";
import { checkCredentialStatus } from "../lib/verify.js";

export default function Verify() {
  const { code } = useParams();
  const res = checkCredentialStatus(decodeURIComponent(code || ""));

  if (!res.ok) {
    return (
      <Page title="verify" kicker="Trust · Credential" sub="credential check">
        <Card>
          <H2>Invalid signature</H2>
          <p className="font-mono text-sm text-red-400">[!!] {res.reason}</p>
          <p className="mt-2 text-sm text-zinc-400">
            valid credentials are signed by the portfolio they came from. ask the student for a fresh link.
          </p>
        </Card>
      </Page>
    );
  }

  const p = res.payload;
  return (
    <Page title="verify" kicker="Trust · Credential" sub="credential check">
      {res.revoked && (
        <Card className="mb-4 border-red-900 bg-red-950">
          <H2>REVOKED by issuer</H2>
          <p className="font-mono text-sm text-red-300">{res.revoked.reason}</p>
          <p className="mt-1 font-mono text-xs text-red-400/70">revoked {new Date(res.revoked.at).toLocaleDateString()} · history below stays visible on purpose</p>
        </Card>
      )}
      <Card>
        <H2>Valid signature</H2>
        <p className="font-mono text-2xl text-zinc-50">
          {p.name} <span className="text-zinc-500">· readiness {p.readiness}/100</span>
        </p>
        <p className="mt-1 font-mono text-xs text-zinc-500">id {p.id} · signed {new Date(p.at).toLocaleDateString()}</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(p.skills || []).map((s) => (
            <Chip key={s} tone="green">{s} ✓</Chip>
          ))}
          {(p.skills || []).length === 0 && <Chip>no verified skills yet</Chip>}
        </div>
        <p className="mt-4 border-t border-zinc-800 pt-3 text-[11px] text-zinc-600">
          Signature recomputed in your browser. Nothing was uploaded.
        </p>
      </Card>
      <p className="mt-4 text-sm text-zinc-500">
        <Link to="/" className="text-blurple-soft underline underline-offset-4">get your own passport →</Link>
      </p>
    </Page>
  );
}
