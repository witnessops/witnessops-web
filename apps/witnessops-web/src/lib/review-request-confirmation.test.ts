import assert from "node:assert/strict";
import test from "node:test";

import {
  buildReviewRequestConfirmation,
  buildReviewRequestConfirmationText,
  buildStandaloneReviewRequestConfirmation,
  readReviewRequestConfirmation,
  resolveReviewRequestKind,
  REVIEW_REQUEST_CONFIRMATION_STORAGE_KEY,
  storeReviewRequestConfirmation,
} from "./review-request-confirmation";

const validResponse = {
  channel: "engage",
  intakeId: "intake_public_reference",
  issuanceId: "iss_private_issuance",
  threadId: "thread_private",
  email: "buyer@example.com",
  verifiedAt: "2026-08-28T12:34:56Z",
  status: "verified",
  admissionState: "admitted",
  assessmentRunId: null,
  assessmentStatus: "unavailable",
  postVerifyPath: "/review/request/confirmed",
};

test("builds a narrowed confirmation from an admitted manual review request", () => {
  const confirmation = buildReviewRequestConfirmation(validResponse, {
    locale: "en",
    requestKind: "agent-risk-control-review",
    source: "ask",
  });

  assert.deepEqual(confirmation, {
    schema: "witnessops.review-request-confirmation.v1",
    requestReference: "intake_public_reference",
    confirmedAt: "2026-08-28T12:34:56Z",
    locale: "en",
    requestKind: "agent-risk-control-review",
    source: "ask",
  });
});

test("builds the browser-held record for standalone email verification", () => {
  assert.deepEqual(
    buildStandaloneReviewRequestConfirmation({
      ...validResponse,
      requestIntent: "OFFSEC-CUSTODY-OPS",
      requestLocale: "pl",
      postVerifyPath: "/pl/review/request/confirmed",
    }),
    {
      schema: "witnessops.review-request-confirmation.v1",
      requestReference: "intake_public_reference",
      confirmedAt: "2026-08-28T12:34:56Z",
      locale: "pl",
      requestKind: "key-access-custody-review",
      source: "request-form",
    },
  );
});

test("fit-call confirmation requires the verified server marker and stores no request details", () => {
  const fitCallResponse = {
    ...validResponse,
    requestMode: "fit-call",
    requestIntent: "agent-action-security-review",
    requestLocale: "en",
  };
  assert.equal(buildReviewRequestConfirmation(validResponse, {
    locale: "en", requestKind: "fit-call", source: "request-form",
  }), null);
  assert.equal(buildReviewRequestConfirmation(fitCallResponse, {
    locale: "en", requestKind: "agent-action-security-review", source: "request-form",
  }), null);

  const confirmation = buildStandaloneReviewRequestConfirmation(fitCallResponse);
  assert.ok(confirmation);
  assert.equal(confirmation.requestKind, "fit-call");
  assert.deepEqual(Object.keys(confirmation).sort(), [
    "confirmedAt", "locale", "requestKind", "requestReference", "schema", "source",
  ]);
  const text = buildReviewRequestConfirmationText(confirmation);
  assert.match(text, /At request verification: time not booked/);
  assert.match(text, /later email or invitation determines current status/);
  assert.doesNotMatch(text, /buyer@example\.com|iss_private_issuance|thread_private/);
});

test("fails closed for a legacy assessment or unexpected verified state", () => {
  assert.equal(
    buildReviewRequestConfirmation(
      { ...validResponse, postVerifyPath: "/assessment/iss_private_issuance" },
      {
        locale: "en",
        requestKind: "agent-risk-control-review",
        source: "request-form",
      },
    ),
    null,
  );
  assert.equal(
    buildReviewRequestConfirmation(
      { ...validResponse, assessmentRunId: "run_private" },
      {
        locale: "en",
        requestKind: "agent-risk-control-review",
        source: "request-form",
      },
    ),
    null,
  );
  assert.equal(
    buildReviewRequestConfirmation(
      { ...validResponse, admissionState: "verified" },
      {
        locale: "en",
        requestKind: "agent-risk-control-review",
        source: "request-form",
      },
    ),
    null,
  );
});

test("stores only the narrowed record and localizes it for the active route", () => {
  const values = new Map<string, string>();
  const storage = {
    setItem(key: string, value: string) {
      values.set(key, value);
    },
    getItem(key: string) {
      return values.get(key) ?? null;
    },
  };
  const confirmation = buildReviewRequestConfirmation(validResponse, {
    locale: "en",
    requestKind: "agent-risk-control-review",
    source: "request-form",
  });
  assert.ok(confirmation);

  storeReviewRequestConfirmation(storage, confirmation);
  const serialized = values.get(REVIEW_REQUEST_CONFIRMATION_STORAGE_KEY) ?? "";
  assert.doesNotMatch(serialized, /buyer@example\.com/);
  assert.doesNotMatch(serialized, /iss_private_issuance/);
  assert.doesNotMatch(serialized, /thread_private/);
  assert.deepEqual(readReviewRequestConfirmation(storage, "pl"), {
    ...confirmation,
    locale: "pl",
  });
  assert.deepEqual(readReviewRequestConfirmation(storage, "en"), confirmation);
});

test("fails closed when browser session storage is unavailable", () => {
  const deniedStorage = {
    getItem() {
      throw new Error("SecurityError");
    },
  };

  assert.equal(readReviewRequestConfirmation(deniedStorage, "en"), null);
});

test("copy text preserves boundaries without leaking verification inputs", () => {
  const confirmation = buildReviewRequestConfirmation(validResponse, {
    locale: "en",
    requestKind: "agent-risk-control-review",
    source: "ask",
  });
  assert.ok(confirmation);

  const text = buildReviewRequestConfirmationText(confirmation);
  assert.match(text, /Request reference: intake_public_reference/);
  assert.match(text, /Mailbox access: CONFIRMED/);
  assert.match(text, /Review started: NO/);
  assert.match(text, /Customer evidence accepted: NO/);
  assert.match(text, /not a proof receipt, verifier result, identity proof/);
  assert.doesNotMatch(text, /buyer@example\.com/);
  assert.doesNotMatch(text, /iss_private_issuance|thread_private/);
  assert.doesNotMatch(text, /From €1,500|€2,500 fixed|ABCD-EFGH-JKLM/);
});

test("maps public request intents to fixed record labels", () => {
  assert.deepEqual(
    [
      "bounded-workflow-review",
      "agent-action-security-review",
      "agent-tools-access-review",
      "ai-agent-action-proof-run",
      "access-change-proof-run",
      "OFFSEC-EXTERNAL-EXPOSURE",
      "customer-security-review-sprint",
      "OFFSEC-LOCAL-AUDIT",
      "OFFSEC-LAUNCH-READY",
      "OFFSEC-CUSTODY-OPS",
      "OFFSEC-INCIDENT-READY",
      "professional-public-footprint-audit",
    ].map(resolveReviewRequestKind),
    [
      "agent-risk-control-review",
      "agent-action-security-review",
      "agent-tools-access-review",
      "ai-agent-action-proof-run",
      "access-change-proof-run",
      "public-exposure-review",
      "customer-security-review-sprint",
      "one-server-security-check",
      "launch-readiness-check",
      "key-access-custody-review",
      "incident-readiness-review",
      "professional-public-footprint-audit",
    ],
  );
  assert.equal(resolveReviewRequestKind("review"), "review-request");
});
