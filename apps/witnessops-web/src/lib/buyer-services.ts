import {
  EXTERNAL_ATTACK_SURFACE_OFFER,
  PRIMARY_OFFER,
  AUTOMATION_REPAIR_OFFER,
} from "@/lib/commercial-truth";
import { publicB2bPrice } from "@/lib/commercial-price";

export type BuyerLocale = "en" | "pl";

type LocalizedText = Record<BuyerLocale, string>;

export type BuyerService = {
  id:
    | "automation-repair-handover"
    | "customer-security-review-sprint"
    | "bounded-workflow-review"
    | "one-server-security-check"
    | "external-exposure-assessment"
    | "launch-readiness-check"
    | "key-access-custody-review"
    | "incident-readiness-review"
    | "professional-public-footprint-audit";
  productId?: string;
  homepageFeatured?: boolean;
  commercialRole?: "primary" | "secondary";
  pricingVisible?: boolean;
  availability?: {
    status: "available_by_request";
    label: LocalizedText;
  };
  requestCta?: LocalizedText;
  commercialContract: {
    price: string;
    timing: string;
  };
  name: LocalizedText;
  situation: LocalizedText;
  /** Short situation line for homepage cards (when different from full catalogue situation). */
  cardSituation: LocalizedText;
  result: LocalizedText;
  price: LocalizedText;
  timing: LocalizedText;
  boundary: LocalizedText;
  detailHref: Partial<Record<BuyerLocale, string>>;
};

export type BuyerPublicOfferId = Extract<
  BuyerService["id"],
  | "automation-repair-handover"
  | "customer-security-review-sprint"
  | "bounded-workflow-review"
  | "professional-public-footprint-audit"
>;

const BUYER_PUBLIC_OFFER_IDS = [
  "automation-repair-handover",
  "customer-security-review-sprint",
  "bounded-workflow-review",
  "professional-public-footprint-audit",
] as const satisfies readonly BuyerPublicOfferId[];

function isBuyerPublicOfferId(id: string): id is BuyerPublicOfferId {
  return BUYER_PUBLIC_OFFER_IDS.some((offerId) => offerId === id);
}

/**
 * Canonical public catalogue — situation cards only (v1.6 OffSec index aligned).
 * Operator scripts and checks are methods under a package, not extra cards.
 * Order and names are fixed for EN/PL buyer surfaces.
 */
