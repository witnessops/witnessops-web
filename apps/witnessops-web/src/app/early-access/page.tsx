import type { Metadata } from 'next';
import Link from 'next/link';
import { publicContactMailto, PUBLIC_NO_SECRETS_NOTE } from '@/lib/public-contact';
import { getCanonicalAlternates } from '@witnessops/config';
import { getWorkspaceAppUrl } from '@/lib/workspace-access';
import { EXTERNAL_ATTACK_SURFACE_OFFER } from '@/lib/commercial-truth';

export const metadata: Metadata = { title: 'WitnessOps checks and workspace', description: 'Start with a free hostname check. Save new observations in your workspace, compare changes and export reports.', alternates: getCanonicalAlternates('witnessops', '/early-access') };

export default function EarlyAccessPage() {
  const signIn = getWorkspaceAppUrl();
  return <main id="main-content" className="mx-auto max-w-5xl px-6 pb-24 pt-20 md:pt-28">
    <p className="text-sm uppercase tracking-widest text-brand-accent">WitnessOps · Checks and workspace</p>
    <h1 className="mt-5 text-4xl font-medium leading-tight tracking-tight text-text-primary md:text-5xl">Keep the evidence.<br />See what changed.</h1>
    <p className="mt-6 max-w-2xl text-lg text-text-secondary">Check a public hostname or import a signed check from one Linux server. Keep the evidence, compare later checks, and export a readable report.</p>
    <div className="mt-6 flex flex-wrap items-center gap-5"><Link className="inline-flex min-h-12 items-center border border-brand-accent bg-brand-accent px-6 py-3 font-medium text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4" href="/check">Run a free check</Link>{signIn ? <a className="inline-flex min-h-12 items-center text-text-primary underline underline-offset-4" href={signIn}>Open workspace →</a> : null}</div>
    <p className="mt-3 text-sm text-text-secondary">The free check needs no account. Workspace access is currently by invitation while the product is in Early Access.</p>
    <section className="mt-10" aria-labelledby="workspace-journey">
      <h2 id="workspace-journey" className="text-xl font-medium text-text-primary">From a free check to a useful history</h2>
      <ol className="mt-5 grid gap-6 md:grid-cols-3">
        <li className="rounded-xl border border-surface-border p-6"><h3 className="font-medium text-text-primary">1. Check one hostname</h3><p className="mt-3 text-text-secondary">Get ten bounded observations. Download the source or save a PDF before leaving; the free result is not stored in an account.</p></li>
        <li className="rounded-xl border border-surface-border p-6"><h3 className="font-medium text-text-primary">2. Create a saved baseline</h3><p className="mt-3 text-text-secondary">After access and sign-in, add your hostname and explicitly authorize a new check. Your public snapshot is not automatically imported.</p></li>
        <li className="rounded-xl border border-surface-border p-6"><h3 className="font-medium text-text-primary">3. Return after a change</h3><p className="mt-3 text-text-secondary">Open the same asset and run again. Compare recorded changes, revisit the original evidence and export a report. Checks run only when you request them.</p></li>
      </ol>
    </section>
    <section className="mt-10" aria-labelledby="early-access-choices">
      <h2 id="early-access-choices" className="text-xl font-medium text-text-primary">Choose what to check</h2>
      <div className="mt-5 grid gap-6 md:grid-cols-2">
        <article className="rounded-xl border border-surface-border p-6">
          <p className="text-xs uppercase tracking-widest text-text-secondary">Public hostname</p><h3 className="mt-3 text-lg font-medium text-text-primary">External Exposure Check</h3>
          <p className="mt-3 text-text-secondary">Observe one public hostname from the outside, after you explicitly authorize a run.</p>
          <ul className="mt-5 space-y-3 text-sm text-text-primary"><li>Run the current ten bounded observations.</li><li>Keep attention flags, unknowns and the recorded evidence.</li><li>Compare saved observations and export reports or PDFs.</li></ul>
          <Link href="/check" className="mt-5 inline-flex min-h-12 items-center text-text-primary underline underline-offset-4">Try the free snapshot →</Link>
        </article>
        <article className="rounded-xl border border-surface-border p-6">
          <p className="text-xs uppercase tracking-widest text-text-secondary">Linux server</p><h3 className="mt-3 text-lg font-medium text-text-primary">One Server Security Check</h3>
          <p className="mt-3 text-text-secondary">An authorized operator collects locally on one Linux server. Import the signed source into your workspace.</p>
          <ul className="mt-5 space-y-3 text-sm text-text-primary"><li>Import a Local Audit 1.2.2 Proofpack ZIP and its matching detached signature.</li><li>Open findings, collection gaps, evidence and the report.</li><li>Import a later check to compare; download the original signed files.</li></ul>
          <p className="mt-5 text-sm text-text-secondary">Linux setup is operator-assisted. The app does not connect by SSH or run a collector on your server.</p>
          <a href={publicContactMailto('WitnessOps — One Server Security Check setup')} className="mt-3 inline-flex min-h-12 items-center text-text-primary underline underline-offset-4">Ask about Linux setup →</a>
        </article>
      </div>
    </section>
    <section className="mt-10 border-t border-surface-border pt-6" aria-labelledby="workspace-access">
      <h2 id="workspace-access" className="text-xl font-medium text-text-primary">Need workspace access?</h2>
      <p className="mt-3 text-text-secondary">Tell us what you want to check. We confirm access manually; signing in alone does not create an invitation.</p>
      <a className="mt-4 inline-flex min-h-12 items-center text-text-primary underline underline-offset-4" href={publicContactMailto('WitnessOps — Request workspace access')}>Request workspace access →</a>
      <p className="mt-3 text-sm text-text-secondary">Your email app opens a request to WitnessOps. {PUBLIC_NO_SECRETS_NOTE}</p>
    </section>
    <section className="mt-10 border-t border-surface-border pt-6" aria-labelledby="paid-review">
      <h2 id="paid-review" className="text-xl font-medium text-text-primary">Need help deciding what to fix?</h2>
      <p className="mt-3 text-text-secondary">{EXTERNAL_ATTACK_SURFACE_OFFER.name.en}: a separate, human-reviewed investigation of one authorized public-facing system, with findings, evidence and a buyer report.</p>
      <p className="mt-3 text-text-primary">{EXTERNAL_ATTACK_SURFACE_OFFER.price.en}. We agree fit and scope before work begins.</p>
      <Link className="mt-4 inline-flex min-h-12 items-center text-text-primary underline underline-offset-4" href={EXTERNAL_ATTACK_SURFACE_OFFER.route.en}>See the review scope →</Link>
    </section>
    <section className="mt-8"><h2 className="text-xl font-medium text-text-primary">What this establishes</h2><p className="mt-3 text-text-secondary">External Exposure records public hostname observations only. Not a penetration test, complete attack-surface discovery, or security certification. A Clear observation applies to that check, not the security of the whole hostname.</p><p className="mt-3 text-text-secondary">Linux package verification does not establish that a server is secure, uncompromised or compliant. The report is derived; the signed ZIP remains the source.</p><p className="mt-3 text-sm text-text-secondary">Saved hostname sources are unsigned. Linux imports retain the signed ZIP and matching detached signature. Product actions and optional feedback help us learn; they are separate from evidence. Automatic retention/deletion is not implemented yet. <Link className="underline underline-offset-4" href="/privacy">Data handling</Link></p></section>
  </main>;
}
