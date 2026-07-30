import type { BuyerLocale, BuyerService } from "@/lib/buyer-services";

export type ServiceLandingCopy = {
  /** Punchy hero line under the service name (CSR-style). */
  headline: string;
  /** Who the review is for. */
  whoFor: string;
  /** Human deliverable lines (not raw filenames). */
  deliverables: string[];
  /** How the engagement runs. */
  steps: ReadonlyArray<readonly [string, string]>;
  /** Full boundary sentences. */
  boundaries: string[];
  /** Optional sample / example link. */
  sampleHref?: string;
  sampleLabel?: string;
  /** Commercial panel support line under price. */
  commercialNote?: string;
  /** Primary CTA label. */
  primaryCta?: string;
};

const EN: Record<BuyerService["id"], ServiceLandingCopy> = {
  "customer-security-review-sprint": {
    headline: "Send us the security questionnaire holding up your deal.",
    whoFor:
      "B2B software, SaaS, AI and technical-service companies facing a live customer security questionnaire, vendor-security review or evidence request.",
    deliverables: [
      "proposed answer matrix",
      "evidence index",
      "qualifications and unsupported-claim list",
      "open-item and owner list",
      "claim map where useful",
      "cover note for the customer or internal approver",
    ],
    steps: [
      [
        "Fit check",
        "Confirm the questionnaire, product scope, deadline, owners and handling constraints without sending secrets.",
      ],
      [
        "Scope agreement",
        "Confirm authority, inputs, price, timing, exclusions and evidence handling.",
      ],
      [
        "Review",
        "Map supplied material to questions, draft supportable answers and separate assertions, gaps and unknowns.",
      ],
      [
        "Approval package",
        "Return the package for the customer’s review and final submission.",
      ],
    ],
    boundaries: [
      "The customer owns the final answers, approvals and submission.",
      "WitnessOps does not certify compliance or guarantee that a customer, auditor or procurement team will accept the package.",
      "WitnessOps does not invent evidence or turn an unsupported claim into a supported one.",
      "Formal certifications and reports remain necessary where the reviewer requires them.",
    ],
    commercialNote: "After a non-secret fit check. One questionnaire. One product scope.",
    primaryCta: "Start a non-secret fit check",
  },
  "bounded-workflow-review": {
    headline: "One technical action that still needs a clear, checkable handover.",
    whoFor:
      "Teams that need one code change, security finding, AI-agent action, access decision or operational handoff explained with evidence references and named limits.",
    deliverables: [
      "scope map for the agreed action and system boundary",
      "evidence package with references and known gaps",
      "decision or result record",
      "receipt artifact where one is produced",
      "challenge path for third-party inspection",
    ],
    steps: [
      [
        "Fit check",
        "Describe the action and boundary in plain language without secrets.",
      ],
      [
        "Scope agreement",
        "Confirm what is included, excluded, price, timing and evidence handling.",
      ],
      [
        "Review and package",
        "Collect or review agreed evidence and assemble the bounded result.",
      ],
      [
        "Handover",
        "Deliver the package so another responsible person can inspect it and decide next steps.",
      ],
    ],
    boundaries: [
      "The exact workflow and verification mechanism are named in the engagement.",
      "A report alone is not described as independently verified unless a named verifier path is included.",
      "This is not open-ended investigation, compliance certification or a whole-environment audit.",
      "Customer evidence is accepted only after scope and handling are agreed.",
    ],
    sampleHref: "/review/sample-cases",
    sampleLabel: "View example reviews",
    commercialNote: "After a non-secret fit check for one bounded action.",
    primaryCta: "Start a non-secret fit check",
  },
  "one-server-security-check": {
    headline: "One authorised Linux server. A clear, read-only security picture.",
    whoFor:
      "Founders and operators who need a bounded check of one named server before a customer ask, launch, or internal review — without a penetration test.",
    deliverables: [
      "posture summary of agreed checks",
      "findings with severity and references",
      "report with named limits and unresolved items",
      "receipt and hash manifest where produced",
      "buyer walkthrough for inspecting the package",
    ],
    steps: [
      [
        "Fit check",
        "Name the host class and goal without sharing credentials or production secrets.",
      ],
      [
        "Scope agreement",
        "Confirm the authorised host, read-only collection window, checks and exclusions.",
      ],
      [
        "Collection and review",
        "Run agreed read-only checks and package evidence under the named boundary.",
      ],
      [
        "Handover",
        "Deliver the report and package so you can inspect what was checked and what remains open.",
      ],
    ],
    boundaries: [
      "One named server, authorised read-only collection, agreed checks and explicit exclusions.",
      "This is not a penetration test, exploitation exercise or compliance certification.",
      "Secrets, credentials and private keys are never requested in the fit check.",
      "Structural web verify applies only when the delivered receipt names a supported path.",
    ],
    sampleHref: "/review/sample-cases/local-server-security-review",
    sampleLabel: "Inspect local server sample",
    commercialNote: "Standard line after a non-secret fit check for one authorised host.",
    primaryCta: "Start a non-secret fit check",
  },
  "launch-readiness-check": {
    headline: "A release is close. You need a bounded pre-launch check and open decisions on record.",
    whoFor:
      "SaaS, protocol and product teams preparing a release who need posture, findings, drift and remaining decisions named before go-live pressure peaks.",
    deliverables: [
      "readiness report for the agreed release boundary",
      "findings and open decisions list",
      "drift notes against the candidate where in scope",
      "evidence references and named limits",
      "package or receipt path where agreed",
    ],
    steps: [
      [
        "Fit check",
        "Describe the release, systems and decision you need without sending secrets.",
      ],
      [
        "Scope agreement",
        "Confirm systems, collection window, price, timing and what “ready enough” means for this check.",
      ],
      [
        "Review",
        "Check agreed posture and changes; separate supported findings from open decisions.",
      ],
      [
        "Handover",
        "Deliver the readiness package so owners can act on remaining gaps.",
      ],
    ],
    boundaries: [
      "This is a bounded readiness review, not a guarantee that the release is defect-free or safe in every environment.",
      "No self-serve portal checkout and no secret collection in the fit check.",
      "Unapproved systems stay outside scope until authority is confirmed.",
      "Not compliance certification or continuous monitoring.",
    ],
    commercialNote: "Quoted after fit check within the public range for the agreed systems.",
    primaryCta: "Start a non-secret fit check",
  },
  "key-access-custody-review": {
    headline: "Review how keys, access or custody are documented — without exposing keys or funds.",
    whoFor:
      "Teams that must show how privileged access, key handling or custody controls are documented for a customer, auditor or internal owner.",
    deliverables: [
      "posture report for the agreed control surface",
      "evidence index of what was supplied",
      "findings: supported claims vs unsupported or unresolved items",
      "named exclusions and handling limits",
      "package path where agreed",
    ],
    steps: [
      [
        "Fit check",
        "Name the custody or access question without sending keys, seeds or recovery material.",
      ],
      [
        "Scope agreement",
        "Confirm what documentation and observations are in scope, and what must never be shared.",
      ],
      [
        "Review",
        "Map supplied material to control questions and separate supported claims from gaps.",
      ],
      [
        "Handover",
        "Deliver a report another responsible person can inspect without receiving secrets.",
      ],
    ],
    boundaries: [
      "WitnessOps does not take custody of funds or secrets.",
      "Private keys, seed phrases and recovery codes are never requested.",
      "This is not an exchange service, fund movement service or compliance certification.",
      "Only documentation and agreed non-secret observations are reviewed.",
    ],
    commercialNote: "Quoted after fit check for the agreed custody or access surface.",
    primaryCta: "Start a non-secret fit check",
  },
  "incident-readiness-review": {
    headline: "One defined incident scenario. A clear picture of preparation and open gaps.",
    whoFor:
      "Security and operations teams that need to know whether they are prepared for one named incident class — not live IR command.",
    deliverables: [
      "readiness report for the agreed scenario",
      "observed preparation vs management assertions",
      "unknowns, exclusions and open decisions",
      "evidence references where supplied",
      "named limits on what the review can conclude",
    ],
    steps: [
      [
        "Fit check",
        "Name the incident scenario and organisational boundary without sending sensitive case files.",
      ],
      [
        "Scope agreement",
        "Confirm scenario, inputs, price, timing and evidence handling.",
      ],
      [
        "Review",
        "Assess preparation against the scenario; keep unknowns and assertions distinct.",
      ],
      [
        "Handover",
        "Deliver a readiness package owners can use to close gaps before an incident.",
      ],
    ],
    boundaries: [
      "This is not emergency incident response, a 24/7 service or a guarantee of incident outcome.",
      "No hack-back, destructive testing or live incident command.",
      "Secrets and customer case material are not accepted until handling is agreed.",
      "Not compliance certification or continuous monitoring.",
    ],
    commercialNote: "Quoted after fit check for one defined scenario and boundary.",
    primaryCta: "Start a non-secret fit check",
  },
  "sbom-minimum-elements-check": {
    headline: "One software unit. A clear CISA 2026 SBOM minimum-elements checklist.",
    whoFor:
      "Product, security and procurement teams that received or produced an SBOM and need present / partial / missing / unknown fields named against the public CISA 2026 baseline.",
    deliverables: [
      "SBOM artifact in the agreed scope",
      "generation context (tool, author, scope notes)",
      "CISA 2026 minimum-elements checklist",
      "named gaps (for example missing license or hash fields)",
      "evidence manifest and package summary",
      "clear limits: not a compliance certificate",
    ],
    steps: [
      [
        "Fit check",
        "Name the software unit and SBOM format you can share after scope is agreed — no secrets.",
      ],
      [
        "Scope agreement",
        "Confirm unit, price, timing, handling and what “done” means for this checklist.",
      ],
      [
        "Review",
        "Map fields to the CISA 2026 baseline and mark present, partial, missing or unknown.",
      ],
      [
        "Handover",
        "Deliver the checklist package so another party can re-inspect gaps without overclaim.",
      ],
    ],
    boundaries: [
      "This is not CISA or federal compliance certification.",
      "This is not a vulnerability scan, KEV absence claim or exploitability opinion.",
      "Not full AI-SBOM or multi-tenant SaaS coverage unless separately scoped.",
      "Synthetic sample packages are labelled and are not live customer SBOMs.",
    ],
    sampleHref: "/review/sample-cases/sbom-cisa-2026-minimum-elements",
    sampleLabel: "Inspect SBOM sample",
    commercialNote: "From the public line after a non-secret fit check for one named software unit.",
    primaryCta: "Start a non-secret fit check",
  },
};

