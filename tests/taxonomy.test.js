// node --test: skill graph taxonomy. Pure, no network, no localStorage needed.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DOMAINS, SKILLS, TAXONOMY_ROLES, PROFICIENCY,
  skillById, resolveSkill, skillsByDomain, decayedLevel, demandWeight,
  requiredFor, gapVector, proficiencyLabel,
  proposeSkill, approveSkill, rejectSkill, listProposals,
} from "../src/data/taxonomy.js";

test("taxonomy ships 8 domains incl. AYUSH and 60+ skills", () => {
  assert.equal(DOMAINS.length, 8);
  assert.ok(DOMAINS.some((d) => d.id.startsWith("ayush")), "AYUSH domain present");
  assert.ok(SKILLS.length >= 60, `expected 60+ skills, got ${SKILLS.length}`);
});

test("every skill carries engine metadata", () => {
  for (const s of SKILLS) {
    assert.ok(s.id && s.name, "id+name");
    assert.ok(DOMAINS.some((d) => d.id === s.domain), `domain for ${s.id}`);
    assert.ok(Array.isArray(s.aliases) && Array.isArray(s.related), `${s.id} aliases/related`);
    assert.ok(s.halfLifeDays >= 30, `${s.id} half-life`);
    assert.ok(s.demandWeight > 0, `${s.id} demand weight`);
    assert.ok(s.nsqf >= 4 && s.nsqf <= 8, `${s.id} nsqf`);
  }
});

test("aliases resolve to the canonical skill", () => {
  assert.equal(resolveSkill("GCP")?.id, "research");
  assert.equal(resolveSkill("  Panchakarma Therapy ")?.id, "panchakarma");
  assert.equal(resolveSkill("react.js")?.id, "react");
  assert.equal(resolveSkill("nonsense-skill"), null);
  assert.equal(skillById("dravyaguna").domain, "ayush-clinical");
});

test("proficiency decays on a half-life without fresh evidence", () => {
  const now = Date.now();
  const half = skillById("pharmacovigilance").halfLifeDays;
  assert.equal(decayedLevel("pharmacovigilance", 4, now, now), 4);
  const aged = decayedLevel("pharmacovigilance", 4, now - half * 86400000, now);
  assert.ok(Math.abs(aged - 2) < 0.01, `one half-life: 4 → ~2, got ${aged}`);
  assert.equal(decayedLevel("pharmacovigilance", 4, 0, now), 4, "no timestamp = no decay");
  assert.equal(decayedLevel("pharmacovigilance", 0, now, now), 0);
});

test("roles expose required skills at target levels, deepest gap first", () => {
  const req = requiredFor("ayush-cra");
  assert.ok(req.length >= 5);
  assert.ok(req.every((r) => r.level >= 1 && r.level <= 5));
  const gaps = gapVector("ayush-cra", { research: 4, documentation: 2, diagnosis: 3 });
  assert.ok(gaps.find((g) => g.skill === "pharmacovigilance").gap === 4);
  assert.ok(gaps.find((g) => g.skill === "documentation").gap === 2);
  assert.ok(!gaps.some((g) => g.skill === "research"), "met skill is not a gap");
  assert.ok(!gaps.some((g) => g.skill === "diagnosis"));
  assert.deepEqual(gapVector("unknown-role", {}), []);
});

test("demand weight defaults to 1 for unknown skills", () => {
  assert.equal(demandWeight("documentation"), 1.5);
  assert.equal(demandWeight("nope"), 1);
});

test("proficiency ladder has five published levels", () => {
  assert.equal(PROFICIENCY.length, 5);
  assert.equal(proficiencyLabel(4), "L4 Advanced");
  assert.equal(proficiencyLabel(0), "L0 Unrated");
});

test("propose → approve lifecycle; rejects and dupes handled", () => {
  const p = proposeSkill({ name: `Test Skill ${Date.now()}`, domain: "data", by: "test" });
  if (p) {
    assert.equal(p.status, "pending");
    assert.ok(listProposals("pending").some((x) => x.id === p.id));
    const dupe = proposeSkill({ name: p.name });
    assert.equal(dupe, null, "pending dupe blocked");
    const ok = approveSkill(p.id);
    assert.equal(ok.status, "approved");
    assert.ok(resolveSkill(p.name), "approved skill resolves");
    assert.equal(approveSkill(p.id), null, "double approve blocked");
  }
  const r = proposeSkill({ name: `Reject Me ${Date.now()}` });
  if (r) {
    assert.equal(rejectSkill(r.id).status, "rejected");
    assert.equal(resolveSkill(r.name), null, "rejected never resolves");
  }
  assert.equal(proposeSkill({ name: "React" }), null, "existing skill cannot be re-proposed");
});

test("role templates cover the seeded tracks", () => {
  for (const k of Object.keys(TAXONOMY_ROLES)) {
    assert.ok(requiredFor(k).length >= 5, `${k} has depth`);
  }
  assert.ok(requiredFor("ayush-cra").some((r) => r.skill === "pharmacovigilance"), "Ananya's dream role needs her gap");
});
