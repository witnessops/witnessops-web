import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { BUYER_SERVICES, buyerRequestHref, buyerServiceRequestHref, type BuyerLocale } from "@/lib/buyer-services";
import { publicPaidReviews } from "@/lib/public-paid-reviews";
import styles from "./simple-homepage.module.css";

const copy = {
  en: {
    eyebrow: "FOCUSED SECURITY REVIEWS. EVIDENCE ATTACHED.",
    headline: "Understand what your agents can do and what your systems expose.",
    body: "WitnessOps provides focused security reviews for AI agents and internet-facing systems. Get written findings, evidence you can inspect, and clear priorities for what to do next.",
    aiCta: "Scope an AI review", externalCta: "Scope an external review",
    offers: "Two reviews. Scope before work.",
    ai: "One agreed device, one selected connection and one consequential action. Manual, read-only inspection—not execution or repair.",
    external: "One authorised internet-facing system, inspected from the outside with approved low-impact checks. Not a penetration test.",
    details: "See scope and deliverables", compare: "Compare scopes and prices",
    free: "Free hostname check", freeBody: "A public hostname snapshot. No account needed.",
    freeBoundary: "Not a review.", freeCta: "Start a free check",
    receive: "What you receive", receiveBody: "Written findings with their supporting evidence, practical priorities and explicit unknowns. Scope and evidence handling are agreed before work begins. An enquiry does not authorise collection or start a review.",
    evidence: "Inspect the shape of the evidence", evidenceBody: "Examples explain the deliverables; they do not stand in for customer results or establish that a system is secure.",
    aiSample: "Historical synthetic one-action example", aiSampleNote: "Not a complete specimen of the current AI Tools & Access Review.",
    externalSample: "Synthetic external-review example", externalSampleNote: "Illustrative package, not a customer engagement.",
    limitsTitle: "Useful findings. Explicit limits.", limits: "Neither review certifies safety or compliance. Missing evidence remains a gap, not a successful check. A receipt or verifier supports only its named evidence and claims.",
    enquiry: "Which review fits your decision?", enquiryBody: "Start with a short, non-secret description of the agent or internet-facing system and the decision you need to make. We will confirm fit, scope, price and timing before work begins.",
    enquiryCta: "Choose a review or ask about fit", support: "For product or access questions, visit support.",
  },
  pl: {
    eyebrow: "KONKRETNY ZAKRES. USTALENIA ZE ŹRÓDŁAMI.",
    headline: "Zrozum, co mogą zrobić Twoje agenty i co ujawniają Twoje systemy.",
    body: "WitnessOps prowadzi przeglądy bezpieczeństwa agentów AI i systemów dostępnych z internetu. Otrzymasz pisemne ustalenia, materiały do sprawdzenia i jasne priorytety dalszych działań.",
    aiCta: "Omów przegląd agenta AI", externalCta: "Omów przegląd ekspozycji",
    offers: "Dwa przeglądy. Najpierw uzgodniony zakres.",
    ai: "Jedno uzgodnione urządzenie, jedno wybrane połączenie i jedno istotne działanie. Ręczna inspekcja tylko do odczytu—bez wykonania działania i napraw.",
    external: "Jeden autoryzowany system dostępny z internetu, sprawdzany od zewnątrz uzgodnionymi metodami o niskim wpływie. To nie jest test penetracyjny.",
    details: "Zobacz zakres i wyniki", compare: "Porównaj zakres i cenę",
    free: "Bezpłatne sprawdzenie hosta", freeBody: "Publiczny obraz jednego hosta. Bez konta.",
    freeBoundary: "To nie jest przegląd.", freeCta: "Sprawdź host bezpłatnie",
    receive: "Co otrzymasz", receiveBody: "Pisemne ustalenia wraz ze źródłami, praktyczne priorytety i jawne niewiadome. Zakres i zasady obsługi materiałów uzgadniamy przed pracą. Zgłoszenie nie upoważnia do zbierania danych ani nie rozpoczyna przeglądu.",
    evidence: "Zobacz, jak przedstawiamy materiały", evidenceBody: "Przykłady objaśniają wyniki pracy. Nie zastępują rzeczywistych wyników klienta i nie dowodzą bezpieczeństwa systemu.",
    aiSample: "Historyczny syntetyczny przykład jednego działania", aiSampleNote: "To nie jest pełny przykład obecnego przeglądu narzędzi i dostępu agenta AI.",
    externalSample: "Syntetyczny przykład przeglądu ekspozycji", externalSampleNote: "Pakiet ilustracyjny, nie realizacja dla klienta.",
    limitsTitle: "Przydatne ustalenia. Jawne ograniczenia.", limits: "Żaden przegląd nie certyfikuje bezpieczeństwa ani zgodności. Brak materiałów pozostaje luką, nie pozytywnym wynikiem. Zapis lub weryfikator wspiera wyłącznie wskazane materiały i twierdzenia.",
    enquiry: "Który przegląd pomoże w Twojej decyzji?", enquiryBody: "Zacznij od krótkiego, niepoufnego opisu agenta lub systemu dostępnego z internetu oraz decyzji, którą musisz podjąć. Przed pracą potwierdzimy dopasowanie, zakres, cenę i termin.",
    enquiryCta: "Wybierz przegląd lub zapytaj o dopasowanie", support: "Pytania o produkt lub dostęp? Przejdź do wsparcia.",
  },
} as const;

