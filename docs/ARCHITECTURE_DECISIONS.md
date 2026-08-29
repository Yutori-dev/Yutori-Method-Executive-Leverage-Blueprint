# Architecture decisions

Choices made where the brief left room for engineering judgment, and the
reasoning, so later milestones (and reviewers) don't have to reverse-engineer
intent from the code.

## Milestone 2 addendum: derived values are never trusted from the client

Milestone 2 introduced a stricter security posture than Milestone 1's plain
RLS-scoped table writes, because the Milestone 2 brief was explicit that
matrix cell, macro zone, leverage level, and scoring results must never be
trusted from the client (task instructions section 21) -- and Supabase's
PostgREST API is directly reachable by anyone holding a participant's access
token, regardless of what the Next.js app renders. A determined participant
could otherwise `PATCH` their own `participant_responsibilities` row directly
and set `matrix_cell`/`macro_zone` to whatever they wanted, bypassing the
Next.js server actions entirely.

So `participant_responsibilities`, `priority_delegation_opportunities`, and
`assessment_results` have **no participant insert/update/delete RLS policy
at all** -- only `select`. Every write happens through a `SECURITY DEFINER`
Postgres function (`select_responsibilities`, `rate_responsibility`,
`select_priority_delegation_opportunities`, `calculate_delegation_readiness`
in `supabase/migrations/20260830000002_zone_and_delegation_functions.sql`)
that:

1. re-derives ownership from `auth.uid()`, never trusting a caller-supplied
   participant id;
2. re-checks the relevant module is actually cohort-unlocked
   (`is_module_unlocked_for_session`), so the RPC can't be called ahead of
   what the UI would allow;
