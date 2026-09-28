# What data the platform stores, what you can export, and the gaps

Everything below is kept in the database. Nothing is deleted when a session is archived. Archiving only hides the questions from participants; their answers, results and Blueprint stay.

## How to get it out

| Need | Where | Format |
|---|---|---|
| Every answer to every question, one session | Admin > Session > "Export all answers" | CSV (opens in Excel) |
| Every answer, one person across all their sessions | Admin > Participants > person > "Download all answers (CSV)" | CSV |
| One-row-per-person summary of a session | Admin > Session > Export | CSV |
| A person's Blueprint | Admin > Participants > person > Sessions > Blueprint (PDF from that page) | PDF |

The full export is "long" format: one row per participant, session, module and question, with the answer and a "Recorded at" time where one exists. Filter by column in Excel to slice by module or person.

## What is stored, per module

- **Intake (per person):** company, title, current executive support, whole-business operating system, when intake started and finished, privacy notice version and time accepted, registration date, last login.
- **Session enrollment:** completion state, started / completed / last active times, when Zone of Investment results were first viewed, per-module progress with start and completion times.
- **Operating Altitude / Diagnostic:** every answer (resolved to the option text), the calculated result, interpretation, points, percentage, dimension scores and strongest constraints. White Whale and Leadership Wiring self-identification.
- **Investment (Zone of Investment):** competency and passion rating for every responsibility, resulting matrix cell and zone.
- **Delegation:** every belief answer with its scale label, the three domain averages, strongest barrier domains, flagged and priority ownership-transfer opportunities, the priority delegation selections and the pressure-test response.
- **Leverage (Executive Support Audit):** every answer and the layer it maps to, the four layer scores, primary and secondary gaps.
- **Architecture:** the computed recommendation (signal type, leverage needs, primary and secondary architectures and actions, current-support match, systems-amplifier flag, logic version) and the participant's reaction and note.
- **Success Vision:** success vision and follow-up.
- **Wrap-up:** workshop rating, written feedback and permission flag, follow-up request.

## Known gaps (please read)

1. **Answers are overwritten, not versioned.** If a participant changes an answer, only the latest is kept. The "Recorded at" time is the last save.
2. **Option wording is resolved at export time.** The export shows the current wording of each answer option. If option wording is edited later, older answers display the new wording (the stored value is unchanged).
3. **Questions are stored by reference.** A question that is removed from the question set shows as "[Removed question]".
4. **Calculated results are snapshots.** Scores are stored when calculated; if the scoring rules change they are not recomputed automatically (the Architecture row has a "needs recalculation" flag).
5. **Delete Session is permanent.** It removes that session's enrollments and answers. Archive instead of delete to keep everything.
6. **No per-answer timestamps for every module.** Times are recorded per answer for the Diagnostic, Delegation, Audit and Zone of Investment, and per save for reflections; time spent per question or per module is not tracked.
7. **CSV, not multi-tab .xlsx.** Excel opens the CSV directly. Multi-tab workbooks would need an extra library.
8. **New modules are not exported automatically.** Each new module's data has to be added to the export when the module is built. This will be done as part of each module.
9. **Not yet built:** the four new modules and their artifacts (briefs pending) and the Character Assessment.
