#!/usr/bin/env bash
# Apply witnessops-web to k3s. Requires host env file and pinned image digest.
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="${WITNESSOPS_WEB_ENV_FILE:-/srv/witnessops/env/witnessops-web.env}"
IMAGE="${WITNESSOPS_WEB_IMAGE:?set WITNESSOPS_WEB_IMAGE to ghcr.io/...@sha256:...}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "apply-k8s: missing $1" >&2; exit 1; }; }
need kubectl

[[ -f "${ENV_FILE}" ]] || { echo "apply-k8s: env file not found: ${ENV_FILE}" >&2; exit 1; }

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