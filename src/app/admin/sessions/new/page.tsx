import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { SessionForm } from "@/components/admin/SessionForm";

export default function NewSessionPage() {
  return (
    <main className="py-16">
      <Container narrow>
        <h1 className="font-serif text-3xl">New session</h1>
        <div className="mt-8">
          <Card>
            <SessionForm mode="create" />
          </Card>
        </div>
      </Container>
    </main>
  );
}
