# Two-Offer V1 — homepage and new-intake stage

Decision: founder-approved Two-Offer V1, continued on 2026-10-08.
Base: PR #451, `fe03d306230d2e27c5a307166b746b000824a3ac`.
Status: DRAFT SOURCE IMPLEMENTATION. Not deployed or release-accepted.

## Implemented here

- English and Polish homepage use one localized two-review component. Current
  names, prices, timing and request links come from the existing buyer records.
- No EUR 500 promotion or old landing-form selector on those homepages. Preserve
  the free `/check` tool and `#enquiry` anchor; the enquiry CTA leads to review
  selection. Preserve homepage Organization/WebSite JSON-LD and language pairs.
- Move the detailed specimen out of the homepage into existing sample links.
  Label the AI sample historical/synthetic and incomplete for the current offer.
  Label the external sample synthetic. Do not edit immutable sample artifacts.
- Both `/review/request` language routes use the same resolver and renderer.
  Bare URL: two choices plus the existing non-secret fit email link, no default
  paid selection. Selected URL: existing ContactForm with an exact current
  intent, no legacy `landing` selector. No email is sent by rendering the link.
- Unknown, retired, empty, duplicated, conflicting or wrong-role query IDs show
  an explicit unavailable-selection message and two current choices. Never
  reinterpret an old selection as a current offer. Optional display labels do
  not select an offer or override its canonical identity/name.
- Current roles stay AI `offerId=agent-tools-access-review` and external
  `productId=OFFSEC-EXTERNAL-EXPOSURE`; a service ID is not a productId.
- Before Zod strips unknown fields, shared new-intake processing validates raw
  identity data. New paid intents are limited to the two exact current request
  identities. Existing `review` and `ask-ai-contact` remain NON-OFFER fit/contact
  contexts, not extra paid products or permission to inspect.
- Retired/unknown intents, selection aliases in JSON, old serialized landing
  choices and conflicting serialized intents return 400 with
  `NEW_REVIEW_SELECTION_REQUIRED`, before issuance/provider work. Validation
  does not interpret ordinary free text as a purchase or testing authority.
- IP/body limits, schema validation, business-email checks, recipient limits and
  issuance handling remain. Stored requests, token verification, confirmation
  classification and historical commercial contracts are not modified.
- State the accepted new-engagement external retest anchor at selection:
  30 calendar days beginning at initial report handover. This is not retroactive.

## Tests and evidence

Observed locally in the isolated source slice:

- 19 pure policy/selector tests passed, 0 failed.
- Strict TypeScript plus noUncheckedIndexedAccess passed for the two policy modules.
- A temporary permissive-intake mutation caused 6 of the 13 new policy tests to
  fail (7 passed). Production draft files were not mutated by that probe.
- Initial red execution failed because the implementation module did not yet
  exist; do not describe that alone as a behavioral baseline.
- TypeScript syntax/transpile diagnostics are separate from full application
  typechecking, build, runtime behavior and browser acceptance.

Authored but not executed locally: 27 request-handler checks across the three
existing new-intake aliases, and EN/PL browser selection/homepage tests in the
already-run pricing UI spec. Negative API fixtures always use an invalid email;
even a policy regression must stop at validation, not send to a provider.
Browser retirement tests intercept the review POST and do not submit a live form.
Preserve the direct-route and catalogue keyboard-focus acceptance assertions.

`pnpm health` and `pnpm smoke:buyer-path:test` could not execute here: pnpm is
not available. No complete dependency tree/browser runtime is present in this
source slice; it is not a full clone. No registered Codex environment was returned.
No founder workstation was used. Independent code review is still required.

## Known inherited failures and explicit remaining work

PR #451 Public UI run 37727738280 failed its catalogue CTA focus-indicator
assertion (job 113149768874). The observed failure is not fixed or suppressed
by this stage. The cause has not been fully reproduced in a browser here.
Artifact download 11529944184 returned 404, so no screenshot-based diagnosis
is claimed. Image-security failures also remain; no dependency upgrades,
scanner suppressions or gate changes are part of this stage.

Old detail-page marketing CTAs, shell links, assistant recommendations and
public documentation still need source-by-source portfolio reconciliation.
Those old selection links are denied for NEW issuance by this stage, but their
mere presence is still a presentation defect. The dedicated buyer FAQ and
retest wording on all detail/contract surfaces remain separate unfinished work.
Existing source/route tests tied to old homepage/request copy need reconciliation
without deleting historical-compatibility assertions. This draft is not "two
offers everywhere", all-green CI, or full buyer-path acceptance.

## Prohibited actions remain prohibited

No file or route deletion, new redirect, sitemap pruning, deindexing, historical
record rewrite, sample/verifier changes, auth/app/entitlement change, dependency
or workflow edit, billing activation, live enquiry, collection, merge, deployment
or Search Console submission. Review and release acceptance remain separate.
