# Offer identity and naming policy

Policy ID: `WITNESSOPS_OFFER_IDENTITY_AND_NAMING_V1`

**Status: PROPOSED — not adopted.** Prepared 21 September 2026. Owner: founder or
explicitly delegated commercial owner. Adoption reference: none recorded.

This is a proposal for commercial offer naming and change handling. It neither
selects a new offer name nor authorizes publication, billing, collection or
technical migration. Existing contracts, approvals and repository gates remain
in force. The rules below take effect only after explicit adoption is recorded.
[Research, evidence and examples](./OFFER_NAMING_RESEARCH_20260921.md) are informative.

## Principle

**Keep identity stable, the promise accurate and the presentation clear.**

One offer has one approved primary public name per supported locale, with recorded
short forms or aliases where useful. Headlines and action labels have different
jobs. Consistency is not a requirement to repeat one long string everywhere.
Never advance the story faster than the evidence.

## 1. Start from the existing offer

Read the [commercial index](./README.md), the relevant offer contract and any
accepted change before editing. Inspect only affected catalogue, design, intake
and billing surfaces; do not rediscover the entire organization.

Keep four questions separate:

- The accepted offer record and scoped owner decisions establish intended terms.
- [Commercial constants](../../apps/witnessops-web/src/lib/commercial-truth.ts)
  and the [buyer catalogue](../../apps/witnessops-web/src/lib/buyer-services.ts)
  establish the inspected implementation, not deployed state.
- Dated surface/provider readback establishes what is actually published or configured.
- An accepted engagement agreement and issued records preserve that transaction's
  terms; later catalogue copy does not rewrite them.

A newer draft, design board or search result does not override an accepted decision.
An explicit approved change awaiting propagation is not something to discard as
stale or describe as already live. Resolve material conflicts for the affected
operation; do not guess or stop unrelated safe work.

## 2. Keep names and identifiers separate

| Element | Rule |
| --- | --- |
| Offer identity and technical mappings | Preserve existing service `id`, `offerId`, `productId`/SKU, provider product/price IDs, routes and receipt/workflow identifiers in their actual roles. They are not necessarily one identifier. Do not mint or rewrite them to match display wording. |
| Primary public name | Use the approved name for offer-identifying card titles, intake summaries and new commercial documents. Use an approved short form in constrained navigation when the full name is clear at the destination. |
| Localized name | Record the approved translation or intentional unchanged brand name for each supported locale. Preserve the same scope and identity, not necessarily word-for-word grammar. |
| Headline and descriptor | Explain the problem, result or boundary. They may differ from the name, but must not introduce a competing identity or unsupported promise. |
| Call to action | Describe the actual next step. Use consistent labels for the same action; different actions need different labels. Do not use a display label as billing or execution authority. |

“Request the review” may be sufficient in an unambiguous offer context. Repeated
links across multiple cards need distinguishable accessible context, not merely
visual proximity. An accessible control name must contain its visible label text;
mobile, keyboard, screen-reader and voice users must not receive conflicting cues.
Do not force the full offer name into every small button. [Research R2–R5](./OFFER_NAMING_RESEARCH_20260921.md)

## 3. Classify the change, not the agent's enthusiasm

| Change | What may proceed | Boundary |
| --- | --- | --- |
| Copy-only | Grammar, layout, a clearer headline or faithful translation; correct a CTA to describe its existing approved action. Proceed within the existing editorial task approval. | No primary-name, scope, terms, actual action, destination or identity change. |
| Rename or new approved short form | Change the public label for the same offer after the commercial owner approves that label and affected locales/surfaces. Reuse an existing approval. | Preserve terms and technical mappings; record the former name and effective change. |
| Material commercial change | Add a genuinely distinct offer or change scope, deliverables, price, timing, exclusions, retest, payment terms or entitlement after those changes are approved. | Compare reuse/variant versus new offer. A new landing page or amount alone does not decide the product model. |
| Technical or billing migration | Change IDs, routes, provider objects or compatibility mappings only when explicitly covered by the authorized technical/billing scope. | Inspect consumers, transaction impact, validation and rollback/forward-correction path. Never hide migration inside “copy cleanup.” |

Mixed changes inherit the relevant controls; classifying them does not require
separate PRs or approval portals. Follow any existing rule that requires a
separate execution lane. A lower price for the same service may be a price
variant; materially different deliverables may justify a distinct product.
Record the decision instead of deriving it from the name. [Research R6–R7](./OFFER_NAMING_RESEARCH_20260921.md)

## 4. Choose for buyer comprehension

