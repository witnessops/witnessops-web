# Deployment source boundary

Status: `PUBLIC_BOUNDARY_ONLY`

The `deploy/` tree contains source and validation material used by `witnessops-web`. It is not a public operator handbook and the presence of deployment source does not prove that a particular release is live.

## Public boundary

- A merge to `main` does not itself authorize or perform production deployment.
- Production publication/deployment requires separate explicit operator authority and release-specific evidence.
- Host identity, cloud account identifiers, private network topology, Secret/key inventories, credential locations, operator status transcripts, backup paths, and rollback commands are maintained outside the public documentation surface.
- Historical deployment helpers and examples are not routine production authority merely because they remain in source.
- Executable deployment files that remain here may be required by CI, recovery, or identity-bound release trust; moving them requires a separate reviewed control-plane migration.
- DNS, edge/proxy mutation, credential changes, and verification/signing trust changes remain separate authority lanes.

Public contributor validation belongs in the root command/release boundary documents. Detailed operator deployment procedures are maintained in restricted non-public custody.
