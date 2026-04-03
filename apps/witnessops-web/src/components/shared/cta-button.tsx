import Link from "next/link";
import type { MouseEventHandler } from "react";

type Variant = "primary" | "secondary" | "ghost";

interface CtaButtonProps {
  label: string;
  href: string;
  variant: Variant;
  className?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-brand-accent text-text-inverse rounded-md font-medium px-6 py-3 hover:brightness-110 hover:shadow-[0_0_24px_rgba(255,107,53,0.3),0_0_0_1px_rgba(255,107,53,0.4)] active:scale-[0.97] active:shadow-[0_0_12px_rgba(255,107,53,0.2)] transition-all duration-200",
  secondary:
    "border border-surface-border text-text-primary rounded-md px-6 py-3 hover:bg-surface-card hover:border-brand-accent/40 hover:shadow-[0_0_16px_rgba(255,107,53,0.08),inset_0_1px_0_rgba(255,255,255,0.03)] active:scale-[0.97] transition-all duration-200",
  ghost:
    "text-text-muted hover:text-text-primary hover:bg-surface-card/50 active:scale-[0.97] rounded-md px-6 py-3 transition-all duration-200",
};

export function CtaButton({
  label,
  href,
  variant,
  className,
  onClick,
}: CtaButtonProps) {
  const base =
    "inline-flex items-center justify-center text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface-bg";
  const styles = `${base} ${variantStyles[variant]}${className ? ` ${className}` : ""}`;

  if (href.startsWith("http")) {
    return (
      <a
        href={href}
        className={styles}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
      >
        {label}
      </a>
    );
  }

  return (
    <Link href={href} className={styles} onClick={onClick}>
      {label}
    </Link>
  );
}
