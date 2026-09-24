// Profile is the onboarding engine. Welcome picks the portal; this page asks
// who you are (role) and then the four questions that portal actually needs:
// ayush keeps year/lane/college, tech keeps the scoring lane. Professional
// roles answer nothing more and land on their own desk.
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useNavigate } from "react-router";
import CIcon from "@coreui/icons-react";
import { cilSpa, cilChart, cilFire, cilCheckCircle, cilBolt, cilBriefcase } from "@coreui/icons";
import { Page, Card, H2, Btn, Badge, Field, inputCls, Radar } from "../components/ui.jsx";
import { useAvsar } from "../app/store.jsx";
import { requiredFor, gapVector, skillById } from "../data/taxonomy.js";
import { profileForMatching } from "../lib/match.js";
import { loadQuizBest } from "../data/quiz.js";
import { resetOnboarding } from "../lib/onboarding.js";
import { profileRowFor } from "../lib/profile.js";
import { saveProfileRemote } from "../lib/backend.js";
import { calculateMainScore, questPairsToProof, engLevelFor, ROLES } from "../lib/score.js";
import { completedSkillIdsForRole } from "../lib/progress.js";
import { collectDayCounts, currentStreak } from "../lib/streak.js";
import { collectXP } from "../lib/xp.js";
import { loadJSON } from "../lib/storage.js";
import { vaidyaLevel } from "../ayush/scoring.js";
import { signInWithGoogle, authLabel } from "../lib/auth.js";
import { getOrCreateDeviceId, loadNickname, saveNickname } from "../lib/identity.js";
import { AYUSH_ROLE } from "../data/ayushSeed.js";
import { roleLabel } from "../lib/roles.js";
import { TECH_LANES, targetRoleFor, profileMatchesTrack } from "../lib/track.js";
import { dashboardFor } from "../lib/rbac.js";

const GOALS = [
  { id: "internship", label: "Find an internship", hint: "Roles you can apply to right now, ranked by fit." },
  { id: "upskill", label: "Upskill first", hint: "Quests and free courses, jobs when you are ready." },
  { id: "certificate", label: "Earn a certificate", hint: "Free certs that lift your readiness score." },
  { id: "portfolio", label: "Build proof", hint: "Proof links and a showcase recruiters open." },
];

const LOCS = [
  { id: "anywhere", label: "Anywhere", hint: "Includes remote and on-site postings." },
  { id: "india", label: "In India", hint: "On-site roles across states." },
  { id: "remote", label: "Remote only", hint: "Work-from-hostel friendly roles." },
];

const HOURS = [
  { id: "2-4", label: "2 to 4 hrs/week", hint: "One quest at a time." },
  { id: "5-8", label: "5 to 8 hrs/week", hint: "Steady pace alongside classes." },
  { id: "9+", label: "9+ hrs/week", hint: "Full sprint mode." },
];

const YEARS = ["1st year", "2nd year", "3rd year", "4th year", "Intern"];

const LANES = [
  { id: "clinical", label: "Clinical practice", hint: "OPD, IPD, panchakarma rooms." },
  { id: "research", label: "Research", hint: "CCRAS, SPARK, trials." },
  { id: "industry", label: "Industry", hint: "GMP, QA, wellness brands." },
  { id: "exploring", label: "Still exploring", hint: "Matches stay broad." },
];

const TECH_HINTS = {
  sde: "Web, backend, full-stack roles.",
  data: "Dashboards, SQL, Python, analytics.",
  marketing: "SEO, content, ads, growth.",
  govt: "SSC, UPSC, banking prep.",
};

// one role list per portal: the vaidya portal serves ayush professionals, the
// tech portal serves the four tech lanes. Both include the professional desks.
const PORTAL_ROLES = {
  ayush: ["student", "ayush", "industry", "faculty", "institute"],
  tech: ["student", "industry", "faculty", "institute"],
};

const ROLE_HINTS = {
  student: { ayush: "AYUSH student, intern, or vaidya", tech: "BTech or career switch" },
  ayush: { ayush: "Practitioner or graduate", tech: "" },
  industry: { ayush: "Hospitals, ASU pharma, clinics", tech: "Companies hiring tech talent" },
  faculty: { ayush: "Teaching, FDPs, CMEs", tech: "Teaching, FDPs, workshops" },
  institute: { ayush: "College placement cell", tech: "College placement cell" },
};