function TextLink({ href, children, uiProofId }: { href: string; children: React.ReactNode; uiProofId?: string }) {
  return <Link className={styles.textLink} href={href} data-ui-proof-id={uiProofId}>{children}<ArrowUpRight size={15} strokeWidth={1.5} aria-hidden="true" /></Link>;
}

export function SimpleHomepage({ locale = "en" }: { locale?: BuyerLocale }) {
  const text = copy[locale];
  const services = publicPaidReviews(BUYER_SERVICES);
  const [ai, external] = services;
  if (!ai || !external) throw new Error("Two public paid reviews are required");
  const prefix = locale === "pl" ? "/pl" : "";
  return <main id="main-content" tabIndex={-1} className={styles.page} data-page="home" data-home-direction="two-offer-v1">
    <section className={styles.hero} data-ask-trigger-guard data-ui-proof-id="homepage-hero"><div className={styles.frame}><div className={styles.heroCopy}>
      <p className={styles.eyebrow}>{text.eyebrow}</p>
      <h1 data-ui-proof-id="homepage-hero-headline">{text.headline}</h1>
      <p className={styles.lead} data-ui-proof-id="homepage-hero-body">{text.body}</p>
      <div className={styles.actions}>
        <Link className={styles.primary} href={buyerServiceRequestHref(locale, ai)} data-ui-proof-id="homepage-hero-primary-cta">{text.aiCta}</Link>
        <Link className={styles.secondary} href={buyerServiceRequestHref(locale, external)} data-ui-proof-id="homepage-external-cta">{text.externalCta}</Link>
      </div>
    </div></div></section>
    <section className={styles.offers} aria-labelledby="home-reviews-heading"><div className={styles.frame}>
      <h2 id="home-reviews-heading" className={styles.eyebrow}>{text.offers}</h2>
      <div className={styles.cards}>{services.map((service, index) => <article key={service.id} data-home-offer={index === 0 ? "agent-tools-access" : "external-exposure"}>
        <h3>{service.name[locale]}</h3><p>{index === 0 ? text.ai : text.external}</p>
        <p className={styles.price}>{service.price[locale]}</p><p className={styles.timing}>{service.timing[locale]}</p>
        <TextLink href={buyerServiceRequestHref(locale, service)}>{index === 0 ? text.aiCta : text.externalCta}</TextLink>
        {service.detailHref[locale] ? <TextLink href={service.detailHref[locale]!}>{text.details}</TextLink> : null}
      </article>)}</div>
      <aside className={styles.freeCheck} aria-label={text.free}><div><h3>{text.free}</h3><p>{text.freeBody} <strong>{text.freeBoundary}</strong></p></div><TextLink href="/check">{text.freeCta}</TextLink></aside>
      <div className={styles.sectionLinks}><TextLink href={`${prefix}/catalog`}>{text.compare}</TextLink></div>
      <div className={styles.receive}><h2 className={styles.eyebrow}>{text.receive}</h2><p>{text.receiveBody}</p></div>
    </div></section>
    <section className={`${styles.section} ${styles.specimen}`} aria-labelledby="home-specimen-heading"><div className={styles.frame}>
      <h2 id="home-specimen-heading">{text.evidence}</h2><p>{text.evidenceBody}</p>
      <div className={styles.cards}>
        <article><TextLink href="/review/sample-cases/ai-agent-action-proof-run" uiProofId="homepage-sample-review-cta">{text.aiSample}</TextLink><p className={styles.note}>{text.aiSampleNote}</p></article>
        <article><TextLink href="/review/sample-cases/external-exposure-assessment">{text.externalSample}</TextLink><p className={styles.note}>{text.externalSampleNote}</p></article>
      </div>
    </div></section>
    <section className={`${styles.section} ${styles.boundaries}`} aria-labelledby="home-limits-heading"><div className={styles.frame}>
      <h2 id="home-limits-heading">{text.limitsTitle}</h2><p>{text.limits}</p>
    </div></section>
    <section id="enquiry" className={`${styles.section} ${styles.enquiry}`} aria-labelledby="home-enquiry-heading"><div className={styles.frame}>
      <div><h2 id="home-enquiry-heading">{text.enquiry}</h2><p>{text.enquiryBody}</p><TextLink href={buyerRequestHref(locale)}>{text.enquiryCta}</TextLink><p className={styles.note}><Link href={`${prefix}/support`}>{text.support}</Link></p></div>
    </div></section>
  </main>;
}
