import { SampleCaseBanner } from "@/components/marketing/sample-case-banner";
import { CtaButton } from "@/components/shared/cta-button";

export type OffsecSuiteSampleProps = {
  title: string;
  productId: string;
  runId: string;
  situation: string;
  bannerNote: string;
  /** Method samples are not buyer product cards. */
  methodOnly?: boolean;
  catalogHref?: string;
  sampleBase: string;
  packageDir: string;
  proofpackName: string;
  walkthrough: ReadonlyArray<readonly [string, string]>;
  deliverables: readonly string[];
  boundaries: readonly string[];
  inspectFiles: readonly string[];
};

export function OffsecSuiteSample({
  title,
  productId,
  runId,
  situation,
  bannerNote,
  methodOnly = false,
  catalogHref,
  sampleBase,
  packageDir,
  proofpackName,
  walkthrough,
  deliverables,
  boundaries,
  inspectFiles,
}: OffsecSuiteSampleProps) {
  const packHref = `${sampleBase}/${proofpackName}`;
  const packageHref = `${sampleBase}/${packageDir}`;

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="buyer-page"
      data-page="offsec-suite-sample"
      data-sample-product={productId}
      data-method-only={methodOnly ? "true" : "false"}
    >
      <div className="mx-auto max-w-6xl px-6 py-12 lg:py-20">
        <SampleCaseBanner title={title} note={bannerNote} showActions={false} />

        <header className="mt-8 max-w-4xl border-b border-surface-border pb-12">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-accent">
            {methodOnly ? "Method sample" : "Sample case"}
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.03] tracking-[-0.04em] text-text-primary md:text-5xl lg:text-6xl">
            {title}
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-text-secondary">{situation}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="border border-surface-border px-3 py-1 text-xs text-text-muted">
              <span className="font-semibold text-text-primary">Product:</span> {productId}
            </span>
            <span className="border border-surface-border px-3 py-1 text-xs text-text-muted">
              <span className="font-semibold text-text-primary">Run:</span>{" "}
              <span className="font-mono">{runId}</span>
            </span>
            <span className="border border-surface-border px-3 py-1 text-xs text-text-muted">
              <span className="font-semibold text-text-primary">Status:</span> Synthetic, not live
            </span>
            {methodOnly ? (
              <span className="border border-brand-accent/40 bg-brand-accent/5 px-3 py-1 text-xs text-text-muted">
                Not a public product card
              </span>
            ) : null}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <CtaButton href="/review/request" variant="primary" label="Start a review" />
            {catalogHref ? (
              <CtaButton href={catalogHref} variant="secondary" label="View service" />
            ) : null}
            <CtaButton
              href="/review/sample-cases"
              variant="secondary"
              label="Browse all examples"
            />
          </div>
        </header>

        <section className="border-b border-surface-border py-12">
          <h2 className="text-3xl font-semibold tracking-[-0.02em] text-text-primary">
            How to use this sample
          </h2>
          <ol className="mt-8 space-y-4">
            {walkthrough.map(([step, body], index) => (
              <li key={step} className="border-t border-surface-border pt-4">
                <p className="text-sm font-semibold text-text-primary">
                  {index + 1}. {step}
                </p>
                <p className="mt-1 text-sm leading-7 text-text-secondary">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="grid gap-10 border-b border-surface-border py-12 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-semibold tracking-[-0.02em] text-text-primary">
              What you can inspect
            </h2>
            <ul className="mt-6 space-y-4 text-base leading-7 text-text-secondary">
              {deliverables.map((item) => (
                <li key={item} className="border-t border-surface-border pt-4">
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-3xl font-semibold tracking-[-0.02em] text-text-primary">
              Package files
            </h2>
            <ul className="mt-6 space-y-3 text-sm leading-7 text-text-secondary">
              {inspectFiles.map((file) => (
                <li key={file} className="border-t border-surface-border pt-3 font-mono text-xs sm:text-sm">
                  <a
                    href={`${packageHref}/${file}`}
                    className="text-brand-accent underline-offset-4 hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {file}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={packHref}
                className="inline-flex min-h-11 items-center border border-surface-border px-5 text-sm font-semibold text-text-primary hover:bg-surface-inset"
              >
                Download proofpack
              </a>
              <a
                href={`${packHref}.sha256`}
                className="inline-flex min-h-11 items-center text-sm font-semibold text-text-secondary underline-offset-4 hover:underline"
              >
                SHA-256 sidecar
              </a>
              <a
                href={`${packHref}.sig.json`}
                className="inline-flex min-h-11 items-center text-sm font-semibold text-text-secondary underline-offset-4 hover:underline"
              >
                Signature envelope
              </a>
            </div>
            <p className="mt-3 text-xs leading-6 text-text-muted">
              Proofpack bytes are published as a <span className="font-mono">.proofpack</span> file
              (ZIP-compatible contents). Prefer the listed package files for browser inspection.
            </p>
          </div>
        </section>

        <section className="border-b border-surface-border py-12">
          <h2 className="text-3xl font-semibold tracking-[-0.02em] text-text-primary">
            Legacy proofpack format
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-text-secondary">
            This sample uses an earlier proofpack format. It is not compatible with the
            current Bundle V1 verifier. A pinned historical verifier is not presently
            available. Downloads are preserved for historical inspection, not as a current
            verification result.
          </p>
        </section>

        <section className="border-b border-surface-border py-12">
          <h2 className="text-3xl font-semibold tracking-[-0.02em] text-text-primary">Boundaries</h2>
          <ul className="mt-6 space-y-4 text-base leading-7 text-text-secondary">
            {boundaries.map((item) => (
              <li key={item} className="border-t border-surface-border pt-4">
                {item}
              </li>
            ))}
            <li className="border-t border-surface-border pt-4">
              Not live customer evidence, production verification for your environment, or
              compliance certification.
            </li>
          </ul>
        </section>

        <div className="border-t border-surface-border pt-10">
          <div className="flex flex-wrap gap-3">
            <CtaButton href="/review/request" variant="primary" label="Ask about a review" />
            <CtaButton href="/review/sample-cases" variant="secondary" label="More examples" />
            {catalogHref ? (
              <CtaButton href={catalogHref} variant="secondary" label="Back to service" />
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
