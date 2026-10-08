import type { Metadata } from "next";
import { ContactForm } from "@/app/(marketing)/contact/contact-form";
import { CtaButton } from "@/components/shared/cta-button";
import { PublicNavigationLink as Link } from "@/components/shared/document-navigation";
import { publicContactMailto } from "@/lib/public-contact";
import styles from "./receipt.module.css";

export const metadata: Metadata = {
  title: "€99 External Exposure Receipt",
  description: "One public hostname. Human review, timestamped evidence and clear next steps. €99 excluding VAT. A manually delivered pilot.",
  robots: { index: false, follow: false },
};

const checks = [
  ["Public DNS", "Where the hostname resolves, within the existing bounded check."],
  ["TLS & certificate", "Certificate state and limited legacy TLS attempts."],
  ["HTTPS & headers", "Redirect behaviour, HSTS and selected browser headers."],
  ["Public contact & DNS policies", "security.txt, SPF, DMARC and CAA publication, where applicable."],
];

export default function ExposureReceiptPage() {
  return <main id="main-content" tabIndex={-1} className={styles.page} data-page="exposure-receipt">
    <div className={styles.container}>
      <p className={styles.pilot}>PILOT PREVIEW · MANUAL DELIVERY</p>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>EXTERNAL EXPOSURE RECEIPT</p>
          <h1>One hostname.<br />Evidence you can<br /><span>act on.</span></h1>
          <p className={styles.lead}>Understand what your public hostname reveals, what deserves attention, and what the evidence leaves open.</p>
          <div className={styles.actions}>
            <CtaButton href="#request" variant="primary" label="Request a €99 receipt" />
            <CtaButton href="/check" variant="secondary" label="Try the free hostname check" />
          </div>
          <p className={styles.note}>No account installation. No meeting required. One authorised public hostname.</p>
        </div>
        <aside className={styles.priceCard} aria-label="Pilot price and scope">
          <p className={styles.eyebrow}>A SMALL, CLEAR FIRST STEP</p>
          <p className={styles.price}>€99<span>excluding VAT · one-off</span></p>
          <ul><li>Human-reviewed observations</li><li>One-page summary you can forward</li><li>Evidence JSON and file hashes</li><li>Priorities, next steps and unknowns</li></ul>
          <p className={styles.note}>Target delivery: next business day after scope, written authority, evidence handling and payment are confirmed. We confirm availability before payment.</p>
          <p className={styles.manual}>Request first. Scope confirmed by email. Manual payment arrangement.</p>
        </aside>
      </header>

      <section className={styles.section} aria-labelledby="value-title">
        <p className={styles.eyebrow}>01 / WHAT THE €99 ADDS</p>
        <h2 id="value-title">The observations are the start.<br />The review makes them useful.</h2>
        <p className={styles.intro}>The free snapshot already gives you bounded observations and a downloadable result. The paid pilot adds a person reviewing that evidence, explaining priorities and assembling a concise handover.</p>
        <div className={styles.grid}>
          {[["01", "Know what matters", "A human reviews the recorded observations, explains what deserves attention and avoids turning missing headers into automatic vulnerability claims."], ["02", "Share the evidence", "A one-page summary, the underlying snapshot JSON and a SHA-256 file list keep the explanation connected to the evidence."], ["03", "See the boundary", "Observation times, references, failed or skipped checks and unresolved questions stay visible. You get next steps without a security score."]].map(([number, title, body]) => <article key={number}><span className={styles.number}>{number}</span><h3>{title}</h3><p>{body}</p></article>)}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="scope-title">
        <p className={styles.eyebrow}>02 / A BOUNDED LOOK FROM OUTSIDE</p>
        <h2 id="scope-title">One hostname. Clear limits.</h2>
        <div className={styles.scopeGrid}>{checks.map(([title, body]) => <article key={title}><h3>{title}</h3><p>{body}</p></article>)}</div>
        <aside className={styles.boundary}><h3>What this can’t establish</h3><p>These are limited, unauthenticated DNS, TLS and HTTP observations, including requests on ports 80 and 443. No login testing, broad port scanning, CVE scanning, exploitation or remediation. Redirect destinations and inherited DNS policy can appear in the evidence within the existing check’s limits; they do not expand the agreed review scope.</p><p>This is a point-in-time record, not a penetration test, certification or security guarantee. Hashes check file consistency, not the correctness or completeness of observations. The pilot receipt is unsigned and is not supported by public /verify.</p></aside>
      </section>

      <section className={styles.section} aria-labelledby="journey-title">
        <p className={styles.eyebrow}>03 / REQUEST → AGREE → RECEIVE</p>
        <h2 id="journey-title">A short path to a useful handover.</h2>
        <ol className={styles.steps}>
          <li><h3>Name your hostname</h3><p>Tell us the exact hostname, your role and what prompted the request. No credentials or private files.</p></li>
          <li><h3>Confirm the scope</h3><p>We agree written authority, exclusions, delivery, retention and payment by email. An enquiry or payment alone does not authorise collection.</p></li>
          <li><h3>Receive your receipt</h3><p>Get the summary and evidence package by email, with priorities, unknowns and a practical next step.</p></li>
        </ol>
        <p className={styles.note}>Need wider coverage? <Link href="/catalog/offsec-external-exposure">Explore the €1,900 External Attack Surface Review</Link>, separately scoped and excluding VAT.</p>
      </section>

      <section id="request" className={`${styles.section} ${styles.request}`} aria-labelledby="request-title">
        <div><p className={styles.eyebrow}>04 / START HERE</p><h2 id="request-title">What hostname<br />do you want reviewed?</h2><p className={styles.intro}>In “What needs checking?”, include one public hostname, whether you own it or have permission, and why you want the receipt.</p><p className={styles.note}>This is an enquiry, not checkout. It does not start a check or take payment. We confirm the pilot’s fit and terms before work begins.</p><a className={styles.email} href={publicContactMailto("External Exposure Receipt — €99 pilot")}>Prefer email? Request the €99 pilot ↗</a></div>
        <div className={styles.form}><ContactForm compact landing defaultEnquiryPath="External Exposure Receipt" /></div>
      </section>
      <details className={styles.details}><summary>See the existing evidence sample</summary><p>The existing <Link href="/review/sample-cases/external-exposure-assessment">synthetic External Attack Surface Review package</Link> shows evidence references and limitations for the larger review. It is not a completed €99 receipt or customer evidence.</p></details>
    </div>
  </main>;
}
