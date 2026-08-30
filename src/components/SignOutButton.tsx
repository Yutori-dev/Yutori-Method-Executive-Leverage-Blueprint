"use client";

import { signOut } from "@/lib/actions/auth";

export function SignOutButton({ redirectTo }: { redirectTo: string }) {
  async function handleSignOut() {
    await signOut(redirectTo);
  }

  return (
    <button onClick={handleSignOut} className="underline underline-offset-4 hover:text-(--color-ink)">
      Sign out
    </button>
  );
}
