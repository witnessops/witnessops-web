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
    english.requiredMarkers.includes(
      "Start your Agent Risk &amp; Control Review",
    ),
  );
  assert.ok(english.requiredMarkers.includes("From €1,500"));
  assert.ok(
    english.requiredMarkers.includes(
      'name="intent" value="bounded-workflow-review"',
    ),
  );

  const polish = routeContract(
    "/pl/review/request?offerId=bounded-workflow-review",
  );
  assert.ok(
    polish.requiredMarkers.includes("Zgłoś: Agent Risk &amp; Control Review"),
  );
  assert.ok(polish.requiredMarkers.includes("Od 6 500 zł (ok. €1 500)"));
  assert.ok(
    polish.requiredMarkers.includes(
      'name="intent" value="bounded-workflow-review"',
    ),
  );
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
