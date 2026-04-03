import type { ReactNode } from "react";

type Variant = "default" | "outline" | "signal";

export type BadgeProps = {
  variant?: Variant;
  children: ReactNode;
  className?: string;
};

const variantStyles: Record<Variant, string> = {
  default:
    "bg-surface-card text-text-secondary border border-surface-border",
  outline:
    "bg-transparent text-text-secondary border border-surface-border",
  signal:
    "bg-brand-accent/10 text-brand-accent border border-brand-accent/20",
};

export function Badge({
  variant = "default",
  className = "",
  children,
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
