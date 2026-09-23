// node --test: portal track is the onboarding gate. Unset device ≠ ayush or tech,
// it means "not onboarded", so the shell can force the chooser at /.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadTrack, saveTrack, clearTrack, laneFor, targetRoleFor, profileMatchesTrack, TECH_LANES } from "../src/lib/track.js";

function withStore(init = {}) {
  const store = { ...init };
  globalThis.localStorage = {
    removeItem: (k) => { delete store[k]; },
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = String(v); },
  };
  return store;
}

describe("track: the chosen portal persists", () => {
  it("a fresh device is not onboarded", () => {
    withStore();
    assert.equal(loadTrack(), null);
    delete globalThis.localStorage;
  });

  it("a saved track round-trips", () => {
    const store = withStore();
    assert.equal(saveTrack("tech"), true);
    assert.equal(loadTrack(), "tech");
    assert.equal(store["avsar-track"], "tech");
    delete globalThis.localStorage;
  });

  it("junk never becomes a track, and clearing leaves nothing behind", () => {
    const store = withStore();
    saveTrack("mars");
    assert.equal(loadTrack(), null);
    saveTrack("ayush");
    clearTrack();
    assert.equal(loadTrack(), null);
    assert.equal("avsar-track" in store, false);
    delete globalThis.localStorage;
  });
});

describe("lane: the track picks the scoring rubric", () => {
  it("ayush portal always scores as ayush", () => {
    assert.equal(laneFor("ayush", { track: "sde" }), "ayush");
    assert.equal(laneFor("ayush", {}), "ayush");
  });

  it("tech portal uses the profile's lane, defaulting to sde", () => {
    assert.equal(laneFor("tech", { track: "data" }), "data");
    assert.equal(laneFor("tech", { track: "govt" }), "govt");
    assert.equal(laneFor("tech", {}), "sde");
  });

  it("a lane from the other portal never leaks across", () => {
    assert.equal(laneFor("tech", { track: "clinical" }), "sde");
    assert.equal(laneFor("tech", { track: "ayush" }), "sde");
  });

  it("no onboarding means no lane", () => {
    assert.equal(laneFor(null, { track: "sde" }), null);
  });

  it("tech lanes are exactly the non-ayush rubrics", () => {
    assert.deepEqual(TECH_LANES, ["sde", "data", "marketing", "govt"]);
  });
});

describe("every lane has a taxonomy role to score against", () => {
  it("tech lanes land on the matching taxonomy role", () => {
    assert.deepEqual(TECH_LANES.map(targetRoleFor), ["sde", "data-analyst", "marketing-associate", "govt-exams"]);
  });

  it("ayush is the default, and so is anything unrecognized", () => {
    assert.equal(targetRoleFor("ayush"), "ayush-cra");
    assert.equal(targetRoleFor("nope"), "ayush-cra");
    assert.equal(targetRoleFor(null), "ayush-cra");
  });
});

describe("a profile only satisfies the portal it was written for", () => {
  const ayush = { track: "ayush", skills: "dravyaguna", year: "3rd year", lane: "clinical", goal: "internship", loc: "remote", hours: "5-8" };
  const tech = { track: "data", skills: "python", goal: "internship", loc: "remote", hours: "5-8" };

  it("each portal claims its own answers", () => {
    assert.equal(profileMatchesTrack(ayush, "ayush"), true);
    assert.equal(profileMatchesTrack(tech, "tech"), true);
  });

  it("switching portals re-asks instead of showing the other side's card", () => {
    assert.equal(profileMatchesTrack(ayush, "tech"), false);
    assert.equal(profileMatchesTrack(tech, "ayush"), false);
  });

  it("legacy single-track rows (no track field) belong to ayush, and nothing matches nothing", () => {
    assert.equal(profileMatchesTrack({ skills: "dravyaguna" }, "ayush"), true);
    assert.equal(profileMatchesTrack({ skills: "dravyaguna" }, "tech"), false);
    assert.equal(profileMatchesTrack(null, "ayush"), false);
    assert.equal(profileMatchesTrack(undefined, "tech"), false);
  });
});
