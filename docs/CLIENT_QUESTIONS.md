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

2. **Admin authentication mechanism.** Not specified in the brief. We used
   the same passwordless magic-link pattern as participants, gated by an
   allowlist table. New admins are currently provisioned by running a script
   with the Supabase service role key — i.e. by whoever has developer
   access, not self-service. The brief notes "future architecture should not
   make additional admin accounts difficult to add" (section 3.1) — if
   Nicole/Valerie need to add facilitators themselves without engineering
   involvement, that's a small additional screen worth scoping into a later
   milestone.

3. **Deployment target.** The original brief was written for "a skilled
   Replit specialist." The Milestone 1 instructions we received specified a
   Vercel-compatible Next.js/Supabase stack instead, which is what we built.
   Flagging the discrepancy in case Replit hosting was still assumed
   somewhere downstream.

4. **Character module during the virtual-only phase.** We show "Character —
   Live Workshop" as a permanently locked seventh row on the dashboard
   (never counted toward virtual progress), per brief sections 1.2/5.1/12.
   Confirm you want it visible-but-locked during the virtual workshop rather
   than hidden entirely until the live-workshop milestone exists.

## Content dependencies (brief section 30) — not blocking Milestone 1, will block Milestone 2+

Restating the brief's own register so it's tracked in one place: Leadership
Leverage Diagnostic (A), Responsibility Library (B), Zone Matrix (C),
Delegation Beliefs Assessment (D), Executive Support Audit (E),
Recommendation Rules (F), Architecture Visual (G), EA Role Profile (H),
CEO/EA Case (I), Observational Homework (J), Brand Assets (K). Milestone 1
ships clearly labeled `[YUTORI CONTENT PENDING]` placeholders everywhere
these belong.

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

6. **Final Responsibility Library (content dependency B).** We seeded 20
   development-placeholder responsibilities (clearly labeled `[PENDING]`)
   spread across all four leverage classifications so the selection/rating
   mechanism is testable. These are not real Yutori content and must be
   replaced wholesale — the `responsibilities` table is versioned so
   swapping them in is a data change, not a code change.

7. **Final 9-cell Zone of Investment mapping and terminology (content
   dependency C).** We invented a placeholder cell-to-macro-zone assignment
   (documented in `docs/ARCHITECTURE_DECISIONS.md`) purely to make the
   matrix/eligibility mechanism demonstrable end to end. This is explicitly
   **not** Yutori's approved methodology — every cell name and the mapping
   itself needs your final version before this module can go live for a
   real participant.

8. **Final Delegation Beliefs questions and scoring (content dependency
   D).** We built a placeholder 2-dimension assessment (Trust, Control) and
   a scoring-rules table that's intentionally left empty, so the "Delegation
   Readiness" result currently always shows a labeled fallback message
   rather than an interpreted score. Once you supply real questions,
   dimensions, and thresholds, they go into that table — no code change
   needed to light up real scoring.

## Legal (brief section 26) — not blocking Milestone 1, must resolve before real participant data is collected

Privacy policy, retention term, deletion policy, research consent, Terms of
Use, and any YPO-specific requirements are all still open per the brief. No
privacy/consent copy is shown to participants yet because none has been
approved. This should be resolved before a real (non-dev) session goes live,
likely alongside Milestone 2.
