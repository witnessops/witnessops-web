import assert from "node:assert/strict";
import test from "node:test";
import { usesPublicPresentation } from "./public-presentation";

test("public pages and their translated/detail routes share presentation", () => {
  for (const path of ["/", "/pl", "/pricing", "/early-access", "/catalog/workflows", "/pl/catalog/offsec-external-exposure", "/review/sample-cases/ai-agent-action-proof-run", "/review/request", "/support/access", "/docs/cli", "/pl/docs/cli", "/research", "/privacy", "/media-kit", "/verify", "/check"]) {
    assert.equal(usesPublicPresentation(path), true, path);
  }
});

test("presentation does not leak into admin, customer packages", () => {
  for (const path of ["/admin", "/admin/login", "/admin/reports", "/api/verify", "/proofpack", "/package/example", "/assessment/example", "/execution/example", "/payment/success", "/verify-token", "/unknown", "/catalogue", "/pl/admin"]) {
    assert.equal(usesPublicPresentation(path), false, path);
  }
});
