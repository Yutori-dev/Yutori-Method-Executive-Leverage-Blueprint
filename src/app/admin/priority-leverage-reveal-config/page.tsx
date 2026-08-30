import Link from "next/link";
import { getPriorityLeverageRevealConfigForEditing } from "@/lib/data/priorityLeverageRevealConfig";
import { Container } from "@/components/ui/Container";
import { PriorityLeverageRevealConfigForm } from "@/components/admin/PriorityLeverageRevealConfigForm";

/** Admin configuration for the Priority Leverage Opportunities Reveal
 * (second phase of the "leverage" module, client V1 spec): reveal screen
 * copy, leverage-pattern/audit-context headers, and the interpretation
 * copy block. Session-independent, same versioning philosophy as
 * /admin/executive-support-audit-config. */
export default async function PriorityLeverageRevealConfigPage() {
  const config = await getPriorityLeverageRevealConfigForEditing();

  return (
    <main className="py-16">
      <Container>
        <Link
          href="/admin"
          className="text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
        >
          ← Back to sessions
        </Link>

        <h1 className="mt-4 font-serif text-3xl">Priority Leverage Opportunities Reveal — configuration</h1>
        <p className="mt-1 text-sm text-(--color-ink-muted)">
          Saving creates a new version -- participants who already viewed this reveal keep it exactly
          as shown; only new views use the edited content.
        </p>

        <div className="mt-8">
          <PriorityLeverageRevealConfigForm initialConfig={config} />
        </div>
      </Container>
    </main>
  );
}
