import assert from "node:assert/strict";
import test from "node:test";

import {
  buyerPathSmokeRoutes,
  evaluateBuyerPathRoute,
  normalizeBaseUrl,
  runBuyerPathSmoke,
  type BuyerPathSmokeRoute,
} from "../../scripts/smoke-buyer-path";

function routeContract(path: string): BuyerPathSmokeRoute {
  const route = buyerPathSmokeRoutes.find((candidate) => candidate.path === path);
  assert.ok(route, `missing buyer-path smoke contract for ${path}`);
  return route;
}

test("normalizeBaseUrl strips query strings, hashes, and trailing slashes", () => {
  assert.equal(
    normalizeBaseUrl("https://witnessops.com/review?cache=off#sample"),
    "https://witnessops.com/review",
  );
  assert.equal(normalizeBaseUrl("https://witnessops.com/"), "https://witnessops.com");
});

test("evaluateBuyerPathRoute requires status 200 and all expected markers", () => {
  const route: BuyerPathSmokeRoute = {
    path: "/review",
    requiredMarkers: ["For", "You get", "Do not submit"],
  };

  assert.deepEqual(
    evaluateBuyerPathRoute(
      route,
      "https://witnessops.com",
      200,
      "For You get Do not submit",
    ),
    {
      path: "/review",
      url: "https://witnessops.com/review",
      status: 200,
      ok: true,
      missingMarkers: [],
      prohibitedMarkersPresent: [],
    },
  );

  const result = evaluateBuyerPathRoute(
    route,
    "https://witnessops.com",
    503,
    "For You get",
  );

  assert.equal(result.ok, false);
  assert.deepEqual(result.missingMarkers, ["Do not submit"]);
});

test("evaluateBuyerPathRoute fails when old public markers are still present", () => {
  const route: BuyerPathSmokeRoute = {
    path: "/review/sample-cases/ai-agent-action-proof-run",
    requiredMarkers: ["Receipt shape and verifier path"],
    prohibitedMarkers: ["Receipt shape only"],
  };

  const result = evaluateBuyerPathRoute(
    route,
    "https://witnessops.com",
    200,
    "Receipt shape and verifier path Receipt shape only",
  );

  assert.equal(result.ok, false);
  assert.deepEqual(result.prohibitedMarkersPresent, ["Receipt shape only"]);
});

test("access-change smoke contract does not fail on global request nav", () => {
  const route: BuyerPathSmokeRoute = {
    path: "/access-change-proof-run",
    requiredMarkers: ["Bounded Access-Change Proof Run"],
    prohibitedMarkers: [
      "Start with a short non-secret fit check.",
      "What security workflow should we inspect?",
    ],
  };

  const result = evaluateBuyerPathRoute(
    route,
    "https://witnessops.com",
    200,
    'Bounded Access-Change Proof Run <a href="/review/request">Start a review</a>',
  );

  assert.equal(result.ok, true);
  assert.deepEqual(result.prohibitedMarkersPresent, []);
});

test("runBuyerPathSmoke uses fetch headers and evaluates each route without shell helpers", async () => {
  const routes: BuyerPathSmokeRoute[] = [
    {
      path: "/review",
      requiredMarkers: ["For"],
      prohibitedMarkers: ["Request an AI Agent Action Proof Run"],
    },
  ];
  const calls: Array<{ input: string; headers?: Record<string, string> }> = [];

  const results = await runBuyerPathSmoke(
    "https://witnessops.com/",
    routes,
    async (input, init) => {
      calls.push({ input, headers: init?.headers });
      return {
        status: 200,
        async text() {
          return "For Start a review";
        },
      };
    },
  );

  assert.equal(calls[0]?.input, "https://witnessops.com/review");
  assert.equal(calls[0]?.headers?.["cache-control"], "no-cache");
  assert.equal(results[0]?.ok, true);
});

test("homepage contracts preserve the intentional pre-action skill check", () => {
  for (const path of ["/", "/pl"] as const) {
    const route = routeContract(path);
    assert.ok(route.requiredMarkers.some((marker) => marker.includes("SKILL.md")));
    assert.ok(route.requiredMarkers.includes("/verify/skill"));
    assert.ok(!route.prohibitedMarkers?.includes("SKILL.md"));
  }
});

test("English Skill Library smoke follows the exact-byte library contract", () => {
  const route = routeContract("/library");
  assert.ok(route.requiredMarkers.includes("All Skills Library"));
  assert.ok(
    route.requiredMarkers.includes(
      "First-party reference contracts, not customer evidence",
    ),
  );
  assert.ok(!route.requiredMarkers.includes("Buyer path"));
});

