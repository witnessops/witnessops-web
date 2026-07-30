# Fit-check reply templates

Paste into email or ticket. Personalise bracketed fields. **Do not** request secrets, credentials, keys, logs dumps, or customer evidence in this reply.

---

## A. Universal intake ack (any product)

```text
Subject: WitnessOps — fit check received ([short situation])

Hi [Name],

Thanks — we received your non-secret fit check.

Next step is only to confirm fit: situation, one bounded scope, decision owner, timing pressure, and whether a WitnessOps review is the right next action. We do not start collection, questionnaire work, or evidence intake until scope, authority, price, and handling are agreed.

Please confirm or correct:

1. Decision owner (name + role)
2. One sentence situation (no secrets)
3. Preferred product if known: CSR Sprint / One Server / not sure
4. Hard deadline if any (date)
5. Anything that must stay out of scope

Do not send passwords, private keys, API keys, recovery codes, session tokens, MFA codes, full logs, or customer evidence in this thread.

Useful links:
- Services: https://witnessops.com/catalog
- How we start: https://witnessops.com/review/request

— [Your name]
WitnessOps
```

---

## B. CSR Sprint — fit confirmed path

```text
Subject: CSR Sprint — fit check next steps

Hi [Name],

From your description, the Customer Security Review Sprint looks like the right shape:

- One questionnaire
- One product scope
- Proposed answers + evidence index + open items + cover note for *your* approval
- You own final answers and submission

Commercial line (public): From €1,600 after a non-secret fit check.
Timing (public): about three working days after scope, owners, inputs, and evidence access are confirmed.

To move to a scope agreement, send only non-secret:

1. Questionnaire type / source (e.g. customer portal, PDF name — no login)
2. Product / service name in scope
3. Decision owner and who will approve answers
4. Deadline the customer set
5. Whether evidence already exists in-house (yes/no — not the files yet)

What we will not do: invent evidence, certify compliance, or guarantee the customer accepts the package.

Sample package shape (synthetic, not your deal):
https://witnessops.com/review/sample-cases/customer-security-review-sprint

Service page:
https://witnessops.com/customer-security-review

If that matches, we will send a short scope agreement (price, timing, exclusions, handling) before any evidence is transferred.

— [Your name]
WitnessOps
```

---

## C. One Server — fit confirmed path

```text
Subject: One Server Security Check — fit check next steps

Hi [Name],

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

— [Your name]
WitnessOps
```

---

## D. Not a fit / wrong product

```text
Subject: Fit check — recommended next step

Hi [Name],

Thanks for the fit check. From what you described, we would not start a [CSR / One Server] engagement as written, because [one clear reason: multi-host / live IR / open-ended audit / needs secrets first / etc.].

Possible next steps:
- [Alternative WitnessOps situation card if any]
- [Or] refine the boundary to one host / one questionnaire and re-send a non-secret description
- [Or] we are not the right vendor for this request

Happy to re-open when the situation is one bounded package.

— [Your name]
WitnessOps
```

---

## Operator checklist before sending

- [ ] No request for secrets or file upload in this email  
- [ ] Product named correctly (CSR vs One Server)  
- [ ] Price and timing match public catalog  
- [ ] Sample link is synthetic, not claimed as their result  
- [ ] Clear “scope agreement before evidence/collection” gate  
