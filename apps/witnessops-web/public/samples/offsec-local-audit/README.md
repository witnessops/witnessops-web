# Synthetic Local Server Audit sample

This directory contains a fully reconstructable synthetic fixture issuance for
catalog SKU `OFFSEC-LOCAL-AUDIT`. The fixture is explicitly marked
`synthetic_non_customer`; it is not a customer run, not a production key, and
not evidence that a real host was assessed.

It was issued and verified with the production-candidate dependency pin
`cryptography==49.0.0`.

Verify it offline with:

```text
PYTHONPATH=src python3 -m witnessops_local_audit verify \
  --proofpack samples/proofpack-pr_lsa_20260710120000_198fd7aceb.zip \
  --signature samples/proofpack-pr_lsa_20260710120000_198fd7aceb.zip.sig.json \
  --trust-registry samples/trusted-keys.synthetic.json
```

Expected result: top-level `status` is `valid`, `outcome` is `pass`, and all
11 verifier checks are `passed`. The verifier reconstructs required-section
completeness as well as cryptographic and artifact bindings.

The fixture trust registry is deliberately co-located for reproducibility. A
production verifier must obtain its registry snapshot independently.

Current immutable inputs:

- proofpack SHA-256: `496656b4c873183887f2eee169021aca745a0f1cd57732faf169a02e86522a32`
- detached signature file SHA-256: `4ebca9d05707b785efab1a5788079a8986325b85aa50d054d5d7f2f50277e8f5`
- synthetic trust registry SHA-256: `34bb460bf0b38fc40be0c85138cf699c8bcca256dd908687e4912ab8365367ca`
- final verification result SHA-256: `c1ca938a8ec16d0f9df7df707f44cfe10dd2836c8156e2a4e33bff0707ebcfb6`
