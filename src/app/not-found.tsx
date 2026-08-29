import Link from "next/link";
import { Container } from "@/components/ui/Container";

export default function NotFound() {
  return (
    <main className="flex flex-1 items-center">
      <Container narrow className="py-24 text-center">
        <h1 className="font-serif text-2xl">We couldn&apos;t find that.</h1>
        <p className="mt-3 text-sm text-(--color-ink-muted)">
          Double-check the link your facilitator shared, or{" "}
          <Link href="/" className="underline underline-offset-4">
            return home
          </Link>
          .
        </p>
      </Container>
    </main>
  );
}
