"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminUpdateParticipantIntake } from "@/lib/actions/intake";
import type { CurrentSupportFlags } from "@/lib/currentSupportLabels";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type SupportKey = Exclude<keyof CurrentSupportFlags, "currentSupportOtherText">;

const SUPPORT_OPTIONS: { key: SupportKey; label: string }[] = [
  { key: "currentSupportPersonalAssistant", label: "Personal Assistant" },
  { key: "currentSupportAdminOrVa", label: "Administrative Assistant / Virtual Assistant" },
  { key: "currentSupportExecutiveAssistant", label: "Executive Assistant" },
  { key: "currentSupportSeniorExecutiveAssistant", label: "Senior Executive Assistant" },
  { key: "currentSupportHeadOfOperations", label: "Head of Operations" },
  { key: "currentSupportChiefOfStaff", label: "Chief of Staff" },
  { key: "currentSupportChiefIntegrator", label: "Chief Integrator" },
  { key: "currentSupportCoo", label: "COO" },
  { key: "currentSupportAiAutomation", label: "AI / automation systems that meaningfully absorb recurring work" },
  { key: "currentSupportOther", label: "Other executive support" },
];

export function AdminIntakeForm({
  participantId,
  firstName,
  lastName,
  companyName,
  currentRoleTitle,
  currentSupport,
  adminPath,
  onDone,
}: {
  participantId: string;
  firstName: string;
  lastName: string;
  companyName: string | null;
  currentRoleTitle: string | null;
  currentSupport: CurrentSupportFlags;
  adminPath: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [first, setFirst] = useState(firstName);
  const [last, setLast] = useState(lastName);
  const [company, setCompany] = useState(companyName ?? "");
  const [role, setRole] = useState(currentRoleTitle ?? "");
  const [support, setSupport] = useState<CurrentSupportFlags>({
    ...currentSupport,
    currentSupportOtherText: currentSupport.currentSupportOtherText ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function toggleSupport(key: SupportKey) {
    setSupport((prev) => {
      const next = !prev[key];
      if (key === "currentSupportNone") {
        return next
          ? { ...prev, currentSupportNone: true, ...Object.fromEntries(SUPPORT_OPTIONS.map((o) => [o.key, false])) }
          : { ...prev, currentSupportNone: false };
      }
      return { ...prev, [key]: next, currentSupportNone: false };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSubmitting(true);

    const result = await adminUpdateParticipantIntake({
      participantId,
      firstName: first,
      lastName: last,
      companyName: company,
      currentRoleTitle: role,
      ...support,
      currentSupportOtherText: support.currentSupportOtherText ?? "",
      sessionPath: adminPath,
      adminPath,
    });

    setSubmitting(false);
    if (!result.ok) {
      setErrorMessage(result.message);
      return;
    }
    router.refresh();
    onDone();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="admin-first-name" className="block text-xs font-medium text-(--color-ink-muted)">
            First name
          </label>
          <input
            id="admin-first-name"
            required
            value={first}
            onChange={(e) => setFirst(e.target.value)}
            className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
          />
        </div>
        <div>
          <label htmlFor="admin-last-name" className="block text-xs font-medium text-(--color-ink-muted)">
            Last name
          </label>
          <input
            id="admin-last-name"
            required
            value={last}
            onChange={(e) => setLast(e.target.value)}
            className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
          />
        </div>
      </div>
      <div>
        <label htmlFor="admin-company" className="block text-xs font-medium text-(--color-ink-muted)">
          Company
        </label>
        <input
          id="admin-company"
          required
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
        />
      </div>
      <div>
        <label htmlFor="admin-role" className="block text-xs font-medium text-(--color-ink-muted)">
          Role / title
        </label>
        <input
          id="admin-role"
          required
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
        />
      </div>

      <div>
        <p className="text-xs font-medium text-(--color-ink-muted)">Current executive support</p>
        <div className="mt-2 space-y-1.5">
          {SUPPORT_OPTIONS.map((option) => (
            <label
              key={option.key}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors",
                support[option.key]
                  ? "border-(--color-accent) bg-(--color-accent-soft)"
                  : "border-(--color-hairline) hover:border-(--color-accent)",
              )}
            >
              <input
                type="checkbox"
                checked={support[option.key] as boolean}
                onChange={() => toggleSupport(option.key)}
                className="accent-(--color-accent)"
              />
              {option.label}
            </label>
          ))}

          {support.currentSupportOther ? (
            <div className="pl-3">
              <label htmlFor="admin-other-text" className="block text-xs font-medium text-(--color-ink-muted)">
                Other executive support
              </label>
              <input
                id="admin-other-text"
                required
                value={support.currentSupportOtherText ?? ""}
                onChange={(e) => setSupport((prev) => ({ ...prev, currentSupportOtherText: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
              />
            </div>
          ) : null}

          <label
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors",
              support.currentSupportNone
                ? "border-(--color-accent) bg-(--color-accent-soft)"
                : "border-(--color-hairline) hover:border-(--color-accent)",
            )}
          >
            <input
              type="checkbox"
              checked={support.currentSupportNone}
              onChange={() => toggleSupport("currentSupportNone")}
              className="accent-(--color-accent)"
            />
            None of the above
          </label>
        </div>
      </div>

      {errorMessage ? <p className="text-sm text-[#8a3324]">{errorMessage}</p> : null}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Save"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
