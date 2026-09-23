# PRD: Avsar Uniqueness Pillars

**Product:** Avsar (SIH 2026, Ministry of Ayush, NCISM-aligned career platform)
**Document status:** Draft for team review
**Scope:** Five features that raise the uniqueness score from 5/10, without rebuilding the existing assess → upskill → intern loop
**Companion plan:** `~/.commandcode/plans/avsar-uniqueness-pillars.md`

---

## 1. Problem statement

### 1.1 Judge feedback

Judges scored Avsar 7-8 on most metrics but **5 on uniqueness**. Their words: uploading a resume, having AI detect gaps, and helping the student upskill is already an existing product, and they named a competitor site. The same criticism applies to job matching, quests and XP, and portfolio dashboards.

### 1.2 Root cause

The problem is not polish or depth. It is **categorical overlap**. Avsar's headline loop, as currently pitched and demoed, is a well-executed version of a product category that already has many players:

| Feature | Category it falls into | Why judges called it derivative |
|---|---|---|
| Resume upload, ATS score | Resume scorers | Numerous free tools do keyword scoring |
| AI gap detection | LLM resume assistants | Now commodity since LLMs became cheap |
| Quests, XP, streaks | Gamified ed-tech | Standard ed-tech loop |
| Job feed with fit score | Job matching | Every board and aggregator has this |
| Institute / faculty dashboards | LMS and placement portals | Common in college software |

Improving any of these moves the score by 0. Hardening the loop is not the fix. **Changing what the product fundamentally is, is the fix.**

### 1.3 The opportunity already sitting in the repo

Three assets exist in the codebase that no competitor has, and that are currently invisible:

1. **A demand-weight hook that was never implemented.**
   `src/data/taxonomy.js` line 34 documents: `demandWeight: editable multiplier; postings nudge it via match.js recompute`. That recompute does not exist. `match.js` only reads the static constant. Separately, `scripts/boards.mjs` already fetches posting dates from three ATS APIs (Greenhouse `updated_at`, Ashby `publishedAt`, Lever `createdAt`) and discards all of them. The data needed to make the engine market-aware is already arriving and being thrown away.

2. **A skill graph that is never traversed as a graph.**
   `taxonomy.js` holds 78 skills, each with `related[]` edges, `halfLifeDays` decay, `demandWeight`, and an NSQF level. Nothing in the app walks those edges. There is no pathfinding, no shortest route, no simulation.

3. **A proof pipeline that is real but invisible.**
   `src/ayush/proof.js` implements five verification paths (case log, mentor sign-off, certificate, orientation, quiz), feeds a `verified` ratio into the match score's 15% factor, and is fundamentally different from a claim based resume. In a 5 minute demo, a judge never sees it.

### 1.4 The strategic insight

Every competitor asks the student to fit a **static rubric**. Avsar can be the platform where the rubric itself is **recalibrated by the live labour market**, where the path to a job is **computed as a route rather than listed as courses**, and where hiring happens on **blind, tamper-evident proof instead of a PDF**.

---

## 2. Goals

### 2.1 Primary goal

Raise the uniqueness score from 5 to 8+ by shipping features that are **structurally absent** from competing career platforms, demoable in under 90 seconds each, and built on infrastructure already present in the codebase.

### 2.2 Secondary goals

- Strengthen the Ministry of Ayush / NCISM narrative with policy-grade tooling (district planning, no-PII aggregation).
- Make the existing differentiated work (proof ledger, deterministic engine, offline-first architecture) **visible to a judge**.
- Preserve every existing architectural contract: offline-first, keyless, deterministic scoring, no page-local math.

### 2.3 Non-goals

- Building a real backend, real auth, or a production deployment.
- Replacing or redesigning the resume scoring, job feed, quests, or interview systems.
- Adding blockchain, which is a crowded and credibility-damaging choice for a hackathon.
- Training or fine-tuning any model. AI remains a fallback-null assist, never a scorer.

### 2.4 Success metrics

