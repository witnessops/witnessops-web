# Exercise · Lesson 1 (Academy v1.1) "Report or evidence?" · example data

**Agent report (example):** "The 02:00 backup run completed. All 3 databases saved. Restore tested."

**Artifacts you can open (example data):**
```
A · backup-job.log   job nightly-db
2026-XX-XX 02:00:14 UTC  start
2026-XX-XX 02:07:51 UTC  done: orders, users

B · run manifest     job nightly-db
run 2026-XX-XX 02:00:14 UTC
status: complete for this run
databases (2):
orders.dump  1.2 GB   SHA-256 7d3b…a90f (placeholder)
users.dump   88 MB    SHA-256 e07b…3f12 (placeholder)

C · restore log
(none provided)
```
B is the job's complete manifest for the same run the report describes (example data).

**Your task:** sort each claim into **Evidenced** (a record shows it happened), **Only claimed** (only the report says so; a missing record is a gap, not a "no") or **Contradicted** (an explicit record of the same scope shows something incompatible), name the artifact you used, and write one honest limit: what these artifacts do *not* prove.

**Copy answer (send this to Docs in your existing conversation):**
```
Lesson 1 · attempt 1
1 The 02:00 backup run completed   ___ (artifact _)
2 3 databases    ___ (artifact _)
3 Restore        ___ (artifact _)
Limit: ___
```
