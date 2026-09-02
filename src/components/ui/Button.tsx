import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "info";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-(--color-ink) text-(--color-paper) hover:bg-(--color-ink)/90 disabled:bg-(--color-locked)",
  secondary:
    "bg-(--color-accent-soft) text-(--color-ink) hover:bg-(--color-accent-soft)/70",
  ghost:
    "bg-transparent text-(--color-ink) hover:bg-(--color-accent-soft)/60 border border-(--color-hairline)",
  danger: "bg-[#8a3324] text-white hover:bg-[#8a3324]/90",
  info: "bg-(--color-info) text-(--color-paper) hover:bg-(--color-info)/90",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
