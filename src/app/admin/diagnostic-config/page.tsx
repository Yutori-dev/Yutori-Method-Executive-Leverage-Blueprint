import Link from "next/link";
import { getExecutiveLeverageDiagnosticConfig } from "@/lib/data/diagnosticConfig";
import { Container } from "@/components/ui/Container";
import { DiagnosticConfigForm } from "@/components/admin/DiagnosticConfigForm";

/** Admin configuration for the Executive Leverage Diagnostic (Developer
 * Implementation Specification V1, section 7) -- scoped to this one
 * assessment rather than a generic content editor, since nothing else in
 * the app needs one yet. Session-independent: this content isn't scoped
 * to any one session. */
export default async function DiagnosticConfigPage() {
  const config = await getExecutiveLeverageDiagnosticConfig();

  return (
    <main className="py-16">
      <Container>
        <Link
          href="/admin"
          className="text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
        >
          ← Back to sessions
        </Link>

        <h1 className="mt-4 font-serif text-3xl">Executive Leverage Diagnostic™ — configuration</h1>
        <p className="mt-1 text-sm text-(--color-ink-muted)">
          {config.version ? `Editing version ${config.version}. ` : ""}
          Saving creates a new version — participants already scored under the current version keep
          their result exactly as calculated; only new calculations use the edited content.
        </p>

        <div className="mt-8">
          <DiagnosticConfigForm initialConfig={config} />
        </div>
      </Container>
    </main>
  );
}
