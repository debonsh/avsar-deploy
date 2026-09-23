# Avsar

Two portals, one build: Vaidya (BAMS / ayurveda) and Tech. Pick a side at `/`
and the app takes on its own theme, nav, seeds, scoring rubric, and question
bank. Vite plus React plus React Router plus Tailwind v4, no chart or animation
libraries (charts are dependency-free SVG).

## Commands (run inside `app/`)

- `npm run dev`: local server.
- `node --test "tests/*.test.js"`: unit suites for `src/lib` and `src/data`.
- `npm run build`: production build, must stay clean.
- `npm run lint`: oxlint, must stay clean.
- `npm run scrape`: live job boards to the terminal.
- `npm run jobs:import -- --in=<file>`: naukri scraper JSON into `src/data/naukriSeed.js`.
- `npm run boards -- --gh=stripe --ashby=linear`: ATS boards into `src/data/boardsSeed.js`.

## Conventions

- Pages stay thin: cross-page state lives in `src/app/store.jsx`, logic lives
  in tested `src/lib` functions, shared visuals live in
  `src/components/ui.jsx`. No page-local copies of scoring or matching math.
- LocalStorage is the source of truth, Supabase (`src/lib/backend.js`) is a
  best-effort mirror. Every screen works with no keys configured.
- UI copy has no em dashes and no emoji. Every button does something real.
# avsar-deploy
# avsar-deploy
