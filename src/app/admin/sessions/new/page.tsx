import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { SessionForm } from "@/components/admin/SessionForm";

export default async function NewSessionPage() {
  const supabase = await createServerSupabaseClient();
  const { data: modules } = await supabase
    .from("modules")
    .select("key, name")
    .eq("active", true)
    .eq("requires_live_workshop", false)
    .order("sort_order", { ascending: true });

  return (
    <main className="py-16">
      <Container narrow>
        <h1 className="font-serif text-3xl">New session</h1>
        <div className="mt-8">
          <Card>
            <SessionForm mode="create" availableModules={modules ?? []} />
          </Card>
        </div>
      </Container>
    </main>
  );
}
