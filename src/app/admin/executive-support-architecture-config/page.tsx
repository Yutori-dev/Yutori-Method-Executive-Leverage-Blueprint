import Link from "next/link";
import { getExecutiveSupportArchitectureConfigForEditing } from "@/lib/data/executiveSupportArchitectureConfig";
import { Container } from "@/components/ui/Container";
import { ExecutiveSupportArchitectureConfigForm } from "@/components/admin/ExecutiveSupportArchitectureConfigForm";

/** Admin configuration for the Executive Support Architecture
 * Recommendation Engine (client V1 spec): result-screen copy, per-layer
 * "What This Means" interpretation, and the per-action Recommended Next
 * Move copy. The branching logic itself (majority rules, absorption table,
 * current-support classification) is hardcoded in
 * calculate_executive_support_architecture, not editable here. */
export default async function ExecutiveSupportArchitectureConfigPage() {
  const config = await getExecutiveSupportArchitectureConfigForEditing();

  return (
    <main className="py-16">
      <Container>
        <Link
          href="/admin"
          className="text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
        >
          ← Back to sessions
        </Link>

        <h1 className="mt-4 font-serif text-3xl">Executive Support Architecture — configuration</h1>
        <p className="mt-1 text-sm text-(--color-ink-muted)">
          Saving creates a new version -- participants who already had their architecture revealed
          keep it exactly as shown; only new calculations use the edited copy.
        </p>

        <div className="mt-8">
          <ExecutiveSupportArchitectureConfigForm initialConfig={config} />
        </div>
      </Container>
    </main>
  );
}