| Metric | Target | How measured |
|---|---|---|
| Judge uniqueness score | 8+ | Feedback after demo |
| Features a judge can see in 90 seconds | 4 | `/labs` demo path rehearsal |
| Existing tests still green | 100% | `node --test` |
| Screens that work with zero keys and no network | All new screens | Airplane-mode rehearsal |
| New pure modules with test coverage | 5 of 5 | `tests/*.test.js` |
| New runtime dependencies | 0 | `package.json` diff |

---

## 3. Users and personas

| Persona | Role key | Primary need | What the new pillars give them |
|---|---|---|---|
| Tier-2/3 engineering student | `student` | Know which skill actually unlocks a job | Market Pulse + Career GPS route and simulator |
| BAMS intern or young vaidya | `ayush` | Turn clinical work into verified proof | Proof-of-Skill challenges, signed receipts, ledger surfaced |
| Hospital or industry recruiter | `industry` | Screen without pedigree bias, see real ability | Blind shortlist, deterministic proof grading, audit trail |
| Placement officer | `institute` | Plan training capacity against real demand | District Skill Thermometer, privacy-safe aggregates |
| Faculty or FDP coordinator | `faculty` | Align curriculum with employer demand | Market Pulse feeding the same corpus |
| District or ministry officer | not yet in RBAC | Where to fund training capacity | Signed aggregate export, k-anonymous, zero PII |

New RBAC consideration: the district officer persona is served by the `institute` desk rather than a new role, to avoid expanding the role matrix in this release. Flagged as an open question in section 12.

---

## 4. Positioning

**One sentence:** Avsar does not score resumes. It runs a labour market.

**The three-part claim, each backed by a shipped feature:**

1. *The score is not our opinion, it is the market's.* Live postings recompute skill demand, which changes match scores, with the delta shown and explained (Pillar 1).
2. *You get a route, not a reading list.* Graph search over the skill graph plus a what-if simulator that tells you what a skill unlocks before you invest the effort (Pillar 2).
3. *Hiring runs on blind, tamper-evident proof.* Deterministic rubric grading, signed receipts, identity-blind shortlists, auditable reveals (Pillars 3 and 4).

**Comparison framing used on the `/labs` page:**

| What every other platform does | What Avsar does |
|---|---|
| Shows a static "in-demand skills" chart beside your score | Feeds the live corpus into the scoring weights, so the score itself moves with the market |
| Lists recommended courses | Computes the shortest route across a skill graph, weighted by real openings, with a simulator |
| Screens resumes with an opaque or AI ranker | Grades deterministic proof-of-skill submissions, blind, with signed receipts |
| Centralises student data in a cloud dashboard | Keeps records on the device, exports only k-anonymous signed aggregates (DPDP by construction) |

---

## 5. Feature specifications

### 5.1 Pillar 1: Market Pulse

**Problem:** demand data, if it exists on a competing platform, is decorative. It never touches the score.

**Solution:** the scraped corpus computes a per-skill demand index that blends into the matching engine's weights.

#### User stories

- As a student, I want to see which skills are rising and cooling so that I invest effort where hiring is actually moving.
- As a student, I want the job fit scores to reflect real current demand, and to see that the adjustment happened, so I trust the number.
- As a placement officer, I want demand by city and by skill so that I can brief the principal with numbers.
- As any user, I want stale postings marked so I stop applying to ghost jobs.

#### Functional requirements

| ID | Requirement | Priority |
|---|---|---|
| MP-1 | Compute per-skill demand from the merged corpus (bundled seeds plus live feeds) | Must |
| MP-2 | Normalise demand into the taxonomy's existing `0.6` to `1.5` weight band | Must |
| MP-3 | Blend static `demandWeight` with the live index, 50/50, clamped to `0.6` to `1.5` | Must |
| MP-4 | Feed blended weights into match scoring without changing default behaviour | Must |
| MP-5 | Expose the live weights on `/match` so the published formula is not a lie | Must |
| MP-6 | Show a market badge and a `why[]` line when a score used blended weights | Must |
| MP-7 | Trend per skill: rising, stable, cooling | Must |
| MP-8 | City level demand | Should |
| MP-9 | Salary band parsing into min, max, band; `null` when undisclosed | Should |
| MP-10 | Stale posting detection, collapsed into a "possibly closed" group with restore | Should |
| MP-11 | Snapshot history in local storage so trend is honest over time, not inferred from one scrape | Should |
| MP-12 | Corpus stats: total, by source, by role, freshest timestamp | Must |
| MP-13 | Cap the market influence so a small scrape cannot distort scores | Must |