export const BUYER_SERVICES: readonly BuyerService[] = [
  {
    ...AUTOMATION_REPAIR_OFFER,
    homepageFeatured: false,
    requestCta: { en: "Describe the problem", pl: "Opisz problem" },
    detailHref: { en: AUTOMATION_REPAIR_OFFER.route, pl: `/pl${AUTOMATION_REPAIR_OFFER.route}` },
  },
  {
    id: "customer-security-review-sprint",
    commercialContract: {
      price: "from_eur_1600_after_non_secret_fit_check",
      timing: "approx_three_working_days_after_scope_owners_inputs_and_evidence_access_confirmed",
    },
    name: {
      en: "Customer Security Review Sprint",
      pl: "Customer Security Review Sprint",
    },
    cardSituation: {
      en: "A customer security questionnaire is holding up your deal.",
      pl: "Kwestionariusz bezpieczeństwa wstrzymuje transakcję.",
    },
    situation: {
      en: "A customer questionnaire is taking your team away from product work. Get proposed answers and evidence references for one questionnaire and one product, ready for your approval.",
      pl: "Kwestionariusz klienta odciąga zespół od pracy nad produktem. Otrzymasz proponowane odpowiedzi i źródła dla jednego kwestionariusza i produktu, do Twojego zatwierdzenia.",
    },
    result: {
      en: "Get proposed answers linked to available evidence, with gaps clearly marked for your team to resolve and approve.",
      pl: "Otrzymasz proponowane odpowiedzi ze źródłami i jasno wskazane braki do uzupełnienia i zatwierdzenia przez Twój zespół.",
    },
    price: publicB2bPrice("From €1,600", "Od 7 000 zł (ok. €1 600)"),
    timing: {
      en: "Approximately three working days after scope, owners, required inputs and evidence access are confirmed",
      pl: "Około trzech dni roboczych po potwierdzeniu zakresu, właścicieli, wymaganych materiałów i dostępu do dowodów",
    },
    boundary: {
      en: "The customer owns the final answers and submission. WitnessOps does not guarantee customer acceptance, certification or compliance.",
      pl: "Klient odpowiada za końcowe odpowiedzi i wysyłkę. WitnessOps nie gwarantuje akceptacji, certyfikacji ani zgodności.",
    },
    detailHref: {
      en: "/customer-security-review",
      pl: "/pl/customer-security-review",
    },
  },

  {
    id: PRIMARY_OFFER.id,
    commercialRole: "primary",
    homepageFeatured: true,
    commercialContract: PRIMARY_OFFER.commercialContract,
    name: PRIMARY_OFFER.name,
    cardSituation: PRIMARY_OFFER.cardSituation,
    situation: PRIMARY_OFFER.situation,
    result: PRIMARY_OFFER.result,
    price: PRIMARY_OFFER.price,
    timing: PRIMARY_OFFER.timing,
    boundary: {
      en: "One consequential agent or automation action only. Default operating mode: read, inspect, reconstruct, and report. No production modification, destructive testing, exploitation, credential changes, persistence, continuous monitoring, or safety certification unless separately scoped and explicitly authorised.",
      pl: "Tylko jedno istotne działanie agenta lub automatyzacji. Domyślny tryb pracy to odczyt, inspekcja, rekonstrukcja i raportowanie. Bez modyfikacji produkcyjnych, testów destrukcyjnych, eksploatacji, zmian danych uwierzytelniających, utrzymywania dostępu, ciągłego monitoringu ani certyfikacji bezpieczeństwa, chyba że zostaną osobno określone i wyraźnie autoryzowane.",
    },
    requestCta: {
      en: "Scope this review",
      pl: "Opisz swój przypadek",
    },
    detailHref: {
      en: PRIMARY_OFFER.route,
      pl: PRIMARY_OFFER.route,
    },
  },
  {
    id: "one-server-security-check",
    productId: "OFFSEC-LOCAL-AUDIT",
    commercialContract: {
      price: "eur_950_standard_after_fit_check",
      timing: "within_two_business_days_after_authorised_collection_window",
    },
    name: {
      en: "One Server Security Check",
      pl: "One Server Security Check",
    },
    cardSituation: {
      en: "Know what needs attention on one Linux server.",
      pl: "Sprawdź, co wymaga uwagi na serwerze Linux.",
    },
    situation: {
      en: "Preparing a Linux server for a customer review or hardening? Get a read-only security snapshot of one authorised host, with findings and clear next steps.",
      pl: "Przygotowujesz serwer Linux do przeglądu klienta lub wzmocnienia zabezpieczeń? Sprawdzimy jeden autoryzowany host w trybie tylko do odczytu i wskażemy ustalenia oraz kolejne kroki.",
    },
    result: {
      en: "Get a read-only review with findings, supporting evidence, unresolved issues and a practical list of next steps.",
      pl: "Raport z przeglądu jednego hosta Linux: ustalenia, źródła i nierozstrzygnięte kwestie, bez zmian w systemie.",
    },
    price: publicB2bPrice("€950 standard", "Standardowo 4 100 zł (ok. €950)"),
    timing: {
      en: "Within two business days after the authorised collection window",
      pl: "W ciągu dwóch dni roboczych po autoryzowanym oknie zbierania danych",
    },
    boundary: {
      en: "No exploitation, secret collection, compliance certification, or host-security guarantee. One named host, read-only, authorised collection only.",
      pl: "Bez eksploatacji, zbierania sekretów, certyfikacji zgodności i gwarancji, że host jest bezpieczny. Jeden wskazany host, tylko do odczytu, wyłącznie po upoważnieniu.",
    },
    detailHref: {
      en: "/catalog/offsec-local-audit",
      pl: "/pl/catalog/offsec-local-audit",
    },
  },
  {
    id: EXTERNAL_ATTACK_SURFACE_OFFER.id,
    productId: EXTERNAL_ATTACK_SURFACE_OFFER.productId,
    homepageFeatured: false,
    commercialRole: "secondary",
    commercialContract: EXTERNAL_ATTACK_SURFACE_OFFER.commercialContract,
    name: EXTERNAL_ATTACK_SURFACE_OFFER.name,
    cardSituation: EXTERNAL_ATTACK_SURFACE_OFFER.cardSituation,
    situation: EXTERNAL_ATTACK_SURFACE_OFFER.situation,
    result: EXTERNAL_ATTACK_SURFACE_OFFER.result,
    price: EXTERNAL_ATTACK_SURFACE_OFFER.price,
    timing: EXTERNAL_ATTACK_SURFACE_OFFER.timing,
    boundary: EXTERNAL_ATTACK_SURFACE_OFFER.boundary,
    detailHref: EXTERNAL_ATTACK_SURFACE_OFFER.route,
  },
  {
    id: "launch-readiness-check",
    productId: "OFFSEC-LAUNCH-READY",
    commercialContract: {
      price: "eur_2500_to_7500",
      timing: "four_business_days_after_candidate_collection",
    },
    name: {
      en: "Launch Readiness Check",
      pl: "Launch Readiness Check",
    },
    cardSituation: {
      en: "See what changed before the launch decision.",
      pl: "Sprawdź zmiany przed wdrożeniem.",
    },
    situation: {
      en: "Compare one launch host with your approved baseline. See what changed, which findings need attention and which decisions remain before go-live.",
      pl: "Porównaj jeden serwer przed wdrożeniem z zatwierdzonym stanem odniesienia. Zobacz zmiany, kwestie wymagające uwagi i decyzje pozostające przed uruchomieniem.",
    },
    result: {
      en: "Compare one launch host with its approved baseline. Identify findings, evidence gaps and decisions that still need an owner.",
      pl: "Porównaj jeden serwer z zatwierdzonym stanem odniesienia. Poznaj ustalenia, braki źródeł i decyzje, które wciąż wymagają właściciela.",
    },
    price: publicB2bPrice(
      "€2,500–€7,500",
      "11 000–32 000 zł (ok. €2 500–€7 500)",
    ),
    timing: {
      en: "Four business days after candidate collection",
      pl: "Cztery dni robocze po zebraniu kandydata do wydania",
    },
    boundary: {
      en: "No launch approval, security guarantee, remediation, or arbitrary cloud review. Bounded readiness package only.",
      pl: "Bez zatwierdzenia launch, gwarancji bezpieczeństwa, remediacji ani dowolnego przeglądu chmury. Tylko ograniczony pakiet gotowości.",
    },
    detailHref: {
      en: "/catalog/offsec-launch-ready",
      pl: "/pl/catalog/offsec-launch-ready",
    },
  },
  {
    id: "key-access-custody-review",
    productId: "OFFSEC-CUSTODY-OPS",
    commercialContract: {
      price: "eur_3000_to_15000",
      timing: "confirmed_during_non_secret_fit_check",
    },
    name: {
      en: "Key, Access and Custody Review",
      pl: "Key, Access and Custody Review",
    },
    cardSituation: {
      en: "Know which custody-control claims your evidence supports.",
      pl: "Sprawdź, które twierdzenia o kontroli nad aktywami potwierdzają Twoje materiały.",
    },
    situation: {
      en: "Preparing custody or wallet operations for a review? See which control claims your documentation supports and where evidence is missing. No keys or funds are shared.",
      pl: "Przygotowujesz operacje powiernicze lub obsługę portfeli do przeglądu? Sprawdź, które kontrole potwierdza dokumentacja i gdzie brakuje dowodów. Bez udostępniania kluczy i środków.",
    },
    result: {
      en: "Review sanitized custody or wallet-operation material. Identify documented controls, missing evidence and unresolved questions.",
      pl: "Przegląd kontroli: potwierdzone ustalenia, braki dowodów i otwarte pytania, wyłącznie na podstawie materiałów bez danych poufnych.",
    },
    price: publicB2bPrice(
      "€3,000–€15,000",
      "13 000–65 000 zł (ok. €3 000–€15 000)",
    ),
    timing: {
      en: "Confirmed during the non-secret fit check",
      pl: "Potwierdzany podczas wstępnej oceny bez informacji poufnych",
    },
    boundary: {
      en: "No keys, seed phrases, balances, fund movement, taking custody, or solvency claim. Documentation and agreed non-secret observations only.",
      pl: "Bez kluczy, fraz seed, sald, ruchu środków, przejmowania custody i twierdzeń o wypłacalności. Tylko dokumentacja i uzgodnione niepoufne obserwacje.",
    },
    detailHref: {
      en: "/catalog/offsec-custody-ops",
      pl: "/pl/catalog/offsec-custody-ops",
    },
  },
  {
    id: "incident-readiness-review",
    productId: "OFFSEC-INCIDENT-READY",
    commercialContract: {
      price: "eur_5000_to_25000",
      timing: "confirmed_during_non_secret_fit_check",
    },
    name: {
      en: "Incident Readiness Review",
      pl: "Incident Readiness Review",
    },
    cardSituation: {
      en: "Find the gaps in your plan for one incident scenario.",
      pl: "Znajdź braki w planie dla jednego scenariusza incydentu.",
    },
    situation: {
      en: "Choose one incident scenario and one environment. Review your preparation, identify gaps and give the responsible team a clear record of open decisions.",
      pl: "Wybierz jeden scenariusz incydentu i jedno środowisko. Sprawdź przygotowanie, poznaj braki i przekaż odpowiedzialnemu zespołowi jasną listę otwartych decyzji.",
    },
    result: {
      en: "Review the preparation, evidence and open decisions for one named scenario and environment.",
      pl: "Raport gotowości dla jednego scenariusza: przygotowanie, źródła, braki i otwarte decyzje.",
    },
    price: publicB2bPrice(
      "€5,000–€25,000",
      "22 000–108 000 zł (ok. €5 000–€25 000)",
    ),
    timing: {
      en: "Confirmed during the non-secret fit check",
      pl: "Potwierdzany podczas wstępnej oceny bez informacji poufnych",
    },
    boundary: {
      en: "No hack-back, exploitation, destructive testing, live incident command, secret intake before handling is agreed, compromise claim, root-cause or attribution.",
      pl: "Bez hack-back, eksploatacji, testów destrukcyjnych, żywego dowodzenia incydentem, przyjmowania sekretów przed uzgodnieniem postępowania, twierdzeń o kompromisie, przyczynie źródłowej lub atrybucji.",
    },
    detailHref: {
      en: "/catalog/offsec-incident-ready",
      pl: "/pl/catalog/offsec-incident-ready",
    },
  },
  {
    id: "professional-public-footprint-audit",
    homepageFeatured: false,
    pricingVisible: false,
    availability: {
      status: "available_by_request",
      label: {
        en: "Available by request",
        pl: "Dostępny na zapytanie",
      },
    },
    requestCta: {
      en: "Request this audit",
      pl: "Zapytaj o audyt",
    },
    commercialContract: {
      price: "eur_4900_excluding_vat",
      timing:
        "seven_to_ten_working_days_after_consent_scope_and_public_source_protocol_confirmed",
    },
    name: {
      en: "Professional Public Footprint Audit",
      pl: "Audyt publicznego śladu zawodowego",
    },
    cardSituation: {
      en: "Know what a client can learn from your public professional record.",
      pl: "Sprawdź, czego klient może dowiedzieć się z Twojego publicznego profilu zawodowego.",
    },
    situation: {
      en: "Review your own public professional record before a client or partner does. Find inaccuracies, unclear claims and evidence gaps, with a prioritized correction list.",
      pl: "Sprawdź swój publiczny profil zawodowy, zanim zrobi to klient lub partner. Poznaj nieścisłości, niejasne twierdzenia i braki źródeł oraz listę korekt według priorytetu.",
    },
    result: {
      en: "A public-profile summary, fact sheet and correction list, plus a private evidence appendix and 60-minute review.",
      pl: "Podsumowanie publicznego profilu, karta faktów, lista korekt, prywatny załącznik źródłowy i 60-minutowe omówienie.",
    },
    price: publicB2bPrice("€4,900", "4 900 EUR"),
    timing: {
      en: "7–10 working days",
      pl: "7–10 dni roboczych",
    },
    boundary: {
      en: "One consenting professional · one primary firm · public professional sources only. The audit documents the public record as of a stated date; it does not verify private competence or provide legal advice.",
      pl: "Jedna osoba, która wyraziła zgodę · jedna główna firma · wyłącznie publiczne źródła zawodowe. Audyt dokumentuje publiczny obraz na wskazany dzień; nie potwierdza prywatnych kompetencji ani nie stanowi porady prawnej.",
    },
    detailHref: {
      en: "/catalog/professional-public-footprint-audit",
      pl: "/pl/catalog/professional-public-footprint-audit",
    },
  },
] as const;

