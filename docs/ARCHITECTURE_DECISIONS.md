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

## Tooling addendum: dev:magic-link needs its own callback pages

Supabase's built-in email sender caps at 2/hour on the free tier without
custom SMTP configured, which made manual click-testing painful during
development. Configuring a custom SMTP provider (Resend) was attempted but
blocked -- Resend now refuses to send from *any* address, including its own
default `onboarding@resend.com`, until a domain is verified via DNS, and no
domain was available. `scripts/dev-magic-link.ts` sidesteps the rate limit
entirely instead, using `supabase.auth.admin.generateLink()` to produce a
working sign-in link with no email sent at all.

That API has a real quirk worth recording: admin-generated links always use
the *implicit* auth flow (tokens in a URL hash fragment, which never reaches
the server), while a real participant's browser-initiated `signInWithOtp()`
uses PKCE (a `?code=` query param) via `@supabase/ssr`'s default
configuration -- these are not interchangeable, and `/auth/callback` only
understands the PKCE shape. So the dev tool points at two new pages instead
of the real callback routes: `/auth/dev-callback` and
`/admin/auth/dev-callback`, both client components that read the hash
fragment, call `supabase.auth.setSession()` directly, and then hand off to
the same `/complete-profile` / `/admin` redirect logic the real callbacks
use. Both are hard-guarded to render nothing in production regardless of
whether anything ever links to them. The token-exchange step was verified
live (extracting real tokens from a generated link and confirming
`setSession()` accepts them); the client-side redirect behavior needs a
real browser to fully exercise, same testing-tool limitation noted
throughout this file.

## Milestone 4 addendum: the admin coaching view deliberately un-hides what participants never see

`getAdminParticipantProfile()` selects `responsibilities.leverage_level`
directly, which no participant-facing query anywhere in the app does. This
isn't a gap in the hiding logic -- the brief is explicit that the
classification exists for internal/coaching use (section 9: "System retains
internally: leverage_level = Orchestration") and that the admin profile
should support exactly this kind of one-page coaching view (section 17).
The distinction that actually matters is *who's asking*, not the column
itself: RLS already restricts `responsibilities` reads appropriately, and
this loader runs only behind `/admin/**`, which the proxy gates to admins
before any Server Component even renders.

## Milestone 4 addendum: aggregates are computed in application code, not SQL

`getSessionAggregates()` fetches raw rows scoped to a session (via its
participant_sessions ids) and reduces them in TypeScript rather than
writing grouped/aggregate SQL. Sessions are expected to top out around
75 participants (brief section 3), so the row counts involved are small
enough that this is simpler and safer than hand-rolling several `GROUP BY`
queries, at negligible cost. Revisit this if a much larger session size
ever becomes real.

## Gap-fill addendum: performance — fewer round-trips, not fewer features

The 75-participant load test (see `docs/TESTING.md`) traced its latency to
data loaders making several *sequential* Supabase round-trips per page load,
where each concurrent request pays that full sequential cost independently.
Fixed with three techniques, applied to the four loaders on the hottest
pages (participant dashboard, Zone of Investment, module content, delegation
candidates), with no change to what any of them return:

1. **Parallelize what's already independent** (`Promise.all`) — e.g. Zone of
   Investment's three queries don't depend on each other's results, so there
   was no reason they were sequential.
2. **Nested embeds instead of separate queries** — PostgREST can embed a
   related table directly in one query
   (`assessments.select("...,questions(...,answer_options(...))")`) instead
   of fetching each level separately. The demo-assessment loader dropped
   from 4 sequential-ish requests to 2 parallel ones this way; filtering/
   sorting nested `active`/`sort_order` moved to JS rather than risking
   PostgREST's nested-filter syntax for a query already proven correct.
3. **Inner-join filters instead of a lookup-then-query pattern** —
   `assessment_results.select("...,assessments!inner(key)").eq("assessments.key", ...)`
   replaces "look up the assessment id, then query by it" with one request.

The participant dashboard also had a genuinely removable query: the
Blueprint page's post-reveal leverage snapshot was being fetched separately
when it was already present in data the delegation loader fetches anyway.

Re-run at 80 concurrent participants (higher than the original 75) showed
a 45-65% improvement on every page/RPC that was slow before — see
`docs/TESTING.md` for full numbers. None of this changed what any page
computes or displays; it's purely a reduction in how many separate requests
it takes to compute it.

## Gap-fill addendum: self-identification is a column, reflections are a table

Visionary/Integrator/Hybrid self-identification lives as a single
`check`-constrained column on `participant_sessions` — it's one mutually
exclusive value per participant per session, the same shape as
`completion_state` already on that row, so a separate table would only add
a join for no benefit.

White Whale and Success Vision, by contrast, got their own
`participant_reflections` table (one row per `participant_session_id`,
`unique`) rather than more columns on `participant_sessions`. Two reasons:
they're free-text (not enum-constrained like self-identification), and they
carry a materially different privacy posture — the brief and the consent
copy both call out that these specific responses are never aggregated or
shown in Presentation Mode, so keeping them in their own table makes that
boundary a schema fact (nothing that selects broadly from
`participant_sessions` accidentally pulls a private reflection along with
it) rather than a convention every future query has to remember.

## Gap-fill addendum: the secondary leverage signal is read off the existing distribution, not recomputed

`calculate_architecture_recommendation()` already computed `v_distinct_
levels` and the vote counts to determine the primary signal and tie
detection (Milestone 3). The secondary signal — brief-relevant context for
a 2-1 split, i.e. "which level was the minority" — reuses that same
distribution rather than a second pass over the three
`leverage_level_snapshot` values: when there are exactly 2 distinct levels
among the three opportunities (a genuine 2-1 split, not a 1/1/1 tie), the
secondary signal is whichever of the two levels isn't the primary. This
mirrors the primary signal's own logic (no invented mapping, no reveal-gate
bypass — the column lives on the same RLS-gated `architecture_
recommendations` row) rather than introducing a parallel calculation path.

