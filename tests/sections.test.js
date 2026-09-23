// node --test: structured resume sections. Pure heuristics, no file IO.
import { test } from "node:test";
import assert from "node:assert/strict";
import { extractContact, extractSections } from "../src/lib/parseResume.js";

const RESUME = `Asha Sharma
asha.sharma@test.com | +91 9876543210 | https://github.com/asha
SUMMARY
Frontend dev with 2 years of experience.
EXPERIENCE
Frontend Intern at ZetaPay (2024) - built dashboard, cut load time 30%
PROJECTS
Portfolio site in React
EDUCATION
B.Sc CS, Kirti College (2023)
SKILLS
JavaScript, React, HTML, CSS, Git
CERTIFICATIONS
AWS Cloud Practitioner (2024)`;

test("extractContact finds email phone links and name", () => {
  const c = extractContact(RESUME);
  assert.equal(c.email, "asha.sharma@test.com");
  assert.equal(c.phone, "+91 9876543210");
  assert.equal(c.name, "Asha Sharma");
  assert.ok(c.links.some((l) => l.includes("github")));
});

test("extractSections splits experience education skills certifications", () => {
  const secs = extractSections(RESUME);
  const keys = secs.map((s) => s.section);
  assert.ok(keys.includes("contact"));
  assert.ok(keys.includes("experience"));
  assert.ok(keys.includes("education"));
  assert.ok(keys.includes("skills"));
  assert.ok(keys.includes("certifications"));
  const skills = secs.find((s) => s.section === "skills");
  assert.ok(skills.body.includes("React"));
});

test("garbage text yields no sections, never crashes", () => {
  assert.deepEqual(extractSections(""), []);
  const secs = extractSections("hi\nthere friend");
  assert.ok(!secs.some((s) => s.section !== "contact"));
});
