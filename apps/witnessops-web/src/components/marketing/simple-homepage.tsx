import Image from "next/image";
import Link from "next/link";
import { ContactForm } from "@/app/(marketing)/contact/contact-form";
import { buyerServiceById, buyerServiceRequestHref } from "@/lib/buyer-services";
import styles from "./simple-homepage.module.css";

const reviews = ["bounded-workflow-review", "one-server-security-check", "external-exposure-assessment"] as const;
const situations = [
  ["Before launch", "Record what is currently exposed before a system, agent or integration is given new access."],
  ["After a change", "Compare a later snapshot with the previous one. Environment change is not the same as coverage change."],
  ["After an agent action", "Reconstruct what was authorised, what ran, and what remains unresolved around one consequential action."],
  ["Before a customer security decision", "A portable pack is easier to inspect than a remembered walkthrough. Review sensitive fields before sharing."],
];
const paths = [
  ["Check public exposure", "Run a bounded hostname observation. Keep the snapshot, then compare a later result.", "/check", "Explore External Exposure"],
  ["Review a Linux server", "Import evidence from one Linux host. Findings stay tied to the source you provided.", "/early-access#early-access-choices", "See the import workflow"],
  ["Get expert help", "Named reviews when a check is not enough: agent action, one server, or external surface.", "/catalog", "Explore expert help"],
];
function TextLink({ href, children, uiProofId }: { href: string; children: React.ReactNode; uiProofId?: string }) {
  return <Link className={styles.textLink} href={href} data-ui-proof-id={uiProofId}>{children}<span aria-hidden="true">↗</span></Link>;
}

export function SimpleHomepage() {
  return <main id="main-content" tabIndex={-1} className={styles.page} data-page="home" data-home-direction="security-verification">
    <section className={styles.hero} data-ask-trigger-guard data-ui-proof-id="homepage-hero">
      <div className={styles.frame}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>REPEATABLE EVIDENCE. INDEPENDENT FINDINGS.</p>
          <h1 data-ui-proof-id="homepage-hero-headline">Start with a question.</h1>
          <p className={styles.lead} data-ui-proof-id="homepage-hero-body">Verify what is exposed, what changed, what acted, and what the evidence actually supports. Start with one question. Keep the snapshot. Compare it later.</p>
          <div className={styles.actions}>
            <Link className={styles.primary} href="/check" data-ui-proof-id="homepage-hero-primary-cta">Start a free check</Link>
            <TextLink href="https://app.witnessops.com/signup">Create an account</TextLink>
            <TextLink href="#sample-finding" uiProofId="homepage-sample-review-cta">See a sample finding</TextLink>
          </div>
          <p className={styles.note}>The free check needs no account. Create an account to sign in; workspace access currently requires an invitation.</p>
        </div>
        <figure className={styles.finding} id="sample-finding" data-review-finding aria-label="Fictional example finding">
          <div className={styles.findingImage}><Image src="/images/home/example-finding.jpg" alt="" width={480} height={220} priority /></div>
          <div className={styles.findingBody}>
            <h2>What changed on example.com before the release?</h2>
            <div className={styles.observation}>
              <div className={styles.observationHeading}><div><h3>DNS A target</h3><p>DNS lookup · A</p></div><span className={styles.badge}>Environment</span></div>
              <dl><div><dt>Expected</dt><dd>93.184.216.34<small>prior snapshot</small></dd></div><div><dt>Observed</dt><dd>23.215.0.136</dd></div></dl>
              <p>Environment change. Open both snapshots before treating this as unexpected.</p>
            </div>
            <figcaption>Fictional example. No system was tested.</figcaption>
          </div>
        </figure>
      </div>
    </section>
    <div className={styles.questions}><ul className={styles.frame}>{["What is exposed?", "What changed?", "What acted?", "What is evidenced?"].map(q => <li key={q}>{q}</li>)}</ul></div>
    <section className={styles.section} aria-labelledby="home-services-heading"><div className={styles.frame}>
      <p className={styles.eyebrow}>Start with one question.</p><h2 id="home-services-heading">Start with one system, action or result that matters.</h2>
      <p>Start before launch, after a change or when a result needs evidence another party can inspect.</p>
      <div className={styles.cards}>{paths.map(([title, body, href, label]) => <article key={title}><h3>{title}</h3><p>{body}</p><TextLink href={href}>{label}</TextLink></article>)}</div>
      <p className={styles.scope}>Not sure what needs checking? <TextLink href="/docs/assistant">Ask about scope</TextLink></p>
      <TextLink href="/early-access">How the app works</TextLink>
    </div></section>
    <section className={styles.section} aria-labelledby="home-decision-heading"><div className={styles.frame}>
      <p className={styles.eyebrow}>When to start</p><h2 id="home-decision-heading">Before the next consequential step.</h2>
      <div className={`${styles.cards} ${styles.twoColumns}`}>{situations.map(([title, body]) => <article key={title}><h3>{title}</h3><p>{body}</p></article>)}</div>
      <p>Tell us what needs to happen and by when. We will confirm whether the app, a named review, or neither is the right next step.</p>
      <TextLink href="#enquiry">Ask about your case</TextLink>
    </div></section>
    <section className={styles.section} aria-labelledby="home-limits-heading"><div className={styles.frame}>
      <p className={styles.eyebrow}>Limits</p><h2 id="home-limits-heading">What the app can and cannot do</h2>
      <div className={styles.limits}>{[
        ["The app can", "Record one bounded check", "Keep the snapshot", "Compare saved checks", "Export a portable pack", "Keep findings tied to their evidence"],
        ["The app cannot", "Monitor continuously", "Certify a system", "Replace a penetration test", "Treat missing data as a finding", "Make a universal verification claim"],
      ].map(([title, ...items]) => <div key={title}><h3>{title}</h3><ul>{items.map(item => <li key={item}>{item}</li>)}</ul></div>)}</div>
    </div></section>
    <section className={styles.section} aria-labelledby="home-reviews-heading"><div className={styles.frame}>
      <p className={styles.eyebrow}>Expert help</p><h2 id="home-reviews-heading">Three named reviews</h2>
      <p>Human support does not automatically authorize or execute a scan, review or fix. We agree scope, price and access before work begins.</p>
      <div className={styles.cards}>{reviews.map(id => { const service = buyerServiceById(id); return <article key={id}><h3>{service.name.en}</h3><p className={styles.price}>{service.price.en}</p><p>{service.cardSituation.en}</p><TextLink href={buyerServiceRequestHref("en", service)}>Ask about this review</TextLink></article>; })}</div>
      <TextLink href="/pricing">See all prices</TextLink>
    </div></section>
    <section id="enquiry" className={`${styles.section} ${styles.enquiry}`} aria-labelledby="home-enquiry-heading"><div className={styles.frame}>
      <div><p className={styles.eyebrow}>Ask about your case</p><h2 id="home-enquiry-heading">One question.<br />Non-secret details only.</h2><p>Tell us what needs to happen and by when. We will confirm whether the app, a named review, or neither is the right next step.</p><p className={styles.note}>For product or access questions, <Link href="/support">get support help</Link>.</p></div>
      <div className={styles.enquiryForm}><ContactForm compact landing /></div>
    </div></section>
  </main>;
}