/** Buyer-facing action labels; routing remains governed by the service identifiers. */
export function buyerServiceCta(locale: BuyerLocale, service: BuyerService): string {
  if (service.id === "customer-security-review-sprint") return locale === "pl" ? "Omów kwestionariusz" : "Discuss your questionnaire";
  return service.requestCta?.[locale] ?? (locale === "pl" ? "Omów zakres przeglądu" : "Scope this review");
}

export function buyerRequestHref(locale: BuyerLocale): string {
  return locale === "pl"
    ? `/pl${PRIMARY_OFFER.requestRoute}`
    : PRIMARY_OFFER.requestRoute;
}

export function buyerOfferRequestHref(locale: BuyerLocale, productId: string): string {
  const service = buyerServiceByProductId(productId);
  const params = new URLSearchParams({ productId });
  if (service) params.set("offer", service.name[locale]);
  return `${buyerRequestHref(locale)}?${params.toString()}`;
}

export function buyerPublicOfferRequestHref(
  locale: BuyerLocale,
  offerId: BuyerPublicOfferId,
): string {
  const service = buyerServiceByPublicOfferId(offerId);
  const params = new URLSearchParams({ offerId });
  if (service) params.set("offer", service.name[locale]);
  return `${buyerRequestHref(locale)}?${params.toString()}`;
}

