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
      "Signed receipts and external verification for consequential AI-agent actions.",
      "AI agents are becoming invisible operators.",
      "Hope is not an audit artifact.",
      "Every consequential agent action gets a verifiable receipt.",
      "Who owned the agent",
      "What policy or approval allowed it",
      "How the receipt can be verified later",
      "Agent Risk &amp; Control Review",
      "A focused review of one agentic or automated workflow.",
      "Agent and tool permission model",
      "Approval and policy gap analysis",
      "Sample proof bundle",
      "Control recommendations",
      "From €1,500",
      "You know whether the workflow can be defended in an audit, customer review, or incident investigation.",
      "A receipt is only as strong as its named evidence and verifier.",
      "Bring one agentic workflow. We’ll show you what proof is missing.",
      "Bring one workflow",
    ],
    prohibitedMarkers: [
      "Current paid entry point",
      "Public Exposure Review",
      "Bounded Workflow Review",
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
      "Public entry points",
      "Start here",
      "Browse services",
      "Verify a receipt",
      "Start a review",
      "Buyer path",
      "not a live customer artifact",
    ],
    prohibitedMarkers: [
      "The public artifact classes here are sample or intake surfaces",
      "Public verifier",
      "Security workflow buyer path",
      "Package one security workflow",
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
      "Agents act. WitnessOps proves.",
      "Podpisane potwierdzenia i zewnętrzna weryfikacja istotnych działań agentów AI.",
      "Agenci AI stają się niewidocznymi operatorami.",
      "Nadzieja nie jest artefaktem audytowym.",
      "Każde istotne działanie agenta otrzymuje weryfikowalny zapis.",
      "Kto był właścicielem agenta",
      "Jaka polityka lub zgoda je dopuściła",
      "Jak później zweryfikować zapis",
      "Agent Risk &amp; Control Review",
      "Skupiony przegląd jednego agentowego lub zautomatyzowanego workflow.",
      "Model uprawnień agenta i narzędzi",
      "Analiza luk w zatwierdzeniach i politykach",
      "Przykładowy pakiet dowodowy",
      "Zalecenia dotyczące kontroli",
      "Od 6 500 zł",
      "Wiesz, czy workflow można obronić podczas audytu, przeglądu klienta lub dochodzenia po incydencie.",
      "Przynieś jeden agentowy workflow. Pokażemy, jakiego dowodu brakuje.",
      "Przynieś jeden workflow",
    ],
    prohibitedMarkers: [
      "Public Exposure Review",
      "Bounded Workflow Review",
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
      "What a bounded review package can include",
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
      "No work starts from this form",
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
      "No work starts from this form",
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
      "Request verified",
      "Review request",
      "No proof run has started",
      "No work has started yet",
      "No customer evidence",
      "Do not submit secrets",
      "While you wait",
      "How verification works",
      "Library",
      "Example reviews",
      "Package offer",
      "Not a legal audit opinion.",
      "Not a compliance certification.",
      "Not a verifier-of-record result.",
      "Not a proof-run start.",
    ],
    prohibitedMarkers: [
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
    path: "/review/sample-cases",
    requiredMarkers: [
      "Example reviews you can inspect",
      "Sample cases",
      "AI agent change package",
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
      "Three-minute buyer walkthrough",
      "Sample outcome",
      "Sample lineage",
      "Sample commit",
      "99741c8d50cd3adbfdc28bc317ac563a1e8dd1ef",
      "Pinned artifact links",
      "Manifest provenance",
      "Source repository",
      "witnessops/witnessops-sample-cases",
      "Manifest path",
      "sample-cases/ai-agent-action-proof-run/MANIFEST.sha256",
      "Manifest blob SHA",
      "efa7181d7575e95cb63673442cfe48671a3bb8a8",
      "Manifest text SHA-256",
      "6c43e87534a4e445321c46d9765efa885d3df5aa8eb8110a214653b0f46d7447",
      "Open pinned manifest",
      "ed4614932f1b96fa9cc082fb481239ac8655bd49596d846db4da5bf5eb6dca14  RECEIPT.json",
      "BUYER_WALKTHROUGH.md",
      "Read buyer walkthrough",
      "AI agent change package",
      "Full sample package",
      "work email",
      "optional company or team",
      "workflow/tool path and touched system",
      "Start a review",
      "MANIFEST.sha256",
      "SHA-256:",
    ],
    prohibitedMarkers: [
      "Receipt shape only",
      "receipt shape only",
      "buyer email, and urgency",
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
