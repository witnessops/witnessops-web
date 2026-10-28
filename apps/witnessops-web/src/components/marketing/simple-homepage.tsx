import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ContactForm } from "@/app/(marketing)/contact/contact-form";
import { BUYER_SERVICES, buyerServiceRequestHref } from "@/lib/buyer-services";
import { PUBLIC_SALES_REVIEW_EMAIL, salesReviewMailto } from "@/lib/public-contact";
import { PUBLIC_AGENT_ACTION_REVIEW_ID, publicPaidReviews } from "@/lib/public-paid-reviews";
import { PriceText } from "@/lib/price-unit";
import { HOMEPAGE_TWO_OFFER_COPY } from "./homepage-two-offer-copy";
import styles from "./simple-homepage.module.css";

const text = HOMEPAGE_TWO_OFFER_COPY.en;

function TextLink({ href, children, uiProofId }: { href: string; children: React.ReactNode; uiProofId?: string }) {
  return <Link className={styles.textLink} href={href} data-ui-proof-id={uiProofId}>{children}<ArrowUpRight size={15} strokeWidth={1.5} aria-hidden="true" /></Link>;
}

const IS = [
  ["One bounded review", "One named consequential agent or automation action."],
  ["Written findings tied to evidence", "Each finding sits beside the evidence that supports it."],
  ["Explicit unknowns", "What the evidence did not establish is named in writing."],
  ["A report you keep", "The written report and evidence are handed over at readout."],
] as const;

const ISNT = [
  ["Not execution", "The review does not perform the agent action."],
  ["Not a production change", "We read, inspect, reconstruct and report."],
  ["Not certification", "No badge, seal or claim that an agent is safe is issued."],
  ["Not remediation or monitoring", "Recommendations are prioritised; fixing and continuous monitoring stay outside this review."],
] as const;

const STEPS = [
  ["01", "Agree the boundary", "Scope, exclusions, price, authority and evidence handling are agreed before work starts."],
  ["02", "Start without secrets", "The initial enquiry uses a short, non-secret description. Do not send credentials or production evidence."],
  ["03", "Understand the limits", "The report distinguishes supported findings, unavailable evidence and questions the review could not answer."],
] as const;

const PRINCIPLES = [
  ["You keep the record", "Findings and evidence are handed over, not held behind a login."],
  ["Others can check it", "Each claim cites its evidence, so a third party can follow it."],
  ["Limits are written down", "Out of scope and unknown are stated, not implied."],
  ["Scope is authorised", "Work starts from a signed statement of work and written authority."],
] as const;

