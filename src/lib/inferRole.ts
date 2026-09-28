/**
 * Visionary / Integrator read from a job title (client brief 2026-09): "anyone
 * who has a title assistants, COO, etc is an integrator; anyone who is CEO
 * etc is a visionary." Plain module (no server-only) so it can be unit-tested
 * and reused; masterProfile.ts computes it on read from the most recent title
 * rather than storing it, so it can't go stale.
 *
 * The first version matched bare substrings, which misfired on real titles in
 * production data -- "ea" matched inside "Area Director", "Head of Sales"
 * and "Team Lead"; "coo" matched "Coordinator"; "president" matched "Vice
 * President". Matching is now on whole words / phrases, the integrator set is
 * the app's own support-role taxonomy (see currentSupportLabels.ts), and
 * anything ambiguous returns null so an admin decides rather than the code
 * guessing.
 */

export type InferredRole = "visionary" | "integrator";

// Assistant-type titles are the strongest integrator signal and win even when
// the title also names a leader ("Assistant to the CEO" is an integrator).
const ASSISTANT_PATTERN = /\b(assistant|assistants|ea)\b/;

// The remaining integrator roles from the intake's own support taxonomy.
const OTHER_INTEGRATOR_PATTERN =
  /\b(coo|chief operating officer|chief of staff|chief integrator|integrator|head of operations|director of operations|operations director|operations manager|vp of operations|vp operations)\b/;

const VISIONARY_PATTERN =
  /\b(ceo|chief executive officer|chief executive|founder|co-founder|cofounder|owner|president|chairman|chairwoman|chair|principal)\b/;

// "Vice President" / "VP" are not the top of the organization.
const VICE_PRESIDENT_PATTERN = /\b(vice[- ]president|vp|svp|evp|avp)\b/g;

export function inferRoleFromTitle(title: string | null | undefined): InferredRole | null {
  if (!title) return null;
  const t = title.toLowerCase().replace(/[&/,]/g, " ").replace(/\s+/g, " ").trim();
  if (!t) return null;

  if (ASSISTANT_PATTERN.test(t)) return "integrator";

  const integrator = OTHER_INTEGRATOR_PATTERN.test(t);
  const visionary = VISIONARY_PATTERN.test(t.replace(VICE_PRESIDENT_PATTERN, " "));

  // "CEO & COO", "Founder and Head of Operations": genuinely both -- leave it
  // to an admin instead of picking one.
  if (integrator && visionary) return null;
  if (integrator) return "integrator";
  if (visionary) return "visionary";
  return null;
}
