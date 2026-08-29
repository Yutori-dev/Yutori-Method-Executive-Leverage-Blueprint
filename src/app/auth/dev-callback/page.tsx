"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isProduction } from "@/lib/env";
import { Container } from "@/components/ui/Container";

/**
 * Bridges the implicit-flow tokens `supabase.auth.admin.generateLink()`
 * produces (a URL hash fragment, never sent to the server) into a real
 * session cookie, so scripts/dev-magic-link.ts can be used for manual
 * testing without waiting on Supabase's rate-limited built-in email sender.
 * Real participants never see this -- their browser-initiated
 * `signInWithOtp()` uses PKCE and lands on /auth/callback (a `?code=` param)
 * instead. Hard-guarded out of production regardless.
 */
function DevCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
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

      const join = searchParams.get("join");
      router.replace(join ? `/complete-profile?join=${encodeURIComponent(join)}` : "/complete-profile");
    });
  }, [router, searchParams]);

  if (isProduction) {
    return null;
  }

  return (
    <p className="text-sm text-(--color-ink-muted)">
      {error ? `Error: ${error}` : "Signing you in..."}
    </p>
  );
}

export default function DevCallbackPage() {
  return (
    <main className="flex flex-1 items-center">
      <Container narrow className="py-20 text-center">
        <Suspense fallback={<p className="text-sm text-(--color-ink-muted)">Signing you in...</p>}>
          <DevCallbackInner />
        </Suspense>
      </Container>
    </main>
  );
}
