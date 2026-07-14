import { HeroCopy } from "./hero-copy";

type HeroMedia = {
  type: string;
  terminal?: { language: string; lines: string[] };
  code?: { language: string; lines: string[] };
};

type HeroShellProps = {
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
  media: HeroMedia;
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
  aiNote,
  primaryCta,
  secondaryCta,
  proofBadges,
  microcopy,
  trustBar,
}: HeroShellProps) {
  const sectionSpacingClass = trustBar.enabled
    ? "py-14 sm:py-16 md:py-24"
    : "py-14 sm:py-16 md:py-24";

  return (
    <section
      data-ui-proof-id="homepage-hero"
      className={`relative isolate overflow-hidden border-b border-surface-border bg-surface-bg ${sectionSpacingClass}`}
    >
      <div className="relative z-10 mx-auto max-w-[1180px] px-6">
        <div className="max-w-4xl">
          <HeroCopy
            eyebrow={eyebrow}
            title={title}
            body={body}
            supportingPoints={supportingPoints}
            aiNote={aiNote}
            primaryCta={primaryCta}
            secondaryCta={secondaryCta}
            proofBadges={proofBadges}
            microcopy={microcopy}
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
