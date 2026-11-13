import Link from "next/link";
import { ContactForm } from "@/app/(marketing)/contact/contact-form";
import { BUYER_SERVICES, buyerServiceRequestHref, type BuyerLocale } from "@/lib/buyer-services";
import { PUBLIC_SALES_REVIEW_EMAIL, salesReviewMailto } from "@/lib/public-contact";
import { PUBLIC_AGENT_ACTION_REVIEW_ID, publicPaidReviews } from "@/lib/public-paid-reviews";
import { PriceText } from "@/lib/price-unit";
import { HOMEPAGE_CUT_COPY } from "./homepage-cut-copy";
import { HeroActionVisual } from "./hero-action-visual";
import styles from "./simple-homepage.module.css";

/**
 * Five sections, each answering one question (Design 2026-11-13):
 * hero, four ways, what you get, how it works, enquiry.
 */
export function SimpleHomepage({ locale = "en" }: { locale?: BuyerLocale }) {
  const text = HOMEPAGE_CUT_COPY[locale];
  const services = publicPaidReviews(BUYER_SERVICES).filter((service) => service.id === PUBLIC_AGENT_ACTION_REVIEW_ID);
  return <main id="main-content" tabIndex={-1} className={styles.page} data-page="home" data-home-direction="agents-act" data-home-cut="5s-20261113">
    <section className={styles.hero} data-ui-proof-id="homepage-hero" aria-labelledby="home-hero-heading">
      {process.env.NEXT_PUBLIC_BRAND_WATERMARK === "1" ? (
        <div className={styles.watermark} aria-hidden="true">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/witnessops-logo-system-v1/svg/witnessops-mark-black.svg" alt="" className="wo-watermark wo-watermark--black" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/witnessops-logo-system-v1/svg/witnessops-mark-white.svg" alt="" className="wo-watermark wo-watermark--white" />
        </div>
      ) : null}
      <div className={`${styles.frame} ${styles.heroFrame}`}>
        <div className={styles.heroWords}>
          <div className={styles.heroCopy}>
            <span className={styles.rule} aria-hidden="true" />
            <p className={styles.eyebrow}>{text.offerName}</p>
            <h1 id="home-hero-heading" data-ui-proof-id="homepage-hero-headline">
              <span className="sr-only">{text.headline}</span>
              <span aria-hidden="true" className={styles.heroVisualDesktop}>{text.headlineDesktopVisual ?? text.headline}</span>
              <span aria-hidden="true" className={styles.heroVisualMobile}>{text.headlineMobile}</span>
            </h1>
          </div>
          <div className={styles.split}>
            <div>
              <p className={`${styles.lead} ${styles.supportDesktop}`} data-ui-proof-id="homepage-hero-body">{text.sub}</p>
              <p className={`${styles.lead} ${styles.supportCompact}`} data-ui-proof-id="homepage-hero-mobile-body">{text.subCompact}</p>
            </div>
            <div>
              <div className={styles.actions}>
                {services.map((service) => (
                  <Link key={service.id} className={styles.primary} href={buyerServiceRequestHref(locale, service)} data-ui-proof-id="homepage-hero-primary-cta">{text.cta}</Link>
                ))}
              </div>
              <Link className={styles.exampleLink} href={text.exampleHref} data-ui-proof-id="homepage-sample-review-cta">{text.exampleLabel}</Link>
              <p className={styles.heroPrice} data-home-fee><PriceText text={text.fee} /></p>
            </div>
          </div>
        </div>
        <HeroActionVisual locale={locale} />
      </div>
    </section>
    <section className={styles.section} aria-labelledby="home-four-ways-heading">
      <div className={styles.frame}>
        <span className={styles.rule} aria-hidden="true" />
        <p className={styles.eyebrow}>{text.fourWaysEyebrow}</p>
        <h2 id="home-four-ways-heading">{text.fourWaysTitle}</h2>
        <div className={styles.limits}>
          {text.fourWays.map(([title, body]) => (
            <article key={title}>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
        <p className={styles.note}>{text.fourWaysNote}</p>
      </div>
    </section>
    <section className={styles.section} aria-labelledby="home-get-heading" data-home-get>
      <div className={styles.frame}>
        <span className={styles.rule} aria-hidden="true" />
        <p className={styles.eyebrow}>{text.getEyebrow}</p>
        <h2 id="home-get-heading">{text.getTitle}</h2>
        <ul className={styles.principles}>{text.get.map(([title, body]) => <li key={title}><h3>{title}</h3><p>{body}</p></li>)}</ul>
      </div>
    </section>
    <section className={styles.section} aria-labelledby="home-process-heading"><div className={styles.frame}>
      <span className={styles.rule} aria-hidden="true" />
      <p className={styles.eyebrow}>{text.howEyebrow}</p>
      <h2 id="home-process-heading">{text.howTitle}</h2>
      <ol className={styles.steps}>
        {text.steps.map(([index, title, body]) => <li key={index}><span>{index}</span><h3>{title}</h3><p>{body}</p></li>)}
      </ol>
      <p className={styles.note} data-home-scope-note>{text.howNote} <Link className={styles.inlineTarget} href={text.scopeHref}>{text.scopeLabel}</Link></p>
    </div></section>
    <section id="enquiry" className={`${styles.section} ${styles.enquiry}`} aria-labelledby="home-enquiry-heading"><div className={styles.frame}>
      <div><span className={styles.rule} aria-hidden="true" /><p className={styles.eyebrow}>{text.enquiryEyebrow}</p><h2 id="home-enquiry-heading">{text.enquiryTitle}</h2><p>{text.enquiryLead}</p><p className={styles.contactLine} data-homepage-contact>{text.contactLead} <a className={styles.inlineTarget} href={salesReviewMailto()}>{PUBLIC_SALES_REVIEW_EMAIL}</a></p></div>
      <div className={styles.enquiryForm}><ContactForm locale={locale} compact landing /></div>
    </div></section>
  </main>;
}
