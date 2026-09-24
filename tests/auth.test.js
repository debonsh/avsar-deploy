// node --test: email/password validators. The supabase wrappers themselves
// need a live client; the validators are the pure part worth locking down.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateEmail, validatePassword } from "../src/lib/auth.js";

describe("auth: validateEmail", () => {
  it("accepts plain addresses and trims whitespace", () => {
    assert.equal(validateEmail("a@b.co"), true);
    assert.equal(validateEmail("  student@iitd.ac.in  "), true);
  });

  it("rejects junk", () => {
    for (const v of ["", null, undefined, "a", "a@b", "@b.co", "a b@c.co"]) {
      assert.equal(validateEmail(v), false, String(v));
    }
  });
});

describe("auth: validatePassword", () => {
  it("needs the supabase minimum of 6 characters", () => {
    assert.equal(validatePassword("12345"), false);
    assert.equal(validatePassword("123456"), true);
    assert.equal(validatePassword(""), false);
    assert.equal(validatePassword(null), false);
  });
});
