"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveStructuredAssessmentAnswers, submitStructuredAssessment } from "@/lib/actions/structuredAssessments";
import {
  firstUnansweredHandoffStep,
  isHandoffStepAnswered,
  type HandoffAnswers,
  type HandoffConfig,
  type HandoffContext,
} from "@/lib/handoffSchema";
import type { Json } from "@/types/database";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const areaClass =
  "mt-3 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)";

/**
 * High-Leverage Handoff: Screen 1 intro, Screens 2-11 one question each
 * (Typeform-style, Continue/Back, answers preserved both ways), Screen 12
 * the reference artifact. Completing opens straight to Screen 12 on every
 * later visit, with Edit returning to the flow with answers intact.
 */
export function HandoffFlow({
  assessmentId,
  versionId,
  moduleId,
  moduleKey,
  config,
  context,
  initialAnswers,
  alreadyComplete,
  participantSessionId,
  sessionPath,
}: {
  assessmentId: string;
  versionId: string;
  moduleId: string;
  moduleKey: string;
  config: HandoffConfig;
  context: HandoffContext;
  initialAnswers: HandoffAnswers;
  alreadyComplete: boolean;
  participantSessionId: string;
  sessionPath: string;
}) {
  const router = useRouter();
  const [answers, setAnswers] = useState<HandoffAnswers>(initialAnswers ?? {});
  // -1 = intro, 0..n-1 = questions, n = artifact
  const [index, setIndex] = useState<number>(() => {
    if (alreadyComplete) return config.steps.length;
    const hasAny = Object.keys(initialAnswers ?? {}).length > 0;
    return hasAny ? Math.min(firstUnansweredHandoffStep(config, initialAnswers ?? {}), config.steps.length - 1) : -1;
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback(
    (next: HandoffAnswers) => {
      saveStructuredAssessmentAnswers({
        participantSessionId,
        assessmentId,
        versionId,
        answers: next as unknown as Record<string, Json>,
      });
    },
    [participantSessionId, assessmentId, versionId],
  );

  function update(patch: Partial<HandoffAnswers>) {
    const next = { ...answers, ...patch };
    setAnswers(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist(next), 500);
  }

  function toggle(field: "commitments" | "mechanisms", value: string) {
    const current = answers[field] ?? [];
    update({ [field]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value] });
  }

  const total = config.steps.length;

  function next() {
    setError(null);
    const step = config.steps[index];
    if (!isHandoffStepAnswered(step, answers)) {
      setError("Answer this question to continue.");
      return;
    }
    if (index < total - 1) {
      setIndex(index + 1);
      return;
    }
    startTransition(async () => {
      const result = await submitStructuredAssessment({
        participantSessionId,
        assessmentId,
        versionId,
        moduleId,
        moduleKey,
        sessionPath,
        answers: answers as unknown as Record<string, Json>,
      });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setIndex(total);
      router.refresh();
    });
  }

  if (index === -1) {
    return (
      <Card>
        <h2 className="font-serif text-xl">{config.intro.title}</h2>
        <div className="mt-3 space-y-3 text-sm text-(--color-ink-muted)">
          {config.intro.body.map((p, i) => (
            <p key={i} className={i === 0 ? "text-(--color-ink)" : ""}>
              {p}
            </p>
          ))}
        </div>
        <div className="mt-5">
          <Button onClick={() => setIndex(0)}>{config.intro.cta}</Button>
        </div>
      </Card>
    );
  }

  if (index >= total) {
    const trapDisplay = answers.trap ?? "";
    const mechanisms = [...(answers.mechanisms ?? []), ...(answers.mechanismOther?.trim() ? [`Other: ${answers.mechanismOther.trim()}`] : [])];
    return (
      <div className="space-y-6">
        <Card>
          <h2 className="font-serif text-xl">{config.review.title}</h2>
          <div className="mt-5 space-y-5 text-sm">
            <ArtifactBlock label="The Opportunity">{answers.opportunity}</ArtifactBlock>
            <div>
              <p className="text-xs font-medium tracking-wide text-(--color-ink-muted) uppercase">Today &rarr; 90 Days</p>
              <p className="mt-2 text-xs font-medium text-(--color-ink-muted)">Today</p>
              <p className="text-(--color-ink)">{answers.today}</p>
              <p className="mt-2 text-xs font-medium text-(--color-ink-muted)">90 Days</p>
              <p className="text-(--color-ink)">{answers.shift90}</p>
            </div>
            <ArtifactBlock label="Definition of Success">{answers.success}</ArtifactBlock>
            <div>
              <p className="text-xs font-medium tracking-wide text-(--color-ink-muted) uppercase">Make It Stick</p>
              <p className="mt-2 text-xs font-medium text-(--color-ink-muted)">Thinking Trap to Watch</p>
              <p className="text-(--color-ink)">{trapDisplay}</p>
              <p className="mt-2 text-xs font-medium text-(--color-ink-muted)">My Commitment</p>
              <ul className="space-y-1 text-(--color-ink)">
                {(answers.commitments ?? []).map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs font-medium text-(--color-ink-muted)">Supporting Mechanism</p>
              <ul className="space-y-1 text-(--color-ink)">
                {mechanisms.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-medium tracking-wide text-(--color-ink-muted) uppercase">The Path Forward</p>
              <p className="mt-2 text-xs font-medium text-(--color-ink-muted)">First Conversation</p>
              <p className="text-(--color-ink)">{answers.firstConversation}</p>
              <p className="mt-2 text-xs font-medium text-(--color-ink-muted)">30 Days</p>
              <p className="text-(--color-ink)">{answers.d30}</p>
              <p className="mt-2 text-xs font-medium text-(--color-ink-muted)">90 Days</p>
              <p className="text-(--color-ink)">{answers.d90}</p>
            </div>
          </div>
          <div className="mt-6 space-y-3 border-t border-(--color-hairline) pt-4 text-sm text-(--color-ink-muted)">
            {config.review.closing.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <div className="mt-5 flex gap-3">
            <Button onClick={() => router.push(sessionPath)}>Continue</Button>
            <button
              type="button"
              onClick={() => setIndex(0)}
              className="text-sm text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
            >
              Edit
            </button>
          </div>
        </Card>
      </div>
    );
  }

  const step = config.steps[index];
  return (
    <Card>
      <p className="text-xs text-(--color-ink-muted)">
        {index + 1} of {total}
      </p>
      <h2 className="mt-2 font-serif text-lg">{step.prompt}</h2>
      {step.helper.map((h, i) => (
        <p key={i} className="mt-2 text-sm text-(--color-ink-muted)">
          {h}
        </p>
      ))}

      {step.kind === "text" ? (
        <>
          <textarea
            rows={5}
            value={(answers[step.id as keyof HandoffAnswers] as string) ?? ""}
            onChange={(e) => update({ [step.id]: e.target.value })}
            className={areaClass}
          />
          {step.example ? <p className="mt-2 text-xs text-(--color-ink-muted)">Example: {step.example}</p> : null}
        </>
      ) : null}

      {step.kind === "trap_select" ? (
        <div className="mt-3 space-y-1.5">
          {context.trapOptions.map((t) => (
            <label key={t} className="flex cursor-pointer items-start gap-2 text-sm text-(--color-ink)">
              <input type="radio" name="trap" checked={answers.trap === t} onChange={() => update({ trap: t })} className="mt-1" />
              <span>{t}</span>
            </label>
          ))}
        </div>
      ) : null}

      {step.kind === "commitment_multi" ? (
        <div className="mt-3 space-y-1.5">
          {context.commitmentOptions.length === 0 ? (
            <p className="text-sm text-(--color-ink-muted)">
              Your Start-Stop-Shift commitments will appear here once you have completed that module.
            </p>
          ) : null}
          {context.commitmentOptions.map((c) => (
            <label key={c} className="flex cursor-pointer items-start gap-2 text-sm text-(--color-ink)">
              <input type="checkbox" checked={(answers.commitments ?? []).includes(c)} onChange={() => toggle("commitments", c)} className="mt-1" />
              <span>{c}</span>
            </label>
          ))}
        </div>
      ) : null}

      {step.kind === "mechanism_multi" ? (
        <div className="mt-3 space-y-1.5">
          {(step.options ?? []).map((o) => (
            <label key={o} className="flex cursor-pointer items-start gap-2 text-sm text-(--color-ink)">
              <input type="checkbox" checked={(answers.mechanisms ?? []).includes(o)} onChange={() => toggle("mechanisms", o)} className="mt-1" />
              <span>{o}</span>
            </label>
          ))}
          <div className="pt-1">
            <label className="block text-xs text-(--color-ink-muted)">Other (optional)</label>
            <input
              value={answers.mechanismOther ?? ""}
              onChange={(e) => update({ mechanismOther: e.target.value })}
              className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
            />
          </div>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-[#8a3324]">{error}</p> : null}
      <div className="mt-5 flex items-center gap-3">
        {index > 0 ? (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setIndex(index - 1);
            }}
            className="text-sm text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
          >
            Back
          </button>
        ) : null}
        <Button onClick={next} disabled={isPending}>
          {isPending ? "Saving..." : (step.cta ?? "Continue")}
        </Button>
      </div>
    </Card>
  );
}

function ArtifactBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium tracking-wide text-(--color-ink-muted) uppercase">{label}</p>
      <p className="mt-1 text-(--color-ink)">{children}</p>
    </div>
  );
}
