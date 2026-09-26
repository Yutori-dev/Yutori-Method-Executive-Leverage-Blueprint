import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { ResetPasswordForm } from "@/components/participant/ResetPasswordForm";

export default async function ResetPasswordPage() {
  // Only meaningful with the recovery session the emailed link creates.
  // Arriving without one (typed the URL, link already used, session gone)
  // sends them to request a fresh link rather than show a form that can't work.
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/forgot-password?error=expired");

  return (
    <main className="flex flex-1 items-center">
      <Container narrow className="py-20">
        <Card>
          <p className="font-serif text-sm italic text-(--color-ink-muted)">
            Yutori Method™ Executive Leverage Blueprint
          </p>
          <h1 className="mt-2 font-serif text-2xl text-(--color-ink)">Choose a new password</h1>
          <div className="mt-6">
            <ResetPasswordForm />
          </div>
        </Card>
      </Container>
    </main>
  );
}
