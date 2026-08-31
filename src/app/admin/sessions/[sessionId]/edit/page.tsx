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

  const { data: session } = await supabase
    .from("sessions")
    .select("name, organization, event_date, format")
    .eq("id", sessionId)
    .maybeSingle();

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
              initial={{
                name: session.name,
                organization: session.organization ?? "",
                eventDate: session.event_date ?? "",
                format: session.format as SessionFormat,
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
