import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { JoinForm } from "@/components/participant/JoinForm";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.rpc("get_session_by_join_code", {
    p_join_code: code,
  });

  const session = data?.[0];

  if (error || !session) {
    notFound();
  }

  return (
    <main className="flex flex-1 items-center">
      <Container narrow className="py-20">
        <Card>
          <p className="font-serif text-sm italic text-(--color-ink-muted)">
            Yutori Method™ Executive Leverage Blueprint
          </p>
          <h1 className="mt-2 font-serif text-2xl text-(--color-ink)">{session.name}</h1>
          {session.organization ? (
            <p className="mt-1 text-sm text-(--color-ink-muted)">{session.organization}</p>
          ) : null}

          <div className="mt-8">
            <JoinForm joinCode={code} />
          </div>
        </Card>
      </Container>
    </main>
  );
}
