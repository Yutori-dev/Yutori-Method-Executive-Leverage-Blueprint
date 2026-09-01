import { cn } from "@/lib/cn";
import { DOMAIN_LABEL, type DelegationDomain } from "@/lib/delegationBeliefsConstants";
import { DOMAIN_CAPTION, type DelegationStatusLabel } from "@/lib/blueprintCopy";

const SCALE_MAX = 5;
const DOMAIN_ORDER: DelegationDomain[] = ["trust_control", "team_outcomes", "workload_resources"];

/**
 * Relative bar/indicator treatment for Delegation Beliefs (client spec
 * section 9): bars show the participant's relative pattern across the 3
 * dimensions, status labels show the relative ranking -- never the
 * underlying numeric average as text (that requirement is enforced by this
 * component simply never rendering `avg` as a string, only as a bar width).
 */
export function DelegationBeliefBars({
  dimensions,
}: {
  dimensions: { domain: DelegationDomain; avg: number; statusLabel: DelegationStatusLabel | null }[];
}) {
  const byDomain = new Map(dimensions.map((d) => [d.domain, d]));

  return (
    <div className="space-y-3">
      {DOMAIN_ORDER.map((domain) => {
        const entry = byDomain.get(domain);
        if (!entry) return null;
        const pct = Math.max(0, Math.min(100, (entry.avg / SCALE_MAX) * 100));
        return (
          <div key={domain}>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xs font-medium tracking-wide text-(--color-ink) uppercase">{DOMAIN_LABEL[domain]}</p>
              {entry.statusLabel && (
                <p className={cn("text-xs font-medium tracking-wide uppercase", "text-(--color-ink-muted)")}>{entry.statusLabel}</p>
              )}
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-(--color-accent-soft)">
              <div className="h-full rounded-full bg-(--color-accent) transition-[width]" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1 text-xs text-(--color-ink-muted)">{DOMAIN_CAPTION[domain]}</p>
          </div>
        );
      })}
    </div>
  );
}
