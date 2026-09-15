# Discovery / onboarding acceptance

Review date: 2026-09-12. Candidate base: `c687826aa4a008f93608aa4e942053e67fdeac04`. Current authenticated app only, with a text-only public check handoff clarification. Internal source/browser acceptance is not external user research or deployment evidence.

## Current discovery map

| Surface | Current path and decision |
| --- | --- |
| App entry / workspace creation | Names both checks and the evidence/report/history value; existing authentication and workspace creation remain unchanged. |
| Empty overview / asset list | “What do you want to check?” presents two short cards: purpose, when, input, output, boundary and one action each. Viewer asks an Owner. |
| Add asset | Same cards replace the type dropdown. Choosing a card focuses the applicable hostname input. The query hint selects only a supported UI option; server validation remains authoritative. |
| Existing hostname asset | Recommended External Exposure Check, ten-check explanation, separate authorization and explicit run action. First-run copy establishes a public baseline. |
| Existing Linux asset | Recommended One Server Security Check, operator-assisted instructions and existing contact link before upload, then ZIP/signature import and saved checks. |
| Settings / help | Existing product-specific unsigned EE versus signed Local Audit explanation retained. Linux help uses the existing contact channel. |
| Public homepage / catalog | Public homepage links to free `/check` and broader system-review services. Historical service/catalog names are separate from the authenticated product choice; unchanged. |
| Public `/check` result → `/early-access` | CTA now says “Start a saved check”, with history/report/comparison value. Existing text still states a fresh authorized check is required and the transient result is not automatically imported. Admission remains controlled. |

Public homepage positioning was inspected live; `/check`, `/early-access` and catalog contracts were inspected in current source, with the changed handoff tested locally. No public deployment is claimed.

## Locked product copy

The shared display-only `check-discovery.ts` contract is used by the product cards and recommended-check labels.

**External Exposure Check — one line:** Check one public hostname from the outside.

**Two lines:** Check one public hostname from the outside. WitnessOps makes ten bounded public observations after you authorize a run.

**One Server Security Check — one line:** Check one Linux server locally, then compare with a previous check.

**Two lines:** Check one Linux server locally, then compare with a previous check. An authorized operator collects locally; you import the signed Proofpack ZIP and signature.

## First-value paths

Starting from an authenticated empty workspace:

- EE: choose External Exposure Check → enter hostname → Add without scanning → authorize → Run observation → result → View report. Five main action activations including report access; the optional “Run observation” scroll link adds one. Text entry, scrolling, sign-in and workspace setup are not included in this count. The ten-check method is already selected, and collection does not start on asset creation.
- Linux: choose One Server Security Check → enter recorded hostname → Add without scanning → follow operator-assisted instructions / obtain package → choose ZIP → choose signature → Import Security Check → result → report. Six main in-app action activations including dedicated report access, counting each file-picker activation once. Operator setup, native picker interactions and local collection/finalization are separate work, not represented as one click. The imported result already includes report presentation.

Existing assets skip product selection: each displays its one applicable recommended check. Selecting from the empty state carries a narrow product hint into the asset form and focuses its input; there is no required second product decision.

## What users provide

- EE: one public hostname/domain they are authorized to observe, followed by explicit collection authorization. Existing public-hostname restrictions remain unchanged.
- Linux: authorized local operator access, the recorded Linux hostname, and the resulting signed Proofpack ZIP plus matching signature. Adding the asset only records a hostname; the app does not connect to the host.

## What users get

- EE: observations, attention flags, unknowns, evidence and a derived report; subsequent saved checks can be compared.
- Linux: package verification, findings, collection gaps, evidence and a derived report; a subsequent imported check can be compared.

Neither input path starts collection implicitly. No new result, report, verification or comparison contract is introduced.

## When to use each

- EE: customer security reviews, public configuration changes, or a first public baseline.
- Linux: server baselines, handoff, customer evidence, or before/after maintenance.

