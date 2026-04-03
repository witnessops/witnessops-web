import type { ReactNode, ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

type BaseProps = {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  className?: string;
};

type ButtonAsButton = BaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps> & {
    href?: undefined;
  };

type ButtonAsAnchor = BaseProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseProps> & {
    href: string;
  };

export type ButtonProps = ButtonAsButton | ButtonAsAnchor;

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-brand-accent text-text-inverse hover:brightness-110 hover:shadow-lg active:scale-[0.98] border border-transparent",
  secondary:
    "bg-surface-card text-text-primary hover:bg-surface-card hover:border-brand-accent/30 active:scale-[0.98] border border-surface-border",
  ghost:
    "bg-transparent text-text-secondary hover:text-text-primary hover:bg-surface-card/50 active:scale-[0.98] border border-transparent",
};

const sizeStyles: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm rounded-[var(--radius-sm)]",
  md: "px-5 py-2.5 text-base rounded-[var(--radius)]",
  lg: "px-7 py-3.5 text-lg rounded-[var(--radius-lg)]",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: ButtonProps) {
  const classes = [
    "inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer",
    variantStyles[variant],
    sizeStyles[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if ("href" in rest && rest.href) {
    const { href, ...anchorProps } = rest as ButtonAsAnchor;
    return (
      <a href={href} className={classes} {...anchorProps}>
        {children}
      </a>
    );
  }

  const buttonProps = rest as Omit<ButtonAsButton, keyof BaseProps>;
  return (
    <button className={classes} {...buttonProps}>
      {children}
    </button>
  );
}
