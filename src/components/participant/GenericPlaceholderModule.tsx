"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { markModuleComplete } from "@/lib/actions/participant";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function GenericPlaceholderModule({
  moduleName,
  participantSessionId,
  moduleId,
  moduleKey,
  sessionPath,
  alreadyComplete,
}: {
  moduleName: string;
  participantSessionId: string;
  moduleId: string;
  moduleKey: string;
  sessionPath: string;
  alreadyComplete: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleComplete() {
    startTransition(async () => {
      await markModuleComplete({ participantSessionId, moduleId, moduleKey, sessionPath });
      router.push(sessionPath);
    });
  }

  return (
    <Card>
      <p className="inline-block rounded-full bg-(--color-accent-soft) px-3 py-1 text-xs font-medium tracking-wide text-(--color-accent) uppercase">
        Development placeholder
      </p>
      <p className="mt-4 text-(--color-ink-muted)">
        [YUTORI CONTENT PENDING — DO NOT USE IN PRODUCTION]
      </p>
      <p className="mt-2 text-sm text-(--color-ink-muted)">
        The {moduleName} module&apos;s real workshop content is a content dependency owned by
        Yutori Method and arrives in a later milestone. This placeholder exists so module
        sequencing, cohort-wide unlocking and progress persistence can be exercised end to end.
      </p>

      <div className="mt-8">
        <Button onClick={handleComplete} disabled={isPending || alreadyComplete}>
          {alreadyComplete ? "Module complete" : isPending ? "Saving..." : "CONTINUE"}
        </Button>
      </div>
    </Card>
  );
}