// only this portal's own answers count as complete — a vaidya profile must not
// satisfy the tech form, or switching sides would show the wrong card.
function isComplete(p, track) {
  if (!profileMatchesTrack(p, track)) return false;
  if (track === "tech") return Boolean(p.skills && p.track && p.goal && p.loc && p.hours);
  return Boolean(p.skills && p.goal && p.loc && p.hours && p.year && p.lane);
}

// Fresh form seeded from this portal's saved answers only; the other portal's
// fields are dropped rather than carried across.
function initialForm(stored, track, role) {
  const p = profileMatchesTrack(stored, track) ? stored : {};
  const shared = { role, skills: "", goal: "", loc: "", hours: "" };
  if (track === "tech") {
    return { ...shared, track: TECH_LANES.includes(p.track) ? p.track : "sde" };
  }
  return { ...shared, track: "ayush", year: p.year || "", lane: p.lane || "", college: p.college || "" };
}

function OptionCard({ selected, onPick, label, hint }) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={selected}
      className={`flex min-h-[56px] w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-all active:scale-[0.99] ${
        selected
          ? "border-blurple/40 bg-blurple/10 shadow-sm"
          : "border-stone-200 bg-white hover:border-zinc-500"
      }`}
    >
      <span>
        <span className="block text-sm font-semibold text-stone-800">{label}</span>
        {hint && <span className="mt-0.5 block text-xs leading-5 text-stone-500">{hint}</span>}
      </span>
      <span className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${selected ? "border-blurple bg-blurple" : "border-zinc-600"}`} aria-hidden>
        {selected && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6.2 5 8.5 9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
    </button>
  );
}

// Duolingo-profile DNA: cover band, avatar initial, name line, one stat row
// (readiness / streak / quest pairs), then skills + details. Stats read from
// the same stores as Home, so the two screens never disagree.
function ProfileCard({ form, resume, track, onEdit, onClear }) {
  const skills = String(form.skills || "").split(",").map((s) => s.trim()).filter(Boolean);
  const lane = track === "tech" ? form.track || "sde" : "ayush";
  const isAyush = lane === "ayush";
  const pairs = completedSkillIdsForRole(lane).length;
  const interviewBest = loadJSON("avsar-interview-best", 0);
  const main = resume?.result ? calculateMainScore(resume.result.total, interviewBest, questPairsToProof(pairs), lane) : null;
  const streak = currentStreak(collectDayCounts());
  const xp = collectXP();
  const vaidya = isAyush ? vaidyaLevel(main || 0) : null;
  const initial = ((form.college || form.skills || "").trim()[0] || "A").toUpperCase();
  // radar + gap vector vs this portal's target role: assessment → profile → gaps.
  const targetId = targetRoleFor(lane);
  const targetLabel = lane === "ayush" ? "Clinical Research Associate" : ROLES[lane]?.label || "target role";
  const quizBest = loadQuizBest(lane);
  const prof = profileForMatching(lane, skills, quizBest);
  const req = requiredFor(targetId).slice(0, 6);
  const SHORT = { research: "Trials", documentation: "Docs", pharmacovigilance: "ADR reports", diagnosis: "Diagnosis", gmp: "GMP", hims: "HIMS", javascript: "JS", communication: "Comms" };
  const axes = req.map((r) => ({ label: SHORT[r.skill] || skillById(r.skill)?.name || r.skill, value: prof.levels[r.skill] || 0, target: r.level }));
  const gaps = gapVector(targetId, prof.levels).slice(0, 4);
  const stats = [
    { icon: cilChart, label: "Readiness", value: main === null ? "—" : String(main) },
    { icon: cilFire, label: "Day streak", value: String(streak) },
    { icon: cilCheckCircle, label: "Quest pairs", value: String(pairs) },
    { icon: cilBolt, label: "XP", value: String(xp.total) },
  ];
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden p-0">
        <div className={`px-5 pb-14 pt-5 text-white ${isAyush ? "bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-600" : "bg-gradient-to-br from-zinc-900 via-zinc-800 to-blurple"}`}>
          <div className="flex items-center gap-2">
            <CIcon icon={isAyush ? cilSpa : cilBriefcase} width={18} height={18} className="shrink-0" aria-hidden />
            <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${isAyush ? "text-emerald-100" : "text-blurple-soft"}`}>
              {isAyush ? "Avsar vaidya card" : "Avsar tech card"}
            </p>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold capitalize">{roleLabel(form.role)}</span>
            {form.lane && <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold capitalize">{form.lane}</span>}
            {!isAyush && form.track && <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold">{ROLES[form.track]?.label}</span>}
            {form.year && <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold">{form.year}</span>}
            {main !== null && (
              <span className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] font-bold ${isAyush ? "bg-amber-400 text-emerald-950" : "bg-blurple-soft text-zinc-950"}`}>
                {isAyush ? vaidya.label : engLevelFor(main).label}
              </span>
            )}
          </div>
        </div>
        <div className="px-5 pb-5">
          <div className="-mt-8 mb-2 flex items-end justify-between gap-3">
            <span className={`flex size-16 items-center justify-center rounded-2xl border-4 border-white font-display text-2xl font-bold text-white ${isAyush ? "bg-emerald-700" : "bg-blurple"}`} aria-hidden>
              {initial}
            </span>
            <button type="button" onClick={onEdit} className="rounded-full border border-stone-200 bg-white px-4 py-1.5 text-xs font-semibold text-stone-600 hover:border-zinc-500 hover:text-blurple-soft">
              Edit answers
            </button>
          </div>
          <h2 className="font-display text-xl font-bold text-stone-900">
            {form.college?.trim() || (isAyush ? "BAMS student" : `${ROLES[lane]?.label || "Tech"} student`)}
          </h2>
          <p className="text-sm text-stone-500">{GOALS.find((g) => g.id === form.goal)?.label || "Goal not set"}</p>
          <dl className="mt-4 grid grid-cols-2 divide-stone-100 rounded-2xl border border-stone-100 bg-stone-50 sm:grid-cols-4 sm:divide-x">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-0.5 px-2 py-3">
                <CIcon icon={s.icon} width={15} height={15} className="text-emerald-700" aria-hidden />
                <dd className="font-display text-xl font-bold tabular-nums text-stone-900">{s.value}</dd>
                <dt className="text-[11px] text-stone-500">{s.label}</dt>
              </div>
            ))}
          </dl>
          {skills.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {skills.map((s) => (
                <span key={s} className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium capitalize text-emerald-900">{s}</span>
              ))}
            </div>
          )}
          {skills.length > 0 && (
            <div className="mt-4 rounded-2xl border border-stone-100 bg-stone-50 p-4">
              <div className="mx-auto w-full max-w-[220px] text-stone-500">
                <Radar axes={axes} size={210} label={`Skill profile vs ${targetLabel}`} />
              </div>
              <div className="mt-3 border-t border-stone-200 pt-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">Gap vector · {targetLabel}</p>
                {gaps.length === 0 ? (
                  <p className="mt-1 text-sm text-emerald-800">No gaps — you clear the bar. Open the feed.</p>
                ) : (
                  <ul className="mt-1.5 space-y-1">
                    {gaps.map((g) => (
                      <li key={g.skill} className="text-sm text-stone-600">
                        <strong className="text-stone-800">{skillById(g.skill)?.name || g.skill}</strong>
                        <span className="font-mono text-xs tabular-nums text-stone-500"> L{g.have} → L{g.need}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <Btn size="sm" to="/quests">Close a gap</Btn>
                  <Btn size="sm" variant="quiet" to="/match">Why this math</Btn>
                </div>
              </div>
            </div>
          )}
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-4">
            <div><dt className="text-stone-400">Role</dt><dd className="font-semibold text-stone-800">{roleLabel(form.role)}</dd></div>
            <div><dt className="text-stone-400">{isAyush ? "Year" : "Lane"}</dt><dd className="font-semibold capitalize text-stone-800">{isAyush ? form.year || "not set" : ROLES[lane]?.label || lane}</dd></div>
            <div><dt className="text-stone-400">Location</dt><dd className="font-semibold capitalize text-stone-800">{form.loc || "not set"}</dd></div>
            <div><dt className="text-stone-400">Time</dt><dd className="font-semibold text-stone-800">{form.hours ? `${form.hours} hrs/week` : "not set"}</dd></div>
          </dl>
          <p className="mt-2 text-xs leading-5 text-stone-500">
            Profile 40% done. Resume (+30%) and interview (+30%) finish it — and shape your questions.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Btn to="/journey">Continue — add your resume</Btn>
            <button type="button" onClick={onClear} className="inline-flex min-h-[40px] items-center text-sm font-medium text-stone-400 underline underline-offset-4 hover:text-red-600">
              Clear everything
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Account surface: identity header (avatar + name + email + provider/role
// badges), display-name edit, session meta, sign-out/switch, danger zone.
// Pattern: GitHub settings + Google account — one header, meta rows, then
// actions. Guest state keeps the single Google CTA + email fallback.
function AccountCard({ user, role, track, authNotice, onEditAnswers, onClear, onSignOut }) {
  const nav = useNavigate();
  const [nick, setNick] = useState(() => loadNickname() || "");
  const [savedTick, setSavedTick] = useState(false);
  const [authMsg, setAuthMsg] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const deviceId = getOrCreateDeviceId();

  const metaName = user?.user_metadata?.full_name || user?.user_metadata?.name || "";
  const emailPrefix = (user?.email || "").split("@")[0].replace(/[._-]+/g, " ").trim();
  const displayName = (nick || metaName || emailPrefix || "Avsar student").trim();
  const initial = (displayName[0] || "A").toUpperCase();
  const providerRaw = String(user?.app_metadata?.provider || "").toLowerCase();
  const provider = !user ? null : providerRaw === "google" ? "Google" : providerRaw === "email" ? "Email" : providerRaw ? providerRaw : "Email";

  async function google() {
    const { error } = await signInWithGoogle();
    setAuthMsg(error || "redirecting to google…");
  }

  function saveName() {
    saveNickname(nick.trim());
    setSavedTick(true);
    window.setTimeout(() => setSavedTick(false), 1500);
  }

  async function switchAccount() {
    await onSignOut();
    nav("/login");
  }

  if (!user) {
    return (
      <Card className="mt-4">
        <H2>Account</H2>
        <div className="flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-lg font-bold text-zinc-400" aria-hidden>
            ?
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-100">Guest on this device</p>
            <p className="mt-0.5 font-mono text-xs text-zinc-500">device id: {deviceId} · {authLabel()}</p>
          </div>
          <Badge tone="amber" className="ml-auto shrink-0">local only</Badge>
        </div>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Scores and applications stay on this device. Sign in to carry your passport across devices.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Btn onClick={google}>Continue with Google</Btn>
          <Btn variant="quiet" to="/login">Sign in with email</Btn>
        </div>
        {authMsg || authNotice ? (
          <p className="mt-2 font-mono text-xs leading-5 text-zinc-500">{authMsg || authNotice}</p>
        ) : null}
      </Card>
    );
  }

  const rows = [
    { k: "Sign-in", v: provider || "Email" },
    { k: "Role", v: roleLabel(role) },
    { k: "Portal", v: track === "tech" ? "Tech" : track === "ayush" ? "Vaidya (AYUSH)" : "Not picked yet" },
    { k: "Device", v: deviceId, mono: true },
  ];

  return (
    <Card className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <H2 className="mb-0">Account</H2>
        <Badge tone="green">signed in</Badge>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-blurple text-lg font-bold text-white" aria-hidden>
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-100">{displayName}</p>
          <p className="truncate font-mono text-xs text-zinc-400">{user.email}</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1.5">
          <Badge tone="blurple">{provider}</Badge>
          <Badge tone="zinc">{roleLabel(role)}</Badge>
        </div>
      </div>

      <div className="mt-4">
        <Field label="Display name" hint="Shown on your passport and portfolio. Saved on this device.">
          <div className="flex gap-2">
            <input
              className={inputCls}
              value={nick}
              onChange={(e) => setNick(e.target.value)}
              onBlur={saveName}
              placeholder={metaName || emailPrefix || "Your name"}
              maxLength={24}
              aria-label="Display name"
            />
            <Btn variant="quiet" onClick={saveName}>Save</Btn>
          </div>
        </Field>
        {savedTick && <p className="mt-1.5 text-xs text-green-400" role="status">Saved.</p>}
      </div>

      <dl className="mt-4 divide-y divide-zinc-800 rounded-xl border border-zinc-800">
        {rows.map((r) => (
          <div key={r.k} className="flex items-center justify-between gap-3 px-3 py-2">
            <dt className="text-xs text-zinc-500">{r.k}</dt>
            <dd className={`truncate text-xs font-semibold text-zinc-200 ${r.mono ? "font-mono font-medium" : ""}`}>{r.v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <Btn variant="quiet" onClick={onEditAnswers}>Edit profile answers</Btn>
        <Btn variant="quiet" onClick={switchAccount}>Switch account</Btn>
        <Btn variant="dangerQuiet" onClick={onSignOut}>Sign out</Btn>
      </div>

      <div className="mt-4 border-t border-zinc-800 pt-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Danger zone</p>
        {confirmClear ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="w-full text-xs leading-5 text-zinc-400">Clears profile, resume, and interview answers on this device. Cloud rows stay.</p>
            <Btn variant="dangerQuiet" size="sm" onClick={onClear}>Yes, clear it</Btn>
            <Btn variant="ghost" size="sm" onClick={() => setConfirmClear(false)}>Keep it</Btn>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmClear(true)} className="mt-1.5 text-xs font-medium text-red-400 underline underline-offset-4 hover:text-red-300">
            Clear local data…
          </button>
        )}
      </div>
    </Card>
  );
}

export default function Profile() {
  const { track, role, setRole, profile, updateProfile, clearProfileState, resume, user, authNotice, signOutUser } = useAvsar();
  const stored = profile;
  const isTech = track === "tech";
  const [form, setForm] = useState(() => initialForm(stored, track, role));
  const [step, setStep] = useState(() => (isComplete(stored, track) ? "done" : 0));
  const reduce = useReducedMotion();
  const nav = useNavigate();
  const [skills, setSkills] = useState(() =>
    profileMatchesTrack(stored, track)
      ? String(stored?.skills || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
      : []
  );
  const roleChoices = PORTAL_ROLES[track] || PORTAL_ROLES.ayush;
  const isProfessional = ["industry", "faculty", "institute"].includes(form.role);
  const lane = isTech ? form.track || "sde" : "ayush";
  const skillPool = isTech ? ROLES[lane]?.skills || [] : AYUSH_ROLE.skills;
  const stepIds = isProfessional
    ? ["role"]
    : isTech
      ? ["role", "track", "skills", "goal", "availability"]
      : ["role", "skills", "background", "goal", "availability"];
  const stepLabels = { role: "Role", track: "Track", skills: "Skills", background: "Background", goal: "Goal", availability: "Availability" };
  const current = step === "done" ? "done" : stepIds[step];

  function set(id, v) {
    setForm((p) => ({ ...p, [id]: v }));
  }

  function toggleSkill(s) {
    setSkills((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s].slice(0, 5)));
  }

  function saveAll(patch = {}) {
    const next = { ...form, skills: skills.join(", "), ...patch };
    // write a row this portal actually owns — the other side's fields are cleared.
    updateProfile(profileRowFor(next, track));
    setForm(next);
    return next;
  }

  function finish() {
    const row = saveAll();
    setRole(form.role);
    setStep("done");
    // signed-in devices mirror their portal identity; guests stay local-only.
    saveProfileRemote(user, { track, role: form.role, profile: row }).catch(() => {});
    // professional roles do not live in the student engine — send them to their desk.
    if (["industry", "faculty", "institute"].includes(form.role)) nav(dashboardFor(track, form.role));
  }

  function next() {
    setStep((s) => Math.min(s + 1, stepIds.length - 1));
  }

  // the pick-order rule: role first, then anything that depends on it.
  function pickRole(v) {
    set("role", v);
    setRole(v);
    if (["industry", "faculty", "institute"].includes(v)) {
      updateProfile({ role: v });
      nav(dashboardFor(track, v));
      return;
    }
    next();
  }

  function restart() {
    setStep(0);
  }

  const stepAnim = reduce
    ? {}
    : { initial: { opacity: 0, x: 24 }, animate: { opacity: 1, x: 0 }, transition: { duration: 0.18, ease: "easeOut" } };

  return (
    <Page
      title={step === "done" ? "Your profile" : "Set up your profile"}
      kicker={step === "done" ? "Identity" : "Setup · Who are you"}
      sub={
        step === "done"
          ? "This tunes your matches and quest order. Stored on this device only."
          : `${isTech ? "Tech" : "Vaidya"} portal · ${stepIds.length} quick questions. About a minute.`
      }
    >
      {step !== "done" && (
        <ol className="mb-5 flex items-center gap-2" aria-label="Setup progress">
          {stepIds.map((id, i) => (
            <li key={id} className="flex flex-1 items-center gap-2">
              <span className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-blurple" : "bg-stone-200"}`} aria-hidden />
              <span className="sr-only">{stepLabels[id]}{i <= step ? " done" : ""}</span>
            </li>
          ))}
        </ol>
      )}

      {current === "role" && (
        <motion.div key="role" {...stepAnim}>
        <Card>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-blurple-soft">Step {step + 1} of {stepIds.length}</p>
          <h2 className="mt-1 font-display text-xl font-bold text-stone-900">Who is using Avsar?</h2>
          <p className="mt-1 text-sm leading-6 text-stone-500">This decides the screens you get. You can change it later by editing your profile.</p>
          <div className="mt-4 space-y-2">
            {roleChoices.map((r) => (
              <OptionCard
                key={r}
                label={roleLabel(r)}
                hint={ROLE_HINTS[r]?.[track] || ROLE_HINTS[r]?.tech || ""}
                selected={form.role === r}
                onPick={() => pickRole(r)}
              />
            ))}
          </div>
        </Card>
        </motion.div>
      )}

      {current === "track" && (
        <motion.div key="track" {...stepAnim}>
        <Card>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-blurple-soft">Step {step + 1} of {stepIds.length}</p>
          <h2 className="mt-1 font-display text-xl font-bold text-stone-900">Which track are you aiming for?</h2>
          <p className="mt-1 text-sm leading-6 text-stone-500">This sets your scoring rubric, your quest tree, and the postings you see.</p>
          <div className="mt-4 space-y-2">
            {TECH_LANES.map((k) => (
              <OptionCard
                key={k}
                label={ROLES[k]?.label || k}
                hint={TECH_HINTS[k]}
                selected={form.track === k}
                onPick={() => {
                  set("track", k);
                  updateProfile({ track: k });
                  setSkills([]);
                  next();
                }}
              />
            ))}
          </div>
          <button type="button" onClick={() => setStep(0)} className="mt-4 text-sm font-medium text-stone-500 underline underline-offset-4 hover:text-emerald-800">
            Back
          </button>
        </Card>
        </motion.div>
      )}

      {current === "skills" && (
        <motion.div key="skills" {...stepAnim}>
        <Card>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-blurple-soft">Step {step + 1} of {stepIds.length}</p>
          <h2 className="mt-1 font-display text-xl font-bold text-stone-900">Which of these do you already have?</h2>
          <p className="mt-1 text-sm leading-6 text-stone-500">Tap up to 5. These decide which internships show as eligible.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {skillPool.map((s) => {
              const on = skills.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleSkill(s)}
                  aria-pressed={on}
                  className={`min-h-[40px] rounded-full border px-4 py-2 text-sm font-medium capitalize transition-all active:scale-[0.97] ${
                    on
                      ? "border-blurple bg-blurple text-white"
                      : "border-stone-200 bg-white text-stone-600 hover:border-zinc-500"
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <Btn disabled={skills.length === 0} onClick={() => { saveAll(); next(); }}>
              Continue{skills.length > 0 ? ` with ${skills.length}` : ""}
            </Btn>
            {!skills.length && <span className="text-xs text-stone-400">Pick at least one to continue</span>}
          </div>
        </Card>
        </motion.div>
      )}

      {current === "background" && (
        <motion.div key="background" {...stepAnim}>
        <Card>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-blurple-soft">Step {step + 1} of {stepIds.length}</p>
          <h2 className="mt-1 font-display text-xl font-bold text-stone-900">Where are you in AYUSH?</h2>
          <p className="mt-1 text-sm leading-6 text-stone-500">Year sets which postings you can touch. Lane sharpens research and industry matches.</p>
          <p className="mb-2 mt-4 text-sm font-semibold text-stone-700">BAMS year</p>
          <div className="flex flex-wrap gap-2">
            {YEARS.map((y) => {
              const on = form.year === y;
              return (
                <button
                  key={y}
                  type="button"
                  onClick={() => set("year", y)}
                  aria-pressed={on}
                  className={`min-h-[40px] rounded-full border px-4 py-2 text-sm font-medium transition-all active:scale-[0.97] ${
                    on
                      ? "border-blurple bg-blurple text-white"
                      : "border-stone-200 bg-white text-stone-600 hover:border-zinc-500"
                  }`}
                >
                  {y}
                </button>
              );
            })}
          </div>
          <p className="mb-2 mt-5 text-sm font-semibold text-stone-700">Which lane pulls you most?</p>
          <div className="space-y-2">
            {LANES.map((l) => (
              <OptionCard key={l.id} label={l.label} hint={l.hint} selected={form.lane === l.id} onPick={() => set("lane", l.id)} />
            ))}
          </div>
          <div className="mt-5">
            <label className="mb-1.5 block text-sm font-semibold text-stone-700" htmlFor="college">
              College <span className="font-normal text-stone-400">(optional, improves local matches)</span>
            </label>
            <input
              id="college"
              className={inputCls}
              value={form.college || ""}
              onChange={(e) => set("college", e.target.value)}
              placeholder="Govt. Ayurveda College, Patna"
            />
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Btn disabled={!form.year || !form.lane} onClick={() => { saveAll(); next(); }}>
              Continue
            </Btn>
            <button type="button" onClick={() => setStep((s) => s - 1)} className="text-sm font-medium text-stone-500 underline underline-offset-4 hover:text-emerald-800">
              Back
            </button>
            {(!form.year || !form.lane) && <span className="text-xs text-stone-400">Pick a year and a lane</span>}
          </div>
        </Card>
        </motion.div>
      )}

      {current === "goal" && (
        <motion.div key="goal" {...stepAnim}>
        <Card>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-blurple-soft">Step {step + 1} of {stepIds.length}</p>
          <h2 className="mt-1 font-display text-xl font-bold text-stone-900">What do you want most right now?</h2>
          <p className="mt-1 text-sm leading-6 text-stone-500">This picks your landing screen after setup.</p>
          <div className="mt-4 space-y-2">
            {GOALS.map((g) => (
              <OptionCard
                key={g.id}
                label={g.label}
                hint={g.hint}
                selected={form.goal === g.id}
                onPick={() => { set("goal", g.id); saveAll({ goal: g.id }); next(); }}
              />
            ))}
          </div>
          <button type="button" onClick={() => setStep((s) => s - 1)} className="mt-4 text-sm font-medium text-stone-500 underline underline-offset-4 hover:text-emerald-800">
            Back
          </button>
        </Card>
        </motion.div>
      )}

      {current === "availability" && (
        <motion.div key="availability" {...stepAnim}>
        <Card>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-blurple-soft">Step {step + 1} of {stepIds.length}</p>
          <h2 className="mt-1 font-display text-xl font-bold text-stone-900">Where, and how much time?</h2>
          <p className="mt-1 text-sm leading-6 text-stone-500">Filters the feed and sizes your weekly quests.</p>
          <p className="mb-2 mt-4 text-sm font-semibold text-stone-700">Where can you work?</p>
          <div className="space-y-2">
            {LOCS.map((l) => (
              <OptionCard key={l.id} label={l.label} hint={l.hint} selected={form.loc === l.id} onPick={() => set("loc", l.id)} />
            ))}
          </div>
          <p className="mb-2 mt-5 text-sm font-semibold text-stone-700">Hours per week?</p>
          <div className="space-y-2">
            {HOURS.map((h) => (
              <OptionCard key={h.id} label={h.label} hint={h.hint} selected={form.hours === h.id} onPick={() => set("hours", h.id)} />
            ))}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Btn disabled={!form.loc || !form.hours} onClick={finish}>
              Finish setup
            </Btn>
            <button type="button" onClick={() => setStep((s) => s - 1)} className="text-sm font-medium text-stone-500 underline underline-offset-4 hover:text-emerald-800">
              Back
            </button>
            {(!form.loc || !form.hours) && <span className="text-xs text-stone-400">Pick one in each group</span>}
          </div>
        </Card>
        </motion.div>
      )}

      {step === "done" && (
        <ProfileCard
          form={form}
          resume={resume}
          track={track}
          onEdit={restart}
          onClear={() => {
            if (window.confirm("Clear saved profile, resume, and interview answers?")) {
              resetOnboarding();
              clearProfileState();
              window.location.reload();
            }
          }}
        />
      )}

      <AccountCard
        user={user}
        role={role}
        track={track}
        authNotice={authNotice}
        onEditAnswers={restart}
        onClear={() => {
          resetOnboarding();
          clearProfileState();
          window.location.reload();
        }}
        onSignOut={signOutUser}
      />
    </Page>
  );
}
