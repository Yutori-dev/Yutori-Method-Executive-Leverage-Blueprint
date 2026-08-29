# Yutori Method™ Executive Leverage Blueprint

Milestone 1 (Foundation + Configurable Activity Engine), Milestone 2 (Zone
of Investment + Delegation/Leverage), and Milestone 3 (Recommendation
Engine + Blueprint) are implemented and connected to a live Supabase
project.

This README covers what's implemented, how to run it, and what's explicitly
deferred to later milestones. See also:

- [`docs/CLIENT_QUESTIONS.md`](docs/CLIENT_QUESTIONS.md) — open questions for
  Yutori Method, consolidated for the shared Google Doc.
- [`docs/ARCHITECTURE_DECISIONS.md`](docs/ARCHITECTURE_DECISIONS.md) — choices
  made where the brief left room for engineering judgment, and why.
- [`docs/TESTING.md`](docs/TESTING.md) — acceptance gates for both milestones
  and what has/hasn't been run against a live environment.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind CSS v4)
- **Supabase** — Postgres, Auth (passwordless magic link), Row Level Security
- Deploys to Vercel; no separate servers, queues, or Redis

## What's built

**Milestone 1 — Foundation:**

- Database foundation: `participants`, `sessions`, `participant_sessions`,
  `modules`, `participant_module_progress`, plus the configurable activity
  engine tables (`assessments`, `questions`, `answer_options`, `responses`)
- Passwordless (magic-link) auth for participants, separately for admins
- Participant registration via a per-session join link, with duplicate
  registration prevented at the database level
- Participant dashboard showing the 7-module journey with
  LOCKED / OPEN / IN PROGRESS / COMPLETE state (Character stays locked until
  the live workshop, per the brief)
- Admin: magic-link sign-in gated by an allowlist, session create/edit,
  cohort-wide "unlock next module" with confirmation, participant roster
  with progress
- Row Level Security on every table; no service-role key in client code

**Milestone 2 — Zone of Investment + Delegation/Leverage:**

- Responsibility Library (20 dev-placeholder responsibilities, versioned,
  hidden leverage classification never exposed to participant queries)
- Responsibility selection (10–12, enforced server-side), competency +
  passion rating, and the 3×3 matrix → macro zone calculation — all driven
  by a configurable `zone_matrix_cells` table, not hardcoded
- Delegation Beliefs assessment reusing the Milestone 1 activity engine,
  plus a `assessment_results` scoring layer that computes real per-dimension
  aggregates but returns a controlled fallback (not an invented score) since
  no real scoring thresholds are configured yet
- Priority Delegation Opportunity selection (exactly 3, from responsibilities
  outside Zone of Investment only), with a leverage-level snapshot captured
  for future recommendation-engine use
- **Every derived value (matrix cell, macro zone, leverage snapshot, scoring
  result) is computed by `SECURITY DEFINER` Postgres functions, never
  trusted from the client** — verified live against the real database,
  including confirming a direct API write attempting to fake a matrix cell
  is rejected by RLS. See `docs/ARCHITECTURE_DECISIONS.md`.

**Milestone 3 — Recommendation Engine + Blueprint:**

- A real recommendation engine: computes the majority leverage-level signal
  across a participant's three Priority Delegation Opportunities, detects
  1/1/1 ties, and stores the full signal breakdown for an always-explainable
  rationale — looked up against a `recommendation_rules` table that ships
  empty, so every participant currently sees the brief's own specified
  fallback copy rather than an invented named recommendation
- Architecture reveal: a high-visibility, confirmation-gated admin control
  separate from module unlocking, plus the brief's "Your Blueprint is ready"
  holding state for participants who've calculated but not yet been revealed
  to — **the reveal gate lives in Row Level Security itself**, not just in
  what the page renders, verified by confirming a participant's direct
  database read of their own recommendation returns nothing before reveal
- The Architecture Reaction prompt (Yes / Mostly / Not yet + optional note),
  using the brief's exact specified copy
