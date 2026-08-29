"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { selectResponsibilities, rateResponsibility } from "@/lib/actions/zone";
import { markModuleComplete } from "@/lib/actions/participant";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ZoneMatrix } from "./ZoneMatrix";
import type { ZoneOfInvestmentData } from "@/lib/data/zoneOfInvestment";
import type { RatingLevel } from "@/types/database";
import { cn } from "@/lib/cn";

type Phase = "select" | "rate" | "result";

const MIN_SELECTION = 10;
const MAX_SELECTION = 12;

interface Rating {
  competency: RatingLevel | null;
  passion: RatingLevel | null;
  matrixCell: string | null;
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
    data.selected.length === 0 || alreadyComplete
      ? data.selected.length === 0
        ? "select"
        : "result"
      : "rate",
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(data.selected.map((s) => s.responsibilityId)),
  );
  const [ratings, setRatings] = useState<Record<string, Rating>>(() =>
    Object.fromEntries(
      data.selected.map((s) => [
        s.responsibilityId,
        { competency: s.competency, passion: s.passion, matrixCell: s.matrixCell },
      ]),
    ),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const labelById = useMemo(
    () => new Map(data.availableResponsibilities.map((r) => [r.id, r.label])),
    [data.availableResponsibilities],
  );

  function toggleResponsibility(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= MAX_SELECTION) return prev;
        next.add(id);
      }
      return next;
    });
  }

  function handleConfirmSelection() {
    setErrorMessage(null);
    startTransition(async () => {
      const result = await selectResponsibilities({
        participantSessionId,
        responsibilityIds: [...selectedIds],
        sessionPath,
      });
      if (!result.ok) {
        setErrorMessage(result.message);
        return;
      }
      setRatings((prev) => {
        const next: Record<string, Rating> = {};
        for (const id of selectedIds) {
          next[id] = prev[id] ?? { competency: null, passion: null, matrixCell: null };
        }
        return next;
      });
      setPhase("rate");
    });
  }

  function handleRate(id: string, field: "competency" | "passion", value: RatingLevel) {
    const current = ratings[id] ?? { competency: null, passion: null, matrixCell: null };
    const next = { ...current, [field]: value };
    setRatings((prev) => ({ ...prev, [id]: next }));

    if (next.competency && next.passion) {
      startTransition(async () => {
        const result = await rateResponsibility({
          participantSessionId,
          responsibilityId: id,
          competency: next.competency!,
          passion: next.passion!,
          sessionPath,
        });
        if (!result.ok) {
          setErrorMessage(result.message);
        }
      });
    }
  }

  const allRated = [...selectedIds].every((id) => ratings[id]?.competency && ratings[id]?.passion);

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

  if (phase === "select") {
    const count = selectedIds.size;
    const valid = count >= MIN_SELECTION && count <= MAX_SELECTION;

    return (
      <Card>
        <p className="inline-block rounded-full bg-(--color-accent-soft) px-3 py-1 text-xs font-medium tracking-wide text-(--color-accent) uppercase">
          Development placeholder — Responsibility Library
        </p>
        <p className="mt-4 text-sm text-(--color-ink-muted)">
          Select between 10 and 12 responsibilities that represent your typical week.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {data.availableResponsibilities.map((r) => {
            const checked = selectedIds.has(r.id);
            const disabled = !checked && count >= MAX_SELECTION;
            return (
              <label
                key={r.id}
                className={cn(
                  "flex items-start gap-3 rounded-lg border px-4 py-2.5 text-sm transition-colors",
                  checked
                    ? "border-(--color-accent) bg-(--color-accent-soft)"
                    : disabled
                      ? "border-(--color-hairline) opacity-50"
                      : "cursor-pointer border-(--color-hairline) hover:border-(--color-accent)",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggleResponsibility(r.id)}
                  className="mt-0.5 accent-(--color-accent)"
                />
                <span>{r.label}</span>
              </label>
            );
          })}
        </div>

        <div className="mt-6 flex items-center gap-4">
          <Button onClick={handleConfirmSelection} disabled={!valid || isPending}>
            {isPending ? "Saving..." : "Continue"}
          </Button>
          <p className={cn("text-sm", valid ? "text-(--color-ink-muted)" : "text-(--color-accent)")}>
            {count} of 10–12 selected
          </p>
        </div>
        {errorMessage ? <p className="mt-3 text-sm text-[#8a3324]">{errorMessage}</p> : null}
      </Card>
    );
  }

  if (phase === "rate") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="inline-block rounded-full bg-(--color-accent-soft) px-3 py-1 text-xs font-medium tracking-wide text-(--color-accent) uppercase">
            Competency + Passion
          </p>
          <button
            onClick={() => setPhase("select")}
            className="text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
          >
            Revise selection
          </button>
        </div>

        {[...selectedIds].map((id) => {
          const rating = ratings[id] ?? { competency: null, passion: null, matrixCell: null };
          return (
            <Card key={id}>
              <p className="text-(--color-ink)">{labelById.get(id) ?? "[Removed responsibility]"}</p>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <RatingPicker
                  label="Competency"
                  value={rating.competency}
                  onChange={(v) => handleRate(id, "competency", v)}
                />
                <RatingPicker
                  label="Passion"
                  value={rating.passion}
                  onChange={(v) => handleRate(id, "passion", v)}
                />
              </div>
            </Card>
          );
        })}

        {errorMessage ? <p className="text-sm text-[#8a3324]">{errorMessage}</p> : null}

        <Button onClick={handleViewResult} disabled={!allRated || isPending}>
          View my Zone of Investment
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <p className="inline-block rounded-full bg-(--color-accent-soft) px-3 py-1 text-xs font-medium tracking-wide text-(--color-accent) uppercase">
          Zone of Investment
        </p>
        <p className="mt-4 text-sm text-(--color-ink-muted)">
          Being outside your Zone of Investment does not mean something must be delegated -- it
          identifies a potential candidate worth examining further.
        </p>
        <div className="mt-6">
          <ZoneMatrix cells={data.zoneCells} responsibilities={Object.entries(ratings).map(([id, r]) => ({
            responsibilityId: id,
            label: labelById.get(id) ?? "[Removed responsibility]",
            competency: r.competency,
            passion: r.passion,
            matrixCell: r.matrixCell,
            macroZone: null,
          }))} />
        </div>
      </Card>

      <div className="flex items-center gap-4">
        <Button onClick={handleMarkComplete} disabled={isPending || alreadyComplete}>
          {alreadyComplete ? "Module complete" : isPending ? "Saving..." : "CONTINUE"}
        </Button>
        <button
          onClick={() => setPhase("rate")}
          className="text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
        >
          Revise ratings
        </button>
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
