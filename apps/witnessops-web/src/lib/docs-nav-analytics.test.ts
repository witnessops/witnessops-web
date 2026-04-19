import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDocsPathExitPayload,
  getDocsJourney,
  getDocsLayer,
  normalizeDocsAnalyticsRoute,
} from "./docs-nav-analytics";

test("normalizeDocsAnalyticsRoute strips fragments/query and normalizes docs paths", () => {
  assert.equal(
    normalizeDocsAnalyticsRoute("/docs/how-it-works/verification/?q=proof#section"),
    "/docs/how-it-works/verification",
  );
  assert.equal(
    normalizeDocsAnalyticsRoute("https://witnessops.com/docs/getting-started?ref=nav"),
    "/docs/getting-started",
  );
});

test("normalizeDocsAnalyticsRoute classifies external routes and protocols", () => {
  assert.equal(
    normalizeDocsAnalyticsRoute("https://example.com/docs/getting-started"),
    "external:example.com",
  );
  assert.equal(
    normalizeDocsAnalyticsRoute("mailto:security@witnessops.com"),
    "external:mailto",
  );
});

test("docs layer and journey contexts remain explicit", () => {
  assert.equal(getDocsLayer("/docs"), "docs_home");
  assert.equal(getDocsLayer("/verify"), "outside_docs");
  assert.equal(getDocsJourney("/docs/how-it-works/verification"), "how-it-works/verification");
  assert.equal(getDocsJourney("/terms"), "outside_docs");
});

test("buildDocsPathExitPayload emits normalized docs path exit analytics payload", () => {
  const payload = buildDocsPathExitPayload({
    fromPath: "/docs/how-it-works?utm=campaign",
    toPath: "/docs/evidence/receipts#contract",
    navSurface: "Utility Nav",
    eventType: "navigation_click",
    interactionType: "click",
    layerContext: "Governed Execution",
    eventTimestamp: "2026-04-01T00:00:00.000Z",
  });

  assert.deepEqual(payload, {
    event_type: "navigation_click",
    event_timestamp: "2026-04-01T00:00:00.000Z",
    from_route: "/docs/how-it-works",
    to_route: "/docs/evidence/receipts",
    nav_surface: "utility_nav",
    interaction_type: "click",
    layer_context: "governed_execution",
    from_layer: "how-it-works",
    to_layer: "evidence",
    from_journey: "how-it-works",
    to_journey: "evidence/receipts",
  });
});

test("buildDocsPathExitPayload only emits for docs-origin transitions", () => {
  const nonDocs = buildDocsPathExitPayload({
    fromPath: "/verify",
    toPath: "/docs/getting-started",
    navSurface: "utility-nav",
    eventType: "navigation_click",
    interactionType: "click",
  });
  assert.equal(nonDocs, null);

  const sameRoute = buildDocsPathExitPayload({
    fromPath: "/docs/reference",
    toPath: "/docs/reference?sort=asc",
    navSurface: "sidebar",
    eventType: "navigation_click",
    interactionType: "click",
  });
  assert.equal(sameRoute, null);
});
