import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Container } from "@/components/ui/Container";
import { SignOutButton } from "@/components/SignOutButton";

/**
 * Persistent header for every session-scoped participant page (dashboard,
 * Module 0 context, module pages, Blueprint) -- previously there was no
 * shared layout on the participant side at all, so a participant deep
 * inside a module (or on a holding screen) had no way back except browser
 * back. The wordmark link below is that escape hatch everywhere.
 */
export default async function ParticipantSessionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Same account can hold both roles -- if this participant is also an
  // admin, offer a way to jump to the facilitator side.
  const { data: adminProfile } = user
    ? await supabase.from("admin_users").select("id").eq("id", user.id).maybeSingle()
    : { data: null };

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-(--color-hairline)">
        <Container className="flex items-center justify-between py-3">
          <Link href={`/dashboard/${sessionId}`} className="font-serif text-base italic">
            Yutori Method
          </Link>
          {user ? (
            <div className="flex items-center gap-4 text-xs text-(--color-ink-muted)">
              {adminProfile ? (
                <Link href="/admin" className="underline underline-offset-4 hover:text-(--color-ink)">
                  Switch to admin view
                </Link>
              ) : null}
              <SignOutButton redirectTo="/" />
            </div>
          ) : null}
        </Container>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
