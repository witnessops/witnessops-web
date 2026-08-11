#!/usr/bin/env bash
# Apply witnessops-web to k3s. Requires host env file and a validated image ref.
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)"
SCRIPT_DIR="$(cd "${DEPLOY_DIR}/../scripts" && pwd)"
ENV_FILE="${WITNESSOPS_WEB_ENV_FILE:-/srv/witnessops/env/witnessops-web.env}"
IMAGE="${WITNESSOPS_WEB_IMAGE:?set WITNESSOPS_WEB_IMAGE to a container image ref}"

# shellcheck source=../scripts/k3s-parity.sh
source "${SCRIPT_DIR}/k3s-parity.sh"

need() { command -v "$1" >/dev/null 2>&1 || { echo "apply-k8s: missing $1" >&2; exit 1; }; }
need kubectl

[[ -f "${ENV_FILE}" ]] || { echo "apply-k8s: env file not found: ${ENV_FILE}" >&2; exit 1; }
validate_container_image_ref "${IMAGE}" || { echo "apply-k8s: invalid image ref" >&2; exit 1; }

# Read only OIDC Secret data key names before the first cluster mutation. The
# base environment Secret is created below from ENV_FILE; the separately
# custodied OIDC Secret is never created or updated by this helper. Secret
# values are never decoded, emitted, or logged by this preflight.
# $key is evaluated by kubectl's Go template.
# shellcheck disable=SC2016
oidc_key_names="$(kubectl get secret witnessops-web-admin-oidc \
  --namespace witnessops \
  -o go-template='{{range $key, $_ := .data}}{{printf "%s\n" $key}}{{end}}')" || {
  echo "apply-k8s: required secret unavailable: witnessops-web-admin-oidc" >&2
  exit 1
}
validate_admin_oidc_key_names "${oidc_key_names}" || {
  echo "apply-k8s: admin OIDC secret preflight failed (key names only)" >&2
  exit 1
}

kubectl apply -f "${DEPLOY_DIR}/namespace.yaml"
kubectl create secret generic witnessops-web-env \
  --namespace witnessops \
  --from-env-file="${ENV_FILE}" \
  --dry-run=client -o yaml | kubectl apply -f -

for manifest in pvc.yaml deployment.yaml service.yaml; do
  sed "s|witnessops-web:replace-me|${IMAGE}|g" "${DEPLOY_DIR}/${manifest}" | kubectl apply -f -
done

kubectl rollout status deployment/witnessops-web -n witnessops --timeout=120s
echo "apply-k8s: smoke http://127.0.0.1:3000/"
curl -sf -o /dev/null -w 'HTTP %{http_code}\n' http://127.0.0.1:3000/ || {
  echo "apply-k8s: smoke failed — kubectl logs -n witnessops deploy/witnessops-web" >&2
  exit 1
}
echo "apply-k8s: OK"
