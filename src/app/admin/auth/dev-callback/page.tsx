"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isProduction } from "@/lib/env";
import { Container } from "@/components/ui/Container";

/**
 * Admin equivalent of /auth/dev-callback -- see that file for why this
 * exists. Hard-guarded out of production regardless.
 */
export default function AdminDevCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isProduction) return;

    // Deferred to a microtask so no branch below calls setState
    // synchronously during the effect's own execution.
    queueMicrotask(async () => {
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (!accessToken || !refreshToken) {
        setError("No tokens found in the link.");
        return;
      }

      const supabase = createClient();
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (sessionError) {
        setError(sessionError.message);
        return;
      }

      const { data: isAdmin } = await supabase.rpc("is_admin");
      if (!isAdmin) {
        await supabase.auth.signOut();
        router.replace("/admin/login?error=not_authorized");
        return;
      }

      router.replace("/admin");
    });
  }, [router]);

  if (isProduction) {
    return null;
  }

  return (
    <main className="flex flex-1 items-center">
      <Container narrow className="py-20 text-center">
        <p className="text-sm text-(--color-ink-muted)">
          {error ? `Error: ${error}` : "Signing you in..."}
        </p>
      </Container>
    </main>
  );
}
