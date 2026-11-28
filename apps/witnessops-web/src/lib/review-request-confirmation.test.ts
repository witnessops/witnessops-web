import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReviewRequestRecord } from "@/components/review-request/review-request-record";
import { RecordedReviewRequest } from "@/components/review-request/review-request-confirmed";
import { PUBLIC_AGENT_ACTION_OFFER } from "@/lib/commercial-truth";

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

test("new request records keep the offer label shown at confirmation, including after a language switch", () => {
  for (const [locale, displayedOfferLabel] of [
    ["en", "AI Agent Red Teaming"],
    ["pl", "Red teaming agentów AI"],
  ] as const) {
    const path = locale === "pl" ? "/pl/review/request/confirmed" : "/review/request/confirmed";
    const confirmation = buildReviewRequestConfirmation(
      { ...validResponse, postVerifyPath: path },
      { locale, requestKind: "agent-action-security-review", source: "request-form", displayedOfferLabel },
    );
    assert.ok(confirmation);
    let saved = "";
    storeReviewRequestConfirmation({ setItem: (_key, value) => { saved = value; } }, confirmation);
    const reloaded = readReviewRequestConfirmation({ getItem: () => saved }, locale === "pl" ? "en" : "pl");
    assert.ok(reloaded);
    assert.equal(reloaded.offerLabel, displayedOfferLabel);
    const html = renderToStaticMarkup(createElement(ReviewRequestRecord, { confirmation: reloaded }));
    assert.ok(html.includes(displayedOfferLabel));
    assert.ok(buildReviewRequestConfirmationText(reloaded).includes(displayedOfferLabel));
  }
});

test("an ID-only confirmation displays its identifier without inferring a name or fee", () => {
  const id = "agent-action-security-review";
  const oldRecord = JSON.stringify({
    schema: "witnessops.review-request-confirmation.v1",
    requestReference: validResponse.intakeId,
    confirmedAt: validResponse.verifiedAt,
    locale: "en",
    requestKind: id,
    source: "request-form",
  });
  const standalone = buildStandaloneReviewRequestConfirmation({ ...validResponse, requestIntent: id });
  for (const record of [standalone, readReviewRequestConfirmation({ getItem: () => oldRecord }, "pl")]) {
    assert.ok(record);
    const copied = buildReviewRequestConfirmationText(record);
    const rendered = renderToStaticMarkup(createElement(ReviewRequestRecord, { confirmation: record }));
    for (const output of [copied, rendered]) {
      assert.ok(output.includes(id));
      assert.doesNotMatch(output, /AI Agent Red Teaming|Red teaming agentów AI|Agent Action Security Review|€/);
    }
  }
});

test("reopening a saved label after a price change never quotes catalogue terms", (t) => {
  const savedLabel = "Previously displayed assessment name";
  const stale = JSON.stringify({
    schema: "witnessops.review-request-confirmation.v1",
    requestReference: validResponse.intakeId,
    confirmedAt: validResponse.verifiedAt,
    locale: "en",
    requestKind: "agent-action-security-review",
    source: "request-form",
    offerLabel: savedLabel,
  });
  // Only the name was saved. A later catalogue revision cannot supply the missing fee.
  const previousPrices = { ...PUBLIC_AGENT_ACTION_OFFER.price };
  t.after(() => { Object.assign(PUBLIC_AGENT_ACTION_OFFER.price, previousPrices); });
  Object.assign(PUBLIC_AGENT_ACTION_OFFER.price, { en: "€7,100 excl. VAT", pl: "7 100 EUR bez VAT" });

  for (const locale of ["en", "pl"] as const) {
    const record = readReviewRequestConfirmation({ getItem: () => stale }, locale);
    assert.ok(record);
    const html = renderToStaticMarkup(createElement(RecordedReviewRequest, { confirmation: record }));
    const copied = buildReviewRequestConfirmationText(record);
    for (const output of [html, copied]) {
      assert.ok(output.includes(savedLabel));
      assert.ok(output.includes(validResponse.intakeId));
      assert.doesNotMatch(output, /€|\bEUR\b|\bVAT\b/);
    }
    assert.match(html, locale === "en" ? /separate signed statement of work/ : /osobna podpisana umowa/);
    assert.match(copied, locale === "en" ? /Status at mailbox confirmation/ : /Stan w chwili potwierdzenia/);
  }
});

test("other confirmed request paths keep their original service without adding a new-sales price", () => {
  for (const locale of ["en", "pl"] as const) {
    for (const requestKind of ["agent-tools-access-review", "public-exposure-review", "agent-risk-control-review", "review-request"] as const) {
      const record = buildReviewRequestConfirmation(
        { ...validResponse, postVerifyPath: locale === "pl" ? "/pl/review/request/confirmed" : "/review/request/confirmed" },
        { locale, requestKind, source: "request-form" },
      );
      assert.ok(record);
      const html = renderToStaticMarkup(createElement(RecordedReviewRequest, { confirmation: record }));
      assert.ok(html.includes(validResponse.intakeId));
      assert.doesNotMatch(html, /€|\bEUR\b|\bVAT\b/);
    }
  }
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