#### Data contracts

```js
// marketIndex(jobs) -> Map<canonicalSkillId, number in [0.6, 1.5]>
// blendWeight(skillId, jobs) -> number in [0.6, 1.5]
// marketSignals(jobs, { now }) ->
//   [{ skill, demand, share, freshShare, trend: "rising"|"stable"|"cooling",
//      cities: [{ city, count }], sources: [{ src, count }] }]
// corpusStats(jobs) -> { total, bySource, byRole, byCity, freshestAt }
// staleJobs(jobs, now, days = 30) -> { fresh: [], stale: [] }
// salaryBand(job) -> { min, max, band } | null
// recordSnapshot(jobs) / marketMemory() -> [{ at, total, perSkill }]
```

#### Edge cases

- **Empty corpus.** Fall back to static taxonomy weights. Never divide by zero. Never render an empty chart without an empty state.
- **Skill with zero postings.** Excluded from the index; static weight applies unchanged.
- **Single digit sample sizes.** A skill appearing in 2 of 100 postings must not receive a top weight. Clamping plus a minimum sample threshold handle this.
- **No dates available.** `trend` degrades to `"stable"` and the UI says why, rather than inventing a direction.
- **Seed fixtures are point-in-time.** The snapshot store makes the second run more informative than the first. This is honest and should be stated in the UI.

#### UI surfaces

- `/market` (new): corpus stats, rising and cooling skills, demand versus the student's verified supply, city demand, salary bands, source mix, freshness clock, snapshot trend.
- `/match` (modified): live weights rendered from `effectiveWeights(jobs)` instead of `MATCH_WEIGHTS` constants, plus which skills shifted and why.
- `/jobs` (modified): market badge on the fit ring when blended weights were used, a market `why[]` line per shifted skill in `EngineFit`, stale group with restore.
- `/institute` (modified): the demand versus supply panel currently uses 24 postings from one portal with an empty supply array. Point it at the full corpus per lane.

#### Dependencies

Requires the data spine (section 6.1) for real dates. Without dates, MP-7 and MP-11 are fiction and should not ship as if they were real.

---

### 5.2 Pillar 2: Career GPS

**Problem:** every platform answers "what should I learn" with a course list. Nobody answers "what does learning this actually unlock, and what is the shortest route from what I already have".

**Solution:** graph search over the taxonomy, weighted by real openings, plus a counterfactual simulator.

#### User stories

- As a student, I want to know the shortest route from my current skills to a target role so that I stop starting from scratch.
- As a student, I want to simulate adding a skill and see how many postings unlock and how much fit I gain before I commit.
- As a student, I want each route step to be grounded in a specific set of openings so it does not feel generic.
- As a student with verified proof, I want proof to count more than a claim in the simulation.

#### Functional requirements

| ID | Requirement | Priority |
|---|---|---|
| CG-1 | Build an undirected adjacency map from the taxonomy `related[]` edges | Must |
| CG-2 | Compute BFS hop distance from the nearest owned skill for every gap | Must |
| CG-3 | Order route steps by unlocks divided by (hops + 1) | Must |
| CG-4 | Attach the concrete postings each step unlocks | Must |
| CG-5 | Simulator: toggle skills and proof, recompute across the corpus | Must |
| CG-6 | Report before and after eligible counts, average fit delta, unlocked list | Must |
| CG-7 | Reuse `matchJobPost` and `profileForMatching` unchanged so the simulator cannot drift from the engine | Must |
| CG-8 | Effort expressed as course hours where known, never as calendar promises | Must |
| CG-9 | Route must be explainable: every step shows its reason | Must |
| CG-10 | Link each unlocked posting into the feed | Should |

