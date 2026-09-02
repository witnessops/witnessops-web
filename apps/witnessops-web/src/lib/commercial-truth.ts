const PRIMARY_OFFER_SAMPLE_PACK = {
  en: "Sample pack with supported receipt JSON to extract and test through /verify",
  pl: "Przykładowy pakiet z obsługiwanym zapisem JSON do wyodrębnienia i sprawdzenia przez /verify",
} as const;

const PRIMARY_OFFER_PUBLIC_NAME = "Agent Action Security Review";
const PRIMARY_OFFER_DELIVERY_METHOD = "Agent Workflow Reconstruction";

export const PRIMARY_OFFER = {
  id: "bounded-workflow-review",
  route: "/catalog/workflows",
  requestRoute: "/review/request",
  mailSubject: `WitnessOps request — ${PRIMARY_OFFER_PUBLIC_NAME}`,
  name: {
    en: PRIMARY_OFFER_PUBLIC_NAME,
    pl: PRIMARY_OFFER_PUBLIC_NAME,
  },
  deliveryMethod: {
    en: PRIMARY_OFFER_DELIVERY_METHOD,
    pl: PRIMARY_OFFER_DELIVERY_METHOD,
  },
  commercialContract: {
    price: "eur_2500_fixed",
    timing: "within_ten_working_days_after_evidence_rules_are_agreed",
  },
  price: {
    amount: "2500",
    currency: "EUR",
    en: "€2,500 fixed",
    pl: "€2 500 — cena stała",
  },
  unit: {
    en: "One consequential agent or automation action",
    pl: "Jedno istotne działanie agenta lub automatyzacji",
  },
  cardSituation: {
    en: "What can your AI agent actually do in production?",
    pl: "Co Twój agent AI może naprawdę zrobić w produkcji?",
  },
  fitCheck: {
    en: "Non-secret fit check first",
    pl: "Najpierw wstępna ocena bez informacji poufnych",
  },
  fitCheckQuestion: {
    en: "What consequential action can the agent or automation take?",
    pl: "Jakie istotne działanie może wykonać agent lub automatyzacja?",
  },
  timing: {
    en: "Within 10 working days after evidence rules are agreed",
    pl: "W ciągu 10 dni roboczych po uzgodnieniu zasad dowodowych",
  },
  situation: {
    en: "When an AI agent or automation moves from suggesting to acting across production, money, customer data, accounts, permissions, or external communications, map one consequential action across authority, identity, permissions, tools, execution path, blast radius, and evidence before a customer, pentest, or incident finds the gaps for you.",
    pl: "Gdy agent AI lub automatyzacja przechodzi od sugerowania do działania w produkcji, finansach, danych klientów, kontach, uprawnieniach lub komunikacji zewnętrznej, zmapuj jedno istotne działanie pod kątem upoważnienia, tożsamości, uprawnień, narzędzi, ścieżki wykonania, zasięgu skutków i dowodów — zanim luki znajdzie za Ciebie klient, pentest lub incydent.",
  },
  result: {
    en: "An authority map, execution path, permission boundary, evidence chain, and practical fixes for over-privileged identities, weak approval paths, excessive tool access, broken approval-to-action binding, and missing execution evidence.",
    pl: "Mapa upoważnień, ścieżka wykonania, granica uprawnień, łańcuch dowodowy i praktyczne poprawki dotyczące nadmiernych uprawnień, słabych ścieżek zatwierdzania, zbyt szerokiego dostępu do narzędzi, zerwanego powiązania zgody z działaniem i brakujących dowodów wykonania.",
  },
  samplePack: PRIMARY_OFFER_SAMPLE_PACK,
  included: {
    en: [
      "Authority map",
      "Execution path",
      "Permission boundary",
      "Evidence chain",
      "Control gaps and practical fixes",
      "Readout",
    ],
    pl: [
      "Mapa upoważnień",
      "Ścieżka wykonania",
      "Granica uprawnień",
      "Łańcuch dowodowy",
      "Luki kontrolne i praktyczne poprawki",
      "Omówienie wyniku",
    ],
  },
  technicalOutputs: {
    en: [
      `${PRIMARY_OFFER_DELIVERY_METHOD} method`,
      "Evidence-gap analysis",
      "Proposed receipt shape",
      PRIMARY_OFFER_SAMPLE_PACK.en,
    ],
    pl: [
      `Metoda ${PRIMARY_OFFER_DELIVERY_METHOD}`,
      "Analiza luk dowodowych",
      "Proponowany kształt zapisu",
      PRIMARY_OFFER_SAMPLE_PACK.pl,
    ],
  },
  defaultAuthority: {
    en: "Default operating mode: read, inspect, reconstruct, and report.",
    pl: "Domyślny tryb pracy: odczyt, inspekcja, rekonstrukcja i raportowanie.",
  },
  notIncluded: {
    en: [
      "Platform installation",
      "Production modification",
      "Destructive testing",
      "Exploitation",
      "Credential changes",
      "Persistence",
      "Continuous monitoring",
      "Certification that an agent is safe",
      "Custom protocol development",
      "Multi-workflow programmes",
    ],
    pl: [
      "Instalacja platformy",
      "Modyfikacje produkcyjne",
      "Testy destrukcyjne",
      "Eksploatacja podatności",
      "Zmiany danych uwierzytelniających",
      "Utrzymywanie dostępu",
      "Ciągłe monitorowanie",
      "Certyfikacja, że agent jest bezpieczny",
      "Tworzenie niestandardowego protokołu",
      "Programy obejmujące wiele workflow",
    ],
  },
} as const;

