# Milestone 1 acceptance gate

Mirrors task instructions section 16. **Status: not yet run against a live
environment** — this workspace had no Docker available, so the Supabase
local dev stack (`supabase start`) couldn't run, and there was no existing
Supabase project to point at instead. `tsc --noEmit`, `eslint`, and
`next build` all pass (see below), which confirms the code compiles and is
internally consistent — it does not confirm these flows behave correctly
against a real database. Please run through this checklist against a real
Supabase project (the free tier is enough) before treating Milestone 1 as
accepted; each row is written so it can be checked off directly.

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

## Not part of this gate

Per the milestone split, these are intentionally out of scope and should
*not* block Milestone 1 sign-off: real diagnostic content/scoring, Zone of
Investment logic, Delegation Beliefs scoring, Executive Support Audit,
recommendation engine, architecture reveal, Blueprint PDF, aggregate
analytics, CSV export, Presentation Mode, 75-concurrent-user load testing
(brief section 25/29 — that's explicitly a Milestone 4 deliverable).
