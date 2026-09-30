# Offer naming: research and implementation proposal

Date: 21 September 2026. Status: **informative research; policy proposed, not adopted**.

## Recommendation

Use [one small commercial policy](./OFFER_IDENTITY_AND_NAMING_POLICY.md) to keep
identity, public name, explanatory copy and transaction behavior separate. Put
per-offer choices in the existing offer records and consume existing code fields.
Do not introduce a naming service, duplicate product registry, new skill, mandatory
buyer panel or blanket word blacklist.

This proposal adapts primary sources to WitnessOps. The sources do not collectively
constitute a universal product-naming standard or approve a specific offer name.

## Primary-source findings and their limits

### R1 — Name the user's task; test comprehension

[GOV.UK: Naming your service](https://www.gov.uk/service-manual/design/naming-your-service)
recommends user vocabulary, investigation of the underlying task and checks that
people recognize and distinguish related services. Its advice to use verbs and
avoid branding addresses government services; it is not a rule requiring a
commercial consultancy to rename every noun-based offer.

**Adaptation:** scope and comprehension outrank invented vocabulary families.
Use inexpensive buyer feedback or existing enquiry/search evidence. No fixed
sample size or research prerequisite is imposed by this proposal. Buyer preference
and conversion effects remain unknown until measured appropriately.

### R2 — Preferred labels and aliases are different

[W3C SKOS Reference, section 5](https://www.w3.org/TR/skos-reference/#labels)
separates preferred and alternative labels; integrity condition S14 allows at most
one preferred label per language tag. This is a knowledge-organization model,
not a commercial naming mandate.

**Adaptation:** one primary approved name per locale, explicitly recorded useful
short forms and historical aliases. Borrow the distinction, not RDF infrastructure
or a new schema. Stable commercial identity can have several existing system IDs.

### R3 — Consistency is not universal string equality

[W3C: Understanding SC 3.2.4](https://www.w3.org/WAI/WCAG22/Understanding/consistent-identification.html)
explains consistent identification for components with the same function. Its
examples allow context-appropriate variation while retaining consistent meaning.
This is informative explanation of WCAG, not an instruction to put a product name
in every heading or button.

**Adaptation:** use one identifying name where an offer is named, while keeping
headlines and action labels appropriate to their function. Do not use “consistency”
to justify random synonyms for the same repeated action.

### R4 — Links need meaningful accessible context

[W3C: Understanding SC 2.4.4](https://www.w3.org/WAI/WCAG22/Understanding/link-purpose-in-context.html)
explains that link purpose can come from its text plus programmatically associated
context. [SC 2.5.3](https://www.w3.org/WAI/WCAG22/Understanding/label-in-name.html)
requires a control's accessible name to contain its visible label text.

**Adaptation:** repeated “Request the review” links need distinguishable associated
offer context; an adjacent visual price is not automatically sufficient. Keep
visible and spoken/accessible action cues aligned. No accessibility conformance
test of WitnessOps was performed by this research.

### R5 — Action words must match behavior

[GOV.UK Design System: Button](https://design-system.service.gov.uk/components/button/)
recommends text describing the performed action, distinguishing, for example,
continuing, saving and paying.

**Adaptation:** request, book, pay and execute must not be swapped for stronger
marketing language. A context-rich CTA can be short. This does not require
WitnessOps to install that design system or copy its components.

### R6 — Product identity and price are distinct in Stripe

[Stripe: How products and prices work](https://docs.stripe.com/products-prices/how-products-and-prices-work)
separates the offered goods/services from amount, currency and billing interval.
Products have IDs and names; distinct service options and pricing variants need
intentional modeling. Product names appear on customer transaction surfaces.

**Adaptation:** preserve existing internal-to-provider mappings during a rename.
A new name is not automatically a new SKU; a lower price is not automatically a
new product. Different deliverables may justify a distinct product after scope
approval. Existing human-readable identifiers need not be replaced with opaque IDs.

### R7 — Price changes and archiving are not editorial operations

[Stripe: Manage products and prices](https://docs.stripe.com/products-prices/manage-prices)
says an amount cannot be changed in place through the Price API. Changing it uses
a new Price. Archiving can affect purchase links while existing subscriptions have
different behavior.

**Adaptation:** inspect actual consumers before a price/mapping change or archive;
do not automatically deactivate an old object because a new price exists. This
research did not inspect WitnessOps's Stripe account or authorize any billing write.

### R8 — Preserve finalized transaction records

[Stripe: Status transitions and finalization](https://docs.stripe.com/invoicing/integration/workflow-transitions)
describes restrictions on editing finalized invoices and appropriate adjustment
mechanisms. It does not establish the applicable legal requirements for every
WitnessOps transaction.

**Adaptation:** retain the transaction's original name/terms. A rebrand is not a
reason to rewrite issued invoices or signed evidence. Necessary corrections need
the appropriate separately authorized process; this is not tax or legal advice.

### R9 — URL changes require migration work

[Google Search Central: Site moves with URL changes](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes)
describes URL mapping, redirects, link/canonical/localization updates and testing.
It warns against redirecting unrelated pages to an irrelevant destination.

**Adaptation:** do not rename routes merely for visual consistency. Use the existing
URL unless a separately approved migration has a concrete benefit. No search-ranking
benefit, redirect behavior or deployed URL state was tested in this research.

## WitnessOps source comparison

Repository: `witnessops/witnessops-web`, inspected revision
`55941bdaf15178fc5c4d80cd5f460beda9ba5559`. These are source observations, not a
fresh public-site, design-board, deployment, payment or customer-contract audit.

- [Commercial index](https://github.com/witnessops/witnessops-web/blob/55941bdaf15178fc5c4d80cd5f460beda9ba5559/docs/commercial/README.md): existing offer records already own terms and point to reusable delivery materials.
- [External Attack Surface Review contract](https://github.com/witnessops/witnessops-web/blob/55941bdaf15178fc5c4d80cd5f460beda9ba5559/docs/commercial/10-public-exposure-review-offer.md): current public name, former Public Exposure Review name, preserved SKU/receipt profile and one-root-domain cap are explicitly separate. One domain alone does not distinguish a smaller offer.
- [Naming market note](https://github.com/witnessops/witnessops-web/blob/55941bdaf15178fc5c4d80cd5f460beda9ba5559/docs/commercial/12-offer-naming-market-note.md): search surfaced its explicit supersession notice. It is dated research, not a current general naming policy; preserve its history.
- [Commercial constants](https://github.com/witnessops/witnessops-web/blob/55941bdaf15178fc5c4d80cd5f460beda9ba5559/apps/witnessops-web/src/lib/commercial-truth.ts): current public names already coexist with historical internal IDs and routes.
- [Buyer catalogue and routing helpers](https://github.com/witnessops/witnessops-web/blob/55941bdaf15178fc5c4d80cd5f460beda9ba5559/apps/witnessops-web/src/lib/buyer-services.ts): localized names, action text, service IDs and optional product IDs are distinct fields. The professional-footprint offer concerns a consenting professional's record, so future “footprint” candidates should be compared with it as well as domain-security offers.
- [Root instructions](https://github.com/witnessops/witnessops-web/blob/55941bdaf15178fc5c4d80cd5f460beda9ba5559/AGENTS.md): source, sandbox billing, provider acceptance and deployment remain separate; full repository validation uses `pnpm health`.

**Inference:** the gap is consistent decision/change handling and a clear current
entrypoint, not absence of product data structures. No complete organization-wide
absence claim is made from a bounded naming search.

## Proposed implementation

Add this research note and the proposed policy in `docs/commercial/`. Add small
explicitly draft pointers in its existing README and root AGENTS.md. Do not edit
the historical naming note, live offer data, receipt identifiers, routes, designs,
prices or provider configuration. Keep the policy proposed until accepted.

On adoption, record the owner/version/date and change the draft pointers. Apply it
first to one actual offer decision; use existing records and tests. A short offer
note can link identity, names, boundary, former-name history and approval without
introducing another structured register. A small comprehension conversation is a
learning step, not a mandatory committee. Add automated checks to existing suites
only when a recurring mismatch justifies them.

## Worked review scenarios — expected treatment, not executed tests

| Situation | Proposed policy treatment |
| --- | --- |
| New H1; offer identity, promise and destination unchanged | Copy-only work under existing editorial scope; no new naming approval. |
| “Book” label points to a non-binding request form | Correct to the existing request behavior; do not silently implement booking. |
| One approved new public name on the same offer | Rename; record alias/effective change, preserve IDs and terms, update named surfaces. |
| Same service at a new amount | Approved commercial price change; evaluate a new Price, not an automatic new offer. |
| Lower-priced option has materially different output or support | Resolve variant/distinct-product modeling; words alone cannot settle scope. |
| “Public-source only” added to an offer that makes approved target requests | Material scope mismatch, not harmless style. |
| Old name occurs inside a signed sample or issued invoice | Preserve history; do not use blanket string replacement. |
| Three short request links on a catalogue page | Check offer-identifying accessible context and correct destinations. |
| Design updated; billing or deployed page not checked | Report only design completion and the remaining gap. |
| Founder already approved the scoped naming change | Carry out authorized work and checks; no per-string approval loop. |

These examples are document-level policy applications. They are not live buyer
research, executed software tests, fresh-agent acceptance or a compliance verdict.

## What remains unknown

Buyer preference for a new name, comparative conversion, external brand conflicts,
current design-board wording and live provider mappings were not established.
Do not settle a new offer name or claim rollout completion on the strength of this
policy research. Approval to build a proposal is not adoption or launch authority.
