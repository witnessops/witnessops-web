
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

export function escapeAmpersandsForHtml(value: string): string {
  return value.replaceAll("&", "&amp;");
}

export const buyerPathSmokeRoutes: BuyerPathSmokeRoute[] = [
  {
    path: "/",
    requiredMarkers: ["Understand what your agents can do and what your systems expose.","Two reviews. Scope before work.","Agent Action Security Review","€2,500 fixed · excluding VAT","External Attack Surface Review","€1,900 · excluding VAT","Historical synthetic one-action example","Not a review.","Start a free check","An enquiry does not authorise collection or start a review."],
    prohibitedMarkers: ["AI Agent Tools &amp; Access Review","Early Bird","Internet Footprint Review","Private Pilot","€500 fixed","VALID_SYNTHETIC_SPECIMEN"],
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
    requiredMarkers: ["This link does not select a current offer","Nothing has been substituted.","Agent Action Security Review","External Attack Surface Review"],
    prohibitedMarkers: ["name=\"intent\" value=\"automation-repair-handover\"","action=\"/api/review/request\"","€250 diagnosis"],
  },
  {
    path: "/catalog",
    requiredMarkers: ["Two focused security reviews.","Review an agent action and its safeguards","Agent Action Security Review","€2,500 fixed · excluding VAT","External Attack Surface Review","€1,900 · excluding VAT","An enquiry does not authorise collection or start a review.","Scope an AI review","Scope an external review"],
    prohibitedMarkers: ["AI Agent Tools &amp; Access Review","Early Bird","Internet Footprint Review","Private Pilot","One Server Security Check","Customer Security Review Sprint"],
  },
  {
    path: "/catalog/workflows",
    requiredMarkers: ["Agent Action Security Review","€2,500 fixed · excluding VAT","Know what to fix before your AI agent acts.","Authority and approval map","Execution path","Effective permission boundary","Evidence chain","10 working days","Request an Agent Action Security Review","historical synthetic one-action sample"],
    prohibitedMarkers: ["AI Agent Tools &amp; Access Review","Starting at €2,500","dated system-level inventory","Private Pilot"],
  },
  {
    path: "/docs",
    requiredMarkers: [
      "Documentation",
      "Start with the app",
      "Signup is free. Verify your email to create your own workspace. No card is required.",
      "CLI setup and authentication",
      "Try an example",
      "The default example is indeterminate",
      "were not independently checked",
      "Buyer path",
      "Get started",
      "Verify a receipt",
      "Browse by area",
      "do not claim complete runtime truth",
    ],
  },
  {
    path: "/docs/getting-started/proof-run-buyer-path",
    requiredMarkers: ["Buyer path for a security or operational review","Agent Action Security Review","€2,500 fixed","External Attack Surface Review","€1,900 fixed","synthetic, historical example","receipt-only","Mailbox verification is not review start","no customer evidence has been accepted","non-secret fit check","Stop conditions"],
    prohibitedMarkers: ["AI Agent Tools &amp; Access Review","Customer Security Review Sprint","starts at €2,500"],
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
    requiredMarkers: ["Get help or start a review","Ready for a bounded review?","Agent Action Security Review","Support is for product help, access issues, and verifier questions.","Choose the right path","Verify a receipt"],
    prohibitedMarkers: ["AI Agent Tools &amp; Access Review","Private Pilot","Request an AI Agent Action Proof Run"],
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
    requiredMarkers: ["Review pricing and scope","Agent Action Security Review","€2,500 fixed · excluding VAT","External Attack Surface Review","€1,900 · excluding VAT","An enquiry does not authorise collection or start a review.","Scope an AI review","Scope an external review"],
    prohibitedMarkers: ["AI Agent Tools &amp; Access Review","Starting at €2,500","Early Bird","Internet Footprint Review","Private Pilot","€500 fixed","verified compliance"],
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
    requiredMarkers: ["Zrozum, co mogą zrobić Twoje agenty i co ujawniają Twoje systemy.","Dwa przeglądy. Najpierw uzgodniony zakres.","Agent Action Security Review","€2 500: cena stała · bez VAT","External Attack Surface Review","€1 900 · bez VAT","Bezpłatne sprawdzenie hosta","To nie jest przegląd."],
    prohibitedMarkers: ["Przegląd narzędzi i dostępu agenta AI","Od €2 500","Early Bird","Private Pilot","€500"],
  },
  {
    path: "/pl/catalog",
    requiredMarkers: ["Dwa konkretne przeglądy bezpieczeństwa.","Sprawdź jedno ważne działanie agenta","Agent Action Security Review","€2 500: cena stała · bez VAT","External Attack Surface Review","€1 900 · bez VAT","Zakres i wyłączenia","Omów przegląd agenta AI","Omów przegląd ekspozycji"],
    prohibitedMarkers: ["Przegląd narzędzi i dostępu agenta AI","Od €2 500","Early Bird","Private Pilot","Customer Security Review Sprint","One Server Security Check"],
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
      "Request this review",
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
    requiredMarkers: ["Which review fits your decision?","Choose one of the two paid reviews.","Agent Action Security Review","External Attack Surface Review"],
    prohibitedMarkers: ["name=\"intent\"","action=\"/api/review/request\"","Early Bird","Private Pilot"],
  },
  {
    path: "/review/request?productId=OFFSEC-EXTERNAL-EXPOSURE",
    requiredMarkers: ["Tell us what you need to understand","External Attack Surface Review","Internet-facing system","Authority to request this review","€1,900 · excluding VAT","No review or target-facing check starts from this form.","name=\"intent\" value=\"OFFSEC-EXTERNAL-EXPOSURE\""],
    prohibitedMarkers: ["This form authorizes testing","Pay now","Upload evidence","Private Pilot"],
  },
  {
    path: "/review/request?offerId=agent-action-security-review",
    requiredMarkers: ["Tell us what you need to understand","Start your Agent Action Security Review","€2,500 fixed · excluding VAT","name=\"intent\" value=\"agent-action-security-review\"","Request a non-secret fit check","No review or target-facing check starts from this form."],
    prohibitedMarkers: ["Starting at €2,500","AI Agent Tools &amp; Access Review","Private Pilot","name=\"intent\" value=\"bounded-workflow-review\""],
  },
  {
    path: "/review/request?offerId=agent-tools-access-review",
    requiredMarkers: ["This link does not select a current offer","Nothing has been substituted.","Agent Action Security Review","External Attack Surface Review"],
    prohibitedMarkers: ["name=\"intent\" value=\"agent-tools-access-review\"","action=\"/api/review/request\"","Starting at €2,500"],
  },
  {
    path: "/review/request?productId=OFFSEC-PILOT",
    requiredMarkers: ["This link does not select a current offer","Nothing has been substituted.","Agent Action Security Review","External Attack Surface Review"],
    prohibitedMarkers: ["name=\"intent\"","action=\"/api/review/request\"","10-Server Security Pilot"],
  },
  {
    path: "/pl/review/request",
    requiredMarkers: ["Który przegląd pomoże w Twojej decyzji?","Wybierz jeden z dwóch płatnych przeglądów.","Agent Action Security Review","External Attack Surface Review"],
    prohibitedMarkers: ["name=\"intent\"","action=\"/api/review/request\"","Private Pilot"],
  },
  {
    path: "/pl/review/request?productId=OFFSEC-EXTERNAL-EXPOSURE",
    requiredMarkers: ["Opisz, co chcesz zrozumieć","External Attack Surface Review","Rozpocznij External Attack Surface Review","To nie jest test penetracyjny.","Wyślij zgłoszenie do akceptacji zakresu","name=\"intent\" value=\"OFFSEC-EXTERNAL-EXPOSURE\""],
    prohibitedMarkers: ["This form authorizes testing","Private Pilot"],
  },
  {
    path: "/pl/review/request?offerId=agent-action-security-review",
    requiredMarkers: ["Opisz, co chcesz zrozumieć","Rozpocznij Agent Action Security Review","€2 500: cena stała · bez VAT","name=\"intent\" value=\"agent-action-security-review\"","Poproś o ocenę dopasowania"],
    prohibitedMarkers: ["Od €2 500","Przegląd narzędzi i dostępu agenta AI","Private Pilot"],
  },
  {
    path: "/pl/review/request?offerId=agent-tools-access-review",
    requiredMarkers: ["Ten link nie wybiera aktualnej oferty","Nie zastąpiliśmy go inną usługą.","Agent Action Security Review","External Attack Surface Review"],
    prohibitedMarkers: ["name=\"intent\" value=\"agent-tools-access-review\"","action=\"/api/review/request\""],
  },
  {
    path: "/pl/review/request?productId=OFFSEC-PILOT",
    requiredMarkers: ["Ten link nie wybiera aktualnej oferty","Nie zastąpiliśmy go inną usługą.","Agent Action Security Review","External Attack Surface Review"],
    prohibitedMarkers: ["name=\"intent\"","action=\"/api/review/request\"","Pilotaż przeglądu bezpieczeństwa"],
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
      "Illustrative reviews, findings and evidence.",
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
    requiredMarkers: ["Synthetic demo","No live systems","See a key rotation, step by step.","Published sample, not live customer evidence","Browser verification","Synthetic credential rotation","Bundle SHA-256","Verifier SHA-256","Download files and verify offline","Agent Action Security Review","€2,500 fixed · excluding VAT","This fixed synthetic example is not a real action or customer outcome","Request scope and quote"],
    prohibitedMarkers: ["AI Agent Tools &amp; Access Review","Starting at €2,500","Private Pilot","This synthetic one-action example is historical. The current review adds a dated"],
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
