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
      "One bounded action. One scoped proof pack.",
      "Request one proof run",
      "Inspect sample package",
      "One action. One scoped package. Clear limits.",
      "Code patch",
      "Security finding",
      "Access or operations change",
      "Make one technical action reviewable.",
    ],
    prohibitedMarkers: [
      "View sample proof run",
      "Inspect sample receipt",
      "Submit an agent path",
      "Submit approval context",
      "Submit evidence context",
    ],
  },
  {
    path: "/docs",
    requiredMarkers: [
      "Security Workflow Buyer Path",
      "Buyer route: Security Workflow Buyer Path",
      "Buyer path",
      "evaluating the public package offer",
      "offer, sample, verifier, request form, mailbox verification, and evidence-handling boundary",
    ],
  },
  {
    path: "/docs/getting-started/proof-run-buyer-path",
    requiredMarkers: [
      "Security Workflow Buyer Path",
      "what the package offer is",
      "what the public sample demonstrates",
      "what the request form starts",
      "Mailbox verification is not proof-run start",
      "no customer evidence has been accepted",
      "Stop conditions",
      "broad compliance certification",
      "legal audit opinion",
      "Minimal buyer reading order",
      "Package one security workflow",
    ],
  },
  {
    path: "/library",
    requiredMarkers: [
      "Artifact state matrix",
      "Published first-party proof bundles",
      "Status",
      "Mechanism",
      "Boundary",
      "No live customer proof artifact is linked from this index.",
      "first-party WitnessOps proof bundles",
    ],
    prohibitedMarkers: [
      "The public artifact classes here are sample or intake surfaces",
    ],
  },
  {
    path: "/support",
    requiredMarkers: [
      "Need a security workflow packaged?",
      "Package one security workflow",
      "Support is for product help, access issues, and verifier questions.",
    ],
    prohibitedMarkers: [
      "Request an AI Agent Action Proof Run",
    ],
  },
  {
    path: "/verify",
    requiredMarkers: [
      "Artifact state matrix",
      "Verifier fixtures",
      "Receipt-first console",
      "Published first-party proof bundles",
      "Status",
      "Mechanism",
      "Boundary",
      "not live customer proof artifacts unless explicitly labeled otherwise",
      "The public receipt console below remains receipt-first v1.",
    ],
    prohibitedMarkers: [
      "verified compliance",
      "certified compliance",
      "audit-ready",
      "audit opinion provided",
      "proves compliance",
      "guarantees compliance",
    ],
  },
  {
    path: "/pricing",
    requiredMarkers: [
      "Pricing and commercial scope",
      "Price the package after the workflow is bounded.",
      "Primary public lane",
      "Unit of sale",
      "Commercial step",
      "Package one security workflow",
      "No proof run starts from this page.",
      "No customer evidence is accepted through pricing.",
      "No legal compliance claim is made here.",
      "No production deployment claim is made here.",
      "No complete AI governance program is promised here.",
    ],
    prohibitedMarkers: [
      "verified compliance",
      "certified compliance",
      "audit-ready",
      "audit opinion provided",
      "proves compliance",
      "guarantees compliance",
    ],
  },
  {
    path: "/review",
    requiredMarkers: [
      "Proof Pack Review",
      "One bounded technical action. One scoped proof pack.",
      "For",
      "You get",
      "Do not submit",
      "No dashboard subscription. No vague audit promise.",
      "What the proof pack contains",
      "Request one proof run",
      "Inspect sample package",
    ],
    prohibitedMarkers: [
      "Request an AI Agent Action Proof Run",
      "One security workflow in. Proof package out.",
    ],
  },
  {
    path: "/access-change-proof-run",
    requiredMarkers: [
      "Bounded Access-Change Proof Run",
      "Turn one sensitive access change into an evidence bundle others can inspect.",
      "€2,500 fixed fee",
      "Ask about access-change scoping",
      "The active public request lane is the Proof-Backed Security Workflow.",
      "Inspect sample package",
      "What is not claimed",
      "This is not a legal audit opinion.",
      "This is not a compliance certification.",
      "This is not a verifier-of-record result.",
      "the action cannot be proven from available evidence",
    ],
    prohibitedMarkers: [
      "View fixture demo",
      "Request one access-change proof run",
      "Start with a short non-secret fit check.",
      "What security workflow should we inspect?",
      "Workflow/tool path and touched system",
      "Send request",
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
    path: "/review/request",
    requiredMarkers: [
      "Request one proof run",
      "Proof Run Request",
      "Start with a short non-secret proof-pack fit check.",
      "What technical action should we package?",
      "Action path and touched system",
      "Boundary and approval",
      "Evidence available",
      "Do not submit secrets",
      "Send fit check",
      "What the proof pack contains",
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
    path: "/review/request/confirmed",
    requiredMarkers: [
      "Request verified",
      "Proof run request",
      "No proof run has started",
      "No customer evidence",
      "Do not submit secrets",
      "While you wait",
      "How verification works",
      "Library",
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
      "Published sample cases and proof bundles",
      "Primary sample",
      "AI Agent Action Proof Run",
      "Inspect sample package",
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
      "Package one security workflow",
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
    path: "/review/sample-cases/approval-gated-containment",
    requiredMarkers: [
      "Approval-gated containment review",
      "Explanatory sample case",
      "Not live",
      "not a live customer artifact",
      "Artifact manifest",
      "Review boundary",
      "Authority map",
      "Execution path observed",
      "Evidence inspected",
      "Replayability judgment",
      "Boundary note",
      "Package one security workflow",
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
      "Explanatory sample case",
      "Not live",
      "not a live customer artifact",
      "Artifact manifest",
      "Review boundary",
      "Authority map",
      "Execution path observed",
      "Evidence inspected",
      "Replayability judgment",
      "Boundary note",
      "Package one security workflow",
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
      "Receipt shape and verifier path",
      "work email",
      "optional company or team",
      "workflow/tool path and touched system",
      "Package one security workflow",
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
