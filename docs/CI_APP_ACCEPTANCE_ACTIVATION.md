# App acceptance — separate activation

This patch exposes the stable `App acceptance` check; it does not enforce a merge rule by itself.

After a separately authorized push/PR:

1. Confirm the actual PR runs the complete authenticated-app workflow and `App acceptance` reports success only after `supply_chain_gate`, `app` and `image` succeed. Verify failure/cancellation behaviour in an isolated CI exercise before relying on it.
2. With separate repository-settings authorization, add the observed `App acceptance` context from GitHub Actions to the main branch's required checks. Preserve the existing `CodeQL` and `Exact dependency and lifecycle gate` requirements and their app bindings.
3. Read settings back and demonstrate that a failing/missing app acceptance result prevents merge. A local test, YAML change, or historical green run is not enforcement evidence.

No deployment, publication, signing, migration, permissions expansion or automatic merge is added. Full validation still runs on every PR.

## Failure artifacts

`app-test-diagnostics` retains a three-day, fixed-schema summary: allowlisted step outcomes (including separate DB and migration steps), plus status and failed-test count from Playwright's existing temporary `wops-app-foundation-browser/.last-run.json`. Missing/invalid browser results are `unavailable`; absent/unrecognized step outcomes are `unknown`.

This deliberately excludes raw DB/migration errors, error messages, test IDs, screenshots, traces, HTML reports, environment files, credentials, cookies, auth state and customer data. It is a metadata projection, not a general log-redaction system. The original failed step remains failed; collection/upload errors cannot turn it green. Raw diagnostics remain only in the existing Actions job log policy, which this patch does not modify.

The existing image JSON evidence remains, now with explicit three-day retention. This patch does not claim to newly sanitize its pre-existing contents. `always()` attempts collection after failures, but runner loss or force cancellation can prevent artifact upload; missing artifacts must never be interpreted as successful tests.
