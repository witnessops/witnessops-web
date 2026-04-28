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
    ? "pb-7 sm:pb-9 md:pt-11"
    : "pb-5 sm:pb-6 md:pt-11";

  return (
    <section className={`relative isolate bg-surface-bg ${sectionSpacingClass} overflow-hidden`}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[360px] select-none overflow-hidden md:hidden"
      >
        <Image
          src={heroVisual.src}
          alt=""
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 h-full w-full -translate-x-[8%] scale-[1.55] object-cover object-[78%_center] opacity-[0.76] brightness-[0.82] saturate-[0.95] contrast-[1.02]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,3,4,0)_0%,rgba(3,3,4,0.08)_34%,rgba(3,3,4,0.68)_78%,rgba(3,3,4,1)_100%),linear-gradient(90deg,rgba(3,3,4,1)_0%,rgba(3,3,4,0.86)_18%,rgba(3,3,4,0.18)_54%,rgba(3,3,4,0.2)_100%)]" />
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-7vw] top-8 z-0 hidden h-[470px] w-[64vw] max-w-[1060px] select-none overflow-hidden opacity-70 md:block"
      >
        <Image
          src={heroVisual.src}
          alt=""
          fill
          priority
          sizes="62vw"
          className="absolute inset-0 h-full w-full object-cover object-[77%_center] brightness-[0.86] saturate-[0.98] contrast-[1.02] [mask-image:linear-gradient(90deg,transparent_0%,black_18%,black_84%,transparent_100%)]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,3,4,0.62),rgba(3,3,4,0.1)_42%,rgba(3,3,4,0.42)_100%),linear-gradient(180deg,rgba(3,3,4,0.05),rgba(3,3,4,0.82)_100%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1200px] px-6">
        <div className="grid grid-cols-1 items-start gap-7 pt-[380px] md:grid-cols-[minmax(0,640px)_1fr] md:gap-9 md:pt-0 lg:gap-10">
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
