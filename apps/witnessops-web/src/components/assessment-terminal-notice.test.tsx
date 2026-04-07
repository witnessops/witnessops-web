import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { AssessmentTerminalNotice } from "./assessment-terminal-notice";
import type { PostApprovalLifecycleView } from "@/lib/server/post-approval-lifecycle";

function terminalView(
  stage: "accepted" | "rejected",
  acceptedAt: string | null = "2026-04-07T10:30:00Z",
): PostApprovalLifecycleView {
  return {
    stage,
    local: {
      approved: true,
      approvedAt: "2026-04-04T00:01:00Z",
      controlPlaneRunId: "run_demo123",
    },
    authoritative: {
      source: "control_plane",
      controlPlaneState: stage,
      delivered: true,
      acknowledged: true,
      completed: false,
      delivery: {
        schema: "delivery_record",
        run_id: "run_demo123",
        bundle_id: "bundle_abc",
        artifact_hash: "sha256:deadbeef",
        recipient: "claimant@example.com",
        channel: "email",
        delivered_at: "2026-04-07T10:00:00Z",
        acknowledged_at: "2026-04-07T10:05:00Z",
        acknowledged_by: "customer@example.com",
        acknowledgment_method: "portal",
      },
      completion: null,
      customerAcceptanceDisposition: stage,
      customerAcceptanceAt: acceptedAt,
    },
    retryRequest: null,
    failureReason: null,
  };
}

test("assessment terminal notice renders accepted closure guidance", () => {
  const html = renderToStaticMarkup(
    <AssessmentTerminalNotice view={terminalView("accepted")} />,
  );
  assert.match(html, /data-testid="assessment-terminal-notice"/);
  assert.match(html, /data-disposition="accepted"/);
  assert.match(html, /This assessment run is/);
  assert.match(html, /closed/);
  assert.match(html, /No further action is required on this page/);
  assert.match(html, /Recorded at 2026-04-07T10:30:00Z/);
});

test("assessment terminal notice renders rejected closure guidance", () => {
  const html = renderToStaticMarkup(
    <AssessmentTerminalNotice view={terminalView("rejected")} />,
  );
  assert.match(html, /data-testid="assessment-terminal-notice"/);
  assert.match(html, /data-disposition="rejected"/);
  assert.match(html, /The delivered proof package has been rejected/);
  assert.match(html, /operator has visibility into this outcome/);
});

test("assessment terminal notice omits recorded-at row when timestamp is absent", () => {
  const html = renderToStaticMarkup(
    <AssessmentTerminalNotice view={terminalView("accepted", null)} />,
  );
  assert.doesNotMatch(html, /Recorded at/);
});

test("assessment terminal notice does not render for non-terminal stages", () => {
  const html = renderToStaticMarkup(
    <AssessmentTerminalNotice
      view={{
        stage: "acknowledged",
        local: {
          approved: true,
          approvedAt: "2026-04-04T00:01:00Z",
          controlPlaneRunId: "run_demo123",
        },
        authoritative: {
          source: "control_plane",
          controlPlaneState: "acknowledged",
          delivered: true,
          acknowledged: true,
          completed: false,
          delivery: {
            schema: "delivery_record",
            run_id: "run_demo123",
            bundle_id: "bundle_abc",
            artifact_hash: "sha256:deadbeef",
            recipient: "claimant@example.com",
            channel: "email",
            delivered_at: "2026-04-07T10:00:00Z",
            acknowledged_at: "2026-04-07T10:05:00Z",
            acknowledged_by: "customer@example.com",
            acknowledgment_method: "portal",
          },
          completion: null,
          customerAcceptanceDisposition: null,
          customerAcceptanceAt: null,
        },
        retryRequest: null,
        failureReason: null,
      }}
    />,
  );
  assert.equal(html, "");
});
