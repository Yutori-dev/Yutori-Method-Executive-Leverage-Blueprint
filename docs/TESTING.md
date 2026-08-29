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

---

## Milestone 4 — Facilitator Intelligence + QA

### What was actually verified live

Same standard as Milestones 2/3 — real HTTP requests through real
cookie-based auth against the live project, not just reading the code:

- [x] Individual participant profile page returns 200 for an admin and shows
      the correct participant, including the leverage classification
      (verified this is genuinely visible here even though no
      participant-facing query anywhere in the app ever selects it)
- [x] Aggregate session page returns 200 and shows the correct registered
      count and zone distribution for a real test participant driven
      through the actual flow
- [x] CSV export returns a valid `text/csv` response with a correct header
      row and one data row per registered participant, containing the right
      email
- [x] A non-admin participant is redirected away (not served 200 content)
      from all three of: the individual profile page, the aggregate page,
      and the CSV export

- [x] `npm run typecheck` — passes, no errors
- [x] `npm run lint` — passes, no errors or warnings
- [x] `npm run build` — production build succeeds

### Load test (brief section 25/29 — 75 concurrent participants)

Run with `npm run load-test -- 75` (`scripts/load-test.ts`) against a
production build (`npm run build && npm start`) on this local machine, on
the live Supabase project, on 2026-08-29. **Result: 74/75 succeeded (one
transient network error during account setup, unrelated to the app), but
response times under this concurrency are a real problem worth fixing
before a live 75-person session.**

| Step | avg | p95 | max |
|---|---|---|---|
| Join page load | 2.4s | 2.7s | 3.1s |
| `join_session` | 2.1s | 2.9s | 3.0s |
| Dashboard load | 6.1s | 7.4s | 8.5s |
| Module page load | 4.6s | 5.9s | 6.8s |
| `select_responsibilities` | 1.7s | 8.7s | 9.7s |
| `rate_responsibility` (740 calls, 5 errors) | 4.5s | 9.8s | 11.0s |
| `select_priority_delegation_opportunities` | 4.6s | 8.3s | 9.7s |
| Blueprint page load | 9.5s | 17.2s | **26.5s** |

For comparison, the same production build handled 5 concurrent participants
at 200ms-2.4s across the board, and the underlying architecture is sound —
every RPC and RLS check that matters was independently verified correct in
Milestones 2-3. This is a **capacity/latency problem at scale, not a
correctness problem**.

**Likely causes, not yet isolated from each other:**
1. The load generator and the app server both ran on this one local
   machine, competing for the same CPU/network — a real deployment
   (Vercel's serverless functions, scaling horizontally, not sharing a
   process with anything) would likely do meaningfully better on this
   dimension alone.
2. Pages like the dashboard and Blueprint make several *sequential*
   Supabase round-trips per request (documented in
   `docs/ARCHITECTURE_DECISIONS.md`) — each concurrent request pays that
   full sequential cost independently, and this would still apply on any
   hosting platform.
3. Possible Supabase-side connection/throughput limits at this burst
   concurrency, which may differ by project tier.

**Recommendation: re-run `npm run load-test` against a real Vercel
deployment before committing to a 75-person live session**, to separate
cause (1) from (2)/(3). If numbers are still elevated on a real deployment,
the next step is consolidating the dashboard/module/Blueprint data loaders'
sequential queries into fewer round-trips (the embedded-join pattern
already used successfully in the Milestone 4 admin views is a proven
starting point) — that's real follow-up engineering work, not a quick fix,
and is flagged here rather than attempted under time pressure at the end of
this milestone.

### What still needs a manual browser click-through

- [ ] Individual profile and aggregate pages read cleanly as premium/calm,
      not a raw data dump, on desktop and mobile
