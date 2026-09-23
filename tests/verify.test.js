// node --test: verifiable credentials. Pure, no network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { signCredential, checkCredential, verifyUrl, revokeCredential, revocationFor, checkCredentialStatus } from "../src/lib/verify.js";

test("sign → check roundtrips with payload intact", () => {
  const code = signCredential({ id: "AVSAR-1", name: "Ananya", readiness: 72, skills: ["dravyaguna"] });
  const res = checkCredential(code);
  assert.equal(res.ok, true);
  assert.equal(res.payload.name, "Ananya");
  assert.equal(res.payload.readiness, 72);
  assert.deepEqual(res.payload.skills, ["dravyaguna"]);
});

test("tampered codes fail loudly", () => {
  const [body] = signCredential({ id: "AVSAR-1" }).split(".");
  assert.equal(checkCredential(`${body}.forged`).ok, false);
  assert.equal(checkCredential("garbage").ok, false);
  assert.equal(checkCredential("").ok, false);
});

test("verifyUrl points at the public route", () => {
  assert.ok(verifyUrl("abc.def").startsWith("/verify/"));
});

test("revoked credentials stay visible as revoked, payload intact", () => {
  const code = signCredential({ id: "AVSAR-9", name: "Ghost", readiness: 40, skills: ["gmp"] });
  assert.equal(revocationFor(code), null, "fresh code is clean");
  const entry = revokeCredential(code, "certificate withdrawn by issuer");
  assert.ok(entry && entry.sig, "revocation recorded");
  const status = checkCredentialStatus(code);
  assert.equal(status.ok, true, "signature still verifies — history is real");
  assert.equal(status.payload.name, "Ghost");
  assert.equal(status.revoked.reason, "certificate withdrawn by issuer");
  const again = revokeCredential(code, "second attempt");
  assert.equal(again.reason, "certificate withdrawn by issuer", "idempotent");
});

test("cannot revoke a forged or malformed code", () => {
  assert.equal(revokeCredential("garbage"), null);
  const [body] = signCredential({ id: "AVSAR-2" }).split(".");
  assert.equal(revokeCredential(`${body}.forged`), null);
});
