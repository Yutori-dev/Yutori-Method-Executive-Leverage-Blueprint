import Link from "next/link";
import { getZoneOfInvestmentConfigData } from "@/lib/data/zoneOfInvestmentConfig";
import { Container } from "@/components/ui/Container";
import { ZoneOfInvestmentConfigForm } from "@/components/admin/ZoneOfInvestmentConfigForm";

/** Admin configuration for Zone of Investment (client Implementation
 * Specification section 15) -- scoped to this feature specifically, same
 * philosophy as /admin/diagnostic-config. Session-independent: this
 * content isn't scoped to any one session. */
export default async function ZoneOfInvestmentConfigPage() {
  const config = await getZoneOfInvestmentConfigData();

  return (
    <main className="py-16">
      <Container>
        <Link
          href="/admin"
          className="text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
        >
          ← Back to sessions
        </Link>

        <h1 className="mt-4 font-serif text-3xl">Zone of Investment — configuration</h1>
        <p className="mt-1 text-sm text-(--color-ink-muted)">
          {config.responsibilitiesVersion ? `Editing responsibility library version ${config.responsibilitiesVersion}. ` : ""}
          Saving creates new versions — participants already mapped under the current version keep
          their result exactly as calculated; only new ratings use the edited content.
        </p>

        <div className="mt-8">
          <ZoneOfInvestmentConfigForm initialConfig={config} />
        </div>
      </Container>
    </main>
  );
}
