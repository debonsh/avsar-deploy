import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { Page, Card, H2, Btn, Field, Chip, inputCls } from "../components/ui.jsx";
import { useAvsar } from "../app/store.jsx";
import {
  getOrCreateDeviceId, loadNickname, saveNickname, loadGithub, saveGithub,
  loadCerts, addCert, removeCert,
} from "../lib/identity.js";
import { isVerified, fetchKudos, loadKudosFallback } from "../lib/store.js";
import { completedSkillIdsForRole, getEvidence } from "../lib/progress.js";
import { submitFeedback } from "../lib/backend.js";
import { calculateMainScore, questPairsToProof } from "../lib/score.js";
import { loadJSON } from "../lib/storage.js";
import { signCredential, verifyUrl, checkCredentialStatus, revokeCredential } from "../lib/verify.js";
import { VaidyaLevel } from "../components/ui.jsx";
import { vaidyaLevel } from "../ayush/scoring.js";

export default function Portfolio() {
  const { lane, resume } = useAvsar();
  const [nick, setNick] = useState(() => loadNickname());
  const [github, setGithub] = useState(() => loadGithub());
  const [certs, setCerts] = useState(() => loadCerts());
  const [issuer, setIssuer] = useState("");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [thanks, setThanks] = useState(false);
  const [kudos, setKudos] = useState(() => loadKudosFallback(getOrCreateDeviceId()));
  const [revInfo, setRevInfo] = useState(null);

  const id = getOrCreateDeviceId();
  const found = resume?.result?.found || [];
  const earned = completedSkillIdsForRole(lane);
  const proofSkills = earned.filter((s) => getEvidence(lane, s));
  const verified = found.filter((s) => isVerified(s, earned, github));
  const readiness = resume?.result
    ? calculateMainScore(resume.result.total, loadJSON("avsar-interview-best", 0), questPairsToProof(earned.length), lane)
    : 0;
  const code = useMemo(
    () => signCredential({ id, name: nick || "avsar student", readiness, skills: verified }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-sign on explicit refresh only
    [id, readiness]
  );
  const qrRef = useRef(null);
  const isAyush = lane === "ayush";
  const vaidya = isAyush ? vaidyaLevel(readiness) : null;

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const { toCanvas } = await import("qrcode");
        if (!live || !qrRef.current) return;
        await toCanvas(qrRef.current, `${window.location.origin}${verifyUrl(code)}`, { margin: 1, width: 132 });
      } catch {
        /* qr stays empty, link still works */
      }
    })();
    return () => { live = false; };
  }, [code]);

  useEffect(() => {
    fetchKudos(id).then((n) => { if (n != null) setKudos(n); }).catch(() => {});
  }, [id]);

  function saveIdentity() {
    saveNickname(nick.trim());
    saveGithub(github.trim());
  }

  function add() {
    if (!title.trim()) return;
    setCerts(addCert({ issuer: issuer.trim() || "Self", title: title.trim(), url: url.trim() }));
    setIssuer(""); setTitle(""); setUrl("");
  }

  async function rate() {
    if (!stars) return;
    await submitFeedback({ rating: stars, comment: comment.trim() }).catch(() => {});
    setThanks(true);
  }

  // revocation is public and permanent: the credential stays verifiable
  // history, every view renders it as REVOKED.
  const rev = revInfo || checkCredentialStatus(code).revoked;
  function revokeNow() {
    const reason = window.prompt("Why revoke? This reason shows publicly.", "certificate withdrawn by issuer");
    if (reason === null) return;
    const e = revokeCredential(code, reason || "revoked by issuer");
    if (e) setRevInfo({ reason: e.reason, at: e.at });
  }

  return (
    <Page title="Portfolio" kicker="Step 05 · Showcase" sub="Everything you have proven, in one place. Your public ID lets colleges verify it.">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-wide text-zinc-500">readiness</p>
            <p className="font-display text-4xl font-bold tabular-nums text-zinc-50">
              {readiness}<span className="text-lg text-zinc-500">/100</span>
            </p>
            {vaidya && (
              <div className="mt-2">
                <VaidyaLevel level={vaidya.id} />
                <p className="mt-0.5 font-mono text-xs text-emerald-400">{vaidya.label} · {vaidya.hi}</p>
              </div>
            )}
            <p className="mt-2 font-mono text-xs tabular-nums text-zinc-500">
              assessed {found.length} · verified {verified.length} · proof links {proofSkills.length}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <canvas ref={qrRef} width="132" height="132" className="border border-zinc-800 bg-white p-1" aria-label="QR code to verification page" />
            <div className="max-w-[180px]">
              <p className="font-mono text-[11px] uppercase tracking-wide text-zinc-500">passport qr</p>
              <p className="mt-1 text-xs leading-5 text-zinc-400">scan to verify. signature recomputes offline.</p>
              <Link to={verifyUrl(code)} className="mt-1 inline-block font-mono text-xs text-blurple-soft underline underline-offset-4">
                open verify page →
              </Link>
              <Link to={`/u/${id}`} className="mt-1 block font-mono text-xs text-blurple-soft underline underline-offset-4">
                open public passport →
              </Link>
              {rev ? (
                <p className="mt-2 rounded-lg border border-red-900 bg-red-950 px-2 py-1.5 font-mono text-[11px] text-red-300">
                  REVOKED · {rev.reason}
                </p>
              ) : (
                <button type="button" onClick={revokeNow} className="mt-2 text-xs font-medium text-zinc-500 underline underline-offset-4 hover:text-red-400">
                  Revoke credential
                </button>
              )}
            </div>
          </div>
        </div>
      </Card>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <H2>Identity</H2>
          <div className="grid gap-3">
            <Field label="Display name">
              <input className={inputCls} value={nick} onChange={(e) => setNick(e.target.value)} onBlur={saveIdentity} placeholder="Your name" />
            </Field>
            <Field label="Proof folder link" hint="A linked logbook or drive folder verifies every skill on your resume.">
              <input className={inputCls} value={github} onChange={(e) => setGithub(e.target.value)} onBlur={saveIdentity} placeholder="https://drive link to your logbook" />
            </Field>
            <p className="text-xs text-zinc-400">Public ID: <span className="font-mono">{id.slice(0, 8)}</span> · Kudos received: <strong className="tabular-nums">{kudos}</strong></p>
          </div>

          <H2 className="mt-5">Verified skills ({found.filter((s) => isVerified(s, earned, github)).length}/{found.length})</H2>
          <div className="flex flex-wrap gap-1.5">
            {found.map((s) => (
              <Chip key={s} tone={isVerified(s, earned, github) ? "green" : "zinc"}>{s}</Chip>
            ))}
            {found.length === 0 && <p className="text-sm text-zinc-400">Score a resume to list skills here.</p>}
          </div>

          {proofSkills.length > 0 && (
            <>
              <H2 className="mt-5">Proof links</H2>
              <ul className="space-y-1.5">
                {proofSkills.map((s) => (
                  <li key={s} className="text-sm">
                    <span className="text-zinc-400">{s}: </span>
                    <a className="font-medium text-blurple-soft underline" href={getEvidence(lane, s)} target="_blank" rel="noreferrer">{getEvidence(lane, s)}</a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <H2>Certifications ({certs.length})</H2>
            <ul className="space-y-2">
              {certs.map((c, i) => (
                <li key={i} className="flex items-start justify-between gap-2 text-sm">
                  <span>
                    <strong className="text-zinc-100">{c.title}</strong>
                    <span className="text-zinc-400"> · {c.issuer}</span>
                    {c.url && <> · <a className="font-medium text-blurple-soft underline" href={c.url} target="_blank" rel="noreferrer">view</a></>}
                  </span>
                  <button type="button" className="shrink-0 text-xs font-medium text-red-700 underline" onClick={() => setCerts(removeCert(i))}>
                    Remove
                  </button>
                </li>
              ))}
              {certs.length === 0 && <li className="text-sm text-zinc-400">None added. Free course certs from the Quests page belong here.</li>}
            </ul>
            <div className="mt-3 grid gap-2">
              <Field label="Certificate title">
                <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="SQL Basic, HackerRank" />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Issuer">
                  <input className={inputCls} value={issuer} onChange={(e) => setIssuer(e.target.value)} placeholder="HackerRank" />
                </Field>
                <Field label="URL (optional)">
                  <input className={inputCls} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
                </Field>
              </div>
              <Btn variant="quiet" onClick={add} disabled={!title.trim()}>Add certificate</Btn>
            </div>
          </Card>

          <Card>
            <H2>Rate this app</H2>
            {thanks ? (
              <p className="text-sm text-zinc-400">Thanks. Your rating helps the placement cell read real sentiment.</p>
            ) : (
              <>
                <div className="flex gap-1" role="radiogroup" aria-label="Star rating">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={stars === n}
                      aria-label={`${n} star${n > 1 ? "s" : ""}`}
                      className={`flex h-11 w-11 items-center justify-center rounded-lg border text-lg ${stars >= n ? "border-blurple bg-blurple/10 text-blurple-soft" : "border-zinc-700 text-zinc-600 hover:border-zinc-500"}`}
                      onClick={() => setStars(n)}
                    >
                      ★
                    </button>
                  ))}
                </div>
                <div className="mt-2">
                  <Field label="Comment (optional)">
                    <input className={inputCls} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What helped most?" />
                  </Field>
                </div>
                <Btn className="mt-3" onClick={rate} disabled={!stars}>Submit rating</Btn>
              </>
            )}
          </Card>
        </div>
      </div>
    </Page>
  );
}