import { SectionShell } from "@/components/shared/section-shell";
import { CtaButton } from "@/components/shared/cta-button";

interface ExpansionPathSectionProps {
  type: string;
  id: string;
  enabled: boolean;
  title: string;
  body: string;
  ctas: { label: string; href: string; variant: string }[];
}

export function ExpansionPathSection({ id, title, body, ctas }: ExpansionPathSectionProps) {
  return (
    <SectionShell id={id} narrow>
      <div className="text-center">
        <h2 className="mb-6 text-3xl font-bold text-text-primary">
          {title}
        </h2>
        <p className="mb-8 text-lg text-text-secondary">
          {body}
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          {ctas.map((cta) => (
            <CtaButton
              key={`${cta.href}:${cta.label}`}
              label={cta.label}
              href={cta.href}
              variant={(cta.variant as "primary" | "secondary" | "ghost") ?? "secondary"}
            />
          ))}
        </div>
      </div>
    </SectionShell>
  );
}
