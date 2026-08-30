# Client feedback — round 4 (2026-08-30)

Tracking checklist for the batch of feedback sent 2026-08-30 (text + 3
screenshots: a rating-card close-up, the full Zone of Investment mapping
screen, and Presentation Mode). Checked off as each item ships and is
verified live, same standard as every other round in
`docs/ARCHITECTURE_DECISIONS.md`. Items are grouped by area, not by the
order they were mentioned.

## Module unlocking

- [x] **Module 1 unlocks automatically; module 2+ stay manual.** Investigated
      why "the first three modules were opened and unlocked automatically"
      — there's no auto-unlock default today (`active_module_id` starts
      `NULL`, meaning *nothing* is open). The "Unlock next module" button is
      cumulative: each click advances the cohort one module further, so
      clicking it 3 times while exploring the panel opens modules 1-3 at
      once, correctly per its current design. Fix: module 1 unlocks
      automatically (on session creation or when a session goes ACTIVE —
      deciding which), everything from module 2 onward still requires an
      explicit admin click, unchanged.
- [x] **Real-time push to the next exercise on unlock.** When the admin
      unlocks a module (or a per-activity gate like White Whale/Leadership
      Wiring/Zone of Investment reveal), every participant who is currently
      on a holding screen and eligible for that exact next step gets
      auto-navigated there — no manual back-to-dashboard-and-back-in, no
      page refresh. Reuses the realtime pattern already live in
      `LiveRosterRefresher.tsx` (Postgres changes → debounced update), just
      subscribed on the participant's browser to the `sessions` row instead
      of the admin roster.

## Zone of Investment UI

- [x] **Visually separate the Competency and Passion halves of each rating
      card** so they read as two distinct prompts, not one continuous
      question (per the close-up screenshot).
- [x] **New bulk-selection step**, inserted between the
      Competency/Passion explanation screen and the grading screen:
      participant sees all 21 activities at once and picks their 10-12 in
      one quick pass (checkbox-style, not one at a time), *then* the
      existing grading screen filters down to just those 10-12 for
      Competency/Passion rating.

## Presentation Mode

- [x] **Live-updating completion counter**, no manual refresh needed.
      Was a static server-rendered snapshot (confirmed — no realtime wiring
      existed on this page). Fixed by mounting the existing
      `LiveRosterRefresher` (already used on the session control panel) on
      `/present` too — same subscription, same debounced `router.refresh()`.

## Final Workshop Feedback / Review step (new)

- [x] Admin-gated release (mirrors the `architecture_revealed` /
      `zone_of_investment_revealed` boolean + RPC pattern already used
      three times in this app) — `ReleaseWorkshopFeedbackControl` on the
      session control panel.
- [x] On release, every currently-live, eligible participant is
      auto-navigated straight to it (same `SessionGateWatcher` mechanism as
      the module push above — the dashboard now also watches while
      "all-done", not just "holding").
- [x] A participant who isn't live at release time lands here automatically
      the next time they open the app, if they've completed the workshop
      content (`resolveParticipantDestination` gained a `final-feedback`
      case, gated on `workshop_feedback_released` and not-yet-submitted).
- [x] Participant screen at `/dashboard/[sessionId]/feedback`: 1-5 star
      rating (required), optional free-text box, required choice between
      "use my feedback publicly with my name" / "publicly but anonymously,"
      submit → thank-you screen with a link to submit their diagnostic
      (admin-editable, see below).
- [x] Admin reporting at `/admin/sessions/[sessionId]/feedback`: response
      count, average rating, individual ratings, written responses, and the
      name/anonymous permission per response.
- [x] Diagnostic follow-up link is admin-editable at
      `/admin/workshop-feedback-settings` (client's answer: "make it
      admin-editable" rather than hardcoding a URL) — a singleton settings
      row, blank hides the thank-you screen's link line entirely.

Verified live: rating bounds (1-5) enforced server-side, a participant
can't submit feedback for someone else's `participant_session_id`,
non-admins can't release feedback or edit the settings URL, settings are
publicly readable (needed for the thank-you screen).

## Executive Leverage Diagnostic

- [ ] Update the response options per the client's revised wording.
      **Blocked on content** — the actual new option text wasn't included.
      Good news: this is already fully self-serve at
      `/admin/diagnostic-config` (editing question prompts and answer-option
      text/order/scoring doesn't need a code change) — once we have the
      new wording, either the client can enter it directly, or send it over
      and it'll be entered the same way.

## Participant Registration / Intake (new — full spec received)

Client sent the full spec after the initial ask. Repurposes what used to
be a dev-only, always-skipped-in-production "Module 0 context" placeholder
(`hasCompletedExecutiveContext` returned `true` unconditionally in
production) into the real thing, at the same slot in
`resolveParticipantDestination` (first thing after signup, before Section
1). Full name and email are already collected at signup
(`ensure_participant`), so the intake form only asks what signup doesn't
already have: company, role/title, and current executive support.

- [x] Schema: `company_name`, `current_role_title`, one boolean per
      support role + `current_support_other_text` + `current_support_none`,
      `intake_started_at`/`intake_completed_at` on `participants`.
- [x] `save_participant_intake` RPC — own-row upsert, enforces "None of the
      above" mutual exclusivity and the conditional Other-text requirement
      server-side (not just in the UI). `intake_completed_at` set once,
      preserved on later edits (spec: editable after completion).
- [x] Participant UI at `/dashboard/[sessionId]/intake` (replaces the old
      `/context` placeholder route): Company, Role/Title, multi-select
      Current Executive Support with working mutual exclusivity + a
      conditional Other text field.
- [x] Gating: `hasCompletedIntake()` replaces the old always-true
      production placeholder — this is now a real, enforced gate before
      Section 1, both on the dashboard's CONTINUE card and the module
      page's server-side redirect guard.
- [x] Admin visibility: session roster gets a Company column; the
      participant detail page gets an Intake card (Company, Role, Current
      Executive Support as readable labels, e.g. "Executive Assistant ·
      Chief of Staff"); CSV export gets Company/Role/Current-support
      columns; Blueprint (web + PDF) shows role/company and current
      support.
- [ ] Admin **edit** of a participant's intake data (spec section 11) —
      not built yet, viewing is done. Lower priority than getting capture
      working; will add if there's time in this round.
- [ ] Recalculation-flagging when intake is edited after architecture
      generation (spec section 11's edge case) — explicitly not built in
      v1, flagging as a known gap rather than silently skipping it.
- [ ] Part 5's actual recommendation-engine role mapping (spec section 5's
      internal classification table) — the spec calls this "the eventual
      Part 5 recommendation engine," i.e. future work; this round only
      makes the structured data available for it to use later, doesn't
      build the mapping logic itself.
- [ ] **Still needs a live DB push + `supabase gen types` regen** before
      this can be verified end-to-end (blocked on Supabase CLI re-login,
      same recurring issue as every DB change this session).

## Not a build item

- [ ] **Live support during the Sept 3, 9-11am EST session** — this is a
      staffing/availability commitment for a person, not something to
      implement in code. For you to answer directly with the client.
