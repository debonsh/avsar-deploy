// Avsar shell: header nav, routes, footer. Every nav item is a real route.
// ONE shell, two portals: `track` picks the theme, the nav, and which engine a
// person lands on; `role` decides which route they may open (lib/rbac.js).
// Nav DNA: CoreUI navbar (brand left, nav cluster center, stat+avatar right) on
// desktop; Duolingo-style icon bottom tabs on mobile. One segmented control,
// one sliding pill, no hamburger.
import { useEffect, useState } from "react";
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router";
import CIcon from "@coreui/icons-react";
import {
  cilSpa, cilUser, cilSun, cilMoon, cilHamburgerMenu,
} from "@coreui/icons";
import { motion, useReducedMotion } from "motion/react";
import { useAvsar } from "./store.jsx";
import { calculateMainScore } from "../lib/score.js";
import { loadTheme, saveTheme, surfaceFor, floorFor } from "../lib/theme.js";
import { loadLang, saveLang, t } from "../lib/i18n.js";
import { canAccess, dashboardFor, isPublicPath, STUDENT_ROLES } from "../lib/rbac.js";
import { roleLabel } from "../lib/roles.js";
import { isSupabaseOn } from "../lib/supabase.js";
import { authGate } from "../lib/authgate.js";
import { primaryFor, secondaryGroupsFor, sheetGroupsFor, isSecondaryPath, labelKeyFor } from "../lib/nav.js";
import { DesktopMoreMenu, MobileMenuSheet, NAV_ICONS } from "./nav-menu.jsx";
import Jobs from "../pages/Jobs.jsx";
import Quests from "../pages/Quests.jsx";
import Quiz from "../pages/Quiz.jsx";
import Interview from "../pages/Interview.jsx";
import Institute from "../pages/Institute.jsx";
import Faculty from "../pages/Faculty.jsx";
import Portfolio from "../pages/Portfolio.jsx";
import Profile from "../pages/Profile.jsx";
import Journey from "../pages/Journey.jsx";
import Home from "../pages/Home.jsx";
import NotFound from "../pages/NotFound.jsx";
import Login from "../pages/Login.jsx";
import Industry from "../pages/Industry.jsx";
import Verify from "../pages/Verify.jsx";
import Ayush from "../pages/Ayush.jsx";
import Resume from "../pages/Resume.jsx";
import Match from "../pages/Match.jsx";
import Programs from "../pages/Programs.jsx";
import Workspace from "../pages/Workspace.jsx";
import Public from "../pages/Public.jsx";
import Welcome from "../pages/Welcome.jsx";
import { CoachWidget } from "./coach-widget.jsx";
import { RouteErrorBoundary } from "./error-boundary.jsx";

// Primary destinations per portal. The full IA (primaries, overflow groups,
// sheet map) lives in lib/nav.js — this shell only resolves icons + labels.
const DESK_ICON = { industry: "briefcase", faculty: "book", institute: "home" };

// professional roles get one desk of their own instead of the student engine.
const DESK = { industry: "/industry", faculty: "/faculty", institute: "/institute" };

// Readiness ring: the one number a student checks daily, always one tap from scoring.
// Reason it is a ring, not a pill: progress reads at a glance and costs less header width.
function ReadinessRing({ value, lang, isTech, light }) {
  const r = 9;
  const c = 2 * Math.PI * r;
  const frac = value === null ? 0 : Math.max(0, Math.min(100, value)) / 100;
  const label = value === null ? t(lang, "readiness.score") : `Readiness ${value} of 100`;
  const shell = isTech
    ? light ? "border-zinc-300 bg-white hover:border-blurple" : "border-zinc-800 bg-zinc-950 hover:border-blurple/60"
    : "border-emerald-200 bg-white hover:border-emerald-500";
  const track = isTech
    ? light ? "#e4e4e7" : "#27272a"
    : "#e7e0cd";
  const num = isTech
    ? light ? "text-zinc-900" : "text-zinc-200"
    : "text-emerald-900";
  const word = isTech
    ? light ? "text-zinc-600" : "text-zinc-300"
    : "text-emerald-900";
  return (
    <NavLink
      to="/resume"
      title={label}
      aria-label={`${label}. Open resume score.`}
      className={`group inline-flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 ${shell}`}
    >
      <span className="relative flex size-8 items-center justify-center">
        <svg width="32" height="32" viewBox="0 0 24 24" aria-hidden className="-rotate-90">
          <circle cx="12" cy="12" r={r} fill="none" stroke={track} strokeWidth="3" />
          <circle
            cx="12" cy="12" r={r} fill="none" stroke={isTech ? "#5865f2" : "#1e7a4c"} strokeWidth="3" strokeLinecap="round"
            strokeDasharray={`${(frac * c).toFixed(1)} ${c.toFixed(1)}`}
          />
        </svg>
        <span className={`absolute text-[10px] font-bold tabular-nums ${num}`}>
          {value === null ? "–" : value}
        </span>
      </span>
      <span className={`hidden text-xs font-semibold min-[400px]:inline ${word}`}>
        {value === null ? t(lang, "readiness.score") : t(lang, "readiness.ready")}
      </span>
    </NavLink>
  );
}

