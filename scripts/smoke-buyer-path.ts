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
    requiredMarkers: [
      "WitnessOps",
      "Agents act. WitnessOps proves.",
      "Proof infrastructure for agentic operations",
      "Run and verify the compromised API key rotation demo",
      "Verified synthetic specimen — not live customer evidence",
      "witnessops/witnessops-sample-cases",
      "d4ad234bd815",
      "9d8668507f3da027886a1847a92b705671063ed89cbb354d45909c119bb414e7",
      "VALID_SYNTHETIC_SPECIMEN",
      "Five questions. One bounded workflow.",
      "What was authorized?",
      "What was executed?",
      "What was observed?",
      "What remains unresolved?",
      "How can it be challenged?",
      "Check the agent before it acts",
      "Open a public SKILL.md and check its exact bytes locally in your browser.",
      "/verify/skill",
      "Agent Risk &amp; Control Review",
      "Review the workflow, not only the file.",
      "Workflow and permission map",
      "Approval and evidence-gap analysis",
      "Proposed receipt and verifier path",
      "Sample package and control recommendations",
      "From €1,500",
      "A practical handover that separates supported observations, unresolved gaps",
      "A receipt is only as strong as its named evidence and verifier.",
      "Bring one consequential workflow. Make its authority and evidence reviewable.",
      "Bring one agentic workflow",
    ],
    prohibitedMarkers: [
      "Current paid entry point",
      "Public Exposure Review",
      "Bounded Workflow Review",
      "Signed receipts and external verification",
      "Every consequential agent action gets a verifiable receipt",
      "Check a skill",
      "Aegis",
    ],
  },
  {
    path: "/catalog",
    requiredMarkers: [
      "Start with the situation you need to resolve.",
      "Customer Security Review Sprint",
      "Approximately three working days after scope, owners, required inputs and evidence access are confirmed",
      "Agent Risk &amp; Control Review",
      "One Server Security Check",
      "€950 standard after a non-secret fit check",
      "Within two business days after the authorised collection window",
      "Public Exposure Review",
      "€1,900 ex VAT — one authorised public-facing system",
      "Within 3 working days after payment in full",
      "Launch Readiness Check",
      "Four business days after candidate collection",
      "Key, Access and Custody Review",
      "Incident Readiness Review",
      "Professional Public Footprint Audit",
      "Available by request",
      "€4,900 excluding VAT",
      "7–10 working days",
      "Synthetic sample",
      "Start a review",
      "Shared service principles",
    ],
    prohibitedMarkers: ["Pilot (entry)", "Access Removal Proof", "10-Server Security Pilot"],
  },
  {
    path: "/catalog/workflows",
    requiredMarkers: [
      "Agent Risk &amp; Control Review",
      "Bring one agentic workflow. We’ll show you what proof is missing.",
      "One agentic or automated workflow needs a defensible authority, control, evidence, receipt, and verification path",
      "From €1,500",
      "Security teams, platform teams, compliance teams, MSSPs, and AI automation teams",
      "agent and tool permission model",
      "approval and policy gap analysis",
      "receipt schema",
      "sample proof bundle",
      "verifier path",
      "control recommendations",
      "Map authority and controls",
      "A receipt proves only what its named verifier and referenced evidence support.",
      "not customer evidence",
      "Bring one workflow",
      "Inspect synthetic agent sample",
    ],
    prohibitedMarkers: [
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
      "Public Exposure Review",
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
      "Agent Risk &amp; Control Review",
    ],
    prohibitedMarkers: [
      "six active services",
      "Package one security workflow",
      "Access Removal Proof",
      "10-Server Security Pilot",
    ],
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
      "Start a review",
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
      "Start a review",
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
      "Clear prices for bounded security reviews.",
      "Public service lines",
      "Public Exposure Review",
      "€1,900 ex VAT",
      "No sales call required.",
      "Payment is due in full before the delivery clock starts; payment alone does not authorise testing.",
      "One focused retest within 30 days is included",
      "Commercial boundary",
      "No review starts from this page or from payment alone.",
      "Inspect synthetic sample",
      "Request the review",
    ],
    prohibitedMarkers: [
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
      "Send us the security questionnaire holding up your deal.",
      "From €1,600",
      "Start a non-secret fit check",
      "proposed answer matrix",
      "Approximately three working days after scope, owners, required inputs and evidence access are confirmed.",
      "SYNTHETIC DEMONSTRATION — NOT CUSTOMER EVIDENCE",
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
    requiredMarkers: [
      "Agenci działają. WitnessOps dostarcza dowody.",
      "Infrastruktura dowodowa dla operacji agentowych",
      "Zweryfikowany syntetyczny przykład — nie są to materiały klienta",
      "witnessops/witnessops-sample-cases",
      "d4ad234bd815",
      "VALID_SYNTHETIC_SPECIMEN",
      "Pięć pytań. Jeden ograniczony workflow.",
      "Co zatwierdzono?",
      "Co wykonano?",
      "Co zaobserwowano?",
      "Co pozostaje nierozstrzygnięte?",
      "Jak można to zakwestionować?",
      "Sprawdź agenta przed działaniem",
      "Otwórz publiczny SKILL.md i sprawdź lokalnie jego dokładne bajty.",
      "/verify/skill",
      "Agent Risk &amp; Control Review",
      "Przejrzyj workflow, nie tylko plik.",
      "Mapa workflow i uprawnień",
      "Analiza luk w zatwierdzeniach i materiałach",
      "Proponowany zapis i ścieżka weryfikatora",
      "Przykładowy pakiet i zalecenia dotyczące kontroli",
      "Od 6 500 zł",
      "Praktyczne przekazanie, które oddziela poparte obserwacje, nierozstrzygnięte luki",
      "Zapis jest tak mocny, jak wskazane materiały i weryfikator.",
      "Zgłoś jeden istotny workflow. Uczyń jego upoważnienie i materiały możliwymi do przeglądu.",
      "Zgłoś jeden workflow agenta",
      "Uruchom i zweryfikuj demo rotacji skompromitowanego klucza API",
    ],
    prohibitedMarkers: [
      "Public Exposure Review",
      "Bounded Workflow Review",
      "zewnętrzna weryfikacja",
      "Każde istotne działanie agenta otrzymuje weryfikowalny zapis",
      "Check a skill",
      "Aegis",
    ],
  },
  {
    path: "/pl/catalog",
    requiredMarkers: [
      "Zacznij od sytuacji, którą trzeba rozwiązać.",
      "Customer Security Review Sprint",
      "Od 7 000 zł po wstępnej ocenie bez informacji poufnych (ok. €1 600)",
      "Około trzech dni roboczych po potwierdzeniu zakresu, właścicieli, wymaganych materiałów i dostępu do dowodów",
      "Agent Risk &amp; Control Review",
      "Od 6 500 zł (ok. €1 500)",
      "One Server Security Check",
      "Standardowo 4 100 zł po wstępnej ocenie bez informacji poufnych (ok. €950)",
      "Public Exposure Review",
      "€1 900 netto — jeden autoryzowany system publicznie dostępny",
      "W ciągu 3 dni roboczych po potwierdzeniu pełnej płatności",
      "Cztery dni robocze po zebraniu kandydata do wydania",
      "Key, Access and Custody Review",
      "Incident Readiness Review",
      "Audyt publicznego śladu zawodowego",
      "Dostępny na zapytanie",
      "4 900 EUR netto",
      "7–10 dni roboczych",
      "Rozpocznij przegląd",
    ],
    prohibitedMarkers: [
      "Co się wydarzyło?",
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
      "Prześlij kwestionariusz bezpieczeństwa, który blokuje transakcję.",
      "Od 7 000 zł",
      "trzech dni roboczych",
      "Rozpocznij wstępną ocenę bez informacji poufnych",
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
      "Public Exposure Review",
      "See what the internet sees.",
      "€1,900 ex VAT",
      "No sales call required.",
      "Within 3 working days",
      "One authorised public-facing system",
      "Inside that accepted system boundary: up to 1 registrable root domain",
      "Public cloud-hosted services can be included",
      "It uses passive discovery where applicable, followed by explicitly approved, low-impact checks against the signed target schedule.",
      "No exploitation",
      "Start a review",
      "Inspect synthetic sample",
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
      "€4,900 excluding VAT",
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
      "4 900 EUR netto",
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
      "Start your Public Exposure Review",
      "Tell us what public-facing system you want reviewed",
      "Public target",
      "Domain, hostname, public IP, API, application, or public cloud endpoint",
      "Authority to request this review",
      "Start a review",
      "€1,900 ex VAT for one authorised public-facing system",
      "Payment is due in full before the delivery clock starts.",
      "No work or target-facing check starts from this form.",
      "Controlled external exposure review",
      "What the Public Exposure Review delivers",
    ],
    prohibitedMarkers: [
      "This form authorizes testing",
      "Pay now",
      "Upload evidence",
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
      "Public Exposure Review",
      "Rozpocznij Public Exposure Review",
      "Wskaż jeden system publicznie dostępny i podstawę upoważnienia",
      "Rozmowa sprzedażowa nie jest wymagana",
      "Formularz rozpoczyna akceptację zakresu; nie upoważnia do testów ani nie uruchamia trzydniowego terminu.",
      "Wyślij zgłoszenie do akceptacji zakresu",
    ],
    prohibitedMarkers: [
      "Opowiedz, co wymaga sprawdzenia",
      "This form authorizes testing",
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
      "Synthetic worked example — not customer evidence.",
      "Public Exposure Review",
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
      "Synthetic compromise flag declared",
      "Public synthetic specimen",
      "A synthetic key was flagged.",
      "verify the pinned bundle digest,",
      "Published sample — not live customer evidence",
      "No real provider, credential, compromise, customer, or",
      "Browser verification",
      "VERIFYING EXACT PUBLIC BYTES",
      "Synthetic credential rotation",
      "Northstar API (synthetic)",
      "Declared approval",
      "ACKNOWLEDGE SCOPE &amp; REPLAY",
      "Playback only. This click authorizes nothing",
      "Don’t trust the animation. Verify the bytes.",
      "Bundle SHA-256",
      "bb921133a6d06db471b0a8f5015fd6f7a734c2c1721de4e0007fa34397c11f9c",
      "Verifier SHA-256",
      "7ac872446e384f40d82eaf63e7a0d5ca4604eb06a0fdb8e872a9240400377f41",
      "d4ad234bd8152b1a01b9adc913f383d1838850b3",
      "Built-in negative control",
      "RUN ONE-BYTE TAMPER TEST",
      "Take the verifier away from us.",
      "node verify.mjs BUNDLE.wops.json DEMO_KEY_REGISTRY.json",
      "BUNDLE.wops.json",
      "verify.mjs",
      "DEMO_KEY_REGISTRY.json",
      "PROOF BOUNDARY",
      "that an AI agent caused or authorized the tool calls",
      "Agent Risk &amp; Control Review — from €1,500 ex VAT.",
      "Request a non-secret fit check",
    ],
    prohibitedMarkers: [
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
