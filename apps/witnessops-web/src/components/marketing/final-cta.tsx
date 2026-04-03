import { SectionShell } from "@/components/shared/section-shell";
import { CtaButton } from "@/components/shared/cta-button";

interface FinalCtaProps {
  enabled: boolean;
  title: string;
  body: string;
  primary_cta?: { label: string; href: string; variant: string };
  secondary_cta?: { label: string; href: string; variant: string };
  ctas?: { label: string; href: string; variant: string }[];
}

export function FinalCta({ title, body, primary_cta, secondary_cta, ctas }: FinalCtaProps) {
  const actions = ctas?.length
    ? ctas
    : [primary_cta, secondary_cta].filter(
        (cta): cta is NonNullable<typeof cta> => Boolean(cta),
      );

  return (
    <SectionShell narrow className="cta-gradient text-center">
      <div>
        <h2 className="mb-6 text-3xl font-bold text-text-primary md:text-4xl">
          {title}
        </h2>
        <p className="mx-auto mb-10 max-w-lg text-lg text-text-secondary">
          {body}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          {actions.map((cta) => (
            <CtaButton
              key={`${cta.href}-${cta.label}`}
              label={cta.label}
              href={cta.href}
              variant={(cta.variant as "primary" | "secondary" | "ghost") ?? "primary"}
            />
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
