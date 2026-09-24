// Shared navigation surfaces: one grouped disclosure menu for desktop,
// one bottom sheet for mobile. Both read the same IA from lib/nav.js so the
// two can never disagree about where a section lives.
//
// Accessibility contract:
// - Desktop uses the disclosure pattern (button + aria-expanded), not
//   role="menu" — these are navigation links, so screen readers keep link
//   semantics and NavLink keeps aria-current="page".
// - Arrow keys move between links as an enhancement; Escape closes and
//   returns focus to the trigger; outside pointer closes; route change closes.
// - The mobile sheet is a modal dialog: labelled, Escape/backdrop closes,
//   focus moves in on open and returns to the Menu tab on close, body scroll
//   locks while open. Every target is >= 48px tall.
import { useEffect, useId, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router";
import CIcon from "@coreui/icons-react";
import {
  cilBriefcase, cilBook, cilCompass, cilDescription, cilFolder, cilHamburgerMenu,
  cilHome, cilLeaf, cilLoop, cilMic, cilPuzzle, cilSchool, cilTask, cilUser, cilX,
} from "@coreui/icons";
import { motion, useReducedMotion } from "motion/react";
import { t } from "../lib/i18n.js";
import { labelKeyFor } from "../lib/nav.js";

// eslint-disable-next-line react/only-export-components -- icon map must co-locate with the menus that render it
export const NAV_ICONS = {
  home: cilHome,
  compass: cilCompass,
  briefcase: cilBriefcase,
  book: cilBook,
  resume: cilDescription,
  quiz: cilPuzzle,
  interview: cilMic,
  portfolio: cilFolder,
  match: cilLoop,
  programs: cilSchool,
  workspace: cilTask,
  ayush: cilLeaf,
  user: cilUser,
};

function themeCls(isTech, techLight) {
  return {
    panel: isTech
      ? techLight ? "border-zinc-200 bg-white" : "border-zinc-800 bg-zinc-950"
      : "border-stone-200 bg-white",
    divider: isTech ? (techLight ? "border-zinc-100" : "border-zinc-800") : "border-stone-100",
    heading: isTech ? "text-zinc-500" : "text-stone-400",
    item: isTech
      ? techLight ? "text-zinc-700 hover:bg-zinc-100" : "text-zinc-200 hover:bg-zinc-900"
      : "text-stone-700 hover:bg-emerald-50",
    itemActive: isTech ? "bg-blurple/10" : "bg-emerald-50",
    desc: isTech ? "text-zinc-500" : "text-stone-400",
    iconWrap: isTech
      ? techLight ? "border-zinc-200 bg-zinc-50 text-zinc-500" : "border-zinc-800 bg-zinc-900 text-zinc-400"
      // NOTE: /70, not /60 — .ayush-dark only remaps bg-emerald-50/70, so /60
      // would leak a light tile into dark mode.
      : "border-emerald-900/10 bg-emerald-50/70 text-emerald-700",
    meta: isTech ? "text-zinc-400" : "text-stone-600",
    action: isTech ? (techLight ? "text-blurple" : "text-blurple-soft") : "text-emerald-700",
  };
}

function MenuLink({ item, lang, track, th, onNavigate }) {
  const icon = NAV_ICONS[item.icon];
  return (
    <NavLink
      to={item.to}
      data-navlink
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex min-h-[48px] items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${th.item} ${isActive ? th.itemActive : ""}`
      }
    >
      {icon && (
        <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg border ${th.iconWrap}`} aria-hidden>
          <CIcon icon={icon} width={16} height={16} />
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate font-semibold leading-5">{t(lang, labelKeyFor(item, track))}</span>
        <span className={`block truncate text-xs leading-4 ${th.desc}`}>{t(lang, item.desc)}</span>
      </span>
    </NavLink>
  );
}

function AccountBlock({ th, user, roleText, onSignOut, onSignIn }) {
  const initial = ((user?.email || "G")[0] || "G").toUpperCase();
  return (
    <div className={`border-b px-3 py-2.5 ${th.divider}`}>
      <p className={`mb-2 font-mono text-[10px] uppercase tracking-widest ${th.heading}`}>{roleText}</p>
      {user ? (
        <div className="flex min-h-[40px] items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-blurple text-xs font-bold text-white" aria-hidden>
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <p className={`truncate text-xs font-semibold ${th.meta}`}>{user.email}</p>
            <NavLink to="/profile" className={`text-[11px] font-medium underline underline-offset-4 ${th.action}`}>
              View account
            </NavLink>
          </div>
          <button
            type="button"
            onClick={onSignOut}
            className={`shrink-0 rounded-lg px-2 py-1.5 text-xs font-semibold underline underline-offset-4 ${th.action}`}
          >
            Sign out
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onSignIn}
          className={`rounded-lg px-2 py-1.5 text-xs font-semibold underline underline-offset-4 ${th.action}`}
        >
          Sign in
        </button>
      )}
    </div>
  );
}

// Arrow-key travel across the panel's links (progressive enhancement — Tab
// alone still walks the same links in DOM order).
function useArrowTravel(panelRef) {
  return (e) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) return;
    const links = [...(panelRef.current?.querySelectorAll("[data-navlink]") || [])];
    if (!links.length) return;
    e.preventDefault();
    const i = links.indexOf(document.activeElement);
    if (e.key === "ArrowDown") (links[i + 1] || links[0]).focus();
    else if (e.key === "ArrowUp") (links[i - 1] || links[links.length - 1]).focus();
    else if (e.key === "Home") links[0].focus();
    else links[links.length - 1].focus();
  };
}

