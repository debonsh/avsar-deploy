// Checks the built deck against the SIH 2026 format rules and the mistakes that
// actually get decks marked down.
//
//   node scripts/deck/verify-deck.mjs
//
// Run this before submitting. It reads the .pptx directly, so it checks the file that
// will actually be uploaded, not the content module that produced it.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, "..", "..", "..");
const DECK = join(REPO_ROOT, "PPT", "build", "AVSAR_SIH2026_Zencoderss_6slide.pptx");

const REQUIRED_SECTIONS = [
  "SMART INDIA HACKATHON 2026",
  "IDEA TITLE",
  "TECHNICAL APPROACH",
  "FEASIBILITY AND VIABILITY",
  "IMPACT AND BENEFITS",
  "RESEARCH AND REFERENCES",
];

// Placeholder text that must never survive into a submission.
const BANNED = [
  "TO BE UPDATED",
  "YOUR TEAM NAME",
  "Lorem ipsum",
  "TODO",
  "XXX",
];

// Words the PS uses, and therefore words a keyword scan is likely to look for.
const PS_VOCAB = [
  "Academia",
  "Industry",
  "Skill Mapping",
  "Internship",
  "Placement",
  "Questionnaire",
  "Portfolio",
  "Dashboard",
  "Analytics",
  "Smart Automation",
];

async function main() {
  if (!existsSync(DECK)) {
    console.error(`  deck not found: ${DECK}\n  run: npm run deck:build`);
    process.exit(1);
  }

  const zip = await JSZip.loadAsync(readFileSync(DECK));
  const slideNames = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => Number(a.match(/(\d+)/)[1]) - Number(b.match(/(\d+)/)[1]));

  const slideXml = [];
  for (const n of slideNames) slideXml.push(await zip.file(n).async("string"));
  const all = slideXml.join("\n");

  const notesNames = Object.keys(zip.files).filter((n) => n.startsWith("ppt/notesSlides/notesSlide"));
  let notesText = 0;
  for (const n of notesNames) {
    const t = await zip.file(n).async("string");
    // The empty body placeholder and the slide-number placeholder are standard; count
    // only real content.
    for (const m of t.matchAll(/<a:t>([^<]*)<\/a:t>/g)) {
      const v = m[1].trim();
      if (v && !/^\d+$/.test(v)) notesText += 1;
    }
  }

  const images = slideXml.flatMap((x) => [...x.matchAll(/<a:blip[^>]*r:embed="[^"]*"/g)]).length;
  const altTexts = slideXml.flatMap((x) => [...x.matchAll(/descr="[^"]+"/g)]).length;

  const checks = [];
  const add = (ok, label, detail = "") => checks.push({ ok, label, detail });

  add(slideNames.length === 6, "exactly 6 slides (the official template limit)", `found ${slideNames.length}`);

  const missing = REQUIRED_SECTIONS.filter(
    (s, i) => !(slideXml[i] ?? "").toLowerCase().includes(s.toLowerCase()),
  );
  add(missing.length === 0, "all six official section names present, in order", missing.join(", "));

  // The draft title slide read "SMART INDIA HACKATHON 2025" next to a 2026 logo.
  // Check the header lockup specifically — a bare "2025" elsewhere is fine, since the
  // impact slide cites TestGorilla 2025 and HackerRank 2025.
  const logoLockups = [...all.matchAll(/SMART INDIA HACKATHON/gi)].length;
  add(logoLockups >= 6, "SIH lockup on every slide", `${logoLockups} occurrence(s)`);
  add(!/HACKATHON\s*2025/i.test(all), "no 2025 in the hackathon lockup (the draft's year bug)");

  add(notesText === 0, "no speaker notes left in the file", `${notesText} note text run(s)`);

  add(altTexts >= images, "every image carries alt text for a keyword scan", `${altTexts} alt / ${images} images`);

  const banned = BANNED.filter((b) => all.toLowerCase().includes(b.toLowerCase()));
  add(banned.length === 0, "no leftover placeholder text", banned.join(", "));

  // The two fields only the team can fill. Render as a note, not a failure.
  const teamIdUnfilled = /to be filled from the portal/.test(all);
  const demoUnfilled = /to be added before submission/.test(all);

  const vocab = PS_VOCAB.filter((v) => all.toLowerCase().includes(v.toLowerCase()));
  add(vocab.length === PS_VOCAB.length, "problem-statement vocabulary present", `${vocab.length}/${PS_VOCAB.length}`);

  console.log("\n  SIH 2026 deck check");
  console.log("  ─────────────────────────────────────────────────────────────");
  for (const c of checks) {
    const mark = c.ok ? "PASS" : "FAIL";
    const detail = c.detail && (!c.ok || c.label.includes("alt text") || c.label.includes("slides")) ? `  (${c.detail})` : "";
    console.log(`  ${mark}  ${c.label}${detail}`);
  }

  console.log("\n  Still to fill in before submitting:");
  console.log(`  ${teamIdUnfilled ? "TODO" : "done"}  Team ID (slide 1)`);
  console.log(`  ${demoUnfilled ? "TODO" : "done"}  Live prototype URL (slide 6)`);

  const failed = checks.filter((c) => !c.ok).length;
  console.log(
    failed
      ? `\n  ${failed} check(s) failed.\n`
      : teamIdUnfilled || demoUnfilled
        ? "\n  Format checks pass. Fill the two fields above, then rebuild.\n"
        : "\n  All checks pass.\n",
  );
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(`  verify failed: ${err.message}`);
  process.exit(1);
});
