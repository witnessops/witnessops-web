import { CtaButton } from "@/components/shared/cta-button";

type HeroCopyProps = {
  eyebrow: string;
  title: string;
  body: string;
  supportingPoints: string[];
  aiNote?: {
    title: string;
    body: string[];
    microcopy?: string;
  };
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
  aiNote,
  primaryCta,
  secondaryCta,
  proofBadges,
  microcopy,
}: HeroCopyProps) {
  return (
    <div className="min-w-0 max-w-[640px]">
      <p className="kb-section-tag mb-4 md:mb-5">{eyebrow}</p>

      <h1
        data-ui-proof-id="homepage-hero-headline"
        className="mb-5 max-w-[18ch] text-[34px] font-semibold leading-[1.05] tracking-[-0.02em] text-balance text-text-primary sm:text-[38px] md:text-[46px] md:leading-[1] lg:text-[56px]"
      >
        {title}
      </h1>

      <p
        data-ui-proof-id="homepage-hero-body"
        className="max-w-[54ch] text-[17px] leading-8 text-text-secondary md:text-lg"
      >
        {body}
      </p>

      <div className="mt-7 flex flex-wrap items-center gap-3 sm:gap-4">
        <CtaButton
          uiProofId="homepage-hero-primary-cta"
          label={primaryCta.label}
          href={primaryCta.href}
          variant={(primaryCta.variant as "primary" | "secondary" | "ghost") ?? "primary"}
          className="min-h-[44px] px-4 text-[13px] font-semibold sm:px-6 sm:text-sm"
        />
        <CtaButton
          label={secondaryCta.label}
          href={secondaryCta.href}
          variant={(secondaryCta.variant as "primary" | "secondary" | "ghost") ?? "secondary"}
          className="min-h-[44px] border-white/[0.14] bg-white/[0.04] px-4 text-[13px] text-white/[0.85] shadow-none hover:border-white/20 hover:bg-white/[0.06] hover:shadow-none sm:px-6 sm:text-sm"
        />
      </div>

      {aiNote && (
        <section className="mt-8 max-w-[54ch] border-l border-surface-border pl-4">
          <h2 className="text-sm font-semibold leading-6 text-text-primary">
            {aiNote.title}
          </h2>
          <div className="mt-2 space-y-2 text-sm leading-6 text-text-secondary">
            {aiNote.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          {aiNote.microcopy && (
            <p className="mt-3 text-xs leading-5 text-text-muted">
              {aiNote.microcopy}
            </p>
          )}
        </section>
      )}

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
