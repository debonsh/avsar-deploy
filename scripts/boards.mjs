// boards import: Greenhouse + Lever + Ashby company boards → app/src/data/boardsSeed.js.
// ponytail: keyless JSON APIs only (same as JobSync's registry), node has no CORS limits.
// Company directories vendored under scripts/vendor/ (from JobSync's built-in lists).
// usage: npm run boards -- --gh=stripe --lever=lever --ashby=linear,ashby [--max=40]
//        npm run boards -- --gh=Stripe, Figma   (names resolve via vendor lists)
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { guessRole, extractSkills } from "../src/lib/store.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = a.replace(/^--/, "").split("=");
  return [m[0], m[1] ?? true];
}));
const MAX = Math.min(200, Math.max(5, Number(args.max) || 40));
const split = (v) => String(v || "").split(",").map((s) => s.trim()).filter(Boolean);

const loadList = (f) => JSON.parse(readFileSync(join(HERE, "vendor", f), "utf8"));
const LISTS = { gh: loadList("greenhouse.json"), lever: loadList("lever.json"), ashby: loadList("ashby.json") };

// resolve a name or token to {name, token, host}
function resolve(provider, want) {
  const list = LISTS[provider];
  const hit = list.find((c) => c.token.toLowerCase() === want.toLowerCase())
    || list.find((c) => c.name.toLowerCase().includes(want.toLowerCase()));
  return hit ? { name: hit.name, token: hit.token, host: hit.host } : { name: want, token: want };
}

async function get(url, ms = 20000) {
  const res = await fetch(url, { signal: AbortSignal.timeout(ms) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const strip = (s = "") => String(s).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const locOf = (...parts) => parts.find((p) => p && String(p).trim()) || "Remote";
const typeOf = (t = "") => /intern|trainee|apprentice|new grad/i.test(t) ? "Internship" : "Full-time";

function toShape(prefix, raw, company, map) {
  const m = map(raw);
  if (!m.title) return null;
  const text = `${m.title} ${m.desc}`;
  const role = guessRole(text);
  if (!role) return null; // ponytail: unmapped → dropped, same rule as live feed
  return {
    id: `${prefix}-${m.id}`,
    role,
    title: m.title.trim().slice(0, 120),
    company,
    loc: String(m.loc || "Remote").slice(0, 60),
    type: typeOf(`${m.title} ${m.employment || ""}`),
    skills: extractSkills(text),
    minScore: 45,
    apply: m.url || "#",
    description: strip(m.desc).slice(0, 600),
    src: prefix,
  };
}

async function fetchGreenhouse({ name, token }) {
  const d = await get(`https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs?content=true`);
  return (d.jobs || []).slice(0, MAX).map((j) => toShape("gh", j, name, (x) => ({
    id: x.id, title: x.title, loc: locOf(x.location?.name), url: x.absolute_url,
    desc: x.content || "", employment: (x.metadata || []).map((m) => m.value).join(" "),
  })));
}

async function fetchLeverBoard({ name, token, host }) {
  const hosts = host === "eu"
    ? ["https://api.eu.lever.co/v0/postings"]
    : ["https://api.lever.co/v0/postings", "https://api.eu.lever.co/v0/postings"];
  let lastErr;
  for (const base of hosts) {
    try {
      const d = await get(`${base}/${encodeURIComponent(token)}?mode=json&limit=50`);
      return (Array.isArray(d) ? d : []).slice(0, MAX).map((j) => toShape("lever", j, name, (x) => ({
        id: x.id, title: x.text, loc: locOf((x.categories?.allLocations || []).join("/"), x.categories?.location),
        url: x.hostedUrl, desc: [x.descriptionPlain, (x.lists || []).map((l) => l.content).join(" ")].join(" "),
        employment: x.categories?.commitment,
      })));
    } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

async function fetchAshby({ name, token }) {
  const d = await get(`https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(token)}`);
  return (d.jobs || []).filter((j) => j.isListed !== false).slice(0, MAX).map((j) => toShape("ashby", j, name, (x) => ({
    id: x.id, title: x.title, loc: locOf(x.locationName, (x.secondaryLocations || []).join("/")),
    url: x.jobUrl, desc: x.descriptionPlain || x.descriptionHtml || "", employment: x.employmentType,
  })));
}

const TARGETS = [
  ...split(args.gh).map((w) => ({ p: "gh", c: resolve("gh", w), fn: fetchGreenhouse })),
  ...split(args.lever).map((w) => ({ p: "lever", c: resolve("lever", w), fn: fetchLeverBoard })),
  ...split(args.ashby).map((w) => ({ p: "ashby", c: resolve("ashby", w), fn: fetchAshby })),
];

if (!TARGETS.length) {
  console.log("usage: npm run boards -- --gh=stripe --lever=lever --ashby=linear,ashby [--max=40]");
  process.exit(1);
}

const seen = new Set();
const jobs = [];
for (const t of TARGETS) {
  try {
    const rows = (await t.fn(t.c)).filter(Boolean);
    let added = 0;
    for (const j of rows) {
      const k = `${j.title.toLowerCase()}|${j.company.toLowerCase()}`;
      if (seen.has(k)) continue;
      seen.add(k);
      jobs.push(j);
      added++;
    }
    console.log(`${t.p}/${t.c.name}: ${rows.length} fetched, ${added} kept`);
  } catch (e) {
    console.error(`${t.p}/${t.c.name}: FAILED (${e.message})`);
  }
}

const names = TARGETS.map((t) => `${t.p}:${t.c.name}`).join(", ");
const out = `// auto-generated by npm run boards -- do not hand-edit.\n// boards: ${names} · ${jobs.length} kept (per-board cap ${MAX}) · ${new Date().toISOString().slice(0, 10)}.\n/* eslint-disable */\nexport const BOARDS_JOBS = ${JSON.stringify(jobs, null, 2)};\n`;
writeFileSync(join(HERE, "..", "src", "data", "boardsSeed.js"), out);
console.log(`boards: ${jobs.length} jobs → app/src/data/boardsSeed.js`);
