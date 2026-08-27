# Deploy (AWS Frankfurt production target)

The active routine production target for `witnessops.com` is the AWS
Lightsail Frankfurt plane `prod-aws-frankfurt`, not the retained old VPS and
not GHCR Compose. `topology.env.example` fixes that generic public plane;
exact host, instance, namespace, workload, Secret, storage, and mesh values
stay in ignored operator custody.

Accepted claim: "The witnessops-web apex/www production serving path operates
from AWS Lightsail in Frankfurt." Do not expand it to API, mesh-dev, rollback,
credentials, or the broader production environment.

| Lane | Deployment | Reachability |
| --- | --- | --- |
| **prod** | `DEPLOY_NS/PROD_DEPLOY` | Public via Caddy → loopback app bind |
| **mesh-dev** | `DEPLOY_NS/DEV_DEPLOY` | Private `MESH_DEV_URL` only |

Routine production authority is:

```text
exact merged main commit
-> .github/workflows/aws-release.yml
-> immutable Frankfurt ECR image and scan evidence
-> protected aws-production environment
-> bounded production SSM document
-> witnessops-deploy-v1
-> Frankfurt k3s
```

`pnpm deploy:k3s:build`, `deploy:k3s:prod`, and `deploy:k3s:both` are retired
and fail closed. Direct Mac/SSH builds and kubectl production applies are not
routine authority. Keep `deploy:k3s:status:topology` for restricted read-only
status and `deploy:k3s:smoke` for an explicitly scoped read-only check.

**Smoke enforces (fails on drift):** the exact ordered application-container
`envFrom` contract on both deployments, identical digest-qualified image refs,
each ready application's manifest-bound runtime image ID, HTTP 200 on both
homes, and matching primary CSS. The `envFrom` contract is
`BASE_ENV_SECRET`, then `ADMIN_OIDC_SECRET`, each as a `secretRef`
with an empty prefix and `optional=false`; source, order, prefix, or `optional`
drift fails.

**Intentional non-parity:** custodied mesh bind, emptyDir intake,
runtime `PORT`/`HOSTNAME`/`WITNESSOPS_VERIFY_BASE_URL`.

The production SSM host adapter preflights both shared Secrets, then reconciles its
image and exact `envFrom`. `ADMIN_OIDC_SECRET` must contain
`WITNESSOPS_ADMIN_SECRET` plus
`WITNESSOPS_GOOGLE_ADMIN_EMAIL_ALLOWLIST`,
`WITNESSOPS_GOOGLE_OIDC_CLIENT_ID`,
`WITNESSOPS_GOOGLE_OIDC_CLIENT_SECRET`,
`WITNESSOPS_GOOGLE_OIDC_REDIRECT_URI`, and
`WITNESSOPS_GOOGLE_WORKSPACE_DOMAIN`, and the bounded
`WITNESSOPS_ADMIN_ROLE` enum. Credential values are never decoded, emitted, or
logged; the role enum is decoded only into captured shell state and is not
printed. Extra dormant
Microsoft OIDC and legacy-key credential entries remain untouched and require a
separately authorized custody-cleanup pass to retire.

The legacy `deploy/k8s/apply.sh` and direct production k3s scripts are retained
only for historical/manual-recovery review. They are not routine deploy authority.

| pnpm script | Shell |
| --- | --- |
| `deploy:k3s:build` | retired fail-closed command |
| `deploy:k3s:prod` | retired fail-closed command |
| `deploy:k3s:dev` | `deploy/scripts/k3s-deploy-dev.sh` |
| `deploy:k3s:both` | retired fail-closed command |
| `deploy:k3s:smoke` | `deploy/scripts/smoke-prod-dev.sh` |
| `deploy:k3s:status` | `deploy/scripts/k3s-status.sh` |
| `deploy:k3s:status:topology` | Strictly parse ignored topology as data, then run production-only read status |
| `deploy:k3s:validate-topology` | Validate ignored topology without remote access |
| `deploy:k3s:test-parity` | `deploy/scripts/test-k3s-parity.sh` |
| `deploy:k3s:test-evidence` | Topology-parser and deterministic live-state helper tests |
| `deploy:k3s:dev:teardown` | `deploy/scripts/k3s-dev-teardown.sh` |

Private topology and an intentional dirty-tree override:

```bash
cp deploy/topology.env.example deploy/topology.env
# replace every example with the restricted operator values, then validate
# without executing the file as shell code:
pnpm deploy:k3s:validate-topology
# Read-only status is separately explicit and performs no deploy:
umask 077
pnpm deploy:k3s:status:topology > /absolute/restricted/status.txt 2>&1
```

`run-status-with-topology.mjs` accepts exactly the tracked key set, validates
each value's data shape, rejects duplicates, unknowns, shell syntax, inline
comments, and control characters, and passes the resulting map directly to the
status subprocess through an absolute shell path and a minimal child
environment. Its direct topology summary lines are redacted, but underlying
SSH or Kubernetes diagnostics can contain private workload or endpoint
identifiers. The complete status transcript is therefore restricted evidence:
capture stdout and stderr together in an owner-only file and never run this
command in public CI or public logs. It cannot select a deployment command. A future deployment
still requires separate authority and a separately reviewed non-evaluating
loader; do not fall back to `source` or `eval` for automated execution.
The fixed status path uses `sudo -n k3s kubectl` and `sudo -n k3s ctr` only for
its Kubernetes and containerd reads, and fails closed when that non-interactive
read access is unavailable; this does not grant or exercise mutation authority.
It performs no mesh runtime or reachability check. The shared topology file
still validates the full dual-lane schema, including syntactically valid mesh
fields, so configuration-schema drift fails closed. The optional mesh
deployment/runtime remains covered by `deploy:k3s:status` and
`deploy:k3s:smoke`; its runtime absence does not block the narrow production
serving-path gate.
An operator may validate an already-custodied file in place with
`node deploy/scripts/run-status-with-topology.mjs --validate-only --topology-file /absolute/private/path`;
the file must be a regular, non-symlink file owned by the current user with no
group or world permissions.

Phase 0 live-state evidence uses
`deploy/scripts/witnessops_live_state_aggregate_v1.py`. The helper has no root
override: it reads only the three admitted `/srv/witnessops-web` state roots,
opens every root/descendant component without following symlinks, rejects
non-regular objects, applies file/directory/depth/byte limits, and validates
strict JSON/JSONL without emitting record contents or paths. It revalidates
file and directory metadata after collection to reject observed drift; this is
not a filesystem snapshot and does not claim atomic consistency against a
privileged actor able to restore metadata. Output is limited to the canonical
root label, counts, timestamps, path-bound SHA-256, and invalid-record count. Run its unit
tests with `pnpm deploy:k3s:test-state-aggregate`. Execution against production
is read-only but still requires an explicitly authorized evidence lane.

Preferred rollback sends the recorded known-good ECR digest through the same
protected production environment and SSM document, with the exact current
digest supplied as the compare-and-swap precondition. Rollout status alone does
not prove the runtime contract.

Authority: `docs/DEPLOYMENT_AUTHORITY.md`, custody: `docs/DEPLOYMENT_CUSTODY.md`,
agent contract: root `AGENTS.md`.

AWS deployment-automation source and boundary: [`aws/README.md`](./aws/README.md).

Legacy Compose/GHCR: `scripts/deploy.sh` + `INSTALL.md` (historical only).

GitHub release CI publishes and signs an artifact only. It performs no
production deployment; see `docs/DEPLOYMENT_AUTHORITY.md`.
