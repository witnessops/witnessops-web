import type { ReactNode } from "react";

export type SectionProps = {
  id?: string;
  children: ReactNode;
  className?: string;
};

export function Section({ id, children, className = "" }: SectionProps) {
  return (
    <section
      id={id}
      className={`relative w-full py-[var(--spacing-section-sm)] md:py-[var(--spacing-section)] ${className}`}
    >
      {children}
    </section>
  );
}
