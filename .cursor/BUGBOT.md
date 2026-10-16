# WitnessOps Bugbot rules

Review rules for this repository. They complement root `AGENTS.md` and do not replace it.
Bugbot does not authorize merge, deploy, release, or a public verification claim.
Cursor project rules in `.cursor/rules/*.mdc` are not loaded on a Bugbot run. This file is.

## Public offers

- The only public paid offers are Agent Action Security Review at €2,500 excluding VAT and External Attack Surface Review at €1,900 excluding VAT.
- Flag any other price, offer, or buy CTA on a public surface.
- Held or historical prices and terms tracked in the commercial registry must not appear on public surfaces. Read `apps/witnessops-web/src/lib/commercial-truth.ts` and `apps/witnessops-web/src/lib/historical-held-term-surfaces.test.tsx`. Do not copy those held literals into public copy.
- The private pilot is not a public offer. The free hostname check is not a third paid review.
- Keep historical offer records for old lookups. Preserve their names. Do not rename them onto a current offer or present them as new public offers. That includes AI Agent Tools & Access Review, Public Exposure Review, Customer Security Review Sprint, One Server Security Check, Agent Risk & Control Review, Agent Workflow Reconstruction, and Early Bird — Internet Footprint Review.
- Offer identity changes do not grant rename, billing, collection, migration, or deployment authority.

## Public contact and timing

- Public contact must be `engage@mail.witnessops.com`. Flag `karol.stefanski@` on public surfaces.
- Timing copy is `Delivery timing per signed SOW` only.

## Claim boundary

- On public surfaces, flag a new positive claim that uses a banned word listed in `.cursor/rules/claim-boundary.mdc`. Read that file for the words and the approved replacements. Leave a string that an existing test already pins.

## Safety

- Flag a new deploy script, a change under `deploy/**` or `.github/workflows/**`, or a `deploy:*` script in `package.json`.
- Flag workflow permission widening, a secrets or `.env` read, a force-push, or a branch-protection change.
- Flag secrets, customer data, signing keys, cloud credentials, or private evidence bundles added to source, tests, examples, or fixtures.
- A merge to `main` is not production publication. Do not treat repository prose as evidence that a release is live.
- Retired cloud and deployment material is historical. Flag a change that reactivates a retired path.
- Do not suggest weakening a test, a CI gate, or a hook denial.

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

## Product boundaries

- `apps/witnessops-app/` owns account, workspace, membership, saved results, report sharing, and sandbox seat billing. Signup, joining a workspace, or payment does not authorize collection.
- Preserve Owner, Contributor, and Viewer restrictions. Report sharing is an explicit recipient projection of a fixed revision and does not grant workspace membership.
- Sandbox billing is not a live catalogue. Fixture tests do not establish provider-backed Help, mail, or payments.
