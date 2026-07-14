export type BuyerLocale = "en" | "pl";

type LocalizedText = Record<BuyerLocale, string>;

export type BuyerService = {
  id:
    | "customer-security-review-sprint"
    | "bounded-workflow-review"
    | "one-server-security-check"
    | "launch-readiness-check"
    | "key-access-custody-review"
    | "incident-readiness-review";
  productId?: string;
  commercialContract: {
    price: string;
    timing: string;
  };
  name: LocalizedText;
  situation: LocalizedText;
  result: LocalizedText;
  price: LocalizedText;
  timing: LocalizedText;
  detailHref: Partial<Record<BuyerLocale, string>>;
};

export const BUYER_SERVICES: readonly BuyerService[] = [
  {
    id: "customer-security-review-sprint",
    commercialContract: {
      price: "from_eur_1600_after_non_secret_fit_check",
      timing: "three_working_days_after_scope_owners_and_evidence_access_confirmed",
    },
    name: {
      en: "Customer Security Review Sprint",
      pl: "Customer Security Review Sprint",
    },
    situation: {
      en: "A customer security questionnaire is delaying a sale or vendor review.",
      pl: "Ankieta bezpieczeństwa klienta opóźnia sprzedaż lub przegląd dostawcy.",
    },
    result: {
      en: "You receive a structured response package prepared for your team to approve, with qualifications, evidence references and unresolved items visible.",
      pl: "Otrzymasz uporządkowany pakiet odpowiedzi przygotowany do zatwierdzenia przez Twój zespół, z widocznymi zastrzeżeniami, odniesieniami do dowodów i sprawami nierozstrzygniętymi.",
    },
    price: {
      en: "From €1,600 after a non-secret fit check",
      pl: "Od 1 600 € po niepoufnej ocenie dopasowania",
    },
    timing: {
      en: "Three working days after scope, owners and required evidence access are confirmed",
      pl: "Trzy dni robocze od potwierdzenia zakresu, osób odpowiedzialnych i dostępu do wymaganych materiałów.",
    },
    detailHref: {
      en: "/customer-security-review",
      pl: "/pl/customer-security-review",
    },
  },
  {
    id: "bounded-workflow-review",
    commercialContract: {
      price: "from_eur_1500",
      timing: "confirmed_after_non_secret_fit_check",
    },
    name: {
      en: "Bounded Workflow Review",
      pl: "Przegląd działania o jasno określonym zakresie",
    },
    situation: {
      en: "One technical action, finding or handoff needs to be explained and supported.",
      pl: "Jedno działanie techniczne, ustalenie albo przekazanie odpowiedzialności wymaga jasnego wyjaśnienia i potwierdzenia.",
    },
    result: {
      en: "You receive a clear scope map, evidence package, named limitations and a path for checking the result later.",
      pl: "Otrzymasz jasną mapę zakresu, pakiet materiałów dowodowych, nazwane ograniczenia oraz sposób późniejszego sprawdzenia wyniku.",
    },
    price: {
      en: "From €1,500",
      pl: "Od 1 500 €",
    },
    timing: {
      en: "Timing confirmed after the non-secret fit check",
      pl: "Termin potwierdzamy po niepoufnej ocenie dopasowania.",
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
      timing: "within_two_business_days_after_authorized_collection_window",
    },
    name: {
      en: "One Server Security Check",
      pl: "Przegląd bezpieczeństwa jednego serwera",
    },
    situation: {
      en: "You need a bounded, read-only security check of one authorized Linux server.",
      pl: "Potrzebujesz rzetelnej kontroli bezpieczeństwa jednego wskazanego serwera Linux.",
    },
    result: {
      en: "You receive a report and signed evidence package showing what was checked, what supports the result and what remains unresolved.",
      pl: "Otrzymasz raport i podpisany pakiet dowodowy pokazujący, co sprawdzono, co wspiera wynik i co pozostaje nierozstrzygnięte.",
    },
    price: {
      en: "€950 standard after a non-secret fit check",
      pl: "950 € — cena standardowa po niepoufnej ocenie dopasowania",
    },
    timing: {
      en: "Within two business days after the authorized collection window closes",
      pl: "W ciągu dwóch dni roboczych od zakończenia autoryzowanego okna zbierania danych.",
    },
    detailHref: {
      en: "/catalog/offsec-local-audit",
      pl: "/pl/catalog/offsec-local-audit",
    },
  },
  {
    id: "launch-readiness-check",
    productId: "OFFSEC-LAUNCH-READY",
    commercialContract: {
      price: "eur_2500_to_7500",
      timing: "four_business_days_after_candidate_evidence_collection",
    },
    name: {
      en: "Launch Readiness Check",
      pl: "Ocena gotowości do wdrożenia",
    },
    situation: {
      en: "A release needs a bounded pre-launch check and a record of remaining decisions.",
      pl: "Przygotowujesz wdrożenie i potrzebujesz sprawdzenia wersji kandydującej oraz zapisu decyzji, które pozostały do podjęcia.",
    },
    result: {
      en: "You receive a readiness report and signed evidence package showing what changed, what was checked and what still requires a decision.",
      pl: "Otrzymasz raport gotowości i podpisany pakiet dowodowy pokazujący, co się zmieniło, co sprawdzono i co nadal wymaga decyzji.",
    },
    price: {
      en: "€2,500–€7,500",
      pl: "2 500–7 500 €",
    },
    timing: {
      en: "Four business days after candidate evidence collection",
      pl: "Cztery dni robocze od zebrania materiałów dotyczących wersji kandydującej.",
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
      pl: "Przegląd zarządzania kluczami, dostępem i pieczą",
    },
    situation: {
      en: "You need to review how key, access or custody controls are documented without exposing keys or funds.",
      pl: "Chcesz ocenić, jak udokumentowano zarządzanie kluczami, dostępem lub pieczą, bez ujawniania kluczy ani środków.",
    },
    result: {
      en: "You receive a posture report, findings and signed evidence package that separate observed controls from items outside scope.",
      pl: "Otrzymasz raport stanu, ustalenia i podpisany pakiet dowodowy oddzielający zaobserwowane kontrole od elementów poza zakresem.",
    },
    price: {
      en: "€3,000–€15,000",
      pl: "3 000–15 000 €",
    },
    timing: {
      en: "Timing confirmed during the non-secret fit check",
      pl: "Termin potwierdzamy podczas niepoufnej oceny dopasowania.",
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
      pl: "Przegląd gotowości na wypadek incydentu",
    },
    situation: {
      en: "You need to check whether a team is prepared for one defined incident scenario.",
      pl: "Chcesz sprawdzić, czy zespół jest przygotowany na jeden określony scenariusz incydentu.",
    },
    result: {
      en: "You receive a readiness report and signed evidence package separating observations, unknowns and items outside scope.",
      pl: "Otrzymasz raport gotowości i podpisany pakiet dowodowy oddzielający obserwacje, niewiadome i elementy poza zakresem.",
    },
    price: {
      en: "€5,000–€25,000",
      pl: "5 000–25 000 €",
    },
    timing: {
      en: "Timing confirmed during the non-secret fit check",
      pl: "Termin potwierdzamy podczas niepoufnej oceny dopasowania.",
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

export function buyerCatalogHref(locale: BuyerLocale): string {
  return locale === "pl" ? "/pl/catalog" : "/catalog";
}
