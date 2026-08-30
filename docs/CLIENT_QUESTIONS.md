# Open questions for Yutori Method

Consolidated for the shared Google Doc. Grouped by whether they blocked
Milestone 1 (none did — placeholders/reasonable defaults were used
throughout) versus what they'll gate starting in Milestone 2.

## Decisions made without a client answer (not blocking, please confirm)

1. **How participants reach a specific session.** The brief describes admins
   selecting/configuring a session but doesn't specify how a participant
   lands in the right one. We generated a per-session join code and a
   `/join/<code>` link the admin can copy from the session control panel.
   Confirm this matches how you'll actually distribute it (Zoom chat, email,
   YPO portal) — if it needs to be read aloud or typed manually, we may want
   a shorter/friendlier code format than the current auto-generated one.

2. **[RESOLVED] Admin authentication mechanism + self-service provisioning.**
   Email+password (temporarily — see `docs/ARCHITECTURE_DECISIONS.md`),
   gated by an allowlist table. Any existing admin can now add another one
   directly in the app (`/admin/admins`, or "Manage admins" in the header
   on any admin page) — enter an email and name, a password is generated
   and shown once to share with them. Fulfills
   brief section 3.1's "future architecture should not make additional
   admin accounts difficult to add." The local script
   (`npm run seed:admin`) still exists for provisioning the very first
   admin on a fresh project, since a brand-new project has no admin yet to
   use the in-app screen.

3. **Deployment target.** The original brief was written for "a skilled
   Replit specialist." The Milestone 1 instructions we received specified a
   Vercel-compatible Next.js/Supabase stack instead, which is what we built.
   Flagging the discrepancy in case Replit hosting was still assumed
   somewhere downstream.

4. **Fit module during the virtual-only phase.** We show "Fit (Live
   Workshop)" (renamed from "Character — Live Workshop" per Nicole's
   2026-08-30 menu update) as a permanently locked seventh row on the
   dashboard (never counted toward virtual progress), per brief sections
   1.2/5.1/12. Confirm you want it visible-but-locked during the virtual
   workshop rather than hidden entirely until the live-workshop milestone
   exists.

## Content dependencies (brief section 30) — not blocking Milestone 1, will block Milestone 2+

Restating the brief's own register so it's tracked in one place: Leadership
Leverage Diagnostic (A), Responsibility Library (B), Zone Matrix (C),
Delegation Beliefs Assessment (D), Executive Support Audit (E),
Recommendation Rules (F), Architecture Visual (G), EA Role Profile (H),
CEO/EA Case (I), Observational Homework (J), Brand Assets (K). Milestone 1
ships clearly labeled `[YUTORI CONTENT PENDING]` placeholders everywhere
these belong.

**[RESOLVED] Item A, Leadership Leverage Diagnostic, is now real content.**
You sent a full Developer Implementation Specification V1 for the
"Executive Leverage Diagnostic™" — 15 questions, scoring formula, profile
categories, constraint tie-break order, facilitator dashboard, and admin
configuration. Built exactly to that spec and replaces the Operating
Altitude module's placeholder assessment; see `README.md` and
`docs/TESTING.md` for what was verified. Items B-K remain open.

## Milestone 2 scope boundary (please confirm)

5. **Executive Support Audit and the leverage-mapping reveal are not in
   Milestone 2.** The Milestone 2 brief you sent lists "responsibility
   selection, matrix, beliefs assessment, and priority opportunities" —
   it doesn't mention the Executive Support Audit or Activity 4B's mapping
   reveal. Those live in the brief's Module 4 and feed directly into the
   recommendation engine, which the pricing breakdown puts under Milestone 3
   ("Recommendation Engine + Blueprint"). We built Milestone 2 as: responsibility
   selection → competency/passion rating → the nine-box matrix → Delegation
   Beliefs assessment → Priority Delegation Opportunity selection, with the
   leverage classification captured and stored (hidden) but never shown to
   the participant. If you actually want the Executive Support Audit pulled
   forward into this milestone, say so before Milestone 3 starts.

## Milestone 2 content dependencies — not blocking, will block Milestone 3

6. **[RESOLVED] Final Responsibility Library (content dependency B).** You
   sent a full Zone of Investment implementation spec with the real 21-item
   library, exact order, and wording. Built exactly to that spec, replacing
   the 20 development placeholders. One thing still open: each
   responsibility's hidden Executive Leverage Level (used by the Priority
   Delegation Opportunity → Architecture recommendation pipeline) wasn't
   part of this spec — your own spec text defers it ("will be specified
   when the leverage-level mapping is built"). Until that's supplied, a
   participant whose 3 priorities include one of these new responsibilities
   gets a controlled "pending" Architecture result rather than a guessed
   one — see `docs/ARCHITECTURE_DECISIONS.md`. As of 2026-08-30, two more
   features depend on this same mapping: the Priority Leverage
   Opportunities Reveal and the reworked Executive Support Architecture
   engine (see `docs/CLIENT_FEEDBACK_ROUND4.md`) — both are fully built
   and tested against controlled data, but will show a pending state for
   every real participant until this is supplied.

7. **[RESOLVED] Final 9-cell Zone of Investment mapping and terminology
   (content dependency C).** Same spec supplied the exact 9 zone names
   (Zone of Genius, Zone of Incompetence, etc.) and macro-zone grouping.
   Built exactly to that spec, including the correct axis orientation
   (competency as rows, passion as columns) and a facilitator-gated reveal
   that didn't exist before (the personalized matrix is now held until the
   facilitator reveals it, mirroring how the Architecture recommendation
   already works).

