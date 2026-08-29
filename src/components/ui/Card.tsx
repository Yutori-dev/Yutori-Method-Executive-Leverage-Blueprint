import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({
  children,
  className,
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-(--color-hairline) bg-(--color-paper-raised)",
        padded && "p-6 sm:p-8",
        className,
      )}
    >
      {children}
    </div>
  );
}