3. computes `matrix_cell`/`macro_zone` from the `zone_matrix_cells`
   configuration table and `leverage_level_snapshot` from the live
   `responsibilities` row -- both server-side, both ignoring anything the
   client sent for those fields (because the client never sends them at all;
   the RPC signatures don't accept them as parameters).

This was verified against the live database with a real test participant
(not just read from the SQL): 9/13/etc. invalid selection counts rejected,
an ineligible (Zone of Investment) responsibility rejected from Priority
Delegation selection, a direct `UPDATE` of `matrix_cell` via the
participant's own token blocked by RLS, and calling a write RPC before the
relevant module was cohort-unlocked rejected. See the acceptance gate in
`docs/TESTING.md`.

## Milestone 2 addendum: scoring is a controlled fallback, not an invented result

`assessment_scoring_rules` exists as a real, versioned table (threshold →
result label → interpretation) but ships **empty** in every environment,
including dev seed data. `calculate_delegation_readiness()` still does real
work -- it aggregates raw responses into per-dimension sums using each
question's `config->>'dimension'` tag -- but when no matching row exists in
`assessment_scoring_rules` (guaranteed true today), `overall_result` is
written as `null` and `interpretation` is a labeled fallback string, never
an invented score. This is a deliberate reading of task instructions
section 22 ("do not invent a result... provide a controlled fallback
state"): the storage shape and the aggregation mechanism are real and
already exercised end-to-end; only the actual Yutori-approved thresholds are
missing, and dropping rows into `assessment_scoring_rules` is all a later
milestone needs to do to light up real results -- no code change.

## Milestone 2 addendum: the placeholder Zone of Investment mapping is explicitly not real

The 9-cell competency × passion → macro-zone assignment seeded for
development (`docs/CLIENT_QUESTIONS.md` item 7) was invented purely to make
the selection → rating → matrix → eligibility pipeline testable end to end.
It is a plausible-looking skill/will-style mapping (high+high = "Sweet
Spot" → Zone of Investment, low+low = "Clear Delegate" → Zone of
Vulnerability, etc.) chosen only so automated and manual testing would
exercise a realistic distribution across all three macro zones. It carries
no methodological authority and must be replaced wholesale, not adjusted.

## Module state = cohort gate × per-participant progress

The brief's four required states (LOCKED / OPEN / IN PROGRESS / COMPLETE)
are actually two independent facts combined:

- **Cohort-wide gate**: `sessions.active_module_id` is the furthest module
  the facilitator has unlocked. Modules with `sort_order <=` that module's
  are unlocked for everyone in the session; the rest are locked. This is a
  single field, not a per-module unlock table, because unlocking only ever
  moves forward (brief section 7/16) — there's nothing a richer model would
  buy in Milestone 1.
- **Per-participant progress**: `participant_module_progress` tracks
  not_started/in_progress/complete for one participant within one module
  they've been granted access to.

`src/lib/moduleState.ts` combines the two into the display state. This is
also where `READY_TO_REVEAL`/`REVEALED` are typed (but never produced) so
the architecture-reveal milestone can extend the switch statement instead of
changing its shape.

The `character_live` module (`requires_live_workshop = true`) is a third,
independent gate — it stays locked regardless of cohort progress, because
brief sections 1.2/5.1/12 make it clear Character is gated by attending the
live workshop, not by virtual-workshop sequence.

## Module catalog is a seeded reference table, not an enum

`modules` is real seed data (via migration, not the dev-only `seed.sql`)
because its 7 entries are named explicitly in brief section 5.1 — they're
navigation structure, not invented business content. Keeping it a table
rather than a TypeScript enum means Milestone 2+ can reorder, rename, or add
modules without a code change, which the brief asks for explicitly
("configurable... without rewriting the core application," section 3).

## The configurable activity engine is decoupled from modules

`assessments`/`questions`/`answer_options`/`responses` don't have a foreign
key to `modules`. A later milestone's content page decides which assessment
key it renders for a given module — the engine itself has no opinion about
which module a question belongs to. This matches the brief's instruction not
to hardcode business logic into the data layer's shape, and means the same
engine can back multiple assessments per module (the brief describes several
per module, e.g. Operating Altitude has both the Leadership Leverage
Diagnostic and the White Whale free-text prompt) without a schema change.

## Placeholder content is a two-layer guard, not one

1. **It's never seeded outside dev.** The one demo assessment lives in
   `supabase/seed.sql`, which is explicitly a local-dev-only file (Supabase
   only applies it on `supabase db reset`), not a migration.
2. **The app also refuses to render it in production** (`src/lib/data/moduleContent.ts`
   checks `isProduction` before ever querying for the demo assessment).

Belt-and-suspenders because task instructions section 14 are explicit that
placeholder content reaching production is not an acceptable failure mode.

## Enrollment and unlock logic live in Postgres functions, not the API layer

`ensure_participant`, `join_session`, and `admin_unlock_next_module`
(`supabase/migrations/20260829000004_functions.sql`) encode the rules that
actually matter for correctness under concurrent access — no duplicate
registration, unlock only moves forward, only an admin can unlock. Putting
them in the database means they hold regardless of which client calls them
(the Next.js app today; a future mobile client or admin script tomorrow),
and `on conflict` upserts make them safe to call twice, which matters for
autosave-style, connection-interruption-tolerant flows (brief section 24).

## No client-side authorization shortcuts

Every RLS policy assumes the frontend is hostile. Two examples that would
otherwise be easy to get wrong: `/dashboard/[sessionId]/modules/[moduleKey]`
re-derives the module's LOCKED/OPEN state server-side and `redirect()`s away
if locked, rather than trusting that only the dashboard's own links would be
followed; and `join_session` is `SECURITY DEFINER` but always enrolls
`auth.uid()`, never a caller-supplied participant id, so the privilege
escalation it needs (reading a session by join code pre-enrollment) can't be
turned into enrolling someone else.

## Database types (superseded -- see Milestone 2 addendum below)

`src/types/database.ts` originally mirrored the migrations by hand because
no live Supabase project was available to run `supabase gen types` against
during Milestone 1. That constraint no longer applies (the app has been
connected to a live project since Milestone 1 delivery) -- Milestone 2
switched to `src/types/database.generated.ts`, generated directly from the
linked project, with `database.ts` re-exporting it plus a thin layer of
narrower string-literal types for `text` + `check (...)` columns the
generator can't infer a union from. Keeping the note about the earlier
`Relationships: []` gotcha for the historical record: omitting it on a
hand-written type silently degrades every query's row type to `never`
instead of failing loudly, which cost real debugging time in Milestone 1 --
worth remembering if this file is ever hand-edited again instead of
regenerated.

## Milestone 3 addendum: the recommendation engine is real, the decision table is not

`calculate_architecture_recommendation()` does genuine, deterministic work:
it reads the three `leverage_level_snapshot` values from a participant's
Priority Delegation Opportunities, computes the majority (brief section 8.1
-- "2+ matching = a strong primary signal"), and detects a 1/1/1 tie. It
stores the full signal breakdown in `supporting_signals` every time, so the
rationale can never quietly hide a contradictory signal (a constraint the
brief states explicitly, section 8.4). What it does *not* do is invent the
mapping from "primary signal = orchestration" to a named recommendation like
"High-Leverage Executive Assistant" -- that mapping lives in
`recommendation_rules`, which ships empty everywhere (same pattern as
Milestone 2's `assessment_scoring_rules`), so every participant currently
sees the brief's own specified fallback copy (section 24) instead. This was
verified live: a clear-majority scenario and a 1/1/1 tie scenario were both
driven through a real test participant, and the tie case correctly produced
`is_tied: true` with no primary signal guessed.

## Milestone 3 addendum: the architecture reveal gate lives in RLS, not just the UI

The brief requires that the recommendation stay hidden until the facilitator
explicitly reveals it (section 9), and that a facilitator can see it before
revealing (to review before releasing to the room). Both are enforced in the
`architecture_recommendations` RLS policy itself, not just by what the
participant-facing page chooses to render: an admin can read the row
unconditionally, but a participant can only read their own row once
`sessions.architecture_revealed = true`. Before that, `has_calculated_
architecture()` -- a narrow RPC that returns only a boolean, never the
recommendation content -- is what lets the participant's own UI show the
"Your Blueprint is ready" holding state without being able to read the
content early via a direct API call. This was verified live: a participant's
own `select` on their row returned zero rows pre-reveal, then one row
immediately after an admin called `admin_reveal_architecture`.

## Milestone 3 addendum: the PDF is generated on demand, not stored

There is no `blueprints` table and no file goes into Supabase Storage. The
Blueprint page and the PDF route (`/api/blueprint/[participantSessionId]/pdf`)
both call the same `getBlueprintData()` loader and render current data live,
via `@react-pdf/renderer`. This was a deliberate simplification against the
brief's `Blueprint` entity (section 20, which has a `pdf_url` field) --
nothing in Milestone 3's scope needs the PDF to be retrievable after the
underlying data changes (a stored, stale PDF would arguably be worse), and
avoiding Supabase Storage entirely means one less piece of infrastructure to
configure, secure, and reason about (task instructions principle: avoid
unnecessary infrastructure). `getBlueprintData()` takes no dependency on
`auth.getUser()` itself -- authorization happens once, in each caller, via a
`participant_sessions` lookup that RLS already scopes to "the owning
participant or an admin" -- so the same loader correctly serves a
participant viewing their own Blueprint and an admin downloading any
participant's, verified live for both, plus confirming an unrelated
participant is denied.
