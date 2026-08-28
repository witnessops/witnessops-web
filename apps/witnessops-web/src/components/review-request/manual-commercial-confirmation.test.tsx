import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { ManualCommercialConfirmation } from "./manual-commercial-confirmation";

test("legacy manual issuance renders a bounded English operator handoff", () => {
  const html = renderToStaticMarkup(
    <ManualCommercialConfirmation
      email="buyer@example.com"
      issuanceId="iss_legacy"
      locale="en"
      requestLabel="Key, Access and Custody Review request"
      verifiedAt="2026-07-11T17:06:21Z"
    />,
  );

  assert.match(html, /data-testid="manual-commercial-confirmation"/);
  assert.match(html, /queued for operator review/);
  assert.match(html, /Key, Access and Custody Review request/);
  assert.match(html, /No automated assessment, target-facing action, or other work has started/);
  assert.match(html, /href="\/catalog"/);
  assert.doesNotMatch(html, /Scope Approval|Governed Recon Results/);
});

test("legacy manual issuance localizes the bounded Polish handoff", () => {
  const html = renderToStaticMarkup(
    <ManualCommercialConfirmation
      email="kupujacy@example.pl"
      issuanceId="iss_legacy_pl"
      locale="pl"
      requestLabel="Key, Access and Custody Review request"
    />,
  );

  assert.match(html, /oczekuje na przegląd operatora/);
  assert.match(html, /Potwierdzenie skrzynki nie uruchomiło automatycznej oceny/);
  assert.match(html, /href="\/pl\/catalog"/);
});

test("assessment page routes current manual intents before recon rendering", () => {
  const source = readFileSync(
    resolve(__dirname, "../../app/assessment/[issuanceId]/page.tsx"),
    "utf8",
  );

  assert.match(source, /isManualCommercialRequestIntent\(intake\.submission\.intent\)/);
  assert.match(source, /intake\.state === "admitted"/);
  assert.match(source, /approvalStatus === "pending"/);
  assert.match(source, /!record\.assessmentRunId/);
  assert.match(source, /!record\.controlPlaneRunId/);
  assert.match(source, /record\.assessmentStatus === "unavailable"/);
  assert.match(source, /<ManualCommercialConfirmation/);
  assert.ok(
    source.indexOf("<ManualCommercialConfirmation") <
      source.indexOf("buildPostApprovalLifecycle(record)"),
  );
});
