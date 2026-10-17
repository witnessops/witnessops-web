import { PublicNavigationLink as Link } from "./document-navigation";
import type { MouseEventHandler } from "react";

type Variant = "primary" | "secondary" | "ghost";

interface CtaButtonProps {
  label: string;
  href: string;
  variant: Variant;
  className?: string;
  labelClassName?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  uiProofId?: string;
  ariaCurrent?: "page";
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-brand-accent text-text-inverse rounded-sm font-medium px-6 py-3 hover:brightness-110 active:scale-[0.97] transition-all duration-200",
  secondary:
    "border border-surface-border text-text-primary rounded-sm px-6 py-3 hover:bg-surface-card hover:border-brand-accent/40 active:scale-[0.97] transition-all duration-200",
  ghost:
    "text-text-muted hover:text-text-primary hover:bg-surface-card/50 active:scale-[0.97] rounded-sm px-6 py-3 transition-all duration-200",
};

export function CtaButton({
  label,
  href,
  variant,
  className,
  labelClassName,
  onClick,
  uiProofId,
  ariaCurrent,
}: CtaButtonProps) {
  const base =
    "public-cta-button inline-flex items-center justify-center text-sm";
  const styles = `${base} ${variantStyles[variant]}${className ? ` ${className}` : ""}`;

  if (href.startsWith("http")) {
    return (
      <a
        href={href}
        className={styles}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        data-ui-proof-id={uiProofId}
        aria-current={ariaCurrent}
      >
        {labelClassName ? <span className={labelClassName}>{label}</span> : label}
      </a>
    );
  }

  return (
    <Link
      href={href}
      className={styles}
      onClick={onClick}
      data-ui-proof-id={uiProofId}
      aria-current={ariaCurrent}
    >
      {labelClassName ? <span className={labelClassName}>{label}</span> : label}
    </Link>
  );
}
