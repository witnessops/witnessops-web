# Deployment authority

Status: `ops_dev_01_caddy_k3s_current`
Last updated: 2026-07-09

This document classifies deployment-related repository surfaces for
`witnessops-web`. It is repo-local guidance and is not deploy approval, release
approval, production verification, cloud inventory, rollback approval, or server
administration authority.

## Current production authority

Current public runtime path for `witnessops.com` and `www.witnessops.com`:

```text
DNS A 194.147.221.89
-> ops-dev-01
-> systemd caddy.service
-> /etc/caddy/Caddyfile
-> reverse_proxy 127.0.0.1:3000
-> k3s namespace witnessops
-> deployment witnessops-web
```

The current deployment custody map lives in
[`DEPLOYMENT_CUSTODY.md`](./DEPLOYMENT_CUSTODY.md).

The current deploy helper is:

```text
/home/mob7a0efe/DEV/mesh-agent/k8s/deploy-witnessops-web.sh
```

Use it only from an explicit apply/deploy lane targeting the
`witnessops-web` deployment in namespace `witnessops`.

## Authority split

Public web content authority:

- web app source
- package scripts
- catalog/source content
- route parity and buyer-path verification

Deploy authority:

- timestamped image build with image ID captured
- deploy helper targeting only k3s `witnessops-web`
- rollout status and public route sweep
- rollback image or `kubectl rollout undo` captured in the receipt

DNS/Cloudflare authority:

- separate lane only
- no DNS write, Cloudflare write, record cleanup, TTL change, or proxy change in
  normal web deploy lanes

Caddy authority:

- separate lane only unless a web apply lane explicitly authorizes a narrow
  public-route gate adjustment
- no broad Caddy rewrites or reloads as part of routine content deploys

App/API exposure authority:

- separate lane only
- a public web deploy does not expose or launch unfinished APIs, admin panels,
  private mesh routes, or customer evidence intake

OffSec/product surface authority:

- separate lane only
- a public web deploy does not imply SaaS/app/offsec readiness

## Retired Azure lane: hard boundary

The Azure Container Apps material is retired and archived at:

```text
docs/archive/azure-aca-retired-20260508/
```

That archive is historical reference only. Do not run `az`, `azd`, or Bicep
from this repo unless an explicit Azure reopening lane authorizes it.

## Review boundary

Changes to this deployment authority classification should remain separate from
public copy, verifier semantics, receipt semantics, and release tagging.

Any future lane that reactivates goal0/Docker Compose, GHCR release deployment,
Azure, or another active host must name validation commands, DNS state, image
custody, and rollback.

## Historical goal0 / Docker Compose lane

Older docs describe **goal0-edge-01** (`167.235.12.232`) as a unified public
host using Caddy and Docker Compose. That path existed as an intended or
historical deployment lane, but it is not the current production authority for
`witnessops.com`.

Keep those notes as history unless a future lane explicitly reactivates them.
Do not use `deploy/docker-compose.yml`, `deploy/scripts/deploy.sh`, or the old
goal0 Caddy snippets as live authority without a fresh authority lane.
