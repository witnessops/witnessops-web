# PR 00: WitnessOps website preservation baseline

Captured: 2026-10-08. Status: documentation-only draft; restructuring is not implemented.

## Authority and scope

Founder approved PR 00: capture routes, dependencies, offers and SEO evidence, then propose staged PRs. This record does not authorize implementation of PRs 01-06, offer retirement, deletion, redirect changes, deindexing, payments, provider activation, URL/sitemap submission, merge or deployment. Code approval and release approval remain separate.

Source repository: `witnessops/witnessops-web`.
Source commit: `6ac66c3de9da1dc17d038033f3571b466e27f557`.
Root tree: `5b85e398e314fc683db562220aa58069ea2aff9a`.
App-route tree: `75e7a155d3174b8df297cfa7d146af1699168765`.
These identify inspected source, not the deployed release.

## Capture contents and evidence classes

- [source-pages.txt](source-pages.txt): 102 `page.tsx` paths, relative to `apps/witnessops-web/src/app/`, transcribed from the non-truncated recursive GitHub tree. Route groups in parentheses are not URL segments. Bracket segments are templates, not actual customer IDs. Source existence does not establish public availability or indexing.
- [sitemap-urls.txt](sitemap-urls.txt): all 136 URL strings returned by the live GSC Wizard sitemap fetch. The homepage string intentionally has no trailing slash. This is a URL-list transcription, not an XML-byte archive or an all-pages HTTP crawl.
- [dependencies-and-offers.md](dependencies-and-offers.md): observed source dependencies, preservation boundaries, redirect rules and conflicts. Reverse references are bounded examples, not an exhaustive repository-wide dependency graph.
- [seo-baseline.json](seo-baseline.json): property metrics, visible queries, selected landing pages, prior indexing/on-page observations and measurement limitations. Selected page rows are not a complete analytics export.

Evidence classes: `SOURCE` = pinned repository read; `LIVE_GET` = public read without form submission; `GSC` = connected Search Console result; `PRIOR_OBSERVATION` = earlier 2026-10-08 baseline retained explicitly; `PROPOSED` = future design, not current behavior. Normalized notes are not raw provider responses. Capture date is known; per-call observation seconds were not archived and must not be invented.

## Material corrections to the earlier plan

1. The two current homepage paid cards are **AI Agent Tools & Access Review, starting at EUR 2,500**, and **Early Bird - Internet Footprint Review, EUR 500 fixed**, excluding VAT. The separate EUR 1,900 External Attack Surface Review is not the EUR 500 card. Preserve both identities and retain other current public services pending a separate decision.
2. The sitemap is published and yielded 136 URLs, although the connected domain property's submitted-sitemap listing was empty. Do not recreate or submit it based on the empty listing alone.
3. The sitemap join reports zero for `https://witnessops.com`, while the page report records 117 impressions and two clicks for `https://witnessops.com/`. Preserve the exact strings; reconcile this likely URL-join mismatch before interpreting zero as lost visibility.
4. Current source redirects the four old workflow-size routes to `/catalog`; the historical route-disposition document says `/catalog/workflows`. Preserve both observations; do not silently change current routing to match old prose.
5. The live homepage exposes app signup/login links. Parking future SaaS sales is not authority to disable existing accounts, signup, saved results, reports, sharing or workspace access.

## Founder decisions and proposed treatment

| Decision | Treatment in later PRs | Invariant |
| --- | --- | --- |
| Keep two primary paid reviews | UPGRADE the two current homepage cards | No price, identity, scope or timing substitution |
| Simplify homepage | UPGRADE hierarchy and copy | Keep meaningful limits and working enquiry paths |
| Consolidate pricing/catalog discovery | UPGRADE shared presentation | Retain both URLs and current secondary offers |
| Retain free hostname check | UPGRADE explanation and optional next step | A snapshot is not a paid review or authorization |
| Move technical explanations deeper | CUT prominence, not content | Preserve technical URLs, anchors and evidence access |
| Improve sample evidence | UPGRADE buyer summary and provenance labels | No invented execution, customer or verification claims |
| Future SaaS offers | PARK future sales claims | Preserve current app functionality and existing restrictions |
| Dedicated buyer FAQ | ADD, proposed `/buyer-faq` | No new promises; locale and route checks before creation |

## Proposed staged PRs

