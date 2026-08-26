#!/usr/bin/env bash
# Read-only status and smoke for the accepted Frankfurt production serving path.
set -euo pipefail
# shellcheck source=k3s-lib.sh
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/k3s-lib.sh"

preflight_prod_target_identity

remote "sudo -n k3s kubectl -n '${DEPLOY_NS}' get deploy '${PROD_DEPLOY}' -o custom-columns=NAME:.metadata.name,IMAGE:.spec.template.spec.containers[0].image,READY:.status.readyReplicas"
echo "---"
log "public production URL configured"
log "private SSH target configured"

assert_remote_deployment_envfrom "${PROD_DEPLOY}"
assert_remote_no_admin_oidc_env_shadows "${PROD_DEPLOY}"

prod_image="$(remote "sudo -n k3s kubectl -n '${DEPLOY_NS}' get deploy '${PROD_DEPLOY}' -o jsonpath='{.spec.template.spec.containers[0].image}'")"
validate_digest_container_image_ref "${prod_image}" \
  || die "production image reference is not digest-qualified"
config_digest="$(remote_image_config_digest "${prod_image}")" \
  || die "production image digest is unavailable or inconsistent"
assert_remote_running_image_identity \
  "${PROD_DEPLOY}" "${prod_image}" "${config_digest}"

need curl
prod_code="$(curl -q --noproxy '*' -sS -o /dev/null -w '%{http_code}' --max-time 15 "${PROD_URL}/" || echo 000)"
[[ "${prod_code}" == "200" ]] || die "production smoke failed (${prod_code})"
log "production-only status OK (target identity, runtime contract, immutable image identity, readiness, and HTTP 200)"
