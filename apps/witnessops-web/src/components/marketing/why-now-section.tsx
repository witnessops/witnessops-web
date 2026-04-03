import { SectionShell } from "@/components/shared/section-shell";

interface WhyNowSectionProps {
  type: string;
  id: string;
  enabled: boolean;
  title: string;
  items: { title: string; body: string }[];
  closing: string;
}

export function WhyNowSection({ id, title, items, closing }: WhyNowSectionProps) {
  return (
    <SectionShell id={id}>
      <h2 className="mb-12 text-3xl font-bold text-text-primary">
        {title}
      </h2>

      <div className="grid gap-8 md:grid-cols-3">
        {items.map((card) => (
          <div
            key={card.title}
            className="rounded border border-surface-border bg-surface-card p-6 transition-colors hover:border-brand-accent/20"
          >
            <h3 className="mb-3 text-lg font-semibold text-text-primary">
              {card.title}
            </h3>
            <p className="text-text-secondary">{card.body}</p>
          </div>
        ))}
      </div>

      <p className="mt-8 text-text-muted">
        {closing}
      </p>
    </SectionShell>
  );
}
