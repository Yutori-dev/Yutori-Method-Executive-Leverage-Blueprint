import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Container } from "@/components/ui/Container";
import { SignOutButton } from "@/components/admin/SignOutButton";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-(--color-hairline)">
        <Container className="flex items-center justify-between py-4">
          <Link href="/admin" className="font-serif text-lg italic">
            Yutori Method — Facilitator
          </Link>
          {user ? (
            <div className="flex items-center gap-4 text-sm text-(--color-ink-muted)">
              <Link href="/admin/admins" className="underline underline-offset-4 hover:text-(--color-ink)">
                Manage admins
              </Link>
              <span>{user.email}</span>
              <SignOutButton />
            </div>
          ) : null}
        </Container>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
