/**
 * Component render tests for CustomerProofPackage (WEB-016).
 *
 * Covers the finality notice and receipt sealing note added in WEB-016.
 * Pure assembler logic is tested in lib/server/customer-proof-package.test.ts.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CustomerProofPackage } from "./customer-proof-package";
import type { CustomerProofPackageView } from "@/lib/server/customer-proof-package";

function deliveredView(
  overrides: Partial<CustomerProofPackageView> = {},
): CustomerProofPackageView {
  return {
    stage: "delivered",
    identity: {
      runId: "run_demo",
      bundleId: "bundle_abc",
      artifactHash: "sha256:deadbeef",
    },
    delivery: {
      delivered: true,
      deliveredAt: "2026-04-05T12:00:00Z",
      channel: "email",
      recipient: "claimant@example.com",
      acknowledgedAt: null,
    },
    disposition: null,
    ...overrides,
  };
}

function acceptedView(
  overrides: Partial<CustomerProofPackageView> = {},
): CustomerProofPackageView {
  return deliveredView({
    stage: "accepted",
    disposition: {
      disposition: "accepted",
      acceptedBy: "customer@example.com",
      acceptedAt: "2026-04-06T09:00:00Z",
      comment: null,
      receipt: null,
    },
    ...overrides,
  });
}

function rejectedView(
  overrides: Partial<CustomerProofPackageView> = {},
): CustomerProofPackageView {
  return deliveredView({
    stage: "rejected",
    disposition: {
      disposition: "rejected",
      acceptedBy: "customer@example.com",
      acceptedAt: "2026-04-06T09:00:00Z",
      comment: null,
      receipt: null,
    },
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// WEB-016: finality notice
// ---------------------------------------------------------------------------

test("WEB-016: accepted stage renders package-closed block with data-disposition=accepted", () => {
  const html = renderToStaticMarkup(<CustomerProofPackage view={acceptedView()} />);
  assert.match(html, /data-testid="package-closed"/);
  assert.match(html, /data-disposition="accepted"/);
});

test("WEB-016: rejected stage renders package-closed block with data-disposition=rejected", () => {
  const html = renderToStaticMarkup(<CustomerProofPackage view={rejectedView()} />);
  assert.match(html, /data-testid="package-closed"/);
  assert.match(html, /data-disposition="rejected"/);
});

test("WEB-016: delivered stage does not render package-closed block", () => {
  const html = renderToStaticMarkup(<CustomerProofPackage view={deliveredView()} />);
  assert.doesNotMatch(html, /data-testid="package-closed"/);
});

test("WEB-016: acknowledged stage does not render package-closed block", () => {
  const html = renderToStaticMarkup(
    <CustomerProofPackage view={deliveredView({ stage: "acknowledged" })} />,
  );
  assert.doesNotMatch(html, /data-testid="package-closed"/);
});

test("WEB-016: accepted closed-notice names the disposition", () => {
  const html = renderToStaticMarkup(<CustomerProofPackage view={acceptedView()} />);
  assert.match(html, /accepted/);
  assert.match(html, /No further/);
});

test("WEB-016: rejected closed-notice names the disposition", () => {
  const html = renderToStaticMarkup(<CustomerProofPackage view={rejectedView()} />);
  assert.match(html, /rejected/);
  assert.match(html, /No further/);
});

// ---------------------------------------------------------------------------
// WEB-016: receipt sealing note
// ---------------------------------------------------------------------------

test("WEB-016: receipt block includes sealing note when receipt is present", () => {
  const view = acceptedView({
    disposition: {
      disposition: "accepted",
      acceptedBy: "customer@example.com",
      acceptedAt: "2026-04-06T09:00:00Z",
      comment: null,
      receipt: {
        receiptHash: "sha256:" + "a".repeat(64),
        schemaVersion: 1,
      },
    },
  });
  const html = renderToStaticMarkup(<CustomerProofPackage view={view} />);
  assert.match(html, /data-testid="customer-acceptance-receipt"/);
  assert.match(html, /seals the disposition fields/);
});

test("WEB-016: receipt block is absent when receipt is null (no sealing note)", () => {
  const html = renderToStaticMarkup(<CustomerProofPackage view={acceptedView()} />);
  assert.doesNotMatch(html, /data-testid="customer-acceptance-receipt"/);
  assert.doesNotMatch(html, /seals the disposition fields/);
});
