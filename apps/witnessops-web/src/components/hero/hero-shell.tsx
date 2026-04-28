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
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[340px] select-none overflow-hidden md:hidden"
      >
        <Image
          src={heroVisual.src}
          alt=""
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 h-full w-full translate-x-[6%] scale-[1.18] object-cover object-[64%_center] opacity-[0.78] brightness-[0.74] saturate-[0.82] contrast-[0.86] mix-blend-screen"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,3,4,0)_0%,rgba(3,3,4,0.22)_45%,rgba(3,3,4,1)_100%),linear-gradient(90deg,rgba(3,3,4,0.76),rgba(3,3,4,0.08)_54%,rgba(3,3,4,0.24))]" />
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-10vw] top-10 z-0 hidden h-[440px] w-[62vw] max-w-[980px] select-none overflow-hidden opacity-55 md:block"
      >
        <Image
          src={heroVisual.src}
          alt=""
          fill
          priority
          sizes="62vw"
          className="absolute inset-0 h-full w-full object-cover object-[78%_center] brightness-[0.72] saturate-[0.74] contrast-[0.92] mix-blend-screen [mask-image:linear-gradient(90deg,transparent_0%,black_18%,black_72%,transparent_100%)]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,3,4,0.5),rgba(3,3,4,0.08)_46%,rgba(3,3,4,0.58)_100%)]" />
      </div>

      <div className="relative z-10 mx-auto max-w-[1200px] px-6">
        <div className="grid grid-cols-1 items-start gap-7 pt-[390px] md:grid-cols-[minmax(0,640px)_1fr] md:gap-9 md:pt-0 lg:gap-10">
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
