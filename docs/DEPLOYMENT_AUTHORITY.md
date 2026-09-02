# Deployment boundary

Status: `PUBLIC_BOUNDARY_ONLY`

This public repository contains the WitnessOps web product source. It is not a public operator handbook and this document is not deploy approval, production verification, cloud inventory, rollback approval, or server-administration authority.

## Publicly stated boundary

- A merge to `main` does **not** itself authorize or perform a production deployment.
- Production publication and deployment require a separate explicit operator action through protected, identity-bound release controls.
- Runtime artifacts are promoted by immutable identity rather than by treating a mutable tag as proof of what is live.
- Production state claims require release-specific deployment/runtime evidence; repository prose and green CI are not sufficient evidence.
- DNS, edge/proxy changes, credential changes, public exposure of additional application surfaces, and verification/signing trust changes are separate authority lanes.
- Host identity, cloud account identifiers, private network topology, Secret/key inventories, credential locations, rollback endpoints, operator commands, and detailed release procedures are intentionally kept outside the public product-documentation surface.

Detailed operator deployment authority and recovery procedures are maintained in restricted operator custody.

Executable workflow and deployment source may remain in this repository where required by build/release trust. Its presence is not evidence that a particular workflow ran or that a particular release is live.

Retired deployment material is historical reference only and must not be reactivated without a separately authorized reopening lane.
