import { SectionShell } from "@/components/shared/section-shell";
import { CtaButton } from "@/components/shared/cta-button";

interface OfferSectionProps {
  type: string;
  id: string;
  enabled: boolean;
  title: string;
  price_label: string;
  delivery_label: string;
  includes: string[];
  body: string;
  cta?: { label: string; href: string; variant: string };
  ctas?: { label: string; href: string; variant: string }[];
}

export function OfferSection({
  id,
  title,
  price_label,
  delivery_label,
  includes,
  body,
  cta,
  ctas,
}: OfferSectionProps) {
  const actions = ctas?.length ? ctas : cta ? [cta] : [];

  return (
    <SectionShell id={id} narrow>
      <div className="border-t border-surface-border pt-8 md:pt-10">
        <h2 className="mb-5 text-3xl font-bold text-text-primary">{title}</h2>

        <div className="mb-6 flex flex-wrap items-baseline gap-4 text-sm text-text-muted">
          <span className="text-base font-semibold uppercase tracking-[0.14em] text-text-primary">{price_label}</span>
          <span>{delivery_label}</span>
        </div>

        <p className="mb-8 max-w-2xl text-text-secondary">{body}</p>

        <div className="mb-8 border-t border-surface-border">
          {includes.map((item) => (
            <div key={item} className="border-b border-surface-border py-3 text-sm text-text-secondary">
              {item}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-4">
          {actions.map((action) => (
            <CtaButton
              key={`${action.href}-${action.label}`}
              label={action.label}
              href={action.href}
              variant={(action.variant as "primary" | "secondary" | "ghost") ?? "primary"}
            />
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
