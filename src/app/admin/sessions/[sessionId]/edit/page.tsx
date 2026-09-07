import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { SessionForm } from "@/components/admin/SessionForm";
import { DeleteSessionControl } from "@/components/admin/DeleteSessionControl";
import type { SessionFormat } from "@/types/database";

export default async function EditSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const supabase = await createServerSupabaseClient();

  const [{ data: session }, { data: modules }] = await Promise.all([
    supabase
      .from("sessions")
      .select("name, organization, event_date, format, disabled_module_keys")
      .eq("id", sessionId)
      .maybeSingle(),
    supabase
      .from("modules")
      .select("key, name")
      .eq("active", true)
      .eq("requires_live_workshop", false)
      .order("sort_order", { ascending: true }),
  ]);

  if (!session) notFound();

  return (
    <main className="py-16">
      <Container narrow>
        <h1 className="font-serif text-3xl">Edit session</h1>
        <div className="mt-8">
          <Card>
            <SessionForm
              mode="edit"
              sessionId={sessionId}
              availableModules={modules ?? []}
              initial={{
                name: session.name,
                organization: session.organization ?? "",
                eventDate: session.event_date ?? "",
                format: session.format as SessionFormat,
                disabledModuleKeys: session.disabled_module_keys ?? [],
              }}
            />
          </Card>
        </div>

        <div className="mt-8">
          <p className="text-xs font-medium tracking-wide text-(--color-ink-muted) uppercase">Danger zone</p>
          <div className="mt-3">
            <DeleteSessionControl sessionId={sessionId} sessionName={session.name} />
          </div>
        </div>
      </Container>
    </main>
  );
}