#### Data contracts

```js
// skillGraph() -> Map<skillId, Set<skillId>>
// routeTo(targetRoleId, held) ->
//   [{ skill, hops, fromSkill, unlocks, postings: [jobId], reason }]
// simulate({ add: [{ skill, verified }] }, { jobs, held, lane }) ->
//   { before: { eligible, avgFit }, after: { eligible, avgFit },
//     deltaFit, unlocked: [job], locked: [job] }
// effortHours(steps) -> { hours, known: number, unknown: number }
```

#### Edge cases

- **Zero held skills.** Route degenerates to "start anywhere"; present the highest demand gateway skill first and say so.
- **Target role already satisfied.** Return an empty route with a "you already qualify" state that lists eligible openings.
- **Disconnected graph nodes.** Some skills have no `related[]` edges. Treat unreachable gaps as hops equal to `Infinity` for ordering, still list them, never crash.
- **Lane mismatch.** A tech profile must never receive ayush route steps. The lane drives the taxonomy role and the corpus slice.

#### UI surfaces

- `/gps` (new): a numbered stop strip, each stop showing unlocks and a jump link; a simulation panel with skill toggles and a verified switch; `CountUp` deltas; unlocked postings list.
- `/journey` (modified): the Improve tab links into `/gps` for the missing list so the first-login loop ends on a route.

---

### 5.3 Pillar 3: Proof-of-Skill hiring

**Problem:** applications are claims. Screening is opaque and pedigree-biased. AI rankers make it worse by hiding the reasoning.

**Solution:** employers attach small challenges to postings. Submissions are graded by the same deterministic rubric the candidate can inspect, receive a cryptographically signed receipt, and enter an identity-blind shortlist. Identity unblinds only after the decision, and the reveal is logged.

#### User stories

- As a student, I want to prove a skill with a small artifact so that I am judged on ability, not on my college name.
- As a student, I want to see exactly why I scored what I scored so that I can improve.
- As a recruiter, I want a ranked pool of demonstrated ability so that screening takes minutes.
- As a recruiter, I want to screen without names or colleges so that my shortlist is defensible.
- As a recruiter, I want a signed receipt trail so that a decision cannot be quietly altered later.

#### Functional requirements

| ID | Requirement | Priority |
|---|---|---|
| PS-1 | Challenge model: id, job link, title, brief, skill, kind, evidence type, threshold, deadline | Must |
| PS-2 | Deterministic grading reusing the rubric style of `score.js`, never AI scoring | Must |
| PS-3 | Grading output includes `why[]` so the candidate sees the derivation | Must |
| PS-4 | Submission requires a valid evidence URL, reusing `isEvidenceUrl` | Must |
| PS-5 | Signed receipt per submission using WebCrypto ECDSA P-256 | Must |
| PS-6 | Stable anonymous handle per device per challenge (`blindId`) | Must |
| PS-7 | Blind shortlist view: no name, college, gender, or device id visible | Must |
| PS-8 | Reveal action gated behind a shortlist decision, logged with time, actor, reason | Must |
| PS-9 | Seeded challenge templates per lane so the demo works offline with zero setup | Must |
| PS-10 | Employer post-challenge flow on the industry desk, local-first with best-effort Supabase | Should |
| PS-11 | Receipt verification offline via QR and payload check | Should |
| PS-12 | v1 credentials in `verify.js` must keep validating; add v2 alongside | Must |

#### Data contracts

```js
// challenge
{ id, jobId, lane, title, brief, skill, kind: "build"|"write"|"case-log"|"quiz",
  evidence: "url", threshold, deadline, blind: true, createdBy, at }

// submission
{ id, challengeId, blindId, lane, evidenceUrl, note, at,
  grade: { score, why: [string], matchedEvidence: [string] },
  receipt: { payload, sig, kid, alg, mode } }

// gradeSubmission(challenge, submission) -> { score, why, matchedEvidence }
// blindId(deviceId, challengeId, salt) -> string
// rankSubmissions(list) -> sorted list
// shortlist(list, { threshold }) -> { in: [], out: [] }
// revealIdentity(submissionId, { by, reason }) -> audit entry { at, by, reason }
```

