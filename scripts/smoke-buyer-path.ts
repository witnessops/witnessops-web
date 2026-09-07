type FetchLike = (
  input: string,
  init?: {
    headers?: Record<string, string>;
    redirect?: "follow";
  },
) => Promise<{
  status: number;
  text: () => Promise<string>;
}>;

export type BuyerPathSmokeRoute = {
  path: string;
  requiredMarkers: string[];
  prohibitedMarkers?: string[];
};

export type BuyerPathSmokeResult = {
  path: string;
  url: string;
  status: number;
  ok: boolean;
  missingMarkers: string[];
  prohibitedMarkersPresent: string[];
};

export const buyerPathSmokeRoutes: BuyerPathSmokeRoute[] = [
  {
    path: "/",
    requiredMarkers: ["WitnessOps", "Security &amp; Verification for AI and Automation", "Find security gaps in your AI and automation.", "Fictional example · No system tested", "The refund tool does not enforce the approval policy.", "Scope a review", "Restore a workflow"],
    prohibitedMarkers: ["VALID_SYNTHETIC_SPECIMEN", "guaranteed fix", "Agent Risk &amp; Control Review", "€1,500"],
  },
  {
    path: "/catalog/automation-repair",
    requiredMarkers: ["Automation Repair &amp; Handover", "€250 diagnosis", "€750 total including diagnosis only if", "about six total delivery hours", "No promise to fix every automation", "operating and recovery instructions", "Want someone to look after it?"],
  },
  {
    path: "/pl/catalog/automation-repair",
    requiredMarkers: ["Naprawa i przejęcie automatyzacji", "€250 za diagnozę", "€750 łącznie z diagnozą tylko wtedy", "Opisz problem"],
  },
  {
    path: "/review/request?offerId=automation-repair-handover",
    requiredMarkers: ["Automation Repair &amp; Handover", "€250 diagnosis", "What should happen, and what happens instead?", "name=\"intent\" value=\"automation-repair-handover\""],
  },
  {
    path: "/catalog",
    requiredMarkers: [
      "Automation Repair &amp; Handover", "€250 diagnosis",
      "What do you need to check?",
      "Scope a review",
      "Agent Action Security Review",
      "€2,500 fixed · excluding VAT",
      "Within 10 working days after evidence rules are agreed",
      "Review a system",
      "Customer Security Review Sprint",
      "Approximately three working days after scope, owners, required inputs and evidence access are confirmed",
      "One Server Security Check",
      "€950 standard · excluding VAT",
      "Within two business days after the authorised collection window",
      "External Attack Surface Review",
      "€1,900 · excluding VAT",
      "Within 3 working days after payment in full",
      "Launch Readiness Check",
      "Four business days after candidate collection",
      "Key, Access and Custody Review",
      "Incident Readiness Review",
      "Professional Public Footprint Audit",
      "Available by request",
      "€4,900 · excluding VAT",
      "7–10 working days",
      "Synthetic sample",
      "Scope this review",
      "Shared service principles",
    ],
    prohibitedMarkers: [
      "Agent Risk &amp; Control Review",
      "Agent Risk & Control Review",
      "From €1,500",
      "from €1,500",
      "€1,500",
      "€1 500",
      "Pilot (entry)",
      "Access Removal Proof",
      "10-Server Security Pilot",
    ],
  },
  {
    path: "/catalog/workflows",
    requiredMarkers: [
      "Agent Action Security Review",
      "Understand the controls around one AI action.",
      "Review one agent action before launch or customer handover.",
      "practical fixes for your team to prioritize",
      "€2,500 fixed · excluding VAT",
      "Non-secret fit check first",
      "One consequential agent or automation action",
      "Within 10 working days after evidence rules are agreed",
      "Authority map",
      "Execution path",
      "Permission boundary",
      "Evidence chain",
      "Control gaps and practical fixes",
      "Readout",
      "Platform installation",
      "Continuous monitoring",
      "Certification that an agent is safe",
      "Custom protocol development",
      "Multi-workflow programmes",
      "Agent Workflow Reconstruction is the delivery method",
      "Scope this review",
      "A receipt proves only what its named verifier and referenced evidence support.",
      "/verify does not accept the whole pack",
      "not customer evidence",
      "See a sample review",
    ],
    prohibitedMarkers: [
      "Agent Risk &amp; Control Review",
      "Agent Risk & Control Review",
      "From €1,500",
      "from €1,500",
      "€1,500",
      "€1 500",
      "Bounded Workflow Review",
      "certifies that the agent was correct",
    ],
  },
  {
    path: "/docs",
    requiredMarkers: [
      "Documentation",
      "Check a receipt first",
      "Try an example",
      "The default example is indeterminate",
      "were not independently checked",
      "Buyer path",
      "Start a review",
      "Verify a receipt",
      "Browse by area",
      "do not claim complete runtime truth",
    ],
  },
  {
    path: "/docs/getting-started/proof-run-buyer-path",
    requiredMarkers: [
      "Buyer path for a security or operational review",
      "Customer Security Review Sprint",
      "External Attack Surface Review",
      "View services",
      "Start a review",
      "receipt-only",
      "non-secret fit check",
      "Mailbox verification is not review start",
      "no customer evidence has been accepted",
      "Stop conditions",
      "broad compliance certification",
      "legal audit opinion",
      "Minimal buyer reading order",
      "Agent Action Security Review",
      "one consequential agent or automation action",
      "€2,500 fixed · excluding VAT",
      "within 10 working days after evidence rules are agreed",
      "secondary catalogue work at €1,900 · excluding VAT",
    ],
    prohibitedMarkers: [
      "Agent Risk &amp; Control Review",
      "Agent Risk & Control Review",
      "From €1,500",
      "from €1,500",
      "€1,500",
      "six active services",
      "Package one security workflow",
      "Access Removal Proof",
      "10-Server Security Pilot",
    ],
  },
  {
    path: "/why-witnessops",
    requiredMarkers: ["Understand the finding. Inspect the evidence. Decide what to do.", "Permissions and controls", "Company background", "not evidence of a real provider action", "Scope a review"],
    prohibitedMarkers: ["Meet Karol", "Work directly with Karol"],
  },
  {
    path: "/pl/why-witnessops",
    requiredMarkers: ["Zrozum ustalenia. Sprawdź dowody. Zdecyduj, co dalej.", "Uprawnienia i zabezpieczenia", "Informacje o firmie", "Omów zakres przeglądu"],
    prohibitedMarkers: ["Poznaj Karola", "Pracujesz bezpośrednio z Karolem"],
  },
  {
    path: "/library",
    requiredMarkers: [
      "All Skills Library",
      "Every entry is a committed SKILL.md with one exact byte sequence",
      "Open featured skill",
      "Inspect exact bytes",
      "First-party reference contracts, not customer evidence",
      "A readable contract is not a safety certification.",
      "does not establish that a resulting workflow",
      "Scope a review",
    ],
    prohibitedMarkers: [
      "The public artifact classes here are sample or intake surfaces",
      "Public verifier",
      "Security workflow buyer path",
      "Package one security workflow",
    ],
  },
  {
    path: "/library/governed-agent-verifier",
    requiredMarkers: [
      "governed-agent-verifier",
      "1.0.1",
      "Contract history",
      "Historical drift receipt",
      "Machine-readable v1.0.1 contract",
      "source and contract agreement only",
    ],
    prohibitedMarkers: [
      "Verified safe",
      "Certified safe",
      "production-deployment proof",
    ],
  },
  {
    path: "/samples/governed-agent-verifier-conformance/v1/RECEIPT.json",
    requiredMarkers: [
      "witnessops.governed-agent-verifier-conformance-receipt.v1",
      "CONTRACT_CONFORMANT_IN_SOURCE",
      "2a0b2309a1785081ecc20c7e325b3d23454b2bfd65d9641ea82164bf9298aad5",
      "ccc325d40dc89823adff2d10f81fb02aa583a4edb5fd19bb1501b8512510bdb0",
      "production deployment of this source revision",
    ],
    prohibitedMarkers: [
      "CONTRACT_CONFORMANT_IN_PRODUCTION",
      "skill is safe",
      "certified safe",
    ],
  },
  {
    path: "/support",
    requiredMarkers: [
      "Get help or start a review",
      "Ready for a bounded review?",
      "Agent Action Security Review",
      "Support is for product help, access issues, and verifier questions.",
      "Choose the right path",
      "Verify a receipt",
    ],
    prohibitedMarkers: [
      "Request an AI Agent Action Proof Run",
      "Request one proof run",
      "Package one security workflow",
    ],
  },
  {
    path: "/verify",
    requiredMarkers: [
      "Verify a WitnessOps receipt",
      "Upload a supported receipt file or paste its JSON",
      "Verify receipt",
      "Try an example",
      "indeterminate receipt-only result",
      "were not independently checked",
      "What this result means",
      "How verification works",
      "Upload receipt",
    ],
    prohibitedMarkers: [
      "verified compliance",
      "certified compliance",
      "audit-ready",
      "audit opinion provided",
      "proves compliance",
      "guarantees compliance",
      "Artifact state matrix",
      "Published first-party proof bundles",
      "Valid PV receipt",
      "Invalid QV receipt",
      "authority binding",
      "artifact-byte revalidation",
    ],
  },
  {
    path: "/pricing",
    requiredMarkers: [
      "Automation Repair &amp; Handover", "€250 diagnosis",
      "Know the scope. Know the price.",
      "Services and prices",
      "Scope a review",
      "Agent Action Security Review",
      "€2,500 fixed · excluding VAT",
      "Within 10 working days after evidence rules are agreed",
      "For public-facing systems",
      "External Attack Surface Review",
      "€1,900 · excluding VAT",
      "No sales call required.",
      "Payment is due in full before the delivery clock starts; payment alone does not authorise testing.",
      "One focused retest within 30 days is included",
      "Before work begins",
      "No work starts from this page or from payment alone.",
      "See sample",
      "Scope this review",
    ],
    prohibitedMarkers: [
      "Agent Risk &amp; Control Review",
      "Agent Risk & Control Review",
      "From €1,500",
      "from €1,500",
      "€1,500",
      "€1 500",
      "Price the package after the workflow is bounded.",
      "Workflow price anchors",
      "verified compliance",
      "certified compliance",
      "audit-ready",
      "audit opinion provided",
      "proves compliance",
      "guarantees compliance",
      "Intended standard price after validation",
      "first three accepted engagements",
      "Within 24 hours after the agreed payment condition",
      "delivery within 24 hours after accepted start conditions",
      "Full payment is recommended",
      "two €950 instalments",
      "Primary fixed-scope offer",
    ],
  },
  {
    path: "/review",
    requiredMarkers: [
      "Bounded review",
      "One bounded technical action. One scoped review package.",
      "For",
      "You get",
      "Do not submit",
      "No dashboard subscription. No vague audit promise.",
      "What the review package contains",
      "Start a review",
      "Inspect sample package",
      "Verify a receipt",
    ],
    prohibitedMarkers: [
      "Request an AI Agent Action Proof Run",
      "One security workflow in. Proof package out.",
      "Request one proof run",
      "Package one security workflow",
    ],
  },
  {
    path: "/customer-security-review",
    requiredMarkers: [
      "Customer Security Review Sprint",
      "Get the questionnaire off your desk.",
      "From €1,600 · excluding VAT",
      "Scope this review",
      "Proposed answer matrix",
      "Approximately three working days after scope, owners, required inputs and evidence access are confirmed",
      "SYNTHETIC DEMONSTRATION, NOT CUSTOMER EVIDENCE",
      "The customer owns the final answers, approvals and submission.",
    ],
    prohibitedMarkers: [
      "verified compliance",
      "certified compliance",
      "guaranteed approval",
      "security guaranteed",
      "public evidence upload",
    ],
  },
  {
    path: "/pl",
    requiredMarkers: ["Znajdź luki w bezpieczeństwie AI i automatyzacji.", "Sprawdź działanie AI", "Przywróć działanie procesu", "Fikcyjny przykład · Nie testowano systemu", "Omów zakres przeglądu"],
    prohibitedMarkers: ["VALID_SYNTHETIC_SPECIMEN", "Agent Risk &amp; Control Review", "€1 500"],
  },
  {
    path: "/pl/catalog",
    requiredMarkers: [
      "Naprawa i przejęcie automatyzacji", "€250 za diagnozę",
      "Co chcesz sprawdzić?",
      "Customer Security Review Sprint",
      "Od 7 000 zł (ok. €1 600) · bez VAT",
      "Około trzech dni roboczych po potwierdzeniu zakresu, właścicieli, wymaganych materiałów i dostępu do dowodów",
      "Sprawdź działanie AI",
      "Agent Action Security Review",
      "€2 500: cena stała · bez VAT",
      "W ciągu 10 dni roboczych po uzgodnieniu zasad dowodowych",
      "Sprawdź system",
      "One Server Security Check",
      "Standardowo 4 100 zł (ok. €950) · bez VAT",
      "External Attack Surface Review",
      "€1 900 · bez VAT",
      "W ciągu 3 dni roboczych po potwierdzeniu pełnej płatności",
      "Cztery dni robocze po zebraniu kandydata do wydania",
      "Key, Access and Custody Review",
      "Incident Readiness Review",
      "Audyt publicznego śladu zawodowego",
      "Dostępny na zapytanie",
      "4 900 EUR · bez VAT",
      "7–10 dni roboczych",
      "Omów zakres przeglądu",
    ],
    prohibitedMarkers: [
      "Co się wydarzyło?",
      "Agent Risk &amp; Control Review",
      "Agent Risk & Control Review",
      "Od 6 500 zł",
      "€1 500",
      "engage@witnessops.com",
      "gwarantujemy zatwierdzenie",
      "certyfikujemy zgodność",
      "Pilotaż przeglądu bezpieczeństwa 10 serwerów",
      "Access Removal Proof",
    ],
  },
  {
    path: "/pl/customer-security-review",
    requiredMarkers: [
      "Customer Security Review Sprint",
      "Zdejmij kwestionariusz z listy zaległości.",
      "Od 7 000 zł (ok. €1 600) · bez VAT",
      "trzech dni roboczych",
      "Omów zakres przeglądu",
      "Klient odpowiada za końcowe odpowiedzi, zatwierdzenia i wysyłkę.",
    ],
    prohibitedMarkers: [
      "verified compliance",
      "certified compliance",
      "guaranteed approval",
      "security guaranteed",
    ],
  },
  {
    path: "/pl/library",
    requiredMarkers: [
      "Biblioteka",
      "Publiczne punkty wejścia",
      "Zacznij tutaj",
      "Przeglądaj usługi",
      "Zweryfikuj zapis",
      "Rozpocznij przegląd",
    ],
    prohibitedMarkers: [
      "Package one security workflow",
    ],
  },
  {
    path: "/catalog/offsec-external-exposure",
    requiredMarkers: [
      "External Attack Surface Review",
      "See what your public-facing system exposes.",
      "Review one authorised internet-facing system.",
      "€1,900 · excluding VAT",
      "No sales call required.",
      "Within 3 working days",
      "One authorised public-facing system",
      "Inside that accepted system boundary: up to 1 registrable root domain",
      "Public cloud-hosted services can be included",
      "It uses passive discovery where applicable, followed by explicitly approved, low-impact checks against the signed target schedule.",
      "No exploitation",
      "This is not a penetration test.",
      "Scope this review",
      "See a sample review",
    ],
    prohibitedMarkers: [
      "first three accepted engagements",
      "Intended standard price",
      "Check pilot fit",
      "passive discovery plus explicitly approved low-impact",
      "Perform only the accepted passive and low-impact checks",
    ],
  },
  {
    path: "/catalog/professional-public-footprint-audit",
    requiredMarkers: [
      "Professional Public Footprint Audit",
      "Available by request",
      "€4,900 · excluding VAT",
      "7–10 working days",
      "One consenting professional",
      "public professional sources only",
      "what a defined set of public professional sources and repeatable searches supports, contradicts, leaves ambiguous or cannot establish",
      "Private-life investigation",
      "Ongoing monitoring",
      "Legal advice",
      "Request this audit",
    ],
    prohibitedMarkers: [
      "Buy now",
      "Pay now",
      "Stripe",
      "complete picture of the internet",
      "verified expertise",
      "background check",
      "reputation repair",
    ],
  },
  {
    path: "/pl/catalog/professional-public-footprint-audit",
    requiredMarkers: [
      "Audyt publicznego śladu zawodowego",
      "Dostępny na zapytanie",
      "4 900 EUR · bez VAT",
      "7–10 dni roboczych",
      "Jedna osoba, która wyraziła zgodę",
      "wyłącznie publiczne źródła zawodowe",
      "co zdefiniowany zbiór publicznych źródeł zawodowych i powtarzalnych wyszukiwań wspiera, czemu przeczy, co pozostawia niejednoznaczne lub czego nie pozwala ustalić",
      "Badanie życia prywatnego",
      "Ciągły monitoring",
      "Porady prawne",
      "Zapytaj o audyt",
    ],
    prohibitedMarkers: [
      "Kup teraz",
      "Zapłać teraz",
      "Stripe",
      "pełnego obrazu internetu",
      "zweryfikowane kompetencje",
      "background check",
      "naprawa reputacji",
    ],
  },
  {
    path: "/review/request",
    requiredMarkers: [
      "Tell us what you need reviewed",
      "Review Request",
      "Start with a short, non-secret fit check.",
      "What do you need reviewed?",
      "Situation and affected system",
      "Boundary and approval",
      "Evidence available",
      "Do not submit secrets",
      "Send fit check",
      "What the fit check establishes",
      "No work or target-facing check starts from this form.",
      "No customer evidence is accepted until scope is agreed.",
      "Not a production deployment claim.",
      "Not a legal compliance claim.",
      "Not a complete AI governance program.",
    ],
    prohibitedMarkers: [
      "Four fields.",
      "Request an access-change proof run",
      "What access change should we inspect?",
      "access-change-proof-run",
      "Package one security workflow",
      "Proof-Backed Security Workflow",
      "verified compliance",
      "certified compliance",
      "audit-ready",
      "audit opinion provided",
      "platform for AI governance",
      "proves compliance",
      "guarantees compliance",
    ],
  },
  {
    path: "/review/request?productId=OFFSEC-EXTERNAL-EXPOSURE",
    requiredMarkers: [
      "Tell us what you want to check",
      "Name the authorised internet-facing system and why its external attack surface matters now.",
      "Internet-facing system",
      "Domain, hostname, public IP, API, application, or public cloud endpoint",
      "Authority to request this review",
      "Start a review",
      "€1,900 · excluding VAT",
      "Payment is due in full before the delivery clock starts.",
      "No work or target-facing check starts from this form.",
      "External attack-surface map",
      "What the External Attack Surface Review delivers",
      "This is not a penetration test.",
    ],
    prohibitedMarkers: [
      "This form authorizes testing",
      "Pay now",
      "Upload evidence",
    ],
  },
  {
    path: "/review/request?offerId=bounded-workflow-review",
    requiredMarkers: [
      "Tell us what you want to check",
      "€2,500 fixed · excluding VAT",
      "What consequential action can the agent or automation take?",
      "What happens if it goes wrong?",
      "Which systems and tools are involved?",
      "Which security boundaries are involved?",
      "one consequential agent or automation action",
      "Non-secret fit check first",
      "Within 10 working days after evidence rules are agreed",
      "What Agent Action Security Review includes",
      'name="intent" value="bounded-workflow-review"',
      "No work or target-facing check starts from this form.",
    ],
    prohibitedMarkers: [
      "Agent Risk &amp; Control Review",
      "Agent Risk & Control Review",
      "From €1,500",
      "from €1,500",
      "€1,500",
      "€1 500",
      "What the External Attack Surface Review delivers",
      "€1,900 · excluding VAT",
    ],
  },
  {
    path: "/review/request?productId=OFFSEC-PILOT",
    requiredMarkers: [
      "Tell us what you need reviewed",
      "Start with a short, non-secret fit check.",
      "No work or target-facing check starts from this form.",
      "What the fit check establishes",
    ],
    prohibitedMarkers: [
      "Selected offer:",
      "10-Server Security Pilot",
      "Pilot (entry)",
    ],
  },
  {
    path: "/pl/review/request",
    requiredMarkers: [
      "Opowiedz, co wymaga sprawdzenia",
      "Zacznij od krótkiej, niepoufnej oceny dopasowania.",
      "Co wymaga sprawdzenia?",
      "Sytuacja i system objęty przeglądem",
      "Granica zakresu i zatwierdzenie",
      "Dostępne rodzaje materiałów",
      "Wyślij ocenę dopasowania",
      "engage@mail.witnessops.com",
    ],
    prohibitedMarkers: ["Opowiedz, co się wydarzyło"],
  },
  {
    path: "/pl/review/request?productId=OFFSEC-EXTERNAL-EXPOSURE",
    requiredMarkers: [
      "External Attack Surface Review",
      "Rozpocznij External Attack Surface Review",
      "Wskaż jeden system publicznie dostępny i podstawę upoważnienia",
      "Rozmowa sprzedażowa nie jest wymagana",
      "Formularz rozpoczyna akceptację zakresu; nie upoważnia do testów ani nie uruchamia trzydniowego terminu.",
      "Wyślij zgłoszenie do akceptacji zakresu",
      "To nie jest test penetracyjny.",
    ],
    prohibitedMarkers: [
      "Opowiedz, co wymaga sprawdzenia",
      "This form authorizes testing",
    ],
  },
  {
    path: "/pl/review/request?offerId=bounded-workflow-review",
    requiredMarkers: [
      "Opisz, co chcesz sprawdzić",
      "€2 500: cena stała · bez VAT",
      "Jakie istotne działanie może wykonać agent lub automatyzacja?",
      "Co się stanie, jeśli działanie pójdzie źle?",
      "Jakie systemy i narzędzia są zaangażowane?",
      "Jakie granice bezpieczeństwa są zaangażowane?",
      "Jedno istotne działanie agenta lub automatyzacji",
      "Najpierw wstępna ocena bez informacji poufnych",
      "W ciągu 10 dni roboczych po uzgodnieniu zasad dowodowych",
      'name="intent" value="bounded-workflow-review"',
      "Samo zgłoszenie nie rozpoczyna pracy.",
    ],
    prohibitedMarkers: [
      "Agent Risk &amp; Control Review",
      "Agent Risk & Control Review",
      "Od 6 500 zł",
      "€1 500",
      "Rozpocznij External Attack Surface Review",
      "€1 900 · bez VAT",
    ],
  },
  {
    path: "/pl/review/request?productId=OFFSEC-PILOT",
    requiredMarkers: [
      "Opowiedz, co wymaga sprawdzenia",
      "Zacznij od krótkiej, niepoufnej oceny dopasowania.",
      "Samo zgłoszenie nie rozpoczyna pracy.",
    ],
    prohibitedMarkers: [
      "Wybrana oferta:",
      "Pilotaż przeglądu bezpieczeństwa 10 serwerów",
    ],
  },
  {
    path: "/review/request/confirmed",
    requiredMarkers: [
      "WitnessOps / request record",
      "Loading the browser-held request record…",
    ],
    prohibitedMarkers: [
      "Request verified",
      "Your mailbox is verified",
      "Security workflow request",
      "access-change proof run request",
      "Access-change offer",
      "Governed Recon",
      "Scope Approval",
      "Governed Recon Results",
      "Explicit scope approval is required before governed recon starts",
      "verified compliance",
      "certified compliance",
      "audit-ready",
      "audit opinion provided",
      "platform for AI governance",
      "proves compliance",
      "guarantees compliance",
    ],
  },
  {
    path: "/pl/review/request/confirmed",
    requiredMarkers: [
      "WitnessOps / request record",
      "Wczytywanie zapisu zgłoszenia przechowywanego w przeglądarce…",
    ],
    prohibitedMarkers: [
      "Request verified",
      "Your mailbox is verified",
      "Zweryfikowane zgłoszenie",
      "Twoja skrzynka została zweryfikowana",
    ],
  },
  {
    path: "/review/sample-cases",
    requiredMarkers: [
      "Example reviews you can inspect",
      "Sample cases",
      "Compromised API key rotation",
      "SBOM field checklist (method sample)",
      "Local server security review",
      "Start a review",
      "Verify a receipt",
      "Not a legal compliance claim",
    ],
    prohibitedMarkers: [
      "Published sample cases and proof bundles",
      "Primary sample",
      "proofpack fixture",
      "Package lane",
      "Request one proof run",
      "Package one security workflow",
    ],
  },
  {
    path: "/review/sample-report",
    requiredMarkers: [
      "Sample report",
      "Illustrative sample report",
      "Not live",
      "not a live customer report",
      "not a claim of completed verification",
      "Artifact manifest",
      "Review boundary",
      "Authority map",
      "Execution path observed",
      "Evidence inspected",
      "Replayability judgment",
      "Boundary note",
      "Start a review",
    ],
    prohibitedMarkers: [
      "Request Proof Run",
      "verified compliance",
      "certified compliance",
      "audit-ready",
      "audit opinion provided",
      "proves compliance",
      "guarantees compliance",
    ],
  },
  {
    path: "/review/sample-cases/external-exposure-assessment",
    requiredMarkers: [
      "Synthetic worked example, not customer evidence.",
      "External Attack Surface Review",
      "OFFSEC-EXTERNAL-EXPOSURE",
      "Sample package files",
      "findings.json",
      "evidence-manifest.json",
      "verifier-result.json",
      "package integrity",
      "does not prove that a target is secure",
      "Start a review",
    ],
    prohibitedMarkers: [
      "assessment of WitnessOps",
      "penetration test certificate",
      "verified compliance",
      "the target is secure",
    ],
  },
  {
    path: "/review/sample-cases/approval-gated-containment",
    requiredMarkers: [
      "Approval-gated containment review",
      "Explanatory example only",
      "Not live",
      "not a live customer artifact",
      "Artifact manifest",
      "Review boundary",
      "Authority map",
      "Execution path observed",
      "Evidence inspected",
      "Replayability judgment",
      "Boundary note",
      "Start a review",
    ],
    prohibitedMarkers: [
      "Request Proof Run",
      "verified compliance",
      "certified compliance",
      "audit-ready",
      "audit opinion provided",
      "proves compliance",
      "guarantees compliance",
    ],
  },
  {
    path: "/review/sample-cases/privileged-access-grant",
    requiredMarkers: [
      "Privileged access grant review",
      "Explanatory example only",
      "Not live",
      "not a live customer artifact",
      "Artifact manifest",
      "Review boundary",
      "Authority map",
      "Execution path observed",
      "Evidence inspected",
      "Replayability judgment",
      "Boundary note",
      "Start a review",
    ],
    prohibitedMarkers: [
      "Request Proof Run",
      "verified compliance",
      "certified compliance",
      "audit-ready",
      "audit opinion provided",
      "proves compliance",
      "guarantees compliance",
    ],
  },
  {
    path: "/review/sample-cases/ai-agent-action-proof-run",
    requiredMarkers: [
      "Synthetic demo",
      "No live systems",
      "See a key rotation, step by step.",
      "checks the pinned bundle digest,",
      "Published sample, not live customer evidence",
      "No real provider, credential, compromise, customer, or",
      "Browser verification",
      "VERIFYING EXACT PUBLIC BYTES",
      "Synthetic credential rotation",
      "Northstar API (synthetic)",
      "Declared approval",
      "Play example",
      "Playback only. This click authorizes nothing",
      "Inspect the evidence",
      "Bundle SHA-256",
      "bb921133a6d06db471b0a8f5015fd6f7a734c2c1721de4e0007fa34397c11f9c",
      "Verifier SHA-256",
      "7ac872446e384f40d82eaf63e7a0d5ca4604eb06a0fdb8e872a9240400377f41",
      "d4ad234bd8152b1a01b9adc913f383d1838850b3",
      "What if the evidence changes?",
      "Try changing one byte",
      "Download files and verify offline",
      "node verify.mjs BUNDLE.wops.json DEMO_KEY_REGISTRY.json",
      "BUNDLE.wops.json",
      "verify.mjs",
      "DEMO_KEY_REGISTRY.json",
      "What this sample can show",
      "that an AI agent caused or authorized the tool calls",
      "Agent Action Security Review",
      "€2,500 fixed · excluding VAT",
      "One consequential agent or automation action",
      "Within 10 working days after evidence rules are agreed",
      "Check fit",
    ],
    prohibitedMarkers: [
      "Agent Risk &amp; Control Review",
      "Agent Risk & Control Review",
      "From €1,500",
      "from €1,500",
      "€1,500",
      "€1 500",
      "Receipt shape only",
      "receipt shape only",
      "buyer email, and urgency",
      "The key leaked.",
      "Watch the agent rotate it",
      "Credential material is suppressed at source.",
      "witnessops-sample-cases/tree/main/sample-cases/ai-agent-action-proof-run",
      "witnessops-sample-cases/blob/main/sample-cases/ai-agent-action-proof-run",
    ],
  },
];

