"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/** A labeled expand/collapse section -- used anywhere a block of content
 * (config links, an archived-items list) shouldn't take up space by
 * default but should be one click away. */
export function Disclosure({
  label,
  defaultOpen = false,
  children,
}: {
  label: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-xs font-medium tracking-wide text-(--color-ink-muted) uppercase transition-colors hover:text-(--color-ink)"
      >
        {label}
        <svg
          width="10"
          height="10"
          viewBox="0 0 12 12"
          fill="none"
          className={cn("transition-transform", open && "rotate-180")}
        >
          <path d="M2.5 4.5L6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}
