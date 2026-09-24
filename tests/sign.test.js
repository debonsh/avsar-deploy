// node --test: receipts. The point of signing a grade is that a later edit is detectable,
// so what is asserted here is that a single changed character fails, that the failure says
// "altered" rather than "malformed", and that the weaker hash mode is always labelled
// weaker instead of being dressed up as a signature.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  canonicalJSON, canonical, hasWebCrypto, signingMode, modeLabel,
  generateIssuerKeypair, fingerprint, publicKeyFor, signPayload, verifySigned,
  chainHash, receiptBadge, loadIssuerKey, verifyReceiptText,
} from "../src/lib/sign.js";
import { hashStr } from "../src/lib/quests.js";

test("canonicalJSON fixes key order so a signature cannot depend on it", () => {
  assert.equal(canonicalJSON({ b: 1, a: 2 }), canonicalJSON({ a: 2, b: 1 }));
  assert.equal(canonicalJSON({ a: 2, b: 1 }), '{"a":2,"b":1}');
  assert.equal(canonicalJSON({ a: undefined, b: 1 }), '{"b":1}', "undefined is dropped, not serialised");
  assert.deepEqual(canonical({ a: [3, { z: 1, y: 2 }] }), { a: [3, { y: 2, z: 1 }] }, "arrays keep their order, objects do not");
  assert.equal(canonicalJSON(null), "null");
  assert.equal(canonicalJSON(undefined), "null");
  assert.equal(canonicalJSON(7), "7");
});

test("this environment reports the strong mode, so the tests exercise the real path", () => {
  assert.equal(hasWebCrypto(), true, "Node 19+ ships WebCrypto");
  assert.equal(signingMode(), "ecdsa-p256");
  assert.match(modeLabel("ecdsa-p256"), /ECDSA P-256/);
  assert.match(modeLabel("hash-fallback"), /weaker/i, "the fallback must never read as a signature");
});

test("a generated keypair keeps its private half private", async () => {
  const pair = await generateIssuerKeypair();
  assert.ok(pair.publicJwk.x && pair.publicJwk.y, "a public P-256 key has coordinates");
  assert.equal(pair.publicJwk.d, undefined, "and no private scalar");
  assert.ok(pair.privateJwk.d, "the private half does have one");
  const pub = publicKeyFor(pair.privateJwk);
  assert.equal(pub.d, undefined);
  assert.equal(pub.x, pair.privateJwk.x, "stripping keeps the public coordinates");
  assert.equal(pub.key_ops, undefined, "and drops what the holder may do with it, which is not identity");
  assert.deepEqual(publicKeyFor({ kty: "EC", crv: "P-256", d: "secret", x: "1", y: "2", key_ops: ["sign"], ext: true }),
    { kty: "EC", crv: "P-256", x: "1", y: "2" });
});

test("fingerprint is stable per key and different across keys", async () => {
  const a = await generateIssuerKeypair();
  const b = await generateIssuerKeypair();
  const fa = await fingerprint(a.publicJwk);
  assert.equal(fa.length, 16);
  assert.equal(fa, await fingerprint(a.publicJwk), "same key, same handle");
  assert.notEqual(fa, await fingerprint(b.publicJwk));
  assert.equal(await fingerprint(a.privateJwk), fa, "the same key fingerprints the same from either half");
});

test("a signed payload verifies, and one changed character does not", async () => {
  const pair = await generateIssuerKeypair();
  const receipt = await signPayload({ submissionId: "sub-1", score: 72, skill: "sql" }, pair);
  assert.equal(receipt.mode, "ecdsa-p256");
  assert.equal(receipt.alg, "ECDSA-P256-SHA256");
  assert.ok(receipt.jwk?.x, "the receipt carries the public key so it verifies with no server");
  assert.equal(receipt.jwk?.d, undefined, "and never the private one");
  assert.equal(receipt.kid, await fingerprint(pair.publicJwk));

  const good = await verifySigned(receipt);
  assert.equal(good.ok, true);
  assert.equal(good.weak, false);
  assert.equal(good.payload.score, 72);

  // the single-character edit is the whole point of the exercise
  const tampered = { ...receipt, payload: { ...receipt.payload, score: 92 } };
  const bad = await verifySigned(tampered);
  assert.equal(bad.ok, false);
  assert.match(bad.reason, /altered after signing/, "an edit must not read as malformed junk");
});