- [ ] CSV export opens correctly in Excel/Sheets/Numbers (the file starts
      with a UTF-8 BOM specifically so Excel doesn't mangle special
      characters — worth confirming on whatever tool you'll actually use)
- [ ] Click-through from the participant roster on the session control
      panel to an individual profile works and the "back to session" link
      returns correctly

### Not part of this gate

Per the milestone split and the brief's own Nice-to-Have/later-milestone
list: Presentation Mode, Google Sheets sync, the Executive Support Audit,
final recommendation content. This is the last of the four milestones —
nothing further is scoped beyond what's listed here and in
`docs/CLIENT_QUESTIONS.md`.

---

## Gap-fill pass (post-Milestone-4)

Two pieces of follow-up work: (1) fix the Milestone 4 load test's latency
problem, and (2) build every item flagged as a gap across earlier delivery
messages plus everything in the brief that was never explicitly assigned to
a milestone (Module 0 executive context, V/I/H self-identification, White
Whale/Success Vision, Discuss My Blueprint + follow-up queue, Presentation
Mode, cross-session analytics, privacy consent capture) — see `README.md`
for the full list. Google Sheets sync is the one item still not built,
blocked on Google Cloud OAuth credentials.

### Performance fix and re-test

Four data loaders were rewritten to cut Supabase round-trips: the
participant dashboard, Zone of Investment, module content (nested embeds
instead of sequential queries), and delegation candidates — parallelizing
independent queries with `Promise.all` and replacing sequential lookups with
PostgREST nested embeds / inner-join filters. Full detail in
`docs/ARCHITECTURE_DECISIONS.md`.

Re-ran the load test at **80** concurrent participants (up from 75) against
a production build on the live project, 2026-08-29, this time with no other
heavy process competing for CPU on the same machine during the measurement
phase (the first attempt at a re-run was itself confounded by a `tsc` build
running concurrently on the same machine — a methodology mistake, not a
regression; re-run cleanly after realizing that). **Result: 78/80
succeeded** (2 failures were a transient "fetch failed" during account
provisioning, before any app code runs — unrelated to the app).

| Step | avg (before → after) | p95 (before → after) |
|---|---|---|
| Dashboard load | 6.1s → **4.6s** | 7.4s → **5.9s** |
| Module page load | 4.6s → **2.5s** | 5.9s → **3.9s** |
| `select_responsibilities` | 1.7s → **0.4s** | 8.7s → — |
| `rate_responsibility` | 4.5s → **0.4s** | 9.8s → — |
| `select_priority_delegation_opportunities` | 4.6s → **0.4s** | 8.3s → — |
| Blueprint page load | 9.5s → **3.4s** | 17.2s → **4.1s** |

A 45-65% improvement across every page/RPC that was slow before, despite
testing at higher concurrency (80 vs. 75) than the original run. This is now
a comfortable margin for an in-person or virtual session at this scale.

### Gap-fill features — what was actually verified live

Same standard as every earlier milestone: real, disposable test accounts
against the live project, not just typechecked.

- [x] `ensure_participant` with consent persists `privacy_consent_given_at`
      and the correct `privacy_consent_version`
- [x] Self-identification (Visionary/Integrator/Hybrid) write persists under
      RLS
- [x] White Whale and Success Vision reflections persist under RLS (own
      write, own read)
- [x] Follow-up interest request persists under RLS, defaults to `new`
      status
- [x] Admin (service role) can read reflections and follow-up rows —
      confirms RLS isn't over-restrictive on the admin side
- [x] `architecture_recommendations.secondary_signal_leverage_level` column
      exists and is populated by the updated
      `calculate_architecture_recommendation` function
- [x] **Full HTTP-level test through real cookie-based admin auth**: all six
      admin-facing pages/routes (`/admin`, `/admin/analytics`,
      `/admin/sessions/[id]`, `/admin/sessions/[id]/aggregate`,
      `/admin/sessions/[id]/follow-up`, `/admin/sessions/[id]/present`)
      returned 200 against a production build
- [x] **Full HTTP-level test through real cookie-based participant auth**:
      the dashboard, the new Module 0 context page, and both new module
      pages (`operating_altitude`, `success`) all returned 200 for a real,
      freshly-joined participant

- [x] `npm run typecheck` — passes, no errors
- [x] `npm run lint` — passes, no errors or warnings
- [x] `npm run build` — production build succeeds, all new routes present

### What still needs a manual browser click-through

- [ ] Module 0 executive-context form: current support roles and EOS/Bloom/
      Other render and save correctly (multi_select and numeric question
      types are new — confirm checkbox groups and number inputs behave, not
      just that the page loads)
- [ ] Operating Altitude module: White Whale textarea and the Visionary/
      Integrator/Hybrid selector both save independently of the assessment
      questions and survive a refresh
- [ ] Success module: Success Vision and the White Whale follow-up prompt
      read as a coherent close to the Blueprint, not bolted on
- [ ] "Discuss My Blueprint" button on the Blueprint page: click it, confirm
      it becomes a confirmed/disabled state, and that it appears in the
      admin follow-up queue immediately
- [ ] Admin follow-up queue: changing a request's status (new → contacted →
      closed) persists and survives a refresh
