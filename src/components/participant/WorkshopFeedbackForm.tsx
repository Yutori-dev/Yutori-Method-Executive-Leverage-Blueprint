"use client";

import { useState } from "react";
import { submitWorkshopFeedback } from "@/lib/actions/workshopFeedback";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type Permission = "named" | "anonymous";

export function WorkshopFeedbackForm({
  participantSessionId,
  alreadySubmitted,
  diagnosticFollowUpUrl,
}: {
  participantSessionId: string;
  alreadySubmitted: boolean;
  diagnosticFollowUpUrl: string | null;
}) {
  const [submitted, setSubmitted] = useState(alreadySubmitted);
  const [rating, setRating] = useState<number | null>(null);
  const [writtenFeedback, setWrittenFeedback] = useState("");
  const [permission, setPermission] = useState<Permission | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    if (!rating || !permission) return;

    setErrorMessage(null);
    setSubmitting(true);

    const result = await submitWorkshopFeedback({
      participantSessionId,
      rating,
      writtenFeedback,
      permission,
    });

    if (!result.ok) {
      setErrorMessage(result.message);
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <Card>
        <p className="font-serif text-lg text-(--color-ink)">Thank you for being part of the experience.</p>
        <p className="mt-2 text-sm text-(--color-ink-muted)">
          Your feedback means a lot to us, and we appreciate you taking the time to share it.
        </p>
        <p className="mt-2 text-sm text-(--color-ink-muted)">You&apos;ve now completed the workshop.</p>
        {diagnosticFollowUpUrl ? (
          <p className="mt-4 text-sm text-(--color-ink)">
            If it would be helpful to talk through your blueprint, ask questions, or get additional
            perspective on what surfaced during the workshop, you&apos;re welcome to{" "}
            <a
              href={diagnosticFollowUpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-(--color-accent) underline underline-offset-4"
            >
              submit your diagnostic
            </a>{" "}
            and we will follow up with you.
          </p>
        ) : null}
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <p className="text-sm text-(--color-ink)">How would you rate your experience today?</p>
        <div className="mt-3 flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full border text-lg transition-colors",
                rating !== null && n <= rating
                  ? "border-(--color-accent) bg-(--color-accent) text-(--color-paper)"
                  : "border-(--color-hairline) text-(--color-ink-muted) hover:border-(--color-accent)",
              )}
            >
              ★
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <p className="text-sm text-(--color-ink)">
          Feedback is gold, and we always appreciate the opportunity to learn how we can make this
          experience even better. If there&apos;s anything you think we could improve, we&apos;d
          love to hear it. And if you enjoyed the workshop, we&apos;d be grateful for a short review
          or testimonial about your experience.
        </p>
        <label htmlFor="writtenFeedback" className="mt-4 block text-xs font-medium text-(--color-ink-muted)">
          What would you like us to know about your experience?
        </label>
        <textarea
          id="writtenFeedback"
          rows={4}
          value={writtenFeedback}
          onChange={(e) => setWrittenFeedback(e.target.value)}
          className="mt-1 w-full rounded-lg border border-(--color-hairline) bg-transparent px-3 py-2 text-sm outline-none focus:border-(--color-accent)"
        />
      </Card>

      <Card>
        <p className="text-sm text-(--color-ink)">How may we use your feedback?</p>
        <div className="mt-3 space-y-2">
          {(
            [
              { value: "named" as const, label: "You may use my feedback publicly with my name" },
              { value: "anonymous" as const, label: "You may use my feedback publicly, but anonymously" },
            ]
          ).map((option) => (
            <label
              key={option.value}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                permission === option.value
                  ? "border-(--color-accent) bg-(--color-accent-soft)"
                  : "border-(--color-hairline) hover:border-(--color-accent)",
              )}
            >
              <input
                type="radio"
                name="permission"
                checked={permission === option.value}
                onChange={() => setPermission(option.value)}
                className="accent-(--color-accent)"
              />
              {option.label}
            </label>
          ))}
        </div>
      </Card>

      {errorMessage ? <p className="text-sm text-[#8a3324]">{errorMessage}</p> : null}

      <Button type="submit" disabled={!rating || !permission || submitting} className="w-full">
        {submitting ? "Submitting..." : "Submit"}
      </Button>
    </form>
  );
}
