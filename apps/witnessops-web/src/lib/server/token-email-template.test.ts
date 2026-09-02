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

  assert.equal(rendered.templateVersion, "tier1-code-v4-light");
  assert.equal(TOKEN_EMAIL_TEMPLATE_VERSION, "tier1-code-v4-light");
  assert.ok(rendered.html);
  assert.match(rendered.html!, /background-color:#f7f5f1/);
  assert.match(rendered.html!, /background-color:#ffffff/);
  assert.match(rendered.html!, /color:#121212/);
  assert.match(rendered.html!, /ABCD-EFGH-JKLM/);
  assert.doesNotMatch(rendered.html!, /background-color:#000000/);
  assert.doesNotMatch(rendered.html!, /color:#faf7f2/);
});

test("unclassified engage requests use the no-work manual email boundary", () => {
  const rendered = renderVerificationEmail({
    channel: "engage",
    email: "buyer@example-corp.com",
    intakeId: "intk_unclassified",
    issuanceId: "iss_unclassified",
    token: "ABCD-EFGH-JKLM",
    expiresAt: "2026-07-30T12:00:00Z",
    verifyUrl: "https://witnessops.com/verify-token?context=opaque",
    intent: "review",
  });

  assert.ok(rendered.html);
  assert.match(rendered.text, /does not start a proof run/);
  assert.match(rendered.text, /security-workflow package request/);
});

test("Polish engage requests localize the buyer verification boundary", () => {
  const rendered = renderVerificationEmail({
    channel: "engage",
    email: "buyer@example-corp.com",
    intakeId: "intk_pl",
    issuanceId: "iss_pl",
    token: "ABCD-EFGH-JKLM",
    expiresAt: "2026-07-30T12:00:00Z",
    verifyUrl: "https://witnessops.com/verify-token?context=opaque",
    intent: "bounded-workflow-review",
    locale: "pl",
  });

  assert.equal(rendered.subject, "Twój kod do zgłoszenia WitnessOps");
  assert.match(rendered.text, /Weryfikacja WitnessOps/);
  assert.match(
    rendered.text,
    /Potwierdź: Zgłoszenie Agent Workflow Reconstruction/,
  );
  assert.match(rendered.text, /Kod weryfikacyjny: ABCD-EFGH-JKLM/);
  assert.match(rendered.text, /Nie rozpoczyna przeglądu ani pracy/);
  assert.doesNotMatch(rendered.text, /Confirm your/);
  assert.ok(rendered.html);
  assert.match(rendered.html!, /Otwórz bezpieczną stronę weryfikacji/);
  assert.doesNotMatch(rendered.html!, /What this verification means/);
});

test("explicit governed recon retains its dedicated verification path", () => {
  const rendered = renderVerificationEmail({
    channel: "engage",
    email: "buyer@example-corp.com",
    intakeId: "intk_recon",
    issuanceId: "iss_recon",
    token: "ABCD-EFGH-JKLM",
    expiresAt: "2026-07-30T12:00:00Z",
    verifyUrl: "https://witnessops.com/verify-token?context=opaque",
    intent: "Third-party assessment",
  });

  assert.equal(rendered.html, undefined);
  assert.match(rendered.text, /Open Verification Page:/);
});
