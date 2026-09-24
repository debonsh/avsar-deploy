// node --test: the OAuth return path is the difference between "login is
// broken" and "login tells you what happened". Pure parts pinned here.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseOAuthParams, friendlyOAuthError } from "../src/lib/auth.js";

test("parseOAuthParams spots provider errors first", () => {
  assert.deepEqual(parseOAuthParams("?error=access_denied&error_description=the+user+denied"), {
    kind: "provider-error",
    error: "the user denied",
  });
  assert.deepEqual(parseOAuthParams("?error=server_error"), {
    kind: "provider-error",
    error: "server_error",
  });
});

test("parseOAuthParams spots the exchange code", () => {
  assert.deepEqual(parseOAuthParams("?code=abc123"), { kind: "code" });
  // other params (chat, filters) ride along and change nothing
  assert.deepEqual(parseOAuthParams("?chat=1&code=abc123"), { kind: "code" });
});

test("parseOAuthParams stays quiet on ordinary pages", () => {
  for (const s of ["", "?", "?chat=1", "?job=abc", "#section"]) {
    assert.deepEqual(parseOAuthParams(s), { kind: "none" }, s);
  }
});

test("friendlyOAuthError translates the common failures", () => {
  assert.match(friendlyOAuthError("access_denied"), /cancelled/i);
  assert.match(friendlyOAuthError("redirect_uri_mismatch"), /allow-listed/i);
  assert.equal(friendlyOAuthError("server_error"), "server_error");
  assert.match(friendlyOAuthError(""), /failed/i);
});