## Gap-fill addendum: follow-up interest is a request queue, not a boolean

`follow_up_interests` is its own table (one row per `participant_session_
id`, `unique`, defaulting `status = 'new'`) rather than a boolean flag on
`participant_sessions`, because the brief's admin-facing requirement (§15/
A12) is a *queue with state* — new/contacted/closed — not just "did they
click the button." The button itself (`requestFollowUp`) only ever inserts;
it can't be un-requested from the participant side, matching "Discuss My
Blueprint" reading as a one-way request in the brief's own copy. The main
roster's "Discuss?" column and the dedicated `/admin/sessions/[id]/follow-up`
queue both read the same table — the roster is the at-a-glance view, the
queue page is where status actually gets managed.

## Gap-fill addendum: cross-session analytics generalizes the existing aggregator, not a parallel implementation

`getSessionAggregates()` took an optional `sessionIds?: string[]` instead of
a required single `sessionId`. Passing one id is the original per-session
view; omitting it removes the session filter entirely for an org-wide
rollup (`/admin/analytics`, brief §16). This was a signature change, not a
new function, specifically so the two screens can never drift into showing
different numbers for the same underlying data — a per-session bug fix or a
new chart added to one is automatically correct on the other.

## Gap-fill addendum: Presentation Mode's anonymity guarantee is structural, not a rendering choice

`PresentationView` is handed a `SessionAggregates` object — the exact same
shape the per-session and cross-session admin views already use — and
nothing else. It has no access to `participants`, `participant_sessions`,
or `participant_reflections`; there is no participant name, email, or
free-text field anywhere in the props it receives. This means the
"anonymized, opt-in" requirement (brief §19) doesn't depend on the
component remembering not to render a field — the field is simply never in
scope to render, the same guarantee `docs/CLIENT_QUESTIONS.md` item 10
notes for reflections generally.

## Gap-fill addendum: privacy consent is versioned, not a boolean

`ensure_participant()` now accepts an optional `p_privacy_consent boolean`
and, when true, stamps `privacy_consent_given_at` and `privacy_consent_
version` (currently the literal string `'draft-2026-08-29'`, since the copy
itself is still an unapproved draft — see `docs/CLIENT_QUESTIONS.md`). The
`on conflict` upsert uses `coalesce(existing, new)` for both columns
specifically so a participant who already gave consent under one version
never has it silently cleared or overwritten by a later call — the same
versioning discipline already used for `assessments`, `zone_matrix_cells`,
and `recommendation_rules` so historical data stays interpretable after
content changes, applied here to a legal/consent fact instead of workshop
content.

