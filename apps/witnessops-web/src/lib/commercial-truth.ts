import { publicB2bPrice } from "@/lib/commercial-price";

/** Pilot commercial terms: diagnosis is paid; repair requires an accepted bounded quote. */
export const AUTOMATION_REPAIR_OFFER = {
  id: "automation-repair-handover",
  route: "/catalog/automation-repair",
  name: { en: "Automation Repair & Handover", pl: "Naprawa i przejęcie automatyzacji" },
  commercialContract: { price: "eur_250_diagnosis_750_total_if_bounded", timing: "up_to_two_hours_diagnosis_schedule_agreed" },
  price: publicB2bPrice("€250 diagnosis", "€250 za diagnozę"),
  repairPrice: publicB2bPrice("€750 total, including diagnosis, if the repair fits", "€750 łącznie z diagnozą, jeśli naprawa mieści się w zakresie"),
  timing: { en: "Up to 2 hours of diagnosis · start date agreed", pl: "Do 2 godzin diagnozy · termin ustalamy wspólnie" },
  cardSituation: { en: "Restore the workflow your business relies on.", pl: "Przywróć proces, od którego zależy Twoja firma." },
  situation: { en: "Broken or inherited automation? Start with one failing path. We diagnose it, restore it where feasible and test the actual business result.", pl: "Dla właścicieli firm i zespołów operacyjnych z niedziałającym lub odziedziczonym procesem. Diagnozujemy jedną ścieżkę, naprawiamy ją tam, gdzie to wykonalne, i sprawdzamy wynik w systemie docelowym." },
  result: { en: "Diagnosis: reproduced failure or clear blocker, likely cause and a fixed repair quote. Accepted repair: tested result, updated source and operating instructions.", pl: "Diagnoza: odtworzony błąd lub konkretna przeszkoda, prawdopodobna przyczyna i stała wycena naprawy. Uzgodniona naprawa: sprawdzony wynik, aktualne źródło i instrukcja obsługi." },
  boundary: { en: "One workflow, one failing path, up to 3 systems and 2 diagnosis hours. The €750 total applies only to an agreed repair that fits about 6 total delivery hours. If it does not fit, stop after diagnosis or accept a separate quote. No guaranteed fix, unlimited support or third-party fees included.", pl: "Jeden proces, jedna niedziałająca ścieżka, do 3 systemów i 2 godzin diagnozy. Cena €750 łącznie dotyczy tylko uzgodnionej naprawy mieszczącej się w około 6 godzinach całej pracy. Jeśli zakres jest większy, kończymy na diagnozie lub uzgadniamy osobną wycenę. Bez gwarancji naprawy, nielimitowanego wsparcia i opłat dostawców." },
} as const;

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
    ...publicB2bPrice("€2,500 fixed", "€2 500: cena stała"),
  },
  unit: {
    en: "One consequential agent or automation action",
    pl: "Jedno istotne działanie agenta lub automatyzacji",
  },
  cardSituation: {
    en: "Before an agent changes records, issues refunds or grants access, understand the controls around that action.",
    pl: "Zanim agent zmieni dane, wykona zwrot lub nada dostęp, poznaj zabezpieczenia tego działania.",
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
    en: "Review one agent action before launch or customer handover. Find gaps in approvals, permissions and execution evidence, with practical fixes for your team to prioritize.",
    pl: "Sprawdź jedno działanie agenta przed wdrożeniem lub przekazaniem klientowi. Poznaj luki w zatwierdzaniu, uprawnieniach i dowodach wykonania oraz priorytety poprawek.",
  },
  result: {
    en: "Review one action’s permissions, approvals and execution evidence. Receive an action map, findings with sources, prioritized recommendations and a readout.",
    pl: "Sprawdź uprawnienia, zatwierdzanie i dowody wykonania jednego działania. Otrzymasz mapę działania, ustalenia ze źródłami, zalecenia według priorytetu i omówienie.",
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
    ...publicB2bPrice("€1,900", "€1 900"),
  },
  additionalOrLateRetestPrice: {
    amount: "550",
    currency: "EUR",
    ...publicB2bPrice("€550", "€550"),
  },
  timing: {
    en: "Within 3 working days after payment in full, an accepted SOW, written authority, fixed scope, required inputs, and the approved collection window are confirmed",
    pl: "W ciągu 3 dni roboczych po potwierdzeniu pełnej płatności, zaakceptowanego SOW, pisemnego upoważnienia, stałego zakresu, wymaganych danych wejściowych i zatwierdzonego okna zbierania",
  },
  cardSituation: {
    en: "See what your public-facing system exposes.",
    pl: "Sprawdź, co ujawnia Twój system dostępny z internetu.",
  },
  situation: {
    en: "Review one authorised internet-facing system. Find unexpected exposure and misconfiguration, with evidence and remediation priorities. No exploitation. This is not a penetration test.",
    pl: "Sprawdź jeden autoryzowany system dostępny z internetu. Poznaj niezamierzoną ekspozycję, błędy konfiguracji i priorytety napraw. Bez eksploatacji. To nie jest test penetracyjny.",
  },
  result: {
    en: "An external attack-surface map, evidence-backed findings, remediation priorities and one focused retest within 30 days.",
    pl: "Mapa zewnętrznej powierzchni ataku, ustalenia ze źródłami, priorytety napraw i jedno sprawdzenie poprawek w ciągu 30 dni.",
  },
  boundary: {
    en: "This is not a penetration test. No exploitation, authenticated testing, brute force, credential collection, social engineering, denial of service, destructive activity, persistence, malware, exfiltration, certification, or security guarantee.",
    pl: "To nie jest test penetracyjny. Bez eksploatacji, testów uwierzytelnionych, brute force, zbierania danych uwierzytelniających, socjotechniki, odmowy usługi, działań destrukcyjnych, utrzymywania dostępu, malware, eksfiltracji, certyfikacji ani gwarancji bezpieczeństwa.",
  },
} as const;

export type PrimaryOffer = typeof PRIMARY_OFFER;
export type PrimaryOfferName = PrimaryOffer["name"]["en"];
export type PrimaryOfferPriceLabel = PrimaryOffer["price"]["en"];
