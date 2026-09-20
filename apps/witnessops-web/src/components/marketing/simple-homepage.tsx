import { getWorkspaceAppUrl } from "@/lib/workspace-access";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { ContactForm } from "@/app/(marketing)/contact/contact-form";
import { buyerServiceById, buyerServiceRequestHref } from "@/lib/buyer-services";
import styles from "./simple-homepage.module.css";

const reviews = ["bounded-workflow-review", "one-server-security-check", "external-exposure-assessment"] as const;
const situations = [
  ["Before launch", "Check public exposure before launch. For agent permissions or integration access, agree a separate expert review."],
  ["After a change", "Compare saved workspace checks. Read changes in the target separately from changes in what was checked."],
  ["After an agent action", "Reconstruct what was authorised, what ran, and what remains unresolved around one consequential action."],
  ["Before a customer security decision", "Share findings with their supporting evidence and limits. Review sensitive fields before sharing."],
];
const paths = [
  ["Check public exposure", "Run a free check of an authorized public hostname. Download the result without creating an account.", "/check", "Explore External Exposure"],
  ["Review a Linux server", "In an invited workspace, import a supported Local Audit package from one Linux host. Read findings alongside the source evidence.", "/early-access#early-access-choices", "See the import workflow"],
  ["Get expert help", "Agree a focused review of an agent action, a Linux server or a public-facing system.", "/catalog", "Explore expert help"],
];
function TextLink({ href, children, uiProofId }: { href: string; children: React.ReactNode; uiProofId?: string }) {
  return <Link className={styles.textLink} href={href} data-ui-proof-id={uiProofId}>{children}<ArrowUpRight size={15} strokeWidth={1.5} aria-hidden="true" /></Link>;
}

