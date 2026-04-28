import Image from "next/image";
import { assetFoundryVisuals } from "@/lib/asset-foundry-visuals";
import { HeroCopy } from "./hero-copy";

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
  aiNote,
  primaryCta,
  secondaryCta,
  proofBadges,
  microcopy,
  trustBar,
}: HeroShellProps) {
  const heroVisual = assetFoundryVisuals.homepageHero;
  const sectionSpacingClass = trustBar.enabled
    ? "pt-9 md:pt-11 pb-7 sm:pb-9"
    : "pt-9 md:pt-11 pb-5 sm:pb-6";

  return (
    <section className={`relative bg-surface-bg ${sectionSpacingClass} overflow-hidden`}>
      <div className="mx-auto max-w-[1200px] px-6">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_minmax(0,420px)] lg:grid-cols-[1fr_minmax(0,480px)] gap-7 md:gap-9 lg:gap-10 items-start">
          {/* Left column: program header */}
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

          <div className="relative hidden min-h-[300px] w-full select-none overflow-hidden bg-black md:block lg:min-h-[340px]">
            <Image
              src={heroVisual.src}
              alt={heroVisual.alt}
              fill
              priority
              sizes="(min-width: 1024px) 480px, (min-width: 768px) 36vw, 0px"
              className="absolute inset-0 h-full w-full object-cover object-[90%_center] opacity-[0.42] brightness-[0.58] saturate-[0.68] contrast-[0.94]"
            />
          </div>
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