// Wordmark ink for the floor it sits on: white on a dark floor, dark ink on a
// light one. Ayush keeps its own emerald ink on both (the dark theme lifts it
// to mint in CSS), so only tech and the pre-portal landing flip.
function Brand({ isTech, onDark }) {
  return (
    <NavLink to="/" className="mr-1 inline-flex shrink-0 items-center gap-2" aria-label="Avsar home">
      {isTech ? (
        <span className="flex size-8 items-center justify-center bg-blurple font-display text-sm font-bold text-white">A</span>
      ) : (
        <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-700 text-white">
          <CIcon icon={cilSpa} width={18} height={18} />
        </span>
      )}
      <span className={`text-base font-bold tracking-tight ${isTech ? (onDark ? "text-zinc-50" : "text-zinc-900") : onDark ? "text-zinc-50" : "text-emerald-950"}`}>Avsar</span>
      <span className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] font-bold ${isTech ? "bg-blurple/15 text-blurple-soft" : "bg-amber-100 text-amber-800"}`}>
        SIH&rsquo;26
      </span>
    </NavLink>
  );
}

// A route a role may not open bounces to that role's own dashboard instead of 404.
function RequireRole({ path, children }) {
  const { role, track } = useAvsar();
  if (!canAccess(role, path)) return <Navigate to={dashboardFor(track, role)} replace />;
  return children;
}

export function Shell() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const { track, role, lane, resume, funnel, user, authReady, signOutUser } = useAvsar();
  const reduce = useReducedMotion();
  const [theme, setTheme] = useState(() => loadTheme());
  const [lang, setLang] = useState(() => loadLang());
  const [menuOpen, setMenuOpen] = useState(false);
  const isTech = track === "tech";
  const isAyush = track === "ayush";
  const onboarded = Boolean(track);
  // Tech is English-only: the Ayush portal is bilingual (EN/HI), the Tech
  // universe never shows Hindi. effLang is the one language the chrome reads.
  const effLang = isTech ? "en" : lang;
  const dark = theme === "dark";
  // No portal picked yet → the landing borrows the tech floor. It has no
  // universe of its own, but it must still be themed: unscoped it fell through
  // to the dark body and the toggle did nothing until a portal was picked.
  const techFloor = isTech || !onboarded;
  const techLight = techFloor && !dark;
  const surface = surfaceFor(track, theme);
  // readiness belongs to the resume that was scored, not to whoever is looking.
  const readiness = resume?.result
    ? calculateMainScore(resume.result.total, 0, 0, resume.roleKey || lane)
    : null;
  const activeCount = (funnel.saved || 0) + (funnel.applied || 0);
  const flipLang = () => {
    const next = lang === "hi" ? "en" : "hi";
    saveLang(next);
    setLang(next);
  };

  const isStudentFamily = STUDENT_ROLES.includes(role);
  // One IA, three surfaces: header pills, the desktop Menu panel, and the
  // mobile Menu sheet all read lib/nav.js, so a section can never exist on
  // desktop but go missing on mobile again.
  const segs = isStudentFamily
    ? primaryFor(track).map((s) => ({ ...s, label: t(effLang, labelKeyFor(s, track)), icon: NAV_ICONS[s.icon] }))
    : [{ to: DESK[role], label: roleLabel(role), icon: NAV_ICONS[DESK_ICON[role] || "briefcase"] }];
  const profileTab = { to: "/profile", label: t(effLang, "nav.profile"), icon: NAV_ICONS.user };
  const menuGroups = isStudentFamily ? secondaryGroupsFor(track) : [];
  const sheetGroups = isStudentFamily ? sheetGroupsFor(track) : [];
  const menuActive = isStudentFamily && isSecondaryPath(track, pathname);
  const roleText = roleLabel(role);
  // the menu's sign-in entry opens the full /login surface (email + Google).
  const handleSignIn = () => nav("/login");
  // one decision for the whole app: allow, bounce to /login, or hold a splash
  // while the cached session is being read (lib/authgate.js is the pure core).
  const gate = authGate({ supabaseOn: isSupabaseOn(), authReady, user, path: pathname });

  useEffect(() => {
    saveTheme(theme);
    // The body floor is the one the shell root's scope paints — the same
    // number, so no dark band shows under a light theme. Landing included.
    const bg = floorFor(track, theme);
    document.body.style.background = bg;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", bg);
  }, [theme, track]);

  // The Menu sheet is modal; a route change re-renders us anyway, so shut
  // it as a render-time adjustment instead of an effect.
  const [menuShutFor, setMenuShutFor] = useState(pathname);
  if (pathname !== menuShutFor) {
    setMenuShutFor(pathname);
    if (menuOpen) setMenuOpen(false);
  }

  // Static active pill: layoutId springs measure layout on every nav
  // change, which janks on weak GPUs. A plain fill reads the same.
  const pill = (active) =>
    active ? <span className={`absolute inset-0 rounded-full ${isTech ? "bg-blurple" : "bg-emerald-700"}`} /> : null;

  const guard = (path, element) => <RequireRole path={path}>{element}</RequireRole>;
  const headerCls = isAyush
    ? "app-header sticky top-0 z-30 border-b border-emerald-900/10 bg-[#f6f3ea]/90"
    : techLight
      ? "app-header sticky top-0 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur"
      : "app-header sticky top-0 z-30 border-b border-zinc-800/80 bg-ink/85 backdrop-blur";
  const navShellCls = isTech
    ? techLight ? "border-zinc-200 bg-zinc-100" : "border-zinc-800 bg-zinc-950"
    : "border-emerald-900/10 bg-white";
  const iconBtnCls = !techFloor
    ? "border-stone-200 bg-white text-stone-500 hover:border-emerald-400 hover:text-emerald-800"
    : techLight
      ? "border-zinc-300 bg-white text-zinc-500 hover:border-blurple hover:text-zinc-900"
      : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-blurple/60 hover:text-zinc-100";

  return (
    <div
      className={`${surface} flex min-h-dvh flex-col ${dark ? "bg-ink text-zinc-300" : ""}`}
      data-track={track || "none"}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:m-2 focus:rounded focus:bg-zinc-950 focus:p-2"
      >
        {t(effLang, "nav.skip")}
      </a>
      <header className={headerCls}>
        {!isTech && <div className="h-0.5 bg-gradient-to-r from-emerald-800 via-emerald-500 to-amber-400" aria-hidden />}
        <div className="mx-auto flex w-full max-w-5xl items-center gap-2 px-4 py-2 sm:px-6">
          <Brand isTech={isTech} onDark={!isAyush && dark} />
          {onboarded && (
            <nav aria-label="Primary" className={`mx-auto hidden items-center gap-0.5 rounded-full border p-1 shadow-sm sm:flex ${navShellCls}`}>
              {segs.map((s) => (
                <NavLink
                  key={s.to}
                  to={s.to}
                  className={({ isActive }) =>
                    `relative inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                      isActive ? "text-white" : isTech ? (techLight ? "text-zinc-500 hover:text-zinc-900" : "text-zinc-400 hover:text-zinc-100") : "text-stone-500 hover:text-emerald-900"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {pill(isActive)}
                      <span className="relative flex items-center gap-1.5">
                        {s.icon && <CIcon icon={s.icon} width={15} height={15} aria-hidden />}
                        {s.label}
                        {s.to === "/jobs" && activeCount > 0 && (
                          <span className={`flex min-h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums ${
                            isTech ? "bg-blurple text-white" : "bg-amber-400 text-emerald-950"
                          }`}>
                            {activeCount}
                          </span>
                        )}
                      </span>
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          )}
          <div className="ml-auto flex items-center gap-1.5 sm:ml-0">
            {!isTech && onboarded && (
            <button
              type="button"
              onClick={flipLang}
              aria-label={t(effLang, "lang.switch")}
              title={t(effLang, "lang.switch")}
              className={`flex h-10 min-w-10 items-center justify-center rounded-full border px-2 font-mono text-xs font-bold transition-colors ${iconBtnCls}`}
            >
              {effLang === "hi" ? "EN" : "हि"}
            </button>
            )}
            <button
              type="button"
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              aria-label={theme === "dark" ? t(effLang, "theme.toLight") : t(effLang, "theme.toDark")}
              title={theme === "dark" ? t(effLang, "theme.toLight") : t(effLang, "theme.toDark")}
              className={`flex size-10 items-center justify-center rounded-full border transition-colors ${iconBtnCls}`}
            >
              <CIcon icon={theme === "dark" ? cilSun : cilMoon} width={17} height={17} />
            </button>
            {onboarded && isStudentFamily && (
              <DesktopMoreMenu
                lang={effLang}
                track={track}
                isTech={isTech}
                techLight={techLight}
                groups={menuGroups}
                menuActive={menuActive}
                user={user}
                roleText={roleText}
                onSignOut={signOutUser}
                onSignIn={handleSignIn}
              />
            )}
            {onboarded && isStudentFamily && <ReadinessRing value={readiness} lang={effLang} isTech={isTech} light={techLight} />}
            {onboarded && (
              <NavLink
                to={isStudentFamily ? "/profile" : DESK[role]}
                aria-label={user ? `Profile, signed in as ${user.email}` : "Open profile"}
                className={({ isActive }) =>
                  `relative flex size-10 items-center justify-center rounded-full border transition-colors ${
                    isActive
                      ? isTech ? "border-blurple bg-blurple text-white" : "border-emerald-700 bg-emerald-700 text-white"
                      : iconBtnCls
                  }`
                }
              >
                {user ? (
                  <span className="text-sm font-bold uppercase" aria-hidden>
                    {(user.email || "V")[0]}
                  </span>
                ) : (
                  <CIcon icon={cilUser} width={18} height={18} />
                )}
                {user && (
                  <span className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 ${isTech ? (techLight ? "border-white bg-blurple" : "border-[#06060b] bg-blurple") : "border-[#f6f3ea] bg-emerald-500"}`} aria-hidden />
                )}
              </NavLink>
            )}
          </div>
        </div>
      </header>

      <main id="main" className="flex-1 pb-24 sm:pb-0">
        <RouteErrorBoundary path={pathname}>
          <motion.div
            key={pathname}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
          >
          {gate === "wait" ? (
            <div className="flex min-h-[40vh] items-center justify-center" role="status">
              <span className="font-mono text-xs uppercase tracking-widest text-zinc-500">restoring session…</span>
            </div>
          ) : gate === "login" ? (
            <Navigate to="/login" replace />
          ) : !onboarded && !isPublicPath(pathname) ? (
            <Navigate to="/" replace />
          ) : (
          <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/resume" element={guard("/resume", <Resume />)} />
          <Route path="/jobs" element={guard("/jobs", <Jobs />)} />
          <Route path="/quests" element={guard("/quests", <Quests />)} />
          <Route path="/quiz" element={guard("/quiz", <Quiz />)} />
          <Route path="/interview" element={guard("/interview", <Interview />)} />
          <Route path="/portfolio" element={guard("/portfolio", <Portfolio />)} />
          <Route path="/institute" element={guard("/institute", <Institute />)} />
          <Route path="/faculty" element={guard("/faculty", <Faculty />)} />
          <Route path="/profile" element={guard("/profile", <Profile />)} />
          <Route path="/journey" element={guard("/journey", <Journey />)} />
          <Route path="/home" element={guard("/home", <Home />)} />
          <Route path="/industry" element={guard("/industry", <Industry />)} />
          <Route path="/verify/:code" element={<Verify />} />
          <Route path="/ayush" element={guard("/ayush", <Ayush />)} />
          <Route path="/match" element={guard("/match", <Match />)} />
          <Route path="/programs" element={guard("/programs", <Programs />)} />
          <Route path="/workspace" element={guard("/workspace", <Workspace />)} />
          <Route path="/workspace/:jobId" element={guard("/workspace", <Workspace />)} />
          <Route path="/u/:id" element={<Public />} />
          <Route path="*" element={<NotFound />} />
          </Routes>
          )}
          </motion.div>
        </RouteErrorBoundary>
      </main>

      {onboarded && (
      <footer className={`border-t ${isTech ? (techLight ? "border-zinc-200" : "border-zinc-800") : "border-emerald-900/10"}`}>
        <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
          {/* brand row */}
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
            <p className={`flex items-center gap-1.5 text-sm font-semibold ${isTech ? (techLight ? "text-zinc-900" : "text-zinc-100") : "text-emerald-950"}`}>
              {!isTech && <CIcon icon={cilSpa} width={15} height={15} aria-hidden />} Avsar
            </p>
            <p className={`max-w-xs text-xs leading-5 ${isTech ? (techLight ? "text-zinc-500" : "text-zinc-500") : "text-stone-400"}`}>
              {isTech
                ? "Score your resume, close skill gaps, track applications. Works offline, syncs to Supabase when configured."
                : t(effLang, "footer.tag")}
            </p>
          </div>
          {/* the loop, always visible: score, quest, prove, apply, showcase.
              The strip judges asked for: where to go, in order, from anywhere. */}
          {isStudentFamily && (
            <div className="mt-4">
              <p className={`font-mono text-[10px] uppercase tracking-widest ${isTech ? "text-zinc-500" : "text-stone-400"}`}>
                {t(effLang, "firstrun.title")}
              </p>
              <nav aria-label={t(effLang, "firstrun.title")} className="mt-2 flex flex-wrap items-center gap-1.5">
                {[
                  { to: "/resume", label: t(effLang, "loop.resume") },
                  { to: "/quests", label: t(effLang, "loop.quests") },
                  { to: "/interview", label: t(effLang, "loop.interview") },
                  { to: "/jobs", label: isTech ? t(effLang, "nav.jobs") : t(effLang, "nav.internships") },
                  { to: "/portfolio", label: t(effLang, "more.portfolio") },
                ].map((l, i, arr) => (
                  <span key={l.to} className="flex items-center gap-1.5">
                    <NavLink
                      to={l.to}
                      className={isTech
                        ? techLight ? "rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600 transition-colors hover:border-blurple hover:text-zinc-900" : "rounded-full border border-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-400 transition-colors hover:border-blurple/60 hover:text-zinc-100"
                        : "rounded-full border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-500 transition-colors hover:border-emerald-400 hover:text-emerald-800"}
                    >
                      {l.label}
                    </NavLink>
                    {i < arr.length - 1 && (
                      <span aria-hidden className={isTech ? "text-zinc-600" : "text-stone-300"}>→</span>
                    )}
                  </span>
                ))}
              </nav>
            </div>
          )}
          {/* link table: two columns side by side */}
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-[1fr_1fr_1fr] sm:gap-x-10">
            <nav aria-label="Product">
              <p className={`text-[10px] font-semibold uppercase tracking-wide ${isTech ? "text-zinc-500" : "text-stone-400"}`}>
                {isTech ? "Product" : t(effLang, "footer.upskill")}
              </p>
              <ul className="mt-1.5 space-y-1 text-[13px]">
                {(isTech
                  ? [["/resume", "Resume"], ["/quests", "Quests"], ["/quiz", "Quiz"], ["/interview", "Interview prep"]]
                  : [["/resume", "Resume score"], ["/quests", "Quests"], ["/quiz", "Quiz"], ["/interview", "Interview prep"]]
                ).map(([to, label]) => (
                  <li key={to}>
                    <NavLink to={to} className={isTech ? (techLight ? "text-zinc-600 hover:text-zinc-900" : "text-zinc-400 hover:text-zinc-100") : "text-stone-500 hover:text-emerald-800"}>{label}</NavLink>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label="Resources">
              <p className={`text-[10px] font-semibold uppercase tracking-wide ${isTech ? "text-zinc-500" : "text-stone-400"}`}>
                {isTech ? "Resources" : t(effLang, "footer.career")}
              </p>
              <ul className="mt-1.5 space-y-1 text-[13px]">
                {(isTech
                  ? [["/jobs", "Jobs"], ["/portfolio", "Portfolio"], ["/match", "How we match"], ["/profile", "Profile"]]
                  : [["/jobs", "Internships & jobs"], ["/portfolio", "Portfolio"], ["/institute", "Institute"], ["/industry", "For hospitals"], ["/profile", "Profile"]]
                ).map(([to, label]) => (
                  <li key={to}>
                    <NavLink to={to} className={isTech ? (techLight ? "text-zinc-600 hover:text-zinc-900" : "text-zinc-400 hover:text-zinc-100") : "text-stone-500 hover:text-emerald-800"}>{label}</NavLink>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      </footer>
      )}

      {/* mobile bottom tabs: primaries plus a Menu tab that opens the full
          sheet. The profile tab used to sit here, but the header avatar
          already opens it — the fifth slot now reaches every section. */}
      {onboarded && (
      <nav aria-label="Mobile" className={`app-tabbar fixed inset-x-0 bottom-0 z-30 border-t pb-[env(safe-area-inset-bottom)] sm:hidden ${
        isTech ? (techLight ? "border-zinc-200 bg-white/95" : "border-zinc-800 bg-ink/95") : "border-emerald-900/10 bg-[#f6f3ea]/95"
      }`}>
        <div className={`grid px-2 ${isStudentFamily ? "grid-cols-5" : "grid-cols-2"}`}>
          {segs.map((s) => (
            <NavLink
              key={s.to}
              to={s.to}
              className={({ isActive }) =>
                `relative flex min-h-[60px] flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-semibold transition-colors ${
                  isActive ? (isTech ? "text-blurple-soft" : "text-emerald-800") : isTech ? (techLight ? "text-zinc-400" : "text-zinc-500") : "text-stone-400"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className={`absolute left-1/2 top-0 h-1 w-8 -translate-x-1/2 rounded-b-full ${isTech ? "bg-blurple" : "bg-emerald-600"}`} />
                  )}
                  <span className="relative">
                    <CIcon icon={s.icon} width={21} height={21} aria-hidden />
                    {s.to === "/jobs" && activeCount > 0 && (
                      <span className={`absolute -right-2 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[9px] font-bold tabular-nums text-white ${isTech ? "bg-blurple" : "bg-amber-500"}`}>
                        {activeCount}
                      </span>
                    )}
                  </span>
                  {s.label}
                </>
              )}
            </NavLink>
          ))}
          {isStudentFamily ? (
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              aria-label={`${t(effLang, "nav.menu")}. ${t(effLang, "nav.allSections")}.`}
              className={`relative flex min-h-[60px] flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-semibold transition-colors ${
                menuActive || menuOpen ? (isTech ? "text-blurple-soft" : "text-emerald-800") : isTech ? (techLight ? "text-zinc-400" : "text-zinc-500") : "text-stone-400"
              }`}
            >
              {(menuActive || menuOpen) && (
                <span className={`absolute left-1/2 top-0 h-1 w-8 -translate-x-1/2 rounded-b-full ${isTech ? "bg-blurple" : "bg-emerald-600"}`} aria-hidden />
              )}
              <span className="relative">
                <CIcon icon={cilHamburgerMenu} width={21} height={21} aria-hidden />
                {menuActive && (
                  <span className={`absolute -right-1.5 -top-1 size-2.5 rounded-full ${isTech ? "bg-blurple" : "bg-emerald-600"}`} aria-hidden />
                )}
              </span>
              {t(effLang, "nav.menu")}
            </button>
          ) : (
            <NavLink
              key={profileTab.to}
              to={profileTab.to}
              className={({ isActive }) =>
                `relative flex min-h-[60px] flex-col items-center justify-center gap-0.5 rounded-xl text-[10px] font-semibold transition-colors ${
                  isActive ? (isTech ? "text-blurple-soft" : "text-emerald-800") : isTech ? (techLight ? "text-zinc-400" : "text-zinc-500") : "text-stone-400"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className={`absolute left-1/2 top-0 h-1 w-8 -translate-x-1/2 rounded-b-full ${isTech ? "bg-blurple" : "bg-emerald-600"}`} />
                  )}
                  <span className="relative">
                    <CIcon icon={profileTab.icon} width={21} height={21} aria-hidden />
                  </span>
                  {profileTab.label}
                </>
              )}
            </NavLink>
          )}
        </div>
      </nav>
      )}
      {onboarded && isStudentFamily && (
        <MobileMenuSheet
          open={menuOpen}
          onClose={() => setMenuOpen(false)}
          lang={effLang}
          track={track}
          isTech={isTech}
          techLight={techLight}
          groups={sheetGroups}
          user={user}
          roleText={roleText}
          onSignOut={signOutUser}
          onSignIn={handleSignIn}
        />
      )}
      <CoachWidget />
    </div>
  );
}