export function SimpleHomepage() {
  const signupUrl = getWorkspaceAppUrl("/signup");
  return <main id="main-content" tabIndex={-1} className={styles.page} data-page="home" data-home-direction="security-verification">
    <section className={styles.hero} data-ask-trigger-guard data-ui-proof-id="homepage-hero">
      <div className={styles.frame}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>REPEATABLE EVIDENCE. INDEPENDENT FINDINGS.</p>
          <h1 data-ui-proof-id="homepage-hero-headline">See what’s exposed.<br />Understand what changed.</h1>
          <p className={styles.lead} data-ui-proof-id="homepage-hero-body">Check a public hostname. See the findings, the evidence and what remains unknown. Compare saved checks in an invited workspace.</p>
          <div className={styles.actions}>
            <Link className={styles.primary} href="/check" data-ui-proof-id="homepage-hero-primary-cta">Start a free check</Link>
            {signupUrl && <TextLink href={signupUrl}>Create an account</TextLink>}
          </div>
          <p className={styles.note}>Free checks need no account. Verify your email to create your own workspace.</p>
        </div>

      </div>
    </section>
    <section className={styles.workflow} aria-labelledby="home-workflow-heading"><div className={styles.frame}>
      <div className={styles.workflowIntro}><p className={styles.eyebrow}>A result you can return to</p><h2 id="home-workflow-heading">One check.<br />A clearer picture.</h2><p>Start with a snapshot of public exposure. In an invited workspace, keep observations together and compare the next check.</p>
        <ol className={styles.steps}>
          <li><span>01</span><div><h3>Set the scope</h3><p>Choose one hostname you own or are authorized to check.</p></div></li>
          <li><span>02</span><div><h3>Read the result</h3><p>See recorded observations, supporting evidence and what remains unresolved.</p></div></li>
          <li><span>03</span><div><h3>Check again when it matters</h3><p>Compare saved workspace checks after a change. No monitoring runs automatically.</p></div></li>
        </ol><TextLink href="/docs/getting-started/results">Understand your results</TextLink>
      </div>
        <div className={styles.evidenceArtwork} aria-hidden="true">
          <Image src="/images/home/evidence-layers.webp" alt="" width={1536} height={1024} sizes="(max-width: 800px) calc(100vw - 40px), 600px" />
        </div>
    </div></section>
    <div className={styles.questions}><ul className={styles.frame}>{["What is exposed?", "What changed?", "What acted?", "What does the evidence show?"].map(q => <li key={q}>{q}</li>)}</ul></div>
    <section className={styles.section} aria-labelledby="home-services-heading"><div className={styles.frame}>
      <div className={styles.sectionIntro}><p className={styles.eyebrow}>Choose a starting point</p><h2 id="home-services-heading">One question.<br />A clear way forward.</h2>
      <p>Start with one system, action or result that matters. Keep evidence another party can inspect.</p></div>
      <div className={styles.cards}>{paths.map(([title, body, href, label], index) => <article key={title}><span className={styles.cardIndex}>0{index + 1}</span><h3>{title}</h3><p>{body}</p><TextLink href={href}>{label}</TextLink></article>)}</div>
      <div className={styles.sectionLinks}><TextLink href="/early-access">How the app works</TextLink><TextLink href="/library" uiProofId="homepage-sample-review-cta">Explore sample work</TextLink></div>
    </div></section>
    <section className={styles.section} aria-labelledby="home-decision-heading"><div className={`${styles.frame} ${styles.splitSection}`}>
      <div>
      <p className={styles.eyebrow}>When to start</p><h2 id="home-decision-heading">Before your next important change.</h2>
      <p>Before you grant access, ship a change or share a result, know what the evidence supports.</p>
      <TextLink href="#enquiry">Ask about your case</TextLink></div>
      <div className={styles.situations}>{situations.map(([title, body]) => <article key={title}><h3>{title}</h3><p>{body}</p></article>)}</div>
    </div></section>
    <section className={`${styles.section} ${styles.boundaries}`} aria-labelledby="home-limits-heading"><div className={styles.frame}>
      <div className={styles.sectionIntro}><p className={styles.eyebrow}>Clear boundaries</p><h2 id="home-limits-heading">Useful evidence.<br />Explicit limits.</h2><p>What the app can and cannot do.</p></div>
      <div className={styles.limits}>{[
        ["The app can", "Record one bounded check", "Keep the snapshot", "Compare saved checks", "Read and export reports", "Keep findings tied to their evidence"],
        ["The app cannot", "Monitor continuously", "Certify a system", "Replace a penetration test", "Treat missing data as a finding", "Make a universal verification claim"],
      ].map(([title, ...items]) => <div key={title}><h3>{title}</h3><ul>{items.map(item => <li key={item}>{item}</li>)}</ul></div>)}</div>
    </div></section>
    <section className={`${styles.section} ${styles.reviews}`} aria-labelledby="home-reviews-heading"><div className={styles.frame}>
      <div className={styles.sectionIntro}><p className={styles.eyebrow}>Expert help</p><h2 id="home-reviews-heading">When a check needs<br />a closer look.</h2>
      <p>Three named reviews. We agree scope, price and access before work begins. An enquiry does not authorize or start work.</p></div>
      <div className={styles.cards}>{reviews.map(id => { const service = buyerServiceById(id); return <article key={id}><h3>{service.name.en}</h3><p className={styles.price}>{service.price.en}</p><p>{service.cardSituation.en}</p><TextLink href={buyerServiceRequestHref("en", service)}>Ask about this review</TextLink></article>; })}</div>
      <TextLink href="/pricing">See all prices</TextLink>
    </div></section>
    <section id="enquiry" className={`${styles.section} ${styles.enquiry}`} aria-labelledby="home-enquiry-heading"><div className={styles.frame}>
      <div><p className={styles.eyebrow}>Ask an expert</p><h2 id="home-enquiry-heading">One question.<br />Non-secret details only.</h2><p>Tell us what needs to happen and by when. We will confirm whether the app, a named review, or neither is the right next step.</p><p className={styles.note}>For product or access questions, <Link href="/support">visit support</Link>.</p></div>
      <div className={styles.enquiryForm}><ContactForm compact landing /></div>
    </div></section>
  </main>;
}
