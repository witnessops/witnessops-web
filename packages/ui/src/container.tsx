import type { ReactNode } from "react";

type Variant = "content" | "narrow";

export type ContainerProps = {
  variant?: Variant;
  children: ReactNode;
  className?: string;
};

const variantStyles: Record<Variant, string> = {
  content: "max-w-[var(--max-width-content,1200px)]",
  narrow: "max-w-[var(--max-width-narrow,720px)]",
};

export function Container({
  variant = "content",
  children,
  className = "",
}: ContainerProps) {
  return (
    <div
      className={`mx-auto w-full px-4 sm:px-6 lg:px-8 ${variantStyles[variant]} ${className}`}
    >
      {children}
    </div>
  );
}
