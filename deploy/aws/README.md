# AWS Lightsail migration lane

Status: **active routine GitHub/ECR/SSM production path; execution still requires explicit approval**

This directory defines the bounded infrastructure contract and active routine
GitHub/ECR/SSM path for the WitnessOps web runtime on AWS Lightsail in Frankfurt.
Its existence does not authorize a dispatch, environment approval, deployment,
secret change, DNS change, signing-key activation, or merge.

The architecture decision and risk assessment are in
[`../../docs/AWS_LIGHTSAIL_MIGRATION_ARCHITECTURE.md`](../../docs/AWS_LIGHTSAIL_MIGRATION_ARCHITECTURE.md).
The current live authority remains
[`../../docs/DEPLOYMENT_AUTHORITY.md`](../../docs/DEPLOYMENT_AUTHORITY.md) until a
separately authorized cutover is completed and evidenced.

## Files

| File | Purpose |
| --- | --- |
| `migration-contract.v1.json` | Machine-readable compute, edge, state, custody, provenance, acceptance, rollback, and cutover contract |
| `github-deployment-contract.v1.json` | GitHub OIDC, ECR, SSM, host-adapter, and acceptance boundary |
| `cloudformation/github-deployment-bootstrap.template.json` | Parameterized source for one existing GitHub OIDC provider, three split roles, immutable ECR, two bounded SSM documents, hybrid-node role, and Run Command logs |
| `acceptance-record.example.json` | Non-operational, fail-closed template for the restricted migration receipt |
| `validate-github-deployment.mjs` | Validates the deployment contract, CloudFormation source, and recorded deployment identities without contacting AWS or GitHub |
| `validate-acceptance.mjs` | Validates contract structure and staging/cutover readiness without contacting AWS |
| `candidate-acceptance.sh` | Read-only pre-DNS inspection of an explicitly identified, already provisioned candidate |
| `validate-github-deployment.test.mjs` | OIDC, role separation, ECR, SSM command-injection, and evidence-tamper tests |
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
pnpm deploy:aws:validate-github
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

## GitHub-to-AWS deployment boundary

Status: **active routine path**.

The recommended authentication path is GitHub Actions OIDC. GitHub requests a
short-lived AWS STS session for one exact role; no `AWS_ACCESS_KEY_ID`,
`AWS_SECRET_ACCESS_KEY`, private deploy key, or AWS password is stored in GitHub.
This removes long-lived AWS credentials, but it does not remove authorization.
The reviewed source contract still requires the production job to pass a
protected `aws-production` GitHub Environment with at least one reviewer.
During the current founder-operated phase, the contract permits the same
approved operator to dispatch and approve in two separate actions. Activating
that source change still requires a separately authorized Environment update
and readback.

The source contract splits authority:

| Principal | May do | Must not do |
| --- | --- | --- |
| `aws-image-publish` role | Authenticate to ECR and push layers/manifests to the exact `witnessops-web` repository | Send SSM commands, read secrets, sign receipts, mutate IAM/Lightsail/DNS |
| `aws-staging` role | Invoke only the staging document on a correctly tagged staging managed node; read that command result | Push ECR, target production, start a shell session, read secrets, mutate infrastructure |
| `aws-production` role | Invoke only the production document on a correctly tagged production managed node after GitHub Environment approval | Push ECR, target staging, start a shell session, read secrets, mutate infrastructure |
| Lightsail SSM service role | SSM Agent core calls, pull the exact ECR repository, write the exact Run Command log group | Push images, read Parameter Store/Secrets Manager, decrypt/sign with KMS, mutate IAM/Lightsail/DNS |

Every OIDC trust checks the exact audience, immutable owner/repository subject,
repository ID, owner ID, `refs/heads/main`, GitHub Environment, and the reserved
reusable workflow
`witnessops/witnessops-web/.github/workflows/aws-release-reusable.yml@refs/heads/main`.
The reserved caller and reusable workflow are active on `main`. The reviewed
`aws-production` source contract requires an explicit approval and permits the
approved founder-operator to self-review. Administrator bypass must remain
disabled in the live Environment. Those controls do not themselves authorize a
specific deployment.

The CloudFormation source accepts only the ARN of an existing commercial-
partition account-level GitHub OIDC provider. It never creates a second
provider, and the repository name and 30-day Run Command log retention are fixed
rather than operator-overridable. Its ECR repository uses immutable tags,
scan-on-push, AES-256 at-rest encryption, retained deletion semantics, and
expiration of untagged images only; tagged rollback artifacts are not
automatically expired. Because ECR enhanced scanning is configured at registry
level, Phase 1 deliberately does not overwrite that account-wide setting.
Candidate acceptance instead records digests of the observed registry scanning
configuration and findings plus the explicit scan-policy reference/result; a
scan-on-push flag alone is not acceptance evidence.