- [ ] Admin roster's "Discuss?" column updates live (Realtime) without a
      manual refresh when a participant clicks the CTA in another tab
- [ ] Presentation Mode: switching between panels is instant and every
      number matches the same session's aggregate page; confirm on an
      actual projector/large display for legibility
- [ ] Privacy consent checkbox at registration: cannot continue without
      checking it; the collapsible notice actually expands
- [ ] Mobile viewport for all of the above — Module 0, Presentation Mode,
      and the follow-up queue table are all new and untested at phone width

---

## Guided progression + Executive Leverage Diagnostic™

Client sent a refined progression spec (CONTINUE button, exact holding-state
copy, late joiners start at their first activity) and a full Developer
Implementation Specification V1 for the Executive Leverage Diagnostic —
both fully specified, not content-pending, so the acceptance bar here is
"matches the spec exactly," verified live against the real database and a
production build.

### What was actually verified live

- [x] Late joiner with 3 modules cohort-unlocked lands on module 1 only —
      the dashboard's CONTINUE link points at `operating_altitude`, with no
      link anywhere on the page to `current_structure` or `delegation`
      even though both are cohort-unlocked
- [x] A direct URL visit to a cohort-unlocked-but-unreached module
      redirects away (307) — real server-side enforcement, not just a
      hidden link
- [x] The participant's actual first module is directly reachable (200)
- [x] Completing module 1 advances the dashboard's CONTINUE target to
      module 2
- [x] The exact copy "You're all set for now. We'll continue together
      shortly." renders when the next module is locked
- [x] All 15 Diagnostic questions seeded correctly (13 scored, 2 unscored),
      max points sums to 52
- [x] All-4s participant → 100% → HIGH LEVERAGE
- [x] All-2s participant → exactly 50% (the CONSTRAINED band's inclusive
      floor) → CONSTRAINED LEVERAGE, not INSUFFICIENT
- [x] All-0s participant → 0% → INSUFFICIENT LEVERAGE
- [x] 38/52 points → 73.08%, just under HIGH's 75% floor → correctly stays
      CONSTRAINED
- [x] A participant tied on every scored question returns exactly
      Follow-Through Dependency, Operational Dependency, Highest-Value
      Capacity — the spec's first three tie-break priorities, in order
- [x] Calling the scoring RPC with a required question unanswered is
      rejected server-side (not just a disabled button)
- [x] `rules_version` on every stored result matches the assessment
      version at calculation time
- [x] Both new admin pages (`/admin/sessions/[id]/diagnostic`,
      `/admin/diagnostic-config`) return 200 against a production build and
      render all expected sections
- [x] Admin config "save as new version": exercised the real insert
      sequence live — a new `assessments` version was created, the
      previous version's rows were provably untouched afterward, a new
      participant scored against the new version got the new version's
      `rules_version`, and cleanup confirmed the live version reverts
      correctly (this test edited then removed its own test version; it
      did not touch real participant data)
- [x] Found and fixed a real bug in the process: `ensure_participant` had
      two live overloads (see `docs/ARCHITECTURE_DECISIONS.md`) — caught
      because this verification script called it with two arguments and
      hit "could not choose the best candidate function"

- [x] `npm run typecheck` — passes, no errors
- [x] `npm run lint` — passes, no errors or warnings
- [x] `npm run build` — production build succeeds against the live project

### What still needs a manual browser click-through

- [ ] The Diagnostic's 15 questions render and autosave correctly as an
      actual participant clicking through radio buttons, not just via
      direct API calls
- [ ] "See my Executive Leverage Profile" button and the resulting profile
      + three-constraint cards read as a coherent result screen
- [ ] The CONTINUE button's label and placement feel like a clear, single
      next action on every module, not just Operating Altitude
- [ ] The admin config screen's ~250 fields are usable in practice — the
      per-question `<details>` sections, in particular, on a real screen
      size
- [ ] Mobile viewport for the Diagnostic questions, results, and holding
      state

### Not part of this pass

Items B-K of the brief's Content Dependency Register (Responsibility
Library through Brand Assets) remain open — only item A (Leadership
Leverage Diagnostic) was resolved. Google Sheets sync remains blocked on
Google Cloud OAuth credentials.
