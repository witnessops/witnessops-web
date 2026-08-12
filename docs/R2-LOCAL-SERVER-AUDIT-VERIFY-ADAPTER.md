# Local server audit → `/api/verify` structural adapter

**Primary schema:** `witnessops.local_server_audit.receipt.v1`  
**Legacy dual-read schema:** `offsecshield.receipt.v1`  
**Adapter id:** `witnessops.verify.local_server_audit_receipt.v1`  
**Response `inputKind`:** `local-server-audit-receipt`

## Purpose

Structural / cross-field adapter for standalone local-server-audit receipt JSON
submitted to `POST /api/verify`. Detected before PV/QV/WV validation.

This does **not**:

- revalidate artifact bytes on disk
- replace offline CLI `MANIFEST.sha256` READY/MISMATCH/MISSING checks
- claim PV/QV/WV proof-stage verification

## Dual-read policy

| Receipt marker | Accepted? |
|---|---|
| `schema: "witnessops.local_server_audit.receipt.v1"` | Yes (primary) |
| `schema: "offsecshield.receipt.v1"` | Yes (legacy dual-read) |
| `schema_id: "https://offsecagent.com/schemas/run_receipt.schema.json"` with no `schema` field | Yes (legacy schema_id-only detection) |

New emitters should use the primary WitnessOps schema token. Legacy packages
do not need to be re-emitted for structural web verify to continue working.

## Routing

`POST /api/verify` with body `{ "receipt": <object> }` is inspected by
`isLocalServerAuditReceipt` in `shield-verify-adapter.ts` and verified by
`verifyLocalServerAuditReceipt` (shared structural checks for both schema tokens).

## Fixtures

| File | Role |
|---|---|
| `fixtures/verify/local-server-audit-valid.json` | Primary valid |
| `fixtures/verify/local-server-audit-bad-binding.json` | Primary invalid binding |
| `fixtures/verify/offsec-shield-valid.json` | Legacy dual-read valid |
| `fixtures/verify/offsec-shield-bad-binding.json` | Legacy dual-read invalid |

## Public sample

- Buyer route: `/review/sample-cases/local-server-security-review`
- Legacy route redirects permanently from `/review/sample-cases/offsec-shield-local-server-audit`
- Fixture storage under `public/samples/offsec-shield-local-server-audit/` (stable storage id)
- Primary sample `RECEIPT.json` ships `witnessops.local_server_audit.receipt.v1`

## Implementation

- `apps/witnessops-web/src/lib/shield-verify-adapter.ts`
- `apps/witnessops-web/src/lib/verify-adapter.ts` (routing)
- Deprecated aliases: `isOffsecShieldReceipt`, `verifyOffsecShieldReceipt` → primary functions

## Related (historical)

- Prior note name: R2 OffSec Shield verify adapter (schema token renamed; dual-read retained)
