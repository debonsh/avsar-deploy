// node --test: Analyzer-style tips + video recs. Pure, no network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { videosFor, resumeTips, coursesFor, PROJECT_IDEAS } from "../src/data/courses.js";

test("videosFor returns only YouTube links already in the catalog", () => {
  const v = videosFor("panchakarma");
  assert.ok(v.length >= 1);
  assert.ok(v.every((c) => /youtube/.test(c.u)));
  assert.ok(videosFor("gmp").length <= 2);
});

test("resumeTips fires one tip per failing dimension, caps at 4", () => {
  const r = {
    total: 40,
    breakdown: [
      { label: "Skills Match", why: ["skills capped at 10 by proof volume"] },
      { label: "Format & Contact", why: ["no contact line — add email/phone"] },
    ],
  };
  const tips = resumeTips(r);
  assert.ok(tips.some((t) => /proof volume/.test(t)));
  assert.ok(tips.some((t) => /Contact block/.test(t)));
  assert.ok(tips.some((t) => /Foundation stage/.test(t)));
  assert.ok(tips.length <= 4);
  assert.deepEqual(resumeTips({}), []);
});

test("tech lanes resolve to tech courses, ayush keys stay ayush", () => {
  assert.ok(coursesFor("react").some((c) => /react\.dev|freecodecamp/.test(c.u)));
  assert.ok(videosFor("node").some((c) => /youtube/.test(c.u)));
  assert.ok(coursesFor("dravyaguna").some((c) => /swayam/.test(c.u)));
});

test("project ideas exist for every lane that can score", () => {
  for (const lane of ["ayush", "sde", "data", "marketing", "govt"]) {
    assert.ok(PROJECT_IDEAS[lane]?.length, `${lane} needs project ideas`);
  }
});

test("resume tips speak the portal's language", () => {
  const r = { total: 40, breakdown: [{ label: "Project Quality", why: ["0 quantified outcomes"] }] };
  const tech = resumeTips(r, "sde");
  const ayush = resumeTips(r, "ayush");
  assert.ok(tech.some((t) => /users|time/i.test(t)));
  assert.equal(tech.some((t) => /cases|sittings/i.test(t)), false, "clinical copy must not leak into tech");
  assert.ok(ayush.some((t) => /cases|sittings/i.test(t)));
});
