# Commercial delivery kit (complete P0)

Operator-facing materials so the live catalog + samples convert into real engagements.
Written for learning the offers while you sell and deliver them.

**Public new-sales reviews:** exactly two, as decided in [Two-Offer V1](./18-two-offer-portfolio.md). This index is source direction. It does not record that production has been updated, and it does not authorize merge or deployment.

- **Agent Action Security Review** — €2,500 fixed, excluding VAT. New-sales identity `agent-action-security-review`. Request path: `/review/request?offerId=agent-action-security-review`. One consequential agent or automation action, with explicit unknowns in the deliverables. Delivery timing per signed SOW. It has no detail route. This is not the historical inventory offer and not `bounded-workflow-review`.
- **External Attack Surface Review** — €1,900 excluding VAT, under [the external offer record](./10-public-exposure-review-offer.md). Product identity `OFFSEC-EXTERNAL-EXPOSURE`; that product id is not an offerId. Request path: `/review/request?productId=OFFSEC-EXTERNAL-EXPOSURE`. Detail route: `/catalog/offsec-external-exposure`. Delivery timing per signed SOW. One focused retest within 30 calendar days of initial report handover. This is not a penetration test.

Neither review is ranked as the sole primary. The €950 private pilot is not a public new-sales choice. The free hostname check remains a separate tool at `/check`.

Historical records stay in force for issued agreements and old lookups. The [superseded one-action contract](./16-agent-workflow-reconstruction-offer.md) uses `bounded-workflow-review`. The [inventory-plus-action contract](./17-ai-agent-tools-access-review-offer.md) uses `agent-tools-access-review` and remains at `/catalog/workflows`. Those identities are not new-sales selections.

## Start here

**This week’s run sheet:** [`THIS-WEEK.md`](./THIS-WEEK.md) · paste drafts [`drafts/`](./drafts/) · worked examples [`worked-examples/`](./worked-examples/) · ledger [`engagement-ledger.md`](./engagement-ledger.md)


1. **[Offer learning guide](./00-offer-learning-guide.md)** — what each offer is, price, samples, disk paths  
2. **[Artifact map](./08-artifact-map.md)** — every public + private sample location  
3. **[Operator playbook](./07-operator-playbook-complete.md)** — end-to-end lifecycle  

Then use the paste templates below.

## Offer identity and naming

Use the [adopted policy](./OFFER_IDENTITY_AND_NAMING_POLICY.md) and its
[research and worked examples](./OFFER_NAMING_RESEARCH_20260921.md) when reviewing
naming or offer-identity changes. Adoption selects no new name, SKU, price or scope
and grants no publication, billing, collection or migration authority. Existing
accepted offer records remain authoritative. The dated naming market note below is
retained as superseded research, not a current general naming policy.

## Document index

