// Captures real screenshots of the running app for the SIH deck.
//
//   npm run deck:shots
//
// Builds the production bundle, serves it, seeds a scored resume (the score,
// quest and fit screens all render empty without one), then captures each route
// at 1440x900 @2x into <repo>/PPT/build/shots/.

import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const HERE = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = join(HERE, "..", "..");
const OUT = join(APP_ROOT, "..", "PPT", "build", "shots");
const PORT = 4173;
const BASE = `http://localhost:${PORT}`;

const SHOTS = [
  { file: "01-resume.png", path: "/resume", scroll: 430, label: "readiness score" },
  { file: "02-quests.png", path: "/quests", scroll: 60, label: "gap quests" },
  { file: "03-jobs.png", path: "/jobs", click: "My insights", label: "role feed / insights" },
  { file: "04-industry.png", path: "/industry", focus: "Posted by you", offset: -120, label: "industry posting" },
  { file: "05-institute.png", path: "/institute", label: "institute dashboard" },
  { file: "06-portfolio.png", path: "/portfolio", label: "portfolio" },
  { file: "07-landing.png", path: "/", label: "landing / front door" },
  { file: "08-home.png", path: "/home", label: "student home" },
  { file: "09-journey.png", path: "/journey", label: "journey timeline" },
];

const PROOF_URL = "https://github.com/ananya-sharma/bams-rotation-logbook";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForServer(timeoutMs = 90000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(BASE, { signal: AbortSignal.timeout(3000) });
      if (res.ok) return true;
    } catch {
      // not up yet
    }
    await sleep(500);
  }
  return false;
}

/** Click the first element whose visible text matches any candidate. */
async function clickAny(page, candidates) {
  for (const text of candidates) {
    const target = page.getByText(text, { exact: false }).first();
    try {
      if (await target.isVisible({ timeout: 1500 })) {
        await target.click({ timeout: 3000 });
        return text;
      }
    } catch {
      // try the next candidate
    }
  }
  return null;
}

/** Scroll the page so the highest-signal region is in frame. */
async function scrollTo(page, px) {
  if (!px) return;
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), px);
  await sleep(350);
}

/**
 * Bring a region into frame by its heading, offset from the viewport top.
 * Resolves the element's absolute document position rather than relying on
 * scrollIntoView's minimal-scroll behaviour, which does nothing when the element
 * is already technically visible.
 */
async function focusOn(page, text, offset = 0) {
  try {
    const el = page.getByText(text, { exact: false }).first();
    await el.waitFor({ state: "attached", timeout: 3000 });
    const abs = await el.evaluate((node) => {
      let y = 0;
      let cur = node;
      while (cur) {
        y += cur.offsetTop || 0;
        cur = cur.offsetParent;
      }
      return y;
    });
    await page.evaluate(
      ({ top, off }) => window.scrollTo({ top: Math.max(0, top + off), behavior: "instant" }),
      { top: abs, off: offset },
    );
    await sleep(400);
    return true;
  } catch {
    return false;
  }
}

/** Score a resume. Every downstream screen renders an empty state without one. */
async function seedResume(page) {
  await page.goto(`${BASE}/resume`, { waitUntil: "networkidle" });
  const loaded = await clickAny(page, ["Use a sample resume"]);
  if (!loaded) console.warn("    ! 'Use a sample resume' not found");
  await sleep(400);
  const scored = await clickAny(page, ["Score my resume"]);
  if (!scored) console.warn("    ! 'Score my resume' not found");
  await sleep(1200);
}

/**
 * Seed quest progress straight into localStorage.
 *
 * Driving the quest UI is unreliable: the proof-link input is uncontrolled and
 * only commits on blur, and the ticks re-render underneath the click. Writing the
 * documented shape of `avsar-progress-v1` is deterministic.
 *
 * `hims` and `research` are the only two skills that appear on the seeded resume
 * AND have both a course and a project task, so they are what flips a portfolio
 * chip from claimed (grey) to verified (green). `shishiksha` is seeded too so the
 * first visible quest week shows completed work with a proof link.
 */
