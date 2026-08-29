import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex flex-1 items-center">
      <Container narrow className="py-20">
        <Card>
          <p className="font-serif text-sm italic text-(--color-ink-muted)">Yutori Method™</p>
          <h1 className="mt-2 font-serif text-2xl">Facilitator sign in</h1>

          {error === "not_authorized" ? (
            <p className="mt-4 rounded-lg bg-(--color-accent-soft) px-4 py-3 text-sm text-(--color-ink)">
              That email isn&apos;t authorized as a facilitator. Contact your administrator if
              this seems wrong.
            </p>
          ) : null}

          <div className="mt-8">
            <AdminLoginForm />
          </div>
        </Card>
      </Container>
    </main>
  );
}
