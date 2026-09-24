// node --test: the auth gate is pure — given (backend on?, session known?,
// user?, path), what should the shell render. No network, no React.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { authGate } from "../src/lib/authgate.js";

const U = { id: "u1", email: "a@b.co" };

describe("authgate: public routes never gate", () => {
  it("chooser, share, verify, and login stay open signed-out on a live backend", () => {
    for (const p of ["/", "/u/avsar-abc123", "/verify/deadbeef", "/login"]) {
      assert.equal(authGate({ supabaseOn: true, authReady: true, user: null, path: p }), "allow", p);
    }
  });
});

describe("authgate: no backend, no gate", () => {
  it("zero-key mode keeps every route open to guests", () => {
    for (const p of ["/home", "/jobs", "/industry"]) {
      assert.equal(authGate({ supabaseOn: false, authReady: true, user: null, path: p }), "allow", p);
    }
  });
});

describe("authgate: configured backend requires an account", () => {
  it("a session read in flight waits instead of flashing /login", () => {
    assert.equal(authGate({ supabaseOn: true, authReady: false, user: null, path: "/home" }), "wait");
    assert.equal(authGate({ supabaseOn: true, authReady: false, user: U, path: "/home" }), "wait");
  });

  it("signed-out users bounce to /login from any portal route", () => {
    for (const p of ["/home", "/jobs", "/industry", "/profile"]) {
      assert.equal(authGate({ supabaseOn: true, authReady: true, user: null, path: p }), "login", p);
    }
  });

  it("signed-in users pass", () => {
    assert.equal(authGate({ supabaseOn: true, authReady: true, user: U, path: "/home" }), "allow");
  });
});
