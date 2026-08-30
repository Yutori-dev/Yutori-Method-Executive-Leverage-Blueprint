import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { WorkshopFeedbackSettingsForm } from "@/components/admin/WorkshopFeedbackSettingsForm";

export default async function WorkshopFeedbackSettingsPage() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("workshop_feedback_settings")
    .select("diagnostic_follow_up_url")
    .eq("id", true)
    .maybeSingle();

  return (
    <main className="py-16">
      <Container narrow>
        <h1 className="font-serif text-3xl">Workshop feedback settings</h1>
        <Card className="mt-8">
          <WorkshopFeedbackSettingsForm initialUrl={data?.diagnostic_follow_up_url ?? null} />
        </Card>
      </Container>
    </main>
  );
}
