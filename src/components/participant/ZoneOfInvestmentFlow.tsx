"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { rateResponsibility } from "@/lib/actions/zone";
import { markModuleComplete } from "@/lib/actions/participant";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { HoldingState } from "./HoldingState";
import { SessionGateWatcher } from "./SessionGateWatcher";
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
  sessionId,
  sessionPath,
  alreadyComplete,
}: {
  data: ZoneOfInvestmentData;
  participantSessionId: string;
  moduleId: string;
  sessionId: string;
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
  // Which activities currently show a rating card -- a client-only concept,
  // not a separate stored step (rating is still the only server write).
  // Initialized from anything with an existing partial/full rating so a
  // returning participant resumes with their prior selections intact.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    const ids = new Set<string>();
    for (const r of data.ratings) {
      if (r.competency !== null || r.passion !== null) ids.add(r.responsibilityId);
    }
    return ids;
  });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const mappedIds = Object.entries(ratings)
    .filter(([, r]) => r.competency !== null && r.passion !== null)
    .map(([id]) => id);
  const mappedCount = mappedIds.length;
  const canContinue = mappedCount >= ZONE_OF_INVESTMENT_MIN_MAPPED;
  const canSelectMore = selectedIds.size < ZONE_OF_INVESTMENT_MAX_MAPPED;

  function toggleSelected(id: string) {
    setErrorMessage(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        // Deselecting hides the rating card -- clear any stored rating too,
        // rather than leaving it silently counted while out of view.
        const current = ratings[id];
        if (current && (current.competency !== null || current.passion !== null)) {
          startTransition(async () => {
            await rateResponsibility({
              participantSessionId,
              responsibilityId: id,
              competency: null,
              passion: null,
              sessionPath,
            });
          });
          setRatings((prev) => ({ ...prev, [id]: { competency: null, passion: null } }));
        }
      } else {
        if (next.size >= ZONE_OF_INVESTMENT_MAX_MAPPED) return prev;
        next.add(id);
      }
      return next;
    });
  }

  function handleRate(id: string, field: "competency" | "passion", value: RatingLevel) {
    const current = ratings[id] ?? { competency: null, passion: null };
    // Clicking the already-selected level clears that dimension.
    const nextValue = current[field] === value ? null : value;
    const next = { ...current, [field]: nextValue };

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
    const selectedResponsibilities = data.library.filter((r) => selectedIds.has(r.id));

    return (
      <div className="space-y-4">
        <Card>
          <h2 className="font-serif text-xl">Map Your Current Responsibilities</h2>
          <p className="mt-3 text-sm text-(--color-ink)">
            Identify 10 to 12 responsibilities that represent a significant investment of your
            time and energy in a representative week. For each one, rate your Competency and
            Passion as Low, Medium or High. Leave the remaining responsibilities blank.
          </p>
          <RatingReference config={data.config} />
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-(--color-ink)">
              1. Choose the activities you want to grade.
            </p>
            <p
              className={cn(
                "shrink-0 text-xs font-medium tracking-wide uppercase",
                selectedIds.size >= ZONE_OF_INVESTMENT_MIN_MAPPED ? "text-(--color-ink-muted)" : "text-(--color-accent)",
              )}
            >
              {selectedIds.size} of 10–12 selected
            </p>
          </div>
          <p className="mt-1 text-xs text-(--color-ink-muted)">
            Select 10-12 activities. Choosing one adds it to the rating list below.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {data.library.map((r) => {
              const isSelected = selectedIds.has(r.id);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => toggleSelected(r.id)}
                  disabled={!isSelected && !canSelectMore}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                    isSelected
                      ? "border-(--color-accent) bg-(--color-accent-soft) text-(--color-ink)"
                      : "border-(--color-hairline) text-(--color-ink) hover:border-(--color-accent)",
                  )}
                >
                  {r.label}
                  {isSelected ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-(--color-accent)">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  ) : null}
                </button>
              );
            })}
          </div>
        </Card>

        {selectedResponsibilities.length > 0 ? (
          <>
            <p className="pt-2 text-sm font-medium text-(--color-ink)">
              2. Now rate the activities you selected.
            </p>
            {selectedResponsibilities.map((r) => {
              const rating = ratings[r.id] ?? { competency: null, passion: null };
              return (
                <Card key={r.id}>
                  <p className="text-(--color-ink)">{r.label}</p>
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-lg bg-(--color-competency-soft) p-3">
                      <RatingPicker
                        label="Competency"
                        tone="competency"
                        value={rating.competency}
                        onChange={(v) => handleRate(r.id, "competency", v)}
                      />
                    </div>
                    <div className="rounded-lg bg-(--color-passion-soft) p-3">
                      <RatingPicker
                        label="Passion"
                        tone="passion"
                        value={rating.passion}
                        onChange={(v) => handleRate(r.id, "passion", v)}
                      />
                    </div>
                  </div>
                </Card>
              );
            })}
          </>
        ) : null}

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
        <SessionGateWatcher sessionId={sessionId} />
        <HoldingState sessionPath={sessionPath} />
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
        <h2 className="font-serif text-xl">Your Zone of Investment Map</h2>
        <p className="mt-3 text-sm text-(--color-ink)">
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
  tone,
  value,
  onChange,
}: {
  label: string;
  tone: "competency" | "passion";
  value: RatingLevel | null;
  onChange: (value: RatingLevel) => void;
}) {
  const levels: RatingLevel[] = ["low", "medium", "high"];
  const labelClass = tone === "competency" ? "text-(--color-competency)" : "text-(--color-passion)";
  // Selected and unselected states each set their own bg-* utility below --
  // `cn()` is a plain string join (see src/lib/cn.ts), not tailwind-merge,
  // so it never dedupes conflicting utilities. A bg-* in the always-applied
  // base string here previously coexisted with the selected state's own
  // bg-* on the same element; which one painted came down to Tailwind's
  // generated CSS order, not the intended selected color -- on this build
  // the base's bg-(--color-paper-raised) (white) was winning over the
  // selected fill, leaving the near-white selected label text unreadable
  // against a white background (client screenshot, 2026-09). Each branch
  // below is a complete, self-contained class string so only one bg-*
  // utility is ever present on the element at a time.
  const selectedClass =
    tone === "competency"
      ? "border-(--color-competency) bg-(--color-competency) text-(--color-paper)"
      : "border-(--color-passion) bg-(--color-passion) text-(--color-paper)";
  const unselectedClass = "border-(--color-hairline) bg-(--color-paper-raised) hover:border-(--color-accent)";
  return (
    <div>
      <p className={cn("text-xs font-semibold tracking-wide uppercase", labelClass)}>{label}</p>
      <div className="mt-1.5 flex gap-2">
        {levels.map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => onChange(level)}
            className={cn(
              "flex-1 rounded-lg border px-3 py-1.5 text-sm capitalize transition-colors",
              value === level ? selectedClass : unselectedClass,
            )}
          >
            {level}
          </button>
        ))}
      </div>
    </div>
  );
}