| # | Doc | Use when |
| --- | --- | --- |
| 00 | [Offer learning guide](./00-offer-learning-guide.md) | First read; study the offers |
| 01 | [Fit-check replies](./01-fit-check-reply.md) | Inbound / after `/review/request` |
| 02 | [Delivery emails](./02-delivery-email.md) | Package handover |
| 03 | [Claim blurbs](./03-claim-blurb.md) | Scope, package, email limits |
| 04 | [Demo script 15 min](./04-demo-script-15min.md) | Sales / founder call |
| 05 | [Dry-run checklist](./05-dry-run-checklist.md) | Before first real package |
| 06 | [Scope agreement skeleton](./06-scope-agreement-skeleton.md) | After fit; before work |
| 07 | [Operator playbook complete](./07-operator-playbook-complete.md) | Full delivery path |
| 08 | [Artifact map](./08-artifact-map.md) | Find samples on site + disk |
| 09 | [Pricing investigation + PLN](./09-pricing-investigation.md) | Market context, zł table, policy |
| 10 | [External Attack Surface Review offer](./10-public-exposure-review-offer.md) | One-page fixed-scope buyer offer and validation boundary |
| 11 | [External Attack Surface Review order and fit check](./11-public-exposure-review-fit-check.md) | Non-secret intake and fit/custom/referral routing |
| 12 | [Offer naming market note](./12-offer-naming-market-note.md) | Historical sampled research; naming instructions superseded |
| 13 | [Public route disposition](./13-public-route-disposition.md) | Current, replacement, private-preview, and unresolved public route outcomes |
| 14 | [LinkedIn Premium experiment](./14-linkedin-premium-experiment.md) | Thirty-day commercial test, attribution, weekly scoreboard, and renewal gate |
| 15 | [Agent Risk & Control Review offer](./15-agent-risk-control-review-offer.md) | Superseded 2026-08-26 positioning retained as a historical commercial record |
| 16 | [Agent Action Security Review offer](./16-agent-workflow-reconstruction-offer.md) | Superseded historical one-action contract (`bounded-workflow-review`). Not the new-sales Agent Action identity |
| 17 | [AI Agent Tools & Access Review offer](./17-ai-agent-tools-access-review-offer.md) | Historical inventory-plus-action contract (`agent-tools-access-review`). Not a new-sales identity |
| 18 | [Two-Offer V1](./18-two-offer-portfolio.md) | Founder new-sales decision for the two public reviews. Not a deployment record |

## Public anchors

Source routes below. A listed URL is not evidence that the route is the released production page.

| Surface | URL |
| --- | --- |
| Catalog | https://witnessops.com/catalog |
| Agent Action Security Review request | https://witnessops.com/review/request?offerId=agent-action-security-review |
| External Attack Surface Review request | https://witnessops.com/review/request?productId=OFFSEC-EXTERNAL-EXPOSURE |
| Historical AI Agent Tools & Access Review | https://witnessops.com/catalog/workflows |
| Synthetic agent sample | https://witnessops.com/review/sample-cases/ai-agent-action-proof-run |
| CSR service | https://witnessops.com/customer-security-review |
| CSR sample page | https://witnessops.com/review/sample-cases/customer-security-review-sprint |
| CSR full synthetic package | https://witnessops.com/samples/csr-sprint-synthetic/ |
| One Server service | https://witnessops.com/catalog/offsec-local-audit |
| One Server sample page | https://witnessops.com/review/sample-cases/local-server-security-review |
| One Server web fixture | https://witnessops.com/samples/offsec-shield-local-server-audit/ |
| One Server suite sample | https://witnessops.com/samples/offsec-local-audit/ |
| External Attack Surface Review | https://witnessops.com/catalog/offsec-external-exposure |
| External Attack Surface Review sample | https://witnessops.com/review/sample-cases/external-exposure-assessment |
| Review request chooser | https://witnessops.com/review/request |
| Free hostname check | https://witnessops.com/check |
| All samples | https://witnessops.com/review/sample-cases |

## Linux sample runs found on this device

| Artifact | Location | Public? |
| --- | --- | --- |
| Web fixture (demo-host) | Site `/samples/offsec-shield-local-server-audit/` | Yes |
| Suite product sample `pr_lsa_20260710120000_198fd7aceb` | Site `/samples/offsec-local-audit/` + Desktop suite | Yes (mirrored) |
| Restricted live-style report (valid + **partial**) | Held outside this public repo | **No — private operator study only** |

## Operating rules

- Catalog card = buyer situation + package — not one card per script.  
- Methods (KEV, SBOM tooling, etc.) stay inside scoped work.  
- Samples are labelled synthetic.  
- `valid` ≠ secure; `partial` = incomplete collection sections, not “failed security test.”  
- Email signature: [`../EMAIL-SIGNATURE-RESEND.md`](../EMAIL-SIGNATURE-RESEND.md).  

## Hold list

No public discount, free-offer language, unsupported testimonial, Pilot/Access-removed product cards, KEV/SBOM SKUs, or new public samples unless separately approved. Publish a quote, company name, logo, or case study only with separate post-delivery permission.
