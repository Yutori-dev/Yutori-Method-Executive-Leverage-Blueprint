"use client";

import { useState, useTransition } from "react";
import { saveWhiteWhaleConfig, saveLeadershipWiringConfig } from "@/lib/actions/operatingAltitudeConfig";
import type { OperatingAltitudeConfigData } from "@/lib/data/operatingAltitudeConfig";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const inputClass =
  "w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)";

export function OperatingAltitudeConfigForm({ initialConfig }: { initialConfig: OperatingAltitudeConfigData }) {
  const [whiteWhale, setWhiteWhale] = useState(initialConfig.whiteWhale);
  const [wiring, setWiring] = useState(initialConfig.leadershipWiring);
  const [whiteWhalePending, startWhiteWhaleTransition] = useTransition();
  const [wiringPending, startWiringTransition] = useTransition();
  const [whiteWhaleMessage, setWhiteWhaleMessage] = useState<string | null>(null);
  const [wiringMessage, setWiringMessage] = useState<string | null>(null);

  function handleSaveWhiteWhale() {
    setWhiteWhaleMessage(null);
    startWhiteWhaleTransition(async () => {
      const result = await saveWhiteWhaleConfig(whiteWhale);
      setWhiteWhaleMessage(result.ok ? "Saved as a new version." : result.message);
    });
  }

  function handleSaveWiring() {
    setWiringMessage(null);
    startWiringTransition(async () => {
      const result = await saveLeadershipWiringConfig(wiring);
      setWiringMessage(result.ok ? "Saved as a new version." : result.message);
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="font-serif text-lg">White Whale</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-(--color-ink-muted)">Header</label>
            <input
              value={whiteWhale.header}
              onChange={(e) => setWhiteWhale((prev) => ({ ...prev, header: e.target.value }))}
              className={`mt-1 ${inputClass}`}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-(--color-ink-muted)">Setup copy</label>
            <textarea
              rows={3}
              value={whiteWhale.setupCopy}
              onChange={(e) => setWhiteWhale((prev) => ({ ...prev, setupCopy: e.target.value }))}
              className={`mt-1 ${inputClass}`}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-(--color-ink-muted)">Prompt</label>
            <input
              value={whiteWhale.prompt}
              onChange={(e) => setWhiteWhale((prev) => ({ ...prev, prompt: e.target.value }))}
              className={`mt-1 ${inputClass}`}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-(--color-ink-muted)">Placeholder text</label>
            <input
              value={whiteWhale.placeholderText}
              onChange={(e) => setWhiteWhale((prev) => ({ ...prev, placeholderText: e.target.value }))}
              className={`mt-1 ${inputClass}`}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-(--color-ink-muted)">Privacy note</label>
            <textarea
              rows={2}
              value={whiteWhale.privacyNote}
              onChange={(e) => setWhiteWhale((prev) => ({ ...prev, privacyNote: e.target.value }))}
              className={`mt-1 ${inputClass}`}
            />
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={handleSaveWhiteWhale} disabled={whiteWhalePending}>
              {whiteWhalePending ? "Saving..." : "Save as new version"}
            </Button>
            {whiteWhaleMessage ? <p className="text-sm text-(--color-ink-muted)">{whiteWhaleMessage}</p> : null}
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="font-serif text-lg">Leadership Wiring</h2>
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-(--color-ink-muted)">Header</label>
            <input
              value={wiring.header}
              onChange={(e) => setWiring((prev) => ({ ...prev, header: e.target.value }))}
              className={`mt-1 ${inputClass}`}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-(--color-ink-muted)">Prompt</label>
            <input
              value={wiring.prompt}
              onChange={(e) => setWiring((prev) => ({ ...prev, prompt: e.target.value }))}
              className={`mt-1 ${inputClass}`}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-(--color-ink-muted)">Visionary description</label>
            <textarea
              rows={2}
              value={wiring.visionaryDescription}
              onChange={(e) => setWiring((prev) => ({ ...prev, visionaryDescription: e.target.value }))}
              className={`mt-1 ${inputClass}`}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-(--color-ink-muted)">Integrator description</label>
            <textarea
              rows={2}
              value={wiring.integratorDescription}
              onChange={(e) => setWiring((prev) => ({ ...prev, integratorDescription: e.target.value }))}
              className={`mt-1 ${inputClass}`}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-(--color-ink-muted)">Hybrid description</label>
            <textarea
              rows={2}
              value={wiring.hybridDescription}
              onChange={(e) => setWiring((prev) => ({ ...prev, hybridDescription: e.target.value }))}
              className={`mt-1 ${inputClass}`}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-(--color-ink-muted)">
              Dashboard interpretation note
            </label>
            <textarea
              rows={2}
              value={wiring.dashboardNote}
              onChange={(e) => setWiring((prev) => ({ ...prev, dashboardNote: e.target.value }))}
              className={`mt-1 ${inputClass}`}
            />
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={handleSaveWiring} disabled={wiringPending}>
              {wiringPending ? "Saving..." : "Save as new version"}
            </Button>
            {wiringMessage ? <p className="text-sm text-(--color-ink-muted)">{wiringMessage}</p> : null}
          </div>
        </div>
      </Card>
    </div>
  );
}
