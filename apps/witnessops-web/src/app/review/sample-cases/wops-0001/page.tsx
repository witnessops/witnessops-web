import type { Metadata } from "next";
import Link from "next/link";
import { getCanonicalAlternates } from "@witnessops/config";
import { CtaButton } from "@/components/shared/cta-button";
import { PublicContactRoute } from "@/components/marketing/public-contact-route";
import { wopsCase } from "./case-contract";
import { candidateRoot, validateCase } from "./validate-case";
import { CopyHash } from "./copy-hash";

// Public presentation, not a production verification result.
// Fail closed on content/contract drift during build and rendering.
validateCase(wopsCase, candidateRoot());

export const metadata: Metadata = {
  title: `${wopsCase.id}: ${wopsCase.title}`,
  description: `${wopsCase.summary} ${wopsCase.boundary}`,
  alternates: getCanonicalAlternates("witnessops", wopsCase.route),
};

export default function WopsCasePage() {
  const record = wopsCase;
  const report = record.artifacts.find((a) => a.file === "case-report.md")!;
  return (
    <main id="main-content" tabIndex={-1} className="buyer-page" data-page="wops-0001">
      <div className="mx-auto max-w-6xl px-6 py-12 lg:py-20">
        <Link href="/review/sample-cases" className="text-sm text-text-muted underline underline-offset-4">← Sample work</Link>
        <header className="mt-8 border-b border-surface-border pb-10">
          <p className="text-sm font-semibold text-brand-accent">{record.boundary}</p>
          <p className="mt-5 font-mono text-sm text-text-muted">{record.id} · {record.status}</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight tracking-[-0.04em] text-text-primary md:text-6xl">{record.title}</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-text-secondary">{record.summary}</p>
          <div className="mt-6 border-l-2 border-brand-accent pl-4" data-case-result>
            <p className="font-semibold text-text-primary">{record.result}</p>
            <p className="mt-1 text-sm leading-6 text-text-secondary">Scope: {record.scope}</p>
            <p className="mt-2 text-sm text-text-muted">{record.claimBoundary}</p>
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            <CtaButton href={`${record.artifactBase}/${report.file}`} variant="primary" label="Read selected report" />
            <CtaButton href="/review/request" variant="secondary" label="Start a review" />
          </div>
        </header>
        <nav aria-label="Case sections" className="flex flex-wrap gap-6 border-b border-surface-border py-5 text-sm font-semibold text-text-primary">
          {["Case", "Evidence", "Findings", "Review limits"].map((label) => <a key={label} className="min-h-11 content-center underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-brand-accent" href={`#${label.toLowerCase().replaceAll(" ", "-")}`}>{label}</a>)}
        </nav>
        <section id="case" aria-labelledby="case-heading" className="scroll-mt-28 border-b border-surface-border py-10">
          <h2 id="case-heading" className="text-3xl font-semibold text-text-primary">Case</h2>
          <h3 className="mt-6 text-xl font-semibold text-text-primary">What was investigated</h3>
          <p className="mt-3 max-w-3xl leading-7 text-text-secondary">{record.question}</p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-text-muted">{record.association}</p>
          <dl className="mt-5 grid gap-4 text-sm md:grid-cols-2">
            <div><dt className="text-text-muted">Original capture date</dt><dd className="mt-1 text-text-primary">{record.captureDate} · {record.timezone}</dd></div>
            <div><dt className="text-text-muted">Case-record creation</dt><dd className="mt-1 break-all text-text-primary">{record.createdAt}</dd></div>
          </dl>
          <ol className="mt-6 grid gap-4 md:grid-cols-3">{record.runs.map((run) => <li key={run.label} className="border border-surface-border p-5"><p className="text-xs uppercase tracking-wider text-brand-accent">{run.kind}</p><h3 className="mt-2 font-semibold text-text-primary">{run.label}</h3><p className="mt-2 text-sm leading-6 text-text-muted">{run.time}<br />{record.timezone}</p></li>)}</ol>
          <details className="mt-6 border border-surface-border p-5">
            <summary className="cursor-pointer font-semibold text-text-primary">Recorded environment and executable identity</summary>
            <dl className="mt-4 space-y-4">{record.environment.map((item) => <div key={item.label}><dt className="text-sm text-text-muted">{item.label}</dt><dd className="mt-1 break-all font-mono text-sm text-text-secondary">{item.value}</dd></div>)}</dl>
          </details>
        </section>
        <section id="evidence" aria-labelledby="evidence-heading" className="scroll-mt-28 border-b border-surface-border py-10">
          <h2 id="evidence-heading" className="text-3xl font-semibold text-text-primary">Evidence</h2>
          <p className="mt-3 text-text-secondary" data-artifact-count>{record.artifacts.length} selected downloadable files, including the checksum manifest.</p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-text-muted">{record.reconstructionLimit}</p>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-text-muted">{record.integrityNote}</p>
          <ul className="mt-6 grid gap-4 md:grid-cols-2">{record.artifacts.map((artifact) => <li key={artifact.file} className="min-w-0 border border-surface-border p-5" data-artifact={artifact.file}>
            <h3 className="text-lg font-semibold text-text-primary">{artifact.title}</h3>
            <p className="mt-2 text-sm leading-6 text-text-muted">{artifact.note}</p>
            <a href={`${record.artifactBase}/${artifact.file}`} download={artifact.file} className="mt-4 inline-block min-h-11 break-all text-sm font-semibold text-brand-accent underline underline-offset-4">Download {artifact.file}</a>
            <p className="text-xs text-text-muted">{artifact.bytes.toLocaleString("en-US")} bytes</p>
            <CopyHash value={artifact.sha256} name={artifact.file} />
          </li>)}</ul>
        </section>
        <section id="findings" aria-labelledby="findings-heading" className="scroll-mt-28 border-b border-surface-border py-10">
          <h2 id="findings-heading" className="text-3xl font-semibold text-text-primary">Findings</h2>
          <ul className="mt-6 space-y-4">{record.claims.map((claim) => <li key={claim.id} className="border border-surface-border p-5" data-claim={claim.id}>
            <div className="flex flex-wrap items-center gap-3"><h3 className="text-lg font-semibold text-text-primary">{claim.title}</h3><span className={`border px-2 py-1 font-mono text-xs text-text-secondary ${claim.cls === "INFERENCE" ? "border-dashed" : claim.cls === "UNKNOWN" ? "border-dotted" : "border-solid"}`}>{claim.cls}</span></div>
            <p className="mt-3 max-w-3xl leading-7 text-text-secondary">{claim.text}</p>
            <ul className="mt-3 space-y-2">{claim.references.map((reference) => <li key={`${reference.file}:${reference.start}`} className="text-sm leading-6 text-text-muted"><a className="break-words underline underline-offset-4" href={`${record.artifactBase}/${reference.file}`}>{reference.file} · lines {reference.start}–{reference.end}</a><span className="block">{reference.section}</span></li>)}</ul>
          </li>)}</ul>
        </section>
        <section id="review-limits" aria-labelledby="limits-heading" className="scroll-mt-28 border-b border-surface-border py-10">
          <h2 id="limits-heading" className="text-3xl font-semibold text-text-primary">What this review does not say</h2>
          <ul className="mt-5 list-disc space-y-3 pl-5 text-sm leading-7 text-text-secondary">{record.limits.map((limit) => <li key={limit}>{limit}</li>)}</ul>
        </section>
        <div className="mt-10"><PublicContactRoute primaryHref="/review/request" /></div>
      </div>
    </main>
  );
}
