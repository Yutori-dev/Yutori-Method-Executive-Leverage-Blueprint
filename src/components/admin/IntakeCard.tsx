"use client";

import { useState } from "react";
import { AdminIntakeForm } from "./AdminIntakeForm";
import { formatCurrentSupport, type CurrentSupportFlags } from "@/lib/currentSupportLabels";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export function IntakeCard({
  participantId,
  firstName,
  lastName,
  companyName,
  currentRoleTitle,
  currentSupport,
  adminPath,
}: {
  participantId: string;
  firstName: string;
  lastName: string;
  companyName: string | null;
  currentRoleTitle: string | null;
  currentSupport: CurrentSupportFlags;
  adminPath: string;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg">Intake</h2>
        {!editing ? (
          <Button variant="ghost" onClick={() => setEditing(true)}>
            Edit
          </Button>
        ) : null}
      </div>

      {editing ? (
        <div className="mt-3">
          <AdminIntakeForm
            participantId={participantId}
            firstName={firstName}
            lastName={lastName}
            companyName={companyName}
            currentRoleTitle={currentRoleTitle}
            currentSupport={currentSupport}
            adminPath={adminPath}
            onDone={() => setEditing(false)}
          />
        </div>
      ) : (
        <dl className="mt-3 space-y-3 text-sm">
          <div>
            <dt className="text-xs text-(--color-ink-muted)">Company</dt>
            <dd className="mt-0.5">{companyName ?? "Not yet provided"}</dd>
          </div>
          <div>
            <dt className="text-xs text-(--color-ink-muted)">Role / title</dt>
            <dd className="mt-0.5">{currentRoleTitle ?? "Not yet provided"}</dd>
          </div>
          <div>
            <dt className="text-xs text-(--color-ink-muted)">Current executive support</dt>
            <dd className="mt-0.5">{formatCurrentSupport(currentSupport)}</dd>
          </div>
        </dl>
      )}
    </Card>
  );
}
