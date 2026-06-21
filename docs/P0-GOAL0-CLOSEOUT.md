# P0 goal0 closeout (operator log)

**Date:** 2026-06-21

## Done

| Check | Result |
|-------|--------|
| Sync `witnessops-web` → goal0 | Explicit hop in `sync-to-node-via-bastion.sh` + mesh-gate file verify |
| Node 22 mesh build + deploy | `witnessops-web:mesh-local`; receipt under `/opt/offsec/receipts/` |
| Goal0 localhost smoke | `/`, mesh index, Shield sample, `/api/mesh-gate` → 200 |
| Public `witnessops.com` smoke | Same paths → 200 |
| Fleet `pnpm optimize:quick-check` | PASS (proof + verify + mesh-gate) |
| `pnpm health:node22` on goal0 | PASS after route-parity baseline refresh + shield test path fix |

## Commands (repeat)

```bash
LANE_TOP=~/DEV/OffSec ./scripts/sync-to-node-via-bastion.sh
~/DEV/OffSec/scripts/run-witnessops-mesh-goal0.sh
cd ~/DEV/OffSec/working/sources/witnessops-web && pnpm optimize:quick-check
pnpm health:node22:goal0   # after sync; full gate on goal0
```

## Next lane

- **P1:** Shield receipt → `/api/verify` adapter (R2) — see `working/sources/shield/SCHEMA_RECONCILIATION.md`
- **Git:** commit witnessops-web + OffSec-Lane when `user.name` / `user.email` configured on fleet VM

## Honesty

- Mesh gate = operator mesh hygiene, not customer security verification.
- Shield sample = reference fixture; offline `offsecshield.py verify` is separate from web PV/QV/WV.