import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

export default function HomePage() {
  return (
    <main className="flex flex-1 items-center">
      <Container narrow className="py-24 text-center">
        <p className="font-serif text-sm italic text-(--color-ink-muted)">Yutori Method™</p>
        <h1 className="mt-3 font-serif text-4xl text-(--color-ink) sm:text-5xl">
          Executive Leverage Blueprint
        </h1>
        <p className="mx-auto mt-6 max-w-md text-(--color-ink-muted)">
          A persistent companion to your Yutori Method workshop.
        </p>
        <div className="mt-10">
          <Link href="/login">
            <Button>Sign in / Sign up</Button>
          </Link>
        </div>
      </Container>
    </main>
  );
}
