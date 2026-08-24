# AWS Lightsail migration lane

Status: **planned candidate; no apply authority**

This directory defines the bounded infrastructure contract and acceptance path
for moving the existing WitnessOps web runtime to one AWS Lightsail instance in
Frankfurt. It does not provision AWS resources, deploy an image, rotate a live
secret, change DNS, activate a production receipt-signing key, or merge itself.

The architecture decision and risk assessment are in
[`../../docs/AWS_LIGHTSAIL_MIGRATION_ARCHITECTURE.md`](../../docs/AWS_LIGHTSAIL_MIGRATION_ARCHITECTURE.md).
The current live authority remains
[`../../docs/DEPLOYMENT_AUTHORITY.md`](../../docs/DEPLOYMENT_AUTHORITY.md) until a
separately authorized cutover is completed and evidenced.

## Files

| File | Purpose |
| --- | --- |
| `migration-contract.v1.json` | Machine-readable compute, edge, state, custody, provenance, acceptance, rollback, and cutover contract |
| `acceptance-record.example.json` | Non-operational, fail-closed template for the restricted migration receipt |
| `validate-acceptance.mjs` | Validates contract structure and staging/cutover readiness without contacting AWS |
| `candidate-acceptance.sh` | Read-only pre-DNS inspection of an explicitly identified, already provisioned candidate |
| `validate-acceptance.test.mjs` | Contract, trust-boundary, tamper, and candidate-helper tests |

Real resource identifiers, IP addresses, account numbers, topology values,
state manifests, logs, and approvals belong under the ignored restricted path:

```text
ops/receipts/aws-migration/<migration-id>/
```

Do not commit a completed acceptance record or any captured command output.

## Local contract checks

Use Node 22 and pnpm 9.15.4 from the repository root:

```bash
pnpm deploy:aws:test
pnpm deploy:aws:validate
```

The second command validates the checked-in example structurally. The template
is intentionally not ready. A readiness invocation must fail until real,
restricted evidence has been supplied:

```bash
pnpm deploy:aws:validate -- \
  ops/receipts/aws-migration/<migration-id>/acceptance.json \
  --require-staging-ready
```

Passing the validator is evidence that the named gates are populated; it is not
deployment, DNS, secret-rotation, signing, or cutover approval.

## Candidate preparation boundary

The later authorized apply lane creates one Ubuntu 24.04 Lightsail instance in
`eu-central-1`, attaches a static IPv4, configures the Lightsail and host
firewalls, installs Caddy and k3s, creates the three RWO PVCs, and injects the
private topology through the existing `deploy/topology.env` contract.

Preserve the current topology:

```text
Caddy -> 127.0.0.1:3000 -> one prod pod -> three RWO PVCs
private operator path -> mesh-dev hostNetwork bind -> emptyDir volumes
```

Do not add EKS, ECS, ALB, RDS, EFS, Route 53, a second ingress controller, or a
second application platform in this migration phase. Those are separate design
decisions, not prerequisites for changing the current private host.

Provider creation remains outside this repository because account IDs, resource
names, SSH sources, firewall ranges, and approval evidence are private custody.
The apply receipt must record the exact AWS account, region, availability zone,
instance ID, static IPv4, blueprint, bundle dimensions, firewall rules, and
snapshot settings.

## Persistent-state procedure

The initial AWS runtime remains a single writer. The file stores use POSIX
directory scans, locks, append operations, temporary files, and atomic rename;
they are not an object-store or active/active contract.

### Inventory before copy

Resolve the live values from private custody and record, without printing
secret values:

- source PVC names, StorageClass, PVs, reclaim policy, capacity, used bytes,
  filesystem, encryption/snapshot status, and host paths;
- `WITNESSOPS_INTAKE_STORE_DIR`, `WITNESSOPS_ADMIN_CORE_STORE_DIR`, optional
  `WITNESSOPS_TOKEN_STORE_DIR`, `WITNESSOPS_TOKEN_AUDIT_DIR`, and optional
  `WITNESSOPS_MAIL_OUTPUT_DIR`;
- whether `ASK_RECEIPT_ROOT` or `ASK_AUDIT_ROOT` is configured outside the
  active mounts;