Lightsail does not receive an IAM instance profile through this contract. A
later operator lane registers the host as one Systems Manager hybrid managed
node using a one-time activation held outside Git and GitHub. The two SSM
documents accept only image digest, source commit, config digest, and expected
current digest. Each uses `ENV_VAR` interpolation and executes only:

```text
/usr/local/sbin/witnessops-deploy-v1
```

That root-owned adapter is the active host-side contract. It must
construct the exact account/region/repository reference, reject mutable or
unexpected images, verify the current and requested digests, import the ECR
manifest into local k3s containerd, reuse the current reconciliation/smoke
contract where compatible, and emit no secret or customer data. Neither the web
pod nor either Kubernetes Secret receives AWS credentials.

Current primary references for the contract:

- [GitHub OIDC immutable subjects and environments](https://docs.github.com/en/actions/reference/security/oidc)
- [GitHub OIDC with reusable workflows](https://docs.github.com/actions/deployment/security-hardening-your-deployments/using-openid-connect-with-reusable-workflows)
- [AWS GitHub OIDC condition keys](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_iam-condition-keys.html)
- [AWS IAM GitHub trust-policy validation](https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-reference-policy-checks.html)
- [Systems Manager tag-restricted Run Command](https://docs.aws.amazon.com/systems-manager/latest/userguide/run-command-setting-up.html)
- [Systems Manager hybrid managed-node service role](https://docs.aws.amazon.com/systems-manager/latest/userguide/hybrid-multicloud-service-role.html)
- [SSM document input validation and interpolation](https://docs.aws.amazon.com/systems-manager/latest/userguide/documents-schemas-features.html)
- [ECR repository CloudFormation contract](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ecr-repository.html)
- [ECR basic and enhanced image scanning](https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-scanning.html)
- [Run Command output in CloudWatch Logs](https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-rc-setting-up-cwlogs.html)

## Historical activation handoff

The phase notes below record how the active path was introduced. They are not
current execution instructions and do not supersede the protected GitHub
workflow.

**Phase 1 — this PR: OPERATOR LAPTOP REQUIRED: NO.** Contract files, validators,
negative tests, and documentation can be completed in the current repository
environment. Stop before any AWS or GitHub setting changes.

**Phase 2 — AWS bootstrap: OPERATOR LAPTOP REQUIRED: YES.** Use the custodied
MacBook checkout under `~/WitnessOps/repos/witnessops-web` (or an approved AWS
CloudShell session) with the operator's normal AWS/GitHub authentication to:

1. inspect the target AWS account/region and reuse its single GitHub OIDC provider;
2. apply the reviewed template by exact merged commit/template digest;
3. observe and enable the repository's immutable OIDC subject format in the safe order documented above while preserving the reserved reusable-workflow claim;
4. create the three GitHub Environments and store only non-secret role/resource identifiers as variables;
5. create a one-node SSM hybrid activation, register the exact Lightsail host, apply the required application/stage tags, then dispose of the one-time activation material;
6. capture CloudFormation outputs, the observed ECR registry scan configuration, and negative IAM tests in restricted custody;
7. stop before installing a deployment adapter, enabling a deployment workflow, deploying the app, changing DNS, or activating production signing trust.

**Phase 3 — adapter/workflow PR:** return to repository work after Phase 2 has
supplied the non-secret resource identifiers. Implement and test the root-owned
host adapter plus a caller and the reserved reusable digest-only workflow in a
separate PR. Its production job remains approval-gated. Production receipt-key
activation remains another independent authority lane.

### Phase 3 activation boundary

The Phase 3 source consists of:

- `deploy/aws/host/witnessops-deploy-v1`, a fixed-argument Python adapter that
  reads the hybrid-node credential file only in memory, verifies one exact ECR
  manifest/config/source identity, imports a bounded OCI archive into k3s
  containerd, checks the existing runtime/secret-ref contract, and restores the
  previous digest-qualified image on a failed post-patch gate;
- `deploy/aws/host/install-witnessops-deploy-v1.sh`, whose default `--check`
  mode is read-only and whose `--apply` mode requires the exact adapter and
  topology-config SHA-256 values;
- `.github/workflows/aws-release.yml`, a manual caller with no executable job
  steps of its own; and
- `.github/workflows/aws-release-reusable.yml`, the reserved reusable workflow
  pinned by the Phase 2 OIDC trust policy and fail-closed to the exact manual
  caller path and `workflow_dispatch` event.

Merging those workflow files makes the manual workflow visible; it does not run
it. Phase 3 activation must not dispatch the workflow, publish an image, invoke
an SSM document, or modify a Kubernetes deployment. The source must first merge
to `main`; install only the bytes read back from that exact merged commit and
bind both the adapter and generated config to their separately reviewed
SHA-256 values. Generate the non-secret topology config in root-only staging
from restricted operator custody without copying `/root/.aws/credentials` or
any credential value. Validate both digests with the installer `--check`, then
separately run `--apply` and read back root ownership, mode, both digests, and
`--self-test` output. Deployment and rollback patches compare the exact
previous image value before replacement and refuse to overwrite a third state.
Apply mode never executes the supplied adapter pathname: it copies both source
files into root-owned temporary paths, verifies both staged digests, and
self-tests only that staged pair before replacing either installed target.

The publisher equality-binds its configured ECR URI to the reviewed account,
Frankfurt region, and `witnessops-web` repository before requesting an ECR login
token. It derives the expected config digest from the hash-verified local build
archive before requesting AWS identity. It reuses an existing immutable source
tag only after the ECR manifest, config digest, source-revision label, and that
local-build config digest all match, so self-declared registry metadata cannot
authorize retry recovery. After
`DescribeImageScanFindings` returns an exact-digest, completed inventory with
zero critical and high findings, the publication run retains one non-secret,
90-day GitHub artifact containing the exact ECR manifest, raw findings response,
and evidence record bound to the run ID, run attempt, source commit, manifest
digest, config digest, scanning mode, scan status, and findings-response hash.
Basic scanning requires `COMPLETE`, a completion timestamp, and the `findings`
array. Registry-level enhanced scanning requires `ACTIVE`, a completion
timestamp, and the `enhancedFindings` array. Missing, ambiguous, pending, or
unsupported telemetry fails closed. The AWS CLI must auto-aggregate every
findings page; a retained response with a non-null `nextToken` is treated as
truncated and rejected.
Deploy dispatches must name that publication run and attempt. A low-authority
job first confirms through the GitHub API that the exact run was a successful
manual run from the reserved caller on `main` and referenced the reserved
reusable workflow at that same source commit. The immutable artifact can only
be emitted by the guarded `publish_image` job; its exact operation, run identity,
and requested digests are then validated. Neither deploy job can request AWS
OIDC identity unless those checks pass. This uses repository-scoped GitHub
Actions read permission. The source contract adds only
`ecr:DescribeImageScanFindings` to the publisher's existing exact-repository,
region-constrained statement; applying that IAM source change requires a
separate reviewed CloudFormation change-set approval and is not performed by
merging this source.

Lane smoke checks permit direct HTTP 200 responses and same-authority redirects,
but reject a cross-authority redirect before the redirected network request is
sent.

The existing production hybrid node is not a staging target. Leave
`AWS_SSM_MANAGED_NODE_ID` unset in `aws-staging` until a distinct managed node
has the reviewed staging tags. Production stores only its managed-node ID as a
non-secret environment variable. Production protection must continue to
require a separate approval action. The temporary single-operator model may
allow self-review, but must not remove the review gate or enable administrator
bypass.

Adapter removal is bounded and does not touch the application: move
`/usr/local/sbin/witnessops-deploy-v1` and `/etc/witnessops/deploy-v1.json` into
the restricted root backup location, then confirm both installed paths are
absent. Workflow rollback is a normal PR reverting only the caller, reusable
workflow, validation workflow, adapter source, installer, config example,
contract, and validator. Neither rollback path authorizes image deletion,
application deployment, DNS changes, secret changes, or signing activation.

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

Routine image evidence comes from the manual-dispatch
`.github/workflows/aws-release.yml` publication operation: an exact merged-main
commit is built as one `linux/amd64` image without AWS authority, transferred as
a hashed archive, published under its immutable source tag, resolved to its ECR
manifest and config digests, and checked against ECR scan evidence before a
deploy operation can proceed.

The former `pnpm deploy:k3s:build` Mac/SSH path is retired and fails closed. It
must not be used to create routine production evidence.

Record the clean source HEAD, Supply Chain Gate result digest, pinned Node base
digest, pinned Google Workspace CLI archive hash, human alias, OCI manifest
digest, manifest-bound config digest, and the runtime image IDs from both
lanes. Both lanes must run the same digest-qualified reference.

Do not claim cosign, SBOM, or other provenance beyond the exact evidence emitted
by the active ECR workflow. Adding another attestation mechanism is a separate
artifact-provenance change.

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