#### Edge cases

- **`crypto.subtle` unavailable** (node tests, older browsers). Degrade to the existing `hashStr` mode, label the mode honestly in the UI, and never claim cryptographic strength that is not present.
- **Tampered receipt.** One character change must fail verification with an explicit tamper message.
- **Duplicate or junk evidence URLs.** Reuse the length floor and format gate in `isEvidenceUrl`.
- **Employer views own submission.** Blind mode still applies; the audit trail is the point.
- **Offline employer review.** Shortlisting must work with no network; the Supabase mirror is optional.

#### UI surfaces

- `/challenges` (new, student): open challenges per lane, brief, submission box, receipt card with QR.
- `/shortlist` (new, employer desk, guarded to the `industry` role): ranked blind cards, score breakdown, proof bundle links, shortlist action, reveal gate, audit log.
- `/industry` (modified): post a challenge.
- `/portfolio` (modified): signed receipt, v2 credential QR, "verify offline" note.

---

### 5.4 Pillar 4: District Skill Thermometer and PII-free aggregation

**Problem:** placement cells plan training with no demand data. Ministry and district officers cannot act on student data that is either too granular (privacy) or too coarse (useless). India's DPDP Act 2023 makes centralising student PII a liability.

**Solution:** the same corpus that drives Market Pulse drives a demand versus supply planner, and exports only k-anonymous signed aggregates.

#### User stories

- As a placement officer, I want to know which skills have unmet local demand so that I can plan a batch.
- As a district officer, I want a tamper-evident aggregate so that I can trust it without seeing any student record.
- As a student, I want assurance that my records stay on my device.

#### Functional requirements

| ID | Requirement | Priority |
|---|---|---|
| DT-1 | `districtDemand(jobs)` -> demand grouped by city | Must |
| DT-2 | `unmetDemand(demand, supply)` -> demand minus verified local supply | Must |
| DT-3 | `capacityPlan(unmet, { batchSize })` -> batches needed to close each gap | Must |
| DT-4 | `privacyAggregate(rows, k = 5)` -> suppress any bucket with fewer than k records | Must |
| DT-5 | Signed aggregate export via `sign.js` so the figure is tamper-evident | Should |
| DT-6 | Visible statement that zero personal records leave the device | Must |
| DT-7 | Suppression must be visible, not silent, so the reader knows a bucket was withheld | Must |

#### Edge cases

- **All buckets suppressed.** Render an explicit "insufficient cohort size" state, not an empty chart.
- **Tiny cohort.** A demo cohort of 8 will suppress most buckets at k=5. Ship an explanatory note and a k control set to 5 by default.
- **Mixed lanes.** Never aggregate across lanes in one figure.

---

### 5.5 Pillar 5: `/labs`, the judge-facing page

**Problem:** uniqueness that a judge cannot see in 90 seconds scores the same as uniqueness that does not exist.

**Solution:** a public route that frames the difference with working widgets and a reproducible demo path.

#### Functional requirements

| ID | Requirement | Priority |
|---|---|---|
| LB-1 | Public route, renders before onboarding, no profile required | Must |
| LB-2 | Comparison table: what every other platform does versus what Avsar does | Must |
| LB-3 | Four live mini-widgets: market index recompute, route simulation, blind shortlist preview, offline receipt verification | Must |
| LB-4 | A 60 second demo path strip listing exact clicks | Must |
| LB-5 | States clearly which parts work with zero keys and no network | Must |
| LB-6 | No emoji, no em dashes, consistent with existing copy rules | Must |

---

## 6. Technical architecture

### 6.1 Data spine (prerequisite)

