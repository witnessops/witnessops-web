import { SectionShell } from "@/components/shared/section-shell";

interface PlatformSurfacesSectionProps {
  type: string;
  id: string;
  enabled: boolean;
  title: string;
  cards: { title: string; body: string }[];
}

export function PlatformSurfacesSection({ id, title, cards }: PlatformSurfacesSectionProps) {
  return (
    <SectionShell id={id}>
      <h2 className="mb-12 text-3xl font-bold text-text-primary">
        {title}
      </h2>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.title}
            className="rounded border border-surface-border bg-surface-card p-6 transition-colors hover:border-brand-accent/20"
          >
            <h3 className="mb-2 text-lg font-semibold text-text-primary">
              {card.title}
            </h3>
            <p className="text-sm text-text-secondary">{card.body}</p>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
