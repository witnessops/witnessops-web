import { HeroCopy } from "./hero-copy";

type HeroShellProps = {
  eyebrow: string;
  title: string;
  body: string;
  supportingPoints: string[];
  primaryCta: { label: string; href: string; variant: string };
  secondaryCta: { label: string; href: string; variant: string };
  proofBadges: string[];
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
  trustBar,
}: HeroShellProps) {
  return (
    <section className="hero-gradient grid-pattern relative min-h-screen overflow-hidden pt-32 pb-20">
      <div className="mx-auto max-w-[1320px] px-6">
        <div className="max-w-3xl">
          <HeroCopy
            eyebrow={eyebrow}
            title={title}
            body={body}
            supportingPoints={supportingPoints}
            primaryCta={primaryCta}
            secondaryCta={secondaryCta}
            proofBadges={proofBadges}
          />
        </div>

        {trustBar.enabled && (
          <>
            <div className="glow-divider mt-20" />
            <div className="pt-8">
              <p className="mb-4 text-center text-xs font-medium tracking-wide text-text-muted uppercase">
                {trustBar.label}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-8">
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
