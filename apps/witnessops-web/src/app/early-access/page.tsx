import type { Metadata } from 'next';
import Link from 'next/link';
import { publicContactMailto, PUBLIC_NO_SECRETS_NOTE } from '@/lib/public-contact';
import { getCanonicalAlternates } from '@witnessops/config';

export const metadata: Metadata = { title: 'WitnessOps Early Access', description: 'Keep the evidence. See what changed. Public hostname observations and signed Linux server imports, with saved evidence and reports.', alternates: getCanonicalAlternates('witnessops', '/early-access') };

// No app hostname is exposed until separately configured. Local development can
// review the sign-in journey without adding production DNS or routing.
function appHref() {
  const value = process.env.WITNESSOPS_EARLY_ACCESS_APP_URL;
  if (!value) return process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:3020/' : null;
  try {
    const url = new URL(value);
    if (url.username || url.password || url.search || url.hash || url.pathname !== '/') return null;
    return url.protocol === 'https:' || (url.protocol === 'http:' && url.hostname === '127.0.0.1') ? url.href : null;
  } catch { return null; }
}

export default function EarlyAccessPage() {
  const signIn = appHref();
  return <main id="main-content" className="mx-auto max-w-5xl px-6 pb-24 pt-20 md:pt-28">
    <p className="text-sm uppercase tracking-widest text-brand-accent">WitnessOps · Early Access</p>
    <h1 className="mt-5 text-4xl font-medium leading-tight tracking-tight text-text-primary md:text-5xl">Keep the evidence.<br />See what changed.</h1>
    <p className="mt-6 max-w-2xl text-lg text-text-secondary">Check a public hostname or import a signed check from one Linux server. Keep the evidence, compare later checks, and export a readable report.</p>
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
          <p className="mt-5 text-sm text-text-secondary">Early Access setup is operator-assisted. The app does not connect by SSH or run a collector on your server.</p>
          <a href={publicContactMailto('WitnessOps — One Server Security Check setup')} className="mt-3 inline-flex min-h-12 items-center text-text-primary underline underline-offset-4">Ask about Linux setup →</a>
        </article>
      </div>
    </section>
    <p className="mt-8 text-text-secondary">We&apos;re opening WitnessOps to a small number of users while we refine the product.</p>
    <div className="mt-6 flex flex-wrap items-center gap-5"><a className="inline-flex min-h-12 items-center border border-brand-accent bg-brand-accent px-6 py-3 font-medium text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4" href={publicContactMailto('WitnessOps — Request Early Access')}>Request Early Access</a>{signIn ? <a className="inline-flex min-h-12 items-center text-text-primary underline underline-offset-4" href={signIn}>Already have access? Sign in →</a> : null}</div>
    <p className="mt-3 text-sm text-text-secondary">Your email app opens a request to WitnessOps. Access is granted manually. {PUBLIC_NO_SECRETS_NOTE}</p>
    <section className="mt-12 border-t border-surface-border pt-6"><h2 className="text-xl font-medium text-text-primary">From a free snapshot to a saved baseline</h2><p className="mt-3 text-text-secondary">Your public /check snapshot is transient and is not automatically imported. After access and sign-in, add the hostname and explicitly authorize a fresh saved observation. Saving or opening this page does not start collection.</p></section>
    <section className="mt-8"><h2 className="text-xl font-medium text-text-primary">What this establishes</h2><p className="mt-3 text-text-secondary">External Exposure records public hostname observations only. Not a penetration test, complete attack-surface discovery, or security certification. A Clear observation applies to that check, not the security of the whole hostname.</p><p className="mt-3 text-text-secondary">Linux package verification does not establish that a server is secure, uncompromised or compliant. The report is derived; the signed ZIP remains the source.</p><p className="mt-3 text-sm text-text-secondary">Saved hostname sources are unsigned. Linux imports retain the signed ZIP and matching detached signature. Product actions and optional feedback help us learn; they are separate from evidence. Automatic retention/deletion is not implemented yet. <Link className="underline underline-offset-4" href="/privacy">Data handling</Link></p></section>
  </main>;
}
