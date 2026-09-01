import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Container({
  children,
  className,
  narrow = false,
  wide = false,
}: {
  children: ReactNode;
  className?: string;
  narrow?: boolean;
  /** For the one page in the app shaped like a landscape document rather
   * than a reading column -- the Blueprint's numbered-territory layout
   * needs real horizontal room for its label-sidebar + multi-column card
   * grids that the standard max-w-5xl (or max-w-2xl "narrow") pages don't. */
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-6 sm:px-8",
        wide ? "max-w-7xl" : narrow ? "max-w-2xl" : "max-w-5xl",
        className,
      )}
    >
      {children}
    </div>
  );
}
