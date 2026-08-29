import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { CompleteProfileForm } from "@/components/participant/CompleteProfileForm";

export default async function CompleteProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ join?: string }>;
}) {
  const { join } = await searchParams;
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: participant } = await supabase
    .from("participants")
    .select("first_name, last_name")
    .eq("id", user.id)
    .maybeSingle();

  if (participant) {
    redirect(join ? `/join/${join}` : "/dashboard");
  }

  return (
    <main className="flex flex-1 items-center">
      <Container narrow className="py-20">
        <Card>
          <h1 className="font-serif text-2xl text-(--color-ink)">A few details first</h1>
          <p className="mt-2 text-sm text-(--color-ink-muted)">
            Signed in as {user.email}.
          </p>
          <div className="mt-8">
            <CompleteProfileForm email={user.email ?? ""} joinCode={join} />
          </div>
        </Card>
      </Container>
    </main>
  );
}
