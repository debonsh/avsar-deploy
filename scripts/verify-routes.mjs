// Route smoke test: renders every student-facing route in a real browser, per portal and
// per desk role, and fails loudly on a blank render, a console error, or a page whose
// headline number disagrees with its own prose.
//
//   npm run verify:routes
//
// Why this exists next to the unit suites: `node --test`, `npm run lint` and `npm run
// build` all passed while /jobs rendered a fit score of 0 on every card and the market
// tiles showed a stale count under reduced motion. Only a real render catches that.
// Needs the chromium download once: npx playwright install chromium
import { execFileSync, spawn } from "node:child_process";
import { chromium } from "playwright";

const PORT = Number(process.env.VERIFY_PORT || 4199);
const BASE = `http://localhost:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// [route, label] per pass. Cold = no onboarding at all, so the gate is exercised too.
const STUDENT_ROUTES = ["/market", "/gps", "/challenges", "/match", "/jobs", "/journey"];
const COLD_EXTRA = ["/labs"];
const COLD_ROUTES = ["/", ...COLD_EXTRA, ...STUDENT_ROUTES, "/institute"];

async function waitForServer(timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(BASE, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return true;
    } catch {
      // not up yet
    }
    await sleep(500);
  }
  return false;
}

async function clickAny(page, candidates) {
  for (const text of candidates) {
    const t = page.getByText(text, { exact: false }).first();
    try {
      if (await t.isVisible({ timeout: 1500 })) { await t.click({ timeout: 3000 }); return text; }
    } catch {
      // try the next candidate
    }
  }
  return null;
}

function attach(page, problems) {
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    // A Supabase project with no key and a job board that will not answer are the
    // documented offline state, not defects: the app is built to carry on with its
    // bundled seeds, and the demo is meant to run with zero keys. So a resource that
    // fails off-origin is noise here. A same-origin failure is not: that is a missing
    // chunk or asset, and it is reported below even before the [blank] check sees it.
    const url = m.location()?.url || "";
    if (/Failed to load resource/i.test(m.text()) && url && !url.startsWith(BASE)) return;
    problems.push(`[console] ${m.text()}${url ? ` @ ${url.slice(0, 80)}` : ""}`);
  });
  page.on("pageerror", (e) => problems.push(`[pageerror] ${e.message}`));
}

async function survey(page, path, label, failures) {
  // "load", not "networkidle": the app makes best-effort calls to live job boards and to
  // Supabase, and a board that hangs mid-handshake would otherwise fail the whole gate on a
  // page that rendered perfectly. The settle below is what waits for React to finish.
  await page.goto(`${BASE}${path}`, { waitUntil: "load" });
  await sleep(1200);
  const text = (await page.locator("main").innerText().catch(() => "")).replace(/\s*\n+\s*/g, " | ");
  const root = await page.locator("#root").innerHTML().catch(() => "");
  if (root.length < 200) {
    failures.push(`[blank] ${path} (${label})`);
    console.log(`  BLANK  ${path} (${label})`);
    return;
  }
  console.log(`  ok     ${path} (${label})  ${text.slice(0, 90)}…`);
}

// the gate reads avsar-track, and a wrong role is redirected to its own dashboard, so
// both are written directly: clicking the welcome card by text hits the hero paragraph.
async function onboard(page, track, role = "student") {
  await page.goto(BASE, { waitUntil: "load" });
  await page.evaluate(({ t, r }) => {
    localStorage.setItem("avsar-track", t);
    localStorage.setItem("avsar-role", r);
  }, { t: track, r: role });
  await sleep(200);
}

async function seedResume(page) {
  await page.goto(`${BASE}/resume`, { waitUntil: "load" });
  const sample = await clickAny(page, ["Use a sample resume"]);
  await sleep(500);
  const scored = await clickAny(page, ["Score my resume"]);
  await sleep(1800);
  if (!sample || !scored) throw new Error(`resume seeding failed (sample=${sample}, score=${scored})`);
}

// a page that states the same fact twice must state it the same way twice
async function checkMarketNumbers(page, problems) {
  await page.goto(`${BASE}/market`, { waitUntil: "load" });
  await sleep(1600);
  const text = await page.locator("main").innerText();
  const tile = Number((text.match(/Jobs tracked\s*\n?\s*(\d+)/) || [])[1]);
  const skilledTile = Number((text.match(/Postings with skills\s*\n?\s*(\d+)/) || [])[1]);
  const prose = Number((text.match(/share of the (\d+) postings that list skills/) || [])[1]);
  const datedTile = Number((text.match(/Postings with a date\s*\n?\s*(\d+)/) || [])[1]);
  const datedProse = Number((text.match(/(\d+) of them carry a posted date/) || [])[1]);
  // the tile and the skills table state the same count, so they must agree
  const floorTile = Number((text.match(/Skills in demand\s*\n?\s*(\d+)/) || [])[1]);
  const floorProse = Number((text.match(/(\d+) of \d+ skills weighted/) || [])[1]);
  // the demand share is measured against postings that name skills, so that is the figure the
  // prose has to agree with, not the corpus total
  const ok = Number.isFinite(tile) && skilledTile === prose && datedTile === datedProse && floorTile === floorProse;
  if (Number.isFinite(skilledTile) && skilledTile > tile) problems.push(`[inconsistent] market claims more skilled postings than postings`);
  console.log(
    `  ${ok ? "ok    " : "FAIL  "} market numbers agree (postings ${tile}, listed skills ${skilledTile}/${prose}, dated ${datedTile}/${datedProse}, weighted ${floorTile}/${floorProse})`
  );
  if (!ok) problems.push(`[inconsistent] market tiles disagree with its prose`);
}

async function main() {
  const failures = [];
  const problems = [];
  console.log("building ...");
  execFileSync("npm", ["run", "build"], { stdio: "pipe", shell: true });
  const server = spawn("npm", ["run", "preview", "--", "--port", String(PORT), "--strictPort"], { shell: true, stdio: "pipe" });
  if (!(await waitForServer())) { server.kill(); throw new Error(`preview never came up on ${PORT}`); }

  const browser = await chromium.launch();
  try {
    // reduced motion is the case that exposed the stale count, so verify under it
    const context = async () => {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: "reduce" });
      const page = await ctx.newPage();
      attach(page, problems);
      return page;
    };

    console.log("cold: no onboarding state");
    const cold = await context();
    for (const p of COLD_ROUTES) await survey(cold, p, "cold", failures);

    for (const track of ["ayush", "tech"]) {
      console.log(`${track} student, scored resume`);
      const page = await context();
      await onboard(page, track);
      await seedResume(page);
      for (const p of STUDENT_ROUTES) await survey(page, p, `${track} student`, failures);
      if (track === "tech") await checkMarketNumbers(page, problems);
    }

    console.log("desk roles");
    for (const [track, role, path] of [["tech", "institute", "/institute"], ["ayush", "industry", "/industry"], ["tech", "industry", "/shortlist"], ["tech", "faculty", "/faculty"]]) {
      const page = await context();
      await onboard(page, track, role);
      await survey(page, path, role, failures);
    }
  } finally {
    await browser.close();
    server.kill();
    if (process.platform !== "win32") {
      try { execFileSync("sh", ["-c", `fuser -k ${PORT}/tcp 2>/dev/null || true`], { stdio: "pipe" }); } catch { /* port already free */ }
    }
  }

  const bad = [...new Set([...failures, ...problems])];
  if (bad.length) {
    console.error(`\nverify:routes FAILED (${bad.length})`);
    for (const b of bad.slice(0, 20)) console.error(`  ${b}`);
    process.exit(1);
  }
  console.log("\nverify:routes passed: every route rendered, no console errors, no drifting numbers");
  process.exit(0);
}

main().catch((err) => {
  console.error(`verify:routes crashed: ${err.message}`);
  process.exit(1);
});
