# Agent Action Security Review

**Commercial status:** Canonical primary paid entry point as of 2026-09-02.

**Public commercial offer:** Agent Action Security Review.

**Delivery method:** Agent Workflow Reconstruction.

**Company positioning:** Agents act. WitnessOps proves.

The file path is retained for repository continuity. Before 2026-09-02, Agent Workflow Reconstruction was also the public product name. Historical references must remain historical; current buyer-facing surfaces use Agent Action Security Review.

## Buyer promise

### What can your AI agent actually do in production?

Before an AI agent or automation gets production authority, WitnessOps maps one consequential action end to end — before a customer, pentest, or incident finds the gaps for you:

1. Who can authorise the action?
2. What identity actually performs it?
3. What systems and tools can that identity reach?
4. What prevents the action going beyond its intended scope?
5. What evidence binds authorisation to execution and resulting state?

The trigger is an agent or automation moving from suggesting to acting, especially where the action can affect production, money, customer data, accounts, permissions, or external communications.

Typical action classes include a production deployment, account deletion, refund or payment action, customer-record change, permission change, transaction approval or escalation, or an action through an MCP, tool, or API integration. These are examples of fit, not claims of past customer engagements.

## Commercial contract

- **Internal ID:** `bounded-workflow-review`.
- **Entry:** non-secret fit check first.
- **Fixed price:** €2,500.
- **Scope:** one bounded consequential agent or automation action.
- **Delivery:** within 10 working days after evidence rules are agreed.
- **Canonical route:** `/catalog/workflows`.
- **Request route:** `/review/request` with the stable `offerId=bounded-workflow-review` selection.
- Customer evidence is accepted only after scope, evidence rules, and handling are agreed.
- Submitting the fit check does not start work or authorise access to customer systems.

## Buyer-facing outputs

- authority map
- execution path
- permission boundary
- evidence chain
- control gaps and practical fixes
- readout

Security findings may include over-privileged identities, weak or implicit approval paths, tool access beyond intended scope, broken approval-to-action binding, missing execution evidence, and actions that cannot be independently demonstrated afterward.

## Delivery method and evidence mechanics

Agent Workflow Reconstruction is the WitnessOps method used to perform the Agent Action Security Review. It traces:

```text
authority → identity → permissions → tools → execution → evidence
```

Where useful, the technical layer can include:

- scoped workflow reconstruction;
- workflow and permission mapping;
- evidence-gap analysis;
- a proposed receipt shape;
- a sample pack with supported receipt JSON to extract and test through `/verify`.

Those mechanics support the security review. They are not prerequisites for understanding why to buy it.

## Authority and safety boundary

Default operating mode:

```text
read / inspect / reconstruct / report
```

Not included unless separately scoped and explicitly authorised:

- production modification;
- destructive testing;
- exploitation;
- credential changes;
- persistence;
- continuous monitoring;
- certification that an agent is safe.

The active offer also excludes platform installation, custom protocol development, and multi-workflow programmes.

A receipt proves only what its named verifier and referenced evidence support. It does not certify that an agent was correct, safe, compliant, or complete. Extract supported receipt JSON from the sample pack to test through `/verify`; `/verify` does not accept the whole pack. The pack is not customer evidence and does not establish that a control has been deployed in production.

## Non-secret fit check

Lead with:

> What consequential action can the agent or automation take?

Then gather only high-level, non-secret context:

- what happens if the action goes wrong;
- which systems, tools, APIs, or MCP integrations are involved;
- whether production, customer-data, money, account, permission, or external-communication boundaries are involved.

Do not request secrets, credentials, logs, screenshots, customer data, source material, or production evidence at this stage.

## Public paths

- Homepage: `/`
- Canonical offer: `/catalog/workflows`
- Non-secret fit check: `/review/request?offerId=bounded-workflow-review`
- Synthetic agent sample: `/review/sample-cases/ai-agent-action-proof-run`

The stable internal ID and neutral canonical route remain unchanged. Existing replacement routes for retired workflow-size tiers continue to redirect to `/catalog/workflows`.

## Offer hierarchy and separation

1. **Primary:** Agent Action Security Review — delivered with the Agent Workflow Reconstruction method.
2. **Secondary catalogue offer:** External Attack Surface Review under `OFFSEC-EXTERNAL-EXPOSURE`.
3. **Former positioning:** Agent Risk & Control Review; retained only as a superseded commercial record in [`15-agent-risk-control-review-offer.md`](./15-agent-risk-control-review-offer.md).

External Attack Surface Review is a separate offer, not another name for Agent Action Security Review. Its authoritative scope remains in [`10-public-exposure-review-offer.md`](./10-public-exposure-review-offer.md). This positioning change does not alter its scope, caps, price, VAT treatment, start conditions, retest, evidence claims, or verification boundary.
