# Worked example — Acme · One Server Security Check

Fictional. Use as a model when a real host engagement arrives.

---

## 1. Inbound (non-secret fit check form)

```text
Name: Alex Rivera
Company: Acme Tools Ltd
Email: alex@acme-tools.example
Situation: We have one production Linux VM for our B2B app. A customer asked for a recent security review of the host. We need something we can show them without a full pen test.
Preferred product: One Server
Deadline: 2026-08-08
```

---

## 2. Fit-check reply (sent)

```text
Subject: One Server Security Check — fit check next steps

Hi Alex,

From your description, the One Server Security Check looks like the right shape:

- One authorised Linux host
- Read-only, allowlisted collection
- Posture, findings, report, and (where agreed) a signed proof package
- Another person can inspect the package without trusting the operator workspace

Commercial line (public): €950 standard after a non-secret fit check.
Timing (public): within two business days after the authorised collection window.

To move to a scope agreement, send only non-secret:

1. Host class (e.g. single production Linux VM — no IPs or credentials)
2. Goal in one sentence (customer ask / launch / internal review)
3. Decision owner and operator who will be present if live collection is needed
4. Preferred collection window (timezone + rough dates — not credentials)
5. Explicit exclusions you already know

What we will not do: penetration test, exploitation, secret collection, compliance certification, or a host-security guarantee. A valid receipt means named verifier checks passed — not that the host is “secure.”

Sample package (synthetic):
https://witnessops.com/review/sample-cases/local-server-security-review

Service page:
https://witnessops.com/catalog/offsec-local-audit

If that matches, we will send a short scope agreement (authority, host binding, price, timing, exclusions) before any collection.

— Karol
WitnessOps
```

---

## 3. Their non-secret answers

```text
1. Single production Linux VM, app host, Ubuntu LTS class
2. Customer security questionnaire asked for recent host review evidence
3. Decision owner: Alex Rivera (CTO). Operator present: Sam Lee (infra)
4. Window preference: 2026-08-05 09:00–12:00 Europe/Dublin
5. Exclude: app database host, CI runners, any second VM
```

---

## 4. Scope agreement (accepted)

```text
WitnessOps — Scope agreement
Product: One Server Security Check
Engagement ref: WO-2026-OS-0042
Date: 2026-07-30
Customer: Acme Tools Ltd
Decision owner: Alex Rivera, CTO, alex@acme-tools.example
WitnessOps contact: Karol Stefanski, ks@witnessops.com

1. Situation (non-secret)
Acme needs a bounded, read-only security picture of one production Linux app host
to support a customer security ask. Not a pen test; not multi-host.

2. In scope
- One authorised Linux host: admitted label "acme-app-prod-1" (exact hostname bound at admission)
- Profile: linux_baseline_v1 (read-only allowlisted collection)
- Collection window (UTC): 2026-08-05T08:00:00Z – 2026-08-05T11:00:00Z
- Deliverables: posture, findings, report, signed proof package, buyer walkthrough

3. Out of scope / exclusions
- No penetration test / exploitation
- No compliance certification
- No host-security or “secure” guarantee
- No second host / DB host / CI runners
- No secret collection in fit-check channels
- No remediation implementation

4. Commercial
Price: €950 standard after non-secret fit check (this engagement)
Timing: package within two business days after the authorised collection window
Payment: invoice on delivery, Net 14

5. Authority and handling
- Customer confirms authority to engage WitnessOps for this host and window
- Collection only after this agreement is accepted
- Handling: package delivered to Alex and Sam via agreed channel; retention 90 days unless extended in writing
- Secrets: never in fit-check mail

6. Claim limits
This engagement produces a bounded, read-only picture of one authorised Linux
host: posture, findings, report, and (where agreed) a signed proof package with
an offline inspection path.

It is not a penetration test, exploitation exercise, or compliance certification.
A valid verifier result (when a named path exists) confirms the checks named for
that package — not that the host is secure, uncompromised, or correctly
administered.

7. Acceptance
Accepted by customer decision owner: Alex Rivera  date: 2026-07-31
Accepted by WitnessOps: Karol Stefanski  date: 2026-07-31
```

---

## 5. After collection — delivery email

```text
Subject: One Server Security Check package — acme-app-prod-1 — ready to inspect

Hi Alex,

Attached / linked is the One Server Security Check package for:

- Host label (admitted): acme-app-prod-1
- Collection window: 2026-08-05T08:00:00Z – 2026-08-05T11:00:00Z
- Engagement ref / run id: WO-2026-OS-0042 / [run id from package]

What you receive:
- Posture and findings for agreed read-only checks
- Report with named limits and unresolved items
- Evidence references / manifest
- Signed proof package
- Buyer walkthrough for offline inspection

How to inspect:
1. Read the buyer walkthrough first
2. Open report and findings
3. Check exclusions and incomplete sections
4. If a verifier path is named, use the offline product verifier with a trust registry obtained separately from the package
5. Public /verify is only for supported receipt types named in the package — do not invent a verifier

Important:
- status valid (if present) means named integrity/structure checks passed
- It does not mean the host is secure, uncompromised, or compliant
- This was not a penetration test
- outcome pass/partial is about collection-section completeness, not a security grade

One-liner: One authorised host, read-only package — not a pentest and not a security guarantee.

Service: https://witnessops.com/catalog/offsec-local-audit
Synthetic sample (shape only): https://witnessops.com/review/sample-cases/local-server-security-review

Please confirm receipt and whether you want a short walkthrough call.

— Karol
WitnessOps
```

---

## 6. Ledger row

| Field | Value |
| --- | --- |
| ref | WO-2026-OS-0042 |
| product | one-server |
| customer | Acme Tools Ltd |
| owner | Alex Rivera |
| status | delivered |
| price | 950 EUR |
| notes | partial OK if sections incomplete; explain using the restricted teaching report |