test("a swapped signature fails even when the payload is untouched", async () => {
  const a = await generateIssuerKeypair();
  const b = await generateIssuerKeypair();
  const one = await signPayload({ id: "one" }, a);
  const two = await signPayload({ id: "two" }, b);
  assert.equal((await verifySigned({ ...one, sig: two.sig })).ok, false);
  assert.equal((await verifySigned({ ...one, jwk: b.publicJwk })).ok, false, "a signature is bound to its key");
});

test("verifying against a supplied key ignores the key riding along in the receipt", async () => {
  const real = await generateIssuerKeypair();
  const impostor = await generateIssuerKeypair();
  const receipt = await signPayload({ id: "x" }, real);
  assert.equal((await verifySigned(receipt, real.publicJwk)).ok, true);
  assert.equal((await verifySigned(receipt, impostor.publicJwk)).ok, false, "pinning a key out of band is what turns integrity into identity");
});

test("malformed receipts are refused without throwing", async () => {
  for (const bad of [null, {}, { payload: {}, sig: "" }, { sig: "abc" }, { payload: { a: 1 }, sig: 5 }]) {
    const res = await verifySigned(bad);
    assert.equal(res.ok, false, JSON.stringify(bad));
    assert.ok(res.reason, "and it says why");
  }
});

test("the hash fallback verifies, and is labelled weak every time", async () => {
  // built by hand because this machine has WebCrypto: the fallback only runs on old
  // browsers, and it still has to be verifiable and honestly labelled there.
  const payload = { id: "legacy", score: 61 };
  const body = canonicalJSON(payload);
  const receipt = { payload, sig: hashStr(`avsar-fallback:${body}`).toString(36), mode: "hash-fallback", kid: "hash-fallback", jwk: null };

  const ok = await verifySigned(receipt);
  assert.equal(ok.ok, true);
  assert.equal(ok.weak, true, "a hash is weaker than a signature and the result says so");
  assert.match(await verifyReceiptText(receipt), /weaker/i);

  const bad = await verifySigned({ ...receipt, payload: { ...payload, score: 99 } });
  assert.equal(bad.ok, false);
  assert.match(bad.reason, /altered after signing/);

  assert.deepEqual(receiptBadge(receipt), { tone: "amber", text: "hash mode, weaker" });
});

test("receiptBadge names the signing key rather than claiming more", async () => {
  const pair = await generateIssuerKeypair();
  const receipt = await signPayload({ id: "1" }, pair);
  const badge = receiptBadge(receipt);
  assert.equal(badge.tone, "green");
  assert.match(badge.text, /signed/);
  assert.deepEqual(receiptBadge({}), { tone: "zinc", text: "unsigned" });
});

test("chainHash links entries and changes when either side changes", async () => {
  const a = await chainHash("", { n: 1 });
  assert.equal(a.length, 32);
  assert.equal(a, await chainHash("", { n: 1 }), "stable for the same link");
  assert.notEqual(a, await chainHash("", { n: 2 }));
  assert.notEqual(a, await chainHash(a, { n: 2 }), "previous hash and payload are both inputs");
  assert.equal((await chainHash("prev", { n: 1 })).length, 32);
});

test("the device issuer key is minted once and reused", async () => {
  const first = await loadIssuerKey();
  assert.ok(first?.privateJwk?.d, "a key exists after the first call");
  const second = await loadIssuerKey();
  assert.equal(second.kid, first.kid, "a second call must not rotate the key mid-session");
  const receipt = await signPayload({ id: "k" }, second);
  assert.equal((await verifySigned(receipt)).ok, true);
});
