import { HeroCopy } from "./hero-copy";

type HeroShellProps = {
  eyebrow: string;
  title: string;
  body: string;
  supportingPoints: string[];
  primaryCta: { label: string; href: string; variant: string };
  secondaryCta: { label: string; href: string; variant: string };
  proofBadges: string[];
  microcopy?: string;
  receiptExcerptLines?: string[];
  trustBar: {
    enabled: boolean;
    label: string;
    items: string[];
  };
};

export function HeroShell({
  eyebrow,
  title,
  body,
  supportingPoints,
  primaryCta,
  secondaryCta,
  proofBadges,
  microcopy,
  trustBar,
}: HeroShellProps) {
  const sectionSpacingClass = trustBar.enabled
    ? "pt-9 md:pt-11 pb-7 sm:pb-9"
    : "pt-9 md:pt-11 pb-5 sm:pb-6";

  return (
    <section className={`relative bg-surface-bg ${sectionSpacingClass} overflow-hidden`}>
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_minmax(0,420px)] gap-7 md:gap-9 lg:gap-10 items-start">
          {/* Left column: program header */}
          <HeroCopy
            eyebrow={eyebrow}
            title={title}
            body={body}
            supportingPoints={supportingPoints}
            primaryCta={primaryCta}
            secondaryCta={secondaryCta}
            proofBadges={proofBadges}
            microcopy={microcopy}
          />

          {/* Right column: decorative schematic (no fake data) */}
          <div
            aria-hidden="true"
            className="relative hidden md:block h-full min-h-[320px] lg:min-h-[360px] w-full select-none pointer-events-none"
            style={{
              backgroundImage: "url('/hero-receipt.svg')",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
              backgroundSize: "contain",
            }}
          />
        </div>

        {trustBar.enabled && (
          <>
            <div className="glow-divider mt-10 sm:mt-11" />
            <div className="pt-5">
              <p className="mb-3 text-center text-xs font-medium tracking-wide text-text-muted uppercase">
                {trustBar.label}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-6 md:gap-7">
                {trustBar.items.map((item) => (
                  <span key={item} className="text-sm text-text-muted">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
