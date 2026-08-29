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

## Hand-written database types

`src/types/database.ts` mirrors the migrations by hand because no live
Supabase project was available to run `supabase gen types` against during
this milestone (see the note at the top of that file and in `README.md`).
It deliberately includes the `Relationships: []` field on every table even
though Milestone 1 doesn't do typed embedded joins, because
`@supabase/postgrest-js`'s generic constraints require it — omitting it
silently degrades every query's row type to `never` instead of failing loudly,
which cost real debugging time while building this milestone and is worth
recording so it isn't reintroduced by future hand-edits.