export const EXTERNAL_ATTACK_SURFACE_OFFER = {
  id: "external-exposure-assessment",
  productId: "OFFSEC-EXTERNAL-EXPOSURE",
  route: {
    en: "/catalog/offsec-external-exposure",
    pl: "/pl/catalog/offsec-external-exposure",
  },
  requestRoute: "/review/request",
  name: {
    en: "External Attack Surface Review",
    pl: "External Attack Surface Review",
  },
  commercialContract: {
    price: "eur_1900_ex_vat_one_authorised_public_facing_system",
    timing:
      "three_working_days_after_payment_in_full_accepted_sow_written_authority_fixed_scope_required_inputs_and_approved_collection_window_confirmed",
  },
  price: {
    amount: "1900",
    currency: "EUR",
    vatIncluded: false,
    en: "€1,900 ex VAT — one authorised public-facing system",
    pl: "€1 900 netto — jeden autoryzowany system publicznie dostępny",
  },
  timing: {
    en: "Within 3 working days after payment in full, an accepted SOW, written authority, fixed scope, required inputs, and the approved collection window are confirmed",
    pl: "W ciągu 3 dni roboczych po potwierdzeniu pełnej płatności, zaakceptowanego SOW, pisemnego upoważnienia, stałego zakresu, wymaganych danych wejściowych i zatwierdzonego okna zbierania",
  },
  cardSituation: {
    en: "What can the internet see that you didn't mean to expose?",
    pl: "Co internet widzi, choć nie miało być publiczne?",
  },
  situation: {
    en: "Find it before your customer, pentester, or incident does. WitnessOps inspects one authorised internet-facing system from the outside and shows you exposed hosts, services, endpoints, and attacker-visible configuration worth reviewing. No exploitation. This is not a penetration test.",
    pl: "Znajdź to, zanim znajdzie to za Ciebie klient, pentest lub incydent. WitnessOps sprawdza z zewnątrz jeden autoryzowany system dostępny z internetu i pokazuje hosty, usługi, endpointy oraz konfigurację widoczną dla atakującego, które warto przeanalizować. Bez eksploatacji. To nie jest test penetracyjny.",
  },
  result: {
    en: "An external attack-surface map, evidence-backed findings, and remediation priorities for internet-facing hosts, services, and endpoints you did not expect to be public, plus attacker-visible misconfiguration.",
    pl: "Mapa zewnętrznej powierzchni ataku, ustalenia poparte dowodami i priorytety napraw dla hostów, usług i endpointów dostępnych z internetu, które nie miały być publiczne, oraz błędów konfiguracji widocznych dla atakującego.",
  },
  boundary: {
    en: "This is not a penetration test. No exploitation, authenticated testing, brute force, credential collection, social engineering, denial of service, destructive activity, persistence, malware, exfiltration, certification, or security guarantee.",
    pl: "To nie jest test penetracyjny. Bez eksploatacji, testów uwierzytelnionych, brute force, zbierania danych uwierzytelniających, socjotechniki, odmowy usługi, działań destrukcyjnych, utrzymywania dostępu, malware, eksfiltracji, certyfikacji ani gwarancji bezpieczeństwa.",
  },
} as const;

export type PrimaryOffer = typeof PRIMARY_OFFER;
export type PrimaryOfferName = PrimaryOffer["name"]["en"];
export type PrimaryOfferPriceLabel = PrimaryOffer["price"]["en"];
