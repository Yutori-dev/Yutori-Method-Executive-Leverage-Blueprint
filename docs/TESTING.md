# Acceptance gates

## Milestone 1 — accepted

Mirrors task instructions section 16. The app is now connected to a live
Supabase project (`Yutori-dev's Project`) with all migrations and dev seed
data applied; `docs/CLIENT_QUESTIONS.md` and the delivery message cover
what shipped. Checklist below kept for reference.

## Static checks (done)

- [x] `npm run typecheck` — passes, no errors
- [x] `npm run lint` — passes, no errors or warnings
- [x] `npm run build` — production build succeeds

## Participant flow

- [ ] Register with first/last name + email via a session's `/join/<code>`
      link
- [ ] Receive and open the magic-link email, land on the dashboard
- [ ] Dashboard shows participant name, session name, module list with
      correct LOCKED/OPEN state (only the module(s) up to the session's
      active module should be open)
- [ ] Attempting to open a locked module's URL directly redirects back to
      the dashboard (tests server-side enforcement, not just hidden links)
- [ ] Open the unlocked "Operating Altitude" module, answer the placeholder
      questions, confirm autosave (watch for the "Saved" indicator)
- [ ] Refresh the browser mid-module — answers are still there
- [ ] Close the tab, sign back in later — dashboard and module progress are
      unchanged
- [ ] Mark the module complete — dashboard reflects COMPLETE and the
      progress bar updates
- [ ] Register a second participant for the same session, confirm their
      progress is independent of the first

## Duplicate registration / auth edge cases

- [ ] Re-registering with the same email on the same session's join link
      resumes the existing participant_session rather than creating a
      second one (should be impossible to create a duplicate — enforced by
      a unique constraint, not just UI)
- [ ] Requesting a new magic link after letting one sit unused works (old
      link behavior doesn't need to be tested — Supabase invalidates on
      issuing a new one)
- [ ] A participant cannot see another participant's dashboard/session data
      (try navigating to a `participant_session` id that isn't theirs, or
      inspect network responses)
- [ ] Visiting `/admin` while signed in only as a participant redirects to
      `/admin/login`

## Facilitator/admin flow

- [ ] Provision an admin with `npm run seed:admin -- you@example.com "Name"`,
      sign in at `/admin/login`
- [ ] An email *not* in `admin_users` is rejected with a clear message at
      `/admin/login`, and does not get a working session afterward
- [ ] Create a session, confirm a join link is generated
- [ ] Session control panel shows the participant roster, current module,
      completion state, and last active time, and updates after a
      participant acts
- [ ] "Unlock next module" requires the inline confirmation step before it
      takes effect
- [ ] Unlocking updates every participant's dashboard in that session (no
      per-participant unlock is possible — confirm there's no way to do
      this from the UI)
- [ ] Edit a session's name/organization/date/format and confirm it persists
- [ ] Change a session's status and confirm it persists

## Cross-cutting

- [ ] Mobile viewport (phone-width) — registration, dashboard, and the demo
      module are all usable without horizontal scrolling or unreadable text
- [ ] Tablet viewport — same
- [ ] Simulate a dropped connection mid-autosave (e.g. dev tools "Offline"
      toggle while typing in the free-text question), then restore
      connection — no data loss, no unrecoverable UI state
