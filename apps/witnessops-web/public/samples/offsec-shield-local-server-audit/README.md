# OffSec Shield — Local Server Audit (public sample)

Synthetic fixture host `demo-host` from OffSecShield `run.sh`. Not a live customer environment.

This is a public sample proofpack fixture. It demonstrates the structure of a
receipt-backed audit package. It is not a live customer audit, not a production
verification result, and not evidence that any third-party system was tested.
Localhost and `127.0.0.1` values are synthetic fixture scope only.

## Files

- `RECEIPT.json` — run receipt (`offsecshield.receipt.v1`, aligned to `run_receipt.schema.json`)
- `evidence_manifest.json` — shipped-shape manifest
- `MANIFEST.sha256` — honest hash list
- `evidence/` — authority, scope, posture, findings (read-only posture collect)
- `VERIFY_NOTE.json` — WitnessOps verifier boundary for this sample receipt
- `proofpack-demo-host-local-fixture-b.zip` — separate portable fixture bundle

## Verify offline

From OffSec-Lane shield tree:

```bash
python3 tools/offsecshield.py verify .
```

## WitnessOps

Use `/verify` for PV/QV/WV receipts. This OffSecShield sample receipt is not
verified by WitnessOps `/api/verify` unless a specific public verifier path is
provided. Use `/api/mesh-gate` for operator mesh receipts (ADR 0008).
This bundle is inspected via download links on `/review/sample-cases/offsec-shield-local-server-audit`.
