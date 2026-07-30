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
  /** Short situation line for homepage cards (when different from full catalogue situation). */
  cardSituation: LocalizedText;
  result: LocalizedText;
  price: LocalizedText;
  timing: LocalizedText;
  boundary: LocalizedText;
  detailHref: Partial<Record<BuyerLocale, string>>;
};

/**
 * Canonical public catalogue — approved website copy 30 July 2026.
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
      pl: "Od €1,600 po wstępnej ocenie bez informacji poufnych",
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
      pl: "Od €1,500",
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
      en: "You need a bounded, read-only security check of one authorised Linux server.",
      pl: "Potrzebujesz ograniczonego zakresowo, nieinwazyjnego przeglądu bezpieczeństwa jednego autoryzowanego serwera Linux.",
    },
    situation: {
      en: "You need a clear, read-only security picture of one authorised Linux server.",
      pl: "Potrzebujesz jasnego, nieinwazyjnego obrazu bezpieczeństwa jednego autoryzowanego serwera Linux.",
    },
    result: {
      en: "A report and, where agreed, a signed proof package showing what was checked, which evidence supports the result and what remains unresolved.",
      pl: "Raport oraz, jeśli uzgodniono, podpisany pakiet pokazujący, co sprawdzono, jakie materiały wspierają wynik i co pozostaje nierozwiązane.",
    },
    price: {
      en: "€950 standard after a non-secret fit check",
      pl: "Standardowo €950 po wstępnej ocenie bez informacji poufnych",
    },
    timing: {
      en: "Within two business days after the authorised collection window",
      pl: "W ciągu dwóch dni roboczych po autoryzowanym oknie zbierania danych",
    },
    boundary: {
      en: "One named server, authorised read-only collection, agreed checks and explicit exclusions. This is not a penetration test or certification.",
      pl: "Jeden wskazany serwer, autoryzowane działania tylko do odczytu, uzgodnione kontrole i jawne wyłączenia. To nie jest test penetracyjny ani certyfikacja.",
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
      timing: "four_business_days_after_candidate_collection",
    },
    name: {
      en: "Launch Readiness Check",
      pl: "Launch Readiness Check",
    },
    cardSituation: {
      en: "A release needs a bounded pre-launch check and a record of remaining decisions.",
      pl: "Wydanie potrzebuje ograniczonego przeglądu przed uruchomieniem i zapisu pozostałych decyzji.",
    },
    situation: {
      en: "A release needs a bounded pre-launch check and a record of remaining decisions.",
      pl: "Wydanie potrzebuje ograniczonego przeglądu przed uruchomieniem i zapisu pozostałych decyzji.",
    },
    result: {
      en: "A readiness report and, where agreed, a proof package showing what changed, what was checked and what still requires a decision.",
      pl: "Raport gotowości oraz, jeśli uzgodniono, pakiet pokazujący, co się zmieniło, co sprawdzono i co nadal wymaga decyzji.",
    },
    price: {
      en: "€2,500–€7,500",
      pl: "€2,500–€7,500",
    },
    timing: {
      en: "Four business days after candidate collection",
      pl: "Cztery dni robocze po zebraniu kandydata do wydania",
    },
    boundary: {
      en: "This is a bounded readiness review, not a guarantee that the release is defect-free or safe in every environment.",
      pl: "To ograniczony przegląd gotowości, a nie gwarancja, że wydanie jest wolne od wad lub bezpieczne w każdym środowisku.",
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
      en: "You need to review how key, access or custody controls are documented without exposing keys or funds.",
      pl: "Chcesz ocenić, jak udokumentowano kontrole kluczy, dostępu uprzywilejowanego lub custody bez ujawniania kluczy ani środków.",
    },
    situation: {
      en: "You need to review how key, privileged-access or custody controls are documented without exposing keys, recovery material or funds.",
      pl: "Chcesz ocenić, jak udokumentowano kontrole kluczy, dostępu uprzywilejowanego lub custody bez ujawniania kluczy, materiałów odzyskiwania ani środków.",
    },
    result: {
      en: "A posture report, evidence index and findings showing which control observations were supplied, which claims are supported and what remains outside scope or unresolved.",
      pl: "Raport stanu, indeks materiałów i ustalenia pokazujące, które obserwacje kontrolne dostarczono, które twierdzenia mają wsparcie oraz co pozostaje poza zakresem lub nierozwiązane.",
    },
    price: {
      en: "€3,000–€15,000",
      pl: "€3,000–€15,000",
    },
    timing: {
      en: "Confirmed during the non-secret fit check",
      pl: "Potwierdzany podczas wstępnej oceny bez informacji poufnych",
    },
    boundary: {
      en: "WitnessOps does not take custody of funds or secrets and does not request private keys, seed phrases or recovery codes.",
      pl: "WitnessOps nie przejmuje środków ani sekretów i nie prosi o klucze prywatne, frazy seed ani kody odzyskiwania.",
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
      en: "You need to check whether a team is prepared for one defined incident scenario.",
      pl: "Chcesz sprawdzić przygotowanie zespołu do jednego określonego scenariusza incydentu.",
    },
    situation: {
      en: "You need to check whether a team is prepared for one defined incident scenario.",
      pl: "Chcesz sprawdzić przygotowanie zespołu do jednego określonego scenariusza incydentu.",
    },
    result: {
      en: "A readiness report separating observed preparation, management assertions, unknowns, exclusions and decisions that remain open.",
      pl: "Raport gotowości rozdzielający zaobserwowane przygotowanie, oświadczenia kierownictwa, niewiadome, wyłączenia i otwarte decyzje.",
    },
    price: {
      en: "€5,000–€25,000",
      pl: "€5,000–€25,000",
    },
    timing: {
      en: "Confirmed during the non-secret fit check",
      pl: "Potwierdzany podczas wstępnej oceny bez informacji poufnych",
    },
    boundary: {
      en: "This is not emergency incident response, a 24/7 service or a guarantee of incident outcome.",
      pl: "To nie jest awaryjna obsługa incydentu, usługa 24/7 ani gwarancja wyniku incydentu.",
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

export function buyerServiceById(id: BuyerService["id"]): BuyerService {
  const service = BUYER_SERVICES.find((candidate) => candidate.id === id);
  if (!service) throw new Error(`Unknown buyer service: ${id}`);
  return service;
}

export function buyerServiceByProductId(productId: string): BuyerService | undefined {
  return BUYER_SERVICES.find((service) => service.productId === productId);
}