| Item | Change | Reason |
|---|---|---|
| `scripts/boards.mjs` | Map Greenhouse `updated_at`, Ashby `publishedAt`, Lever `createdAt` into `postedAt` (ISO) | The APIs already return dates; today they are discarded, so trend analysis is impossible |
| `scripts/naukri.mjs` | Convert relative `posted` strings into `postedAt` at import time; keep the raw string for display | Only seed with any date signal, currently unusable for trend |
| `package.json` | Add `"boards": "node scripts/boards.mjs"` | README documents `npm run boards` but the script key is missing, so seeds cannot be regenerated |
| `src/data/boardsSeed.js`, `src/data/naukriSeed.js` | Regenerate | Carry the new field |

### 6.2 New modules

All under `src/lib/`, all pure, all covered by `node --test`:

| Module | Responsibility | Key exports |
|---|---|---|
| `market.js` | Corpus aggregation, demand index, trend, staleness, salary bands, snapshots | `marketIndex`, `blendWeight`, `marketSignals`, `corpusStats`, `staleJobs`, `salaryBand`, `recordSnapshot`, `marketMemory` |
| `careerGps.js` | Graph construction, route search, counterfactual simulation | `skillGraph`, `routeTo`, `simulate`, `effortHours` |
| `sign.js` | WebCrypto ECDSA P-256 signing, verification, hash chain, graceful hash fallback | `generateIssuerKeypair`, `signPayload`, `verifySigned`, `fingerprint`, `chainHash`, `signingMode` |
| `challenges.js` | Challenge store, deterministic grading, blind handles, shortlisting, audit | `loadChallenges`, `saveChallenge`, `gradeSubmission`, `blindId`, `rankSubmissions`, `shortlist`, `revealIdentity` |
| `district.js` | City demand, unmet demand, capacity planning, k-anonymous aggregation | `districtDemand`, `unmetDemand`, `capacityPlan`, `privacyAggregate` |

### 6.3 Modified modules

| Module | Change | Backwards compatibility rule |
|---|---|---|
| `match.js` | Optional `weights` parameter; new `effectiveWeights(jobs)` | Default path must produce identical output; `MATCH_WEIGHTS` remains the published baseline |
| `dashboard.js` | `demandHeatmap` gains optional market index argument | Existing three-argument calls unchanged |
| `verify.js` | Add v2 signed credentials alongside v1 | v1 codes must still validate, existing QRs must not break |
| `rbac.js` | Add `labs` to public segments; add `challenges`; add `shortlist` to the industry desk | Route matching stays by first path segment |

### 6.4 Shell and routing

| Route | Page | Access |
|---|---|---|
| `/market` | `MarketPulse.jsx` | Students and ayush |
| `/gps` | `CareerGps.jsx` | Students and ayush |
| `/challenges` | `Challenges.jsx` | Students and ayush |
| `/shortlist` | `Shortlist.jsx` | `industry` desk only |
| `/labs` | `Labs.jsx` | Public, renders before onboarding |

### 6.5 Storage keys (local-first, consistent with existing conventions)

| Key | Contents |
|---|---|
| `avsar-market-history-v1` | Dated corpus snapshots for honest trend |
| `avsar-challenges-v1` | Challenges, local plus best-effort Supabase mirror |
| `avsar-submissions-v1` | Submissions with grades and signed receipts |
| `avsar-shortlist-audit-v1` | Shortlist decisions and identity reveals |
| `avsar-issuer-key-v1` | Device issuer keypair (JWK) for receipt signing |

### 6.6 Architectural contracts preserved

1. **Offline first.** Every new screen works with no keys, no network, and no Supabase. Live feeds degrade to bundled seeds.
2. **Local storage is the source of truth.** Supabase remains a best-effort mirror via `backend.js` patterns.
3. **Determinism.** AI never assigns a score. Market weights come from data, not from a model. The existing rule "models propose, rubric disposes" is extended, not weakened.
4. **Thin pages.** All math lives in tested `src/lib` modules. No page-local scoring logic.
5. **Dependency-free visuals.** No new npm packages. Charts remain SVG and CSS.
6. **Copy rules.** No em dashes, no emoji, every button performs a real action.

