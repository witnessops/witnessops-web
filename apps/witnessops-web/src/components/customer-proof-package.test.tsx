/**
 * Component render tests for CustomerProofPackage (WEB-016 / WEB-018).
 *
 * Covers the finality notice, receipt sealing note (WEB-016), and
 * rejection-specific rendering improvements (WEB-018).
 * Pure assembler logic is tested in lib/server/customer-proof-package.test.ts.
 */
import React from "react";
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

test("WEB-016: accepted closed-notice contains accepted and finality text", () => {
  const html = renderToStaticMarkup(<CustomerProofPackage view={acceptedView()} />);
  assert.match(html, /accepted/);
  assert.match(html, /No further action is required/);
});

test("WEB-016: rejected closed-notice contains rejection-specific text", () => {
  const html = renderToStaticMarkup(<CustomerProofPackage view={rejectedView()} />);
  // WEB-018 changed rejected notice to be distinct from accepted
  assert.match(html, /Your rejection has been/);
  assert.match(html, /operator has visibility/);
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

// ---------------------------------------------------------------------------
// WEB-018: customer rejection follow-up path
// ---------------------------------------------------------------------------

test("WEB-018: rejected closed-notice text is distinct from accepted", () => {
  const html = renderToStaticMarkup(<CustomerProofPackage view={rejectedView()} />);
  assert.match(html, /data-testid="package-closed"/);
  assert.match(html, /data-disposition="rejected"/);
  assert.match(html, /Your rejection has been/);
  assert.match(html, /operator has visibility/);
  assert.doesNotMatch(html, /No further action is required/);
});

test("WEB-018: accepted closed-notice text is unchanged", () => {
  const html = renderToStaticMarkup(<CustomerProofPackage view={acceptedView()} />);
  assert.match(html, /data-testid="package-closed"/);
  assert.match(html, /data-disposition="accepted"/);
  assert.match(html, /No further action is required/);
  assert.doesNotMatch(html, /Your rejection has been/);
});

test("WEB-018: rejected disposition shows Rejected by / Rejected at labels", () => {
  const html = renderToStaticMarkup(<CustomerProofPackage view={rejectedView()} />);
  assert.match(html, /Rejected by/);
  assert.match(html, /Rejected at/);
  assert.doesNotMatch(html, /Accepted by/);
  assert.doesNotMatch(html, /Accepted at/);
});

test("WEB-018: accepted disposition shows Accepted by / Accepted at labels", () => {
  const html = renderToStaticMarkup(<CustomerProofPackage view={acceptedView()} />);
  assert.match(html, /Accepted by/);
  assert.match(html, /Accepted at/);
  assert.doesNotMatch(html, /Rejected by/);
  assert.doesNotMatch(html, /Rejected at/);
});

test("WEB-018: rejected comment shows Rejection reason label", () => {
  const html = renderToStaticMarkup(
    <CustomerProofPackage
      view={rejectedView({
        disposition: {
          disposition: "rejected",
          acceptedBy: "customer@example.com",
          acceptedAt: "2026-04-07T10:00:00Z",
          comment: "Content does not match scope",
          receipt: null,
        },
      })}
    />,
  );
  assert.match(html, /Rejection reason/);
  assert.match(html, /Content does not match scope/);
});

test("WEB-018: accepted comment does not show Rejection reason label", () => {
  const html = renderToStaticMarkup(
    <CustomerProofPackage
      view={acceptedView({
        disposition: {
          disposition: "accepted",
          acceptedBy: "customer@example.com",
          acceptedAt: "2026-04-07T10:00:00Z",
          comment: "Looks good",
          receipt: null,
        },
      })}
    />,
  );
  assert.doesNotMatch(html, /Rejection reason/);
  assert.match(html, /Looks good/);
});

test("WEB-018: rejected receipt block shows Rejection receipt label", () => {
  const html = renderToStaticMarkup(
    <CustomerProofPackage
      view={rejectedView({
        disposition: {
          disposition: "rejected",
          acceptedBy: "customer@example.com",
          acceptedAt: "2026-04-07T10:00:00Z",
          comment: null,
          receipt: {
            receiptHash: "sha256:" + "c".repeat(64),
            schemaVersion: 1,
          },
        },
      })}
    />,
  );
  assert.match(html, /Rejection receipt/);
  assert.doesNotMatch(html, /Acceptance receipt/);
});

test("WEB-018: accepted receipt block shows Acceptance receipt label", () => {
  const html = renderToStaticMarkup(
    <CustomerProofPackage
      view={acceptedView({
        disposition: {
          disposition: "accepted",
          acceptedBy: "customer@example.com",
          acceptedAt: "2026-04-07T10:00:00Z",
          comment: null,
          receipt: {
            receiptHash: "sha256:" + "d".repeat(64),
            schemaVersion: 1,
          },
        },
      })}
    />,
  );
  assert.match(html, /Acceptance receipt/);
  assert.doesNotMatch(html, /Rejection receipt/);
});
