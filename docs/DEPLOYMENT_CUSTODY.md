# WitnessOps Web Deployment Custody

Status: current production custody note for `witnessops.com`
Last updated: 2026-07-09

This document records how the public WitnessOps web surface is currently served,
built, deployed, verified, and rolled back. It is documentation, not deploy
approval. Any production change still needs an explicit apply lane.

## Current Live Path

Observed public path:

```text
witnessops.com / www.witnessops.com
-> DNS A 194.147.221.89
-> ops-dev-01
-> systemd caddy.service
-> /etc/caddy/Caddyfile
-> reverse_proxy 127.0.0.1:3000
-> k3s namespace witnessops
-> deployment witnessops-web
-> pod witnessops-web-6485748f9-qzsv5
-> docker.io/library/witnessops-web:customer-message-polish-20260709T092553Z
-> sha256:272acd8a77e49a4d23cd42b347ddf8e1e8d71bd975a1ea978865e845bd655f54
```

The pod name and image tag are observations from the custody reconciliation
lane. Treat them as evidence for that point in time, not permanent names.

## Source

Current source custody:

- Repo: `witnessops-web`
- Path: `/home/mob7a0efe/DEV/OffSec/working/sources/witnessops-web`
- Branch: `main`
- Public remote: `https://github.com/witnessops/witnessops-web.git`

The working tree may contain multiple active lanes. Every apply lane must record
the starting HEAD and dirty state before editing.

## Build

Production-quality builds must use Node 22. If the fleet VM's local Node
version is insufficient, use the approved Node 22 container path instead of
upgrading the host runtime as part of a web lane.

Current build guidance:

- Use the repo's Node 22 health/build commands when possible.
- Use `deploy/Dockerfile.mesh` for the mesh image build path.
- `goal0` may be used as build or transfer staging when a lane explicitly says
  so, but the current runtime authority for `witnessops.com` is not goal0
  Docker Compose.

## Image

Builds for public web apply lanes should use an unambiguous timestamped tag:

```text
docker.io/library/witnessops-web:<purpose>-<UTC>
```

The apply receipt must capture:

- source HEAD
- dirty state before and after
- image tag
- image ID
- previous image tag or digest
- build command and result

Do not rely on a mutable tag alone as rollback evidence.

## Transfer And Deploy

Current deploy helper:

```text
/home/mob7a0efe/DEV/mesh-agent/k8s/deploy-witnessops-web.sh
```

The helper is the current execution path for deploying only the Kubernetes
deployment named `witnessops-web` in namespace `witnessops`. Use it only from an
explicit deploy/apply lane.

The live runtime target is:

```text
ops-dev-01 k3s namespace witnessops deployment witnessops-web
```

## Edge

The public edge for apex and `www` is Caddy on `ops-dev-01`.

Current edge mapping:

```text
witnessops.com, www.witnessops.com -> reverse_proxy 127.0.0.1:3000
```

Caddy changes require their own lane unless a web apply lane explicitly
authorizes a narrow, named public-route gate adjustment. A web content deploy
does not authorize Caddy reloads or broad proxy edits.

## DNS

Cloudflare/DNS is separate authority and must not be changed by web deploy
lanes. DNS record creation, deletion, proxy changes, TTL changes, and cleanup
belong in separate DNS authority lanes.

## Product Boundary

The public website deploy path does not mean SaaS, app, API, or OffSec product
surfaces are launched. There is no SaaS/app/offsec readiness implied by a
successful `witnessops-web` deploy.

App signup, API exposure, OffSec portal readiness, private mesh routes, and
customer evidence intake each require separate authority.

## Verification

A public web apply lane should pass all of the following before being called
complete:

- route sweep for `/`, `/catalog`, `/review/request`, `/why`,
  `/why-witnessops`, `/docs`, `/verify`, `/library`, `/support`, `/privacy`,
  `/terms`, and `/security`
- public `HEAD /review/request` check
- forbidden href/src/action scan against buyer pages
- cache-busted apex and `www` observer checks for changed public copy
- explicit note that raw fixture text on `/verify` is not treated as a buyer
  link/action target

Forbidden buyer targets include localhost, private IP URLs, app signup routes,
staging hosts, admin hosts, private console URLs, and unfinished external
product portals.

## Receipts

Every public web apply receipt must record:

- lane name and authority class
- host identity
- repo path
- start HEAD and end HEAD
- dirty state before and after
- files changed
- build commands and results
- image tag and image ID
- previous image or digest
- deployment command and rollout result
- public route sweep
- forbidden href/src/action scan
- public observer/cache-busted result when copy or routing changed
- rollback path
- DNS mutation statement
- Caddy mutation statement
- API/app/offsec exposure statement

## Rollback

Preferred rollback:

```bash
kubectl -n witnessops rollout undo deployment/witnessops-web
```

Alternative rollback is to restore the previously recorded image tag or digest
through an explicit deploy lane. If Caddy was changed in the same authorized
lane, preserve and restore the prior Caddy config through that lane's rollback
plan.

Rollback triggers include route failures, buyer CTA regressions, failed rollout,
unexpected API/app/offsec exposure, or private/localhost targets returning to
the buyer path.

## Historical Notes

Older documentation describes goal0, Docker Compose, GHCR release images, and
Servury/edge02 migration paths. Those paths are historical or legacy unless a
future lane explicitly reactivates them. Do not delete those records merely
because the current runtime path is k3s; keep the history but do not treat it as
current production authority.