- current mail transport and whether the mail-out PVC contains files;
- nonterminal intake/token records that depend on
  `WITNESSOPS_TOKEN_SIGNING_SECRET`.

The active AWS values must resolve to `/data/intake-store`,
`/data/intake-store/admin-core`, `/data/intake-events`, and, when configured,
`/data/mail-out`. The candidate helper compares those values inside the remote
shell and never emits them.

### Copy classes

| State class | Migration action | Acceptance |
| --- | --- | --- |
| Intake snapshots, verification contexts, admin core | Pre-copy; remove transient lock/temp files; final copy during write freeze | Source and target sorted file manifests, counts, bytes, UID/GID/mode inventory, application reads, and nonempty admin-core parity |
| Admission/event/retry/audit ledgers | Pre-copy; final copy during the same write freeze | Exact manifest match; every NDJSON line parses; latest event and projection reconstruction match |
| Mail-out | Archive source to restricted custody; create the target PVC empty | Archive digest recorded; target count and bytes are zero; no replay |
| Ask runtime receipts and Ask retrieval audits | Discover and archive if present; do not mount them into the AWS web pod | Archive digests recorded; `ASK_RECEIPT_ROOT` and `ASK_AUDIT_ROOT` absent from the candidate Secret; no new durability claim |

The source and target manifests must use sorted relative paths and SHA-256 per
regular file, then hash the manifest itself. Reject symlinks, devices, sockets,
unexpected partial NDJSON, or a source that changes during the final manifest.
Store manifests only in the restricted receipt directory.

### Consistency point

1. Take and verify an encrypted source backup through the existing private
   custody lane.
2. Pre-copy while the source remains live.
3. At the approved maintenance window, stop all source writers. A DNS change is
   not a write freeze.
4. Complete the final delta copy for intake-store and intake-events as one
   declared consistency point.
5. Archive mail-out and Ask surfaces, then create mail-out empty.
6. Generate source and target manifests while writers remain stopped.
7. Load the admin-core state, parse the event ledgers, and run projection
   reconstruction on the candidate.
8. Do not resume writes until all state gates pass.

Three independent PVC snapshots are not transactionally atomic. The write
freeze and final manifests, not snapshot timestamps alone, establish the
application consistency point.

## Runtime secrets versus receipt-signing custody

The AWS web pod still receives exactly two ordered Kubernetes Secret refs:

1. `BASE_ENV_SECRET`
2. `ADMIN_OIDC_SECRET`

The migration may rotate the current web runtime credentials only in an
explicitly authorized secret substep. Secret values stay in external operator
custody and are injected into preprovisioned Kubernetes Secrets; they are never
written to Git, images, build logs, or acceptance output.

`WITNESSOPS_TOKEN_SIGNING_SECRET` is an HMAC input for public intake tokens and
verification contexts. It is not the Public Exposure Review Ed25519 receipt
signing key. Rotating it without handling nonterminal tokens can invalidate
live customer flows, so inventory and an explicit invalidate/reissue or
compatibility decision are mandatory.

Production receipt signing is outside this lane:

- no signing private key on the Lightsail instance, in a pod, or in a Kubernetes
  Secret;
- no AWS KMS signing permission for the web workload;
- no production key allowlist, registry status, trusted revision, or custody
  approval change;
- no change to the server-owned Public Exposure Review trust posture.

The acceptance record hashes the pre- and post-migration trust-policy snapshot
and requires equality. Production-key activation requires a separate PR and
separate apply approval.

## Immutable image evidence

Use the current authoritative private-k3s build path:

```bash
pnpm deploy:k3s:build
```

Record the clean source HEAD, Supply Chain Gate result digest, pinned Node base
digest, pinned Google Workspace CLI archive hash, human alias, OCI manifest
digest, manifest-bound config digest, and the runtime image IDs from both
lanes. Both lanes must run the same digest-qualified reference.

The current local k3s image is not established as the separately built,
cosign-signed GHCR image. Do not claim deployed cosign or SBOM provenance in
this migration receipt. Importing the signed GHCR artifact or adding equivalent
attestation to the private build is a separate artifact-provenance change.

## Read-only pre-DNS candidate acceptance

After a separately authorized staging deployment, load the AWS candidate's
private topology and the build-recorded image identities, then run:

