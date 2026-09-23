// Public passport (/u/:id): the shareable face of a portfolio.
// Your own device renders it from local data. Anyone else gets the cloud
// summary (readiness, proven skills, gaps) when Supabase is configured, plus
// the one social act a passport allows: kudos. Offline, the honest empty state
// still stands — never a fake page.
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { Page, Card, H2, Btn, Chip, Empty } from "../components/ui.jsx";
import { useAvsar } from "../app/store.jsx";
import { getOrCreateDeviceId, loadNickname, loadGithub } from "../lib/identity.js";
import { isVerified, fetchKudos, giveKudos, hasGivenKudos, loadKudosFallback } from "../lib/store.js";
import { completedSkillIdsForRole } from "../lib/progress.js";
import { calculateMainScore, questPairsToProof, ROLES } from "../lib/score.js";
import { loadPublicPassport } from "../lib/backend.js";
import { loadJSON } from "../lib/storage.js";
import { signCredential, verifyUrl } from "../lib/verify.js";

// The applause row. Count comes from the cloud when reachable and from this
// device's fallback otherwise; one device applauds one passport, ever, and the
// owner never applauds themselves.
function KudosBar({ count, given, onGive, canGive = true }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-stone-200 pt-3">
      {canGive && (
        <Btn size="sm" variant={given ? "quiet" : "primary"} disabled={given} onClick={onGive}>
          {given ? "Kudos given" : "Give kudos"}
        </Btn>
      )}
      <p className="text-xs leading-5 text-stone-500">
        <strong className="font-mono tabular-nums text-stone-700">{count}</strong> kudos received
      </p>
    </div>
  );
}

export default function Public() {
  const { id } = useParams();
  const { resume } = useAvsar();
  const mine = getOrCreateDeviceId();
  const isMine = id === mine;
  // the passport belongs to the resume that was scored, not to the device
  // reading it — the lane travels inside the saved row.
  const lane = resume?.roleKey || "ayush";

  const [guest, setGuest] = useState(null);
  const [guestChecked, setGuestChecked] = useState(false);
  const [kudos, setKudos] = useState(() => loadKudosFallback(id));
  const [given, setGiven] = useState(() => hasGivenKudos(id));

  const found = resume?.result?.found || [];
  const earned = completedSkillIdsForRole(lane);
  const github = loadGithub();
  const verified = found.filter((s) => isVerified(s, earned, github));
  const readiness = resume?.result
    ? calculateMainScore(resume.result.total, loadJSON("avsar-interview-best", 0), questPairsToProof(earned.length), lane)
    : 0;
  const code = useMemo(
    () => signCredential({ id: mine, name: loadNickname() || "avsar student", readiness, skills: verified }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- snapshot for sharing
    [mine, readiness]
  );

  // someone else's passport: one read, then render or fall back honestly.
  useEffect(() => {
    if (isMine) return;
    let live = true;
    loadPublicPassport(id)
      .then((p) => {
        if (!live) return;
        setGuest(p);
        setGuestChecked(true);
      })
      .catch(() => {
        if (live) setGuestChecked(true);
      });
    return () => {
      live = false;
    };
  }, [id, isMine]);

  // kudos count, cloud first, local fallback already in state.
  useEffect(() => {
    let live = true;
    fetchKudos(id)
      .then((n) => {
        if (live && n != null) setKudos(n);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [id]);

  async function applaud() {
    if (given) return;
    setGiven(true);
    setKudos((n) => n + 1);
    await giveKudos(id).catch(() => {});
  }

  if (!isMine) {
    if (guest) {
      const roleLabel = ROLES[guest.roleKey]?.label || guest.roleKey;
      return (
        <Page title={`Student ${guest.id.slice(0, 8)}`} sub={`Public passport · ${roleLabel} · readiness ${guest.main || guest.score}/100`}>
          <Card>
            <H2>Proven skills</H2>
            <div className="flex flex-wrap gap-1.5">
              {guest.found.map((s) => <Chip key={s} tone="green">{s}</Chip>)}
              {guest.found.length === 0 && <p className="text-sm text-stone-500">Nothing proven on this passport yet.</p>}
            </div>
            {guest.missing.length > 0 && (
              <>
                <H2 className="mt-5">Still working on</H2>
                <div className="flex flex-wrap gap-1.5">
                  {guest.missing.map((s) => <Chip key={s} tone="amber">{s}</Chip>)}
                </div>
              </>
            )}
            <KudosBar count={kudos} given={given} onGive={applaud} />
          </Card>
        </Page>
      );
    }
    return (
      <Page title="Passport not on this device" sub="Public profiles need the network; offline, only the owner's device can render one.">
        <Empty
          title={guestChecked ? "Ask for their verify link" : "Looking for this passport…"}
          body="Every student carries a QR-signed credential that recomputes offline. That link — not this page — is the proof."
          action={<Btn to="/">Get your own passport</Btn>}
        />
      </Page>
    );
  }

  return (
    <Page title={`${loadNickname() || "Avsar student"}`} sub={`Public passport · ${mine.slice(0, 8)} · readiness ${readiness}/100`}>
      <Card>
        <H2>Verified skills ({verified.length}/{found.length})</H2>
        <div className="flex flex-wrap gap-1.5">
          {found.map((s) => (
            <Chip key={s} tone={isVerified(s, earned, github) ? "green" : "zinc"}>{s}</Chip>
          ))}
          {found.length === 0 && <p className="text-sm text-stone-500">No scored resume on this device yet.</p>}
        </div>
        <KudosBar count={kudos} canGive={false} />
        <p className="mt-4 border-t border-stone-200 pt-3 text-xs leading-5 text-stone-500">
          Trust this page the way you trust any screenshot — verify instead:
        </p>
        <Link to={verifyUrl(code)} className="mt-1 inline-block text-sm font-semibold text-emerald-700 underline underline-offset-4">
          Open the signed credential →
        </Link>
      </Card>
    </Page>
  );
}
