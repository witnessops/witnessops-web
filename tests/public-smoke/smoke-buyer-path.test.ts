import assert from "node:assert/strict";
import test from "node:test";

import { PUBLIC_AGENT_ACTION_OFFER } from "../../apps/witnessops-web/src/lib/commercial-truth";
import {
  buyerPathIntakeProbes,
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

test("withdrawn offer routes require a 410 notice without old sales copy or intake", () => {
  for (const [path, title, body, currentReview, oldPrice, oldIntent] of [
    ["/catalog/automation-repair", "This offer has been withdrawn", "WitnessOps no longer offers this review. The current review and contact are below.", "/reviews/agent-action-security-review", "€250 diagnosis", 'name="intent" value="automation-repair-handover"'],
    ["/pl/catalog/automation-repair", "Ta oferta została wycofana", "WitnessOps nie oferuje już tego przeglądu. Aktualny przegląd i kontakt są poniżej.", "/pl/reviews/agent-action-security-review", "€250 za diagnozę", 'name="intent" value="automation-repair-handover"'],
    ["/catalog/workflows", "This offer has been withdrawn", "WitnessOps no longer offers this review. The current review and contact are below.", "/reviews/agent-action-security-review", "Starting at €2,500 · excluding VAT", 'name="intent" value="agent-tools-access-review"'],
    ["/customer-security-review", "This offer has been withdrawn", "WitnessOps no longer offers this review. The current review and contact are below.", "/reviews/agent-action-security-review", "From €1,600 · excluding VAT", 'name="intent" value="customer-security-review-sprint"'],
    ["/pl/customer-security-review", "Ta oferta została wycofana", "WitnessOps nie oferuje już tego przeglądu. Aktualny przegląd i kontakt są poniżej.", "/pl/reviews/agent-action-security-review", "Od 7 000 zł (ok. €1 600) · bez VAT", 'name="intent" value="customer-security-review-sprint"'],
    ["/catalog/professional-public-footprint-audit", "This offer has been withdrawn", "WitnessOps no longer offers this review. The current review and contact are below.", "/reviews/agent-action-security-review", "€4,900 · excluding VAT", 'name="intent" value="professional-public-footprint-audit"'],
    ["/pl/catalog/professional-public-footprint-audit", "Ta oferta została wycofana", "WitnessOps nie oferuje już tego przeglądu. Aktualny przegląd i kontakt są poniżej.", "/pl/reviews/agent-action-security-review", "4 900 EUR · bez VAT", 'name="intent" value="professional-public-footprint-audit"'],
  ] as const) {
    const route = routeContract(path);
    assert.equal(route.expectedStatus, 410, path);
    assert.ok(route.requiredMarkers.includes(title), path);
    assert.ok(route.requiredMarkers.includes(body), path);
    assert.ok(route.requiredMarkers.includes(currentReview), path);
    assert.ok(route.prohibitedMarkers?.includes(oldPrice), path);
    assert.ok(route.prohibitedMarkers?.includes(oldIntent), path);

    const notice = route.requiredMarkers.join("\n");
    assert.equal(evaluateBuyerPathRoute(route, "https://witnessops.com", 410, notice).ok, true, path);
    assert.equal(evaluateBuyerPathRoute(route, "https://witnessops.com", 200, notice).ok, false, path);
    const missingTitle = evaluateBuyerPathRoute(route, "https://witnessops.com", 410, notice.replace(title, ""));
    assert.equal(missingTitle.ok, false, path);
    assert.ok(missingTitle.missingMarkers.includes(title), path);
    for (const oldMarker of [oldPrice, oldIntent]) {
      const oldSale = evaluateBuyerPathRoute(route, "https://witnessops.com", 410, `${notice}\n${oldMarker}`);
      assert.equal(oldSale.ok, false, `${path} ${oldMarker}`);
      assert.ok(oldSale.prohibitedMarkersPresent.includes(oldMarker), path);
    }
  }
});

test("footprint withdrawal removes the old availability claim", () => {
  for (const [path, availability] of [
    ["/catalog/professional-public-footprint-audit", "Available by request"],
    ["/pl/catalog/professional-public-footprint-audit", "Dostępny na zapytanie"],
  ] as const) {
    const route = routeContract(path);
    assert.ok(route.prohibitedMarkers?.includes(availability), path);
    const notice = route.requiredMarkers.join("\n");
    assert.equal(evaluateBuyerPathRoute(route, "https://witnessops.com", 410, notice).ok, true, path);
    assert.equal(evaluateBuyerPathRoute(route, "https://witnessops.com", 410, notice + "\n" + availability).ok, false, path);
  }
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

test("the free check remains usable without a paid enquiry while shared navigation can link to one", () => {
  const route = routeContract("/check");
  const sales = '<a href="/review/request?offerId=agent-action-security-review">Request a security assessment</a>';
  const main = route.requiredMarkers.join(" ");
  for (const [body, expected] of [
    [`<nav>${sales}</nav><main id="main-content">${main}</main>`, true],
    [`<main>${main}${sales}</main>`, false],
    [`<nav>${main}</nav>`, false],
  ] as const) {
    assert.equal(evaluateBuyerPathRoute(route, "https://witnessops.com", 200, body).ok, expected);
  }
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

test("both homepages link the illustrative record, state the fee and require written authority", () => {
  for (const [path, locale, cta, example, authority] of [
    ["/", "en", "Request a security assessment", "/reviews/agent-action-security-review#example-record", "We don't test until you give written authority."],
    ["/pl", "pl", "Zapytaj o ocenę bezpieczeństwa", "/pl/reviews/agent-action-security-review#example-record", "Nie testujemy bez Twojej pisemnej zgody."],
  ] as const) {
    const route = routeContract(path);
    for (const marker of [PUBLIC_AGENT_ACTION_OFFER.price[locale], cta, example, authority]) {
      assert.ok(route.requiredMarkers.includes(marker), path + " " + marker);
    }
    assert.ok(route.prohibitedMarkers?.includes("10 working days"));
    assert.ok(route.prohibitedMarkers?.includes("€550"));
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

test("catalogue smoke preserves the single public review request path", () => {
  for (const path of ["/", "/catalog", "/pricing", "/pl", "/pl/catalog"] as const) {
    const route = routeContract(path);
    assert.ok(
      route.requiredMarkers.includes("offerId=agent-action-security-review"),
      `${path} must require the agent review`,
    );
    assert.equal(
      route.requiredMarkers.includes("productId=OFFSEC-EXTERNAL-EXPOSURE"),
      false,
      `${path} must not sell the parked external review`,
    );
    for (const marker of [
      "offerId=agent-tools-access-review",
      "offerId=automation-repair-handover",
      "offerId=customer-security-review-sprint",
      "productId=OFFSEC-PILOT",
    ]) {
      assert.ok(
        route.prohibitedMarkers?.includes(marker),
        `${path} must reject ${marker}`,
      );
    }
  }
  const catalogue = routeContract("/catalog");
  for (const marker of [
    PUBLIC_AGENT_ACTION_OFFER.name.en,
    PUBLIC_AGENT_ACTION_OFFER.price.en,
    PUBLIC_AGENT_ACTION_OFFER.timing.en,
    "Request a security assessment",
  ]) {
    assert.ok(
      catalogue.requiredMarkers.some((candidate) => candidate.includes(marker)),
      `/catalog must include ${marker}`,
    );
  }
  for (const marker of [
    "Private Pilot",
    "OFFSEC-PILOT",
    "€950",
    "Starting at €2,500 · excluding VAT",
    "Customer Security Review Sprint",
    "Scope this review",
    "Request a scope and fixed quote",
    "Automation Repair &amp; Handover",
  ]) {
    assert.ok(catalogue.prohibitedMarkers?.includes(marker), `/catalog must reject ${marker}`);
  }
  const workflows = routeContract("/catalog/workflows");
  assert.equal(workflows.expectedStatus, 410);
  assert.ok(workflows.requiredMarkers.includes("This offer has been withdrawn"));
  assert.ok(workflows.requiredMarkers.includes("WitnessOps no longer offers this review. The current review and contact are below."));
  assert.ok(workflows.requiredMarkers.includes("/reviews/agent-action-security-review"));
  const freeCheck = routeContract("/check");
  assert.ok(freeCheck.requiredMarkers.includes("Run free check"));
  assert.ok(freeCheck.prohibitedMarkers?.includes("Private Pilot"));
});

test("intake probes reject withdrawn identities before issuance and keep the two public identities", () => {
  const reasons = new Map(
    buyerPathIntakeProbes
      .filter((probe) => probe.expectReason)
      .map((probe) => [String(probe.body.intent) + (probe.body.productId ? "+product" : "") + (probe.body.offer ? "+offer" : ""), probe.expectReason]),
  );
  assert.equal(reasons.get("agent-tools-access-review"), "historical");
  assert.equal(reasons.get("automation-repair-handover"), "historical");
  assert.equal(reasons.get("customer-security-review-sprint"), "historical");
  assert.equal(reasons.get("bounded-workflow-review"), "historical");
  assert.equal(reasons.get("OFFSEC-PILOT"), "unsupported");
  assert.equal(reasons.get("AI Agent Tools & Access Review — Private Pilot"), "unsupported");
  assert.equal(reasons.get(PUBLIC_AGENT_ACTION_OFFER.name.en), "unsupported");
  assert.equal(reasons.get("Agent Action Security Review"), "unsupported");
  assert.equal(reasons.get("agent-action-security-review+product"), "ambiguous");
  assert.equal(reasons.get("agent-action-security-review+offer"), "ambiguous");
  assert.equal(reasons.get("external-exposure-assessment"), "parked");
  assert.ok(buyerPathIntakeProbes.some((probe) => probe.path === "/api/engage" && probe.expectReason === "historical"));
  assert.ok(buyerPathIntakeProbes.some((probe) => probe.path === "/api/contact" && probe.expectReason === "unsupported"));
  const agentEmail = buyerPathIntakeProbes.find((item) => item.body.intent === "agent-action-security-review" && item.expectError);
  assert.equal(agentEmail?.expectError, "Please use your business email.");
  assert.equal(agentEmail?.body.email, "buyer@gmail.com");
  const parked = buyerPathIntakeProbes.find((item) => item.body.intent === "OFFSEC-EXTERNAL-EXPOSURE");
  assert.equal(parked?.expectReason, "parked");
});

test("request smoke markers use the current fit and start-work boundaries", () => {
  const generic = routeContract("/review/request");
  assert.ok(generic.requiredMarkers.includes("Request a security assessment"));
  assert.ok(generic.requiredMarkers.includes("Next, confirm your email with a code."));
  assert.ok(
    generic.requiredMarkers.includes(
      "No work or target-facing check starts from this form.",
    ),
  );

  assert.ok(
    routeContract("/review/request?productId=OFFSEC-EXTERNAL-EXPOSURE").requiredMarkers.includes(
      "No work or target-facing check starts from this page.",
    ),
  );
  assert.ok(
    routeContract("/review/request?productId=OFFSEC-PILOT").requiredMarkers.includes(
      "No work or target-facing check starts from this page.",
    ),
  );
  const agent = routeContract("/review/request?offerId=agent-action-security-review");
  assert.ok(agent.requiredMarkers.includes('name="intent" value="agent-action-security-review"'));
  assert.ok(agent.prohibitedMarkers?.includes("productId=OFFSEC-EXTERNAL-EXPOSURE"));
  const external = routeContract("/review/request?productId=OFFSEC-EXTERNAL-EXPOSURE");
  assert.equal(external.requiredMarkers.includes('name="intent" value="OFFSEC-EXTERNAL-EXPOSURE"'), false);
  assert.ok(external.requiredMarkers.includes("offerId=agent-action-security-review"));
  const repair = routeContract("/catalog/automation-repair");
  assert.equal(repair.expectedStatus, 410);
  assert.ok(repair.requiredMarkers.includes("This offer has been withdrawn"));
  assert.ok(repair.prohibitedMarkers?.includes('name="intent" value="automation-repair-handover"'));
});

test("historical inventory request URLs stay closed while Agent Action intake is explicit", () => {
  const englishClosed = routeContract(
    "/review/request?offerId=agent-tools-access-review",
  );
  assert.ok(englishClosed.requiredMarkers.includes("This link does not start a new review"));
  assert.ok(
    englishClosed.prohibitedMarkers?.includes(
      'name="intent" value="agent-tools-access-review"',
    ),
  );
  assert.ok(englishClosed.prohibitedMarkers?.includes("From €1,500"));
  assert.ok(englishClosed.prohibitedMarkers?.includes("Agent Risk &amp; Control Review"));

  const englishOpen = routeContract(
    "/review/request?offerId=agent-action-security-review",
  );
  assert.ok(englishOpen.requiredMarkers.includes(PUBLIC_AGENT_ACTION_OFFER.price.en));
  assert.ok(
    englishOpen.requiredMarkers.includes(
      'name="intent" value="agent-action-security-review"',
    ),
  );
  assert.ok(englishOpen.prohibitedMarkers?.includes("Starting at €2,500"));

  const polishClosed = routeContract(
    "/pl/review/request?offerId=agent-tools-access-review",
  );
  assert.ok(polishClosed.requiredMarkers.includes("Ten link nie rozpoczyna nowego przeglądu"));
  assert.ok(
    polishClosed.prohibitedMarkers?.includes(
      'name="intent" value="agent-tools-access-review"',
    ),
  );
  assert.ok(polishClosed.prohibitedMarkers?.includes("Od 6 500 zł"));
  assert.ok(polishClosed.prohibitedMarkers?.includes("Agent Risk &amp; Control Review"));

  const polishOpen = routeContract(
    "/pl/review/request?offerId=agent-action-security-review",
  );
  assert.ok(polishOpen.requiredMarkers.includes(PUBLIC_AGENT_ACTION_OFFER.price.pl));
  assert.ok(
    polishOpen.requiredMarkers.includes(
      'name="intent" value="agent-action-security-review"',
    ),
  );
});

test("active primary surface smoke rejects former offer positioning", () => {
  for (const path of [
    "/",
    "/catalog",
    "/catalog/workflows",
    "/pricing",
    "/review/request?offerId=agent-tools-access-review",
    "/pl",
    "/pl/catalog",
    "/pl/review/request?offerId=agent-tools-access-review",
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


test("removing signup, billing or enquiry limits fails the buyer smoke gate", () => {
  for (const [path, marker] of [
    ["/", "We don't test until you give written authority."],
    ["/docs", "Sign up and verify your email when you want your own workspace; no card is required."],
    ["/pricing", PUBLIC_AGENT_ACTION_OFFER.timing.en],
    ["/review/request", "No work or target-facing check starts from this form."],
  ]) {
    const route = routeContract(path);
    const body = route.requiredMarkers.filter(value => value !== marker).join("\n");
    const result = evaluateBuyerPathRoute(route, "https://witnessops.com", 200, body);
    assert.equal(result.ok, false, path);
    assert.ok(result.missingMarkers.includes(marker), path);
  }
});


test("the scope limitation is a required homepage marker", () => {
  const route = routeContract("/");
  const marker = "Not a full pentest, certification, fixing or monitoring.";
  const body = route.requiredMarkers.filter((value) => value !== marker).join("\n");
  assert.equal(body.includes(marker), false);
  const result = evaluateBuyerPathRoute(route, "https://witnessops.com", 200, body);
  assert.equal(result.ok, false);
  assert.deepEqual(result.missingMarkers, [marker]);
});