---

## 7. Non-functional requirements

| Category | Requirement |
|---|---|
| Performance | Market aggregation over roughly 100 bundled plus 50 live postings must complete in a single pass, memoised per render, no layout thrash |
| Bundle size | No new runtime dependencies; `sign.js` uses built-in `crypto.subtle` |
| Privacy | No PII leaves the device by default; aggregates suppress buckets below k (default 5); the suppression is visible |
| Security honesty | The hash fallback mode must be labelled as weaker; never present FNV as cryptographic |
| Accessibility | New pages reuse existing primitives with their established focus, label, and reduced-motion behaviour; route strips are navigable and labelled |
| Testability | Five new pure modules each with a `node --test` file; the default scoring path is regression tested |
| Browser support | WebCrypto guarded with a feature check; degraded mode functional |

---

## 8. Phases

| Phase | Deliverable | Exit criteria |
|---|---|---|
| 0 | Data spine | `postedAt` present in regenerated seeds; `npm run boards` works; tests green |
| 1 | Market Pulse | `market.js` tested; blended weights reachable behind an explicit path; `/market` shipped; `/match` and `/jobs` updated; Institute uses the full corpus |
| 2 | Career GPS | `careerGps.js` tested; `/gps` shipped; simulator matches engine output; `/journey` links in |
| 3 | Proof-of-Skill | `sign.js` and `challenges.js` tested; `/challenges` and `/shortlist` shipped; receipt verifies offline; v1 credentials still validate |
| 4 | District Thermometer | `district.js` tested; institute panel shows unmet demand and suppression |
| 5 | `/labs` | Public route renders before onboarding; four live widgets; demo path strip |
| 6 | Hardening | README section, copy pass, `npm run lint`, `npm run build`, full `node --test` |

**Cut order if scope shrinks:** Pillar 5 framing, then Pillar 4, then Pillar 3's employer side. Pillars 1 and 2 are load-bearing and Pillar 1 is the cheapest single win.

---

## 9. Verification plan

### Automated

- `node --test` with all existing suites green. `tests/match.test.js` specifically proves the default scoring path is unchanged.
- New suites: `market`, `careerGps`, `sign`, `challenges`, `district`, plus a market-weights case added to `match`.
- `npm run lint` clean.
- `npm run build` clean.

### Manual rehearsal, no keys, no network

1. `/labs` renders before onboarding completes.
2. `/market` corpus stats match the seed header date and source counts.
3. `/match` shows live weights; toggling the market adjustment visibly moves a fit score.
4. `/gps` simulates adding a skill; the unlocked list matches the real feed.
5. Post a challenge on the industry desk, submit as a student, appear in `/shortlist` as a blind handle, shortlist, then reveal, then confirm the audit log entry.
6. `/verify/<code>` validates a v2 receipt; a one character edit fails with a tamper message.
7. `/institute` shows the district panel and a suppressed bucket when the count is below k.
8. Airplane mode: repeat steps 2, 4, and 5 with caching enabled.

---

## 10. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Seed corpus is small and concentrated (board seed currently survives mainly from two companies) | Market signals look thin | Re-run the board import with wider token lists from `scripts/vendor/`; always display corpus size alongside signals; clamp weights; state sample sizes |
| Dates unavailable for some sources | Trend is unprovable | Degrade trend to stable and say so; snapshot history builds real trends over repeated runs |
| Judges interpret "market-adjusted score" as manipulation | Trust loss | Keep `MATCH_WEIGHTS` as the published baseline, show both weights side by side, and show the per-skill delta |
| Hash fallback presented as cryptography | Credibility damage | Explicit `signingMode` surfaced in the UI and in receipts |
| Blind hiring seen as gimmick | Weakens the strongest claim | Ship the auditable reveal log, and frame it exactly as designed: screening happened without identity in the room |
| Scope creep across 5 pillars | Nothing finishes | Phase gates in section 8, explicit cut order, Pillars 1 and 2 first |
| Small demo cohort triggers k-anonymity suppression everywhere | Empty looking institute page | Explain suppression in the UI, and ship a k control defaulting to 5 |
| New pages dilute the existing narrative | Demo loses focus | `/labs` is the spine of the demo; every other page is evidence reachable from it |