Prefer words the intended buyer uses and a name plus descriptor that explains the
purchase. Compare the nearest current offers and exact former names using buyer
problem, target, methods, deliverables and exclusions—not just vocabulary. [Research R1](./OFFER_NAMING_RESEARCH_20260921.md)

Ordinary words such as “public,” “exposure,” “footprint,” “review” or “audit” are
not globally reserved by this policy. Do not claim a suffix, word family, finance
team preference or conversion advantage is mandatory without named evidence or
an accepted rule. An exact former name must not silently be reassigned to a
different offer; any exception needs an explicit confusion/continuity decision.
Historical aliases are not alternate current sales names by default.

For a new or materially confusing name, use the cheapest useful comprehension
check: ask an intended buyer what they would receive, which nearby offer they
would choose and what the CTA does. A few conversations can find problems; they
do not establish a statistically reliable preference or conversion lift. With
no buyer access, document the hypothesis and choose provisionally within approved
scope. Do not block a truthful reversible launch on a mandatory research quota.
Revisit when actual enquiries reveal confusion, not whenever another agent has
a preference. No trademark availability or legal clearance is implied.

## 5. Protect the promise and history

Do not silently change price/tax wording, inputs, turnaround, start conditions,
methods, exclusions, retest or assurance claims while renaming. “Public-facing,”
“public-source only,” “passive” and “unauthenticated” are not interchangeable.
A verification claim needs its named evidence, scope, method and limitations.
Payment, a request, a booking and permission to execute remain separate.

Preserve issued invoices, agreed terms, immutable samples, signed artifacts and
historical aliases. Correct an issued record through the appropriate separately
authorized process, retaining its history—not a bulk find-and-replace. [Research R8](./OFFER_NAMING_RESEARCH_20260921.md)

For Stripe, distinguish an internal offer/SKU from a Product and its Prices. A
name-only change normally retains the existing mapping; changing a price amount
requires a new Price rather than editing that amount in place. Read current
provider rules and affected Payment Links/subscriptions before changing or
archiving provider objects. Store mappings in their existing owning configuration,
not in a new public register. No billing action follows from this policy. [Research R6–R8](./OFFER_NAMING_RESEARCH_20260921.md)

Keep existing URLs for a label-only rename unless an approved migration has a
concrete benefit. A route change needs old-to-new mapping, appropriate redirects,
updated internal/canonical/localized links, and checks; preserve request/analytics
identity. Do not redirect an old offer into an unrelated product. [Research R9](./OFFER_NAMING_RESEARCH_20260921.md)

## 6. Record once; propagate within scope

Use the existing offer document and PR/task record, not a second catalogue.
When needed for a naming decision, record the existing identity references,
chosen localized name/short forms, descriptor and scope reference, former-name
history, approval source, and affected surfaces. Link existing facts rather than
copying full terms. A draft idea needs no production SKU. Keep private approval
or customer evidence in its authorized location, with a non-sensitive reference.

Compare the applicable surfaces: navigation/cards, landing copy, intake and
confirmation, offer-specific CTAs, localized pages, quotes/invoice descriptions,
provider mappings and reusable design components. Include only surfaces used by
the offer. Figma is presentation work; GitHub is source; billing and published
pages require their own readback. Do not claim “consistent everywhere” from a
single board or repository search.

One scoped owner approval may cover the agreed changes, checks and delivery.
Do not ask again for every string or tool call. Use available authorized tools
before assigning UI chores. Ask one phone-answerable question only for a genuinely
new decision or unresolved material conflict. Do not bypass required gates or
invent completion when a surface is inaccessible. Merge is not deployment;
publication and billing changes require their actual authorization.

## 7. Close out against evidence

For the affected scope, compare the chosen names and descriptors, unchanged
commercial terms, correct ID/destination mappings, historical exclusions and
accessible CTA context. Use the existing repository checks and required gates;
this policy does not replace them or introduce a new automated gate. Do not make
a real payment, submit an enquiry or run a collector just to test wording.

Report the actual changed surfaces, checks/ref or revision, remaining mismatches
and next action. Separate approved, designed, committed, merged, published and
provider-configured states. Mark unavailable checks honestly. Keep evidence in
the existing PR/task; show the human only the result and material limitation.

## Adoption and exceptions

Adoption records the owner's acceptance, version and date here or in the existing
accepted-decision path. It does not retroactively approve examples, rename offers,
reopen settled decisions or authorize a portfolio-wide cleanup. Apply this policy
to new/changed offers; revisit older surfaces only for a real task or material
mismatch. A bounded exception records its rationale, affected offer, approval and
limits without changing technical trust contracts or rewriting history.
