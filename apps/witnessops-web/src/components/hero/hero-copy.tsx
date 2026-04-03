import { CtaButton } from "@/components/shared/cta-button";

type HeroCopyProps = {
  eyebrow: string;
  title: string;
  body: string;
  supportingPoints: string[];
  primaryCta: { label: string; href: string; variant: string };
  secondaryCta: { label: string; href: string; variant: string };
  proofBadges: string[];
};

export function HeroCopy({
  eyebrow,
  title,
  body,
  supportingPoints,
  primaryCta,
  secondaryCta,
  proofBadges,
}: HeroCopyProps) {
  return (
    <div className="max-w-[40rem] lg:pr-6 xl:pr-10">
      <p className="mb-4 text-sm font-medium tracking-wide text-brand-accent uppercase">
        {eyebrow}
      </p>

      <h1
        className="mb-6 max-w-[15ch] text-4xl font-semibold uppercase leading-none tracking-[0.04em] text-balance text-text-primary md:text-5xl lg:text-6xl"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {title}
      </h1>

      <p className="mb-7 max-w-[34rem] text-lg leading-8 text-text-secondary">{body}</p>

      {supportingPoints.length > 0 && (
        <ul className="mb-9 space-y-2.5">
          {supportingPoints.map((point) => (
            <li key={point} className="flex items-start gap-2 text-sm text-text-secondary">
              <span className="mt-1 text-brand-accent" aria-hidden="true">
                ✓
              </span>
              {point}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <CtaButton
          label={primaryCta.label}
          href={primaryCta.href}
          variant={(primaryCta.variant as "primary" | "secondary" | "ghost") ?? "primary"}
        />
        <CtaButton
          label={secondaryCta.label}
          href={secondaryCta.href}
          variant={(secondaryCta.variant as "primary" | "secondary" | "ghost") ?? "secondary"}
        />
      </div>

      {proofBadges.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2">
          {proofBadges.map((badge) => (
            <span
              key={badge}
              className="rounded-full border border-surface-border bg-surface-card px-3 py-1 text-xs text-text-muted transition-all duration-200 hover:border-brand-accent/30 hover:text-text-secondary hover:shadow-[0_0_12px_rgba(255,107,53,0.06)]"
            >
              {badge}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
