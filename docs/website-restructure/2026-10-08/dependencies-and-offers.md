# Dependencies, offers and preservation controls

All source references below are relative to repository root at commit `6ac66c3de9da1dc17d038033f3571b466e27f557`, inspected on 2026-10-08. This is an observation and planning record, not new commercial authority.

## Source anchors

| Source | Blob SHA |
| --- | --- |
| `AGENTS.md` | `59a9156d51651ba789fe81be27cae3b60402363f` |
| `apps/witnessops-web/src/lib/commercial-truth.ts` | `4614a7f49ac4d58182698785dbc8abcdcd177f78` |
| `apps/witnessops-web/src/lib/buyer-services.ts` | `2bf101387ba883ceb09a0c9f0de947372e961ad4` |
| `apps/witnessops-web/src/lib/public-commercial-routes.ts` | `e4f2e068adac8894e79809308d54a3fe09010f40` |
| `apps/witnessops-web/src/lib/public-seo.ts` | `37ad46159b39d628c85c40e6973cdccfc42a9f73` |
| `apps/witnessops-web/src/components/marketing/simple-homepage.tsx` | `6f646a4e8692aa9b50fb6db1e68b93ffc570a685` |
| `apps/witnessops-web/src/app/sitemap.ts` | `4197329f6e1e4dc50129210e3eac2a96542c9c2e` |
| `apps/witnessops-web/src/app/robots.ts` | `fe84cbe42b385a426c2a74aa61a9a8a13aa6ce5e` |
| `apps/witnessops-web/next.config.js` | `adb61d5ec09177d35e08e7da32ef5e7459228427` |
| `docs/commercial/13-public-route-disposition.md` | `4b8d4b8a271a9fa49add7e6c13dc95bbea0ebe7a` |
| `.github/workflows/aws-release.yml` | `237c6dfaa56d5de283d5c6bdf3741ef8188f60e6` |
| `.github/workflows/ui-proof-homepage-hero.yml` | `d8b70061a3446d10ffbc87f2275af5fc397c8dec` |

Inspect using GitHub `fetch_file` with the pinned `ref`, or fetch the blob by SHA. The commercial index and adopted offer identity/naming policy remain prerequisites before later naming changes. This addendum does not rewrite conflicting historical records.

## Paid-offer identity snapshot

| Record / identity | Observed route or intake | Current meaning to preserve |
| --- | --- | --- |
| `PRIMARY_OFFER`, `agent-tools-access-review` | `/catalog/workflows`; allowlisted `offerId` enquiry | AI Agent Tools & Access Review, starting at EUR 2,500 excluding VAT, fixed quote after scope. One agreed device/OS, dated inventory, named agent setup, selected connection and consequential action. Target 10 working days only after scope, authority, payment, handling and inputs are confirmed. |
| `INTERNET_FOOTPRINT_REVIEW_OFFER` | Generic `/review/request`; no new offer ID or dedicated route established by this record | Early Bird - Internet Footprint Review, EUR 500 fixed excluding VAT. English display terms; do not invent a delivery promise, checkout, retest or Polish commercial contract. This is the second current homepage card. |
| `EXTERNAL_ATTACK_SURFACE_OFFER`, `external-exposure-assessment`, product `OFFSEC-EXTERNAL-EXPOSURE` | `/catalog/offsec-external-exposure` and Polish equivalent | Separate EUR 1,900 excluding VAT review of one authorized internet-facing system, no exploitation, not a penetration test. Three-working-day delivery clock starts only after the documented gates. Preserve its contracted focused retest; do not attach its scope to the EUR 500 card. |
| `LEGACY_AGENT_ACTION_OFFER`, `bounded-workflow-review` | Historical identity sharing `/catalog/workflows` | Superseded Agent Action Security Review at EUR 2,500 fixed. Preserve historic request interpretation without restoring old public terms or replacing current `offerId`. |
| `automation-repair-handover` | `/catalog/automation-repair` and Polish equivalent | EUR 250 diagnosis; EUR 750 total including diagnosis only when an agreed bounded repair fits. No guaranteed fix or unlimited support. |
| `professional-public-footprint-audit` | `/catalog/professional-public-footprint-audit` and Polish equivalent | Separate EUR 4,900 excluding VAT consent-based professional/firm review by request. Not the EUR 500 organization footprint card. |

Other observed buyer-service IDs are `customer-security-review-sprint`, `one-server-security-check`, `launch-readiness-check`, `key-access-custody-review`, and `incident-readiness-review`. They are not retired merely because the homepage emphasizes two reviews. Keep their exact terms in their current source records; this snapshot is not an abbreviated substitute for an SOW.

