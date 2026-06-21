# OffSec Shield — Local Server Audit (public sample)

Synthetic fixture host `demo-host` from OffSecShield `run.sh`. Not a live customer environment.

## Files

- `RECEIPT.json` — run receipt (`offsecshield.receipt.v1`, aligned to `run_receipt.schema.json`)
- `evidence_manifest.json` — shipped-shape manifest
- `MANIFEST.sha256` — honest hash list
- `evidence/` — authority, scope, posture, findings (read-only posture collect)
- `VERIFY_NOTE.json` — WitnessOps `/api/verify` boundary

## Verify offline

From OffSec-Lane shield tree:

```bash
python3 tools/offsecshield.py verify .
```

## WitnessOps

Use `/verify` for PV/QV/WV receipts. Use `/api/mesh-gate` for operator mesh receipts (ADR 0008).
This bundle is inspected via download links on `/review/sample-cases/offsec-shield-local-server-audit`.
