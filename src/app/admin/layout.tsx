import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Container } from "@/components/ui/Container";
import { SignOutButton } from "@/components/SignOutButton";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Same account can hold both roles (nothing prevents an admin from also
  // registering as a participant, or vice versa) -- if this admin has a
  // participant profile too, offer a way to see the app as they would.
  const { data: participantProfile } = user
    ? await supabase.from("participants").select("id").eq("id", user.id).maybeSingle()
    : { data: null };

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-(--color-hairline)">
        <Container className="flex items-center justify-between py-4">
          <Link href="/admin" className="font-serif text-lg italic">
            Yutori Method — Facilitator
          </Link>
          {user ? (
            <div className="flex items-center gap-4 text-sm text-(--color-ink-muted)">
              {participantProfile ? (
                <Link href="/dashboard" className="underline underline-offset-4 hover:text-(--color-ink)">
                  View as participant
                </Link>
              ) : null}
              <Link href="/admin/admins" className="underline underline-offset-4 hover:text-(--color-ink)">
                Manage admins
              </Link>
              <span>{user.email}</span>
              <SignOutButton redirectTo="/admin/login" />
            </div>
          ) : null}
        </Container>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
