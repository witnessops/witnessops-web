# Agent Action Security Review

**Commercial status:** Canonical primary paid entry point as of 2026-09-02.

**Public commercial offer:** Agent Action Security Review.

**Delivery method:** Agent Workflow Reconstruction.

**Company positioning:** Agents act. WitnessOps proves.

The file path is retained for repository continuity. Before 2026-09-02, Agent Workflow Reconstruction was also the public product name. Historical references must remain historical; current buyer-facing surfaces use Agent Action Security Review.

## Buyer promise

### Know what to fix before your AI agent acts.

For AI product teams and automation agencies preparing a production launch or customer handover, WitnessOps reviews one consequential action and returns an action map, findings, prioritized fixes and a readout.

The buying decision is concrete: understand which approval, access and evidence gaps need attention before handing that action to an agent. The review supports the customer's decision; it does not approve a launch or certify an agent as safe.

We trace the action end to end:

1. Who can authorise the action?
2. What identity actually performs it?
3. What systems and tools can that identity reach?
4. What prevents the action going beyond its intended scope?
5. What evidence binds authorisation to execution and resulting state?

The trigger is a named launch, customer handover or access expansion where an agent or automation moves from suggesting to acting. The action can affect production, money, customer data, accounts, permissions, or external communications.

Typical action classes include a production deployment, account deletion, refund or payment action, customer-record change, permission change, transaction approval or escalation, or an action through an MCP, tool, or API integration. These are examples of fit, not claims of past customer engagements.

### Examples a buyer can recognize

| One action | Review question | Useful output |
| --- | --- | --- |
| A support agent issues a refund | Does the approval restrict the amount, customer and payment action the tool can perform? | The approval-to-action path, relevant permission limits, supporting evidence and prioritized gaps. |
| An agent updates a customer record | Can it write beyond the intended records or fields, and can the change be reconstructed? | The write boundary, execution path, evidence gaps and recommended restrictions. |
| An automation grants account access | Who approves the grant, which identity performs it, and what stops a broader grant? | The authority map, effective access boundary and recommended control changes. |

These are illustrative questions and outputs, not observed findings or customer results. Report actual findings, including no identified gap where supported; do not promise a finding.

## Commercial contract

- **Internal ID:** `bounded-workflow-review`.
- **Entry:** non-secret fit check first.
- **Fixed price:** €2,500 fixed · excluding VAT.
- **Scope:** one bounded consequential agent or automation action.
- **Delivery:** within 10 working days after evidence rules are agreed.
- **Canonical route:** `/catalog/workflows`.
- **Request route:** `/review/request` with the stable `offerId=bounded-workflow-review` selection.
- Customer evidence is accepted only after scope, evidence rules, and handling are agreed.
- Submitting the fit check does not start work or authorise access to customer systems.

## Buyer-facing outputs

- **Authority map:** who can approve this action and under which conditions.
- **Execution path:** the agent identity, tools and systems involved in that action.
- **Permission boundary:** what the identity can reach and what restricts it.
- **Evidence chain:** what supports the reported action and outcome, and what remains unknown.
- **Control gaps and practical fixes:** each finding's consequence and recommended changes in priority order.
- **Readout:** walk through the report, recommended fixes and decisions that remain with the buyer's team.

The customer receives a practical report and action map, not just a set of technical artifacts. The customer owns the launch decision and implementation of fixes. Prioritization and plain-language explanations clarify the existing deliverables; they do not add remediation, retesting or wider scope.

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

The initial form requires only name, work email and a short description of the action. Mailbox verification remains required. The following context is optional at first contact and is clarified during the fit check:

- what happens if the action goes wrong;
- which systems, tools, APIs, or MCP integrations are involved;
- whether production, customer-data, money, account, permission, or external-communication boundaries are involved.

If known, include the launch or customer-handover deadline in the action description. Buyers do not need to prepare a full system inventory or evidence package to ask about fit. Exact scope, fixed fee, required inputs and evidence handling are agreed before work starts. A short first message is not authority to access or test a system.

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
