import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateBuyerPathRoute,
  normalizeBaseUrl,
  runBuyerPathSmoke,
  type BuyerPathSmokeRoute,
} from "../../scripts/smoke-buyer-path";

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
          return "For View sample proof run";
        },
      };
    },
  );

  assert.equal(calls[0]?.input, "https://witnessops.com/review");
  assert.equal(calls[0]?.headers?.["cache-control"], "no-cache");
  assert.equal(results[0]?.ok, true);
});
