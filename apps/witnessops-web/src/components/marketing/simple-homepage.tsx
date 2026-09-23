import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ContactForm } from "@/app/(marketing)/contact/contact-form";
import { buyerRequestHref, buyerPublicOfferRequestHref } from "@/lib/buyer-services";
import { INTERNET_FOOTPRINT_REVIEW_OFFER, PRIMARY_OFFER } from "@/lib/commercial-truth";
import styles from "./simple-homepage.module.css";

const footprintAmount = new Intl.NumberFormat("en-IE", { style: "currency", currency: INTERNET_FOOTPRINT_REVIEW_OFFER.price.currency, maximumFractionDigits: 0 }).format(Number(INTERNET_FOOTPRINT_REVIEW_OFFER.price.amount));
const agentRequest = buyerPublicOfferRequestHref("en", PRIMARY_OFFER.id);
function TextLink({ href, children, uiProofId }: { href: string; children: React.ReactNode; uiProofId?: string }) {
  return <Link className={styles.textLink} href={href} data-ui-proof-id={uiProofId}>{children}<ArrowUpRight size={15} strokeWidth={1.5} aria-hidden="true" /></Link>;
}

export function SimpleHomepage() {
  return <main id="main-content" tabIndex={-1} className={styles.page} data-page="home" data-home-direction="agents-act">
    <section className={styles.hero} data-ask-trigger-guard data-ui-proof-id="homepage-hero">
      <div className={styles.frame}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>REPEATABLE EVIDENCE. INDEPENDENT FINDINGS.</p>
          <h1 data-ui-proof-id="homepage-hero-headline">Agents act. WitnessOps reviews what yours are permitted to do.</h1>
          <p className={styles.lead} data-ui-proof-id="homepage-hero-body">AI agents can send, buy, write, delete and call other systems. WitnessOps reviews what yours are permitted to do and what happens when they do it — and reviews the ground they stand on, starting with what the internet can already see. Bounded scope, findings in writing, evidence attached.</p>
          <div className={styles.actions}>
            <Link className={styles.primary} href={agentRequest} data-ui-proof-id="homepage-hero-primary-cta">Scope an agent review</Link>
            <Link className={styles.secondary} href={buyerRequestHref("en")} data-ui-proof-id="homepage-footprint-cta">Start with the {footprintAmount} footprint review</Link>
          </div>
        </div>
      </div>
    </section>
    <section className={styles.offers} aria-labelledby="home-reviews-heading"><div className={styles.frame}>
      <h2 id="home-reviews-heading" className={styles.eyebrow}>Two reviews. Two fixed prices.</h2>
      <div className={styles.cards}>
        <article data-home-offer="agent-action"><h3>{PRIMARY_OFFER.name.en}</h3><p>What your AI agents are permitted to do, and what happens when they do it.</p><p className={styles.price}>{PRIMARY_OFFER.price.en}</p><p className={styles.timing}>{PRIMARY_OFFER.timing.en}</p><TextLink href={agentRequest}>Request the review</TextLink></article>
        <article data-home-offer="footprint"><h3>{INTERNET_FOOTPRINT_REVIEW_OFFER.name.en}</h3><p>What your organisation exposes to the open internet, found, evidenced and written up.</p><p className={styles.price}>{INTERNET_FOOTPRINT_REVIEW_OFFER.price.en}</p><TextLink href={buyerRequestHref("en")}>Request the review</TextLink></article>
      </div>
      <aside className={styles.freeCheck} aria-label="Free check — not a review"><div><h3>Free check</h3><p>A public hostname snapshot. No account needed. <strong>Not a review.</strong></p></div><TextLink href="/check">Start a free check</TextLink></aside>
      <div className={styles.sectionLinks}><TextLink href="/catalog">Explore the full catalogue</TextLink><TextLink href="/pricing">See all prices</TextLink><TextLink href="/early-access">How the app works</TextLink><TextLink href="/library" uiProofId="homepage-sample-review-cta">Explore sample work</TextLink></div>
      <div className={styles.receive}><h2 className={styles.eyebrow}>What you receive</h2><p>Written findings with the evidence attached, for a scope agreed before work starts. A request that exceeds the bounded review is narrowed or declined. An enquiry does not authorise collection or start a review.</p></div>
    </div></section>
    <section className={`${styles.section} ${styles.boundaries}`} aria-labelledby="home-limits-heading"><div className={styles.frame}>
      <div className={styles.sectionIntro}><p className={styles.eyebrow}>Clear boundaries</p><h2 id="home-limits-heading">Useful evidence.<br />Explicit limits.</h2><p>What the app can and cannot do.</p></div>
      <div className={styles.limits}>{[
        ["The app can", "Record one bounded check", "Keep the snapshot", "Compare saved checks", "Read and export reports", "Keep findings tied to their evidence"],
        ["The app cannot", "Monitor continuously", "Certify a system", "Replace a penetration test", "Treat missing data as a finding", "Make a universal verification claim"],
      ].map(([title, ...items]) => <div key={title}><h3>{title}</h3><ul>{items.map(item => <li key={item}>{item}</li>)}</ul></div>)}</div>
    </div></section>
    <section className={`${styles.section} ${styles.specimen}`} aria-labelledby="home-specimen-heading" data-agent-action-specimen>
      <div className={styles.frame}>
        <p className={styles.eyebrow}>What an Agent Action Security Review records</p>
        <h2 id="home-specimen-heading">One consequential action, taken apart.</h2>
        <div className={styles.labels}><span>Illustrative · shape only</span><span>Designed, not executed</span></div>
        <dl className={styles.specimenRows}>
          <div><dt>Consequential action</dt><dd><code>refund.issue</code> above a set amount, through a payments API — an illustrative action, not an executed one.<small>One action per review. Chosen with you before evidence rules are agreed.</small></dd></div>
          <div><dt>Executing identity</dt><dd><code>svc-agent-refunds@example.com</code> — a reserved example of the identity an agent would run as, not the one that configured it.</dd></div>
          <div><dt>Permission / authority boundary</dt><dd>The roles, scopes and approval steps that stand between an identity and an action, as configured.<small>Read from configuration under agreed evidence rules. Not assumed; none inspected here.</small></dd></div>
          <div><dt>Supporting evidence</dt><dd>Policy exports, the tool manifest, approval configuration and action logs for an agreed window — each attached to the claim it supports.<small>Collected only after evidence handling is agreed. No evidence was collected for this illustration.</small></dd></div>
          <div data-finding-slot="unfilled"><dt>Finding</dt><dd>A written statement of what an identity is permitted to do relative to an action, and what happens when it does it — with the evidence beside each claim.<small>Written after review. This specimen carries no finding.</small></dd></div>
          <div><dt>Explicit unknowns</dt><dd>What the evidence did not establish — for instance whether an action was exercised in the agreed window, or whether a human step exists outside the systems inspected.<small>Named in writing. These are example questions, not results.</small></dd></div>
        </dl>
        <p className={styles.note}>Illustrative. Reserved documentation names. No customer, execution, verification, authorisation failure or result is shown. This is the shape of a record, not a record.</p>
      </div>
    </section>
    <section id="enquiry" className={`${styles.section} ${styles.enquiry}`} aria-labelledby="home-enquiry-heading"><div className={styles.frame}>
      <div><p className={styles.eyebrow}>Ask an expert</p><h2 id="home-enquiry-heading">One question.<br />Non-secret details only.</h2><p>Tell us what needs to happen and by when. We will confirm whether the app, a named review, or neither is the right next step.</p><p className={styles.note}>For product or access questions, <Link href="/support">visit support</Link>.</p></div>
      <div className={styles.enquiryForm}><ContactForm compact landing /></div>
    </div></section>
  </main>;
}
