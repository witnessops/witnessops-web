# Two-Offer V1 — founder-approved new-sales direction

- Decision date: 2026-10-08.
- Authority: founder acceptance of the Two-Offer Draft V1, followed by approval to prepare bounded implementation PRs.
- Status: accepted direction; staged source implementation. Not a deployment record.
- Preservation baseline: PR #449 at `6ac66c3de9da1dc17d038033f3571b466e27f557`.

## The two paid offers

New paid-review discovery and selection must converge on exactly:

| Public name | Existing service identity | Existing request mapping | Commercial terms |
| --- | --- | --- | --- |
| AI Agent Tools & Access Review | `agent-tools-access-review` | `offerId=agent-tools-access-review` | Starting at EUR 2,500 excluding VAT; fixed quote after exact scope; target 10 working days after all documented start gates |
| External Attack Surface Review | `external-exposure-assessment` | `productId=OFFSEC-EXTERNAL-EXPOSURE` | EUR 1,900 excluding VAT; fixed bounded package; initial handover within 3 working days after all documented start gates |

Retain the current names, source-bounded scope and existing technical identities.
This is a portfolio/discovery change, not a rename or a new product/SKU.
The owning contracts remain [AI](./17-ai-agent-tools-access-review-offer.md)
and [External](./10-public-exposure-review-offer.md), subject to the explicit
new-engagement retest clarification below.

The AI normal reference scope remains one agreed device and OS, one dated
system-level inventory, one named agent setup, one selected connection and
one consequential action. Inspection remains manual and read-only. No execution,
remediation, retesting, continuous monitoring, certification or unconditional SLA.
One consolidated factual-correction round is included if requested within five
working days of handover. A cryptographic receipt is not a standard promised
AI-review deliverable.

The external scope retains all four caps: one registrable root domain, ten
confirmed first-party hostnames, three customer-attributed public IP addresses
and twenty public service endpoints. The signed target schedule governs actual
authority; caps are not permission to test every discovered asset. No exploitation
or authenticated testing. It is not a penetration test.

## Approved clarification for new external engagements

The included focused retest window is **30 calendar days beginning at initial
report handover**. Retest remains limited to reported findings. The included
45-minute handover and EUR 550 excluding VAT additional/late retest term remain.
This clarifies a previously unnamed window anchor; it does not rewrite already
accepted customer agreements. Historical terms retain their original meaning.
Do not add a separate retest product or checkout.

## Buyer copy anchors

Homepage headline:

> Understand what your agents can do and what your systems expose.

Supporting copy:

> WitnessOps provides focused security reviews for AI agents and internet-facing systems. Get written findings, evidence you can inspect, and clear priorities for what to do next.

AI headline: **Know what your AI agent can reach—before you rely on it.**
AI CTA: **Scope an AI review**.

External headline: **See what your internet-facing system exposes—and what needs attention.**
External CTA: **Scope an external review**.

Scope, authority, payment and evidence handling remain separate gates. An
enquiry or mailbox verification does not book a review or authorize collection.
No secrets or production evidence in initial fit requests. Use existing,
customer-approved handling arrangements only after written acceptance.

## Exactly two, not a hidden wider catalogue

Remove the EUR 500 footprint option and other paid services from new-sales
promotion/selection during the staged migration. Do not rename the EUR 500
option into the EUR 1,900 external offer or reinterpret its historical enquiries.
No additional public pilot, tier, SaaS offer or "other services on request"
backdoor is part of this model. A wider AI engagement is a separately scoped
quote for the same review, not a new branded product.

The free hostname check remains a separate free tool, not a third paid review
or a substitute for the external assessment. Existing authenticated app access,
accounts, workspaces, entitlements and report functionality are untouched.
Technical documentation, research, supported verifier behavior and samples stay
available. Preserve real/synthetic/historical labels and immutable artifact bytes.
The older one-action sample must not be relabelled as a complete current AI review.

## Non-destructive implementation boundary

- Retain the complete historical buyer registry for old lookups and records.
- Apply `publicPaidReviews` as an explicit new-sales presentation projection.
- Preserve old service/product IDs, issued terms, history and customer obligations.
- Preserve routes, redirects, canonicals, locale identity and sitemap coverage.
- Do not delete pages, prune the sitemap, add deindexing, alter provider/billing
  objects, send enquiries, execute checks, merge, publish or deploy.
- Changes to new intake selection must distinguish new requests from historical
  confirmations; do not break an existing confirmation to enforce new policy.

## Staged PRs and acceptance

1. **Policy foundation:** this decision and a dependency-free two-review selector
   with tests. No consumer is changed by the foundation alone.
2. **Discovery presentation:** shared EN/PL catalogue and pricing, then homepages;
   use canonical offer objects, preserve correct request parameter roles, and
   keep the free check plus evidence boundaries.
3. **End-to-end selection:** reconcile old detail-page CTAs, request pages,
   form choices, new-issuance API validation, generic enquiries and assistant
   recommendations. Preserve historical confirmations. Test bypass attempts,
   unknown/retired IDs, conflicting query parameters and locale parity.
4. **Buyer FAQ and closeout:** publish the approved buyer answers without implying
   broader security guarantees; validate route/metadata links, samples, mobile
   accessibility, current-offer details and the retest anchor.

A discovery PR is not acceptance of the whole two-offer migration. Until stage 3
is verified, old pages or request paths may still offer other services. No
publication claim or "two offers everywhere" claim is permitted from a card count.

Required release evidence remains `pnpm health`, `pnpm smoke:buyer-path:test`,
relevant public UI/route/SEO tests, source diff review and separate deployment
approval. Module-only tests or a syntax check do not replace those gates.

## Commercial readiness remains separate

Before accepting customer work, confirm supplier identity, tax treatment,
contractual/payment route, cancellation/rescheduling/refund terms, capacity,
authority, handling and named recipients. This approval activates none of them.
Do not infer external raw-evidence retention from the AI contract's default.
