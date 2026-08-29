import Link from "next/link";
import { Card } from "@/components/ui/Card";

/** The exact copy the client's progression spec requires whenever a
 * participant has finished everything currently available to them and is
 * waiting on the facilitator to unlock what's next -- shared by the
 * dashboard's own CONTINUE card and any activity with its own facilitator
 * unlock gate (White Whale, Leadership Wiring, the Zone of Investment
 * reveal), so the wording can't drift between call sites.
 *
 * Always includes an explicit way back to the dashboard, even though the
 * persistent session header (src/app/dashboard/[sessionId]/layout.tsx)
 * already provides one -- a holding screen is exactly the kind of place a
 * participant could otherwise feel stuck, so the escape hatch is repeated
 * here rather than relied on being noticed elsewhere. */
export function HoldingState({ className, sessionPath }: { className?: string; sessionPath?: string }) {
  return (
    <Card className={className}>
      <p className="font-serif text-lg text-(--color-ink)">
        You&apos;re all set for now. We&apos;ll continue together shortly.
      </p>
      {sessionPath ? (
        <Link
          href={sessionPath}
          className="mt-3 inline-block text-sm text-(--color-accent) underline underline-offset-4"
        >
          ← Back to dashboard
        </Link>
      ) : null}
    </Card>
  );
}
