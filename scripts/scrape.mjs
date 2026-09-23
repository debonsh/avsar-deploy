// scrape: terminal-initiated job run. Same keyless sources as the app fetcher,
// no CORS limits in node. Writes a dated md file under .scratch/ for her query.
// ponytail: JSON APIs only — no headless browser, no cheerio, nothing to maintain.
// usage: npm run scrape -- --skill=react [--loc=remote]
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const m = a.replace(/^--/, "").split("=");
  return [m[0], m[1] ?? true];
}));
const skill = String(args.skill || "developer");
const loc = String(args.loc || "remote");

async function get(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

const strip = (s = "") => String(s).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const has = (t, k) => t.toLowerCase().includes(k.toLowerCase());

const jobs = [];
try {
  const d = await get(`https://remotive.com/api/remote-jobs?limit=20&search=${encodeURIComponent(skill)}`);
  for (const j of d.jobs || []) jobs.push({ src: "remotive", title: j.title, co: j.company_name, url: j.url });
} catch (e) { console.error("remotive:", e.message); }
try {
  const d = await get("https://www.arbeitnow.com/api/job-board-api");
  for (const j of (d.data || [])) {
    const t = `${j.title} ${(j.tags || []).join(" ")}`;
    if (has(t, skill) || (loc === "remote" && j.remote)) jobs.push({ src: "arbeitnow", title: j.title, co: j.company_name, url: j.url });
  }
} catch (e) { console.error("arbeitnow:", e.message); }

const day = new Date().toISOString().slice(0, 10);
const md = [`# Jobs for "${skill}" — ${day}`, ``, ...jobs.slice(0, 30).map((j, i) => `${i + 1}. **${strip(j.title)}** @ ${strip(j.co)} [apply](${j.url}) _(${j.src})_`), ``, `_sources: remotive + arbeitnow, keyless. rerun: npm run scrape -- --skill=${skill}_`, ``].join("\n");
mkdirSync(join(root, "..", ".scratch"), { recursive: true });
const out = join(root, "..", ".scratch", `jobs-${skill}-${day}.md`);
writeFileSync(out, md);
console.log(`wrote ${out} (${jobs.length} postings)`);