export function normalizeBaseUrl(input: string): string {
  const url = new URL(input);
  url.pathname = url.pathname.replace(/\/+$/, "");
  url.search = "";
  url.hash = "";

  return url.toString().replace(/\/$/, "");
}

export function evaluateBuyerPathRoute(
  route: BuyerPathSmokeRoute,
  baseUrl: string,
  status: number,
  body: string,
): BuyerPathSmokeResult {
  const missingMarkers = route.requiredMarkers.filter(
    (marker) => !body.includes(marker),
  );
  const prohibitedMarkersPresent = (route.prohibitedMarkers ?? []).filter(
    (marker) => body.includes(marker),
  );

  return {
    path: route.path,
    url: new URL(route.path, `${baseUrl}/`).toString(),
    status,
    ok:
      status === 200 &&
      missingMarkers.length === 0 &&
      prohibitedMarkersPresent.length === 0,
    missingMarkers,
    prohibitedMarkersPresent,
  };
}

export async function runBuyerPathSmoke(
  baseUrl: string,
  routes: BuyerPathSmokeRoute[] = buyerPathSmokeRoutes,
  fetchImpl: FetchLike = fetch,
): Promise<BuyerPathSmokeResult[]> {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const results: BuyerPathSmokeResult[] = [];

  for (const route of routes) {
    const url = new URL(route.path, `${normalizedBaseUrl}/`).toString();
    const response = await fetchImpl(url, {
      headers: {
        "cache-control": "no-cache",
        pragma: "no-cache",
        "user-agent": "witnessops-buyer-path-smoke/1.0",
      },
      redirect: "follow",
    });
    const body = await response.text();
    results.push(
      evaluateBuyerPathRoute(route, normalizedBaseUrl, response.status, body),
    );
  }

  return results;
}

