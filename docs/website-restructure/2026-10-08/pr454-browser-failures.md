# PR #454 — Two-Offer V1 browser-proofs follow-up

**Source baseline:** PR #453 head `b099ace8bba5f7336397731fed9ae9f58c81f105`; UI workflow run 37732179729, job 113163796036 (2026-10-08).

## Observed failure inventory

The unmodified PR #453 browser workflow produced **17 failed + 32 passed + 4 not run** in homepage/navigation and **1 failed + 9 passed** in verifier-conformance. The exact-commit commercial-regression suite passed 1,689/1,689 and the buyer smoke passed 15/15. The separate Trivy exact-image gate still failed; this PR does not change it.

| Original failing scenario | Count | Root mismatch | Intended preservation |
| --- | ---: | --- | --- |
| `homepage-hero.spec.ts` mobile grid | 1 | Proof expected /library but approved homepage CTA now links the historical synthetic one-action sample | Follow exact synthetic sample and verify provenance; library remains a distinct functioning resource |
| `homepage-priorities.spec.ts` six viewports | 6 | Expected superseded hero headline, €500 footprint, inline synthetic evidence and inline submission form | Assert approved two paid review cards, current prices/CTAs, free hostname check, no inline form, Ask and docs access |
| `homepage-priorities.spec.ts` Polish | 1 | Expected former Polish metadata and own-system marketing scene | Verify current Polish metadata, two-review terms, retained sample labeling and /pl/docs |
| `navigation-integrity.spec.ts` sample link | 1 | Expected skills /library from historical-action sample CTA | Follow sample; separately verify /library remains accessible |
| `offer-details.spec.ts` old custody offer CTA | 1 | Expected to sell an old product from new public form | Require fail-closed unavailable selection and two current choices, no silent price/intent mapping |
| `review-request.spec.ts` response, historical, AI, query aliases, external, pilot | 6 | Old automatic form / legacy offer fallback / query title-only selection vs explicit two-offer gate | Test exact offerId/productId, negative expired/unknown/combined ids, real selected form field accessibility/validation and simulated code issuance, no new unknown issuance |
| `shared-shell.spec.ts` mobile form | 1 | Bare /review/request now shows two choices, form requires explicit selection | Navigate with current AI identifier, verify mobile form visibility and contrast |
| `agent-verification-funnel.spec.ts` | 1 | Expected superseded headline and skills library as sample link | Assert approved headline, follow historical sample and separately verify skills library / verifier |

**Total: 18.** UI regressions are tracked separately from the 94 prior TAP failures and all image-security findings.

## Gates

- Preserve homepage EN/PL, two exact paid offers and prices, free hostname check, synthetic labels, /library and docs.
- Do not turn obsolete service/detail URLs into new purchases. Legacy issued records and verification are unchanged.
- Test both canonical positive request identities, rejected query-only labels, old offer IDs, conflicting IDs, unknown pilot and two-choice bare form behavior.
- Keep field focus, minimum touch sizes, keyboard access, error summaries, no-secrets and evidence-handling disclaimers, client-side mail simulation (never send to live provider), and no horizontal overflow.
- No test `.skip`, scanner suppression, CI gate relaxation, merge, deployment, AWS write or sitemap change. This is a **browser-test contract repair**, not a new commercial offering or historical-content deletion.

## Test execution requirements

The previous run provides a RED baseline for each named scenario. Require a fresh GitHub workflow run on the exact PR #454 head: `pnpm --filter witnessops-web test`, `pnpm smoke:buyer-path:test`, `pnpm ui-proof:hero:ci`, `pnpm ui-proof:skill-conformance`, and the inherited app and supply-chain workflows. The outcome of a step marked `continue-on-error` does **not** count as a green test: read the actual Playwright command summary and the final blocking gate. Report any failures by exact name without suppression.

Trivy / image findings remain an independent blocker to release and are outside this change.
