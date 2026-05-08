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
  const sectionSpacingClass = trustBar.enabled
    ? "py-14 sm:py-16 md:py-24"
    : "py-14 sm:py-16 md:py-24";

  return (
    <section
      data-ui-proof-id="homepage-hero"
      className={`relative isolate overflow-hidden border-b border-surface-border bg-surface-bg ${sectionSpacingClass}`}
    >
      <div
        data-ui-proof-id="homepage-hero-underlay"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 select-none bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:48px_48px] opacity-45"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 bg-[linear-gradient(180deg,rgba(3,3,4,0)_0%,rgba(3,3,4,0.72)_100%)]"
      />

      <div className="relative z-10 mx-auto max-w-[1180px] px-6">
        <div className="grid grid-cols-1 items-start gap-9 md:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] md:items-center md:gap-11 lg:grid-cols-[minmax(0,1fr)_460px] lg:gap-16">
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
          <HeroReceiptPreview media={media} />
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

function HeroReceiptPreview({ media }: { media: HeroMedia }) {
  const mediaLanguage = getMediaLanguage(media);
  const mediaLines = getMediaLines(media);

  return (
    <div className="relative hidden min-w-0 select-none md:block">
      <div className="ml-auto max-w-[420px] rounded-lg border border-surface-border bg-surface-card/85 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.24)]">
        <div className="mb-4 flex items-start justify-between gap-4 border-b border-surface-border pb-4">
          <div>
            <p className="text-xs font-semibold uppercase text-text-muted">
              Sample proof run
            </p>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              A compact example of the evidence handoff customers inspect after one
              bounded action.
            </p>
          </div>
          <span className="rounded border border-surface-border px-2 py-1 font-mono text-[11px] uppercase text-text-muted">
            {mediaLanguage}
          </span>
        </div>

        <pre
          data-ui-proof-id="homepage-hero-media"
          className="max-h-[260px] overflow-hidden whitespace-pre-wrap rounded-md border border-surface-border bg-black/20 p-4 font-mono text-[12px] leading-5 text-text-secondary"
        >
          {[...mediaLines, "\"sample\": \"ai-agent-action-proof-run\""].join("\n")}
        </pre>

        <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-text-muted">
          {["Scope", "Evidence", "Limits"].map((item) => (
            <span key={item} className="rounded border border-surface-border px-2 py-2 text-center">
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