async function seedQuestProgress(page) {
  await page.goto(BASE, { waitUntil: "networkidle" });
  const seeded = await page.evaluate(({ url }) => {
    const role = "ayush";
    const PKEY = "avsar-progress-v1";
    const prev = JSON.parse(localStorage.getItem(PKEY) || "null") || {};
    const state = {
      quests: { ...(prev.quests || {}) },
      evidence: { ...(prev.evidence || {}) },
      questDays: { ...(prev.questDays || {}) },
      streak: prev.streak || { lastDay: null, count: 0, badges: [] },
      interview: prev.interview || {},
    };
    const skills = ["shishiksha", "hims", "research"];
    for (const skill of skills) {
      state.quests[`${role}:${skill}:course`] = true;
      state.quests[`${role}:${skill}:project`] = true;
      state.evidence[`${role}:${skill}`] = url;
    }
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    state.questDays[today] = skills.length * 2;
    localStorage.setItem(PKEY, JSON.stringify(state));
    localStorage.setItem("avsar-nick", "Ananya S.");
    // The supported way to mark the resume's skills verified: link a proof folder.
    // (Quest-derived ticks cannot do it — completedSkillIdsForRole returns skill
    // names while getEvidence looks up skill ids, so the two never match.)
    localStorage.setItem("avsar-github", url);
    return skills.length;
  }, { url: PROOF_URL });
  await sleep(300);
  console.log(`    quests: ${seeded} skill pairs seeded (course + project + proof link)`);
}

/** Post a role so the industry screen shows a live posting and a shortlist. */
async function seedIndustryPost(page) {
  await page.goto(`${BASE}/industry`, { waitUntil: "networkidle" });
  await sleep(600);
  const fill = async (selector, value) => {
    try {
      await page.locator(selector).first().fill(value, { timeout: 2500 });
    } catch {
      // placeholder may differ; the default value is still usable
    }
  };
  await fill('input[placeholder*="Panchakarma intern"]', "Panchakarma Therapy Intern");
  await fill('input[placeholder*="NABH Ayurveda"]', "NABH Ayurveda Hospital");
  await fill('input[placeholder*="panchakarma, diagnosis"]', "panchakarma, documentation, diagnosis");
  await fill('input[type="url"]', "https://example-ayush-hospital.in/careers/panchakarma");
  const posted = await clickAny(page, ["Post opening"]);
  await sleep(1400);
  console.log(`    industry: post ${posted ? "submitted" : "skipped"}`);
}

async function main() {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  console.log("  building production bundle ...");
  execFileSync("npm", ["run", "build"], {
    cwd: APP_ROOT,
    stdio: "pipe",
    shell: true,
    env: { ...process.env, NODE_ENV: "production" },
  });

  console.log(`  starting preview on ${PORT} ...`);
  const server = spawn(
    "npm",
    ["run", "preview", "--", "--port", String(PORT), "--strictPort"],
    { cwd: APP_ROOT, shell: true, stdio: "pipe", env: { ...process.env, NODE_ENV: "production" } },
  );

  const up = await waitForServer();
  if (!up) {
    server.kill();
    throw new Error(`preview server never came up on ${PORT}`);
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();

  try {
    // Seed real state. Without it, /resume, /quests, /jobs fit scores and
    // /portfolio verified ticks all render their empty state.
    console.log("  seeding a scored resume ...");
    await seedResume(page);

    console.log("  seeding quest progress ...");
    await seedQuestProgress(page);

    console.log("  seeding an industry posting ...");
    await seedIndustryPost(page);

    for (const shot of SHOTS) {
      await page.goto(`${BASE}${shot.path}`, { waitUntil: "networkidle" });
      if (shot.click) {
        await clickAny(page, [shot.click]);
        await sleep(700);
      }
      await sleep(500);
      if (shot.focus) await focusOn(page, shot.focus, shot.offset ?? 0);
      else await scrollTo(page, shot.scroll);
      // Hide the scrollbar so the frame edge is clean.
      await page.addStyleTag({ content: "::-webkit-scrollbar{display:none} html{scrollbar-width:none}" });
      await page.screenshot({ path: join(OUT, shot.file) });
      console.log(`    ok  ${shot.file}  ${shot.label}`);
    }
  } finally {
    await browser.close();
    server.kill();
    // npm spawns a child for vite; make sure the port is released.
    if (process.platform === "win32") {
      try {
        execFileSync("cmd", ["/c", `for /f "tokens=5" %a in ('netstat -ano ^| findstr :${PORT} ^| findstr LISTENING') do taskkill /F /PID %a`], { stdio: "pipe" });
      } catch {
        // nothing listening, fine
      }
    }
  }

  console.log(`\n  captured ${SHOTS.length} screenshots to ${OUT}\n`);
  // npm keeps a wrapper process alive around vite; exit explicitly.
  process.exit(0);
}

main().catch((err) => {
  console.error(`\n  capture failed: ${err.message}\n`);
  process.exit(1);
});
