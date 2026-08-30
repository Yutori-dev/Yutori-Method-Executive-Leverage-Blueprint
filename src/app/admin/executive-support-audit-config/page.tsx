import Link from "next/link";
import { getExecutiveSupportAuditConfigForEditing } from "@/lib/data/executiveSupportAuditConfig";
import { Container } from "@/components/ui/Container";
import { ExecutiveSupportAuditConfigForm } from "@/components/admin/ExecutiveSupportAuditConfigForm";

/** Admin configuration for the Executive Support Audit (Section 4, client
 * V1 developer spec): intro copy, per-layer primary/secondary interpretation
 * copy, secondary threshold, and all 12 questions. Session-independent,
 * same versioning philosophy as /admin/diagnostic-config. */
export default async function ExecutiveSupportAuditConfigPage() {
  const config = await getExecutiveSupportAuditConfigForEditing();

  return (
    <main className="py-16">
      <Container>
        <Link
          href="/admin"
          className="text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
        >
          ← Back to sessions
        </Link>

        <h1 className="mt-4 font-serif text-3xl">Executive Support Audit — configuration</h1>
        <p className="mt-1 text-sm text-(--color-ink-muted)">
          Saving creates a new version — participants who already completed this assessment keep
          their results exactly as calculated; only new calculations use the edited content.
        </p>

        <div className="mt-8">
          <ExecutiveSupportAuditConfigForm initialConfig={config} />
        </div>
      </Container>
    </main>
  );
}