## Guided progression: destination resolution lives in one pure function

`resolveParticipantDestination()` (`src/lib/moduleState.ts`) is the single
source of truth for "where should this participant be right now" —
Module 0, a specific module, the holding state, or all-done. Both the
dashboard (what it renders as the CONTINUE call-to-action) and the module
page (whether a direct URL visit is allowed) call the same function rather
than each re-deriving the answer, for the same reason `deriveModuleState()`
itself is centralized: two independent re-implementations of "what's next"
would eventually drift, and the drift would show up as a participant able
to reach a module through one code path but not the other.

The function treats "cohort-unlocked" and "reached by this participant" as
two different facts, which is the actual gap the client's spec closes: a
late joiner can have several modules cohort-unlocked at once
(`sessions.active_module_id` only ever moves forward, cohort-wide), but
should still be guided through their own first incomplete one rather than
whichever the cohort has already reached. `ModuleRow` and the module page's
redirect guard both key off the *same* "reachable" definition (complete, or
the exact current step) so a participant can always revisit a finished
module to look back at their answers, but never jump ahead — "cannot jump
ahead" and "cannot look back" are different requirements, and only the
first one is in the spec.

## Executive Leverage Diagnostic™: percentage thresholds reuse the existing scoring-rules table

`assessment_scoring_rules` (built in Milestone 2 for Delegation Beliefs)
already has `min_score`/`max_score`/`result_label`/`interpretation` columns
— exactly the shape "percentage band → profile name → profile copy" needs.
Rather than a new table, the Diagnostic's three profile bands
(HIGH/CONSTRAINED/INSUFFICIENT LEVERAGE) are three rows in that same table,
with `dimension` fixed to `'overall_percentage'`. Unlike Delegation
Beliefs — which leaves this table empty and falls back to labeled
placeholder copy because no real scoring exists yet — the Diagnostic's
content is fully specified, so `calculate_executive_leverage_diagnostic()`
adds real `>= min_score and <= max_score` range matching that
`calculate_delegation_readiness()` never needed to implement (its own
lookup only ever returns the first active row, since with an empty table
there's nothing to match against).

`questions.tie_break_priority` stores the client's fixed 13-item tie-break
list directly as a per-question integer rather than a separate ranking
table. Selecting the three lowest-scoring questions is then just
`order by score asc, tie_break_priority asc limit 3` — one ordering that
correctly implements "lowest three, ties broken by the fixed list"
regardless of how many questions actually tie at the boundary, without any
special-cased "is this exactly the third slot" logic.

`max_points` is computed as `sum(max(score_value) per scored question)`
rather than the spec's stated constant of 52. Both give the same answer
today (13 scored questions × a 0-4 range = 52), but computing it live means
the admin config screen can change a question's scoring range without a
corresponding code change silently breaking the percentage math.

## Executive Leverage Diagnostic™: admin config saves are plain authenticated writes, not an RPC

`assessments`, `questions`, `answer_options`, and `assessment_scoring_rules`
already carry `for all using (is_admin())` (or equivalent) RLS policies
from Milestone 1/2 — admins already have full CRUD on all four tables via
their own session, unused until now because nothing needed to write to
them outside a migration. `saveExecutiveLeverageDiagnosticVersion()`
(`src/lib/actions/diagnosticConfig.ts`) is therefore a plain server action
doing four sequential authenticated inserts (assessment → questions →
answer_options → scoring_rules) rather than a `SECURITY DEFINER` RPC —
there's no privilege escalation to encapsulate, since the caller already
has exactly the privilege the writes need. It always inserts a new
`assessments` row at `version + 1` and a full fresh set of child rows,
never updating current rows in place, matching the versioning convention
used everywhere else in this schema. Verified live: editing content creates
a real new version, the previous version's rows are provably untouched,
and a participant already scored under the old version keeps their
original `rules_version` and result.

## Bug found and fixed: `ensure_participant` had two live overloads

While testing the Diagnostic, calling `ensure_participant` with only two
arguments failed with "could not choose the best candidate function."
`20260901000003_privacy_consent.sql` added `p_privacy_consent` as a third
parameter via `create or replace function` — but Postgres treats a
different parameter *count* as a distinct overload, not a replacement, so
the original two-argument function stayed live alongside the new
three-argument one. The Next.js app was never affected (`CompleteProfileForm.tsx`
always passes all three arguments, which unambiguously resolves), but it
was real latent risk for any other caller. Fixed in
`20260902000004_drop_stale_ensure_participant_overload.sql` by dropping the
stale two-argument overload — worth remembering for any future
`create or replace function` that changes a signature's arity rather than
just a body: it needs an explicit `drop function` for the old shape, since
`create or replace` alone won't remove it.

## Zone of Investment: an intentionally weaker reveal guarantee than Architecture's, and why

Architecture's reveal is enforced at the RLS level — a participant has zero
legitimate reason to read that row before the facilitator reveals it, so
`architecture_recommendations` simply has no pre-reveal participant SELECT
policy at all. Zone of Investment can't use the same guarantee: `getDelegationCandidates`
already reads a participant's own `macro_zone` values, as that participant,
to compute Priority Delegation Opportunity eligibility in module 3 — and
module 3 can be cohort-unlocked before the facilitator reveals module 2's
map, since those are two independent facilitator actions the client's spec
never sequences against each other. Locking `participant_responsibilities`
down at the RLS level would break Delegation whenever reveal happens out of
order.

So `matrix_cell`/`macro_zone` are computed eagerly per-rating and stay
always-readable by the owning participant (unchanged RLS) — "held until
reveal" is enforced by the Zone of Investment module's own loader instead:
`getZoneOfInvestmentData()` only includes `zoneCells`/`personalizedPlacements`
in its return value once `sessions.zone_of_investment_revealed` is true,
returning `[]` otherwise. This was a real, non-obvious gap the first pass
missed: even though the mapping-phase UI never *renders* zone names, the
full data was still being passed as a prop into the client component
(`ZoneOfInvestmentFlow`), which lands in the page's hydration payload and
is inspectable via view-source regardless of what's on screen — caught
during live HTTP-level verification, not by TypeScript or a visual check.
Fixed by gating the loader's return value itself, not just the rendering.

A determined participant could still read their own `macro_zone` early via
a direct API call, the same way they always could — flagging this as a
deliberate, weaker-than-Architecture guarantee for the client, rather than
either quietly shipping it or chasing a cross-module ordering dependency
the spec never asked for.

## Per-activity facilitator unlock: the same three-piece pattern, three times

White Whale, Leadership Wiring, and the Zone of Investment reveal all use
the identical shape: one dedicated `sessions` boolean column + one narrow
`admin_*` RPC (`is_admin()` check, one-way boolean flip) + a client control
component with the same idle → confirming → pending states as
`UnlockModuleControl`. This mirrors `architecture_revealed`/
`admin_reveal_architecture` exactly, three more times, rather than
introducing a generic "activity unlock" table/mechanism for an open-ended
number of future gated activities. With exactly three known cases and no
signal that more are coming, the repeated concrete pattern is easier to
read, verify, and reason about than a new abstraction built to anticipate
cases that don't exist yet — consistent with how the Diagnostic's admin
config was deliberately scoped to one assessment rather than a generic
content editor.

Completion for both new activities is derived from existing data rather
than a new "complete" column, matching the Module 0 precedent
(`hasCompletedExecutiveContext`): White Whale is complete when
`participant_reflections.white_whale` is non-empty; Leadership Wiring is
complete when `participant_sessions.self_identification` is non-null.
Nothing new needed to be written to track it.

## Self-service admin provisioning: the service-role client's first use inside the deployed app

`src/lib/supabase/admin.ts` (a service-role client factory) already existed
from Milestone 1, written for `scripts/create-admin.ts` — a local,
human-run script. `src/lib/actions/admins.ts` is the first time that client
is used *inside a request the app itself serves*, because provisioning an
admin genuinely requires privileges `admin_users`' RLS deliberately doesn't
grant to any signed-in session (`admin_users` has no insert policy at all
— "admin accounts are provisioned via the service role... never from the
client," per its original RLS migration comment). Two things make this
safe rather than a hole in that boundary:

1. The action re-derives the *caller's* admin status first, using the
   caller's own RLS-scoped session (`admin_users` select, which IS allowed
   for admins) — only after that check passes does it reach for the
   service-role client. A non-admin's request never touches the privileged
   client at all.
2. The service-role client is never imported by anything that isn't itself
   gated this way — same discipline as every `SECURITY DEFINER` RPC in
   this app re-checking ownership/authorization internally rather than
   trusting the caller.

The logic itself (find-or-create the auth user by email, then upsert
`admin_users`) is a direct port of `create-admin.ts`'s script logic, kept
in sync rather than duplicated with drift — the script still exists for
bootstrapping the very first admin on a brand-new project, where no admin
exists yet to use the in-app screen.

## Bug found live: magic-link emails pointed to localhost on the deployed site

Root cause was entirely a Supabase project setting, not app code —
confirmed by reading every `signInWithOtp` call (`JoinForm.tsx`,
`AdminLoginForm.tsx`): both already compute `emailRedirectTo` from
`window.location.origin` at request time, which correctly resolves to the
live Vercel origin when a user submits the form there. The Supabase
project's Auth `site_url` was still `http://localhost:3000` from local
development, and its `additional_redirect_urls` allow-list didn't include
the live domain — when a requested `emailRedirectTo` doesn't match the
allow-list, Supabase silently falls back to `site_url` instead of erroring,
which is exactly what made this look like the app was hardcoding
localhost when it wasn't. Fixed via `supabase/config.toml`'s `[auth]`
section (`site_url` now the production URL, the allow-list covers both
production and local dev) and `supabase config push` — a project setting
now tracked in version control instead of only living in the dashboard,
so it can't silently drift out of sync with what's actually deployed
again. Verified live by generating a real magic link and confirming its
embedded `redirect_to` is the production URL.

One thing worth remembering: `supabase config push` syncs the *entire*
local `[auth]` block, not just the fields that changed. The first push
also reset several unrelated settings (email confirmation requirement,
per-email send frequency, OTP length, MFA) to `config.toml`'s local-dev
defaults, because those happened to differ from what was already live.
Caught immediately by re-reading the diff `config push` printed, and fixed
with a second push restoring the previously-live values for anything not
intentionally being changed. Worth a full diff review any time this
command is used again, not just checking that the field you meant to
change looks right.

## Dual-role accounts and "no one should feel stuck": a persistent participant-side layout

Two related gaps, fixed together with one addition. First: nothing in the
schema stops one email from having both an `admin_users` row and a
`participants` row (they're both keyed off `auth.users(id)` independently,
no exclusion constraint) — a real admin testing the app as a participant
is a real, expected scenario, not an edge case. Second: the participant
side of the app had no shared layout at all (`src/app/dashboard/[sessionId]/layout.tsx`
didn't exist), unlike the admin side's persistent header
(`src/app/admin/layout.tsx`) — meaning a participant deep inside a module,
or on a holding screen, had no way back except browser back.

`src/app/dashboard/[sessionId]/layout.tsx` (new) solves both: a persistent
header wrapping every session-scoped participant page (dashboard, Module 0,
modules, Blueprint) with a wordmark link back to the dashboard and, when
that account also has an `admin_users` row, a "Switch to admin view" link.
The admin layout gained the reverse: "View as participant" when the
signed-in admin also has a `participants` row. Neither check is expensive
(a single `maybeSingle()` each) and neither implies any privilege change —
it's purely a navigation convenience for an account that already legitimately
holds both roles; RLS and the proxy's route gating are unaffected and still
independently enforce what each route actually requires.

`HoldingState` (shared across the dashboard's own CONTINUE card, White
Whale, Leadership Wiring, and the Zone of Investment reveal) gained an
explicit "← Back to dashboard" link, and `OperatingAltitudeFlow`'s three
internal phases (Diagnostic → White Whale → Leadership Wiring), previously
strictly forward-only, gained "review" links to step back. That surfaced a
real bug while testing: the Diagnostic phase's own forward transition only
ever fires automatically, the first time a result is calculated
(`onResultChange`) — revisiting it via the new back-link left no way
forward again, since the calculate button disappears once a result
already exists. Fixed with an explicit CONTINUE button shown whenever the
phase is revisited with a result already in hand, not just on first
completion.
