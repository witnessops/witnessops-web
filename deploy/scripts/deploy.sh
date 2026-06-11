#!/usr/bin/env bash
#
# deploy.sh - versioned, verified deploy of witnessops-web to the current host.
#
# Run this ON the target host (edge02), from the deploy/ directory of a checkout
# of this repo. It pulls a released image by version tag, verifies its cosign
# signature, resolves it to an immutable digest, swaps the running container via
# docker compose, smoke-tests the public routes, and records the previous digest
# so `rollback` can restore it.
#
# Usage:
#   ./deploy.sh vX.Y.Z        Deploy a specific released version.
#   ./deploy.sh stable        Deploy whatever currently carries the :stable tag.
#   ./deploy.sh rollback      Restore the previously deployed digest.
#   ./deploy.sh status        Show the running image digest and recorded previous.
#
# Requires: docker, docker compose, cosign, curl on the host.

set -euo pipefail

IMAGE_NAME="ghcr.io/witnessops/witnessops-web"
OIDC_ISSUER="https://token.actions.githubusercontent.com"
# Trust images signed by either the release or the build-image workflow on main/tags.
IDENTITY_REGEXP="^https://github.com/witnessops/witnessops-web/.github/workflows/(release|build-image)\\.yml@refs/(heads|tags)/.+$"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEPLOY_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${DEPLOY_DIR}/docker-compose.yml"
STATE_DIR="${DEPLOY_DIR}/.state"
PREVIOUS_FILE="${STATE_DIR}/previous-image"
CURRENT_FILE="${STATE_DIR}/current-image"

log() { printf '\033[1;34m[deploy]\033[0m %s\n' "$*"; }
err() { printf '\033[1;31m[deploy:error]\033[0m %s\n' "$*" >&2; }
die() { err "$*"; exit 1; }

need() { command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"; }

running_digest() {
  docker inspect witnessops-web --format '{{index .Config.Image}}' 2>/dev/null || true
}

compose() {
  WITNESSOPS_WEB_IMAGE="$1" docker compose -f "${COMPOSE_FILE}" "${@:2}"
}

verify_signature() {
  local ref="$1"
  log "verifying cosign signature for ${ref}"
  cosign verify \
    --certificate-oidc-issuer "${OIDC_ISSUER}" \
    --certificate-identity-regexp "${IDENTITY_REGEXP}" \
    "${ref}" >/dev/null \
    || die "cosign verification FAILED for ${ref} — refusing to deploy"
  log "signature OK"
}

resolve_digest() {
  # Pull the tag, then resolve to an immutable name@sha256 ref.
  local tag_ref="$1"
  log "pulling ${tag_ref}"
  docker pull "${tag_ref}" >/dev/null || die "docker pull failed for ${tag_ref}"
  docker inspect "${tag_ref}" --format '{{index .RepoDigests 0}}' 2>/dev/null \
    || die "could not resolve digest for ${tag_ref}"
}

smoke() {
  log "smoke-testing public routes on 127.0.0.1:3000"
  local ok=1
  for path in / /review /verify; do
    local code
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "http://127.0.0.1:3000${path}" || echo 000)"
    if [[ "${code}" =~ ^(200|302|303)$ ]]; then
      log "  ${path} -> ${code} OK"
    else
      err "  ${path} -> ${code} UNEXPECTED"
      ok=0
    fi
  done
  [[ "${ok}" -eq 1 ]] || return 1
}

do_deploy() {
  local version="$1"
  local tag_ref="${IMAGE_NAME}:${version}"

  verify_signature "${tag_ref}"
  local new_digest
  new_digest="$(resolve_digest "${tag_ref}")"
  log "resolved ${version} -> ${new_digest}"

  mkdir -p "${STATE_DIR}"
  local current
  current="$(running_digest)"
  if [[ -n "${current}" && "${current}" == *@sha256:* ]]; then
    printf '%s\n' "${current}" > "${PREVIOUS_FILE}"
    log "recorded rollback target: ${current}"
  else
    log "no prior digest-pinned container found; rollback target unchanged"
  fi

  log "starting witnessops-web at ${new_digest}"
  compose "${new_digest}" up -d --remove-orphans

  if smoke; then
    printf '%s\n' "${new_digest}" > "${CURRENT_FILE}"
    log "DEPLOY OK: witnessops-web now serving ${version} (${new_digest})"
  else
    err "smoke test FAILED after deploy"
    if [[ -f "${PREVIOUS_FILE}" ]]; then
      err "auto-rolling back to previous digest"
      do_rollback
    fi
    die "deploy aborted; see logs: docker logs witnessops-web"
  fi
}

do_rollback() {
  [[ -f "${PREVIOUS_FILE}" ]] || die "no recorded previous image to roll back to"
  local prev
  prev="$(cat "${PREVIOUS_FILE}")"
  [[ -n "${prev}" ]] || die "recorded previous image is empty"
  log "rolling back to ${prev}"
  docker pull "${prev}" >/dev/null 2>&1 || log "(previous image assumed present locally)"
  compose "${prev}" up -d --remove-orphans
  smoke || err "smoke test failed after rollback — manual intervention required"
  printf '%s\n' "${prev}" > "${CURRENT_FILE}"
  log "ROLLBACK complete: witnessops-web now serving ${prev}"
}

do_status() {
  log "running image:  $(running_digest || echo '<none>')"
  log "recorded current: $( [[ -f "${CURRENT_FILE}" ]] && cat "${CURRENT_FILE}" || echo '<none>')"
  log "recorded previous (rollback target): $( [[ -f "${PREVIOUS_FILE}" ]] && cat "${PREVIOUS_FILE}" || echo '<none>')"
}

main() {
  need docker; need cosign; need curl
  docker compose version >/dev/null 2>&1 || die "docker compose plugin not available"
  [[ -f "${COMPOSE_FILE}" ]] || die "compose file not found: ${COMPOSE_FILE}"

  local cmd="${1:-}"
  case "${cmd}" in
    rollback) do_rollback ;;
    status)   do_status ;;
    "")       die "usage: $0 <vX.Y.Z|stable|rollback|status>" ;;
    *)        do_deploy "${cmd}" ;;
  esac
}

main "$@"
