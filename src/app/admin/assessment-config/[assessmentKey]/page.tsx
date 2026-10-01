import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Container } from "@/components/ui/Container";
import { AssessmentConfigEditor } from "@/components/admin/AssessmentConfigEditor";

export default async function AssessmentConfigPage({ params }: { params: Promise<{ assessmentKey: string }> }) {
  const { assessmentKey } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: assessment } = await supabase.from("structured_assessments").select("id").eq("assessment_key", assessmentKey).maybeSingle();
  if (!assessment) notFound();
  const { data: versions } = await supabase
    .from("structured_assessment_versions")
    .select("version_number, config, created_at")
    .eq("assessment_id", assessment.id)
    .order("version_number", { ascending: false });
  const current = (versions ?? []).find((v) => (v.config as { is_current?: boolean })?.is_current === true);
  if (!current) notFound();

  return (
    <main className="py-16">
      <Container>
        <Link href="/admin/assessment-config" className="text-xs text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)">← All assessments</Link>
        <h1 className="mt-4 font-serif text-3xl">{assessmentKey.replaceAll("_", " ")}</h1>
        <p className="mt-1 text-xs text-(--color-ink-muted)">
          History: {(versions ?? []).map((v) => `v${v.version_number} (${new Date(v.created_at).toLocaleDateString()})`).join(" · ")}
        </p>
        <div className="mt-6">
          <AssessmentConfigEditor assessmentKey={assessmentKey} initial={JSON.stringify(current.config, null, 2)} version={current.version_number} />
        </div>
      </Container>
    </main>
  );
}
