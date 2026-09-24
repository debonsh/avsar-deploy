// App-wide state, one context. LocalStorage is the source of truth, Supabase
// is a best-effort mirror (works fully offline). Pages read the pure lib
// functions directly; only cross-page state lives here.
// Portal split: `track` decides theme/nav/seeds, `lane` is the scoring rubric
// derived from it, `role` is identity for the route guards (lib/rbac.js).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { loadJSON, saveJSON } from "../lib/storage.js";
import { loadRole, saveRole } from "../lib/roles.js";
import { loadTrack, saveTrack, laneFor } from "../lib/track.js";
import { loadProfile, saveProfile, clearProfile } from "../lib/profile.js";
import { getUser, onAuthChange, signOut, finishOAuthReturn } from "../lib/auth.js";
import {
  funnelCounts, loadJobEvents, recordJobEvent, saveAssessment,
  loadRemoteProfile, loadRemoteRoles, reconcileProfile, pickRole, saveProfileRemote, claimStudentRole,
} from "../lib/backend.js";
import { loadCustomJobs, saveCustomJob } from "../lib/store.js";

const AvsarContext = createContext(null);

const K_RESUME = "avsar-resume-v1";
// shares backend.js's avsar-job-events key: recordJobEvent mirrors there, so one
// list serves the pipeline, the dashboard, and the Supabase sync.
const K_EVENTS = "avsar-job-events";
const K_DISMISSED = "avsar-dismissed-v1";

export function AvsarProvider({ children }) {
  const [track, setTrackState] = useState(() => loadTrack());
  const [role, setRoleState] = useState(() => loadRole());
  const [profile, setProfileState] = useState(() => loadProfile());
  const [resume, setResumeState] = useState(() => loadJSON(K_RESUME, null));
  const [events, setEvents] = useState(() => loadJSON(K_EVENTS, []));
  const [dismissed, setDismissed] = useState(() => loadJSON(K_DISMISSED, []));
  const [customJobs, setCustomJobs] = useState(() => loadCustomJobs());
  const [user, setUser] = useState(null);
  // authReady flips once the first session read lands, so the auth gate can
  // hold a splash instead of flashing /login at a signed-in user on reload.
  const [authReady, setAuthReady] = useState(false);
  // authNotice carries a boot-time OAuth verdict ("Google sent us back but…")
  // to the Login page. Empty means nothing to report.
  const [authNotice, setAuthNotice] = useState("");
  const syncedFor = useRef(null);

  const setTrack = useCallback((v) => {
    setTrackState(v);
    saveTrack(v);
  }, []);

  const setRole = useCallback((v) => {
    setRoleState(v);
    saveRole(v);
  }, []);

  // profile is read by the matcher, the coach, and the lane — one writer, so
  // a page that saves answers re-renders every reader with the same numbers.
  const updateProfile = useCallback((patch = {}) => {
    const next = saveProfile({ ...(loadProfile() || {}), ...patch });
    setProfileState(next);
    return next;
  }, []);

  const clearProfileState = useCallback(() => {
    clearProfile();
    setProfileState(null);
  }, []);

  const saveResume = useCallback(
    (text, result, roleKey) => {
      const row = { text, result, roleKey, at: Date.now() };
      setResumeState(row);
      saveJSON(K_RESUME, row);
      saveAssessment({ role: roleKey, score: result.total, found: result.found, missing: result.missing }).catch(() => {});
    },
    []
  );

  const addEvent = useCallback(async (jobId, event) => {
    await recordJobEvent(jobId, event).catch(() => {});
    setEvents(loadJobEvents());
  }, []);

  const toggleDismiss = useCallback((id) => {
    setDismissed((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      saveJSON(K_DISMISSED, next);
      return next;
    });
  }, []);

  const addCustomJob = useCallback((job) => {
    saveCustomJob(job);
    setCustomJobs(loadCustomJobs());
  }, []);

  const signOutUser = useCallback(async () => {
    await signOut().catch(() => {});
    setUser(null);
  }, []);

  useEffect(() => {
    // Sign-in reconciles this device with the cloud row: adopt it when it is
    // newer (or this device is fresh), push ours when the cloud is behind.
    // Once per user per session — a token refresh must not re-run the merge.
    const sync = async (u) => {
      setUser(u);
      setAuthReady(true);
      if (!u?.id || syncedFor.current === u.id) return;
      syncedFor.current = u.id;
      // a role issued in user_roles outranks whatever this device guessed.
      const issued = pickRole(await loadRemoteRoles(u));
      if (issued) {
        setRoleState(issued);
        saveRole(issued);
      } else {
        // every signed-in account gets a ledger row; student is the only role a
        // browser may claim (RLS rejects the desk roles).
        claimStudentRole(u, loadTrack()).catch(() => {});
      }
      const remote = await loadRemoteProfile(u);
      const local = loadProfile();
      if (reconcileProfile(local, remote) === "adopt") {
        if (remote.track) {
          setTrackState(remote.track);
          saveTrack(remote.track);
        }
        setProfileState(saveProfile(remote.profile));
        if (!issued) {
          setRoleState(remote.role);
          saveRole(remote.role);
        }
        return;
      }
      if (local) {
        saveProfileRemote(u, { track: loadTrack(), role: issued || loadRole(), profile: local }).catch(() => {});
      }
    };
    getUser().then(sync).catch(() => {});
    // Resolve a Google return (?code= / ?error=) exactly once per load, so a
    // failed exchange surfaces as words instead of a silent bounce to /login.
    finishOAuthReturn()
      .then((msg) => {
        if (msg) setAuthNotice(msg);
      })
      .catch(() => {});
    return onAuthChange(sync);
  }, []);

  const funnel = useMemo(() => funnelCounts(events), [events]);
  const lane = useMemo(() => laneFor(track, profile), [track, profile]);

  const value = useMemo(
    () => ({
      track, setTrack, lane, role, setRole, profile, updateProfile, clearProfileState,
      resume, saveResume, events, addEvent, dismissed, toggleDismiss, customJobs,
      addCustomJob, funnel, user, authReady, authNotice, signOutUser,
    }),
    [
      track, setTrack, lane, role, setRole, profile, updateProfile, clearProfileState,
      resume, saveResume, events, addEvent, dismissed, toggleDismiss, customJobs,
      addCustomJob, funnel, user, authReady, authNotice, signOutUser,
    ]
  );
  return <AvsarContext.Provider value={value}>{children}</AvsarContext.Provider>;
}

// eslint-disable-next-line react/only-export-components -- hook must co-locate with its provider
export function useAvsar() {
  const v = useContext(AvsarContext);
  if (!v) throw new Error("useAvsar must be used inside AvsarProvider");
  return v;
}