export function buyerServiceRequestHref(
  locale: BuyerLocale,
  service: BuyerService,
): string {
  if (service.productId) {
    return buyerOfferRequestHref(locale, service.productId);
  }
  if (isBuyerPublicOfferId(service.id)) {
    return buyerPublicOfferRequestHref(locale, service.id);
  }
  return buyerRequestHref(locale);
}

export function buyerCatalogHref(locale: BuyerLocale): string {
  return locale === "pl" ? "/pl/catalog" : "/catalog";
}

export function buyerServicesByCommercialPriority(): readonly BuyerService[] {
  const rank: Record<NonNullable<BuyerService["commercialRole"]>, number> = {
    primary: 0,
    secondary: 1,
  };

  return BUYER_SERVICES.map((service, index) => ({ service, index })).sort(
    (left, right) =>
      (left.service.commercialRole
        ? rank[left.service.commercialRole]
        : 2) -
        (right.service.commercialRole
          ? rank[right.service.commercialRole]
          : 2) ||
      left.index - right.index,
  ).map(({ service }) => service);
}

export function buyerServiceById(id: BuyerService["id"]): BuyerService {
  const service = BUYER_SERVICES.find((candidate) => candidate.id === id);
  if (!service) throw new Error(`Unknown buyer service: ${id}`);
  return service;
}

