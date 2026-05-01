import Image from "next/image";
import { assetFoundryVisuals } from "@/lib/asset-foundry-visuals";
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
  media,
  trustBar,
}: HeroShellProps) {
  const heroVisual = assetFoundryVisuals.homepageHero;
  const sectionSpacingClass = trustBar.enabled
    ? "pb-7 sm:pb-9 md:pt-24"
    : "pb-5 sm:pb-6 md:pt-24";

  return (
    <section
      data-ui-proof-id="homepage-hero"
      className={`relative isolate bg-surface-bg ${sectionSpacingClass} overflow-hidden`}
    >
      <div
        data-ui-proof-id="homepage-hero-underlay"
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

      <div className="relative z-10 mx-auto max-w-[1180px] px-6">
        <div className="grid grid-cols-1 items-start gap-9 pt-[330px] md:grid-cols-[minmax(0,1fr)_minmax(340px,420px)] md:items-center md:gap-11 md:pt-0 lg:grid-cols-[minmax(0,1fr)_480px] lg:gap-16">
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
          <HeroReceiptPreview imageSrc={heroVisual.src} media={media} />
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

function getMediaLanguage(media: HeroMedia): string {
  if (media.type === "terminal") {
    return media.terminal?.language ?? "terminal";
  }

  if (media.type === "code_excerpt") {
    return media.code?.language ?? "text";
  }

  return "text";
}

function getMediaLines(media: HeroMedia): string[] {
  if (media.type === "terminal") {
    return media.terminal?.lines ?? [];
  }

  if (media.type === "code_excerpt") {
    return media.code?.lines ?? [];
  }

  return [];
}

function HeroReceiptPreview({ imageSrc, media }: { imageSrc: string; media: HeroMedia }) {
  const mediaLanguage = getMediaLanguage(media);
  const mediaLines = getMediaLines(media);

  return (
    <div className="relative hidden min-h-[420px] min-w-0 select-none md:block">
      <div
        aria-hidden="true"
        className="absolute inset-y-0 left-0 right-[-8vw] overflow-hidden [mask-image:radial-gradient(ellipse_at_58%_50%,black_0%,black_54%,transparent_78%)]"
      >
        <Image
          src={imageSrc}
          alt=""
          fill
          priority
          sizes="52vw"
          className="absolute inset-0 h-full w-full object-cover object-[78%_center] opacity-[0.5] brightness-[0.72] saturate-[0.86] contrast-[0.9] [mask-image:linear-gradient(90deg,transparent_0%,black_30%,black_84%,transparent_100%)]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,3,4,0.92),rgba(3,3,4,0.22)_45%,rgba(3,3,4,0.72)_100%),linear-gradient(180deg,rgba(3,3,4,0.08),rgba(3,3,4,0.92)_100%)]" />
      </div>

      <div className="relative ml-auto mt-10 max-w-[420px] rounded-lg border border-white/[0.14] bg-[linear-gradient(180deg,rgba(255,255,255,0.065),rgba(255,255,255,0.025))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.38)] backdrop-blur">
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.12em] text-white/50">
          Sample proof-run excerpt
        </p>
        <div className="mb-5 flex items-center justify-between gap-3 text-sm font-semibold text-white">
          <span className="inline-flex items-center gap-3">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-full bg-brand-accent shadow-[0_0_20px_rgba(255,107,53,0.75)]"
            />
            Content-bound preview
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-white/45">
            {mediaLanguage}
          </span>
        </div>
        <pre
          data-ui-proof-id="homepage-hero-media"
          className="max-h-[280px] overflow-hidden whitespace-pre-wrap rounded-md border border-white/[0.09] bg-black/35 p-4 font-mono text-[12px] leading-5 text-white/[0.82]"
        >
          {mediaLines.join("\n")}
        </pre>
      </div>
    </div>
  );
}
