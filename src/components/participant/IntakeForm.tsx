"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveParticipantIntake, type IntakeInput } from "@/lib/actions/intake";
import type { ParticipantIntakeData } from "@/lib/data/participantIntake";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type SupportKey = Exclude<
  keyof ParticipantIntakeData,
  "companyName" | "currentRoleTitle" | "currentSupportOtherText"
>;

const SUPPORT_OPTIONS: { key: SupportKey; label: string }[] = [
  { key: "currentSupportPersonalAssistant", label: "Personal Assistant" },
  { key: "currentSupportAdminOrVa", label: "Administrative Assistant / Virtual Assistant" },
  { key: "currentSupportExecutiveAssistant", label: "Executive Assistant" },
  { key: "currentSupportSeniorExecutiveAssistant", label: "Senior Executive Assistant" },
  { key: "currentSupportHeadOfOperations", label: "Head of Operations" },
  { key: "currentSupportChiefOfStaff", label: "Chief of Staff" },
  { key: "currentSupportChiefIntegrator", label: "Chief Integrator" },
  { key: "currentSupportCoo", label: "COO" },
  { key: "currentSupportOther", label: "Other executive support" },
];

const EMPTY: ParticipantIntakeData = {
  companyName: "",
  currentRoleTitle: "",
  currentSupportPersonalAssistant: false,
  currentSupportAdminOrVa: false,
  currentSupportExecutiveAssistant: false,
  currentSupportSeniorExecutiveAssistant: false,
  currentSupportHeadOfOperations: false,
  currentSupportChiefOfStaff: false,
  currentSupportChiefIntegrator: false,
  currentSupportCoo: false,
  currentSupportOther: false,
  currentSupportOtherText: "",
  currentSupportNone: false,
};

export function IntakeForm({
  initial,
  sessionPath,
}: {
  initial: ParticipantIntakeData | null;
  sessionPath: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<ParticipantIntakeData>(initial ?? EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function toggleSupport(key: SupportKey) {
    setForm((prev) => {
      const next = !prev[key];
      if (key === "currentSupportNone") {
        return next
          ? { ...prev, currentSupportNone: true, ...Object.fromEntries(SUPPORT_OPTIONS.map((o) => [o.key, false])) }
          : { ...prev, currentSupportNone: false };
      }
      return { ...prev, [key]: next, currentSupportNone: false };
    });
  }

  async function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    const input: IntakeInput = { ...form, sessionPath };
    const result = await saveParticipantIntake(input);

    if (!result.ok) {
      setErrorMessage(result.message);
      setSubmitting(false);
      return;
    }

    router.push(sessionPath);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="companyName" className="block text-xs font-medium text-(--color-ink-muted)">
          Company Name
        </label>
        <input
          id="companyName"
          required
          value={form.companyName}
          onChange={(e) => setForm((prev) => ({ ...prev, companyName: e.target.value }))}
          className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
        />
      </div>

      <div>
        <label htmlFor="currentRoleTitle" className="block text-xs font-medium text-(--color-ink-muted)">
          What is your current role or title?
        </label>
        <input
          id="currentRoleTitle"
          required
          value={form.currentRoleTitle}
          onChange={(e) => setForm((prev) => ({ ...prev, currentRoleTitle: e.target.value }))}
          className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
        />
      </div>

      <div>
        <p className="text-xs font-medium text-(--color-ink-muted)">
          What executive support do you currently have in place?
        </p>
        <p className="mt-1 text-xs text-(--color-ink-muted)">Select all that apply.</p>
        <div className="mt-3 space-y-2">
          {SUPPORT_OPTIONS.map((option) => (
            <label
              key={option.key}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                form[option.key]
                  ? "border-(--color-accent) bg-(--color-accent-soft)"
                  : "border-(--color-hairline) hover:border-(--color-accent)",
              )}
            >
              <input
                type="checkbox"
                checked={form[option.key] as boolean}
                onChange={() => toggleSupport(option.key)}
                className="accent-(--color-accent)"
              />
              {option.label}
            </label>
          ))}

          {form.currentSupportOther ? (
            <div className="pl-3">
              <label htmlFor="otherText" className="block text-xs font-medium text-(--color-ink-muted)">
                What other executive support do you currently have in place?
              </label>
              <input
                id="otherText"
                required
                value={form.currentSupportOtherText}
                onChange={(e) => setForm((prev) => ({ ...prev, currentSupportOtherText: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
              />
            </div>
          ) : null}

          <label
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
              form.currentSupportNone
                ? "border-(--color-accent) bg-(--color-accent-soft)"
                : "border-(--color-hairline) hover:border-(--color-accent)",
            )}
          >
            <input
              type="checkbox"
              checked={form.currentSupportNone}
              onChange={() => toggleSupport("currentSupportNone")}
              className="accent-(--color-accent)"
            />
            None of the above
          </label>
        </div>
      </div>

      {errorMessage ? <p className="text-sm text-[#8a3324]">{errorMessage}</p> : null}

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? "Saving..." : "Continue"}
      </Button>
    </form>
  );
}
