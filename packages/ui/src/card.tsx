import type { ReactNode } from "react";

export type CardProps = {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Card({ header, footer, children, className = "" }: CardProps) {
  return (
    <div
      className={`bg-surface-card border border-surface-border rounded-[var(--radius-lg)] overflow-hidden group transition-all duration-200 hover:border-surface-border/80 hover:shadow-lg hover:shadow-black/20 ${className}`}
    >
      {header && (
        <div className="px-6 py-4 border-b border-surface-border">
          {header}
        </div>
      )}
      <div className="px-6 py-5">{children}</div>
      {footer && (
        <div className="px-6 py-4 border-t border-surface-border bg-surface-bg-alt">
          {footer}
        </div>
      )}
    </div>
  );
}
