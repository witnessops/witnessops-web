# Exercise · Lesson 2 "Same record, wrong scope?" · example data

**Agent report (example):** "The nightly price file was stored in production. All 4 regions loaded it. Checkout was checked against it."

**Artifacts you can open (example data):**

```
A · transfer log   job price-file
environment: production
2026-XX-XX 01:15:02 UTC  start
2026-XX-XX 01:15:40 UTC  stored: price-file.csv
SHA-256 4c8a…b17d (placeholder)

B · region load report   job price-file
environment: production
run 2026-XX-XX 01:15:02 UTC
regions loaded (3): eu-central, eu-west, us-east
status: complete for the regions listed

C · checkout price check
environment: staging
2026-XX-XX 01:16:05 UTC  result: pass
(no production checkout record)
```

B is the load report for the same job and run the transfer log describes (example data). C names a different environment.

**Your task:** sort each claim into **Evidenced** (a record of the same scope shows it happened), **Only claimed** (only the report says so for this scope; a true record of a different environment, target, or time is a gap, not a "no", and not a contradiction) or **Contradicted** (an explicit record of the same scope shows something incompatible), name the artifact you used, and write one honest limit: what these artifacts do *not* prove.

**Copy answer (send this to Docs in your existing conversation):**

```
Lesson 2 · attempt 1
1 The nightly price file was stored in production   ___ (artifact _)
2 All 4 regions loaded it    ___ (artifact _)
3 Checkout was checked against it   ___ (artifact _)
Limit: ___
```
