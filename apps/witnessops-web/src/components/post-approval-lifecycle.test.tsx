import React from "react";
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { PostApprovalLifecycle } from "./post-approval-lifecycle";
import type { PostApprovalLifecycleView } from "@/lib/server/post-approval-lifecycle";

function baseView(
  stage: "authorization_pending" | "authorized",
  controlPlaneState: "requested" | "authorized" | "collecting",
): PostApprovalLifecycleView {
  return {
    stage,
    local: {
      approved: true,
      approvedAt: "2026-04-08T01:23:26Z",
      controlPlaneRunId: "run_demo123",
    },
    authoritative: {
      source: "control_plane",
      controlPlaneState,
      delivered: false,
      acknowledged: false,
      completed: false,
      delivery: null,
      completion: null,
      customerAcceptanceDisposition: null,
      customerAcceptanceAt: null,
    },
    retryRequest: null,
    failureReason: null,
  };
}

test("post-approval lifecycle shows authorize action for requested runs on admin surfaces", () => {
  const html = renderToStaticMarkup(
    <PostApprovalLifecycle
      view={baseView("authorization_pending", "requested")}
      authorizeActionEnabled
    />,
  );

  assert.match(html, /data-stage="authorization_pending"/);
  assert.match(html, /Awaiting start/);
  assert.match(html, /still requested/);
  assert.match(html, /data-testid="authorize-run-panel"/);
  assert.match(html, /data-testid="authorize-run-action"/);
  assert.match(html, /Authorize \/ start/);
});

test("post-approval lifecycle omits authorize action when authorize surface is disabled", () => {
  const html = renderToStaticMarkup(
    <PostApprovalLifecycle view={baseView("authorization_pending", "requested")} />,
  );

  assert.doesNotMatch(html, /data-testid="authorize-run-panel"/);
});

test("post-approval lifecycle renders authorized distinctly from requested", () => {
  const html = renderToStaticMarkup(
    <PostApprovalLifecycle view={baseView("authorized", "collecting")} />,
  );

  assert.match(html, /data-stage="authorized"/);
  assert.match(html, /Control plane has authorized the run/);
  assert.doesNotMatch(html, /still requested/);
  assert.doesNotMatch(html, /data-testid="authorize-run-panel"/);
});
