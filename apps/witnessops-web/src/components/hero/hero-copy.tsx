import { CtaButton } from "@/components/shared/cta-button";

type HeroCopyProps = {
  eyebrow: string;
  title: string;
  body: string;
  supportingPoints: string[];
  primaryCta: { label: string; href: string; variant: string };
  secondaryCta: { label: string; href: string; variant: string };
  proofBadges: string[];
  microcopy?: string;
};

export function HeroCopy({
  eyebrow,
  title,
  body,
  supportingPoints,
  primaryCta,
  secondaryCta,
  proofBadges,
  microcopy,
}: HeroCopyProps) {
  return (
    <div>
      <p className="kb-section-tag mb-3">{eyebrow}</p>

      <h1 className="mb-4 max-w-[26ch] text-2xl font-semibold leading-[1.2] tracking-[-0.005em] text-balance text-text-primary md:text-[28px] lg:text-[32px]">
        {title}
      </h1>

      <p className="mb-2 max-w-[56ch] text-base leading-7 text-text-secondary">{body}</p>

      {supportingPoints.length > 0 && (
        <ul className="mb-4 space-y-2">
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

      <div className="mt-6 flex flex-wrap items-center gap-4">
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

      {microcopy && (
        <p className="mt-3 text-xs font-mono text-text-muted">{microcopy}</p>
      )}

      {proofBadges.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {proofBadges.map((badge) => (
            <span
              key={badge}
              className="border border-surface-border bg-surface-card px-3 py-1 text-xs text-text-muted transition-colors duration-200 hover:border-accent-trust/40 hover:text-text-secondary"
            >
              {badge}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