---

## 11. Out of scope

- Real employer accounts, verification, or billing.
- Server side persistence guarantees, migrations, or RLS policy authoring.
- Blockchain or any distributed ledger claim.
- Automated scraping triggered from the browser.
- Changes to the resume scoring rubric, quests economy, or interview grading.
- Regionally localised copy for the new pages beyond the existing EN and HI support.
- Native mobile clients and IVR or SMS channels.

---

## 12. Open questions

1. **District officer persona.** Serve it from the existing `institute` desk, or add a sixth role to `rbac.js`? Current draft keeps it inside `institute` to avoid expanding the role matrix.
2. **Market adjustment default.** On by default with a visible badge and toggle, or off by default with an opt-in? Current draft argues for on by default, since the whole claim is that the market drives the score.
3. **Challenge authoring for the demo.** Seed templates only, or also the live employer flow? Current draft includes both, with seeds carrying the offline demo.
4. **Which AYUSH challenges to seed.** Case-log review and pharmacovigilance ADR write-ups are the obvious candidates, but a mentor sign-off challenge may demo better.
5. **Whether to re-run the board import with more companies before the demo.** This materially improves Market Pulse credibility and depends on network access at build time.

---

## 13. Demo script (60 to 90 seconds)

1. Open `/labs`. One sentence of positioning.
2. Market Pulse widget: show demand recomputing from the corpus, then jump to `/match` and show the same score moving under market-adjusted weights.
3. Career GPS widget: toggle one skill and one proof, show unlocked postings and the fit delta, then open one unlocked posting in the feed.
4. Proof-of-Skill: submit a seeded challenge as a student, show the deterministic `why[]`, the signed receipt, and its QR.
5. Switch to the employer desk: the same submission appears as a blind handle with a score, shortlist it, then reveal, then show the audit log entry.
6. Close on the district panel: unmet local demand, a capacity recommendation, and a suppressed small bucket, proving no PII left the device.

---

## Appendix A: Glossary

| Term | Meaning |
|---|---|
| Corpus | The merged set of job postings: bundled seeds plus live feeds |
| Demand index | Normalised per-skill posting frequency, clamped to the taxonomy weight band |
| Blended weight | 50/50 combination of static `demandWeight` and the live demand index |
| Route | The ordered list of gap skills from current strengths to a target role |
| Blind ID | Stable anonymous handle derived from device id and challenge id |
| Receipt | Signed payload proving a submission was graded at a point in time |
| k-anonymity | Suppressing any aggregate bucket containing fewer than k records |
| DPDP | India's Digital Personal Data Protection Act, 2023 |

## Appendix B: File manifest

**New:** `src/lib/market.js`, `src/lib/careerGps.js`, `src/lib/sign.js`, `src/lib/challenges.js`, `src/lib/district.js`, `src/pages/MarketPulse.jsx`, `src/pages/CareerGps.jsx`, `src/pages/Challenges.jsx`, `src/pages/Shortlist.jsx`, `src/pages/Labs.jsx`, `src/data/challengeTemplates.js`, `tests/market.test.js`, `tests/careerGps.test.js`, `tests/sign.test.js`, `tests/challenges.test.js`, `tests/district.test.js`

**Modified:** `src/lib/match.js`, `src/lib/dashboard.js`, `src/lib/verify.js`, `src/lib/rbac.js`, `src/app/shell.jsx`, `src/pages/Jobs.jsx`, `src/pages/Match.jsx`, `src/pages/Journey.jsx`, `src/pages/Institute.jsx`, `src/pages/Industry.jsx`, `src/pages/Portfolio.jsx`, `scripts/boards.mjs`, `scripts/naukri.mjs`, `package.json`, `src/data/boardsSeed.js`, `src/data/naukriSeed.js`, `tests/match.test.js`, `README.md`
