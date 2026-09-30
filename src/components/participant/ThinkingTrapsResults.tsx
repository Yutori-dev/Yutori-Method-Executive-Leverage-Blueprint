import { Card } from "@/components/ui/Card";
import type { ThinkingTrapsConfig } from "@/lib/thinkingTrapsSchema";

/** Participant-facing results (spec section 8/9): ranked qualifying traps
 * with their full copy, or the no-qualifying-traps message. Deliberately
 * no numeric scores anywhere here (spec section 9) -- trap scores exist
 * only in `derived` for the facilitator dashboard, never passed to this
 * component. */
export function ThinkingTrapsResults({
  config,
  qualifyingTraps,
}: {
  config: ThinkingTrapsConfig;
  qualifyingTraps: string[];
}) {
  if (qualifyingTraps.length === 0) {
    return (
      <Card>
        <h2 className="font-serif text-lg">{config.no_qualifying_result.title}</h2>
        <p className="mt-2 text-sm text-(--color-ink-muted)">{config.no_qualifying_result.body}</p>
      </Card>
    );
  }

  const trapById = new Map(config.traps.map((t) => [t.id, t]));

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="font-serif text-lg">{config.result_intro.title}</h2>
        <p className="mt-2 text-sm text-(--color-ink-muted)">{config.result_intro.body}</p>
      </Card>

      {qualifyingTraps.map((trapId) => {
        const trap = trapById.get(trapId);
        if (!trap) return null;
        return (
          <Card key={trap.id}>
            <h3 className="font-serif text-base">{trap.name}</h3>
            <p className="mt-1 text-sm italic text-(--color-ink-muted)">&ldquo;{trap.statement}&rdquo;</p>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="text-xs font-medium text-(--color-ink-muted)">Trigger</dt>
                <dd className="mt-0.5 text-(--color-ink)">{trap.trigger}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-(--color-ink-muted)">How it shows up</dt>
                <dd className="mt-0.5 text-(--color-ink)">{trap.how_it_shows_up}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-(--color-ink-muted)">Friction</dt>
                <dd className="mt-0.5 text-(--color-ink)">{trap.friction}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-(--color-ink-muted)">Shift</dt>
                <dd className="mt-0.5 text-(--color-ink)">{trap.shift}</dd>
              </div>
            </dl>
          </Card>
        );
      })}
    </div>
  );
}