8. **Final Delegation Beliefs questions and scoring (content dependency
   D).** We built a placeholder 2-dimension assessment (Trust, Control) and
   a scoring-rules table that's intentionally left empty, so the "Delegation
   Readiness" result currently always shows a labeled fallback message
   rather than an interpreted score. Once you supply real questions,
   dimensions, and thresholds, they go into that table — no code change
   needed to light up real scoring.

## Milestone 3 scope boundary (please confirm)

9. **Executive Support Audit still not included.** Same reasoning as item 5
   — your Milestone 3 description ("rules engine, PDF generation, and
   progressive blueprint functionality") doesn't mention it, so the
   recommendation engine currently only uses the primary signal (majority
   leverage level across your three Priority Delegation Opportunities). If
   Yutori wants the audit's contextual signal folded into the recommendation,
   that's Milestone 4 territory as things stand — say so if not.

10. **[RESOLVED] White Whale and Success Vision are now built.** Captured as
    private free-text reflections (own module page for Success Vision;
    alongside Operating Altitude for White Whale), shown only to the owning
    participant and admins, never aggregated or shown in Presentation Mode.
    Final prompt copy from Yutori (brief sections 1B and 11) would still be
    worth confirming against what's live — the current copy is the brief's
    own verbatim language, not a placeholder, but hasn't been separately
    approved.

## Milestone 3 content dependencies — not blocking, will block full recommendation copy

11. **Final recommendation decision table (content dependency F, brief
    section 8.5).** The recommendation engine is real and fully live end to
    end — it computes the actual majority leverage-level signal from a
    participant's three Priority Delegation Opportunities, detects 1/1/1
    ties, and stores the full signal breakdown so the rationale is always
    explainable. But the `recommendation_rules` table it looks up against is
    intentionally empty, so every participant currently sees the brief's own
    specified fallback ("Your results indicate a mixed leverage profile that
    requires additional interpretation") rather than a named recommendation
    like "High-Leverage Executive Assistant." Once you supply the real
    decision table (primary/secondary mapping, tie handling, exception
    logic, approved copy), it's a data change to that table — no code
    change needed.

## Milestone 4 notes

12. **Aggregate views only show data that actually exists.** The facilitator
    aggregate dashboard (module completion, Zone of Investment distribution,
    most common Priority Delegation Opportunities, recommendation/reaction
    breakdown, and now Visionary/Integrator/Hybrid distribution) deliberately
    does not attempt Executive Support Audit results, current-support-role
    breakdowns, or EOS/Bloom usage — none of that content has been built
    (see items 5 and 9), and an empty chart for it would be misleading
    rather than useful. It'll extend naturally once those pieces exist. As of
    the gap-fill pass this same view is also available cross-session at
    `/admin/analytics`, and as a facilitator-selectable projector view at
    `/admin/sessions/[id]/present` (brief §19, Presentation Mode).

13. **CSV export columns are a curated set, not a raw dump.** Brief section
    22 lists "raw responses" among the export columns; we exported a
    structured summary per participant instead (identity, module
    completion, Zone of Investment counts by macro zone, the three Priority
    Delegation Opportunities with leverage levels, the architecture
    recommendation signal and reaction) rather than every raw question/
    answer pair, which doesn't flatten cleanly into CSV columns across a
    configurable question set. Say the word if you specifically need the
    raw per-question answers included too — that's a straightforward
    addition, just deferred as a judgment call on what's actually useful
    in a spreadsheet.

## Legal (brief section 26) — not blocking Milestone 1, must resolve before real participant data is collected

Privacy policy, retention term, deletion policy, research consent, Terms of
Use, and any YPO-specific requirements are all still open per the brief.
**Consent capture itself is now built** — registration shows a collapsible
privacy notice and requires an explicit checkbox before continuing, and
`participants.privacy_consent_given_at` / `privacy_consent_version` record
when and against which copy version consent was given. The copy shown is
still the brief's own **draft** language, explicitly labeled
"pending Yutori approval" in the UI itself — it must not go in front of a
real (non-dev) participant until Yutori's actual privacy policy, retention
term, deletion policy, research consent, and Terms of Use are approved and
swapped in. Because consent is versioned, swapping in the real copy and
bumping the version string is a content change, not a code change, and
won't invalidate or misrepresent consent already recorded under the draft.

## Google Sheets sync (brief — explicitly nice-to-have)

Not built. Needs a Google Cloud project with an OAuth 2.0 client (client ID
+ secret, and a decision on whether it's a service account with a shared
sheet or per-admin OAuth) that hasn't been provided. Everything else flagged
as a gap in earlier delivery messages has been built as of this pass (see
`README.md`); this is the one remaining item, blocked purely on credentials
rather than scope or effort.
