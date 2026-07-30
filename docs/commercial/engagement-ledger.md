# Engagement ledger

Log every real engagement. One row per deal. Do not put secrets or customer evidence here.

## Active / history

| ref | opened | product | customer | decision_owner | status | price_eur | deadline | sample_shown | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| WO-EXAMPLE-OS | 2026-07-30 | one-server | Acme Tools (fictional) | Alex Rivera | example | 950 | 2026-08-08 | local-server | See worked-examples/acme-one-server-full.md |
| WO-EXAMPLE-CSR | 2026-07-30 | csr | Acme Tools (fictional) | Jordan Kim | example | 1600 | 2026-08-12 | csr-sprint | See worked-examples/acme-csr-full.md |
| | | | | | | | | | |

**status values:** `fit` · `scoped` · `in_work` · `delivered` · `closed` · `lost` · `not_fit` · `example`

**product values:** `csr` · `one-server` · `launch` · `custody` · `incident` · `other`

---

## How to use

1. On first fit check, add a row with status `fit`.  
2. On scope acceptance → `scoped` + price.  
3. When work starts → `in_work`.  
4. On delivery email sent → `delivered`.  
5. When they confirm / deal ends → `closed` or `lost`.  

Never store: passwords, keys, raw evidence paths with secrets, private customer files.
