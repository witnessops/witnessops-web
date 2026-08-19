#!/usr/bin/env bash
# Apply witnessops-web to k3s. Requires a digest-qualified image and its
# manifest-bound runtime config digest.
set -euo pipefail

DEPLOY_DIR="$(cd "$(dirname "$0")" && pwd)"
SCRIPT_DIR="$(cd "${DEPLOY_DIR}/../scripts" && pwd)"
ENV_FILE="${WITNESSOPS_WEB_ENV_FILE:?set WITNESSOPS_WEB_ENV_FILE to the private runtime env file}"
IMAGE="${WITNESSOPS_WEB_IMAGE:?set WITNESSOPS_WEB_IMAGE to a container image ref}"
CONFIG_DIGEST="${WITNESSOPS_WEB_CONFIG_DIGEST:?set WITNESSOPS_WEB_CONFIG_DIGEST to the manifest-bound config digest}"
: "${DEPLOY_NS:?set DEPLOY_NS from private topology custody}"
: "${PROD_DEPLOY:?set PROD_DEPLOY from private topology custody}"
: "${PROD_SERVICE:?set PROD_SERVICE from private topology custody}"
: "${APP_CONTAINER_NAME:?set APP_CONTAINER_NAME from private topology custody}"
: "${BASE_ENV_SECRET:?set BASE_ENV_SECRET from private topology custody}"
: "${ADMIN_OIDC_SECRET:?set ADMIN_OIDC_SECRET from private topology custody}"
: "${INTAKE_STORE_PVC:?set INTAKE_STORE_PVC from private topology custody}"
: "${INTAKE_EVENTS_PVC:?set INTAKE_EVENTS_PVC from private topology custody}"
: "${MAIL_OUT_PVC:?set MAIL_OUT_PVC from private topology custody}"

# shellcheck source=../scripts/k3s-parity.sh
source "${SCRIPT_DIR}/k3s-parity.sh"

need() { command -v "$1" >/dev/null 2>&1 || { echo "apply-k8s: missing $1" >&2; exit 1; }; }
need kubectl
need node

[[ -f "${ENV_FILE}" ]] || { echo "apply-k8s: env file not found: ${ENV_FILE}" >&2; exit 1; }
validate_digest_container_image_ref "${IMAGE}" || {
  echo "apply-k8s: image ref must be digest-qualified" >&2
  exit 1
}
validate_sha256_digest "${CONFIG_DIGEST}" || {
  echo "apply-k8s: invalid manifest-bound config digest" >&2
  exit 1
}
for topology_name in \
  "${DEPLOY_NS}" "${PROD_DEPLOY}" "${PROD_SERVICE}" \
  "${APP_CONTAINER_NAME}" "${BASE_ENV_SECRET}" "${ADMIN_OIDC_SECRET}" \
  "${INTAKE_STORE_PVC}" "${INTAKE_EVENTS_PVC}" "${MAIL_OUT_PVC}"; do
  validate_kubernetes_name "${topology_name}" || {
    echo "apply-k8s: invalid private Kubernetes topology" >&2
    exit 1
  }
done

# Read only OIDC Secret data key names before the first cluster mutation. The
# base environment Secret is created below from ENV_FILE; the separately
# custodied OIDC Secret is never created or updated by this helper. Secret
# values are never decoded, emitted, or logged by this preflight.
# $key is evaluated by kubectl's Go template.
# shellcheck disable=SC2016
oidc_key_names="$(kubectl get secret "${ADMIN_OIDC_SECRET}" \
  --namespace "${DEPLOY_NS}" \
  -o go-template='{{range $key, $_ := .data}}{{printf "%s\n" $key}}{{end}}')" || {
  echo "apply-k8s: required identity Secret is unavailable" >&2
  exit 1
}
validate_admin_oidc_key_names "${oidc_key_names}" || {
  echo "apply-k8s: admin OIDC secret preflight failed (key names only)" >&2
  exit 1
}
role_encoded="$(kubectl get secret "${ADMIN_OIDC_SECRET}" \
  --namespace "${DEPLOY_NS}" \
  -o jsonpath='{.data.WITNESSOPS_ADMIN_ROLE}')" || {
  echo "apply-k8s: admin role preflight could not read its custodied value" >&2
  exit 1
}
role_value="$(node -e 'process.stdout.write(Buffer.from(process.argv[1] || "", "base64").toString("utf8"))' "${role_encoded}")"
validate_admin_role_value "${role_value}" || {
  echo "apply-k8s: admin role preflight failed" >&2
  exit 1
}

