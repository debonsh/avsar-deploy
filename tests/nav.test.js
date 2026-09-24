// node --test: the nav IA is the contract between the desktop dropdown and
// the mobile Menu sheet — they must never disagree about what goes where.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  NAV_GROUPS,
  NAV_ITEMS,
  primaryFor,
  secondaryFor,
  secondaryGroupsFor,
  sheetGroupsFor,
  isSecondaryPath,
  labelKeyFor,
} from "../src/lib/nav.js";

for (const track of ["ayush", "tech"]) {
  test(`${track}: primary is four routes, secondary holds the rest`, () => {
    const primary = primaryFor(track).map((i) => i.to);
    const secondary = secondaryFor(track).map((i) => i.to);
    assert.equal(primary.length, 4);
    assert.ok(!primary.some((to) => secondary.includes(to)), "no route in both");
    assert.ok(!secondary.includes("/home") && !secondary.includes("/profile"));
    // grouped menus cover the same routes; items keep their flat-list order
    // inside each group (groups themselves follow NAV_GROUPS order)
    const flat = secondaryGroupsFor(track).flatMap((g) => g.items.map((i) => i.to));
    assert.deepEqual([...flat].sort(), [...secondary].sort());
    for (const g of secondaryGroupsFor(track)) {
      const tos = g.items.map((i) => i.to);
      const inFlatOrder = secondary.filter((to) => tos.includes(to));
      assert.deepEqual(tos, inFlatOrder, `group ${g.id} keeps list order`);
    }
  });

  test(`${track}: every item has a group, icon, and description`, () => {
    for (const item of [...primaryFor(track), ...secondaryFor(track)]) {
      assert.ok(item.to && item.key && item.desc && item.icon && item.group);
      assert.ok(NAV_ITEMS[item.to], `${item.to} registered`);
    }
  });

  test(`${track}: sheet covers every destination exactly once`, () => {
    const sheet = sheetGroupsFor(track).flatMap((g) => g.items.map((i) => i.to));
    const expected = [...primaryFor(track), ...secondaryFor(track), NAV_ITEMS["/profile"]].map((i) => i.to);
    assert.deepEqual([...sheet].sort(), [...expected].sort());
  });
}

test("tech renames Internships to Jobs, ayush keeps Internships", () => {
  const jobs = NAV_ITEMS["/jobs"];
  assert.equal(labelKeyFor(jobs, "tech"), "nav.jobs");
  assert.equal(labelKeyFor(jobs, "ayush"), "nav.internships");
});

test("isSecondaryPath spots overflow routes (Menu lights up)", () => {
  assert.equal(isSecondaryPath("ayush", "/quiz"), true);
  assert.equal(isSecondaryPath("ayush", "/home"), false);
  assert.equal(isSecondaryPath("tech", "/resume"), false);
  assert.equal(isSecondaryPath("tech", "/interview"), true);
  assert.equal(isSecondaryPath("tech", "/workspace/abc"), true);
});

test("secondary groups follow NAV_GROUPS order", () => {
  const order = new Map(NAV_GROUPS.map((g, i) => [g.id, i]));
  for (const track of ["ayush", "tech"]) {
    const ids = secondaryGroupsFor(track).map((g) => g.id);
    const sorted = [...ids].sort((a, b) => order.get(a) - order.get(b));
    assert.deepEqual(ids, sorted);
  }
});
