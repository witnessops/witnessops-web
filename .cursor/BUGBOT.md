# WitnessOps Bugbot rules

Review rules for this repository. They complement root `AGENTS.md` and do not replace it.
Bugbot does not authorize merge, deploy, release, or a public verification claim.

## Receipt verification

- `/verify` and `/api/verify` accept untrusted receipt input. Invalid, incomplete, ambiguous, or malformed input must not be presented as verified.
- Keep both routes receipt-only. Do not widen them into canonical bundle verification, corpus verification, signing, storage, backfill, or mutation.
- App import, storage, report-sharing, and CLI finalization paths do not widen the public verifier.
- Flag any change that overclaims what the verifier proved, including public copy, smoke tests, and route-parity expectations.
- Keep `packages/proof` on the receipt-only lane unless a separate lane explicitly authorizes more.

## Public proof surfaces

- Flag internal-only proof details on operator-facing or public pages: host identity, cloud account identifiers, secret inventories, private network topology, rollback endpoints, workstation paths, or credential locations.
- Sample pages are public proof surfaces, not proof authority. Sample commits, manifest hashes, artifact digests, and sample URLs belong in `apps/witnessops-web/src/app/review/sample-cases/ai-agent-action-proof-run/sample-artifact-contract.ts` when a contract field exists.
- A synthetic or demo verification does not establish a real provider action, a real credential compromise, production signing-key custody, legal compliance, or whole-environment assurance.

## Deploy and release

- Flag any change under `deploy/**`, `.github/workflows/**`, or a `deploy:*` script in `package.json`.
- A merge to `main` is not production publication or deployment. Do not treat repository prose as evidence that a release is live.
- Retired cloud and deployment material is historical. Flag a change that reactivates a retired path.
- Do not rename, move, or semantically change existing production workflow paths or trust bindings as part of documentation or public-surface cleanup.
- Flag secrets, customer data, signing keys, cloud credentials, or private evidence bundles added to source, tests, examples, or fixtures.

## Pricing and offers

- The only public paid offers are **Agent Action Security Review** at **€2,500 excluding VAT** and **External Attack Surface Review** at **€1,900 excluding VAT**.
- Flag any pricing, offer-name, descriptor, CTA, or catalogue-identity change. Historical offer records stay for old lookups and must not be presented as new public offers.
- The private pilot is not a public offer. The free hostname check is not a third paid review.
- Offer identity changes do not grant rename, billing, collection, migration, or deployment authority.

## Product boundaries

- `apps/witnessops-app/` owns account, workspace, membership, saved results, report sharing, and sandbox seat billing. Signup, joining a workspace, or payment does not authorize collection.
- Preserve Owner, Contributor, and Viewer restrictions. Report sharing is an explicit recipient projection of a fixed revision and does not grant workspace membership.
- Sandbox billing is not a live catalogue. Fixture tests do not establish provider-backed Help, mail, or payments.
