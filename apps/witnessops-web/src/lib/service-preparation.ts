import type { BuyerLocale, BuyerService } from "@/lib/buyer-services";

type Preparation = { inputs: string; access: string; after: string };

const copy: Record<BuyerService["id"], Record<BuyerLocale, Preparation>> = {
  "automation-repair-handover": {
    en: { inputs: "For diagnosis: expected result, workflow export or source, and one failing example. Share these only after scope and handling are agreed.", access: "Appropriate test or limited access, arranged separately. We preserve the original workflow before changes; never paste credentials into the request.", after: "Stop after diagnosis or approve a bounded repair. Accepted repairs include updated source, acceptance results and operating/recovery instructions. Ongoing care is a separate capped engagement." },
    pl: { inputs: "Do diagnozy: oczekiwany wynik, eksport lub źródło procesu i jeden przykład błędu. Przekaż je dopiero po uzgodnieniu zakresu i sposobu obsługi materiałów.", access: "Odpowiedni dostęp testowy lub ograniczony ustalamy osobno. Zachowujemy oryginalny proces przed zmianami. Nigdy nie wklejaj danych logowania do formularza.", after: "Możesz zakończyć na diagnozie lub zaakceptować naprawę. Otrzymasz aktualne źródło, wyniki testów i instrukcje obsługi oraz odzyskiwania. Stała opieka wymaga osobnego zakresu z limitem godzin." },
  },
  "bounded-workflow-review": {
    en: {
      inputs: "Start with a short description of one agent action and any launch or handover date. Before the paid review, we agree a named owner, the inputs and any meetings needed.",
      access: "We agree how to inspect the action and handle evidence before you share it. The review is read-only: no platform installation, production changes or credentials through this form.",
      after: "We walk through the findings, priorities and open questions. Your team decides what to change and implements fixes; remediation and retesting require separate scope.",
    },
    pl: {
      inputs: "Zacznij od krótkiego opisu jednego działania agenta i ewentualnego terminu wdrożenia lub przekazania klientowi. Przed płatnym przeglądem uzgodnimy osobę odpowiedzialną, materiały i potrzebne spotkania.",
      access: "Zanim przekażesz materiały, uzgodnimy sposób sprawdzenia działania i obsługi dowodów. Przegląd obejmuje tylko odczyt: bez instalacji platformy, zmian produkcyjnych i przesyłania danych logowania przez formularz.",
      after: "Omówimy ustalenia, priorytety i otwarte pytania. Twój zespół podejmuje decyzje i wdraża poprawki; naprawy i ponowne testy wymagają odrębnego zakresu.",
    },
  },
  "customer-security-review-sprint": {
    en: {
      inputs: "Name the questionnaire, product and deadline first. After scope and handling are agreed, provide the questionnaire, existing evidence and an owner who can resolve open questions.",
      access: "We work from the agreed documents and evidence. No production credentials are needed through this form. We confirm any evidence access before work begins.",
      after: "You receive proposed answers, evidence references and open items. Your team checks, approves and submits the final response; acceptance by the customer is not guaranteed.",
    },
    pl: {
      inputs: "Najpierw wskaż kwestionariusz, produkt i termin. Po uzgodnieniu zakresu i sposobu obsługi przekaż kwestionariusz, istniejące materiały i wskaż osobę do wyjaśniania pytań.",
      access: "Pracujemy na uzgodnionych dokumentach i dowodach. Nie przesyłaj danych logowania do produkcji przez formularz. Dostęp do materiałów potwierdzamy przed rozpoczęciem pracy.",
      after: "Otrzymasz proponowane odpowiedzi, odwołania do materiałów i otwarte kwestie. Twój zespół sprawdza, zatwierdza i wysyła odpowiedź; nie gwarantujemy akceptacji przez klienta.",
    },
  },
  "one-server-security-check": {
    en: {
      inputs: "Describe one Linux host and what you need to decide. We agree the host, owner, checks and collection window before requesting any access.",
      access: "Only authorized, agreed read-only checks on the named host. Access and handling are arranged separately; never paste credentials into the enquiry.",
      after: "You receive findings and a walkthrough of the report and agreed package. Your team owns remediation; the review does not certify that the server is secure.",
    },
    pl: {
      inputs: "Opisz jeden serwer Linux i decyzję, którą chcesz podjąć. Zanim poprosimy o dostęp, uzgodnimy serwer, właściciela, kontrole i okno zbierania danych.",
      access: "Wyłącznie uzgodnione i autoryzowane kontrole w trybie odczytu na wskazanym serwerze. Dostęp ustalamy osobno; nigdy nie wklejaj danych logowania do zgłoszenia.",
      after: "Otrzymasz ustalenia oraz omówienie raportu i uzgodnionego pakietu. Twój zespół odpowiada za naprawy; przegląd nie certyfikuje bezpieczeństwa serwera.",
    },
  },
  "external-exposure-assessment": {
    en: {
      inputs: "Name one public-facing system and your authority to request the review. We confirm the target list, scope, collection window and start conditions asynchronously; no sales call is required.",
      access: "No login to your systems: agreed low-impact checks use the public, unauthenticated surface only. Written authority is required before testing; payment alone does not authorize it.",
      after: "A 45-minute handover explains the findings. Your team implements fixes; one focused retest of the agreed findings within 30 days is included.",
    },
    pl: {
      inputs: "Wskaż jeden system publiczny i swoje upoważnienie do zamówienia przeglądu. Listę celów, zakres, okno zbierania i warunki rozpoczęcia potwierdzimy asynchronicznie; rozmowa sprzedażowa nie jest wymagana.",
      access: "Bez logowania do Twoich systemów: uzgodnione kontrole o niskim wpływie obejmują tylko publiczną, nieuwierzytelnioną powierzchnię. Testy wymagają pisemnego upoważnienia; sama płatność go nie zastępuje.",
      after: "Ustalenia omówimy podczas 45-minutowego przekazania. Twój zespół wdraża poprawki; cena obejmuje jedno sprawdzenie uzgodnionych ustaleń w ciągu 30 dni.",
    },
  },
  "launch-readiness-check": {
    en: {
      inputs: "Name the launch, one host and the approved baseline. We agree the comparison, required inputs and collection windows before work begins.",
      access: "Agreed read-only observations of the named host and baseline. We arrange access separately and do not make production changes or approve the launch.",
      after: "Your team receives drift notes, findings and open decisions. You own the launch decision and remediation; this review does not include implementing fixes.",
    },
    pl: {
      inputs: "Wskaż wdrożenie, jeden serwer i zatwierdzony stan bazowy. Przed pracą uzgodnimy porównanie, potrzebne materiały i okna zbierania danych.",
      access: "Uzgodnione obserwacje wskazanego serwera i stanu bazowego tylko w trybie odczytu. Dostęp ustalamy osobno; nie zmieniamy produkcji ani nie zatwierdzamy wdrożenia.",
      after: "Twój zespół otrzyma opis zmian, ustalenia i otwarte decyzje. Odpowiadasz za decyzję o wdrożeniu i naprawy; przegląd nie obejmuje wdrażania poprawek.",
    },
  },
  "key-access-custody-review": {
    en: {
      inputs: "Describe the custody or access question. After scope and handling are agreed, provide sanitized control documentation and an owner for follow-up questions.",
      access: "Documentation and agreed non-secret observations only. We do not request keys or seed phrases, move funds, or inspect private balances.",
      after: "You receive findings, unsupported claims and missing evidence to address. Your team owns control changes; the report does not establish solvency or certify custody security.",
    },
    pl: {
      inputs: "Opisz pytanie dotyczące przechowywania aktywów lub dostępu. Po uzgodnieniu zakresu i obsługi przekaż oczyszczoną dokumentację kontroli i wskaż osobę do wyjaśnień.",
      access: "Tylko dokumentacja i uzgodnione obserwacje bez informacji poufnych. Nie prosimy o klucze ani frazy seed, nie przenosimy środków i nie sprawdzamy prywatnych sald.",
      after: "Otrzymasz ustalenia, niepoparte twierdzenia i braki dowodowe do uzupełnienia. Twój zespół odpowiada za zmiany kontroli; raport nie potwierdza wypłacalności ani nie certyfikuje bezpieczeństwa przechowywania.",
    },
  },
  "incident-readiness-review": {
    en: {
      inputs: "Name one incident scenario, environment and decision. We agree the documents, owners and permitted observations needed to review that scenario.",
      access: "Only the agreed documents and authorized observations. No destructive testing or production containment is included; do not send incident secrets through the enquiry.",
      after: "You receive readiness findings, missing evidence and open decisions. Your team owns plan changes and response actions; this is not an emergency incident-response service.",
    },
    pl: {
      inputs: "Wskaż jeden scenariusz incydentu, środowisko i decyzję. Uzgodnimy dokumenty, osoby odpowiedzialne i dozwolone obserwacje potrzebne do przeglądu.",
      access: "Tylko uzgodnione dokumenty i autoryzowane obserwacje. Bez testów destrukcyjnych i ograniczania incydentu w produkcji; nie wysyłaj poufnych danych incydentu w zgłoszeniu.",
      after: "Otrzymasz ustalenia dotyczące gotowości, braki dowodowe i otwarte decyzje. Twój zespół odpowiada za zmiany planu i reakcję; to nie jest usługa pilnej obsługi incydentu.",
    },
  },
  "professional-public-footprint-audit": {
    en: {
      inputs: "Confirm that this is your own professional record or provide the subject’s documented authorization. Name one professional, one primary firm and the public profiles to distinguish the right person.",
      access: "Public professional sources only. No account logins, private messages or contact with employers, clients or other people.",
      after: "You receive the private report bundle and a 60-minute review and correction session. The subject decides which public corrections to make; we do not run a reputation campaign.",
    },
    pl: {
      inputs: "Potwierdź, że przegląd dotyczy Ciebie, lub przedstaw udokumentowane upoważnienie tej osoby. Wskaż jednego profesjonalistę, jedną główną firmę i profile pozwalające odróżnić właściwą osobę.",
      access: "Wyłącznie publiczne źródła zawodowe. Bez logowania na konta, prywatnych wiadomości i kontaktowania pracodawców, klientów lub innych osób.",
      after: "Otrzymasz prywatny pakiet raportu oraz 60-minutowe omówienie i sesję korekt. Osoba badana decyduje o zmianach publicznych; nie prowadzimy kampanii reputacyjnej.",
    },
  },
};

export function servicePreparation(id: BuyerService["id"], locale: BuyerLocale) {
  const text = copy[id][locale];
  return locale === "pl"
    ? [["Co muszę przygotować?", text.inputs], ["Jaki dostęp jest potrzebny?", text.access], ["Co po otrzymaniu raportu?", text.after]] as const
    : [["What do you need from me?", text.inputs], ["What access is required?", text.access], ["What happens after delivery?", text.after]] as const;
}
