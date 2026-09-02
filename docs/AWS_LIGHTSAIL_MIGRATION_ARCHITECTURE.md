# AWS hosting migration decision — historical public note

Status: `HISTORICAL_DECISION_WITH_PUBLIC_RISK_BOUNDARY`
Decision date: 2026-08-24

This file preserves the existence, scope, and public-safe risk assumptions of the August 2026 AWS hosting migration decision without publishing a current operator topology or deployment runbook.

The original decision evaluated moving the WitnessOps public web host to AWS in Frankfurt while preserving existing application behavior and keeping DNS, credential custody, receipt-signing trust, and broader product exposure as separate authority lanes.

The original document used **planned candidate / not deployed** language. Later deployment-authority source records superseded that operational status. Therefore this historical decision must not be used as evidence of current production state, current host identity, current network configuration, or current deployment authority.

## Public-safe risk assessment

The migration/design review treated these as material risks:

- **Unauthorized production mutation:** repository source, artifact publication, and production deployment must remain distinct authority steps rather than allowing merge or build success to imply deploy authority.
- **Artifact/runtime ambiguity:** a mutable image tag or generic HTTP success is insufficient evidence of which source/artifact is live; deployment decisions require immutable artifact identity and release-specific runtime evidence.
- **Single-host failure domain:** a simple single-node hosting design concentrates host, proxy, container runtime, orchestration, and local state failure; recovery evidence matters more than architecture prose.
- **State-loss / false-recovery confidence:** backup existence alone is not restore evidence. Recovery claims require an actual bounded restore/reconstruction check appropriate to the state in scope.
- **Credential and signing-boundary leakage:** cloud/runtime credentials and production verification/signing authority must not be collapsed into ordinary web application or repository custody.
- **Edge widening:** hosting migration must not implicitly publish unfinished API, admin, MCP, OffSec, staging, or private-network surfaces.
- **Authority drift:** DNS, edge/proxy configuration, application deployment, credential rotation, and verification/signing trust remain separate change lanes unless an explicit change authorizes more.
- **Stale documentation:** historical architecture decisions are not evidence of current live state. Current claims require dated observations or deployment receipts naming the verification mechanism and scope.

The intended controls include identity-bound release authority, immutable artifact references, explicit production approval, compare-and-swap/current-state checks where the executable contract requires them, separate authority lanes for edge/DNS/signing changes, and reconstructable release/rollback evidence.

## Public boundary

- Hosting architecture decisions do not change offer, verifier, signing, or customer-evidence semantics by themselves.
- Production state requires current release/runtime evidence, not this historical architecture note.
- Detailed provider topology, firewall/host configuration, data migration procedure, backup/restore procedure, Secret/key-name inventory, OIDC trust coordinates, private-network details, and cutover/rollback commands are maintained in restricted operator custody or executable deployment source where required.
- Executable deployment source remains separately governed and is not moved by this documentation extraction.

The exact historical source bytes remain reconstructable from Git history.