- A progressive Blueprint page (`/dashboard/[sessionId]/blueprint`)
  assembling everything captured so far — Character (locked), Operating
  Altitude answers, the Zone of Investment matrix, Delegation results, and
  the Architecture recommendation once revealed
- PDF export of the same Blueprint, generated on demand (no file storage),
  downloadable by the owning participant or an admin — verified end to end
  through real cookie-based HTTP requests, not just server-side function
  calls, including confirming an unrelated participant is denied

## What's deliberately not built yet

Per the brief's Content Dependency Register and the remaining Milestone 4
scope: final assessment/matrix/recommendation content, the Executive
Support Audit, White Whale, Success Vision, aggregate analytics, CSV
export, Presentation Mode. The schema is built so these can be added
without restructuring what's here — see `docs/ARCHITECTURE_DECISIONS.md`.

## Local setup

1. **Install dependencies**

   ```
   npm install
   ```

2. **Get the Supabase project credentials** (ask for `.env.local` values, or
   create your own project at [supabase.com](https://supabase.com) for a
   separate dev copy).

3. **Apply the database schema.** Either:

   - Link the CLI to your project and push migrations:
     ```
     npx supabase link --project-ref <your-project-ref>
     npx supabase db push
     ```
   - Or run each file in `supabase/migrations/` in order through the
     Supabase SQL editor.

   Dev-only placeholder content (`supabase/seed.sql`) is **not** applied
   automatically by `db push` — see the comment at the top of that file for
   why, and use a service-role script to insert it if you need it in a fresh
   project. Never run it against a project real participants will use.

4. **Configure environment variables.** Copy `.env.local.example` to
   `.env.local` and fill in your project's URL, anon key, and (for the admin
   seed script only) service role key — all from Project Settings → API.

5. **Create your first admin account**

   ```
   npm run seed:admin -- you@example.com "Your Name"
   ```

   Sign in at `/admin/login`.

6. **Create a session** from `/admin`, then use the join link it generates
   (`/join/<code>`) to register as a participant in another browser/session.

7. **Run the app**

   ```
   npm run dev
   ```

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run lint` — ESLint
- `npm run typecheck` — `tsc --noEmit`
- `npm run seed:admin -- <email> "<name>"` — provision a facilitator account
- `npm run dev:magic-link -- <email> [--join CODE] [--admin]` — prints a
  working sign-in link for an email without sending an email at all.
  Supabase's built-in email sender is capped at 2/hour on the free tier with
  no custom SMTP configured, which makes manual click-testing painful — this
  sidesteps it entirely for local development. Not usable in production
  (the bridge page it relies on is hard-guarded out via `isProduction`).

## Database types

`src/types/database.generated.ts` is generated directly from the linked
Supabase project and should not be hand-edited. Regenerate after any
migration:

```
npx supabase gen types typescript --linked > src/types/database.generated.ts
```

`src/types/database.ts` re-exports it plus a thin layer of narrower
string-literal types for `text` + `check (...)` columns (Postgres doesn't
reflect a CHECK constraint as a type the generator can see).

## A note on testing

Milestone 1's UI flows were click-tested manually against the live project.
Milestones 2 and 3's RPC/security layers were verified with real, disposable
test participants created via the Supabase Auth admin API (see
`docs/TESTING.md`) — every validation rule and RLS write-blocking/read-gating
behavior was actually exercised, not just read from the SQL. Milestone 3's
Blueprint page and PDF export were additionally verified through real
cookie-based HTTP requests against the running app (constructing an actual
`@supabase/ssr` session cookie), not just server-side function calls, which
is a stronger check than Milestone 2 got. No browser automation tool was
available in this environment, so the React UI itself (phase transitions,
checkbox limits, matrix rendering, the architecture reveal flow) still needs
a manual click-through for both milestones — see the checklists in
`docs/TESTING.md` before treating them as accepted.
