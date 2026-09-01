import type { BuyerLocale, BuyerService } from "@/lib/buyer-services";
import { PRIMARY_OFFER } from "@/lib/commercial-truth";

export type ServiceLandingCopy = {
  /** Punchy hero line under the service name (CSR-style). */
  headline: string;
  /** Who the review is for. */
  whoFor: string;
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
    sampleHref: "/review/sample-cases/customer-security-review-sprint",
    sampleLabel: "Inspect CSR sample",
  },
  "bounded-workflow-review": {
    headline: "One consequential workflow. Reconstructed so another person can inspect it.",
    whoFor:
      "Security, platform, compliance, MSSP, and AI automation teams that need one consequential agent or automation workflow reconstructed without sending secrets during the fit check.",
    deliverables: [
      "scoped reconstruction separating what was authorised, executed, observed, and still unresolved",
      "workflow and permission map",
      "evidence-gap list and proposed receipt shape",
      "sample pack that can be tested through /verify",
      "readout",
    ],
    scopeLimits: PRIMARY_OFFER.included.en,
    steps: [
      [
        "Fit check",
        "Name one consequential agentic or automated workflow, its owner, the action, and the system boundary without sending secrets.",
      ],
      [
        "Agree scope and evidence rules",
        "Confirm the named workflow, authority boundary, available evidence classes, handling rules, exclusions, and the reconstruction method.",
      ],
      [
        "Reconstruct the workflow",
        "Separate what was authorised, executed, observed, and still unresolved; map permissions and identify evidence gaps.",
      ],
      [
        "Package and read out",
        "Within 10 working days after evidence rules are agreed, deliver the reconstruction, proposed receipt shape, testable sample pack, and readout.",
      ],
    ],
    boundaries: [
      "One named agentic or automated workflow only. The exact authority, action, evidence boundary, signer, and verification mechanism are named in the engagement.",
      "A receipt proves only what its named verifier and referenced evidence support. It does not certify that the agent was correct, safe, compliant, or complete.",
      "The sample pack demonstrates the proposed receipt and verifier path. It is not customer evidence or a claim that a control has been deployed in production.",
      "Customer evidence is accepted only after scope and handling are agreed.",
    ],
    sampleHref: "/review/sample-cases/ai-agent-action-proof-run",
    sampleLabel: "Inspect synthetic agent sample",
    commercialNote: `${PRIMARY_OFFER.fitCheck.en}. ${PRIMARY_OFFER.price.en}. ${PRIMARY_OFFER.unit.en}.`,
    primaryCta: "Start a non-secret fit check",
  },
  "one-server-security-check": {
    headline: "One authorised Linux host. A clear, read-only security picture.",
    whoFor:
      "Founders and operators who need a reliable snapshot of one named Linux host before hardening, migration, a customer ask, or a deeper review — without a penetration test.",
    deliverables: [
      "posture from agreed read-only checks",
      "deterministic findings with evidence references",
      "report with named limits and unresolved items",
      "signed proof package where agreed",
      "buyer walkthrough and offline verification path",
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
      "valid on a receipt means named verifier checks passed — not that the host is secure or uncompromised.",
      "Secrets, credentials and private keys are never requested in the fit check.",
    ],
    sampleHref: "/review/sample-cases/local-server-security-review",
    sampleLabel: "Inspect local server sample",
    commercialNote: "Standard line after a non-secret fit check for one authorised host.",
    primaryCta: "Start a non-secret fit check",
  },
  "external-exposure-assessment": {
    headline: "See what the internet sees.",
    whoFor:
      "For SaaS teams facing an enterprise security request, a recent launch or infrastructure change, or an upcoming pentest.",
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
      "authority, scope, approved-check, exclusion, and stop-condition record",
      "external exposure map for the confirmed scope",
      "prioritised findings linked to observation evidence",
      "remediation guidance and explicit unknowns",
      "buyer-readable executive report and technical appendix",
      "evidence manifest and artifact hashes",
      "signed receipt and offline verifier where the supported path is produced",
      "45-minute handover and one focused retest within 30 days",
    ],
    steps: [
      ["Request", "Tell us what public-facing system you want reviewed and provide your authority to request the review. Do not send secrets or production evidence."],
      ["Scope acceptance", "WitnessOps accepts or rejects the boundary asynchronously, confirms capacity, and records payment. No sales call is required."],
      ["Review", "Use passive discovery where applicable, then perform only the explicitly approved, low-impact checks against the signed target schedule. Manually validate, deduplicate, prioritise, and link findings to evidence."],
      ["Delivery and retest", "Deliver the reports and inspection package within three working days after payment in full, an accepted SOW, written authority, fixed scope, required inputs, and the approved collection window are confirmed, then retest the agreed reported findings once within 30 days."],
    ],
    boundaries: [
      "No exploitation, authenticated application testing, password testing, brute force, credential collection, social engineering, denial of service, destructive activity, persistence, malware, customer-data collection, or data exfiltration.",
      "No source-code, mobile, smart-contract, cloud-account, IAM, private-network, provider-infrastructure, or open-ended subdomain or IP-range review.",
      "This is not a penetration test, compliance certification, security attestation, or guarantee that the system is secure, complete, compliant, or free of vulnerabilities.",
      "Targets outside the confirmed first-party scope remain untouched. Third-party or shared infrastructure requires separate written authority.",
    ],
    commercialNote:
      "€1,900 ex VAT for one authorised public-facing system. No sales call required. Payment is due in full before the delivery clock starts. Payment alone does not authorise testing. One focused retest within 30 days is included; an additional or late retest is €550 ex VAT.",
    primaryCta: "Start a review",
    sampleHref: "/review/sample-cases/external-exposure-assessment",
    sampleLabel: "Inspect synthetic sample",
  },
  "launch-readiness-check": {
    headline: "One launch host. A before-and-after readiness package against an approved baseline.",
    whoFor:
      "Teams that need a before/after decision for one launch host and an approved baseline — drift, findings and open decisions named before go-live pressure peaks.",
    deliverables: [
      "baseline and candidate snapshots for the admitted host",
      "drift notes against the approved baseline",
      "findings and open decisions list",
      "readiness report with named limits",
      "signed proof package and offline verification where agreed",
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
    primaryCta: "Start a non-secret fit check",
    sampleHref: "/review/sample-cases/launch-readiness-review",
    sampleLabel: "Inspect launch sample",
  },
  "key-access-custody-review": {
    headline: "Custody or wallet-ops controls — reviewed without keys, balances or fund movement.",
    whoFor:
      "Teams that need a proof-backed review of custody or wallet-operations controls for a customer, auditor or internal owner — without WitnessOps touching funds or secrets.",
    deliverables: [
      "sanitised posture for the admitted control surface",
      "completeness notes on what was supplied",
      "findings: supported claims vs gaps or unresolved items",
      "named exclusions and handling limits",
      "signed proof package where agreed",
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
    primaryCta: "Start a non-secret fit check",
    sampleHref: "/review/sample-cases/custody-wallet-ops-review",
    sampleLabel: "Inspect custody sample",
  },
  "incident-readiness-review": {
    headline: "One named incident scenario. A readiness package — not live incident command.",
    whoFor:
      "Security and operations teams that need a bounded readiness record for one named incident class and environment before an event — not emergency IR.",
    deliverables: [
      "sanitised readiness observations for the admitted scenario",
      "posture and findings against preparation questions",
      "unknowns, exclusions and open decisions",
      "evidence references where supplied",
      "named limits on what the review can conclude",
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
    primaryCta: "Start a non-secret fit check",
    sampleHref: "/review/sample-cases/incident-readiness-review",
    sampleLabel: "Inspect incident-readiness sample",
  },
  "professional-public-footprint-audit": {
    headline: "Know what the public record supports — and where it can mislead.",
    whoFor:
      "A professional, partner, founder or executive who wants a bounded, evidence-backed view of their own public professional footprint before clients, counterparties, referrers or automated research systems form conclusions from it.",
    deliverables: [
      "concise 3–5 page “what the internet sees” mirror",
      "canonical professional fact sheet",
      "public claim-to-evidence audit",
      "prioritised correction and clarification register",
      "private evidence appendix",
      "60-minute subject review and correction session",
      "password-protected offline report bundle",
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
    sampleHref: "/review/sample-cases/customer-security-review-sprint",
    sampleLabel: "Zobacz przykład CSR",
  },
  "bounded-workflow-review": {
    headline: "Jeden istotny workflow. Rekonstrukcja, którą może sprawdzić inna osoba.",
    whoFor:
      "Zespoły bezpieczeństwa, platform, compliance, MSSP i automatyzacji AI, które potrzebują rekonstrukcji jednego istotnego workflow agenta lub automatyzacji bez przekazywania sekretów podczas wstępnej oceny.",
    deliverables: [
      "ograniczona rekonstrukcja oddzielająca to, co zatwierdzono, wykonano, zaobserwowano i co nadal pozostaje nierozstrzygnięte",
      "mapa workflow i uprawnień",
      "lista luk dowodowych i proponowany kształt zapisu",
      "przykładowy pakiet, który można sprawdzić przez /verify",
      "omówienie wyniku",
    ],
    scopeLimits: PRIMARY_OFFER.included.pl,
    steps: [
      [
        "Wstępna ocena",
        "Nazwij jeden istotny agentowy lub zautomatyzowany workflow, jego właściciela, działanie i granicę systemu — bez wysyłania sekretów.",
      ],
      [
        "Uzgodnienie zakresu i zasad dowodowych",
        "Potwierdzamy nazwany workflow, granicę upoważnienia, dostępne klasy materiałów, zasady postępowania, wyłączenia i metodę rekonstrukcji.",
      ],
      [
        "Rekonstrukcja workflow",
        "Oddzielamy to, co zatwierdzono, wykonano, zaobserwowano i co nadal pozostaje nierozstrzygnięte; mapujemy uprawnienia i wskazujemy luki dowodowe.",
      ],
      [
        "Pakiet i omówienie",
        "W ciągu 10 dni roboczych po uzgodnieniu zasad dowodowych dostarczamy rekonstrukcję, proponowany kształt zapisu, testowalny pakiet przykładowy i omówienie.",
      ],
    ],
    boundaries: [
      "Tylko jeden nazwany agentowy lub zautomatyzowany workflow. Dokładne upoważnienie, działanie, granica dowodowa, podpisujący i mechanizm weryfikacji są nazwane w ustaleniach.",
      "Zapis dowodzi wyłącznie tego, co wspierają wskazany weryfikator i przywołane materiały. Nie certyfikuje, że agent działał poprawnie, bezpiecznie, zgodnie z wymaganiami lub kompletnie.",
      "Przykładowy pakiet pokazuje proponowany zapis i ścieżkę weryfikacji. Nie jest materiałem klienta ani twierdzeniem, że kontrolę wdrożono produkcyjnie.",
      "Materiały klienta są przyjmowane dopiero po uzgodnieniu zakresu i postępowania.",
    ],
    sampleHref: "/review/sample-cases/ai-agent-action-proof-run",
    sampleLabel: "Zobacz syntetyczny przykład agenta",
    commercialNote: `${PRIMARY_OFFER.fitCheck.pl}. ${PRIMARY_OFFER.price.pl}. ${PRIMARY_OFFER.unit.pl}.`,
    primaryCta: "Rozpocznij wstępną ocenę bez informacji poufnych",
  },
  "one-server-security-check": {
    headline: "Jeden autoryzowany host Linux. Jasny obraz bezpieczeństwa tylko do odczytu.",
    whoFor:
      "Założyciele i operatorzy, którzy potrzebują wiarygodnego snapshota jednego wskazanego hosta Linux przed hardeningiem, migracją, prośbą klienta lub głębszym przeglądem — bez testu penetracyjnego.",
    deliverables: [
      "stan z uzgodnionych kontroli tylko do odczytu",
      "deterministyczne ustalenia z odwołaniami do materiałów",
      "raport z nazwanymi limitami i otwartymi punktami",
      "podpisany pakiet, jeśli uzgodniono",
      "przewodnik kupującego i ścieżka weryfikacji offline",
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
      "valid na receipt oznacza przejście nazwanych kontroli weryfikatora — nie to, że host jest bezpieczny lub nieprzekompromitowany.",
      "Sekrety, poświadczenia i klucze prywatne nie są proszone na etapie wstępnej oceny.",
    ],
    sampleHref: "/review/sample-cases/local-server-security-review",
    sampleLabel: "Zobacz przykład serwera lokalnego",
    commercialNote:
      "Linia standardowa po wstępnej ocenie bez informacji poufnych dla jednego autoryzowanego hosta.",
    primaryCta: "Rozpocznij wstępną ocenę bez informacji poufnych",
  },
  "external-exposure-assessment": {
    headline: "Zobacz, co widzi internet.",
    whoFor:
      "Zespoły technologiczne przed uruchomieniem, klientem enterprise, audytem, zmianą infrastruktury lub głębszym testem penetracyjnym, które nie mają jasnego obrazu ekspozycji z zewnątrz.",
    scopeLimits: [
      "jeden autoryzowany system publicznie dostępny, wskazany przez domenę, host, aplikację, API, publiczny adres IP, publiczny endpoint chmurowy lub spójne połączenie tych elementów",
      "do 10 potwierdzonych hostname'ów first-party",
      "do 3 publicznych adresów IP przypisanych klientowi",
      "do 20 potwierdzonych publicznych endpointów usług",
      "Przegląd wykorzystuje pasywne wykrywanie tam, gdzie ma ono zastosowanie, a następnie jawnie zatwierdzone kontrole niskiego ryzyka zgodnie z podpisanym harmonogramem celów.",
      "Zatwierdzone klasy niskiego ryzyka obejmują DNS, TLS, HTTP(S), identyfikację usług i kontrole ekspozycji z listy dozwolonej.",
      "wyłącznie nieuwierzytelniona perspektywa z zewnątrz",
    ],
    deliverables: [
      "zapis upoważnienia, zakresu, zatwierdzonych kontroli, wyłączeń i warunków zatrzymania",
      "mapa zewnętrznej ekspozycji dla potwierdzonego zakresu",
      "priorytetyzowane ustalenia powiązane z materiałami obserwacyjnymi",
      "zalecenia naprawcze i jawne niewiadome",
      "raport wykonawczy i załącznik techniczny",
      "manifest materiałów i hashe artefaktów",
      "podpisany receipt i weryfikator offline, gdy wspierana ścieżka zostanie wytworzona",
      "45-minutowe przekazanie i jeden ukierunkowany retest w ciągu 30 dni",
    ],
    steps: [
      ["Zamówienie", "Wskaż jeden system publicznie dostępny, służbowy adres e-mail i podstawę upoważnienia. Nie wysyłaj sekretów ani materiałów produkcyjnych."],
      ["Akceptacja zakresu", "WitnessOps asynchronicznie akceptuje albo odrzuca granicę, potwierdza dostępność i zapisuje płatność. Rozmowa sprzedażowa nie jest wymagana."],
      ["Przegląd", "Tam, gdzie ma to zastosowanie, wykorzystujemy pasywne wykrywanie, a następnie wykonujemy wyłącznie jawnie zatwierdzone kontrole niskiego ryzyka zgodnie z podpisanym harmonogramem celów. Ręcznie weryfikujemy, usuwamy duplikaty, ustalamy priorytety i łączymy ustalenia z materiałami."],
      ["Dostawa i retest", "Przekazujemy raporty i pakiet do sprawdzenia w ciągu trzech dni roboczych po potwierdzeniu pełnej płatności, zaakceptowanego SOW, pisemnego upoważnienia, stałego zakresu, wymaganych danych wejściowych i zatwierdzonego okna zbierania, a następnie jeden raz ponownie testujemy uzgodnione ustalenia w ciągu 30 dni."],
    ],
    boundaries: [
      "Bez eksploatacji, uwierzytelnionych testów aplikacji, testowania haseł, brute force, zbierania poświadczeń, socjotechniki, odmowy usługi, działań destrukcyjnych, utrzymywania dostępu, malware, zbierania danych klientów i eksfiltracji danych.",
      "Bez przeglądu kodu źródłowego, aplikacji mobilnych, smart contractów, kont chmurowych, sieci wewnętrznej ani otwartego wykrywania subdomen lub zakresów IP.",
      "To nie jest test penetracyjny, certyfikacja zgodności, atest bezpieczeństwa ani gwarancja, że system jest bezpieczny, kompletny, zgodny lub wolny od podatności.",
      "Cele poza potwierdzonym zakresem first-party pozostają nietknięte. Infrastruktura strony trzeciej lub współdzielona wymaga osobnego pisemnego upoważnienia.",
    ],
    commercialNote:
      "€1 900 netto za jeden autoryzowany system publicznie dostępny. Bez rozmowy sprzedażowej. Pełna płatność jest wymagana przed rozpoczęciem terminu dostawy. Sama płatność nie upoważnia do testów. Jeden ukierunkowany retest w ciągu 30 dni jest wliczony; dodatkowy lub późny retest kosztuje €550 netto.",
    primaryCta: "Rozpocznij przegląd",
    sampleHref: "/review/sample-cases/external-exposure-assessment",
    sampleLabel: "Zobacz syntetyczny przykład",
  },
  "launch-readiness-check": {
    headline: "Jeden host startu. Pakiet gotowości before/after względem zatwierdzonej bazy.",
    whoFor:
      "Zespoły, które potrzebują decyzji before/after dla jednego hosta startu i zatwierdzonej bazy — dryf, ustalenia i otwarte decyzje nazwane zanim narasta presja go-live.",
    deliverables: [
      "migawki bazy i kandydata dla dopuszczonego hosta",
      "notatki o dryfie względem zatwierdzonej bazy",
      "lista ustaleń i otwartych decyzji",
      "raport gotowości z nazwanymi limitami",
      "podpisany pakiet i weryfikacja offline, jeśli uzgodniono",
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
    primaryCta: "Rozpocznij wstępną ocenę bez informacji poufnych",
    sampleHref: "/review/sample-cases/launch-readiness-review",
    sampleLabel: "Zobacz przykład launch",
  },
  "key-access-custody-review": {
    headline: "Kontrole custody lub wallet-ops — bez kluczy, sald i ruchu środków.",
    whoFor:
      "Zespoły, które potrzebują przeglądu z pakietem kontroli custody lub wallet-ops dla klienta, audytora lub właściciela — bez tego, by WitnessOps dotykał środków lub sekretów.",
    deliverables: [
      "zanonimizowany stan dopuszczonej powierzchni kontrolnej",
      "notatki o kompletności dostarczonych materiałów",
      "ustalenia: obsługiwane twierdzenia vs luki lub nierozwiązane",
      "nazwane wyłączenia i limity postępowania",
      "podpisany pakiet, jeśli uzgodniono",
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
    primaryCta: "Rozpocznij wstępną ocenę bez informacji poufnych",
    sampleHref: "/review/sample-cases/custody-wallet-ops-review",
    sampleLabel: "Zobacz przykład custody",
  },
  "incident-readiness-review": {
    headline: "Jeden nazwany scenariusz incydentu. Pakiet gotowości — nie żywe dowodzenie IR.",
    whoFor:
      "Zespoły security i operations, które potrzebują ograniczonego zapisu gotowości dla jednej nazwanej klasy incydentu i środowiska przed zdarzeniem — nie awaryjnego IR.",
    deliverables: [
      "zanonimizowane obserwacje gotowości dla dopuszczonego scenariusza",
      "stan i ustalenia względem pytań o przygotowanie",
      "niewiadome, wyłączenia i otwarte decyzje",
      "odwołania do materiałów, jeśli dostarczono",
      "nazwane limity tego, co przegląd może stwierdzić",
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
    primaryCta: "Rozpocznij wstępną ocenę bez informacji poufnych",
    sampleHref: "/review/sample-cases/incident-readiness-review",
    sampleLabel: "Zobacz przykład gotowości",
  },
  "professional-public-footprint-audit": {
    headline: "Sprawdź, co potwierdza publiczny obraz — i gdzie może wprowadzać w błąd.",
    whoFor:
      "Dla osoby wykonującej zawód, partnera, założyciela lub osoby zarządzającej, która chce poznać ograniczony i oparty na źródłach obraz własnego publicznego śladu zawodowego, zanim klienci, kontrahenci, osoby polecające lub systemy AI wyciągną z niego wnioski.",
    deliverables: [
      "zwięzłe, 3–5-stronicowe odzwierciedlenie „co widzi internet”",
      "kanoniczna karta faktów zawodowych",
      "audyt publicznych twierdzeń względem źródeł",
      "priorytetowy rejestr korekt i wyjaśnień",
      "prywatny załącznik dowodowy",
      "60-minutowa sesja weryfikacji i korekty z osobą objętą audytem",
      "chroniony hasłem pakiet raportów offline",
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