- [ ] Confirm `NODE_ENV=production` build never renders the demo assessment
      (it's gated in `src/lib/data/moduleContent.ts`) — the "Operating
      Altitude" module should show the generic placeholder in a production
      build, not the demo questions
- [ ] Confirm no service-role key or other secret appears in browser
      devtools → Network/Sources for any page

## Not part of the Milestone 1 gate

Per the milestone split, these were intentionally out of scope for
Milestone 1 and should not have blocked its sign-off: real diagnostic
content/scoring, Zone of Investment logic, Delegation Beliefs scoring,
Executive Support Audit, recommendation engine, architecture reveal,
Blueprint PDF, aggregate analytics, CSV export, Presentation Mode,
75-concurrent-user load testing (brief section 25/29 — that's explicitly a
Milestone 4 deliverable).

---

## Milestone 2 — Zone of Investment + Delegation/Leverage

Mirrors the Milestone 2 acceptance goal and section 23 test list.

### What was actually verified live (not just read from the SQL)

Unlike a purely-static check, this was run against the real Supabase
project with a real test participant (created via the Auth admin API,
authenticated with a real access token, cleaned up afterward) exercising
every RPC directly — the same way a participant's browser would, and the
same way someone could if they bypassed the UI and called the API
directly. All of the following passed:

- [x] 9 responsibilities rejected, 13 rejected, 10 accepted
- [x] All 10 competency/passion ratings computed the correct matrix cell and
      macro zone for every cell exercised, matching the seeded configuration
- [x] Resulting zone distribution correctly split across all three macro
      zones (not just Zone of Investment)
- [x] 2 priority opportunities rejected
- [x] Selecting a Zone-of-Investment (ineligible) responsibility as a
      priority opportunity rejected
- [x] Exactly 3 eligible opportunities accepted, `selection_order` correctly
      1/2/3, `leverage_level_snapshot` populated on every row
- [x] A direct table `UPDATE` of `matrix_cell` using the participant's own
      access token — bypassing the Next.js app entirely — was blocked (0
      rows affected), confirming RLS has no write policy for that column
- [x] `calculate_delegation_readiness` aggregated real answers into
      per-dimension scores, and — with no scoring rules configured —
      correctly returned `overall_result: null` with the labeled fallback
      interpretation rather than an invented result
- [x] Calling `select_responsibilities` against a session where the Current
      Structure module was not cohort-unlocked was rejected

- [x] `npm run typecheck` — passes, no errors
- [x] `npm run lint` — passes, no errors or warnings
- [x] `npm run build` — production build succeeds against the live project

### What still needs a manual browser click-through

The above proves the RPC/security layer is correct. It does not exercise
the React UI itself (phase transitions, checkbox limits, matrix rendering).
No browser-automation tool was available in this environment, so please
run through this in an actual browser before treating Milestone 2 as
accepted:

- [ ] Current Structure: select fewer than 10 — Continue stays disabled;
      select 12 — the 13th checkbox becomes unselectable; select 10–12 —
      Continue enables and shows "X of 10–12 selected"
- [ ] Rate every selected responsibility for competency and passion —
      "View my Zone of Investment" only enables once all are rated
- [ ] Change a rating after seeing the matrix (use "Revise ratings") —
      placement updates correctly
- [ ] The completed matrix shows every selected responsibility in a
      plausible cell with a visible macro-zone legend
- [ ] Mark Current Structure complete — dashboard reflects it
- [ ] Delegation: answer the placeholder Delegation Beliefs questions —
      required-question gating matches Milestone 1's Operating Altitude
      behavior
- [ ] "See my Delegation Readiness" reveals the `[YUTORI CONTENT PENDING]`
      fallback result, not a blank or broken state
- [ ] Priority Delegation Opportunities only lists responsibilities rated
      outside Zone of Investment; selecting a 4th is prevented; fewer than
      3 eligible candidates shows the "revisit Current Structure" message
      instead of a broken picker
- [ ] Mark Delegation complete only becomes available once beliefs
      required questions are answered, a readiness result exists, and
      exactly 3 priorities are saved
- [ ] Refresh mid-flow at each stage (mid-selection, mid-rating, after the
      matrix, mid-assessment, after priority selection) — state restores
      correctly every time
- [ ] Log out and back in after finishing both modules — everything is
      still there
- [ ] Mobile viewport — the matrix scrolls horizontally inside its own
      container rather than breaking the page layout; responsibility
      checkboxes and rating pickers are comfortably tappable

### Not part of this gate

Per the milestone split: recommendation engine, primary/secondary
recommendation, architecture reveal, Blueprint generation, PDF, aggregate
facilitator analytics, CSV export, Presentation Mode. The Executive Support
Audit is also excluded — see `docs/CLIENT_QUESTIONS.md` item 5 for why.

---

## Milestone 3 — Recommendation Engine + Blueprint

Mirrors the Milestone 3 acceptance goal (rules engine, PDF generation,
progressive blueprint functionality).

### What was actually verified live

Same standard as Milestone 2 — run against the real Supabase project with
real, disposable test participants, not just read from the SQL:

- [x] A clear-majority scenario (2+ Priority Delegation Opportunities
      sharing a leverage level) produced a non-tied recommendation with the
      correct primary signal
- [x] A 1/1/1 split (three distinct leverage levels) produced `is_tied: true`
      with no primary signal guessed
- [x] With no rows in `recommendation_rules`, the rationale returned is
      exactly the brief's specified fallback copy, not an invented result
- [x] A participant's direct `select` on their own `architecture_recommendations`
      row returned zero rows before reveal, and the row immediately after an
      admin called the reveal RPC — confirming the gate lives in RLS, not
      just in what the page chooses to render
- [x] A non-admin calling the reveal RPC directly was rejected
- [x] Recalculating a recommendation after it's been revealed is rejected
      (protects reveal integrity)
- [x] An invalid reaction value was rejected; a valid one (`mostly` + a note)
      was accepted and persisted
- [x] **Full HTTP-level test through real cookie-based auth** (not just RPC
      calls): the `/dashboard/[sessionId]/blueprint` page returned 200 with
      the correct participant name and the fallback rationale visible; the
      `/api/blueprint/[id]/pdf` route returned a real `application/pdf`
      response starting with the `%PDF` magic bytes, at a non-trivial size;
      the owning participant and an admin could both download it; an
      unrelated participant was denied

- [x] `npm run typecheck` — passes, no errors
- [x] `npm run lint` — passes, no errors or warnings
- [x] `npm run build` — production build succeeds against the live project

### What still needs a manual browser click-through

- [ ] Architecture module: "Complete Delegation first" message shows if
      Priority Delegation Opportunities aren't done yet; "Calculate my
      Blueprint" button appears once they are; "Your Blueprint is ready"
      holding screen shows after calculating but before facilitator reveal
- [ ] As admin, the "Reveal Architecture to Cohort" control only appears
      once the Architecture module itself is unlocked, requires the inline
      confirmation step, and after confirming, every participant's holding
      screen updates to show their actual recommendation
- [ ] The reaction prompt (Yes / Mostly / Not yet + optional note) appears
      once revealed, and "Mark module complete" only enables after reacting
- [ ] The Blueprint page (`/dashboard/[sessionId]/blueprint`) reads cleanly
      as a single coherent document, not a raw data dump — Character
      (locked), Operating Altitude answers, the Zone of Investment matrix,
      Delegation results, and the Architecture section (locked or revealed
      depending on state)
- [ ] "Download PDF" produces a file that actually opens and looks
      reasonably polished, not broken or garbled, in a real PDF viewer
- [ ] Mobile viewport — the Blueprint page and PDF download link are usable

### Not part of this gate

Per the milestone split: final recommendation copy/decision table, the
Executive Support Audit, White Whale, Success Vision, aggregate facilitator
analytics, CSV export, Presentation Mode. See `docs/CLIENT_QUESTIONS.md`
items 9–11.
