# WitnessOps Local Server Audit

## Result first

The bounded collection contract outcome is **PASS** for proof run `pr_lsa_20260710120000_198fd7aceb`.
Every required v1 collection section reached its admitted complete status.
This outcome concerns authority admission, bounded collection, artifact binding, and package construction. It is not a conclusion that the host is secure, uncompromised, or compliant.

## Named target and boundary

- Asset id: `asset-demo-host-001`
- Observed hostname: `demo-host`
- Profile: `linux_baseline_v1`
- Observed at: `2026-07-10T12:00:00Z`
- Execution: operator-present, local, read-only
- Processes, command lines, environment variables, credentials, cookies, tokens, private keys, user documents, event logs, memory, and network discovery were excluded.

## Deterministic posture findings

- Critical: 0
- High: 0
- Medium: 0
- Low: 0
- Informational: 0

No deterministic v1 posture findings were emitted from the supplied observations.

## Verification path

Use the delivered ZIP, detached signature, SHA-256 sidecar, and a separately obtained trust registry with `witnessops-local-audit verify`.
The verifier checks bounded inputs, the ZIP signature, receipt signature, trust-registry key admission, portable ZIP and package-tree safety, receipt-to-manifest binding, artifact hashes, strict claim semantics, reconstructed collection completeness, compatibility receipt equality, prohibited-class declarations, and embedded verifier reconstruction.

## Trust assumptions and unresolved gaps

- The external authority source is represented by its declared identity and SHA-256 digest; v1 does not validate the source signer's identity.
- The collector reports local observations; source-system honesty and kernel integrity are not independently established.
- A package-provided public key is not a trust anchor. Trust comes from the separately supplied registry.
- No network reachability, exploitability, compromise, historical activity, or compliance conclusion is included.
