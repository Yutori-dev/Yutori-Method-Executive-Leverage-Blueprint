import Link from "next/link";
import { Container } from "@/components/ui/Container";

export default function HomePage() {
  return (
    <main className="flex flex-1 items-center">
      <Container narrow className="py-24 text-center">
        <p className="font-serif text-sm italic text-(--color-ink-muted)">Yutori Method™</p>
        <h1 className="mt-3 font-serif text-4xl text-(--color-ink) sm:text-5xl">
          Executive Leverage Blueprint
        </h1>
        <p className="mx-auto mt-6 max-w-md text-(--color-ink-muted)">
          A persistent companion to your Yutori Method workshop. You&apos;ll need the
          session link your facilitator shared to begin.
        </p>
        <div className="mt-10">
          <Link
            href="/admin/login"
            className="text-xs tracking-wide text-(--color-ink-muted) underline underline-offset-4 hover:text-(--color-ink)"
          >
            Facilitator sign in
          </Link>
        </div>
      </Container>
    </main>
  );
}
