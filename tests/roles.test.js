// node --test: role is identity (who is looking), never the scoring rubric —
// that is the lane's job (lib/track.js). Legacy devices carry "ayush" in
// avsar-role from the single-track build, so it must stay a valid value.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { APP_ROLES, DEFAULT_ROLE, loadRole, saveRole, roleLabel } from "../src/lib/roles.js";

function withStore(init = {}) {
  const store = { ...init };
  globalThis.localStorage = {
    removeItem: (k) => { delete store[k]; },
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = String(v); },
  };
  return store;
}

describe("roles: the five identities the portal serves", () => {
  it("offers exactly the five roles, each labelled", () => {
    assert.deepEqual(APP_ROLES.map((r) => r.value), ["student", "industry", "faculty", "institute", "ayush"]);
    for (const r of APP_ROLES) assert.ok(r.label, r.value);
    assert.equal(DEFAULT_ROLE, "student");
  });

  it("a fresh device is a student", () => {
    withStore();
    assert.equal(loadRole(), "student");
    delete globalThis.localStorage;
  });

  it("a legacy single-track device keeps the ayush role", () => {
    withStore({ "avsar-role": "ayush" });
    assert.equal(loadRole(), "ayush");
    delete globalThis.localStorage;
  });

  it("junk never becomes a role, and saving is validated", () => {
    const store = withStore({ "avsar-role": "supplier" });
    assert.equal(loadRole(), "student");
    assert.equal(saveRole("recruiter"), false);
    assert.equal(store["avsar-role"], "supplier");
    assert.equal(saveRole("faculty"), true);
    assert.equal(loadRole(), "faculty");
    delete globalThis.localStorage;
  });

  it("labels resolve for the shell, junk falls back", () => {
    assert.equal(roleLabel("institute"), "Institute");
    assert.equal(roleLabel("nonsense"), "Student");
  });
});
