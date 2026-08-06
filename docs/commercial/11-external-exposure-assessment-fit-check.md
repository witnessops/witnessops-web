# External Exposure Assessment — non-secret fit check

Use this before requesting files, logs, screenshots, target inventories, credentials, or production evidence. The fit check does not authorize testing and does not start an engagement.

## Customer questions

Copy the block below into the review form, email, or a 15-minute call.

```text
External Exposure Assessment — non-secret fit check

1. Your name, role, organisation, and work email:

2. What decision or deadline is driving the review?
   Examples: launch, infrastructure change, pre-pentest cleanup, investor/board review,
   or a customer security request.

3. Who will read or accept the result? What exact wording have they used:
   vulnerability assessment, external review, penetration test, accreditation,
   attestation, audit evidence, or something else?

4. What is the proposed boundary at a high level?
   Name one public root domain or application hostname only if you are comfortable
   sharing that public identifier. Do not send IP lists, credentials, logs, or files.

5. Do you own the target or hold written authority to commission checks against it?
   Answer: yes / authority can be obtained / no / unsure.

6. Approximately how many first-party hostnames, public IPs, and service endpoints
   are likely to be in scope? Estimates only; do not paste an inventory.

7. Are a CDN, hosting provider, shared platform, managed service, or other third party
   part of the boundary? Name the provider class only; do not send account details.

8. Is passive discovery plus approval-gated low-impact checking sufficient, or do you
   need exploitation, authenticated application testing, password testing, or an
   accredited pentest?

9. Who can approve scope and stop conditions, and who will own remediation?

10. Preferred completion date, known exclusions, and any data-handling or residency
    requirement:

First-message boundary: do not attach or paste passwords, API keys, private keys,
MFA or recovery codes, session tokens, source exports, full logs, screenshots,
customer records, private network details, vulnerability evidence, or production data.
```

## Operator routing

### Fit for the €1,900 pilot

All of the following should be true:

- One owned or explicitly authorised public root domain or tightly bounded application.
- The buyer wants an external vulnerability/exposure assessment, not exploitation or certification.
- The estimated estate can stay within 10 confirmed first-party hostnames, 3 customer-attributed public IPs, and 20 service endpoints.
- Passive discovery and named low-impact checks are acceptable.
- A decision owner can approve scope and stop conditions.
- An engineering owner can act on findings.
- The deadline allows 5–7 business days after scope freeze and the approved check window.

### Custom scope or referral

- More than one root domain or any cap is likely to be exceeded.
- Authenticated web/API testing, cloud-account review, multiple environments, strict out-of-hours work, rush delivery, special data residency, or bespoke contractual handling is required.
- Shared or third-party infrastructure cannot be cleanly attributed and authorised.
- The accepting party requires CREST/CHECK or another named accreditation, exploitation-led pentesting, a formal attestation, or compliance certification.

### Decline

- Target ownership or authority is absent or unclear.
- The customer asks to test unapproved third parties.
- The requested outcome is a security guarantee, exhaustive coverage, or proof that no vulnerabilities exist.
- The customer will not accept the prohibited-action or stop-condition boundaries.

## Fit-check response

```text
Subject: External Exposure Assessment — fit check result

Hi [Name],

Based on the non-secret information provided, this is [a fit for the fixed pilot /
a custom-scope request / not a fit] because [one specific boundary reason].

[If fit]
The pilot covers one authorised public domain or bounded application, within the
10-hostname / 3-IP / 20-endpoint caps, using passive discovery and explicitly approved
low-impact checks. The fee is €1,900 excluding VAT, delivery is 5–7 business days after
authority and scope freeze, and one focused retest within 30 days is included.

Next we will send the fixed-scope statement of work and target/check schedule. Do not
send evidence or access details until that document and the handling route are agreed.

This is an external vulnerability assessment, not a penetration test, accreditation,
compliance certification, or security guarantee.

— [Operator]
WitnessOps
```
