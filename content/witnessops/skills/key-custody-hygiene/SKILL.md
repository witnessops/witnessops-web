---
name: key-custody-hygiene
description: >
  Use when discussing signing keys, verifier keys, rotation records, or key
  custody metadata. Never print, copy, or transmit secret key material.
---

# Key custody hygiene

Metadata is discussable. Secret material is not.

## Workflow

1. Identify the key by id, role, and validity window — not by the secret.
2. Check rotation records against the declared policy.
3. Name who can sign and who can verify.
4. If production key policy is inactive, say so. Do not paper over it.

## Guardrails

- Do not print private keys, seeds, or recovery phrases.
- Do not ask the user to paste secret material into chat.
- Do not treat a local or demo key as a production signer.
- If a required trust input is missing, the result is Incomplete — not Valid.

## Outputs

- key id and role
- rotation status
- named missing trust inputs
