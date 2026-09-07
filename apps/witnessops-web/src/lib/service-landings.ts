import type { BuyerLocale, BuyerService } from "@/lib/buyer-services";
import {
  EXTERNAL_ATTACK_SURFACE_OFFER,
  PRIMARY_OFFER,
} from "@/lib/commercial-truth";

export type ServiceLandingCopy = {
  /** Punchy hero line under the service name (CSR-style). */
  headline: string;
  /** Who the review is for. */
  whoFor: string;
  /** Essential scope shown before the expandable detail. */
  scopeNote: string;
  /** Human deliverable lines (not raw filenames). */
  deliverables: readonly string[];
  /** How the engagement runs. */
  steps: ReadonlyArray<readonly [string, string]>;
  /** Full boundary sentences. */
  boundaries: readonly string[];
  /** Fixed package limits that must remain visible on the buyer page. */
  scopeLimits?: readonly string[];
  /** Optional sample / example link. */
  sampleHref?: string;
  sampleLabel?: string;
  /** Commercial panel support line under price. */
  commercialNote?: string;
  /** Primary CTA label. */
  primaryCta?: string;
};

const EN: Record<BuyerService["id"], ServiceLandingCopy> = {
  "automation-repair-handover": {
    headline: "Restore the workflow your business relies on.",
    whoFor: "Owners, COOs, operations leads and small delivery teams with an established workflow that has failed or lost its maintainer.",
    scopeNote: "Start with paid diagnosis: one workflow, one failing path, up to three systems and two hours of investigation.",
    commercialNote: "Pilot fee. Repair is €750 total including diagnosis only if the agreed correction fits about six total delivery hours. Otherwise, stop after diagnosis or accept a separate fixed quote. Prices exclude VAT and third-party fees.",
    primaryCta: "Describe the problem",
    deliverables: ["Diagnosis: reproduced failure or a clear blocker, likely root cause and fixed quote for a bounded repair.", "Accepted repair: the agreed correction and tests of the normal path plus relevant retry, failure and human handoff.", "Evidence of the actual destination result, updated source/export and concise operating and recovery instructions.", "Dependencies, ownership and unresolved limitations, so your team can rerun the acceptance case."],
    steps: [["Describe the failure", "Tell us what should happen, what happens instead and which systems are involved. No secrets or files in the first message."], ["Diagnose · €250", "After scope and access are agreed, preserve the original source and investigate for up to two hours. You receive findings even if a repair cannot be bounded."], ["Decide on the repair", "If it fits, approve €750 total including the diagnosis already paid. Target: about six total delivery hours. Larger recovery or hardening needs a separate quote; there is no automatic next stage."], ["Restore and hand over", "Make the accepted correction, inspect the actual downstream result and test the relevant exception path. Hand over the updated workflow and instructions to operate and recover it."]],
    boundaries: ["No promise to fix every automation. Diagnosis can end with a blocker or a recommendation not to proceed.", "Production changes and test actions require agreed scope, appropriate access and your authorization before execution.", "No whole-estate cleanup, unlimited debugging, permanent credential management, 24/7 response, zero-downtime guarantee or vendor-only data recovery.", "Care, larger recovery and security review are separately scoped. No certification or assurance beyond the tested path."],
  },

  "customer-security-review-sprint": {
    headline: "Get the questionnaire off your desk.",
    whoFor: "B2B teams with a customer security questionnaire, a deadline and limited technical time.",
    scopeNote: "One questionnaire. One product. Your team approves and submits the answers.",
    deliverables: [
      "Proposed answer matrix with evidence references.",
      "Evidence index and claim map where useful.",
      "Qualifications, unsupported claims and open items with named owners.",
      "Cover note for the customer or internal approver.",
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
    primaryCta: "Scope this review",
    sampleHref: "/review/sample-cases/customer-security-review-sprint",
    sampleLabel: "See a sample response",
  },
  "bounded-workflow-review": {
    headline: "Understand the controls around one AI action.",
    whoFor: "AI product teams and automation agencies launching an agent or handing it over to a customer.",
    scopeNote: "One consequential agent or automation action. Read, inspect, reconstruct and report; no production changes or safety certification.",
    deliverables: [
      "Authority map: who can approve the action.",
      "Execution path: which identity, tools and systems act.",
      "Permission boundary: what the agent can reach.",
      "Evidence chain: what supports the outcome and what is unknown.",
      "Control gaps and practical fixes: recommended changes in priority order.",
      "Readout: findings and decisions for your team.",
    ],
    scopeLimits: [PRIMARY_OFFER.unit.en],
    steps: [
      [
        "Fit check",
        `${PRIMARY_OFFER.fitCheckQuestion.en} A short description is enough to start. Add any deadline or customer handover if known. We clarify missing details together; do not send secrets or source material.`,
      ],
      [
        "Agree scope before committing",
        "Confirm fit, the one action, fixed fee, required inputs, evidence handling and exclusions before work begins. We identify the responsible owner and agree how to inspect the action without installing a new platform.",
      ],
      [
        "Review the action path",
        `Use the ${PRIMARY_OFFER.deliveryMethod.en} method to trace authority → identity → permissions → tools → execution → evidence and identify control gaps without exploitation or production modification.`,
      ],
      [
        "Report and read out",
        "Within 10 working days after evidence rules are agreed, receive the action map, findings, prioritized fixes and readout. Each finding states what supports it and what remains unknown. Your team owns the launch decision and implementation of fixes.",
      ],
    ],
    boundaries: [
      "One consequential agent or automation action only. The engagement names the exact authority, executing identity, action, permission boundary, tools, evidence boundary, and verification mechanism.",
      PRIMARY_OFFER.defaultAuthority.en,
      "Production modification, destructive testing, exploitation, credential changes, persistence, and continuous monitoring are not included unless separately scoped and explicitly authorised.",
      "A receipt proves only what its named verifier and referenced evidence support. It does not certify that the agent was correct, safe, compliant, or complete.",
      `The ${PRIMARY_OFFER.deliveryMethod.en} method can produce an evidence-gap analysis, proposed receipt shape, and sample pack. Extract supported receipt JSON to test through /verify; /verify does not accept the whole pack. The pack is not customer evidence or a claim that a control has been deployed in production.`,
      "Customer evidence is accepted only after scope and handling are agreed.",
    ],
    sampleHref: "/catalog/workflows#sample-review",
    sampleLabel: "See a sample review",
    commercialNote: `${PRIMARY_OFFER.fitCheck.en}. ${PRIMARY_OFFER.unit.en}.`,
    primaryCta: "Scope this review",
  },
  "one-server-security-check": {
    headline: "Know what needs attention on one Linux server.",
    whoFor: "Founders and operators preparing one Linux host for hardening, migration or a customer review.",
    scopeNote: "One authorised Linux host. Read-only checks; no exploitation or guarantee that the host is secure.",
    deliverables: [
      "A snapshot from agreed read-only security checks.",
      "Findings linked to evidence, with limits and unresolved issues.",
      "A report and walkthrough; signed package and offline verification where agreed.",
    ],
    steps: [
      [
        "Fit check",
        "Name the host class and goal without sharing credentials or production secrets.",
      ],
      [
        "Authority",
        "Confirm customer authority, named host, read-only window, profile and exclusions before collection.",
      ],
      [
        "Collection and assembly",
        "Run allowlisted read-only checks and assemble the package under the admitted boundary.",
      ],
      [
        "Delivery",
        "Hand over report, package and walkthrough so another person can verify offline without trusting the operator workspace.",
      ],
    ],
    boundaries: [
      "No exploitation, secret collection, compliance certification, or host-security guarantee.",
      "One named host, authorised read-only collection, agreed checks and explicit exclusions.",
      "valid on a receipt means named verifier checks passed, not that the host is secure or uncompromised.",
      "Secrets, credentials and private keys are never requested in the fit check.",
    ],
    sampleHref: "/review/sample-cases/local-server-security-review",
    sampleLabel: "See a sample review",
    commercialNote: "Standard line after a non-secret fit check for one authorised host.",
    primaryCta: "Scope this review",
  },
  "external-exposure-assessment": {
    headline: "See what your public-facing system exposes.",
    whoFor: "SaaS and technology teams preparing for a launch, customer security review or infrastructure change.",
    scopeNote: "One authorised public-facing system. Low-impact, unauthenticated checks. This is not a penetration test.",
    scopeLimits: [
      "One authorised public-facing system, identified by a domain, application, API, public IP, or public cloud endpoint.",
      "Inside that accepted system boundary: up to 1 registrable root domain, up to 10 first-party hostnames, 3 customer-attributed public IP addresses, and 20 public service endpoints.",
      "If we discover related assets outside the agreed boundary, we can record them, but we won’t test them without explicit authorisation.",
      "Public cloud-hosted services can be included when they are reachable from the internet and belong to the agreed system. Cloud accounts, IAM, private networks, and provider infrastructure are not reviewed.",
      "It uses passive discovery where applicable, followed by explicitly approved, low-impact checks against the signed target schedule.",
      "Approved low-impact classes are DNS, TLS, HTTP(S), service-identification, and allowlisted exposure checks.",
      "unauthenticated, outside-in perspective only",
    ],
    deliverables: [
      "External attack-surface map: exposed hosts, services and endpoints.",
      "Evidence-backed findings and prioritised remediation guidance.",
      "Executive report, technical appendix and explicit unknowns.",
      "Scope and stop-condition record, evidence manifest and artifact hashes; signed receipt and offline verifier where supported.",
      "45-minute handover and one focused retest within 30 days.",
    ],
    steps: [
      ["Request", "Name the authorised internet-facing system and why the external attack surface matters now. Provide your authority to request the review, but do not send secrets or production evidence."],
      ["Scope acceptance", "WitnessOps accepts or rejects the boundary asynchronously, confirms capacity, and records payment. No sales call is required."],
      ["Review", "Use passive discovery where applicable, then perform only the explicitly approved, low-impact DNS, TLS, HTTP(S), service-identification, and allowlisted exposure checks against the signed target schedule. Manually validate, deduplicate, prioritise, and link findings to evidence."],
      ["Delivery and retest", "Deliver the reports and inspection package within three working days after payment in full, an accepted SOW, written authority, fixed scope, required inputs, and the approved collection window are confirmed, then retest the agreed reported findings once within 30 days."],
    ],
    boundaries: [
      "No exploitation, authenticated application testing, password testing, brute force, credential collection, social engineering, denial of service, destructive activity, persistence, malware, customer-data collection, or data exfiltration.",
      "No source-code, mobile, smart-contract, cloud-account, IAM, private-network, provider-infrastructure, or open-ended subdomain or IP-range review.",
      "This is not a penetration test. It is not compliance certification, a security attestation, or a guarantee that the system is secure, complete, compliant, or free of vulnerabilities.",
      "Targets outside the confirmed first-party scope remain untouched. Third-party or shared infrastructure requires separate written authority.",
    ],
    commercialNote:
      `${EXTERNAL_ATTACK_SURFACE_OFFER.price.en} for one authorised public-facing system. No sales call required. Payment is due in full before the delivery clock starts. Payment alone does not authorise testing. One focused retest within 30 days is included; an additional or late retest is ${EXTERNAL_ATTACK_SURFACE_OFFER.additionalOrLateRetestPrice.en}.`,
    primaryCta: "Request this review",
    sampleHref: "/review/sample-cases/external-exposure-assessment",
    sampleLabel: "See a sample review",
  },
  "launch-readiness-check": {
    headline: "See what changed before the launch decision.",
    whoFor: "Teams with a launch date, one host and an approved baseline to compare against.",
    scopeNote: "One host and one approved baseline. Your team owns launch approval and remediation.",
    deliverables: [
      "Baseline and candidate snapshots for one agreed host.",
      "Drift notes, findings and open launch decisions.",
      "Readiness report with limits; signed package and offline verification where agreed.",
    ],
    steps: [
      [
        "Fit check",
        "Describe the launch host, baseline and decision without sending secrets.",
      ],
      [
        "Authority",
        "Confirm scope, authorised host, collection windows, price, timing and exclusions.",
      ],
      [
        "Collection and assembly",
        "Capture agreed baseline and candidate observations; separate supported findings from open decisions.",
      ],
      [
        "Delivery",
        "Hand over the readiness package so owners can act on remaining gaps.",
      ],
    ],
    boundaries: [
      "No launch approval, security guarantee, remediation, or arbitrary cloud or source-code review.",
      "No self-serve portal checkout and no secret collection in the fit check.",
      "Unapproved systems stay outside scope until authority is confirmed.",
      "Not compliance certification or continuous monitoring.",
    ],
    commercialNote: "Quoted after fit check within the public range for the agreed host and baseline.",
    primaryCta: "Scope this review",
    sampleHref: "/review/sample-cases/launch-readiness-review",
    sampleLabel: "See a sample review",
  },
  "key-access-custody-review": {
    headline: "Know which custody controls your evidence supports.",
    whoFor: "Custody and wallet-operations teams preparing documentation for a customer, auditor or internal review.",
    scopeNote: "Documentation and agreed non-secret observations only. No keys, seed phrases, balances, fund movement or solvency claim.",
    deliverables: [
      "Review of the supplied, sanitised control documentation.",
      "Supported claims, missing evidence and unresolved questions.",
      "Findings, handling limits and exclusions; signed package where agreed.",
    ],
    steps: [
      [
        "Fit check",
        "Name the custody or wallet-ops question without sending keys, seeds, balances or recovery material.",
      ],
      [
        "Authority",
        "Confirm documentation and observation scope, and what must never be shared.",
      ],
      [
        "Review and assembly",
        "Map sanitised material to control questions; keep unsupported claims separate.",
      ],
      [
        "Delivery",
        "Hand over a package another responsible person can inspect without receiving secrets.",
      ],
    ],
    boundaries: [
      "No keys, seed phrases, balances, fund movement, taking custody, or solvency claim.",
      "Not an exchange service or compliance certification.",
      "Only documentation and agreed non-secret observations are reviewed.",
      "WitnessOps does not request private keys, seed phrases or recovery codes.",
    ],
    commercialNote: "Quoted after fit check for the agreed custody or wallet-ops surface.",
    primaryCta: "Scope this review",
    sampleHref: "/review/sample-cases/custody-wallet-ops-review",
    sampleLabel: "See a sample review",
  },
  "incident-readiness-review": {
    headline: "Find gaps in your plan for one incident scenario.",
    whoFor: "Security and operations teams preparing for one incident scenario in one environment.",
    scopeNote: "Preparation review only. No live incident command, emergency response or compromise claim.",
    deliverables: [
      "Readiness observations for one agreed incident scenario.",
      "Findings and supplied evidence references.",
      "A report of gaps, unknowns, exclusions and open decisions.",
    ],
    steps: [
      [
        "Fit check",
        "Name the incident scenario and environment without sending sensitive case files.",
      ],
      [
        "Authority",
        "Confirm scenario, inputs, price, timing and evidence handling.",
      ],
      [
        "Review and assembly",
        "Assess preparation against the scenario; keep unknowns and assertions distinct.",
      ],
      [
        "Delivery",
        "Hand over a readiness package owners can use to close gaps before an incident.",
      ],
    ],
    boundaries: [
      "No hack-back, exploitation, destructive testing or live incident command.",
      "No compromise, root-cause or attribution claim.",
      "Secrets and customer case material are not accepted until handling is agreed.",
      "Not a 24/7 service, compliance certification or continuous monitoring.",
    ],
    commercialNote: "Quoted after fit check for one defined scenario and environment.",
    primaryCta: "Scope this review",
    sampleHref: "/review/sample-cases/incident-readiness-review",
    sampleLabel: "See a sample review",
  },
  "professional-public-footprint-audit": {
    headline: "Understand your public professional record.",
    whoFor: "Professionals, founders and executives reviewing their own public record before clients or partners form an opinion.",
    scopeNote: "One consenting professional and one primary firm. Public professional sources only; no private-competence assessment or legal advice.",
    deliverables: [
      "A 3–5 page summary of what the internet shows.",
      "Professional fact sheet.",
      "Public claim-to-evidence audit.",
      "Prioritised correction and clarification register.",
      "Private evidence appendix.",
      "Password-protected offline report bundle.",
      "60-minute subject review and correction session.",
    ],
    steps: [
      [
        "Consent and fit check",
        "Confirm that the professional is ordering the review or has given documented authorisation, then name one professional and one primary firm without sending confidential material.",
      ],
      [
        "Research protocol",
        "Fix the research date, identity markers, public professional source set, repeatable searches, scope limits and stop conditions.",
      ],
      [
        "Public-evidence review",
        "Map material conclusions to attributable sources and distinguish independent support, self- or firm-published claims, reasonable inference, conflicts, stale information and what cannot be established.",
      ],
      [
        "Private handover and correction",
        "Deliver the password-protected offline bundle, review it with the subject for 60 minutes and record corrections without turning private assertions into public facts.",
      ],
    ],
    scopeLimits: [
      "One consenting professional",
      "One primary firm",
      "Public professional sources only",
      "A defined source set and repeatable searches as of the stated research date",
    ],
    boundaries: [
      "The service may be ordered only by the professional being reviewed or by an organisation with documented authorisation from that professional.",
      "No employer, client, counterparty, institution or other person is contacted.",
      "The report documents what the defined public-source protocol supports, contradicts, leaves ambiguous or cannot establish; it does not claim to cover the whole internet.",
      "Absence of public evidence is not treated as absence of experience, and public material is not treated as proof of private professional competence.",
      "The service does not provide legal advice, make hiring decisions, investigate private conduct, manage reputation campaigns or assess cybersecurity.",
    ],
    commercialNote:
      "Available by request. One consenting professional, one primary firm and public professional sources only.",
    primaryCta: "Request this audit",
  },
};

const PL: Record<BuyerService["id"], ServiceLandingCopy> = {
  "automation-repair-handover": {
    headline: "Przywróć proces, od którego zależy Twoja firma.",
    whoFor: "Właściciele firm, zespoły operacyjne i małe zespoły wdrożeniowe z ważnym procesem, który przestał działać lub stracił opiekuna.",
    scopeNote: "Zaczynamy od płatnej diagnozy: jeden proces, jedna niedziałająca ścieżka, do trzech systemów i dwóch godzin analizy.",
    commercialNote: "Cena pilotażowa. €750 łącznie z diagnozą tylko wtedy, gdy uzgodniona naprawa mieści się w około sześciu godzinach całej pracy. W innym przypadku kończymy na diagnozie lub uzgadniamy osobną wycenę. Ceny bez VAT i opłat dostawców.",
    primaryCta: "Opisz problem",
    deliverables: ["Diagnoza: odtworzony błąd lub konkretna przeszkoda, prawdopodobna przyczyna i stała wycena naprawy.", "Po akceptacji naprawy: uzgodniona poprawka i testy normalnej ścieżki oraz istotnych ponowień, błędów i przekazania człowiekowi.", "Wynik sprawdzony w systemie docelowym, aktualne źródło lub eksport oraz krótka instrukcja obsługi i odzyskiwania.", "Zależności, odpowiedzialności i pozostałe ograniczenia, aby Twój zespół mógł powtórzyć test odbioru."],
    steps: [["Opisz awarię", "Co powinno się wydarzyć, co dzieje się zamiast tego i jakie systemy uczestniczą? Bez sekretów i plików w pierwszej wiadomości."], ["Diagnoza · €250", "Po uzgodnieniu zakresu i dostępu zachowujemy oryginał i analizujemy problem przez maksymalnie dwie godziny. Otrzymasz ustalenia również wtedy, gdy nie da się wycenić ograniczonej naprawy."], ["Zdecyduj o naprawie", "Jeśli zakres pasuje, zatwierdzasz €750 łącznie z opłaconą diagnozą. Cel: około sześciu godzin całej pracy. Większe zadania wymagają osobnej wyceny."], ["Naprawa i przekazanie", "Wprowadzamy uzgodnioną poprawkę, sprawdzamy rzeczywisty wynik i istotną ścieżkę błędu. Przekazujemy aktualny proces i instrukcje obsługi oraz odzyskiwania."]],
    boundaries: ["Diagnoza może zakończyć się przeszkodą lub rekomendacją, aby nie kontynuować. Nie obiecujemy naprawy każdego procesu.", "Zmiany produkcyjne i działania testowe wymagają uzgodnionego zakresu, odpowiedniego dostępu i Twojej zgody przed wykonaniem.", "Bez porządkowania całej firmy za małą stałą cenę, nielimitowanej analizy błędów, stałego zarządzania danymi logowania, obsługi 24/7 i gwarancji braku przestojów.", "Opieka, większe zadania i przeglądy bezpieczeństwa są wyceniane osobno. Bez certyfikacji i zapewnień wykraczających poza sprawdzoną ścieżkę."],
  },

  "customer-security-review-sprint": {
    headline: "Zdejmij kwestionariusz z listy zaległości.",
    whoFor: "Zespoły B2B z kwestionariuszem bezpieczeństwa klienta, terminem i ograniczonym czasem zespołu technicznego.",
    scopeNote: "Jeden kwestionariusz. Jeden produkt. Twój zespół zatwierdza i wysyła odpowiedzi.",
    deliverables: [
      "Proponowane odpowiedzi z odwołaniami do materiałów.",
      "Indeks materiałów i mapa twierdzeń, jeśli przydatna.",
      "Zastrzeżenia, niepoparte twierdzenia i otwarte kwestie z przypisanymi osobami.",
      "Nota przewodnia dla klienta lub osoby zatwierdzającej.",
    ],
    steps: [
      [
        "Wstępna ocena",
        "Potwierdź kwestionariusz, zakres produktu, termin, właścicieli i ograniczenia postępowania, bez wysyłania sekretów.",
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
    primaryCta: "Omów zakres przeglądu",
    sampleHref: "/review/sample-cases/customer-security-review-sprint",
    sampleLabel: "Zobacz przykładowe odpowiedzi (EN)",
  },
  "bounded-workflow-review": {
    headline: "Poznaj zabezpieczenia jednego działania AI.",
    whoFor: "Zespoły tworzące produkty AI i agencje automatyzacji przed wdrożeniem agenta lub przekazaniem klientowi.",
    scopeNote: "Jedno istotne działanie agenta lub automatyzacji. Odczyt, inspekcja, rekonstrukcja i raport; bez zmian produkcyjnych i certyfikacji bezpieczeństwa.",
    deliverables: [
      "Mapa upoważnień: kto może zatwierdzić działanie.",
      "Ścieżka wykonania: tożsamość, narzędzia i systemy.",
      "Granica uprawnień: do czego agent ma dostęp.",
      "Łańcuch dowodowy: co wspiera wynik, a co pozostaje nieznane.",
      "Luki kontrolne i praktyczne poprawki: zmiany według priorytetu.",
      "Omówienie wyniku: ustalenia i decyzje dla zespołu.",
    ],
    scopeLimits: [PRIMARY_OFFER.unit.pl],
    steps: [
      [
        "Wstępna ocena",
        `${PRIMARY_OFFER.fitCheckQuestion.pl} Na początek wystarczy krótki opis. Jeśli znasz termin wdrożenia lub przekazania klientowi, dodaj go. Brakujące szczegóły wyjaśnimy razem; nie wysyłaj sekretów ani materiałów źródłowych.`,
      ],
      [
        "Uzgodnienie zakresu przed decyzją",
        "Przed pracą potwierdzamy dopasowanie, jedno działanie, stałą cenę, wymagane materiały, sposób ich obsługi i wyłączenia. Wskazujemy odpowiedzialną osobę i uzgadniamy sposób przeglądu bez instalowania nowej platformy.",
      ],
      [
        "Przegląd ścieżki wykonania",
        `Metodą ${PRIMARY_OFFER.deliveryMethod.pl} analizujemy ciąg: upoważnienie → tożsamość → uprawnienia → narzędzia → wykonanie → dowody i wskazujemy luki kontrolne bez eksploatacji ani modyfikacji produkcji.`,
      ],
      [
        "Raport i omówienie",
        "W ciągu 10 dni roboczych po uzgodnieniu zasad dowodowych otrzymasz mapę działania, ustalenia, poprawki według priorytetu i omówienie. Każde ustalenie wskazuje materiały, które je wspierają, oraz niewiadome. Decyzja o wdrożeniu i realizacja poprawek należą do Twojego zespołu.",
      ],
    ],
    boundaries: [
      "Tylko jedno istotne działanie agenta lub automatyzacji. Ustalenia wskazują dokładne upoważnienie, tożsamość wykonującą, działanie, granicę uprawnień, narzędzia, granicę dowodową i mechanizm weryfikacji.",
      PRIMARY_OFFER.defaultAuthority.pl,
      "Modyfikacje produkcyjne, testy destrukcyjne, eksploatacja, zmiany danych uwierzytelniających, utrzymywanie dostępu i ciągły monitoring nie są objęte ofertą, chyba że zostaną osobno określone i wyraźnie autoryzowane.",
      "Zapis dowodzi wyłącznie tego, co wspierają wskazany weryfikator i przywołane materiały. Nie certyfikuje, że agent działał poprawnie, bezpiecznie, zgodnie z wymaganiami lub kompletnie.",
      `Metoda ${PRIMARY_OFFER.deliveryMethod.pl} może obejmować analizę luk dowodowych, proponowany kształt zapisu i przykładowy pakiet. Przez /verify sprawdza się wyodrębniony, obsługiwany zapis JSON, a nie cały pakiet. Pakiet nie jest materiałem klienta ani twierdzeniem, że kontrolę wdrożono produkcyjnie.`,
      "Materiały klienta są przyjmowane dopiero po uzgodnieniu zakresu i postępowania.",
    ],
    sampleHref: "/catalog/workflows#sample-review",
    sampleLabel: "Zobacz przykładowy przegląd (EN)",
    commercialNote: `${PRIMARY_OFFER.fitCheck.pl}. ${PRIMARY_OFFER.unit.pl}.`,
    primaryCta: "Omów zakres przeglądu",
  },
  "one-server-security-check": {
    headline: "Sprawdź, co poprawić na serwerze.",
    whoFor: "Założyciele i operatorzy przygotowujący serwer Linux do wzmocnienia zabezpieczeń, migracji lub przeglądu klienta.",
    scopeNote: "Jeden autoryzowany host Linux. Tylko odczyt, bez eksploatacji i gwarancji bezpieczeństwa hosta.",
    deliverables: [
      "Stan zabezpieczeń z uzgodnionych kontroli tylko do odczytu.",
      "Ustalenia ze źródłami, ograniczeniami i otwartymi kwestiami.",
      "Raport i omówienie; podpisany pakiet i weryfikacja offline, jeśli uzgodniono.",
    ],
    steps: [
      [
        "Wstępna ocena",
        "Wskaż klasę hosta i cel bez udostępniania poświadczeń ani sekretów produkcyjnych.",
      ],
      [
        "Upoważnienie",
        "Potwierdź upoważnienie klienta, wskazany host, okno tylko do odczytu, profil i wyłączenia przed zbieraniem.",
      ],
      [
        "Zbieranie i złożenie",
        "Wykonaj allowlisted kontrole tylko do odczytu i złóż pakiet w dopuszczonej granicy.",
      ],
      [
        "Dostawa",
        "Przekaż raport, pakiet i przewodnik tak, aby inna osoba mogła zweryfikować offline bez zaufania do workspace operatora.",
      ],
    ],
    boundaries: [
      "Bez eksploatacji, zbierania sekretów, certyfikacji zgodności i gwarancji, że host jest bezpieczny.",
      "Jeden wskazany host, autoryzowane zbieranie tylko do odczytu, uzgodnione kontrole i jawne wyłączenia.",
      "valid na receipt oznacza przejście nazwanych kontroli weryfikatora, nie to, że host jest bezpieczny lub nieprzekompromitowany.",
      "Sekrety, poświadczenia i klucze prywatne nie są proszone na etapie wstępnej oceny.",
    ],
    sampleHref: "/review/sample-cases/local-server-security-review",
    sampleLabel: "Zobacz przykładowy przegląd (EN)",
    commercialNote:
      "Linia standardowa po wstępnej ocenie bez informacji poufnych dla jednego autoryzowanego hosta.",
    primaryCta: "Omów zakres przeglądu",
  },
  "external-exposure-assessment": {
    headline: "Sprawdź, co nie powinno być publiczne.",
    whoFor: "Zespoły SaaS i technologiczne przed wdrożeniem, przeglądem bezpieczeństwa klienta lub zmianą infrastruktury.",
    scopeNote: "Jeden autoryzowany system publiczny. Kontrole o niskim wpływie, bez logowania. To nie jest test penetracyjny.",
    scopeLimits: [
      "jeden autoryzowany system publicznie dostępny, wskazany przez domenę, host, aplikację, API, publiczny adres IP, publiczny endpoint chmurowy lub spójne połączenie tych elementów",
      "do 1 rejestrowalnej domeny głównej",
      "do 10 potwierdzonych hostname'ów first-party",
      "do 3 publicznych adresów IP przypisanych klientowi",
      "do 20 potwierdzonych publicznych endpointów usług",
      "Usługi hostowane w chmurze mogą wejść w zakres, jeśli są dostępne z internetu i należą do uzgodnionego systemu. Konta chmurowe, IAM, sieci prywatne i infrastruktura dostawcy pozostają poza zakresem.",
      "Przegląd wykorzystuje pasywne wykrywanie tam, gdzie ma ono zastosowanie, a następnie jawnie zatwierdzone kontrole niskiego ryzyka zgodnie z podpisanym harmonogramem celów.",
      "Zatwierdzone klasy niskiego ryzyka obejmują DNS, TLS, HTTP(S), identyfikację usług i kontrole ekspozycji z listy dozwolonej.",
      "wyłącznie nieuwierzytelniona perspektywa z zewnątrz",
    ],
    deliverables: [
      "Mapa zewnętrznej powierzchni ataku: publiczne hosty, usługi i endpointy.",
      "Ustalenia ze źródłami i priorytety napraw.",
      "Raport dla osób decyzyjnych, załącznik techniczny i jawne niewiadome.",
      "Zapis zakresu i warunków zatrzymania, manifest i skróty plików; podpisany zapis i weryfikator offline, jeśli obsługiwane.",
      "45-minutowe omówienie i jedno sprawdzenie poprawek w ciągu 30 dni.",
    ],
    steps: [
      ["Zamówienie", "Wskaż autoryzowany system dostępny z internetu i powód, dla którego jego zewnętrzna powierzchnia ataku ma teraz znaczenie. Podaj podstawę upoważnienia, ale nie wysyłaj sekretów ani materiałów produkcyjnych."],
      ["Akceptacja zakresu", "WitnessOps asynchronicznie akceptuje albo odrzuca granicę, potwierdza dostępność i zapisuje płatność. Rozmowa sprzedażowa nie jest wymagana."],
      ["Przegląd", "Tam, gdzie ma to zastosowanie, wykorzystujemy pasywne wykrywanie, a następnie wykonujemy wyłącznie jawnie zatwierdzone kontrole niskiego ryzyka zgodnie z podpisanym harmonogramem celów. Ręcznie weryfikujemy, usuwamy duplikaty, ustalamy priorytety i łączymy ustalenia z materiałami."],
      ["Dostawa i retest", "Przekazujemy raporty i pakiet do sprawdzenia w ciągu trzech dni roboczych po potwierdzeniu pełnej płatności, zaakceptowanego SOW, pisemnego upoważnienia, stałego zakresu, wymaganych danych wejściowych i zatwierdzonego okna zbierania, a następnie jeden raz ponownie testujemy uzgodnione ustalenia w ciągu 30 dni."],
    ],
    boundaries: [
      "Bez eksploatacji, uwierzytelnionych testów aplikacji, testowania haseł, brute force, zbierania poświadczeń, socjotechniki, odmowy usługi, działań destrukcyjnych, utrzymywania dostępu, malware, zbierania danych klientów i eksfiltracji danych.",
      "Bez przeglądu kodu źródłowego, aplikacji mobilnych, smart contractów, kont chmurowych, sieci wewnętrznej ani otwartego wykrywania subdomen lub zakresów IP.",
      "To nie jest test penetracyjny. Nie jest to również certyfikacja zgodności, atest bezpieczeństwa ani gwarancja, że system jest bezpieczny, kompletny, zgodny lub wolny od podatności.",
      "Cele poza potwierdzonym zakresem first-party pozostają nietknięte. Infrastruktura strony trzeciej lub współdzielona wymaga osobnego pisemnego upoważnienia.",
    ],
    commercialNote:
      `${EXTERNAL_ATTACK_SURFACE_OFFER.price.pl} za jeden autoryzowany system publicznie dostępny. Bez rozmowy sprzedażowej. Pełna płatność jest wymagana przed rozpoczęciem terminu dostawy. Sama płatność nie upoważnia do testów. Jeden ukierunkowany retest w ciągu 30 dni jest wliczony; dodatkowy lub późny retest kosztuje ${EXTERNAL_ATTACK_SURFACE_OFFER.additionalOrLateRetestPrice.pl}.`,
    primaryCta: "Zapytaj o przegląd",
    sampleHref: "/review/sample-cases/external-exposure-assessment",
    sampleLabel: "Zobacz przykładowy przegląd (EN)",
  },
  "launch-readiness-check": {
    headline: "Sprawdź zmiany przed wdrożeniem.",
    whoFor: "Zespoły z terminem wdrożenia, jednym serwerem i zatwierdzonym stanem odniesienia.",
    scopeNote: "Jeden host i zatwierdzony stan odniesienia. Zatwierdzenie wdrożenia i poprawki należą do Twojego zespołu.",
    deliverables: [
      "Migawki uzgodnionego stanu odniesienia i wersji przed wdrożeniem.",
      "Opis zmian, ustalenia i otwarte decyzje.",
      "Raport z ograniczeniami; podpisany pakiet i weryfikacja offline, jeśli uzgodniono.",
    ],
    steps: [
      [
        "Wstępna ocena",
        "Opisz host startu, bazę i decyzję bez wysyłania sekretów.",
      ],
      [
        "Upoważnienie",
        "Potwierdź zakres, autoryzowany host, okna zbierania, cenę, termin i wyłączenia.",
      ],
      [
        "Zbieranie i złożenie",
        "Zbierz uzgodnione obserwacje bazy i kandydata; oddziel potwierdzone ustalenia od otwartych decyzji.",
      ],
      [
        "Dostawa",
        "Przekaż pakiet gotowości, aby właściciele mogli domknąć pozostałe luki.",
      ],
    ],
    boundaries: [
      "Bez zatwierdzenia launch, gwarancji bezpieczeństwa, remediacji ani dowolnego przeglądu chmury lub kodu.",
      "Brak self-serve checkout i brak zbierania sekretów na etapie wstępnej oceny.",
      "Niezatwierdzone systemy pozostają poza zakresem do potwierdzenia upoważnienia.",
      "To nie certyfikacja zgodności ani ciągły monitoring.",
    ],
    commercialNote: "Wycena po wstępnej ocenie w publicznym zakresie dla uzgodnionego hosta i bazy.",
    primaryCta: "Omów zakres przeglądu",
    sampleHref: "/review/sample-cases/launch-readiness-review",
    sampleLabel: "Zobacz przykładowy przegląd (EN)",
  },
  "key-access-custody-review": {
    headline: "Uporządkuj obraz kontroli nad aktywami.",
    whoFor: "Zespoły operacji powierniczych i obsługi portfeli przygotowujące dokumentację dla klienta, audytora lub osoby odpowiedzialnej.",
    scopeNote: "Tylko dokumentacja i uzgodnione niepoufne obserwacje. Bez kluczy, fraz seed, sald, ruchu środków i oceny wypłacalności.",
    deliverables: [
      "Przegląd dostarczonej dokumentacji kontroli bez danych poufnych.",
      "Poparte twierdzenia, brakujące dowody i otwarte pytania.",
      "Ustalenia, zasady obsługi i wyłączenia; podpisany pakiet, jeśli uzgodniono.",
    ],
    steps: [
      [
        "Wstępna ocena",
        "Nazwij pytanie o custody lub wallet-ops bez wysyłania kluczy, seedów, sald ani materiałów odzyskiwania.",
      ],
      [
        "Upoważnienie",
        "Potwierdź zakres dokumentacji i obserwacji oraz to, czego nigdy nie wolno udostępniać.",
      ],
      [
        "Przegląd i złożenie",
        "Przypisz zanonimizowane materiały do pytań kontrolnych; trzymaj nieobsługiwane twierdzenia osobno.",
      ],
      [
        "Dostawa",
        "Przekaż pakiet, który inna odpowiedzialna osoba sprawdzi bez otrzymania sekretów.",
      ],
    ],
    boundaries: [
      "Bez kluczy, fraz seed, sald, ruchu środków, przejmowania custody i twierdzeń o wypłacalności.",
      "To nie usługa giełdowa ani certyfikacja zgodności.",
      "Oceniana jest tylko dokumentacja i uzgodnione niepoufne obserwacje.",
      "WitnessOps nie prosi o klucze prywatne, frazy seed ani kody odzyskiwania.",
    ],
    commercialNote: "Wycena po wstępnej ocenie dla uzgodnionej powierzchni custody lub wallet-ops.",
    primaryCta: "Omów zakres przeglądu",
    sampleHref: "/review/sample-cases/custody-wallet-ops-review",
    sampleLabel: "Zobacz przykładowy przegląd (EN)",
  },
  "incident-readiness-review": {
    headline: "Poznaj braki przed incydentem.",
    whoFor: "Zespoły bezpieczeństwa i operacji przygotowujące się do jednego scenariusza incydentu w jednym środowisku.",
    scopeNote: "Przegląd przygotowania. Bez dowodzenia incydentem na żywo, interwencji awaryjnej i twierdzeń o naruszeniu.",
    deliverables: [
      "Obserwacje gotowości dla uzgodnionego scenariusza.",
      "Ustalenia i odwołania do dostarczonych źródeł.",
      "Raport braków, niewiadomych, wyłączeń i otwartych decyzji.",
    ],
    steps: [
      [
        "Wstępna ocena",
        "Nazwij scenariusz incydentu i środowisko bez wysyłania wrażliwych akt spraw.",
      ],
      [
        "Upoważnienie",
        "Potwierdź scenariusz, materiały wejściowe, cenę, termin i sposób postępowania z materiałami.",
      ],
      [
        "Przegląd i złożenie",
        "Oceń przygotowanie względem scenariusza; trzymaj niewiadome i oświadczenia osobno.",
      ],
      [
        "Dostawa",
        "Przekaż pakiet gotowości, z którego właściciele domykają luki przed incydentem.",
      ],
    ],
    boundaries: [
      "Bez hack-back, eksploatacji, testów destrukcyjnych i żywego dowodzenia incydentem.",
      "Bez twierdzeń o kompromisie, przyczynie źródłowej lub atrybucji.",
      "Sekrety i materiały spraw klientów nie są przyjmowane, dopóki nie uzgodniono postępowania.",
      "To nie usługa 24/7, certyfikacja zgodności ani ciągły monitoring.",
    ],
    commercialNote: "Wycena po wstępnej ocenie dla jednego zdefiniowanego scenariusza i środowiska.",
    primaryCta: "Omów zakres przeglądu",
    sampleHref: "/review/sample-cases/incident-readiness-review",
    sampleLabel: "Zobacz przykładowy przegląd (EN)",
  },
  "professional-public-footprint-audit": {
    headline: "Zobacz swój profil oczami klienta.",
    whoFor: "Specjaliści, założyciele i menedżerowie sprawdzający własny publiczny profil przed oceną klienta lub partnera.",
    scopeNote: "Jedna osoba za jej zgodą i jedna główna firma. Tylko publiczne źródła zawodowe; bez oceny prywatnych kompetencji i porady prawnej.",
    deliverables: [
      "3–5 stron podsumowania tego, co pokazuje internet.",
      "Karta faktów zawodowych.",
      "Porównanie publicznych twierdzeń ze źródłami.",
      "Lista korekt i wyjaśnień według priorytetu.",
      "Prywatny załącznik źródłowy.",
      "Pakiet raportu offline chroniony hasłem.",
      "60-minutowe omówienie i sesja korekt.",
    ],
    steps: [
      [
        "Zgoda i ocena dopasowania",
        "Potwierdź, że przegląd zamawia osoba, której dotyczy, albo że udzieliła udokumentowanego upoważnienia, a następnie wskaż jedną osobę i jedną główną firmę bez przesyłania materiałów poufnych.",
      ],
      [
        "Protokół badawczy",
        "Ustal datę badania, identyfikatory osoby, zbiór publicznych źródeł zawodowych, powtarzalne wyszukiwania, granice zakresu i warunki zatrzymania.",
      ],
      [
        "Przegląd publicznych źródeł",
        "Przypisz istotne wnioski do źródeł i rozróżnij niezależne potwierdzenie, twierdzenia własne lub firmowe, rozsądne wnioskowanie, konflikty, nieaktualne informacje oraz kwestie niemożliwe do ustalenia.",
      ],
      [
        "Prywatne przekazanie i korekta",
        "Przekaż chroniony hasłem pakiet offline, omów go z osobą objętą audytem podczas 60-minutowej sesji i zapisz korekty bez przedstawiania prywatnych oświadczeń jako publicznych faktów.",
      ],
    ],
    scopeLimits: [
      "Jedna osoba, która wyraziła zgodę",
      "Jedna główna firma",
      "Wyłącznie publiczne źródła zawodowe",
      "Zdefiniowany zbiór źródeł i powtarzalne wyszukiwania na wskazany dzień badania",
    ],
    boundaries: [
      "Usługę może zamówić wyłącznie osoba objęta audytem albo organizacja posiadająca jej udokumentowane upoważnienie.",
      "Nie kontaktujemy się z pracodawcami, klientami, kontrahentami, instytucjami ani innymi osobami.",
      "Raport dokumentuje, co wspiera, czemu przeczy, co pozostawia niejednoznaczne lub czego nie pozwala ustalić zdefiniowany protokół publicznych źródeł; nie twierdzi, że obejmuje cały internet.",
      "Brak publicznych źródeł nie jest traktowany jako brak doświadczenia, a materiały publiczne nie są traktowane jako dowód prywatnych kompetencji zawodowych.",
      "Usługa nie zapewnia porad prawnych, nie służy do podejmowania decyzji o zatrudnieniu, nie bada prywatnego postępowania, nie prowadzi kampanii zarządzania reputacją ani nie ocenia cyberbezpieczeństwa.",
    ],
    commercialNote:
      "Dostępny na zapytanie. Jedna osoba, która wyraziła zgodę, jedna główna firma i wyłącznie publiczne źródła zawodowe.",
    primaryCta: "Zapytaj o audyt",
  },
};

export function getServiceLanding(
  serviceId: BuyerService["id"],
  locale: BuyerLocale,
): ServiceLandingCopy {
  if (locale === "pl") return PL[serviceId];
  return EN[serviceId];
}
