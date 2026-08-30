import Link from "next/link";
import { getDelegationBeliefsConfigForEditing } from "@/lib/data/delegationBeliefsConfig";
import { Container } from "@/components/ui/Container";
import { DelegationBeliefsConfigForm } from "@/components/admin/DelegationBeliefsConfigForm";

/** Admin configuration for the Delegation Beliefs Assessment (client V1
 * developer spec, section 12) -- intro copy, domain interpretation copy
 * and thresholds, and per-question wording/domain/opportunity labels.
 * Session-independent, same versioning philosophy as /admin/diagnostic-config. */
export default async function DelegationBeliefsConfigPage() {
  const config = await getDelegationBeliefsConfigForEditing();

  return (
    <main className="py-16">
      <Container>
        <Link
          href="/admin"
          className="text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
        >
          ← Back to sessions
        </Link>

        <h1 className="mt-4 font-serif text-3xl">Delegation Beliefs — configuration</h1>
        <p className="mt-1 text-sm text-(--color-ink-muted)">
          Saving creates a new version — participants who already completed this assessment keep
          their results exactly as calculated; only new calculations use the edited content.
        </p>

        <div className="mt-8">
          <DelegationBeliefsConfigForm initialConfig={config} />
        </div>
      </Container>
    </main>
  );
}
