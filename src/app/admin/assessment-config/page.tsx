import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";

const LABELS: Record<string, string> = {
  ea_experience_assessment: "EA Experience Assessment",
  thinking_traps: "Visionary Thinking Traps Diagnostic",
  ea_leverage_audit_visionary: "EA Leverage & Orchestration Audit (Visionary)",
  ea_leverage_audit_ea: "EA Leverage & Orchestration Audit (EA)",
  start_stop_shift: "Start-Stop-Shift",
  high_leverage_handoff: "High-Leverage Handoff",
};

export default async function AssessmentConfigIndex() {
  const supabase = await createServerSupabaseClient();
  const { data: assessments } = await supabase.from("structured_assessments").select("id, assessment_key");
  const { data: versions } = await supabase.from("structured_assessment_versions").select("assessment_id, version_number, config");

  return (
    <main className="py-16">
      <Container>
        <Link href="/admin" className="text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)">← Admin</Link>
        <h1 className="mt-4 font-serif text-3xl">New module assessments</h1>
        <p className="mt-1 text-sm text-(--color-ink-muted)">Edit wording, order, options, scales, labels, result copy and thresholds. Every save creates a new version.</p>
        <div className="mt-6 space-y-2">
          {Object.keys(LABELS).map((key) => {
            const a = (assessments ?? []).find((x) => x.assessment_key === key);
            const vs = (versions ?? []).filter((v) => v.assessment_id === a?.id);
            const cur = vs.find((v) => (v.config as { is_current?: boolean })?.is_current === true);
            return (
              <Card key={key}>
                <Link href={`/admin/assessment-config/${key}`} className="flex items-center justify-between gap-4">
                  <span className="text-sm text-(--color-accent)">{LABELS[key]}</span>
                  <span className="text-xs text-(--color-ink-muted)">{cur ? `Current: v${cur.version_number} · ${vs.length} total` : "Not set up"}</span>
                </Link>
              </Card>
            );
          })}
        </div>
      </Container>
    </main>
  );
}
