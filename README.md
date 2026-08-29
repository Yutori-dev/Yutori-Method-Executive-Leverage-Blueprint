# Yutori Method™ Executive Leverage Blueprint

All four milestones — Milestone 1 (Foundation + Configurable Activity
Engine), Milestone 2 (Zone of Investment + Delegation/Leverage), Milestone 3
(Recommendation Engine + Blueprint), and Milestone 4 (Facilitator
Intelligence + QA) — are implemented and connected to a live Supabase
project.

**Live at [yutori-method-blueprint.vercel.app](https://yutori-method-blueprint.vercel.app)**,
deployed via Vercel with GitHub auto-deploy on push to `main`.

> **Performance:** the original 75-participant load test found the app was
> correct but too slow (dashboard/blueprint page loads averaging 4.5-9.5s,
> worst case 26s). After parallelizing and reducing the query count on every
> major data loader, a clean re-run at **80** concurrent participants (78/80
> succeeded, both failures a transient network blip during account creation,
> unrelated to the app) came back at dashboard 4.6s avg / blueprint 3.4s avg
> / all RPCs under 500ms avg — a 45-65% improvement despite more concurrent
> load. Full before/after numbers in `docs/TESTING.md`.

> **Executive Leverage Diagnostic™ + guided progression:** the client's own
> Developer Implementation Specification V1 for the diagnostic (real,
> 15-question scored content — brief Content Dependency Register item A) is
> now live, replacing the Operating Altitude module's placeholder, along
> with a guided single-track participant progression model (a CONTINUE
> button, an exact holding-state screen, and late joiners starting at their
> own first activity rather than the cohort's current one). Every scoring
> rule, threshold boundary, and the tie-break priority order were verified
> live against the real database — see `docs/TESTING.md`.

> **Zone of Investment rebuild + White Whale / Leadership Wiring:** the
> client's own implementation specs for these three are now live —
> resolving content dependencies B (Responsibility Library) and C (the
> 9-cell Zone Matrix) with real content, a facilitator-gated reveal for the
> personalized matrix, and White Whale/Leadership Wiring becoming
> individually facilitator-unlocked activities within Operating Altitude
> rather than always-visible sections. See `docs/TESTING.md` for what was
> verified live.

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
- **Supabase** — Postgres, Auth (email+password for both admins and participants,
  *temporarily* — see `docs/ARCHITECTURE_DECISIONS.md`), Row Level Security
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

**Milestone 4 — Facilitator Intelligence + QA:**

- Individual participant profile (`/admin/sessions/[id]/participants/[id]`)
  — a one-page coaching view showing everything a participant has done,
  including the leverage classification hidden from every participant-facing
  query (brief section 17)
- Session-level aggregate view (`/admin/sessions/[id]/aggregate`) — module
  completion, Zone of Investment distribution, most common Priority
  Delegation Opportunities, recommendation/reaction breakdown. Only over
  data the app actually captures — no invented charts for Visionary/
  Integrator, the Executive Support Audit, or other content that doesn't
  exist yet
- CSV export per session (`/admin/sessions/[id]/export`)
- `scripts/load-test.ts` — simulates N concurrent participants through the
  full flow for capacity testing (brief section 25/29). **Run at 75
  participants against a production build and found a real capacity
  problem** — see the callout above and `docs/TESTING.md` for full numbers
  and next steps

**Gap-fill pass (post-Milestone-4):**

A scope review against the original brief turned up several items that were
never explicitly assigned to a milestone, plus everything flagged as a gap
in earlier delivery messages. All of it is now built:

- Module 0 executive-context capture (`/dashboard/[id]/context`) — current
  support roles, EOS/Bloom/Other, gating a banner on the dashboard until
  completed. Registration itself still only captures name + email, per
  Milestone 1's literal instruction; this is the fuller Module 0 content the
  brief describes, as its own step.
- Visionary / Integrator / Hybrid self-identification (Activity 1C),
  captured alongside the Operating Altitude assessment.
- White Whale and Success Vision reflections — private free-text, never
  aggregated or shown in Presentation Mode, surfaced only to the owning
  participant and admins.
- "Discuss My Blueprint" CTA (brief §15/A12) plus an admin Follow-Up
  Interest Queue (`/admin/sessions/[id]/follow-up`) with status tracking
  (new / contacted / closed), and a live-updating "Discuss?" column on the
  main roster (Supabase Realtime).
- Presentation Mode (`/admin/sessions/[id]/present`) — a facilitator-
  selectable, fully anonymized projector view (counts only, never a
  participant's name or free-text reflections).
- Cross-session analytics (`/admin/analytics`) — the same aggregate view as
  the per-session screen, generalized across every session for Yutori's own
  program-wide reporting.
- Privacy consent capture at registration, versioned so historical consent
  stays interpretable if the copy changes. The consent copy itself is the
  brief's own draft language and is explicitly labeled
  "pending Yutori approval" in the UI — see `docs/CLIENT_QUESTIONS.md`.
- A secondary leverage signal on the Architecture Recommendation (the
  minority level in a 2-1 split across the three Priority Delegation
  Opportunities), surfaced next to the primary signal.
- `multi_select` (checkbox) and `numeric` question types added to the
  configurable activity engine, needed for the fuller Module 0 content.

**Executive Leverage Diagnostic™ + guided progression:**

- The client's own Developer Implementation Specification V1: 15 real
  single-select questions (13 scored, 2 context-only), a percentage-based
  scoring formula, three profile categories, a "three lowest-scoring
  questions" constraint output with a fixed tie-break priority order, and
  a numeric score that is never participant-facing anywhere — enforced by
  what the participant-facing server action is capable of returning, not
  just by what a component renders. Replaces the Operating Altitude
  module's Milestone-1 placeholder assessment; White Whale and V/I/H
  self-identification are unchanged alongside it.
- A 5-section facilitator dashboard for the Diagnostic
  (`/admin/sessions/[id]/diagnostic`) — completion, the Whole-Person
  Capacity Baseline (including the "Experiencing Meaningful Capacity
  Pressure" calculation), the cohort's Executive Leverage Profile
  distribution, the top 5 cohort-wide leverage constraints, and Rock
  completion as context only.
- An admin configuration screen (`/admin/diagnostic-config`) — question
  wording, response-option wording and scores, scored/dashboard-visible
  flags, constraint labels and interpretation copy, tie-break priority, and
  profile thresholds are all editable. Saving always creates a **new
  version** rather than mutating live rows — a participant already scored
  under the current version keeps that exact result; only new calculations
  use the edited content.
- Guided single-track participant progression: a single **CONTINUE**
  action advances through required activities in order; a participant who
  can't go further yet sees "You're all set for now. We'll continue
  together shortly."; and a late joiner starts at their own first
  incomplete activity even if the facilitator has already cohort-unlocked
  several modules — enforced server-side (a direct URL to a
  not-yet-reached module redirects away), not just by hiding links.

**Zone of Investment rebuild + White Whale / Leadership Wiring:**

- The Zone of Investment module rebuilt to the client's own implementation
  spec: participants rate all 21 real responsibilities directly (no more a
  separate "select then rate" step), the real 9-cell zone mapping resolves
  content dependency C, and the personalized matrix is held behind a
  facilitator-gated reveal (`/admin/sessions/[id]/zone-of-investment` for
  the dashboard, an admin control mirroring the Architecture reveal). The
  hidden Executive Leverage Level classification for the new real
  responsibilities is explicitly deferred by the client's own spec text —
  left null with a controlled-pending fallback rather than guessed, see
  `docs/ARCHITECTURE_DECISIONS.md`.
- A versioned admin config screen (`/admin/zone-of-investment-config`) for
  the responsibility library, zone names, and competency/passion copy.
- White Whale and Leadership Wiring became individually facilitator-
  unlocked activities within Operating Altitude (previously always-visible
  sections) — each has its own admin unlock control, holding state between
  activities, and versioned copy (`/admin/operating-altitude-config`).
  Leadership Wiring now shows as the first populated field in the
  Character section (Blueprint and in-app), and White Whale is resurfaced
  verbatim in the Success module and the final Blueprint.

## What's deliberately not built

- **Google Sheets sync** — explicitly nice-to-have per the brief. Needs a
  Google Cloud OAuth client (client ID/secret) that hasn't been provided;
  building against placeholder credentials would produce something that
  can't actually be tested or turned on. Ready to build once credentials
  are available.
- **The Executive Support Audit and final assessment/matrix/recommendation
  content** — the brief's Content Dependency Register marks these as
  pending Yutori-side content, not an engineering task. The schema
  (versioned assessments, scoring rules, recommendation rules) is built so
  real content can be dropped in without restructuring anything — see
  `docs/ARCHITECTURE_DECISIONS.md`.

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

   Sign in at `/admin/login`. From here on, adding more admins doesn't need
   this script or developer access at all — any signed-in admin can add
   another one at `/admin/admins` ("Manage admins" in the header).

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
- `npm run load-test -- <count> [provisionDelayMs]` — simulates that many
  concurrent participants through the full join → rate → select → reveal →
  Blueprint flow against `LOAD_TEST_BASE_URL` (defaults to
  `http://localhost:3000`). Run against a **production build**
  (`npm run build && npm start`), not `npm run dev` — dev mode's on-demand
  compilation makes every number meaningless. Creates and cleans up real,
  temporary test accounts; never run against a project real participants
  use. The second argument paces account provisioning (default 1500ms) to
  stay under Supabase's per-IP auth rate limits, which a real workshop's
  participants — connecting from many different IPs — would never trip;
  raise it if you see `verifyOtp` failures during setup.

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
Milestones 2-4's RPC/security layers were verified with real, disposable
test participants created via the Supabase Auth admin API (see
`docs/TESTING.md`) — every validation rule and RLS write-blocking/read-gating
behavior was actually exercised, not just read from the SQL. Milestones 3
and 4's page-level features were additionally verified through real
cookie-based HTTP requests against the running app (constructing an actual
`@supabase/ssr` session cookie), not just server-side function calls. No
browser automation tool was available in this environment, so the React UI
itself (phase transitions, checkbox limits, matrix rendering, the
architecture reveal flow) still needs a manual click-through — see the
checklists in `docs/TESTING.md` before treating any milestone as accepted.

Milestone 4 additionally included a real load test at 75 simulated
concurrent participants against a production build (not dev mode) — see the
callout near the top of this file and the full results in
`docs/TESTING.md`. This is the one piece of testing across all four
milestones that surfaced a genuine problem rather than confirming
correctness: the app handles 75 concurrent participants without errors, but
was not fast enough for a good live-workshop experience at that scale —
since fixed and re-verified, see the callout above.

The gap-fill pass (Module 0, self-identification, White Whale/Success
Vision, follow-up queue, Presentation Mode, cross-session analytics, privacy
consent) was verified the same way: every new RLS-guarded write was
exercised end to end against the live database with a real, disposable test
participant (not just typechecked), and every new/changed page was hit over
real cookie-based HTTP requests against a production build to confirm it
renders without a server error.