function parseArgs(argv: string[]) {
  const args = [...argv];
  let baseUrl = process.env.WITNESSOPS_SMOKE_BASE_URL ?? "https://witnessops.com";
  let json = false;

  while (args.length > 0) {
    const arg = args.shift();

    if (arg === "--") {
      continue;
    }

    if (arg === "--base-url") {
      const value = args.shift();
      if (!value) {
        throw new Error("--base-url requires a value");
      }
      baseUrl = value;
      continue;
    }

    if (arg === "--json") {
      json = true;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return { baseUrl, json };
}

function formatResult(result: BuyerPathSmokeResult): string {
  const details = [
    result.missingMarkers.length > 0
      ? `missing=${result.missingMarkers.join(", ")}`
      : null,
    result.prohibitedMarkersPresent.length > 0
      ? `prohibited=${result.prohibitedMarkersPresent.join(", ")}`
      : null,
  ].filter(Boolean);

  return [
    result.ok ? "PASS" : "FAIL",
    result.path,
    String(result.status),
    details.length > 0 ? details.join("; ") : null,
  ]
    .filter(Boolean)
    .join(" ");
}

async function main() {
  const { baseUrl, json } = parseArgs(process.argv.slice(2));
  const results = await runBuyerPathSmoke(baseUrl);
  const ok = results.every((result) => result.ok);

  if (json) {
    console.log(
      JSON.stringify(
        {
          ok,
          baseUrl: normalizeBaseUrl(baseUrl),
          results,
        },
        null,
        2,
      ),
    );
  } else {
    for (const result of results) {
      console.log(formatResult(result));
    }
  }

  if (!ok) {
    process.exitCode = 1;
  }
}

if (process.argv[1]?.endsWith("smoke-buyer-path.ts")) {
  main().catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Buyer path smoke failed.",
    );
    process.exitCode = 1;
  });
}