## Outside-in vs local

External Exposure Check looks from the outside; One Server Security Check collects locally on Linux. They are separate assessments, not a combined assessment. EE is bounded to one hostname and does not enumerate a complete external attack surface. Linux is a bounded read-only check, not a full security audit or certification.

## Operator-assisted Linux boundary

Early Access setup is currently operator-assisted. Local Audit 1.2.2 runs locally with an authorized operator; the operator finalizes/signs off-host, then supplies the ZIP and matching signature for app import. Existing setup contact appears before upload. “Proofpack” is explained as the signed package containing the check evidence. No self-service installer, auth CLI or remote runner is presented as available.

Package verification does not establish host security or source-system truth. Detailed trust/provenance stays in the existing result/report/settings surfaces. Unknown and partial collection semantics are unchanged.

## Changes implemented

- Shared, display-only product descriptions and two-card choice reused in discovery-critical empty states and asset creation.
- Neutral app title, entry, sidebar and invitation wording now acknowledge both products.
- Product selection focuses the matching field; existing assets show the applicable recommended check without another chooser.
- EE first-baseline and Linux first-import guidance explain outputs and later comparison.
- Public handoff describes starting a saved check, avoiding any implication of silently saving the transient observation.
- Responsive cards use the existing dark visual language, one action per card, and no feature matrix or internal proof badges.

No backend, migration, authorization, source custody, verifier, collector or report-model changes. No actual collection/import/signing was performed by this pass. Browser flow execution uses test fixtures.

## Deferred until wops auth

A separately authorized slice may design `wops auth login`, then `wops server check`. No such commands are implemented or advertised as usable here. Installer/runtime distribution, account-to-local execution handoff and removal of operator-assisted guidance require that later work and its own acceptance.

Watch, Update, scheduler, remote runner, Windows/cloud, MSP hierarchy and billing remain out of scope. General history sorting, report self-links, comparison headings, feedback placement and recovery redesign remain deferred.

## Acceptance verdict

**READY FOR WOPS AUTH** as the next separately authorized implementation slice. Discovery/onboarding is technically accepted locally; external comprehension and demand remain unvalidated.

| Validation (Node 22) | Result |
| --- | --- |
| `pnpm app:test` | 55/55 passed; final fresh execution also runs inside health. |
| `pnpm test:app-browser` | 65/65 passed, Chromium and WebKit; includes eight discovery journeys, existing report/PDF, authorization, Linux comparison and retry tests. |
| `EXTERNAL_CHECK_BASE_URL=<local build> pnpm exec playwright test --config tests/external-exposure/playwright.config.ts early-access.spec.ts` | 6/6 passed, including mobile and failed-collection behavior; API responses are fixtures. |
| `pnpm --filter @witnessops/app typecheck` | Passed. |
| `pnpm health` | Passed: 1,857 tests, 0 failures across 12 reported test groups; public/app builds, lint, typechecks, route/receipt smoke and docs validation passed. |
| `git diff --check` | Passed. |
| Security diff review | No security findings. Original snapshot plus reviewed final source/test addenda; documentation reviewed separately. |

The first browser run exposed stale copy assertions and an accidental not-found heading reference introduced during editing. These were corrected; the complete final browser run passes, with no authorization-path changes.

Visual review covered the authenticated add-asset choice and matching input, plus fixture-driven empty workspaces and EE/Linux first-value screens at desktop and 390px. Cards wrap, actions remain reachable, selected input receives focus, and no horizontal overflow was measured. Public handoff mobile copy/action was also inspected. Private screenshots are review artifacts, not committed.

Internal comprehension rubric: both product names and outside/local distinction are visible in the choice heading/cards; inputs and outputs are labelled; each card has one next action. At narrow width cards stack and require scrolling; choosing one focuses its matching input. This is an internal review against the roughly ten-second comprehension goal, not a measured external-user result.