Every row is a separate reviewable change after this baseline is accepted. No PR below is created or approved by this document.

| Stage | Bounded scope and dependencies | Required acceptance evidence |
| --- | --- | --- |
| 01: Homepage and offer alignment | `simple-homepage`, current offer constants, content SEO and request-link helpers. Keep the EUR 500 generic enquiry distinct from the current agent `offerId`. | EN/PL and mobile/desktop before/after evidence; no new offer IDs or commercial terms; current primary CTA and non-secret intake preserved; reconcile metadata extraction discrepancy and existing PR 448 before merge. |
| 02: Services and prices | Catalog/pricing pages and `buyer-services`. Share display data rather than rename URLs. Separate primary discovery from other current services. | Offer/price/VAT/start-gate comparison; direct URL and parameter parity; secondary offers remain accessible; no redirect or checkout change. |
| 03: Free check | `/check` explanatory and result-facing presentation only. No collector, API or security-header change. | Empty/error/success states, keyboard/mobile review and optional enquiry path; limits stay explicit; no automatic scans, accounts or submissions. Tests use fixtures, not live prospect targets. |
| 04: Evidence and buyer FAQ | Existing sample hub/report and artifact contracts; new FAQ subject to route validation. Review overlap with sample/pilot PRs before edits. | Separate historical/synthetic/real evidence; unchanged artifact bytes, hashes and downloads; answer scope, inputs, authority, price/VAT, start gates, deliverables, limits and next steps; retain technical FAQ; do not fabricate a Polish offer contract. |
| 05: Navigation and future-sales parking | Header/footer and homepage discovery links; current SKU classification. | Link map before/after; technical content still reachable; no deleted routes or changed noindex/404 behavior; no disruption of app signup/login/support. |
| 06: SEO and regression hardening | Metadata, canonical/hreflang/sitemap parity and applicable structured data, after contracts are settled. | Measured technical defects only; generated sitemap diff; request-parameter canonical handling; test inclusion in CI; field/lab performance clearly distinguished; no SEO or provider settings changes without approval. |

Recommended future buyer flow: clear problem -> two reviews -> concise sample evidence and FAQ -> existing scoped enquiry. Free check is a separate optional path. Engineering detail remains linked deeper. No new runtime, CMS, redesign framework or sales pipeline is proposed.

## Gates before implementation, retirement and release

Before any implementation, refresh main and overlapping PRs, diff against this pinned baseline, inspect exact affected source and all relevant subtree instructions, complete reverse-reference searches for files being moved, and agree the bounded patch. PR 448 was re-read as open/draft at head `d041a59ff103f5dd3ee58c1defe7c9de174bf662`; it is not merged or absorbed here. PRs 420, 444, 431, 434 and paused 384 were identified in the earlier search; their latest state and overlap need rechecking before implementation.

Every later PR must attach an affected-route matrix, metadata/offer/parameter diff, relevant test results, mobile and desktop evidence, and a reversible source diff. Source rollback is a reviewed revert of that PR, not permission to roll back production. No destructive operation is pre-approved. Retirement would need a separate exact URL list, inbound-reference and search evidence, replacement rationale, explicit approval and post-change checks. Do not redirect unrelated retired content to the homepage.

Root `AGENTS.md` owns repository and release boundaries. Discovered checks include `pnpm health`, `pnpm smoke:buyer-path:test`, `pnpm --filter witnessops-web test`, `pnpm ui-proof:hero:ci` and `pnpm ui-proof:skill-conformance`. These are replay requirements, not tests executed for this capture. Existing UI-proof CI is path-filtered; verify every changed buyer-path test actually runs. Do not trigger release or deploy workflows for this documentation patch.

## Coverage and remaining unknowns

Captured: page-template inventory, published sitemap URL list, selected source dependencies and offer contracts, current public homepage read, Search Console baseline, known contract conflicts, and future acceptance gates.

Not captured: full generated/build route table, all page response chains, every DOM/canonical/hreflang value, complete reverse dependencies/backlinks, authenticated behavior, deployment identity, complete asset-byte archive, conversion attribution or Core Web Vitals. No full checkout/build/browser suite was available in this run; remote source reads are not a passing build. These gaps block claims of full migration readiness, not creation of this preservation draft.

Replay using the exact source commit and the tool inputs documented in the companion files. Re-fetching a public page or GSC window later may differ; label the new observation instead of overwriting this baseline.