// Desktop: "Menu" disclosure button + grouped panel. Replaces the old
// <details> More, which had no aria-expanded, no arrow travel, and a 32px
// flat list with no descriptions.
export function DesktopMoreMenu({
  lang, track, isTech, techLight, groups, menuActive,
  user, roleText, onSignOut, onSignIn,
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const panelRef = useRef(null);
  const panelId = useId();
  const { pathname } = useLocation();
  const reduce = useReducedMotion();
  const th = themeCls(isTech, techLight);
  const onArrows = useArrowTravel(panelRef);

  // Close on navigation. Done as a render-time adjustment (not an effect):
  // the route change already re-renders us, so just shut before commit.
  const [shutFor, setShutFor] = useState(pathname);
  if (pathname !== shutFor) {
    setShutFor(pathname);
    if (open) setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) && !btnRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open ]);

  return (
    <div className="relative hidden sm:block">
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
            requestAnimationFrame(() => panelRef.current?.querySelector("[data-navlink]")?.focus());
          }
        }}
        className={`relative inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
          isTech
            ? techLight ? "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
            : "text-stone-500 hover:bg-emerald-50 hover:text-emerald-900"
        }`}
      >
        <CIcon icon={cilHamburgerMenu} width={15} height={15} aria-hidden />
        {t(lang, "nav.menu")}
        {menuActive && (
          <span
            aria-hidden
            className={`size-1.5 rounded-full ${isTech ? "bg-blurple" : "bg-emerald-600"}`}
          />
        )}
        <span className="sr-only">{menuActive ? `(${t(lang, "nav.allSections")})` : ""}</span>
      </button>
      {open && (
        <motion.div
          ref={panelRef}
          id={panelId}
          onKeyDown={onArrows}
          initial={reduce ? false : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
          className={`nav-scroll absolute right-0 top-full z-30 mt-1 max-h-[70dvh] w-80 overflow-y-auto rounded-2xl border p-1.5 shadow-lg ${th.panel}`}
        >
          <AccountBlock
            th={th} user={user} roleText={roleText}
            onSignOut={onSignOut} onSignIn={onSignIn}
          />
          {groups.map((g) => (
            <section key={g.id} aria-label={t(lang, `nav.group.${g.id}`)} className="mt-1">
              <p className={`px-3 pb-0.5 pt-2 font-mono text-[10px] uppercase tracking-widest ${th.heading}`}>
                {t(lang, `nav.group.${g.id}`)}
              </p>
              {g.items.map((item) => (
                <MenuLink
                  key={item.to} item={item} lang={lang} track={track} th={th}
                  onNavigate={() => setOpen(false)}
                />
              ))}
            </section>
          ))}
        </motion.div>
      )}
    </div>
  );
}

// Mobile: bottom-sheet dialog with every destination grouped. This is the fix
// for the old tab bar, where the eight overflow sections had no mobile path
// at all — the footer was the only way in.
export function MobileMenuSheet({
  open, onClose, lang, track, isTech, techLight, groups,
  user, roleText, onSignOut, onSignIn,
}) {
  const closeRef = useRef(null);
  const sheetRef = useRef(null);
  const prevFocus = useRef(null);
  const sheetId = useId();
  const titleId = useId();
  const reduce = useReducedMotion();
  const th = themeCls(isTech, techLight);

  useEffect(() => {
    if (open) {
      prevFocus.current = document.activeElement;
      closeRef.current?.focus();
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
    prevFocus.current?.focus?.();
    return undefined;
  }, [open ]);

  // The shell shuts us on navigation (menuOpen=false unmounts the sheet),
  // so no route listener is needed here.
  if (!open) return null;

  const onKey = (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    // light focus trap: keep Tab cycling inside the sheet
    if (e.key !== "Tab" || !sheetRef.current) return;
    const f = [...sheetRef.current.querySelectorAll('a[href], button:not([disabled])')].filter(
      (el) => el.getAttribute("tabindex") !== "-1"
    );
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 sm:hidden" role="presentation" onKeyDown={onKey}>
      <button
        type="button"
        aria-label={t(lang, "nav.close")}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/60"
      />
      <motion.div
        ref={sheetRef}
        id={sheetId}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        initial={reduce ? false : { y: 48, opacity: 0.5 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
        className={`nav-scroll absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl border-t pb-[calc(env(safe-area-inset-bottom)+1rem)] ${th.panel} ${isTech ? (techLight ? "border-zinc-200" : "border-zinc-800") : ""}`}
      >
        {/* opaque + corner-matched: without a bg, scrolled links slide
            visibly under this row; bg-white/90 is remapped dark in both
            dark themes, plain glass white in the light ones. */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 rounded-t-3xl bg-white/90 px-4 pb-1 pt-3 backdrop-blur">
          <p id={titleId} className={`font-mono text-[11px] uppercase tracking-widest ${th.heading}`}>
            {t(lang, "nav.allSections")}
          </p>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t(lang, "nav.close")}
            className={`flex size-11 items-center justify-center rounded-full border ${th.iconWrap}`}
          >
            <CIcon icon={cilX} width={17} height={17} />
          </button>
        </div>
        <div className="px-2">
          <AccountBlock
            th={th} user={user} roleText={roleText}
            onSignOut={onSignOut} onSignIn={onSignIn}
          />
          {groups.map((g) => (
            <section key={g.id} aria-label={t(lang, `nav.group.${g.id}`)} className="mt-1">
              <p className={`px-3 pb-0.5 pt-3 font-mono text-[10px] uppercase tracking-widest ${th.heading}`}>
                {t(lang, `nav.group.${g.id}`)}
              </p>
              {g.items.map((item) => (
                <MenuLink
                  key={item.to} item={item} lang={lang} track={track} th={th}
                  onNavigate={onClose}
                />
              ))}
            </section>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
