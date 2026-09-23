// node --test: portfolio profile (certs, github, verified ticks, kudos). Pure, no network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadCerts, addCert, removeCert, loadGithub, saveGithub, loadNickname, saveNickname } from "../src/lib/identity.js";
import { isVerified, hasGivenKudos, giveKudos, loadKudosFallback, loadSharedShowcase } from "../src/lib/store.js";

const mem = {};
globalThis.localStorage = {
  getItem: (k) => (k in mem ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v); },
  removeItem: (k) => { delete mem[k]; },
};

test("certs: add trims, remove drops by timestamp", () => {
  assert.deepEqual(loadCerts(), []);
  const next = addCert({ issuer: " NPTEL ", title: " Python ", url: "https://nptel.ac.in/x" });
  assert.equal(next.length, 1);
  assert.equal(next[0].issuer, "NPTEL");
  assert.equal(next[0].title, "Python");
  assert.equal(typeof next[0].at, "number");
  assert.deepEqual(removeCert(next[0].at), []);
});

test("github: save strips @ and trims, roundtrips", () => {
  assert.equal(saveGithub("  @octocat "), "octocat");
  assert.equal(loadGithub(), "octocat");
});

test("isVerified: quest-done or github-linked, case-insensitive, else claimed", () => {
  assert.equal(isVerified("React", ["react"], ""), true);
  assert.equal(isVerified("React", [], "octocat"), true);
  assert.equal(isVerified("React", ["node"], ""), false);
  assert.equal(isVerified("React", [], ""), false);
});

test("kudos: give once offline, no double-count", async () => {
  assert.equal(hasGivenKudos("AVSAR-AAAAAA"), false);
  assert.equal(await giveKudos("AVSAR-AAAAAA"), null); // offline: remote skipped
  assert.equal(hasGivenKudos("AVSAR-AAAAAA"), true);
  assert.equal(loadKudosFallback("AVSAR-AAAAAA"), 1);
  await giveKudos("AVSAR-AAAAAA");
  assert.equal(loadKudosFallback("AVSAR-AAAAAA"), 1);
});

test("loadSharedShowcase: offline unknown id → null (honest empty state)", async () => {
  assert.equal(await loadSharedShowcase("AVSAR-NOBODY"), null);
});

test("nickname: defaults empty, roundtrips trimmed", () => {
  assert.equal(loadNickname(), "");
  saveNickname("  Ada  ");
  assert.equal(loadNickname(), "Ada");
});
