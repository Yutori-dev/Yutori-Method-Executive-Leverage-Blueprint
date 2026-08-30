import Link from "next/link";
import { getPriorityDelegationConfig } from "@/lib/data/delegation";
import { Container } from "@/components/ui/Container";
import { PriorityDelegationConfigForm } from "@/components/admin/PriorityDelegationConfigForm";

/** Admin configuration for Priority Delegation Opportunities copy (client
 * V1 developer spec, section 12). Session-independent, same versioning
 * philosophy as /admin/operating-altitude-config. */
export default async function PriorityDelegationConfigPage() {
  const config = await getPriorityDelegationConfig();

  return (
    <main className="py-16">
      <Container>
        <Link
          href="/admin"
          className="text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
        >
          ← Back to sessions
        </Link>

        <h1 className="mt-4 font-serif text-3xl">Priority Delegation Opportunities — configuration</h1>
        <p className="mt-1 text-sm text-(--color-ink-muted)">
          Saving creates a new version — participants who already completed this step keep what
          they saw; only future participants see the edited copy.
        </p>

        <div className="mt-8">
          <PriorityDelegationConfigForm initialConfig={config} />
        </div>
      </Container>
    </main>
  );
}
