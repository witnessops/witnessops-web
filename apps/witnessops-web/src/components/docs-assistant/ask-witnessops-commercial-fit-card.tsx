import Link from "next/link";
import { BUYER_SERVICES, buyerServiceRequestHref } from "@/lib/buyer-services";
import type { AskLanguage } from "@/lib/docs-assistant/conversation-guidance";

import {
  EXTERNAL_ATTACK_SURFACE_OFFER,
  PUBLIC_AGENT_ACTION_OFFER,
} from "@/lib/commercial-truth";
import { isPublicPaidReviewId } from "@/lib/public-paid-reviews";
import type { AskWitnessOpsUiAnswer } from "./ask-witnessops-response";

interface Props {
  answer: AskWitnessOpsUiAnswer;
  compact?: boolean;
  showRequestAction?: boolean;
  language?: AskLanguage;
  onRequestScope?: () => void;
  onOfferSelected?: () => void;
}

const SPECIMEN_HREF =
  "/review/sample-cases/ai-agent-action-proof-run";

export function AskWitnessOpsCommercialFitCard({
  answer,
  compact = false,
  showRequestAction = true,
  language = "en",
  onRequestScope,
  onOfferSelected,
}: Props) {
  if (answer.schema === "witnessops.ask.generated-answer.v1") {
    const recommendation = answer.recommendation;
    if (!recommendation) return null;
    if (!isPublicPaidReviewId(recommendation.service_id)) return null;
    const service = BUYER_SERVICES.find((item) => item.id === recommendation.service_id);
    if (!service) return null;
    const pl = language === "pl";
    return (
      <section
        className={compact ? "mt-4 border-t border-surface-border pt-4" : "mt-5 rounded border border-surface-border p-4"}
        aria-label="Suggested service"
      >
        <p className="text-xs font-semibold text-brand-accent">{pl ? "Praktyczny następny krok" : "A practical next step"}</p>
        <h3 className="mt-2 text-base font-semibold text-text-primary">{service.name[language]}</h3>
        <p className="mt-2 text-sm font-semibold text-text-primary">{service.pricingVisible === false ? service.availability?.label[language] : service.price[language]}</p>
        <p className="mt-1 text-xs leading-relaxed text-text-muted">{service.timing[language]}</p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          {showRequestAction && (onRequestScope ? (
            <button type="button" onClick={() => { onOfferSelected?.(); onRequestScope(); }} data-ask-primary-cta
              className="inline-flex min-h-11 items-center justify-center rounded border border-surface-border px-3 py-2 text-sm font-semibold text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent">
              {pl ? "Przygotuj moją prośbę" : "Prepare my request"}
            </button>
          ) : (
            <Link href={buyerServiceRequestHref(language, service)} onClick={onOfferSelected} data-ask-primary-cta
              className="inline-flex min-h-11 items-center justify-center rounded border border-surface-border px-3 py-2 text-sm font-semibold text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent">
              {pl ? "Przygotuj moją prośbę" : "Prepare my request"}
            </Link>
          ))}
          {service.detailHref[language] ?? service.detailHref.en ? (
            <Link href={(service.detailHref[language] ?? service.detailHref.en)!} onClick={onOfferSelected}
              className="inline-flex min-h-11 items-center justify-center px-3 py-2 text-sm text-brand-accent underline underline-offset-4">
              {pl ? "Zobacz zakres" : "See scope"}
            </Link>
          ) : null}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-text-muted">{pl ? "Człowiek potwierdza zakres, cenę i dostępność przed rozpoczęciem pracy." : "A person confirms fit, scope, price and availability before work begins."}</p>
      </section>
    );
  }
  const fit = answer.commercial_fit;
  const offer = fit.offer;
  if (!offer || (fit.result !== "likely" && fit.result !== "needs_boundary")) {
    return null;
  }

  const likely = fit.result === "likely";
  const pl = language === "pl";
  const external = fit.offer_id === EXTERNAL_ATTACK_SURFACE_OFFER.id;
  const usesWorkflowRequestShape = /\bWorkflow [SML]\b/.test(
    answer.template.body,
  );
  const selectedService = fit.offer_id
    ? BUYER_SERVICES.find((service) => service.id === fit.offer_id)
    : undefined;
  const fitCheckHref = selectedService
    ? `${buyerServiceRequestHref(language, selectedService)}&source=ask&result=${fit.result}`
    : `${language === "pl" ? "/pl" : ""}/review/request?source=ask`;
  const heading = external
    ? likely
      ? pl
        ? "To jest zakres przeglądu ekspozycji zewnętrznej."
        : "This is the external review scope."
      : pl
        ? "Najpierw trzeba uzgodnić jeden system dostępny z internetu."
        : "This needs one agreed internet-facing system."
    : likely
      ? fit.intent === "offer"
        ? pl
          ? "To jest zakres przeglądu jednego działania."
          : "This is the current one-action review scope."
        : pl
          ? "To może być przegląd jednego działania."
          : "This is a one-action review candidate."
      : pl
        ? "Najpierw trzeba uzgodnić jedno istotne działanie."
        : "This needs one agreed consequential action.";
  const body = external
    ? pl
      ? `${EXTERNAL_ATTACK_SURFACE_OFFER.name.pl}: jeden autoryzowany system dostępny z internetu. Jedno sprawdzenie poprawek w ciągu 30 dni kalendarzowych od przekazania raportu. To nie jest test penetracyjny.`
      : `${EXTERNAL_ATTACK_SURFACE_OFFER.name.en}: one authorised internet-facing system. One focused retest within 30 calendar days of initial report handover. This is not a penetration test.`
    : likely
      ? pl
        ? `${PUBLIC_AGENT_ACTION_OFFER.name.pl}: jedno istotne działanie agenta lub automatyzacji. ${PUBLIC_AGENT_ACTION_OFFER.price.pl}.`
        : `${PUBLIC_AGENT_ACTION_OFFER.name.en}: one consequential agent or automation action. ${PUBLIC_AGENT_ACTION_OFFER.price.en}.`
      : pl
        ? "Może pasować, gdy jedno istotne działanie, upoważnienie i ścieżka dowodów są jasne."
        : "It may fit once one consequential action, its authority, and the evidence path are clear.";

  const cardClassName = compact
    ? "mt-4 border border-brand-accent/45 p-3"
    : "mt-5 border border-brand-accent/45 p-4";
  const primaryClassName =
    "inline-flex min-h-11 items-center justify-center rounded bg-brand-accent px-3 py-2 text-center text-xs font-semibold text-text-inverse transition-colors hover:bg-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent";

  return (
    <section className={cardClassName} aria-label="Commercial fit">
      <p
        className="text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-accent"
        style={{ fontFamily: "var(--font-mono)" }}
      >
        Commercial fit · {likely ? "likely" : "needs boundary"}
      </p>
      <h3 className="mt-2 text-base font-semibold text-text-primary">
        {heading}
      </h3>
      <p className="mt-2 text-xs leading-relaxed text-text-secondary">{body}</p>

      {fit.intent === "workflow" && (
        <p className="mt-3 text-xs leading-relaxed text-text-muted">
          Review focus: production authority, executing identity, effective
          permissions, tool access, execution path, blast radius, and evidence chain.
        </p>
      )}

      <p className="mt-3 border-l-2 border-surface-border pl-3 text-[11px] leading-relaxed text-text-muted">
        Fit signal only. No evidence was reviewed and no security, compliance,
        correctness, or action-outcome conclusion was made.
      </p>

      <div className="mt-4 border-t border-brand-accent/30 pt-3">
        <p className="text-xs font-semibold text-text-primary">{selectedService?.name[language] ?? offer.name}</p>
        <p className="mt-1 text-[11px] text-text-muted">
          {(selectedService?.price[language] ?? offer.price_label)} · {external
            ? (pl
              ? "Jeden autoryzowany system dostępny z internetu. Jedno sprawdzenie poprawek w ciągu 30 dni kalendarzowych od przekazania raportu."
              : offer.unit_label)
            : PUBLIC_AGENT_ACTION_OFFER.unit[language]}
        </p>
        <p className="mt-1 text-[11px] text-text-muted">
          {(external
            ? (pl ? "Najpierw niepoufna ocena. To nie jest test penetracyjny." : offer.fit_check_label)
            : PUBLIC_AGENT_ACTION_OFFER.fitCheck[language])} · {selectedService?.timing[language] ?? offer.delivery_label}
        </p>
        <div className="mt-3 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          {onRequestScope ? (
            <button
              type="button"
              onClick={() => { onOfferSelected?.(); onRequestScope(); }}
              className={primaryClassName}
              data-ask-primary-cta
            >
              {pl ? "Poproś o zakres tego przeglądu" : "Request scope for this action"}
            </button>
          ) : (
            <Link
              href={fitCheckHref}
              className={primaryClassName}
              data-ask-primary-cta
            >
              {pl ? "Poproś o zakres tego przeglądu" : "Request scope for this action"}
            </Link>
          )}

          {fit.matching_specimen_id === "ai-agent-action-proof-run" && (
            <Link
              href={SPECIMEN_HREF}
              className="inline-flex min-h-10 items-center justify-center px-2 py-2 text-center text-xs font-semibold text-brand-accent underline decoration-brand-accent/40 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
            >
              Inspect matching specimen
            </Link>
          )}
        </div>
      </div>

      {usesWorkflowRequestShape && answer.answer_mode === "ai_assisted" && (
        <p className="mt-3 text-[11px] leading-relaxed text-text-muted">
          Public Workflow labels are request-shape references, not the live
          offer. The paid scope shown here is the {offer.name}.
        </p>
      )}
    </section>
  );
}
