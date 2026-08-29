"use client";

import { useState, useTransition } from "react";
import { saveZoneOfInvestmentVersion } from "@/lib/actions/zoneOfInvestmentConfig";
import type { ZoneOfInvestmentConfigData } from "@/lib/data/zoneOfInvestmentConfig";
import type { RatingLevel, MacroZone } from "@/types/database";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const inputClass =
  "w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)";

const MACRO_ZONES: MacroZone[] = ["investment", "ambiguity", "vulnerability"];

export function ZoneOfInvestmentConfigForm({ initialConfig }: { initialConfig: ZoneOfInvestmentConfigData }) {
  const [responsibilities, setResponsibilities] = useState(initialConfig.responsibilities);
  const [zoneCells, setZoneCells] = useState(initialConfig.zoneCells);
  const [competencyDefinitions, setCompetencyDefinitions] = useState(initialConfig.competencyDefinitions);
  const [passionDefinitions, setPassionDefinitions] = useState(initialConfig.passionDefinitions);
  const [reflectionPrompts, setReflectionPrompts] = useState(initialConfig.reflectionPrompts);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function updateResponsibility(index: number, patch: Partial<{ label: string; sortOrder: number }>) {
    setResponsibilities((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...(patch.label !== undefined ? { label: patch.label } : {}), ...(patch.sortOrder !== undefined ? { sortOrder: patch.sortOrder } : {}) } : r)),
    );
  }

  function updateZoneCell(index: number, patch: Partial<{ cellName: string; macroZone: MacroZone }>) {
    setZoneCells((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function handleSave() {
    setMessage(null);
    startTransition(async () => {
      const result = await saveZoneOfInvestmentVersion({
        responsibilities: responsibilities.map((r) => ({ key: r.key, label: r.label, sortOrder: r.sortOrder })),
        zoneCells: zoneCells.map((c) => ({
          competencyLevel: c.competencyLevel,
          passionLevel: c.passionLevel,
          cellName: c.cellName,
          macroZone: c.macroZone,
        })),
        competencyDefinitions,
        passionDefinitions,
        reflectionPrompts,
      });
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setMessage(`Saved as version ${result.version}.`);
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="font-serif text-lg">Responsibility Library</h2>
        <div className="mt-4 space-y-2">
          {responsibilities.map((r, index) => (
            <div key={r.key} className="flex items-center gap-3">
              <input
                type="number"
                value={r.sortOrder}
                onChange={(e) => updateResponsibility(index, { sortOrder: Number(e.target.value) })}
                className="w-16 shrink-0 rounded-lg border border-(--color-hairline) bg-transparent px-2 py-2 text-sm outline-none focus:border-(--color-accent)"
              />
              <input
                value={r.label}
                onChange={(e) => updateResponsibility(index, { label: e.target.value })}
                className={inputClass}
              />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-serif text-lg">Nine-Cell Zone Matrix</h2>
        <div className="mt-4 space-y-2">
          {zoneCells.map((c, index) => (
            <div key={`${c.competencyLevel}_${c.passionLevel}`} className="flex items-center gap-3">
              <span className="w-40 shrink-0 text-xs text-(--color-ink-muted) capitalize">
                {c.competencyLevel} competency / {c.passionLevel} passion
              </span>
              <input
                value={c.cellName}
                onChange={(e) => updateZoneCell(index, { cellName: e.target.value })}
                className={inputClass}
              />
              <select
                value={c.macroZone}
                onChange={(e) => updateZoneCell(index, { macroZone: e.target.value as MacroZone })}
                className="w-40 shrink-0 rounded-lg border border-(--color-hairline) bg-transparent px-2 py-2 text-sm capitalize outline-none focus:border-(--color-accent)"
              >
                {MACRO_ZONES.map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-serif text-lg">Competency &amp; Passion Definitions</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {(["low", "medium", "high"] as RatingLevel[]).map((level) => (
            <div key={`competency-${level}`}>
              <label className="block text-xs font-medium text-(--color-ink-muted) capitalize">
                Competency — {level}
              </label>
              <textarea
                rows={2}
                value={competencyDefinitions[level]}
                onChange={(e) => setCompetencyDefinitions((prev) => ({ ...prev, [level]: e.target.value }))}
                className={`mt-1 ${inputClass}`}
              />
            </div>
          ))}
          {(["low", "medium", "high"] as RatingLevel[]).map((level) => (
            <div key={`passion-${level}`}>
              <label className="block text-xs font-medium text-(--color-ink-muted) capitalize">
                Passion — {level}
              </label>
              <textarea
                rows={2}
                value={passionDefinitions[level]}
                onChange={(e) => setPassionDefinitions((prev) => ({ ...prev, [level]: e.target.value }))}
                className={`mt-1 ${inputClass}`}
              />
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="font-serif text-lg">Participant Reflection Prompts</h2>
        <div className="mt-4 space-y-3">
          {reflectionPrompts.map((prompt, index) => (
            <input
              key={index}
              value={prompt}
              onChange={(e) =>
                setReflectionPrompts((prev) => prev.map((p, i) => (i === index ? e.target.value : p)))
              }
              className={inputClass}
            />
          ))}
        </div>
      </Card>

      <div className="flex items-center gap-4">
        <Button onClick={handleSave} disabled={isPending}>
          {isPending ? "Saving..." : "Save as new version"}
        </Button>
        {message ? <p className="text-sm text-(--color-ink-muted)">{message}</p> : null}
      </div>
    </div>
  );
}