export function SimpleHomepage() {
  const services = publicPaidReviews(BUYER_SERVICES);
  return <main id="main-content" tabIndex={-1} className={styles.page} data-page="home" data-home-direction="agents-act">
    <section className={styles.hero} data-ask-trigger-guard data-ui-proof-id="homepage-hero">
      {process.env.NEXT_PUBLIC_BRAND_WATERMARK === "1" ? (
        <div className={styles.watermark} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/witnessops-logo-system-v1/svg/witnessops-mark-black.svg" alt="" className="wo-watermark wo-watermark--black" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/witnessops-logo-system-v1/svg/witnessops-mark-white.svg" alt="" className="wo-watermark wo-watermark--white" />
        </div>
      ) : null}
      <div className={`${styles.frame} ${styles.heroFrame} crop-frame`}>
        <div className={styles.heroCopy}>
          <span className={styles.rule} aria-hidden="true" />
          <p className={styles.eyebrow}>{text.offerName}</p>
          <h1 data-ui-proof-id="homepage-hero-headline">{text.headline}</h1>
        </div>
        <div className={styles.split}>
          <p className={styles.lead} data-ui-proof-id="homepage-hero-body">{text.support}</p>
          <div>
            <p className={styles.subline}>{text.aiPrice}. {text.timing}</p>
            <div className={styles.actions}>
              {services.filter((service) => service.id === PUBLIC_AGENT_ACTION_REVIEW_ID).map((service) => (
                <Link key={service.id} className={styles.primary} href={buyerServiceRequestHref("en", service)} data-ui-proof-id="homepage-hero-primary-cta">{text.aiCta}</Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
    <nav className={styles.linkRow} aria-label="Review paths">
      <div className={styles.frame}>
        <div className={styles.sectionLinks}>
          <TextLink href="/reviews">See the review</TextLink>
          <TextLink href="/pricing">See the price</TextLink>
          <TextLink href="/review/sample-cases" uiProofId="homepage-sample-review-cta">Explore sample work</TextLink>
        </div>
      </div>
    </nav>
    <section className={`${styles.section} ${styles.offers}`} aria-label="Public reviews"><div className={styles.frame}>
      <span className={styles.rule} aria-hidden="true" />
      <p className={styles.eyebrow}>{text.reviewsEyebrow}</p>
      <h2>{text.reviewsTitle}</h2>
      <p>{text.aiWhoFor}</p>
      <p>{text.reviewsBody}</p>
      <div className={styles.cards}>
        {services.map((service) => (
          <article key={service.id} className="crop" data-home-offer={service.id}>
            <p className={styles.eyebrow}>Review one agent action</p>
            <h3>{service.name.en}</h3>
            <p className={styles.price}><PriceText text={text.aiPrice} /></p>
            <p>{text.aiDescription}</p>
            <p>{text.aiWhoFor}</p>
            <ul>{text.deliverables.map((item) => <li key={item}>{item}</li>)}</ul>
            <p className={styles.scope}>{text.aiScopeNote}</p>
            <p className={styles.timing}>{service.timing.en}</p>
            <TextLink href={buyerServiceRequestHref("en", service)}>{text.aiCta}</TextLink>
          </article>
        ))}
      </div>
      <div className={styles.receive}><h2 className={styles.eyebrow}>What you receive</h2><p>An action map, findings linked to evidence, prioritised recommendations, documented unknowns, a written report and a readout. A request that exceeds one consequential action is narrowed or declined. An enquiry does not authorise collection or start a review.</p></div>
    </div></section>
    <section className={`${styles.section} ${styles.specimen}`} aria-labelledby="home-specimen-heading" data-agent-action-specimen>
      <div className={styles.frame}>
        <span className={styles.rule} aria-hidden="true" />
        <p className={styles.eyebrow}>Historical synthetic one-action example</p>
        <h2 id="home-specimen-heading">{text.evidenceHeadline}</h2>
        <div className={styles.labels}><span>Illustrative · shape only</span><span>Designed, not executed</span></div>
        <dl className={`${styles.specimenRows} crop`}>
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
    <section className={styles.section} aria-labelledby="home-process-heading"><div className={styles.frame}>
      <span className={styles.rule} aria-hidden="true" />
      <p className={styles.eyebrow}>How a review works</p>
      <h2 id="home-process-heading">Scope before work. Evidence beside findings.</h2>
      <ol className={styles.steps}>
        {STEPS.map(([index, title, body]) => <li key={index}><span>{index}</span><h3>{title}</h3><p>{body}</p></li>)}
      </ol>
      <p className={styles.note}><Link href="/reviews/agent-action-security-review">See the review scope</Link></p>
    </div></section>
    <section className={`${styles.section} ${styles.boundaries}`} aria-labelledby="home-limits-heading"><div className={styles.frame}>
      <span className={styles.rule} aria-hidden="true" />
      <p className={styles.eyebrow}>What this is · what this isn’t</p>
      <h2 id="home-limits-heading">Useful evidence. Explicit limits.</h2>
      <div className={styles.limits}>
        <div><h3>What this is</h3><ul>{IS.map(([title, body]) => <li key={title}><strong>{title}</strong> {body}</li>)}</ul></div>
        <div><h3>What this isn’t</h3><ul>{ISNT.map(([title, body]) => <li key={title}><strong>{title}</strong> {body}</li>)}</ul></div>
      </div>
    </div></section>
    <section className={styles.section} aria-label="What sovereign means here"><div className={styles.frame}>
      <span className={styles.rule} aria-hidden="true" />
      <p className={styles.eyebrow}>What sovereign means here</p>
      <ul className={styles.principles}>{PRINCIPLES.map(([title, body]) => <li key={title}><h3>{title}</h3><p>{body}</p></li>)}</ul>
    </div></section>
    <section id="enquiry" className={`${styles.section} ${styles.enquiry}`} aria-labelledby="home-enquiry-heading"><div className={styles.frame}>
      <div><span className={styles.rule} aria-hidden="true" /><p className={styles.eyebrow}>Request the review</p><h2 id="home-enquiry-heading">Start with a non-secret fit check.</h2><p>Name the consequential action, the systems involved and the decision deadline. Do not include secrets or production evidence.</p><p className={styles.contactLine} data-homepage-contact>{text.contactLead} <a href={salesReviewMailto()}>{PUBLIC_SALES_REVIEW_EMAIL}</a></p><p className={styles.note}>For product or access questions, <Link href="/support">visit support</Link>.</p></div>
      <div className={`${styles.enquiryForm} crop`}><ContactForm compact landing /></div>
    </div></section>
  </main>;
}
