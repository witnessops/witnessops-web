# WitnessOps web deployment custody boundary

Status: `PUBLIC_BOUNDARY_ONLY`

This document states only the public custody boundary needed to understand the repository. Detailed production topology, credential/key-name inventories, host procedures, private-network details, release coordinates, and rollback mechanics are maintained in restricted operator custody.

## Public custody claims

- `witnessops-web` source is maintained in this repository.
- A source commit, image build, CI result, or published artifact is not by itself proof that production changed.
- Production deployment requires a separate authorized release action and release-specific evidence.
- Production artifacts are expected to be identified immutably for deployment and rollback decisions.
- Public website deployment does not imply that unfinished API, admin, MCP, OffSec, signing, or other product surfaces are launched or trusted.
- DNS and edge/proxy mutation are separate authority lanes.
- Production signing-key custody and public verification trust are separate from ordinary web-host deployment.

## Evidence boundary

A production claim should name the exact release evidence used to support it, such as source identity, immutable artifact identity, deployment result, runtime observation, and any required approval/rollback evidence. The public repository does not embed private host identity or credential material to make those claims.

Operational deployment, smoke, recovery, and private-lane procedures are kept outside the public product documentation surface.