```bash
set -a
source deploy/topology.env
set +a

AWS_CANDIDATE_SSH=<restricted-target> \
AWS_CANDIDATE_INSTANCE_ID=<restricted-instance-id> \
AWS_CANDIDATE_AVAILABILITY_ZONE=<eu-central-1-az> \
AWS_CANDIDATE_STATIC_IPV4=<restricted-static-ip> \
EXPECTED_IMAGE_REF=<digest-qualified-ref> \
EXPECTED_CONFIG_DIGEST=<sha256-config-digest> \
pnpm deploy:aws:candidate
```

`candidate-acceptance.sh` verifies, without mutation:

- IMDSv2 instance ID, availability zone, and expected static IPv4;
- active Caddy and k3s services and complete Caddy config validation;
- loopback-only prod bind, exact non-wildcard custodied mesh bind, and exact
  candidate-local apex/`www`/legacy-docs redirect dispositions;
- exact ordered Secret refs, required Secret key names, active storage paths,
  and absence of AWS workload credentials or production receipt-signing keys
  across both Secrets and both deployments' explicit environments;
- identical immutable prod/mesh image refs, manifest/config/runtime identity;
- Bound PVCs, readable/writable mount permissions, free disk, and no
  Kubernetes `DiskPressure`;
- HTTP 200 on `/`, `/verify`, `/review/request`, `/security`, `/support`, and
  mesh-dev `/support`, all against candidate-local/private addresses;
- local Caddy host routing without following a redirect to public DNS;
- Public Exposure Review receipt-only behavior: recognized structure remains
  `indeterminate`, malformed profile is `invalid`, and a same-shape signature
  mutation remains `indeterminate` with cryptographic verification explicitly
  `not_checked`.

The helper never calls the public apex, so it cannot accidentally certify the
old host. It does not prove the Lightsail firewall, external TLS, DNS, state
copy, backup restore, alarm delivery, or cutover; those remain separate receipt
checks.

## Observability gate

Before cutover, record:

- Lightsail `StatusCheckFailed`, CPU, network metrics, a verified notification
  contact, and a tested alarm fire/recovery cycle;
- `caddy` and `k3s` journal access, retention, redaction, and named owner;
- pod readiness/restarts, disk free space, PVC usage, `DiskPressure`, and
  application storage/mail/upstream errors;
- one external post-cutover probe for home, request, verify, and support routes.

Lightsail metrics do not replace guest filesystem monitoring or application
smoke. Thresholds, recipients, retention, and escalation belong in the
restricted acceptance record because they are operator and account details.

## Rollback boundary

Retain the old host until an explicit decommission decision after the observation
window and state reconciliation.

- **Before any AWS-side write:** restore the previous DNS values to the retained
  old host and verify it.
- **After any AWS-side write:** DNS-only rollback is unsafe. Freeze writes,
  reconcile the AWS delta back to the old host, then restore DNS, or repair
  forward on AWS.
- **Image-only failure:** deploy the same recorded known-good digest to prod and
  mesh-dev, then run exact pair smoke.
- **State/schema incompatibility:** keep the service frozen and use the rehearsed
  backup/restore path or a named forward fix. Do not attach an older image to
  newer state unless compatibility was tested.

Rollback is complete only after route, verifier, mount, ledger, projection, and
alarm checks pass. `kubectl rollout status` alone is not rollback evidence.

## Cutover sequence

The future apply lane must follow this order:

1. approve RPO, RTO, maintenance window, exact DNS values, and abort thresholds;
2. confirm source and candidate backups plus an isolated restore rehearsal;
3. complete all staging checks and validate the restricted record with
   `--require-staging-ready`;
4. confirm the retained old host and state-aware rollback plan;
5. pre-copy, freeze source writes, final-sync, and reconcile manifests;
6. rerun candidate-local readiness while writes remain frozen;
7. obtain separate cutover/DNS approval and validate with
   `--require-cutover-ready`;
8. change only the authorized apex/`www` records and preserve legacy docs-host
   redirect reachability;
9. verify external TLS, redirects, routes, request intake, verifier semantics,
   logs, and alerts from independent observers;
10. observe, then explicitly close or roll back. Do not decommission the old
    host in the cutover step.

AWS deployment and production-key activation are never the same change or
approval event.