rendered_dir="$(mktemp -d "${TMPDIR:-/tmp}/witnessops-k8s-render.XXXXXX")"
trap 'rm -rf "${rendered_dir}"' EXIT
render() {
  node "${SCRIPT_DIR}/render-topology-template.mjs" \
    "${DEPLOY_DIR}/$1" "${rendered_dir}/$1" \
    DEPLOY_NS PROD_DEPLOY PROD_SERVICE APP_CONTAINER_NAME BASE_ENV_SECRET \
    ADMIN_OIDC_SECRET INTAKE_STORE_PVC INTAKE_EVENTS_PVC MAIL_OUT_PVC \
    IMAGE_PLACEHOLDER
}

IMAGE_PLACEHOLDER="${IMAGE}" render namespace.yaml
IMAGE_PLACEHOLDER="${IMAGE}" render pvc.yaml
IMAGE_PLACEHOLDER="${IMAGE}" render deployment.yaml
IMAGE_PLACEHOLDER="${IMAGE}" render service.yaml

# Validate the complete rendered object set before the first cluster mutation.
kubectl apply --dry-run=server \
  -f "${rendered_dir}/namespace.yaml" \
  -f "${rendered_dir}/pvc.yaml" \
  -f "${rendered_dir}/deployment.yaml" \
  -f "${rendered_dir}/service.yaml" >/dev/null

kubectl apply -f "${rendered_dir}/namespace.yaml"
kubectl create secret generic "${BASE_ENV_SECRET}" \
  --namespace "${DEPLOY_NS}" \
  --from-env-file="${ENV_FILE}" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl apply -f "${rendered_dir}/pvc.yaml"
kubectl apply -f "${rendered_dir}/deployment.yaml"
kubectl apply -f "${rendered_dir}/service.yaml"

kubectl rollout status "deployment/${PROD_DEPLOY}" -n "${DEPLOY_NS}" --timeout=120s

deployed_image="$(kubectl -n "${DEPLOY_NS}" get deploy "${PROD_DEPLOY}" \
  -o jsonpath='{.spec.template.spec.containers[0].image}')" || {
  echo "apply-k8s: could not inspect deployed image" >&2
  exit 1
}
compare_image_refs "${IMAGE}" "${deployed_image}" || {
  echo "apply-k8s: deployed image does not match the requested manifest" >&2
  exit 1
}

replica_state="$(kubectl -n "${DEPLOY_NS}" get deploy "${PROD_DEPLOY}" \
  -o jsonpath='{.spec.replicas}{"|"}{.status.readyReplicas}')" || {
  echo "apply-k8s: could not inspect deployment readiness" >&2
  exit 1
}
desired_replicas="${replica_state%%|*}"
ready_replicas="${replica_state#*|}"
if [[ ! "${desired_replicas}" =~ ^[1-9][0-9]*$ \
  || "${ready_replicas}" != "${desired_replicas}" ]]; then
  echo "apply-k8s: deployment is not fully ready (${ready_replicas:-0}/${desired_replicas:-0})" >&2
  exit 1
fi

running_records="$(kubectl -n "${DEPLOY_NS}" get pods -l "app=${PROD_DEPLOY}" \
  -o go-template='{{range .items}}{{if eq .status.phase "Running"}}{{range .status.containerStatuses}}{{if eq .name "'"${APP_CONTAINER_NAME}"'"}}{{printf "%t|%s|%s\n" .ready .image .imageID}}{{end}}{{end}}{{end}}{{end}}')" || {
  echo "apply-k8s: could not inspect running image identity" >&2
  exit 1
}
compare_running_image_records \
  "${IMAGE}" "${CONFIG_DIGEST}" "${desired_replicas}" "${running_records}" || {
  echo "apply-k8s: running image identity does not match the requested manifest" >&2
  exit 1
}

echo "apply-k8s: smoke http://127.0.0.1:3000/"
curl -sf -o /dev/null -w 'HTTP %{http_code}\n' http://127.0.0.1:3000/ || {
  echo "apply-k8s: smoke failed — inspect the configured production deployment" >&2
  exit 1
}
echo "apply-k8s: OK"