test("catalogue smoke preserves the primary and secondary offer hierarchy", () => {
  for (const path of ["/catalog", "/pricing"] as const) {
    const route = routeContract(path);
    for (const marker of [
      "Primary paid entry point",
      "Agent Workflow Reconstruction",
      "€2,500 fixed",
      "Within 10 working days after evidence rules are agreed",
      "Secondary catalogue offer",
      "Public Exposure Review",
      "€1,900 ex VAT",
    ]) {
      assert.ok(
        route.requiredMarkers.some((candidate) => candidate.includes(marker)),
        `${path} must include ${marker}`,
      );
    }
  }

  const catalogue = routeContract("/catalog");
  assert.ok(
    catalogue.requiredMarkers.some((marker) =>
      marker.includes("Within 3 working days after payment in full"),
    ),
  );
});

test("request smoke markers use the current fit and start-work boundaries", () => {
  const generic = routeContract("/review/request");
  assert.ok(generic.requiredMarkers.includes("What the fit check establishes"));
  assert.ok(
    generic.requiredMarkers.includes(
      "No work or target-facing check starts from this form.",
    ),
  );

  for (const path of [
    "/review/request?productId=OFFSEC-EXTERNAL-EXPOSURE",
    "/review/request?productId=OFFSEC-PILOT",
  ]) {
    assert.ok(
      routeContract(path).requiredMarkers.includes(
        "No work or target-facing check starts from this form.",
      ),
    );
  }
});

test("primary offer smoke covers selected English and Polish intake", () => {
  const english = routeContract(
    "/review/request?offerId=bounded-workflow-review",
  );
  assert.ok(
    english.requiredMarkers.includes("Start your Agent Workflow Reconstruction"),
  );
  assert.ok(english.requiredMarkers.includes("€2,500 fixed"));
  assert.ok(
    english.requiredMarkers.includes(
      "one named workflow (agentic or automated)",
    ),
  );
  assert.ok(english.requiredMarkers.includes("Non-secret fit check first"));
  assert.ok(
    english.requiredMarkers.includes(
      "Within 10 working days after evidence rules are agreed",
    ),
  );
  assert.ok(
    english.requiredMarkers.includes(
      'name="intent" value="bounded-workflow-review"',
    ),
  );
  assert.ok(
    english.prohibitedMarkers?.includes("Agent Risk &amp; Control Review"),
  );
  assert.ok(english.prohibitedMarkers?.includes("From €1,500"));

  const polish = routeContract(
    "/pl/review/request?offerId=bounded-workflow-review",
  );
  assert.ok(
    polish.requiredMarkers.includes("Zgłoś: Agent Workflow Reconstruction"),
  );
  assert.ok(polish.requiredMarkers.includes("€2 500 — cena stała"));
  assert.ok(
    polish.requiredMarkers.includes(
      "Jeden nazwany workflow (agentowy lub zautomatyzowany)",
    ),
  );
  assert.ok(
    polish.requiredMarkers.includes(
      'name="intent" value="bounded-workflow-review"',
    ),
  );
  assert.ok(
    polish.prohibitedMarkers?.includes("Agent Risk &amp; Control Review"),
  );
  assert.ok(polish.prohibitedMarkers?.includes("Od 6 500 zł"));
});

test("active primary surface smoke rejects former offer positioning", () => {
  for (const path of [
    "/",
    "/catalog",
    "/catalog/workflows",
    "/pricing",
    "/review/request?offerId=bounded-workflow-review",
    "/pl",
    "/pl/catalog",
    "/pl/review/request?offerId=bounded-workflow-review",
    "/review/sample-cases/ai-agent-action-proof-run",
  ]) {
    const route = routeContract(path);
    assert.ok(
      route.prohibitedMarkers?.some((marker) =>
        marker.includes("Agent Risk &"),
      ),
      `${path} must reject the former primary name`,
    );
    assert.ok(
      route.prohibitedMarkers?.some((marker) =>
        marker.includes("€1,500") || marker.includes("€1 500") || marker.includes("6 500"),
      ),
      `${path} must reject the former primary price`,
    );
  }
});

test("stateless confirmation smoke checks loading shells without claiming verification", () => {
  const english = routeContract("/review/request/confirmed");
  assert.ok(
    english.requiredMarkers.includes("Loading the browser-held request record…"),
  );
  assert.ok(english.prohibitedMarkers?.includes("Request verified"));

  const polish = routeContract("/pl/review/request/confirmed");
  assert.ok(
    polish.requiredMarkers.includes(
      "Wczytywanie zapisu zgłoszenia przechowywanego w przeglądarce…",
    ),
  );
  assert.ok(polish.prohibitedMarkers?.includes("Request verified"));
});
