import { SectionShell } from "@/components/shared/section-shell";

interface CategorySectionProps {
  type: string;
  id: string;
  enabled: boolean;
  title: string;
  rows: { left: string; right: string }[];
  closing: string;
}

export function CategorySection({ id, title, rows, closing }: CategorySectionProps) {
  return (
    <SectionShell id={id}>
      <h2 className="mb-12 text-center text-3xl font-bold text-text-primary md:text-4xl">
        {title}
      </h2>

      <div className="overflow-hidden rounded-xl border border-surface-border shadow-lg shadow-black/20">
        <div className="grid grid-cols-1 gap-px border-b border-surface-border bg-surface-card/80 px-6 py-4 sm:grid-cols-2">
          <span className="text-xs font-semibold tracking-wider text-text-muted uppercase">
            Existing approach
          </span>
          <span className="hidden text-xs font-semibold tracking-wider text-text-muted uppercase sm:block">
            WitnessOps governed execution
          </span>
        </div>
        {rows.map((row, i) => {
          const isLast = i === rows.length - 1;
          return (
            <div
              key={i}
              className={`grid grid-cols-1 gap-1 px-6 py-4 transition-colors duration-150 sm:grid-cols-2 sm:gap-0 ${
                i < rows.length - 1 ? "border-b border-surface-border" : ""
              } ${
                isLast
                  ? "bg-brand-accent/5 border-l-2 border-l-brand-accent"
                  : "hover:bg-surface-card/40"
              }`}
            >
              <span className={`text-sm ${isLast ? "font-semibold text-brand-accent" : "text-text-secondary"}`}>
                {row.left}
              </span>
                <span className={`text-sm ${isLast ? "font-semibold text-text-primary" : "text-text-muted sm:text-text-secondary"}`}>
                  {row.right}
                </span>
            </div>
          );
        })}
      </div>

      {closing && (
        <p className="mt-8 text-center text-text-muted">
          {closing}
        </p>
      )}
    </SectionShell>
  );
}
