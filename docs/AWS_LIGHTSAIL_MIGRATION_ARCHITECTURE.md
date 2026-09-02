# AWS hosting migration decision — historical public note

Status: `HISTORICAL_DECISION_STUB`
Decision date: 2026-08-24

This file preserves the existence and scope of the August 2026 AWS hosting migration decision without publishing a current operator topology or deployment runbook.

The original decision evaluated moving the WitnessOps public web host to AWS in Frankfurt while preserving the existing application behavior and keeping DNS, credential custody, receipt-signing trust, and broader product exposure as separate authority lanes.

The original document used **planned candidate / not deployed** language. Later deployment-authority records superseded that operational status. Therefore this historical decision must not be used as evidence of current production state, current host identity, current network configuration, or current deployment authority.

Public boundary:

- Hosting architecture decisions do not change offer, verifier, signing, or customer-evidence semantics by themselves.
- Production state requires current release/runtime evidence, not this historical architecture note.
- Detailed provider topology, firewall/host configuration, data migration procedure, backup/restore procedure, secret-name inventory, OIDC trust coordinates, private-network details, and cutover/rollback instructions are maintained in restricted operator custody or executable deployment source where required.
- Executable deployment source remains separately governed and is not moved by this documentation extraction.

The exact historical source bytes remain available through Git history for reconstruction.
