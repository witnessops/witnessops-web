# R2 — OffSec Shield → `/api/verify` adapter

**Status:** shipped (structural lane)  
**Adapter id:** `witnessops.verify.offsec_shield_receipt.v1`

## Boundary

This is operator/reference documentation. The shipped R2 path is a
structural adapter for standalone `offsecshield.receipt.v1` JSON submitted to
`/api/verify`. It is not proofpack ZIP verification, does not revalidate
manifest bytes, and does not verify sample artifact bundles.

R2 does not prove a live customer audit, a production verification result, or
that any third-party system was tested. `artifactRevalidation` remains
`"not_possible"` unless a named verifier path is added later.

## What it does

`POST /api/verify` with a JSON body `{ "receipt": <offsecshield.receipt.v1> }` is detected before PV/QV/WV validation and routed to `shield-verify-adapter.ts`.

Checks (in-process, no disk reads):

- Schema token / `run_receipt.schema.json` `schema_id`
- Required fields (`receipt_id`, `run_id`, `module`, `issued_at_utc`)
- `artifacts[]` shape (path + 64-char `sha256`)
- `authority_hash` / `scope_hash` binding to matching `artifacts[]` entries
- `no_fabrication` when present
- Explicit check: offline bytes require `offsecshield.py verify`

## What it does not do

- PV / QV / WV proof-stage verification
- MANIFEST.sha256 READY / MISMATCH / MISSING (CLI only)
- Signature / TSA verification (`RECEIPT.sig.json` lane)

## Response shape

- `inputKind`: `"offsec-shield-receipt"`
- `proofStageClaimed` / `proofStageVerified`: `"unknown"`
- `artifactRevalidation`: `"not_possible"`
- `verdict`: `"valid"` | `"invalid"` (structural only)

## Fixtures

- `apps/witnessops-web/fixtures/verify/offsec-shield-valid.json`
- `apps/witnessops-web/fixtures/verify/offsec-shield-bad-binding.json`

## Related

- `shield/SCHEMA_RECONCILIATION.md` (OffSec-Lane copy)
- Sample: `/review/sample-cases/offsec-shield-local-server-audit` is a
  synthetic public proofpack fixture. It is not currently verified through WitnessOps /api/verify; inspect the included manifest and sidecars unless a public verifier path is explicitly named.
