# PR #453 — classification of all 94 source-CI failures

Exact source: GitHub Actions job **113158206276**, workflow run **37730444482**, head **e8f9c12b22866b142888ed2780cae8556994db8e** (PR #452). TAP summary: **1,595 passed, 94 failed**. Test IDs and messages below are taken from that run, not inferred. Recalculate counts only from each test's own YAML/TAP failure section, stopping at the next test (a less strict scan falsely counted one adjacent error as ENOENT).

## Root categories

| Category | Count | Direct observed failure | Safe repair |
| --- | ---: | --- | --- |
| Fixture cascade — no mail-out | **81** | `ENOENT ... scandir .../mail-out`, because historical fixtures still created test state by submitting retired intent IDs through the now-restricted NEW public endpoint | Seed historically issued test state directly through the existing internal issuance helper with the file-only mail provider; continue verifying token, approval, claimant and operator behavior. Do not reopen old public sales. |
| Outdated public-issuance expectation | **4** | `400 !== 201` on new issuance requests for retired products | Assert the correct 400 public rejection. Where the test is about past verified transactions, seed that exact historical identity internally and keep downstream assertions. A new positive public offer uses the current AI ID. |
| Old inline-source expectation | **9** | Assertions match obsolete inline React page/route layouts instead of the current shared homepage, catalogue, or request component | Follow actual delegation into rendered components and selector; retain EN/PL correctness, scope/provenance/no-guarantee checks. |

Within these 94 the investigation found no independent unrelated failure. The separate AWS/web image-security failures and the unresolved live keyboard-focus proof are outside this TAP group.

## Exact original failure ledger

| TAP ID | Test source | Original assertion | Category |
| --- | --- | --- | --- |
| 113 | src/app/api/assessment/[issuanceId]/approve/route.test.ts | approval route captures explicit approval and hands off to control plane once | Fixture cascade — no mail-out |
| 114 | src/app/api/assessment/[issuanceId]/approve/route.test.ts | approval route cannot start work for non-recon request intent automation-repair-handover | Fixture cascade — no mail-out |
| 115 | src/app/api/assessment/[issuanceId]/approve/route.test.ts | approval route cannot start work for non-recon request intent ai-agent-action-proof-run | Fixture cascade — no mail-out |
| 116 | src/app/api/assessment/[issuanceId]/approve/route.test.ts | approval route cannot start work for non-recon request intent access-change-proof-run | Fixture cascade — no mail-out |
| 118 | src/app/api/assessment/[issuanceId]/approve/route.test.ts | approval route cannot start work for non-recon request intent bounded-workflow-review | Fixture cascade — no mail-out |
| 120 | src/app/api/assessment/[issuanceId]/approve/route.test.ts | approval route cannot start work for non-recon request intent customer-security-review-sprint | Fixture cascade — no mail-out |
| 121 | src/app/api/assessment/[issuanceId]/approve/route.test.ts | approval route cannot start work for non-recon request intent OFFSEC-LOCAL-AUDIT | Fixture cascade — no mail-out |
| 122 | src/app/api/assessment/[issuanceId]/approve/route.test.ts | approval route cannot start work for non-recon request intent OFFSEC-LAUNCH-READY | Fixture cascade — no mail-out |
| 123 | src/app/api/assessment/[issuanceId]/approve/route.test.ts | approval route cannot start work for non-recon request intent OFFSEC-CUSTODY-OPS | Fixture cascade — no mail-out |
| 124 | src/app/api/assessment/[issuanceId]/approve/route.test.ts | approval route cannot start work for non-recon request intent OFFSEC-INCIDENT-READY | Fixture cascade — no mail-out |
| 125 | src/app/api/assessment/[issuanceId]/approve/route.test.ts | approval route cannot start work for non-recon request intent professional-public-footprint-audit | Fixture cascade — no mail-out |
| 128 | src/app/api/assessment/[issuanceId]/approve/route.test.ts | approval route cannot start work for non-recon request intent unclassified-request | Fixture cascade — no mail-out |
| 129 | src/app/api/assessment/[issuanceId]/approve/route.test.ts | approval route does not expose control-plane error bodies | Fixture cascade — no mail-out |
| 130 | src/app/api/assessment/[issuanceId]/approve/route.test.ts | approval route does not expose control-plane configuration errors | Fixture cascade — no mail-out |
| 131 | src/app/api/assessment/[issuanceId]/approve/route.test.ts | approval route does not expose control-plane response parse errors | Fixture cascade — no mail-out |
| 132 | src/app/api/assessment/[issuanceId]/approve/route.test.ts | approval route rejects issuance and email without claimant session | Fixture cascade — no mail-out |
| 133 | src/app/api/assessment/[issuanceId]/approve/route.test.ts | approval route requires an email | Fixture cascade — no mail-out |
| 190 | src/app/api/package/[issuanceId]/disposition/route.test.ts | WEB-014: accept disposition first-write returns ok and forwards to control-plane | Fixture cascade — no mail-out |
| 191 | src/app/api/package/[issuanceId]/disposition/route.test.ts | WEB-014: idempotent replay returns ok with the existing record | Fixture cascade — no mail-out |
| 192 | src/app/api/package/[issuanceId]/disposition/route.test.ts | WEB-014: conflicting later write surfaces 409 from control-plane | Fixture cascade — no mail-out |
| 193 | src/app/api/package/[issuanceId]/disposition/route.test.ts | WEB-014: missing controlPlaneRunId yields 409 not-yet-available | Fixture cascade — no mail-out |
| 194 | src/app/api/package/[issuanceId]/disposition/route.test.ts | WEB-014: email mismatch yields 403 and never calls control-plane | Fixture cascade — no mail-out |
| 195 | src/app/api/package/[issuanceId]/disposition/route.test.ts | WEB-014: invalid disposition value yields 422 | Fixture cascade — no mail-out |
| 196 | src/app/api/package/[issuanceId]/disposition/route.test.ts | WEB-014: oversized comment yields 422 | Fixture cascade — no mail-out |
| 197 | src/app/api/package/[issuanceId]/disposition/route.test.ts | WEB-014: unknown issuance yields 404 | Fixture cascade — no mail-out |
| 198 | src/app/api/package/[issuanceId]/disposition/route.test.ts | WEB-014: not_configured control-plane yields 503 | Fixture cascade — no mail-out |
| 199 | src/app/api/package/[issuanceId]/disposition/route.test.ts | WEB-014: matching identifiers without claimant session yield 401 and no control-plane call | Fixture cascade — no mail-out |
| 241 | src/app/api/review/request/route.test.ts | review request route issues a security-workflow package verification email | Outdated public-issuance expectation — 400 |
| 256 | src/app/api/verify-token/route.test.ts | verify-token route returns access-change confirmation path without assessment attachment on replay | Fixture cascade — no mail-out |
| 257 | src/app/api/verify-token/route.test.ts | approved or started legacy manual replay preserves assessment lifecycle without a no-work notification | Fixture cascade — no mail-out |
| 259 | src/app/api/verify-token/route.test.ts | Agent Action Security Review uses the Polish manual commercial path and operator notification | Outdated public-issuance expectation — 400 |
| 260 | src/app/api/verify-token/route.test.ts | every public service request stays on the bounded manual lane | Outdated public-issuance expectation — 400 |
| 262 | src/app/api/verify-token/route.test.ts | verify-token route sends a reply-ready operator notification for package requests | Outdated public-issuance expectation — 400 |
| 263 | src/app/api/verify-token/route.test.ts | operator notification subject strips requester-controlled line breaks | Fixture cascade — no mail-out |
| 352 | src/app/pl/pl-copy-naturalization.test.ts | Polish homepage leads with security and verification | Old inline-source expectation |
| 356 | src/app/pl/review/request/polish-form-localization.test.ts | Polish PER request chrome mirrors the English offer-specific header | Old inline-source expectation |
| 357 | src/app/pl/review/request/polish-form-localization.test.ts | Polish review request selects the native Polish form copy | Old inline-source expectation |
| 359 | src/app/public-claim-boundary.test.ts | public claim surfaces preserve at least one explicit boundary marker | Old inline-source expectation |
| 378 | src/app/review/sample-cases/external-exposure-assessment/sample-surface.test.ts | sample remains linked from its offer detail and catalogue; pricing links to the catalogue | Old inline-source expectation |
| 1148 | src/lib/public-commercial-routes.test.ts | request pages gate query-selected commercial records to current public SKUs | Old inline-source expectation |
| 1149 | src/lib/public-commercial-routes.test.ts | English review intake can preserve the current workflow offer without reviving a replaced SKU | Old inline-source expectation |
| 1150 | src/lib/public-commercial-routes.test.ts | Polish review intake preserves the same public workflow offer | Old inline-source expectation |
| 1188 | src/lib/review-request-selected-service-ui.test.ts | selected non-agent services do not inherit the agent proof bundle | Old inline-source expectation |
| 1372 | src/lib/server/claimant-actions.test.ts | amend writes the new scope through the existing intake store path | Fixture cascade — no mail-out |
| 1373 | src/lib/server/claimant-actions.test.ts | retract writes a terminal claimant action and blocks subsequent approval | Fixture cascade — no mail-out |
| 1374 | src/lib/server/claimant-actions.test.ts | disagree writes a terminal claimant action and blocks subsequent approval | Fixture cascade — no mail-out |
| 1375 | src/lib/server/claimant-actions.test.ts | amend rejects email mismatch | Fixture cascade — no mail-out |
| 1376 | src/lib/server/claimant-actions.test.ts | amend requires non-empty amended scope | Fixture cascade — no mail-out |
| 1377 | src/lib/server/claimant-actions.test.ts | retract requires reason | Fixture cascade — no mail-out |
| 1378 | src/lib/server/claimant-actions.test.ts | claimant action route rejects issuance and email without claimant session | Fixture cascade — no mail-out |
| 1379 | src/lib/server/claimant-actions.test.ts | claimant action route contains unexpected storage errors | Fixture cascade — no mail-out |
| 1380 | src/lib/server/claimant-actions.test.ts | approve route is blocked after retract | Fixture cascade — no mail-out |
| 1381 | src/lib/server/claimant-actions.test.ts | approve route is blocked after disagree | Fixture cascade — no mail-out |
| 1382 | src/lib/server/claimant-actions.test.ts | approve route is NOT blocked after amend | Fixture cascade — no mail-out |
| 1383 | src/lib/server/claimant-actions.test.ts | claimant actions cannot be taken after approval | Fixture cascade — no mail-out |
| 1384 | src/lib/server/claimant-actions.test.ts | WEB-005: claimant reopens retract -> claimantAction cleared, ledger event appended | Fixture cascade — no mail-out |
| 1385 | src/lib/server/claimant-actions.test.ts | WEB-005: claimant reopens disagree -> claimantAction cleared | Fixture cascade — no mail-out |
| 1386 | src/lib/server/claimant-actions.test.ts | WEB-005: claimant reopen on amend is refused with explicit message | Fixture cascade — no mail-out |
| 1387 | src/lib/server/claimant-actions.test.ts | WEB-005: claimant reopen on a clean run is refused | Fixture cascade — no mail-out |
| 1388 | src/lib/server/claimant-actions.test.ts | WEB-005: claimant reopen rejects email mismatch | Fixture cascade — no mail-out |
| 1389 | src/lib/server/claimant-actions.test.ts | WEB-005: claimant reopen does NOT clear an operator reject (cross-actor refused) | Fixture cascade — no mail-out |
| 1390 | src/lib/server/claimant-actions.test.ts | WEB-005: end-to-end retract -> reopen -> approve succeeds | Fixture cascade — no mail-out |
| 1391 | src/lib/server/claimant-actions.test.ts | WEB-005: reopen route returns 200 on retract clearance | Fixture cascade — no mail-out |
| 1392 | src/lib/server/claimant-actions.test.ts | WEB-010: assessment-page predicate flags claimant retract under operator reject | Fixture cascade — no mail-out |
| 1393 | src/lib/server/claimant-actions.test.ts | WEB-010: assessment-page predicate flags claimant disagree under operator reject | Fixture cascade — no mail-out |
| 1394 | src/lib/server/claimant-actions.test.ts | WEB-010: assessment-page predicate is false when only operator-reject (no claimant action) | Fixture cascade — no mail-out |
| 1395 | src/lib/server/claimant-actions.test.ts | WEB-010: assessment-page predicate is false on claimant amend (non-terminal) | Fixture cascade — no mail-out |
| 1396 | src/lib/server/claimant-actions.test.ts | WEB-010: claimant-banner predicate flags operator-reject in force | Fixture cascade — no mail-out |
| 1397 | src/lib/server/claimant-actions.test.ts | WEB-010: claimant-banner predicate is false on a clean run | Fixture cascade — no mail-out |
| 1469 | src/lib/server/operator-actions.test.ts | reject writes intake.state=rejected and issuance.approvalStatus=approval_denied | Fixture cascade — no mail-out |
| 1470 | src/lib/server/operator-actions.test.ts | reject is idempotent on replay with same reason path | Fixture cascade — no mail-out |
| 1471 | src/lib/server/operator-actions.test.ts | reject requires reason and actor | Fixture cascade — no mail-out |
| 1472 | src/lib/server/operator-actions.test.ts | request_clarification leaves intake.state and approvalStatus unchanged | Fixture cascade — no mail-out |
| 1473 | src/lib/server/operator-actions.test.ts | request_clarification requires both reason and question | Fixture cascade — no mail-out |
| 1474 | src/lib/server/operator-actions.test.ts | request_clarification refuses on a rejected intake | Fixture cascade — no mail-out |
| 1475 | src/lib/server/operator-actions.test.ts | approve route is blocked after operator reject | Fixture cascade — no mail-out |
| 1476 | src/lib/server/operator-actions.test.ts | approve route is NOT blocked by a clarification request alone | Fixture cascade — no mail-out |
| 1477 | src/lib/server/operator-actions.test.ts | WEB-005: operator rescinds reject -> intake state reverts to ledger previous_state | Fixture cascade — no mail-out |
| 1478 | src/lib/server/operator-actions.test.ts | WEB-005: operator rescind on a non-rejected intake -> 409 | Fixture cascade — no mail-out |
| 1479 | src/lib/server/operator-actions.test.ts | WEB-005: operator rescind on a clarification-only intake -> 409 | Fixture cascade — no mail-out |
| 1480 | src/lib/server/operator-actions.test.ts | WEB-005: operator rescind requires reason and actor | Fixture cascade — no mail-out |
| 1481 | src/lib/server/operator-actions.test.ts | WEB-005: end-to-end reject -> rescind -> approve succeeds | Fixture cascade — no mail-out |
| 1482 | src/lib/server/operator-actions.test.ts | WEB-006: reject from responded -> 409 with state-named message | Fixture cascade — no mail-out |
| 1483 | src/lib/server/operator-actions.test.ts | WEB-006: reject from replayed -> 409 | Fixture cascade — no mail-out |
| 1484 | src/lib/server/operator-actions.test.ts | WEB-006: reject from expired -> 409 | Fixture cascade — no mail-out |
| 1485 | src/lib/server/operator-actions.test.ts | WEB-006: request_clarification from responded -> 409 | Fixture cascade — no mail-out |
| 1486 | src/lib/server/operator-actions.test.ts | WEB-006: request_clarification from replayed -> 409 | Fixture cascade — no mail-out |
| 1487 | src/lib/server/operator-actions.test.ts | WEB-006: request_clarification from expired -> 409 | Fixture cascade — no mail-out |
| 1488 | src/lib/server/operator-actions.test.ts | WEB-006: existing reject from verified state still works (regression guard) | Fixture cascade — no mail-out |
| 1489 | src/lib/server/operator-actions.test.ts | WEB-012: rescind on a clean run returns no coexistingClaimantBlock | Fixture cascade — no mail-out |
| 1490 | src/lib/server/operator-actions.test.ts | WEB-012: rescind with co-existing claimant retract returns kind retract | Fixture cascade — no mail-out |
| 1491 | src/lib/server/operator-actions.test.ts | WEB-012: rescind with co-existing claimant disagree returns kind disagree | Fixture cascade — no mail-out |
| 1492 | src/lib/server/operator-actions.test.ts | WEB-012: rescind with claimant amend (non-terminal) returns no coexistingClaimantBlock | Fixture cascade — no mail-out |
| 1493 | src/lib/server/operator-actions.test.ts | WEB-012: rescind result is JSON-serialisable into the route envelope shape | Fixture cascade — no mail-out |

## Required acceptance

- The historical fixture path may use internal issuance in file-only test configuration, but the public `/api/engage`, `/api/contact`, and `/api/review/request` interfaces must reject retired structured identities.
- Real stored historical intakes and records are never rewritten. Verify existing token, replay, claimant, operator, notice and disposition behavior by executing those test assertions.
- New public sales remain exactly AI `offerId=agent-tools-access-review` or external `productId=OFFSEC-EXTERNAL-EXPOSURE`; non-offer fit contexts remain separate.
- Shared EN/PL presentation tests must check the current delegation and underlying commercial and evidence constraints, not delete coverage.
- Browser keyboard focus must be tested with Tab navigation, not a programmatic focus event alone, and exhibit a computed visual indicator.
- App health, public UI, image-security, supply-chain and deployment gates remain independent; no suppression, timeout/runner bypass, merge or deployment.

## Evidence limits

The **81 ENOENT symptoms conceal downstream assertions**; only a subsequent full run can establish whether their underlying claimant/operator behaviors pass. A `400 !== 201` cannot be interpreted as a failed historic verification because issuance itself failed before a stored record existed. This is a diagnostic classification, not a claim that 94 failures have been repaired.