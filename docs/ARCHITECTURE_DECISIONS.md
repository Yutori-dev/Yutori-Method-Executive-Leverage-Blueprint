# Architecture decisions — Milestone 1

Choices made where the brief left room for engineering judgment, and the
reasoning, so later milestones (and reviewers) don't have to reverse-engineer
intent from the code.

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