export function buyerServiceByPublicOfferId(
  id: string,
): BuyerService | undefined {
  // `offerId` is an untrusted public query parameter. Keep this allowlist
  // separate from the catalogue/SKU lookup so it cannot revive a withdrawn
  // product or expose another service merely because its internal id is known.
  if (!isBuyerPublicOfferId(id)) {
    return undefined;
  }
  return buyerServiceById(id);
}

/**
 * Resolve the buyer-visible public-offer selection without trusting display
 * text as commercial data. A present offer id always wins over `offer=`;
 * only the exact current public name may act as the primary-offer alias when
 * the id is absent.
 */
export function buyerServiceFromRequestOffer(
  offerId: string | null | undefined,
  offer: string | null | undefined,
): BuyerService | undefined {
  if (offerId !== null && offerId !== undefined) {
    return buyerServiceByPublicOfferId(offerId);
  }

  if (offer === AUTOMATION_REPAIR_OFFER.name.en || offer === AUTOMATION_REPAIR_OFFER.name.pl) return buyerServiceById(AUTOMATION_REPAIR_OFFER.id);

  return offer === PRIMARY_OFFER.name.en
    ? buyerServiceById(PRIMARY_OFFER.id)
    : undefined;
}

export function buyerServiceByProductId(productId: string): BuyerService | undefined {
  return BUYER_SERVICES.find((service) => service.productId === productId);
}
