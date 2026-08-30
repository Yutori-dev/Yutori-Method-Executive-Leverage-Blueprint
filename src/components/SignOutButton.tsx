"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton({ redirectTo }: { redirectTo: string }) {
  const supabase = createClient();
  const router = useRouter();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push(redirectTo);
  }

  return (
    <button onClick={handleSignOut} className="underline underline-offset-4 hover:text-(--color-ink)">
      Sign out
    </button>
  );
}
