import { Card } from "@/components/ui/Card";

/** The exact copy the client's progression spec requires whenever a
 * participant has finished everything currently available to them and is
 * waiting on the facilitator to unlock what's next -- shared by the
 * dashboard's own CONTINUE card and any activity with its own facilitator
 * unlock gate (White Whale, Leadership Wiring, the Zone of Investment
 * reveal), so the wording can't drift between call sites. */
export function HoldingState({ className }: { className?: string }) {
  return (
    <Card className={className}>
      <p className="font-serif text-lg text-(--color-ink)">
        You&apos;re all set for now. We&apos;ll continue together shortly.
      </p>
    </Card>
  );
}
