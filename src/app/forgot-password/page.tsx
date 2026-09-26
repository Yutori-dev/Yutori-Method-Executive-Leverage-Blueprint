import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { ForgotPasswordForm } from "@/components/participant/ForgotPasswordForm";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex flex-1 items-center">
      <Container narrow className="py-20">
        <Card>
          <p className="font-serif text-sm italic text-(--color-ink-muted)">
            Yutori Method™ Executive Leverage Blueprint
          </p>
          <h1 className="mt-2 font-serif text-2xl text-(--color-ink)">Reset your password</h1>
          <div className="mt-6">
            <ForgotPasswordForm expiredLink={error === "expired"} />
          </div>
        </Card>
      </Container>
    </main>
  );
}
