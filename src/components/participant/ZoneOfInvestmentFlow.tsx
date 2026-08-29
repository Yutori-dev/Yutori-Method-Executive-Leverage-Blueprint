"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { rateResponsibility } from "@/lib/actions/zone";
import { markModuleComplete } from "@/lib/actions/participant";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { HoldingState } from "./HoldingState";
import { ZoneMatrix } from "./ZoneMatrix";
import { ZoneOfInvestmentViewedTracker } from "./ZoneOfInvestmentViewedTracker";
import type { ZoneOfInvestmentData, ZoneOfInvestmentConfig } from "@/lib/data/zoneOfInvestment";
import { ZONE_OF_INVESTMENT_MIN_MAPPED, ZONE_OF_INVESTMENT_MAX_MAPPED } from "@/lib/zoneOfInvestmentConstants";
import type { RatingLevel } from "@/types/database";
import { cn } from "@/lib/cn";

type Phase = "mapping" | "result";

interface Rating {
  competency: RatingLevel | null;
  passion: RatingLevel | null;
}

export function ZoneOfInvestmentFlow({
  data,
  participantSessionId,
  moduleId,
  sessionPath,
  alreadyComplete,
}: {
  data: ZoneOfInvestmentData;
  participantSessionId: string;
  moduleId: string;
  sessionPath: string;
  alreadyComplete: boolean;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>(() =>
    data.mappedCount >= ZONE_OF_INVESTMENT_MIN_MAPPED ? "result" : "mapping",
  );
  const [ratings, setRatings] = useState<Record<string, Rating>>(() =>
    Object.fromEntries(data.ratings.map((r) => [r.responsibilityId, { competency: r.competency, passion: r.passion }])),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const mappedIds = Object.entries(ratings)
    .filter(([, r]) => r.competency !== null && r.passion !== null)
    .map(([id]) => id);
  const mappedCount = mappedIds.length;
  const canContinue = mappedCount >= ZONE_OF_INVESTMENT_MIN_MAPPED;

  function handleRate(id: string, field: "competency" | "passion", value: RatingLevel) {
    const current = ratings[id] ?? { competency: null, passion: null };
    // Clicking the already-selected level clears that dimension.
    const nextValue = current[field] === value ? null : value;
    const next = { ...current, [field]: nextValue };

    const wasMapped = current.competency !== null && current.passion !== null;
    const willBeMapped = next.competency !== null && next.passion !== null;
    if (willBeMapped && !wasMapped && mappedCount >= ZONE_OF_INVESTMENT_MAX_MAPPED) {
      setErrorMessage(`You can map at most ${ZONE_OF_INVESTMENT_MAX_MAPPED} responsibilities.`);
      return;
    }

    setErrorMessage(null);
    setRatings((prev) => ({ ...prev, [id]: next }));

    startTransition(async () => {
      const result = await rateResponsibility({
        participantSessionId,
        responsibilityId: id,
        competency: next.competency,
        passion: next.passion,
        sessionPath,
      });
      if (!result.ok) {
        setErrorMessage(result.message);
        setRatings((prev) => ({ ...prev, [id]: current }));
      }
    });
  }

  function handleViewResult() {
    setPhase("result");
  }

  function handleMarkComplete() {
    startTransition(async () => {
      await markModuleComplete({
        participantSessionId,
        moduleId,
        moduleKey: "current_structure",
        sessionPath,
      });
      router.push(sessionPath);
    });
  }

  if (phase === "mapping") {
    return (
      <div className="space-y-4">
        <Card>
          <p className="text-sm text-(--color-ink)">
            Identify 10 to 12 responsibilities that represent a significant investment of your
            time and energy in a representative week. For each one, rate your Competency and
            Passion as Low, Medium or High. Leave the remaining responsibilities blank.
          </p>
          <RatingReference config={data.config} />
        </Card>

        {data.library.map((r) => {
          const rating = ratings[r.id] ?? { competency: null, passion: null };
          return (
            <Card key={r.id}>
              <p className="text-(--color-ink)">{r.label}</p>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <RatingPicker
                  label="Competency"
                  value={rating.competency}
                  onChange={(v) => handleRate(r.id, "competency", v)}
                />
                <RatingPicker
                  label="Passion"
                  value={rating.passion}
                  onChange={(v) => handleRate(r.id, "passion", v)}
                />
              </div>
            </Card>
          );
        })}

        {errorMessage ? <p className="text-sm text-[#8a3324]">{errorMessage}</p> : null}

        <div className="sticky bottom-4 flex items-center gap-4 rounded-xl border border-(--color-hairline) bg-(--color-paper) px-4 py-3 shadow-sm">
          <Button onClick={handleViewResult} disabled={!canContinue || isPending}>
            CONTINUE
          </Button>
          <p className={cn("text-sm", canContinue ? "text-(--color-ink-muted)" : "text-(--color-accent)")}>
            {mappedCount} of 10–12 mapped
          </p>
        </div>
      </div>
    );
  }

  if (!data.revealed) {
    return (
      <div className="space-y-4">
        <HoldingState />
        <button
          onClick={() => setPhase("mapping")}
          className="text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
        >
          Revise ratings
        </button>
      </div>
    );
  }

  const total = data.personalizedPlacements.length;
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return (
    <div className="space-y-6">
      <ZoneOfInvestmentViewedTracker shouldTrack={!data.alreadyViewed} participantSessionId={participantSessionId} />
      <Card>
        <p className="text-sm text-(--color-ink)">
          Here is where your current responsibilities fall based on your Competency and Passion
          ratings.
        </p>
        <div className="mt-6">
          <ZoneMatrix cells={data.zoneCells} placements={data.personalizedPlacements} />
        </div>
      </Card>

      <Card>
        <p className="text-xs tracking-wide text-(--color-ink-muted) uppercase">Your current distribution</p>
        <div className="mt-3 space-y-1 text-sm text-(--color-ink)">
          <p>
            Zone of Investment — {data.macroZoneDistribution.investment} of {total} /{" "}
            {pct(data.macroZoneDistribution.investment)}%
          </p>
          <p>
            Zone of Ambiguity — {data.macroZoneDistribution.ambiguity} of {total} /{" "}
            {pct(data.macroZoneDistribution.ambiguity)}%
          </p>
          <p>
            Zone of Vulnerability — {data.macroZoneDistribution.vulnerability} of {total} /{" "}
            {pct(data.macroZoneDistribution.vulnerability)}%
          </p>
        </div>
      </Card>

      <Card>
        <p className="text-sm text-(--color-ink)">Take a look at the pattern.</p>
        <ul className="mt-2 space-y-1 text-sm text-(--color-ink-muted)">
          {data.config.reflectionPrompts.map((prompt) => (
            <li key={prompt}>{prompt}</li>
          ))}
        </ul>
      </Card>

      <div className="flex items-center gap-4">
        <Button onClick={handleMarkComplete} disabled={isPending || alreadyComplete}>
          {alreadyComplete ? "Module complete" : isPending ? "Saving..." : "CONTINUE"}
        </Button>
        <button
          onClick={() => setPhase("mapping")}
          className="text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
        >
          Revise ratings
        </button>
      </div>
    </div>
  );
}

function RatingReference({ config }: { config: ZoneOfInvestmentConfig }) {
  return (
    <div className="mt-4 grid grid-cols-1 gap-4 border-t border-(--color-hairline) pt-4 sm:grid-cols-2">
      <div>
        <p className="text-xs font-medium tracking-wide text-(--color-ink-muted) uppercase">
          Competency — how capable and skilled are you at this activity?
        </p>
        <dl className="mt-2 space-y-1.5 text-xs text-(--color-ink-muted)">
          <div>
            <dt className="inline font-medium text-(--color-ink)">Low: </dt>
            <dd className="inline">{config.competencyDefinitions.low}</dd>
          </div>
          <div>
            <dt className="inline font-medium text-(--color-ink)">Medium: </dt>
            <dd className="inline">{config.competencyDefinitions.medium}</dd>
          </div>
          <div>
            <dt className="inline font-medium text-(--color-ink)">High: </dt>
            <dd className="inline">{config.competencyDefinitions.high}</dd>
          </div>
        </dl>
      </div>
      <div>
        <p className="text-xs font-medium tracking-wide text-(--color-ink-muted) uppercase">
          Passion — how much energy, interest or enjoyment do you feel when doing it?
        </p>
        <dl className="mt-2 space-y-1.5 text-xs text-(--color-ink-muted)">
          <div>
            <dt className="inline font-medium text-(--color-ink)">Low: </dt>
            <dd className="inline">{config.passionDefinitions.low}</dd>
          </div>
          <div>
            <dt className="inline font-medium text-(--color-ink)">Medium: </dt>
            <dd className="inline">{config.passionDefinitions.medium}</dd>
          </div>
          <div>
            <dt className="inline font-medium text-(--color-ink)">High: </dt>
            <dd className="inline">{config.passionDefinitions.high}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

function RatingPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: RatingLevel | null;
  onChange: (value: RatingLevel) => void;
}) {
  const levels: RatingLevel[] = ["low", "medium", "high"];
  return (
    <div>
      <p className="text-xs font-medium text-(--color-ink-muted)">{label}</p>
      <div className="mt-1.5 flex gap-2">
        {levels.map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => onChange(level)}
            className={cn(
              "flex-1 rounded-lg border px-3 py-1.5 text-sm capitalize transition-colors",
              value === level
                ? "border-(--color-accent) bg-(--color-accent) text-(--color-paper)"
                : "border-(--color-hairline) hover:border-(--color-accent)",
            )}
          >
            {level}
          </button>
        ))}
      </div>
    </div>
  );
}
