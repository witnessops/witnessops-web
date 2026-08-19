export type BuyerLocale = "en" | "pl";

type LocalizedText = Record<BuyerLocale, string>;

export type BuyerService = {
  id:
    | "customer-security-review-sprint"
    | "bounded-workflow-review"
    | "one-server-security-check"
    | "external-exposure-assessment"
    | "launch-readiness-check"
    | "key-access-custody-review"
    | "incident-readiness-review";
  productId?: string;
  homepageFeatured?: boolean;
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
  /**
   * Optional public one-pager (PDF) per locale — e.g. CSR EN/PL sales sheets.
   * Served from /public/assets/one-pagers/.
   */
  onePagerHref?: Partial<Record<BuyerLocale, string>>;
};

/**
 * Canonical public catalogue — situation cards only (v1.6 OffSec index aligned).
 * Operator scripts and checks are methods under a package, not extra cards.
 * Order and names are fixed for EN/PL buyer surfaces.
 */
export const BUYER_SERVICES: readonly BuyerService[] = [
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
      en: "A customer security questionnaire is delaying a sale or vendor review.",
      pl: "Kwestionariusz bezpieczeństwa klienta opóźnia sprzedaż lub ocenę dostawcy.",
    },
    situation: {
      en: "A customer, buyer or procurement team has sent a security questionnaire or evidence request that is delaying a deal or consuming senior technical time.",
      pl: "Klient, kupujący lub dział zakupów przesłał kwestionariusz bezpieczeństwa albo prośbę o materiały, która opóźnia transakcję lub zajmuje czas seniorów technicznych.",
    },
    result: {
      en: "A response package for one questionnaire and one product scope, including proposed answers, evidence references, qualifications, open items and a cover note for your approval.",
      pl: "Pakiet odpowiedzi dla jednego kwestionariusza i jednego zakresu produktu, obejmujący proponowane odpowiedzi, odwołania do materiałów, zastrzeżenia, otwarte kwestie i notę przewodnią do zatwierdzenia.",
    },
    price: {
      en: "From €1,600 after a non-secret fit check",
      pl: "Od 7 000 zł po wstępnej ocenie bez informacji poufnych (ok. €1 600)",
    },
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
    onePagerHref: {
      // Open inline in a new tab (Content-Disposition: inline via next.config headers).
      en: "/assets/one-pagers/csr-sprint-en-a4.pdf",
      pl: "/assets/one-pagers/csr-sprint-pl-a4.pdf",
    },
  },

  {
    id: "bounded-workflow-review",
    commercialContract: {
      price: "from_eur_1500",
      timing: "confirmed_during_non_secret_fit_check",
    },
    name: {
      en: "Bounded Workflow Review",
      pl: "Bounded Workflow Review",
    },
    cardSituation: {
      en: "One technical action, finding or handoff needs to be explained and supported.",
      pl: "Jedno działanie techniczne, znalezisko lub przekazanie pracy wymaga wyjaśnienia i udokumentowania.",
    },
    situation: {
      en: "One technical action, finding, change or handoff must be explained after the work changes hands.",
      pl: "Jedno działanie techniczne, znalezisko, zmiana lub przekazanie pracy musi pozostać zrozumiałe po zmianie właściciela.",
    },
    result: {
      en: "A bounded report or proof package naming the authority, work performed or reviewed, evidence references, limitations and unresolved items.",
      pl: "Ograniczony raport lub pakiet wskazujący upoważnienie, wykonaną lub ocenioną pracę, odwołania do materiałów, ograniczenia i nierozwiązane kwestie.",
    },
    price: {
      en: "From €1,500",
      pl: "Od 6 500 zł (ok. €1 500)",
    },
    timing: {
      en: "Confirmed during the non-secret fit check",
      pl: "Potwierdzany podczas wstępnej oceny bez informacji poufnych",
    },
    boundary: {
      en: "The exact workflow and verification mechanism are named in the engagement. A report alone is not described as independently verified.",
      pl: "Dokładny przepływ pracy i mechanizm weryfikacji są nazwane w ustaleniach. Sam raport nie jest opisywany jako niezależnie zweryfikowany.",
    },
    detailHref: {
      en: "/catalog/workflows",
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
      en: "You need a clear, read-only picture of one authorised Linux host.",
      pl: "Potrzebujesz jasnego obrazu jednego autoryzowanego hosta Linux — tylko do odczytu.",
    },
    situation: {
      en: "You need a clear, read-only security picture of one authorised Linux host before a customer ask, hardening step, or internal review.",
      pl: "Potrzebujesz jasnego, nieinwazyjnego obrazu bezpieczeństwa jednego autoryzowanego hosta Linux przed prośbą klienta, hardeningiem lub przeglądem wewnętrznym.",
    },
    result: {
      en: "Posture, findings, report and, where agreed, a signed proof package with offline verification path — what was checked, what evidence supports it, what remains unresolved.",
      pl: "Stan, ustalenia, raport oraz, jeśli uzgodniono, podpisany pakiet ze ścieżką weryfikacji offline — co sprawdzono, jakie materiały to wspierają i co pozostaje otwarte.",
    },
    price: {
      en: "€950 standard after a non-secret fit check",
      pl: "Standardowo 4 100 zł po wstępnej ocenie bez informacji poufnych (ok. €950)",
    },
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
    id: "external-exposure-assessment",
    productId: "OFFSEC-EXTERNAL-EXPOSURE",
    homepageFeatured: true,
    commercialContract: {
      price: "eur_1900_ex_vat_one_authorised_public_facing_system",
      timing:
        "within_24_hours_after_agreed_payment_condition_accepted_sow_written_authority_fixed_scope_required_inputs_and_approved_collection_window_confirmed",
    },
    name: {
      en: "Public Exposure Review",
      pl: "Public Exposure Review",
    },
    cardSituation: {
      en: "See what one public-facing system exposes from the internet.",
      pl: "Zobacz, co ujawnia jeden autoryzowany system publicznie dostępny, zanim wskaże to klient, audytor lub atakujący.",
    },
    situation: {
      en: "A fixed-scope external security review of one authorised public-facing system.",
      pl: "Ręczny, ograniczony zakresem przegląd bezpieczeństwa jednego autoryzowanego systemu publicznie dostępnego.",
    },
    result: {
      en: "Manually reviewed, evidence-linked findings with practical remediation guidance.",
      pl: "Mapa ekspozycji, priorytetyzowane ustalenia powiązane z materiałami, zalecenia naprawcze, jawne niewiadome i pakiet, który może sprawdzić kolejny odpowiedzialny właściciel.",
    },
    price: {
      en: "€1,900 ex VAT — one authorised public-facing system",
      pl: "€1 900 netto — jeden autoryzowany system publicznie dostępny",
    },
    timing: {
      en: "Within 24 hours after the agreed payment condition, accepted SOW, written authority, fixed scope, required inputs, and the approved collection window are confirmed",
      pl: "W ciągu 24 godzin po potwierdzeniu uzgodnionego warunku płatności, zaakceptowanego SOW, pisemnego upoważnienia, stałego zakresu, wymaganych danych wejściowych i zatwierdzonego okna zbierania",
    },
    boundary: {
      en: "No exploitation, credentials, destructive testing, certification, or security guarantee. Unauthenticated outside-in checks only, within the agreed fixed scope.",
      pl: "Bez eksploatacji, danych uwierzytelniających, testów destrukcyjnych, certyfikacji i gwarancji bezpieczeństwa. Wyłącznie nieuwierzytelnione kontrole z zewnątrz w uzgodnionym stałym zakresie.",
    },
    detailHref: {
      en: "/catalog/offsec-external-exposure",
      pl: "/pl/catalog/offsec-external-exposure",
    },
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
      en: "You need a before/after decision for one launch host and an approved baseline.",
      pl: "Potrzebujesz decyzji before/after dla jednego hosta startu i zatwierdzonej bazy.",
    },
    situation: {
      en: "You need a before-and-after readiness picture for one launch host against an approved baseline, including drift and open decisions.",
      pl: "Potrzebujesz obrazu gotowości before/after dla jednego hosta startu względem zatwierdzonej bazy, z dryfem i otwartymi decyzjami.",
    },
    result: {
      en: "Baseline and candidate snapshots, drift notes, findings, readiness report and, where agreed, a signed proof package with offline verification.",
      pl: "Migawki bazy i kandydata, notatki o dryfie, ustalenia, raport gotowości oraz, jeśli uzgodniono, podpisany pakiet ze weryfikacją offline.",
    },
    price: {
      en: "€2,500–€7,500",
      pl: "11 000–32 000 zł (ok. €2 500–€7 500)",
    },
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
      en: "You need a bounded review of custody or wallet-operations controls without touching funds.",
      pl: "Potrzebujesz ograniczonego przeglądu kontroli custody lub wallet-ops bez dotykania środków.",
    },
    situation: {
      en: "You need a proof-backed review of how custody or wallet-operations controls are documented, using sanitised observations only.",
      pl: "Potrzebujesz przeglądu z pakietem, jak udokumentowano kontrole custody lub wallet-ops, wyłącznie na zanonimizowanych obserwacjach.",
    },
    result: {
      en: "Sanitised posture, completeness notes, findings and, where agreed, a signed proof package — supported claims vs gaps, no keys or balances in the package.",
      pl: "Zanonimizowany stan, notatki o kompletności, ustalenia oraz, jeśli uzgodniono, podpisany pakiet — obsługiwane twierdzenia vs luki, bez kluczy i sald w pakiecie.",
    },
    price: {
      en: "€3,000–€15,000",
      pl: "13 000–65 000 zł (ok. €3 000–€15 000)",
    },
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
      en: "You need a bounded readiness record for one named incident scenario and environment.",
      pl: "Potrzebujesz ograniczonego zapisu gotowości dla jednego nazwanego scenariusza i środowiska.",
    },
    situation: {
      en: "You need a bounded readiness record for one named incident class and environment — preparation, unknowns and open decisions on the package.",
      pl: "Potrzebujesz ograniczonego zapisu gotowości dla jednej nazwanej klasy incydentu i środowiska — przygotowanie, niewiadome i otwarte decyzje w pakiecie.",
    },
    result: {
      en: "Sanitised readiness observations, posture, findings and open gaps in a package another owner can inspect — not live incident command.",
      pl: "Zanonimizowane obserwacje gotowości, stan, ustalenia i otwarte luki w pakiecie do wglądu innego właściciela — bez dowodzenia incydentem na żywo.",
    },
    price: {
      en: "€5,000–€25,000",
      pl: "22 000–108 000 zł (ok. €5 000–€25 000)",
    },
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
] as const;

export function buyerRequestHref(locale: BuyerLocale): string {
  return locale === "pl" ? "/pl/review/request" : "/review/request";
}

export function buyerOfferRequestHref(locale: BuyerLocale, productId: string): string {
  const service = buyerServiceByProductId(productId);
  const params = new URLSearchParams({ productId });
  if (service) params.set("offer", service.name[locale]);
  return `${buyerRequestHref(locale)}?${params.toString()}`;
}

export function buyerCatalogHref(locale: BuyerLocale): string {
  return locale === "pl" ? "/pl/catalog" : "/catalog";
}

export function buyerServiceById(id: BuyerService["id"]): BuyerService {
  const service = BUYER_SERVICES.find((candidate) => candidate.id === id);
  if (!service) throw new Error(`Unknown buyer service: ${id}`);
  return service;
}

export function buyerServiceByProductId(productId: string): BuyerService | undefined {
  return BUYER_SERVICES.find((service) => service.productId === productId);
}

/** Anchor props so one-pager PDFs open in a new tab for viewing, not as a forced download. */
export const ONE_PAGER_LINK_PROPS = {
  target: "_blank" as const,
  rel: "noopener noreferrer",
  type: "application/pdf",
} as const;