const PL: Record<BuyerService["id"], ServiceLandingCopy> = {
  "customer-security-review-sprint": {
    headline: "Prześlij kwestionariusz bezpieczeństwa, który blokuje transakcję.",
    whoFor:
      "Firmy B2B software, SaaS, AI i usług technicznych, które dostały kwestionariusz bezpieczeństwa klienta, ocenę dostawcy lub prośbę o materiały.",
    deliverables: [
      "proponowana macierz odpowiedzi",
      "indeks materiałów",
      "lista zastrzeżeń i nieobsługiwanych twierdzeń",
      "lista otwartych kwestii i właścicieli",
      "mapa twierdzeń, jeśli jest przydatna",
      "nota przewodnia dla klienta lub wewnętrznego zatwierdzającego",
    ],
    steps: [
      [
        "Wstępna ocena",
        "Potwierdź kwestionariusz, zakres produktu, termin, właścicieli i ograniczenia postępowania — bez wysyłania sekretów.",
      ],
      [
        "Uzgodnienie zakresu",
        "Potwierdź upoważnienie, materiały wejściowe, cenę, termin, wyłączenia i sposób postępowania z materiałami.",
      ],
      [
        "Przegląd",
        "Przypisz dostarczone materiały do pytań, przygotuj odpowiedzi możliwe do obrony i oddziel twierdzenia, luki i niewiadome.",
      ],
      [
        "Pakiet do zatwierdzenia",
        "Zwróć pakiet do przeglądu i ostatecznej wysyłki po stronie klienta.",
      ],
    ],
    boundaries: [
      "Klient odpowiada za końcowe odpowiedzi, zatwierdzenia i wysyłkę.",
      "WitnessOps nie certyfikuje zgodności i nie gwarantuje, że klient, audytor lub dział zakupów zaakceptuje pakiet.",
      "WitnessOps nie wymyśla dowodów ani nie zamienia nieobsługiwanego twierdzenia w obsługiwane.",
      "Formalne certyfikaty i raporty pozostają konieczne, gdy recenzent ich wymaga.",
    ],
    commercialNote:
      "Po wstępnej ocenie bez informacji poufnych. Jeden kwestionariusz. Jeden zakres produktu.",
    primaryCta: "Rozpocznij wstępną ocenę bez informacji poufnych",
  },
  "bounded-workflow-review": {
    headline: "Jedno działanie techniczne, które nadal wymaga jasnego przekazania.",
    whoFor:
      "Zespoły, które potrzebują wyjaśnienia jednej zmiany w kodzie, znaleziska bezpieczeństwa, działania agenta AI, decyzji o dostępie lub przekazania operacyjnego — z odwołaniami do materiałów i nazwanymi limitami.",
    deliverables: [
      "mapa zakresu uzgodnionego działania i granicy systemu",
      "pakiet materiałów z odwołaniami i znanymi lukami",
      "zapis decyzji lub wyniku",
      "artefakt receipt, jeśli powstaje",
      "ścieżka challenge do wglądu strony trzeciej",
    ],
    steps: [
      [
        "Wstępna ocena",
        "Opisz działanie i granicę prostym językiem, bez sekretów.",
      ],
      [
        "Uzgodnienie zakresu",
        "Potwierdź, co jest włączone, wyłączone, cenę, termin i sposób postępowania z materiałami.",
      ],
      [
        "Przegląd i pakiet",
        "Zbierz lub oceń uzgodnione materiały i złóż ograniczony wynik.",
      ],
      [
        "Przekazanie",
        "Dostarcz pakiet tak, aby inna odpowiedzialna osoba mogła go sprawdzić i zdecydować o kolejnych krokach.",
      ],
    ],
    boundaries: [
      "Dokładny przepływ pracy i mechanizm weryfikacji są nazwane w ustaleniach.",
      "Sam raport nie jest opisywany jako niezależnie zweryfikowany, jeśli nie ma nazwanej ścieżki weryfikatora.",
      "To nie jest otwarte śledztwo, certyfikacja zgodności ani audyt całego środowiska.",
      "Materiały klienta są przyjmowane dopiero po uzgodnieniu zakresu i postępowania.",
    ],
    sampleHref: "/review/sample-cases",
    sampleLabel: "Zobacz przykładowe przeglądy",
    commercialNote: "Po wstępnej ocenie bez informacji poufnych dla jednego ograniczonego działania.",
    primaryCta: "Rozpocznij wstępną ocenę bez informacji poufnych",
  },
  "one-server-security-check": {
    headline: "Jeden autoryzowany serwer Linux. Jasny obraz bezpieczeństwa tylko do odczytu.",
    whoFor:
      "Założyciele i operatorzy, którzy potrzebują ograniczonego sprawdzenia jednego wskazanego serwera przed prośbą klienta, startem lub przeglądem wewnętrznym — bez testu penetracyjnego.",
    deliverables: [
      "podsumowanie stanu uzgodnionych kontroli",
      "ustalenia z ważnością i odwołaniami",
      "raport z nazwanymi limitami i otwartymi punktami",
      "receipt i manifest hash, jeśli powstają",
      "przewodnik kupującego do wglądu w pakiet",
    ],
    steps: [
      [
        "Wstępna ocena",
        "Wskaż klasę hosta i cel bez udostępniania poświadczeń ani sekretów produkcyjnych.",
      ],
      [
        "Uzgodnienie zakresu",
        "Potwierdź autoryzowany host, okno zbierania tylko do odczytu, kontrole i wyłączenia.",
      ],
      [
        "Zbieranie i przegląd",
        "Wykonaj uzgodnione kontrole tylko do odczytu i spakuj materiały w nazwanej granicy.",
      ],
      [
        "Przekazanie",
        "Dostarcz raport i pakiet tak, aby dało się sprawdzić, co skontrolowano i co pozostaje otwarte.",
      ],
    ],
    boundaries: [
      "Jeden wskazany serwer, autoryzowane zbieranie tylko do odczytu, uzgodnione kontrole i jawne wyłączenia.",
      "To nie jest test penetracyjny, ćwiczenie exploitacyjne ani certyfikacja zgodności.",
      "Sekrety, poświadczenia i klucze prywatne nie są proszone na etapie wstępnej oceny.",
      "Strukturalna weryfikacja web dotyczy tylko sytuacji, gdy dostarczony receipt wskazuje obsługiwaną ścieżkę.",
    ],
    sampleHref: "/review/sample-cases/local-server-security-review",
    sampleLabel: "Zobacz przykład serwera lokalnego",
    commercialNote:
      "Linia standardowa po wstępnej ocenie bez informacji poufnych dla jednego autoryzowanego hosta.",
    primaryCta: "Rozpocznij wstępną ocenę bez informacji poufnych",
  },
  "launch-readiness-check": {
    headline: "Wydanie jest blisko. Potrzebujesz ograniczonego przeglądu przed startem i zapisu otwartych decyzji.",
    whoFor:
      "Zespoły SaaS, protokołów i produktów przygotowujące wydanie, które potrzebują nazwanego stanu, ustaleń, dryfu i pozostałych decyzji zanim narasta presja go-live.",
    deliverables: [
      "raport gotowości dla uzgodnionej granicy wydania",
      "lista ustaleń i otwartych decyzji",
      "notatki o dryfie względem kandydata, jeśli w zakresie",
      "odwołania do materiałów i nazwane limity",
      "ścieżka pakietu lub receipt, jeśli uzgodniono",
    ],
    steps: [
      [
        "Wstępna ocena",
        "Opisz wydanie, systemy i decyzję, której potrzebujesz — bez wysyłania sekretów.",
      ],
      [
        "Uzgodnienie zakresu",
        "Potwierdź systemy, okno zbierania, cenę, termin i co znaczy „wystarczająco gotowe” dla tej kontroli.",
      ],
      [
        "Przegląd",
        "Sprawdź uzgodniony stan i zmiany; oddziel potwierdzone ustalenia od otwartych decyzji.",
      ],
      [
        "Przekazanie",
        "Dostarcz pakiet gotowości, aby właściciele mogli domknąć pozostałe luki.",
      ],
    ],
    boundaries: [
      "To ograniczony przegląd gotowości, a nie gwarancja, że wydanie jest wolne od wad lub bezpieczne w każdym środowisku.",
      "Brak self-serve checkout i brak zbierania sekretów na etapie wstępnej oceny.",
      "Niezatwierdzone systemy pozostają poza zakresem do potwierdzenia upoważnienia.",
      "To nie certyfikacja zgodności ani ciągły monitoring.",
    ],
    commercialNote: "Wycena po wstępnej ocenie w publicznym zakresie dla uzgodnionych systemów.",
    primaryCta: "Rozpocznij wstępną ocenę bez informacji poufnych",
  },
  "key-access-custody-review": {
    headline: "Oceń dokumentację kluczy, dostępu lub custody — bez ujawniania kluczy ani środków.",
    whoFor:
      "Zespoły, które muszą pokazać, jak udokumentowano dostęp uprzywilejowany, obsługę kluczy lub kontrole custody dla klienta, audytora lub wewnętrznego właściciela.",
    deliverables: [
      "raport stanu uzgodnionej powierzchni kontrolnej",
      "indeks dostarczonych materiałów",
      "ustalenia: obsługiwane twierdzenia vs nieobsługiwane lub nierozwiązane",
      "nazwane wyłączenia i limity postępowania",
      "ścieżka pakietu, jeśli uzgodniono",
    ],
    steps: [
      [
        "Wstępna ocena",
        "Nazwij pytanie o custody lub dostęp bez wysyłania kluczy, seedów ani materiałów odzyskiwania.",
      ],
      [
        "Uzgodnienie zakresu",
        "Potwierdź, jaka dokumentacja i obserwacje są w zakresie oraz czego nigdy nie wolno udostępniać.",
      ],
      [
        "Przegląd",
        "Przypisz dostarczone materiały do pytań kontrolnych i oddziel obsługiwane twierdzenia od luk.",
      ],
      [
        "Przekazanie",
        "Dostarcz raport, który inna odpowiedzialna osoba może sprawdzić bez otrzymania sekretów.",
      ],
    ],
    boundaries: [
      "WitnessOps nie przejmuje środków ani sekretów.",
      "Klucze prywatne, frazy seed i kody odzyskiwania nigdy nie są proszone.",
      "To nie usługa giełdowa, ruch środków ani certyfikacja zgodności.",
      "Oceniana jest tylko dokumentacja i uzgodnione, niepoufne obserwacje.",
    ],
    commercialNote: "Wycena po wstępnej ocenie dla uzgodnionej powierzchni custody lub dostępu.",
    primaryCta: "Rozpocznij wstępną ocenę bez informacji poufnych",
  },
  "incident-readiness-review": {
    headline: "Jeden zdefiniowany scenariusz incydentu. Jasny obraz przygotowania i otwartych luk.",
    whoFor:
      "Zespoły security i operations, które chcą wiedzieć, czy są przygotowane na jedną nazwaną klasę incydentu — nie na żywe dowodzenie IR.",
    deliverables: [
      "raport gotowości dla uzgodnionego scenariusza",
      "zaobserwowane przygotowanie vs oświadczenia kierownictwa",
      "niewiadome, wyłączenia i otwarte decyzje",
      "odwołania do materiałów, jeśli dostarczono",
      "nazwane limity tego, co przegląd może stwierdzić",
    ],
    steps: [
      [
        "Wstępna ocena",
        "Nazwij scenariusz incydentu i granicę organizacyjną bez wysyłania wrażliwych akt spraw.",
      ],
      [
        "Uzgodnienie zakresu",
        "Potwierdź scenariusz, materiały wejściowe, cenę, termin i sposób postępowania z materiałami.",
      ],
      [
        "Przegląd",
        "Oceń przygotowanie względem scenariusza; trzymaj niewiadome i oświadczenia osobno.",
      ],
      [
        "Przekazanie",
        "Dostarcz pakiet gotowości, z którego właściciele mogą domykać luki przed incydentem.",
      ],
    ],
    boundaries: [
      "To nie jest awaryjna obsługa incydentu, usługa 24/7 ani gwarancja wyniku incydentu.",
      "Brak hack-back, testów destrukcyjnych ani żywego dowodzenia incydentem.",
      "Sekrety i materiały spraw klientów nie są przyjmowane, dopóki nie uzgodniono postępowania.",
      "To nie certyfikacja zgodności ani ciągły monitoring.",
    ],
    commercialNote: "Wycena po wstępnej ocenie dla jednego zdefiniowanego scenariusza i granicy.",
    primaryCta: "Rozpocznij wstępną ocenę bez informacji poufnych",
  },
  "sbom-minimum-elements-check": {
    headline: "Jedna jednostka oprogramowania. Lista kontrolna elementów minimalnych SBOM CISA 2026.",
    whoFor:
      "Zespoły product, security i zakupów, które otrzymały lub wytworzyły SBOM i potrzebują nazwania pól obecne / częściowe / brakujące / nieznane względem publicznego baseline CISA 2026.",
    deliverables: [
      "artefakt SBOM w uzgodnionym zakresie",
      "kontekst generacji (narzędzie, autor, notatki o zakresie)",
      "lista kontrolna elementów minimalnych CISA 2026",
      "nazwane luki (np. brakujące pola license lub hash)",
      "manifest materiałów i podsumowanie pakietu",
      "jasne limity: to nie certyfikat zgodności",
    ],
    steps: [
      [
        "Wstępna ocena",
        "Nazwij jednostkę oprogramowania i format SBOM, który możesz udostępnić po uzgodnieniu zakresu — bez sekretów.",
      ],
      [
        "Uzgodnienie zakresu",
        "Potwierdź jednostkę, cenę, termin, postępowanie i co znaczy „gotowe” dla tej listy kontrolnej.",
      ],
      [
        "Przegląd",
        "Przypisz pola do baseline CISA 2026 i oznacz obecne, częściowe, brakujące lub nieznane.",
      ],
      [
        "Przekazanie",
        "Dostarcz pakiet listy kontrolnej tak, aby inna strona mogła ponownie sprawdzić luki bez nadinterpretacji.",
      ],
    ],
    boundaries: [
      "To nie jest certyfikacja zgodności CISA ani federalna.",
      "To nie skan podatności, twierdzenie o braku KEV ani opinia o exploitowalności.",
      "Nie obejmuje pełnego AI-SBOM ani multi-tenant SaaS, chyba że osobno uzgodniono.",
      "Syntetyczne pakiety przykładowe są oznaczone i nie są żywymi SBOM klientów.",
    ],
    sampleHref: "/review/sample-cases/sbom-cisa-2026-minimum-elements",
    sampleLabel: "Zobacz przykład SBOM",
    commercialNote:
      "Od publicznej linii po wstępnej ocenie bez informacji poufnych dla jednej wskazanej jednostki oprogramowania.",
    primaryCta: "Rozpocznij wstępną ocenę bez informacji poufnych",
  },
};

export function getServiceLanding(
  serviceId: BuyerService["id"],
  locale: BuyerLocale,
): ServiceLandingCopy {
  if (locale === "pl") return PL[serviceId];
  return EN[serviceId];
}
