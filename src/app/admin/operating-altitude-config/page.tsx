import Link from "next/link";
import { getOperatingAltitudeConfigData } from "@/lib/data/operatingAltitudeConfig";
import { Container } from "@/components/ui/Container";
import { OperatingAltitudeConfigForm } from "@/components/admin/OperatingAltitudeConfigForm";

/** Admin configuration for the White Whale and Leadership Wiring
 * activities (client Implementation Specifications) -- scoped to these two
 * activities specifically, same philosophy as /admin/diagnostic-config and
 * /admin/zone-of-investment-config. Session-independent. */
export default async function OperatingAltitudeConfigPage() {
  const config = await getOperatingAltitudeConfigData();

  return (
    <main className="py-16">
      <Container>
        <Link
          href="/admin"
          className="text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
        >
          ← Back to sessions
        </Link>

        <h1 className="mt-4 font-serif text-3xl">White Whale &amp; Leadership Wiring — configuration</h1>
        <p className="mt-1 text-sm text-(--color-ink-muted)">
          Saving creates a new version — participants who already completed either activity keep
          what they saw; only future participants see the edited copy.
        </p>

        <div className="mt-8">
          <OperatingAltitudeConfigForm initialConfig={config} />
        </div>
      </Container>
    </main>
  );
}
