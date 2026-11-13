import Link from "next/link";
import { ContactForm } from "@/app/(marketing)/contact/contact-form";
import { BUYER_SERVICES, buyerServiceRequestHref, type BuyerLocale } from "@/lib/buyer-services";
import { PUBLIC_SALES_REVIEW_EMAIL, salesReviewMailto } from "@/lib/public-contact";
import { PUBLIC_AGENT_ACTION_REVIEW_ID, publicPaidReviews } from "@/lib/public-paid-reviews";
import { PriceText } from "@/lib/price-unit";
import { HOMEPAGE_CUT_COPY } from "./homepage-cut-copy";
import styles from "./simple-homepage.module.css";

function HeroActionVisual() {
  return <div className={styles.heroArt} aria-hidden="true">
    <svg viewBox="0 0 360 420" fill="none" focusable="false">
      <defs>
        <radialGradient id="hero-action-halo">
          <stop stopColor="currentColor" stopOpacity=".1" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hero-action-route" x1="80" y1="210" x2="306" y2="210" gradientUnits="userSpaceOnUse">
          <stop stopColor="currentColor" stopOpacity=".35" />
          <stop offset="1" stopColor="currentColor" />
        </linearGradient>
      </defs>
      <circle cx="180" cy="210" r="178" fill="url(#hero-action-halo)" />
      <g className={styles.heroArtGrid} strokeWidth="1">
        <circle cx="180" cy="210" r="154" strokeDasharray="2 9" />
        <path d="M26 210h308M180 56v308" />
        <path d="M71 101a154 154 0 0 1 218 0M71 319a154 154 0 0 0 218 0" />
        <path d="M209 80v260" strokeDasharray="4 7" />
      </g>
      <g className={styles.heroArtRoutes} strokeWidth="1.5">
        <path d="M126 194h26a28 28 0 0 0 28-28v-36a28 28 0 0 1 28-28h35" />
        <path d="M126 226h26a28 28 0 0 1 28 28v36a28 28 0 0 0 28 28h35" />
      </g>
      <path d="M126 210h147" stroke="url(#hero-action-route)" strokeWidth="2" />
      <g fill="currentColor">
        <circle cx="180" cy="160" r="3" />
        <circle cx="209" cy="210" r="4" />
        <circle cx="223" cy="318" r="3" />
      </g>
      <circle cx="82" cy="210" r="48" className={styles.heroArtCore} strokeWidth="1.5" />
      <circle cx="82" cy="210" r="58" stroke="currentColor" strokeOpacity=".2" />
      <path d="m63 196 15 14-15 14m26 0h16" className={styles.heroArtSymbol} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <g className={styles.heroArtNodes} strokeWidth="1.5">
        <rect x="243" y="70" width="64" height="64" rx="16" />
        <circle cx="302" cy="210" r="31" />
        <rect x="243" y="286" width="64" height="64" rx="16" />
      </g>
      <g className={styles.heroArtSymbol} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M266 86h12l7 7v25h-19V86Zm12 0v8h7m-14 7h9m-9 6h9" />
        <path d="M290 207a12 12 0 1 1 2 12m-2-21v10h10" />
        <circle cx="270" cy="313" r="6" />
        <path d="m274 318 11 11m-5-5 4-4" />
      </g>
    </svg>
  </div>;
}

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
        <HeroActionVisual />
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
