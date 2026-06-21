# R2 — OffSec Shield → `/api/verify` adapter

**Status:** shipped (structural lane)  
**Adapter id:** `witnessops.verify.offsec_shield_receipt.v1`

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
- Sample: `/review/sample-cases/offsec-shield-local-server-audit`