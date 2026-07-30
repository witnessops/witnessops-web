import test from "node:test";
import assert from "node:assert/strict";

import {
  TOKEN_EMAIL_TEMPLATE_VERSION,
  renderVerificationEmail,
} from "./token-email-template";

test("proof-run verification email uses light paper theme", () => {
  const rendered = renderVerificationEmail({
    channel: "engage",
    email: "buyer@example-corp.com",
    intakeId: "intk_test",
    issuanceId: "iss_test",
    token: "ABCD-EFGH-JKLM",
    expiresAt: "2026-07-30T12:00:00Z",
    verifyUrl: "https://witnessops.com/verify-token",
    intent: "ai-agent-action-proof-run",
  });

  assert.equal(rendered.templateVersion, "tier1-code-v3-light");
  assert.equal(TOKEN_EMAIL_TEMPLATE_VERSION, "tier1-code-v3-light");
  assert.ok(rendered.html);
  assert.match(rendered.html!, /background-color:#f7f5f1/);
  assert.match(rendered.html!, /background-color:#ffffff/);
  assert.match(rendered.html!, /color:#121212/);
  assert.match(rendered.html!, /ABCD-EFGH-JKLM/);
  assert.doesNotMatch(rendered.html!, /background-color:#000000/);
  assert.doesNotMatch(rendered.html!, /color:#faf7f2/);
});
