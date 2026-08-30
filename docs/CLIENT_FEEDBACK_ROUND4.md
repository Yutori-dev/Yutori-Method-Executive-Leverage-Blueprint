# Client feedback — round 4 (2026-08-30)

Tracking checklist for the batch of feedback sent 2026-08-30 (text + 3
screenshots: a rating-card close-up, the full Zone of Investment mapping
screen, and Presentation Mode). Checked off as each item ships and is
verified live, same standard as every other round in
`docs/ARCHITECTURE_DECISIONS.md`. Items are grouped by area, not by the
order they were mentioned.

## Module unlocking

- [ ] **Module 1 unlocks automatically; module 2+ stay manual.** Investigated
      why "the first three modules were opened and unlocked automatically"
      — there's no auto-unlock default today (`active_module_id` starts
      `NULL`, meaning *nothing* is open). The "Unlock next module" button is
      cumulative: each click advances the cohort one module further, so
      clicking it 3 times while exploring the panel opens modules 1-3 at
      once, correctly per its current design. Fix: module 1 unlocks
      automatically (on session creation or when a session goes ACTIVE —
      deciding which), everything from module 2 onward still requires an
      explicit admin click, unchanged.
- [ ] **Real-time push to the next exercise on unlock.** When the admin
      unlocks a module (or a per-activity gate like White Whale/Leadership
      Wiring/Zone of Investment reveal), every participant who is currently
      on a holding screen and eligible for that exact next step gets
      auto-navigated there — no manual back-to-dashboard-and-back-in, no
      page refresh. Reuses the realtime pattern already live in
      `LiveRosterRefresher.tsx` (Postgres changes → debounced update), just
      subscribed on the participant's browser to the `sessions` row instead
      of the admin roster.

## Zone of Investment UI

- [ ] **Visually separate the Competency and Passion halves of each rating
      card** so they read as two distinct prompts, not one continuous
      question (per the close-up screenshot).
- [ ] **New bulk-selection step**, inserted between the
      Competency/Passion explanation screen and the grading screen:
      participant sees all 21 activities at once and picks their 10-12 in
      one quick pass (checkbox-style, not one at a time), *then* the
      existing grading screen filters down to just those 10-12 for
      Competency/Passion rating.

## Presentation Mode

- [ ] **Live-updating completion counter**, no manual refresh needed.
      Currently a static server-rendered snapshot (confirmed — no realtime
      wiring exists on this page today); needs the same
      `LiveRosterRefresher`-style subscription, watching
      `participant_module_progress` / `participant_sessions`.

## Final Workshop Feedback / Review step (new)

- [ ] Admin-gated release (mirrors the `architecture_revealed` /
      `zone_of_investment_revealed` boolean + RPC pattern already used
      three times in this app).
- [ ] On release, every currently-live, eligible participant is
      auto-navigated straight to it (same realtime mechanism as the module
      push above).
- [ ] A participant who isn't live at release time lands here automatically
      the next time they open the app, if they've completed the workshop
      content (extends `resolveParticipantDestination`'s destination table
      with a new `final-feedback` case).
- [ ] Participant screen: 1-5 star rating (required, "How would you rate
      your experience today?"), optional free-text box, required choice
      between "use my feedback publicly with my name" / "publicly but
      anonymously," submit → thank-you screen with a link to submit their
      diagnostic for follow-up.
- [ ] Admin reporting: response count, average rating, individual ratings,
      written responses, and the name/anonymous permission per response.

## Executive Leverage Diagnostic

- [ ] Update the response options per the client's revised wording.
      **Blocked on content** — the actual new option text wasn't included.
      Good news: this is already fully self-serve at
      `/admin/diagnostic-config` (editing question prompts and answer-option
      text/order/scoring doesn't need a code change) — once we have the
      new wording, either the client can enter it directly, or send it over
      and it'll be entered the same way.

## New: "Participant intake questions" tab

- [ ] **Blocked on spec.** No existing "intake" concept anywhere in the
      codebase to extend, and the message doesn't say what questions, how
      many, where they appear (before Module 0? a Presentation Mode tab?
      an admin-only report tab?), or what happens to the answers. Needs a
      real spec before this can be scoped.

## Not a build item

- [ ] **Live support during the Sept 3, 9-11am EST session** — this is a
      staffing/availability commitment for a person, not something to
      implement in code. For you to answer directly with the client.
