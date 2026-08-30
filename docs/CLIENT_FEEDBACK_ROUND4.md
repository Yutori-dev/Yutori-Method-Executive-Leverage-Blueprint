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
- [x] Live DB push + type regen — done, verified live end-to-end.

## Not a build item

- [ ] **Live support during the Sept 3, 9-11am EST session** — this is a
      staffing/availability commitment for a person, not something to
      implement in code. For you to answer directly with the client.

---

# Round 5 — full V1 developer specs (2026-08-30, same day)

Client sent formal "Developer Implementation Specification — V1" documents
for Intake, Executive Leverage Diagnostic, White Whale, Leadership Wiring,
Zone of Investment, Delegation Beliefs Assessment, and Priority Delegation
Opportunities. Asked to audit the four already-shipped activities against
their formal specs and fix any drift, and rebuild the two that needed it.

## "Section 4" question — resolved, no spec needed to unblock this round

Checked the codebase directly: Section 4 = the `leverage` module
("Executive Support Audit and leverage mapping reveal"), sort_order 4,
between Delegation and Architecture. **It's completely unbuilt** — a
participant reaches a literal `[YUTORI CONTENT PENDING]` placeholder card
today. The `leverage_level` classification these specs reference ("Hidden
Executive Leverage Level," "for later use in Section 4") already exists as
a data field and is already being computed/stored — nothing participant-
facing consumes it yet. This doesn't block anything in this round; still
worth getting the actual Section 4 spec from Nicole whenever it's ready.

## Audit: 4 already-shipped activities vs. their formal specs

- [x] **White Whale** — exact match. Header, setup copy, prompt,
      placeholder, privacy note all verified byte-for-byte against the DB
      content. No changes needed.
- [x] **Leadership Wiring** — exact match on header/prompt/descriptions.
      Found `leadership_wiring_config.dashboard_note` seeded in the DB but
      never rendered anywhere — fixed, now shows under the Visionary/
      Integrator/Hybrid distribution on the facilitator aggregate dashboard.
- [x] **Zone of Investment** — content (21 responsibilities, 9 zone
      names/macro-zones, competency/passion definitions, reflection
      prompts) matches exactly. Fixed two missing headers ("Map Your
      Current Responsibilities," "Your Zone of Investment Map") that the
      spec calls for and the UI didn't show.
      **⚠️ Flagging, not resolving unilaterally**: Nicole's formal spec
      describes rating all 21 responsibilities directly on one screen (no
      separate selection step) — but you explicitly asked for a bulk
      "pick your 10-12 first" step in round 4, which is now built and
      live. These two now genuinely conflict. Left the selection step in
      place (it was your explicit, detailed, most-recent instruction) but
      you should know the two don't match — worth deciding whether to tell
      Nicole about the deviation or revert it.
- [x] **Executive Leverage Diagnostic** — turned out to already match the
      new spec almost entirely (question count, 52-point scoring, exact
      thresholds, exact profile names/descriptions, exact constraint
      labels, exact tie-break priority order — all built against an
      earlier draft of this same spec). Only response-option *wording*
      differed, on the Baseline question and 8 of 13 scored questions.
      Shipped as assessment version 2 with corrected wording only,
      everything else carried over unchanged. Verified live end-to-end
      (signup → answer all 15 → calculate → correct result and tie-break
      order).

## Rebuilt: Delegation Beliefs Assessment

- [x] Full rebuild, replacing the dev-only 4-question placeholder. Real
      schema (10 belief questions across Trust & Control / Team & Outcomes
      / Workload & Resources, individually-interpreted Ownership Transfer
      Indicators), real content, server-side scoring/interpretation/tie
      logic, admin-configurable thresholds, one-question-at-a-time
      participant flow. Priority Delegation Opportunities now gates on
      this real result instead of the old unconfigured "Delegation
      Readiness" step. Blueprint (web + PDF) and the admin coaching view
      updated to show Primary Delegation Barrier + Priority Ownership
      Transfer Opportunity.
- [x] Verified live: domain averaging, threshold-based interpretation
      selection, strongest-barrier ties, "no primary barrier surfaced"
      fallback, ownership-transfer flagging with correct tiebreak, and
      per-question autosave gated on module unlock.
- [x] Admin editing of Delegation Beliefs copy — `/admin/delegation-beliefs-config`:
      intro copy, per-domain interpretation copy (3 domains × 3 ranges),
      thresholds, and all 15 questions (prompt + domain, or opportunity
      label + both interpretation texts for Ownership Transfer
      Indicators). Saves as a new version, same as the Diagnostic. Added
      the admin write RLS policies this needed (only had a read policy
      from the original build). Verified live: non-admin writes rejected.

## Priority Delegation Opportunities enhancement — done

- [x] Pressure-test step (Yes/Somewhat/No) after selecting; Somewhat/No
      offers "revisit my selections" (returns to selection, retained and
      editable) or "keep these selections" (proceeds to confirmation).
      Required selection count now adapts to eligibility — fewer than 3
      eligible lowers the bar to match, zero eligible skips straight to
      the "none assigned" confirmation. New `priority_delegation_pressure_test`
      table + RPCs; `select_priority_delegation_opportunities` reworked
      for the variable count and clears any prior pressure-test answer
      when selections change.
- [x] Facilitator dashboard: added a Pressure Test distribution card.
- [x] All copy admin-editable at `/admin/priority-delegation-config`
      (intro, fewer-than-three, zero-eligible, zone descriptions,
      pressure-test question, follow-up copy, confirmation copy) — the
      participant flow reads from this table now, not hardcoded strings.
- [x] Verified live: full select → pressure test → revisit → reselect
      cycle, and required-count enforcement with only 2 of 3 eligible.

## Participant Intake — remaining items done

- [x] Admin can now edit a participant's Company/Role/Current Executive
      Support directly from the participant detail page (new
      `admin_update_participant_intake` RPC, admin-gated, edit/view toggle).
- [x] Architecture-recalculation flagging: editing intake (by the
      participant or an admin) after an architecture recommendation
      already exists flags it (`needs_recalculation`), surfaced as a note
      on the Architecture card in the admin view. Verified live.
- [ ] Part 5's actual recommendation-engine role-mapping logic is still
      not built — the spec itself calls this "eventual" future work, and
      current-support data still doesn't influence the architecture
      recommendation's output. Everything else in the Intake spec is done.

## Nicole's live-test feedback (2026-09-07)

- [x] **"Did not recall seeing this full set of questions upon
      registering."** Full Name and Email Address (spec Questions 1-2)
      were already collected at signup, so the intake form only asked for
      what signup didn't have — Company/Role/Current Executive Support.
      That made those two questions invisible as part of "the intake" even
      though the data existed. Fixed: First Name/Last Name (editable,
      prefilled) and Email Address (shown, read-only — it's the auth
      identifier) now appear as visible questions on the intake form
      itself, in spec order, mirrored on the admin edit form too. Verified
      live: name updates correctly, empty name rejected.
- [x] **Zone of Investment selection-step conflict — resolved, went with
      Nicole's spec.** Reverted the round-4 "pick your 10-12 first, then
      grade" step; participants now rate all 21 responsibilities directly
      on one screen with a live counter, matching her V1 developer spec
      exactly. Unrelated round-4 improvements (visual separation, headers,
      realtime push-nav) are untouched.

## Genuinely still open (not something to silently resolve)

- [ ] **Section 4 (the `leverage` module / "Executive Support Audit")** —
      confirmed completely unbuilt, no spec received yet. Doesn't block
      anything else.
- [ ] **Live support during the Sept 3, 9-11am EST session** — a staffing
      commitment, not a build item.
