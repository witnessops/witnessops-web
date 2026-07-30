# Local server security review (public sample)

Synthetic fixture host `demo-host`. Not a live customer environment.

Buyer-facing title: **Local server security review**.

Primary wire schema: `witnessops.local_server_audit.receipt.v1`  
Legacy dual-read: `offsecshield.receipt.v1` (still accepted by `/api/verify` structural adapter)

## Contents

- `RECEIPT.json` — run receipt (primary WitnessOps local-server-audit schema)
- `evidence_manifest.json`, `MANIFEST.sha256`, evidence/* — sample package material
- `VERIFY_NOTE.json` — honest web vs offline verify boundary
- `proofpack-demo-host-local-fixture-b.zip` — optional portable fixture bundle

## Verify

Use `/verify` for PV/QV/WV receipts and for structural checks on this receipt family.

This sample receipt is **not** a PV/QV/WV proof-stage receipt. Structural web verify does **not** revalidate artifact bytes on disk.

This bundle is inspected via download links on `/review/sample-cases/local-server-security-review` (legacy path redirects).
