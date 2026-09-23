// node --test: route guard logic. Rendering is shell.jsx's job; this file only
// answers "may this role open this route, and where does that role land".
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { rolesForRoute, canAccess, dashboardFor, isPublicPath, STUDENT_ROLES } from "../src/lib/rbac.js";

describe("rbac: who may open which route", () => {
  it("the student engine belongs to student and ayush", () => {
    assert.deepEqual(STUDENT_ROLES, ["student", "ayush"]);
    for (const p of ["/home", "/journey", "/resume", "/jobs", "/quests", "/quiz", "/interview", "/portfolio", "/match", "/programs", "/workspace/:jobId", "/ayush"]) {
      assert.deepEqual(rolesForRoute(p), STUDENT_ROLES, p);
      assert.equal(canAccess("student", p), true, p);
      assert.equal(canAccess("ayush", p), true, p);
    }
  });

  it("profile is identity, not engine: every role opens it, so no desk traps anyone", () => {
    for (const r of ["student", "ayush", "industry", "faculty", "institute"]) {
      assert.equal(canAccess(r, "/profile"), true, r);
    }
  });

  it("each professional desk is locked to its own role", () => {
    assert.equal(canAccess("industry", "/industry"), true);
    assert.equal(canAccess("industry", "/faculty"), false);
    assert.equal(canAccess("industry", "/institute"), false);
    assert.equal(canAccess("faculty", "/faculty"), true);
    assert.equal(canAccess("institute", "/institute"), true);
    assert.equal(canAccess("student", "/faculty"), false);
    assert.equal(canAccess("ayush", "/industry"), false);
  });

  it("share, verify, and the chooser stay public", () => {
    for (const p of ["/", "/u/:id", "/verify/:code"]) {
      for (const r of ["student", "ayush", "industry", "faculty", "institute"]) {
        assert.equal(canAccess(r, p), true, `${r} → ${p}`);
      }
    }
  });

  it("an unknown or missing role is treated as a student, never elevated", () => {
    assert.equal(canAccess(null, "/home"), true);
    assert.equal(canAccess("supplier", "/home"), true);
    assert.equal(canAccess(null, "/industry"), false);
  });
});

describe("rbac: which routes survive without onboarding", () => {
  it("the chooser, share links, and verify links render before a portal is picked", () => {
    for (const p of ["/", "/u/avsar-abc123", "/verify/deadbeef"]) assert.equal(isPublicPath(p), true, p);
  });

  it("every portal route needs a portal", () => {
    for (const p of ["/home", "/resume", "/jobs", "/quests", "/quiz", "/profile", "/industry", "/faculty", "/institute"]) {
      assert.equal(isPublicPath(p), false, p);
    }
  });
});

describe("rbac: where each role lands", () => {
  it("professional roles land on their own desk", () => {
    assert.equal(dashboardFor("tech", "industry"), "/industry");
    assert.equal(dashboardFor("ayush", "faculty"), "/faculty");
    assert.equal(dashboardFor("ayush", "institute"), "/institute");
  });

  it("students and vaidyas land on the portal command center", () => {
    assert.equal(dashboardFor("ayush", "student"), "/home");
    assert.equal(dashboardFor("tech", "student"), "/home");
    assert.equal(dashboardFor("ayush", "ayush"), "/home");
  });
});
