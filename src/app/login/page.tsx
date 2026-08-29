import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { JoinForm } from "@/components/participant/JoinForm";

/**
 * General participant sign-in/sign-up, not tied to a specific session's
 * join code -- for a returning participant, or anyone without a
 * `/join/<code>` link in hand. Reuses JoinForm with no joinCode (optional
 * prop), which skips the join_session step and goes straight to the
 * dashboard.
 */
export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center">
      <Container narrow className="py-20">
        <Card>
          <p className="font-serif text-sm italic text-(--color-ink-muted)">Yutori Method™</p>
          <h1 className="mt-2 font-serif text-2xl text-(--color-ink)">Sign in or sign up</h1>
          <div className="mt-8">
            <JoinForm />
          </div>
        </Card>
      </Container>
    </main>
  );
}