## Dependency and route disposition map

Default disposition for every unclassified source template or sitemap URL: **HOLD unchanged until independently resolved**. A proposed navigation cut is not permission to alter HTTP/indexability behavior.

| Route family / surface | Source ownership and observed dependencies | Preserve / later change gate |
| --- | --- | --- |
| `/`, `/pl` | App page entrypoints, `simple-homepage`, home-content SEO, `commercial-truth`, `buyer-services`, contact form and CSS | Keep locale/canonical/CTA markers; upgrade hierarchy only. Do not assume English and Polish offer parity. |
| `/catalog`, `/pricing` | Marketing pages, buyer-service and offer records | Consolidate discovery/data reuse without removing a route, service, price or deep link. |
| `/catalog/workflows` | Dedicated page plus current/legacy offer contracts | Same route does not mean same offer ID. Current Polish buyer-service link may use the English route; do not invent `/pl/catalog/workflows`. |
| `/catalog/[skuId]`, `/pl/catalog/[skuId]` | Dynamic page templates, current-SKU guard, `getPolishSkus` and commercial records | Unknown or nonpublic SKU is not authorized for public sale. Inspect handler behavior before claiming its exact HTTP status. |
| `/review/request`, `/pl/review/request`, confirmed pages | Buyer request-link helpers and intake/page/API family | Preserve IDs, precedence, display-name handling, validation, non-secret request, verification, anti-abuse and confirmation behavior. No test submissions to live intake. |
| `/check` | Check page, `/api/external-exposure` surface and special security headers | Preserve bounded public-hostname behavior, error states and rate limits. No arbitrary new targets, background scan or changed collection authority. |
| `/library`, `/library/[slug]`, downloads | `listSkills`, library templates and versioned download handlers | Keep artifact identity, current and versioned download paths. This library is not automatically equivalent to a customer report gallery. |
| `/review/sample-cases/*`, `/review/sample-report` | Sample pages, `sample-artifact-contract`, artifact-link tests, same-origin sample assets | Upgrade summaries while retaining synthetic/historical labels and exact artifact bytes/hashes. Existing artifacts are not new proof of real execution. |
| `/verify`, `/api/verify` | Receipt-only verifier and `packages/proof` boundary | Freeze semantics. Do not broaden into whole-bundle, system safety, certification or source-truth claims. |
| `/proofpack`, `/verify/skill`, `/verify-token` | Dedicated utilities, API where present, headers and robots rules | No SEO cleanup may weaken isolation, cache or referrer controls or widen input types. |
| `/docs/*`, `/pl/docs/*`, `/research/*`, articles | Docs templates/content package, editorial registry, navigation and canonical helpers | Deeper placement only; retain technical URLs, anchors and search access. Preserve apex English docs and separately governed legacy-host routing. |
| `/early-access`, app links | Public product information; separate `apps/witnessops-app` owns accounts and workspaces | Parking future sales is not removal of existing app access or entitlement/consent controls. |
| `/admin/*`, `/assessment/[issuanceId]`, `/package/[issuanceId]`, `/execution/*`, payment confirmation | Source templates present, public/runtime behavior not established by this capture | Out of restructuring scope; retain existing access restrictions. Do not add sensitive/result pages to public navigation or sitemap. |
| Legal/security/support/status and other aliases | Source templates and existing linked resources | Hold by default. Do not move or delete based solely on low traffic or naming. |
| `/buyer-faq` | Proposed new route; absent from captured page-template list | Decide locale ownership and avoid duplicating technical `/docs/faq`; no new runtime or sales authority. |

Observed live homepage inbound-link examples include `/catalog`, `/pricing`, `/library`, `/check`, `/early-access`, `/docs/getting-started`, `/docs/getting-started/cli`, `/docs/getting-started/results`, `/review/sample-cases`, `/verify`, `/research`, `/support`, legal pages, generic enquiry and current agent enquiry. This is not a full backlink graph. The page also links to app signup/login/assets/reports/settings; those product flows were not exercised.

The primary enquiry uses `/review/request?offerId=agent-tools-access-review&offer=AI+Agent+Tools+%26+Access+Review`. The footprint enquiry uses `/review/request`. The product-based helper uses `productId` plus `offer`; public-offer helper uses `offerId` plus `offer`. Preserve allowlists, locale and explicit-ID precedence over display text. Do not treat arbitrary query strings as authority to expose a retired product.

## Existing SKU classifications

Source-declared current SKU IDs: `OFFSEC-LOCAL-AUDIT`, `OFFSEC-EXTERNAL-EXPOSURE`, `OFFSEC-LAUNCH-READY`, `OFFSEC-CUSTODY-OPS`, `OFFSEC-INCIDENT-READY`.

