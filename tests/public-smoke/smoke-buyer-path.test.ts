import assert from "node:assert/strict";
import test from "node:test";

import {
  buyerPathSmokeRoutes,
  escapeAmpersandsForHtml,
  evaluateBuyerPathRoute,
  normalizeBaseUrl,
  runBuyerPathSmoke,
  type BuyerPathSmokeRoute,
} from "../../scripts/smoke-buyer-path";

test("HTML smoke markers escape every ampersand", () => {
  assert.equal(escapeAmpersandsForHtml("A & B & C"), "A &amp; B &amp; C");
});

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

test("homepage contracts preserve two reviews, free check and synthetic-evidence boundaries", () => {
  const en = routeContract("/");
  for (const marker of ["Agent Action Security Review","€2,500 fixed · excluding VAT","External Attack Surface Review","€1,900 · excluding VAT","Start a free check","Not a review.","Historical synthetic one-action example"]) {
    assert.ok(en.requiredMarkers.includes(marker), marker);
  }
  assert.ok(en.prohibitedMarkers?.includes("Private Pilot"));
  const pl = routeContract("/pl");
  for (const marker of ["Agent Action Security Review","External Attack Surface Review","Bezpłatne sprawdzenie hosta","To nie jest przegląd."]) {
    assert.ok(pl.requiredMarkers.includes(marker), marker);
  }
  assert.ok(pl.prohibitedMarkers?.includes("Przegląd narzędzi i dostępu agenta AI"));
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

test("catalogue smoke enforces two prices, two identities, and no private or outdated promotions", () => {
  const en = routeContract("/catalog");
  for(const marker of ["Agent Action Security Review","€2,500 fixed · excluding VAT","External Attack Surface Review","€1,900 · excluding VAT","Scope an AI review","Scope an external review"]) {
    assert.ok(en.requiredMarkers.includes(marker), marker);
  }
  assert.ok(en.prohibitedMarkers?.includes("Private Pilot"));
  assert.ok(en.prohibitedMarkers?.includes("One Server Security Check"));
  const pl = routeContract("/pl/catalog");
  assert.ok(pl.requiredMarkers.includes("€2 500: cena stała · bez VAT"));
  assert.ok(pl.requiredMarkers.includes("€1 900 · bez VAT"));
  assert.ok(pl.prohibitedMarkers?.includes("Przegląd narzędzi i dostępu agenta AI"));
});

test("request smoke keeps bare selection form-free and external review authority-bound", () => {
  for(const path of ["/review/request","/pl/review/request"]) {
    const route=routeContract(path);
    assert.ok(route.requiredMarkers.includes("Agent Action Security Review"));
    assert.ok(route.requiredMarkers.includes("External Attack Surface Review"));
    assert.ok(route.prohibitedMarkers?.includes('name="intent"'));
    assert.ok(route.prohibitedMarkers?.includes('action="/api/review/request"'));
  }
  for(const path of ["/review/request?productId=OFFSEC-EXTERNAL-EXPOSURE","/pl/review/request?productId=OFFSEC-EXTERNAL-EXPOSURE"]) {
    const route=routeContract(path);
    assert.ok(route.requiredMarkers.includes('name="intent" value="OFFSEC-EXTERNAL-EXPOSURE"'));
    assert.ok(route.prohibitedMarkers?.includes("This form authorizes testing"));
  }
  for(const path of ["/review/request?productId=OFFSEC-PILOT","/pl/review/request?productId=OFFSEC-PILOT"]) {
    const route=routeContract(path);
    assert.ok(route.prohibitedMarkers?.includes('name="intent"'));
    assert.ok(route.prohibitedMarkers?.includes('action="/api/review/request"'));
  }
});

test("Agent Action new intake works only with its canonical ID in both languages", () => {
  const en=routeContract("/review/request?offerId=agent-action-security-review");
  const pl=routeContract("/pl/review/request?offerId=agent-action-security-review");
  assert.ok(en.requiredMarkers.includes("€2,500 fixed · excluding VAT"));
  assert.ok(pl.requiredMarkers.includes("€2 500: cena stała · bez VAT"));
  assert.ok(en.requiredMarkers.includes('name="intent" value="agent-action-security-review"'));
  assert.ok(pl.requiredMarkers.includes('name="intent" value="agent-action-security-review"'));
  assert.ok(en.prohibitedMarkers?.includes('name="intent" value="bounded-workflow-review"'));
  const oldEn=routeContract("/review/request?offerId=agent-tools-access-review");
  const oldPl=routeContract("/pl/review/request?offerId=agent-tools-access-review");
  assert.ok(oldEn.prohibitedMarkers?.includes('name="intent" value="agent-tools-access-review"'));
  assert.ok(oldPl.prohibitedMarkers?.includes('name="intent" value="agent-tools-access-review"'));
  assert.ok(oldEn.requiredMarkers.includes("Nothing has been substituted."));
  assert.ok(oldPl.requiredMarkers.includes("Nie zastąpiliśmy go inną usługą."));
});

test("public new-sales surfaces reject the old inventory review and private pilot", () => {
  const checks=[
    ["/","AI Agent Tools &amp; Access Review"],
    ["/catalog","AI Agent Tools &amp; Access Review"],
    ["/catalog/workflows","AI Agent Tools &amp; Access Review"],
    ["/pricing","AI Agent Tools &amp; Access Review"],
    ["/review/sample-cases/ai-agent-action-proof-run","AI Agent Tools &amp; Access Review"],
    ["/pl","Przegląd narzędzi i dostępu agenta AI"],
    ["/pl/catalog","Przegląd narzędzi i dostępu agenta AI"],
  ];
  for(const [path,oldName] of checks) {
    const contract=routeContract(path);
    assert.ok(contract.prohibitedMarkers?.includes(oldName),path);
    assert.ok(contract.prohibitedMarkers?.includes("Private Pilot"),path);
  }
  for(const path of ["/review/request?offerId=agent-tools-access-review","/pl/review/request?offerId=agent-tools-access-review"]) {
    assert.ok(routeContract(path).prohibitedMarkers?.includes('action="/api/review/request"'));
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


test("removing a free-check, signup, fee or enquiry boundary fails smoke", () => {
  for (const [path,marker] of [
    ["/","Not a review."],
    ["/docs","Signup is free. Verify your email to create your own workspace. No card is required."],
    ["/pricing","An enquiry does not authorise collection or start a review."],
    ["/review/request","Choose one of the two paid reviews."],
  ]) {
    const route=routeContract(path);
    assert.ok(route.requiredMarkers.includes(marker), `Missing boundary contract ${path}`);
    const body=route.requiredMarkers.filter(value=>value!==marker).join("\n");
    const result=evaluateBuyerPathRoute(route,"https://witnessops.com",200,body);
    assert.equal(result.ok,false,path);
    assert.ok(result.missingMarkers.includes(marker),path);
  }
});

test("home limitations never substitute for either paid-review identity", () => {
  const route=routeContract("/");
  const body=route.requiredMarkers.filter(marker=>marker!=="Agent Action Security Review").join("\n");
  assert.ok(body.includes("External Attack Surface Review"));
  const result=evaluateBuyerPathRoute(route,"https://witnessops.com",200,body);
  assert.equal(result.ok,false);
  assert.deepEqual(result.missingMarkers,["Agent Action Security Review"]);
});

