# Public Exposure Review — non-secret request and fit check

Use this before requesting files, logs, screenshots, inventories, credentials, or production evidence. The fit check does not authorise testing and does not start an engagement.

## Customer questions

```text
Public Exposure Review — non-secret request and fit check

1. Your name, role, organisation, and work email:

2. What decision or deadline is driving the review?
   Examples: enterprise customer request, launch, infrastructure change,
   investor or board review, or an upcoming penetration test.

3. Who will read or accept the result? What exact wording have they used:
   external review, vulnerability assessment, penetration test, accreditation,
   attestation, audit evidence, or something else?

4. What is the proposed public-facing system at a high level?
   Provide one public domain, hostname, application, API, public IP, public cloud
   endpoint, or coherent system seed only if you are comfortable sharing it.
   Do not send credentials, logs, screenshots, inventories, or files.

5. Do you own the target or hold written authority to commission the agreed checks?
   Answer: yes / authority can be obtained / no / unsure.

6. Approximately how many first-party hostnames, public IPs, and service endpoints
   are likely to be in scope? Estimates only; do not paste an inventory.

7. Are a CDN, hosting provider, shared platform, managed service, or other third party
   part of the boundary? Name the provider class only.

8. Is passive discovery plus approval-gated low-impact checking sufficient, or do you
   need exploitation, authenticated testing, password testing, or an accredited pentest?

9. Who can approve scope and stop conditions, and who will own remediation?

10. Preferred completion date, known exclusions, and any data-handling or residency
    requirement:

First-message boundary: do not attach or paste passwords, API keys, private keys,
MFA or recovery codes, session tokens, source exports, full logs, screenshots,
customer records, private network details, vulnerability evidence, or production data.
```

## Operator routing

### Fit for the €1,900 ex-VAT fixed scope

All of the following should be true:

- One owned or explicitly authorised public-facing system.
- The buyer accepts a bounded, unauthenticated outside-in review rather than exploitation, certification, or attestation.
- The estimated system stays within 10 confirmed first-party hostnames, 3 customer-attributed public IPs, and 20 service endpoints.
- Passive discovery and named low-impact checks are acceptable.
- A decision owner can approve scope and stop conditions.
- An engineering owner can act on findings.
- The deadline allows 24 hours after the agreed payment condition, accepted SOW, written authority, scope freeze, required inputs, and the approved collection window are confirmed.

### Custom scope or referral

- More than one coherent public-facing system or any cap is likely to be exceeded.
- Authenticated web/API testing, cloud-account review, multiple environments, rush delivery, special data residency, or bespoke contractual handling is required.
- Shared or third-party infrastructure cannot be cleanly attributed and authorised.
- The accepting party requires CREST/CHECK or another accreditation, exploitation-led penetration testing, a formal attestation, or compliance certification.

### Decline

- Target ownership or authority is absent or unclear.
- The customer asks to test unapproved third parties.
- The requested outcome is a security guarantee, exhaustive coverage, or proof that no vulnerabilities exist.
- The customer will not accept the prohibited-action or stop-condition boundaries.

## Fit-check response

```text
Subject: Public Exposure Review — scope result

Hi [Name],

Based on the non-secret information provided, this is [a fit for the fixed-scope review /
a custom-scope request / not a fit] because [one specific boundary reason].

[If fit]
The review covers one authorised public-facing system within the 10-hostname / 3-IP /
20-endpoint caps, using passive discovery and explicitly approved low-impact checks.
The fixed fee is €1,900 excluding VAT. Full payment is recommended; two €950 instalments
are available by agreement after scope acceptance. Payment alone does not authorise testing.
Delivery is due within 24 hours after the agreed payment condition, accepted SOW, written
authority, fixed scope, required inputs, and the approved collection window are confirmed.
One focused retest within 30 days is included.

Next we will send the fixed-scope statement of work and target/check schedule. Do not
send evidence or access details until that document and the handling route are agreed.

No sales call is required. This message does not authorise testing or start the delivery
clock.

This is a fixed-scope external security review, not a penetration test, accreditation,
compliance certification, attestation, or security guarantee.

— [Operator]
WitnessOps
```