Private-preview IDs: `WORKFLOW-FIT`, `SAAS-DEMO`, `SAAS-OPERATOR`, `SAAS-TEAM`, `SAAS-FLEET`, `ADDON-SEATS-10`, `ADDON-GOAL0-READER`.

Replacement IDs: `WORKFLOW-S`, `WORKFLOW-M`, `WORKFLOW-L`, `WORKFLOW-RERUN`.

Unresolved IDs: `OFFSEC-PILOT`, `OFFSEC-RETAINER`, `OFFSEC-PROOF-INFRA`, `OFFSEC-TRAINING-VM-LAB`, `OFFSEC-TRAINING-COURSE-FULL`, `OFFSEC-TRAINING-MODULE-POSTURE`, `OFFSEC-TRAINING-MODULE-RECEIPT`, `OFFSEC-TRAINING-MODULE-DRIFT`, `OFFSEC-TRAINING-MODULE-PROOF-PACK`, `OFFSEC-TRAINING-MODULE-PILOT`, `SBOM-MIN-ELEMENTS`. Unknown defaults to unresolved. Classification is not a fresh HTTP test.

## Ten source-configured permanent redirect rules

| Source | Destination |
| --- | --- |
| `/review/sample-cases/offsec-shield-local-server-audit` | `/review/sample-cases/local-server-security-review` |
| `/review/sample-cases/offsec-shield-local-server-audit/:path*` | `/review/sample-cases/local-server-security-review/:path*` |
| `/catalog/offsec-access-removed` | `/catalog` |
| `/pl/catalog/offsec-access-removed` | `/pl/catalog` |
| `/catalog/offsec` | `/catalog` |
| `/access-change-proof-run` | `/catalog/workflows` |
| `/catalog/workflow-s` | `/catalog` |
| `/catalog/workflow-m` | `/catalog` |
| `/catalog/workflow-l` | `/catalog` |
| `/catalog/workflow-rerun` | `/catalog` |

These are declarations in `next.config.js`, not a complete redirect inventory: page-level redirects and host/edge routing are separate. Do not claim a live status code without a fresh GET. The historical route-disposition document disagrees on the last four destinations and predates the current agent offer identity.

## SEO, security and artifact dependencies

`sitemap.ts` combines static routes, editorial articles, skill records, current buyer-service SKUs, Polish SKUs, support content and the English docs corpus. `public-seo.ts` owns canonical origin and genuine language pairs. `robots.ts` allows the public site, disallows `/verify/skill`, and advertises `/sitemap.xml`. Neither sitemap membership nor a zero-impression row establishes indexing status.

`next.config.js` gives check/proofpack/token utilities special cache, referrer and content-security rules. Sample artifact paths have immutable caching; demo-key material has a separate revalidation policy. Preserve these rules and same-origin artifact URLs. Marketing analytics allowances must not expand into tools, auth, query-bearing or private-result paths during navigation work.

Discovered regression files include `sitemap.static-routes.test.ts`, `structured-data.test.ts`, `legacy-offer-redirect.test.ts`, `public-claim-boundary.test.ts`, `docs/canonical-tags.docs-path.test.ts`, `pl/catalog/polish-catalog-parity.test.ts`, `pl/review/request/polish-form-localization.test.ts`, sample `artifact-links.test.ts`, `review/sample-cases/sample-work-quality.test.tsx`, `verify/verify-page-boundary.test.ts`, `verify/skill/skill-page-boundary.test.ts`, and `api/public-intake-rate-limit.test.ts`, under the web app source. Discovery is not execution.

The inspected release workflow is manually dispatched and separates build/publication from deployment. Root repository instructions require explicit release authority. No workflow, environment, trust binding, app access, dependency or production configuration is changed by PR 00.

## Read replay

GitHub: fetch the repository branch, pinned app-route tree recursively, and named files at the source commit. Tree transcription is scoped to `page.tsx`; API handlers, assets, runtime-generated paths and the separate product app are not counted as marketing pages.

Public homepage: `Firecrawl.firecrawl_scrape` for `https://witnessops.com/`, formats markdown/links, `onlyMainContent=false`, `maxAge=0`, `storeInCache=false`; returned HTTP 200. Scrape ID `01a11990-7d22-7715-9159-6655dbb45322`. This was a page read, not a rendered browser acceptance or form submission.

GSC: replay the explicit window and inputs in `seo-baseline.json`. Do not run submit, inspect, tracker-add, mutation or report-sharing tools as part of replay without their separate authorization; the retained earlier URL inspections already created diagnostic history and are not new indexing requests.
