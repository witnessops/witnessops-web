#!/usr/bin/env bash
# Read-only, pre-DNS acceptance for a provisioned AWS Lightsail candidate.
#
# This script never deploys, changes DNS, writes Kubernetes resources, rotates
# Secrets, or activates receipt-signing trust. It deliberately probes the
# candidate over its explicit SSH target and loopback/private binds so the old
# public apex cannot be mistaken for the candidate.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

: "${AWS_CANDIDATE_SSH:?set the explicit AWS candidate SSH target}"
: "${AWS_CANDIDATE_INSTANCE_ID:?set the expected Lightsail instance id}"
: "${AWS_CANDIDATE_AVAILABILITY_ZONE:?set the expected eu-central-1 availability zone}"
: "${AWS_CANDIDATE_STATIC_IPV4:?set the expected attached static IPv4}"
: "${EXPECTED_IMAGE_REF:?set the digest-qualified candidate image reference}"
: "${EXPECTED_CONFIG_DIGEST:?set the manifest-bound candidate config digest}"

[[ "${AWS_CANDIDATE_INSTANCE_ID}" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{0,254}$ ]] || {
  echo "candidate-acceptance: invalid AWS candidate instance id" >&2
  exit 1
}
[[ "${AWS_CANDIDATE_AVAILABILITY_ZONE}" =~ ^eu-central-1[a-z]$ ]] || {
  echo "candidate-acceptance: availability zone must be in eu-central-1" >&2
  exit 1
}
[[ "${AWS_CANDIDATE_STATIC_IPV4}" =~ ^[0-9]{1,3}(\.[0-9]{1,3}){3}$ ]] || {
  echo "candidate-acceptance: invalid candidate static IPv4 shape" >&2
  exit 1
}

# Reuse the current topology and pure runtime-contract helpers, but force their
# SSH seam to the explicitly named AWS candidate. No public endpoint is used.
export DEPLOY_SSH="${AWS_CANDIDATE_SSH}"
# shellcheck source=../scripts/k3s-lib.sh
source "${REPO_ROOT}/deploy/scripts/k3s-lib.sh"

MIN_FREE_GB="${MIN_FREE_GB:-20}"
[[ "${MIN_FREE_GB}" =~ ^[0-9]+$ ]] && (( MIN_FREE_GB >= 1 && MIN_FREE_GB <= 10000 )) || {
  die "MIN_FREE_GB must be between 1 and 10000"
}
validate_digest_container_image_ref "${EXPECTED_IMAGE_REF}" \
  || die "EXPECTED_IMAGE_REF must be digest-qualified"
validate_sha256_digest "${EXPECTED_CONFIG_DIGEST}" \
  || die "EXPECTED_CONFIG_DIGEST must be a lowercase sha256 digest"
need node
need pnpm
need ssh

log "checking explicit AWS candidate identity without changing it"
remote "set -euo pipefail
  token=\$(curl --silent --show-error --fail --max-time 5 \
    --request PUT \
    --header 'X-aws-ec2-metadata-token-ttl-seconds: 60' \
    http://169.254.169.254/latest/api/token)
  instance_id=\$(curl --silent --show-error --fail --max-time 5 \
    --header \"X-aws-ec2-metadata-token: \${token}\" \
    http://169.254.169.254/latest/meta-data/instance-id)
  availability_zone=\$(curl --silent --show-error --fail --max-time 5 \
    --header \"X-aws-ec2-metadata-token: \${token}\" \
    http://169.254.169.254/latest/meta-data/placement/availability-zone)
  public_ipv4=\$(curl --silent --show-error --fail --max-time 5 \
    --header \"X-aws-ec2-metadata-token: \${token}\" \
    http://169.254.169.254/latest/meta-data/public-ipv4)
  [[ \"\${instance_id}\" == '${AWS_CANDIDATE_INSTANCE_ID}' ]]
  [[ \"\${availability_zone}\" == '${AWS_CANDIDATE_AVAILABILITY_ZONE}' ]]
  [[ \"\${public_ipv4}\" == '${AWS_CANDIDATE_STATIC_IPV4}' ]]
"
log "candidate instance metadata matches the operator-custodied target"

remote "systemctl is-active --quiet caddy && systemctl is-active --quiet k3s" \
  || die "candidate caddy or k3s service is not active"
remote "sudo -n caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null" \
  || die "candidate Caddy configuration did not validate"

loopback_binds="$(remote "ss -H -lnt 'sport = :3000' | awk '{print \\$4}'")"
grep -Fqx -- "127.0.0.1:3000" <<<"${loopback_binds}" \
  || die "candidate application is not bound on 127.0.0.1:3000"
if grep -Eq '(^|:)(0\.0\.0\.0|\[::\]|\*)[:.]?3000$' <<<"${loopback_binds}"; then
  die "candidate application port 3000 is publicly/wildcard bound"
fi

mesh_binds="$(remote "ss -H -lnt 'sport = :${MESH_BIND_PORT}' | awk '{print \\$4}'")"
grep -Fqx -- "${MESH_BIND_HOST}:${MESH_BIND_PORT}" <<<"${mesh_binds}" \
  || die "candidate mesh-dev bind does not match private topology custody"
if grep -Eq '(^|:)(0\.0\.0\.0|\[::\]|\*)' <<<"${mesh_binds}"; then
  die "candidate mesh-dev port is wildcard bound"
fi

# Preflight the existing two-Secret contract. Only key names and the bounded
# admin role are returned; credential values are never emitted.
preflight_remote_admin_secrets
assert_remote_deployment_envfrom "${PROD_DEPLOY}"
assert_remote_deployment_envfrom "${DEV_DEPLOY}"
assert_remote_no_admin_oidc_env_shadows "${PROD_DEPLOY}"
assert_remote_no_admin_oidc_env_shadows "${DEV_DEPLOY}"

secret_key_names() {
  local secret_name
  secret_name="$1"
  remote "kubectl -n '${DEPLOY_NS}' get secret '${secret_name}' -o go-template='{{range \\$key, \\$_ := .data}}{{printf \"%s\\n\" \\$key}}{{end}}'"
}

forbidden_runtime_keys=(
  AWS_ACCESS_KEY_ID
  AWS_SECRET_ACCESS_KEY
  AWS_SESSION_TOKEN
  ASK_RECEIPT_ROOT
  ASK_AUDIT_ROOT
  WITNESSOPS_RECEIPT_SIGNING_PRIVATE_KEY
  WITNESSOPS_PER_SIGNING_PRIVATE_KEY
  WITNESSOPS_PRODUCTION_KEY_REGISTRY
)

assert_forbidden_runtime_keys_absent() {
  local source_label key_names forbidden_key
  source_label="$1"
  key_names="$2"
  for forbidden_key in "${forbidden_runtime_keys[@]}"; do
    if grep -Fqx -- "${forbidden_key}" <<<"${key_names}"; then
      die "candidate ${source_label} contains out-of-scope key ${forbidden_key}"
    fi
  done
}

base_key_names="$(secret_key_names "${BASE_ENV_SECRET}")" \
  || die "could not inspect candidate base Secret key names"
for required_key in \
  WITNESSOPS_TOKEN_SIGNING_SECRET \
  WITNESSOPS_INTAKE_STORE_DIR \
  WITNESSOPS_ADMIN_CORE_STORE_DIR \
  WITNESSOPS_TOKEN_AUDIT_DIR; do
  grep -Fqx -- "${required_key}" <<<"${base_key_names}" \
    || die "candidate base Secret is missing required key ${required_key}"
done

oidc_key_names="$(secret_key_names "${ADMIN_OIDC_SECRET}")" \
  || die "could not inspect candidate admin OIDC Secret key names"
prod_explicit_key_names="$(deployment_explicit_env_key_names "${PROD_DEPLOY}")" \
  || die "could not inspect candidate prod explicit environment key names"
dev_explicit_key_names="$(deployment_explicit_env_key_names "${DEV_DEPLOY}")" \
  || die "could not inspect candidate mesh-dev explicit environment key names"

assert_forbidden_runtime_keys_absent "base Secret" "${base_key_names}"
assert_forbidden_runtime_keys_absent "admin OIDC Secret" "${oidc_key_names}"
assert_forbidden_runtime_keys_absent "prod explicit environment" "${prod_explicit_key_names}"
assert_forbidden_runtime_keys_absent "mesh-dev explicit environment" "${dev_explicit_key_names}"

# Compare storage path values inside the candidate shell. Values are neither
# returned nor logged. Optional legacy aliases may be absent, but if present
# they must resolve to the active mounts.
remote "set -euo pipefail
  read_secret_path() {
    key=\"\$1\"
    expected=\"\$2\"
    required=\"\$3\"
    encoded=\$(kubectl -n '${DEPLOY_NS}' get secret '${BASE_ENV_SECRET}' \
      -o \"jsonpath={.data.\${key}}\")
    if [[ -z \"\${encoded}\" ]]; then
      [[ \"\${required}\" == 0 ]]
      return
    fi
    value=\$(printf '%s' \"\${encoded}\" | base64 -d)
    [[ \"\${value}\" == \"\${expected}\" ]]
  }
  read_secret_path WITNESSOPS_INTAKE_STORE_DIR /data/intake-store 1
  read_secret_path WITNESSOPS_ADMIN_CORE_STORE_DIR /data/intake-store/admin-core 1
  read_secret_path WITNESSOPS_TOKEN_STORE_DIR /data/intake-store 0
  read_secret_path WITNESSOPS_TOKEN_AUDIT_DIR /data/intake-events 1
  read_secret_path WITNESSOPS_MAIL_OUTPUT_DIR /data/mail-out 0
" || die "candidate storage Secret paths do not match mounted /data paths"

images_out="$(lane_image_refs)" || die "could not inspect candidate lane images"
prod_image="$(printf '%s\n' "${images_out}" | sed -n '1p')"
dev_image="$(printf '%s\n' "${images_out}" | sed -n '2p')"
compare_image_refs "${EXPECTED_IMAGE_REF}" "${prod_image}" \
  || die "candidate prod image differs from expected immutable image"
compare_image_refs "${EXPECTED_IMAGE_REF}" "${dev_image}" \
  || die "candidate mesh-dev image differs from expected immutable image"
actual_config_digest="$(remote_image_config_digest "${EXPECTED_IMAGE_REF}")" \
  || die "candidate image config digest is unavailable"
[[ "${actual_config_digest}" == "${EXPECTED_CONFIG_DIGEST}" ]] \
  || die "candidate config digest differs from build evidence"
assert_remote_running_image_identity \
  "${PROD_DEPLOY}" "${EXPECTED_IMAGE_REF}" "${EXPECTED_CONFIG_DIGEST}"
assert_remote_running_image_identity \
  "${DEV_DEPLOY}" "${EXPECTED_IMAGE_REF}" "${EXPECTED_CONFIG_DIGEST}"

for pvc in "${INTAKE_STORE_PVC}" "${INTAKE_EVENTS_PVC}" "${MAIL_OUT_PVC}"; do
  pvc_phase="$(remote "kubectl -n '${DEPLOY_NS}' get pvc '${pvc}' -o jsonpath='{.status.phase}'")" \
    || die "could not inspect candidate PVC ${pvc}"
  [[ "${pvc_phase}" == "Bound" ]] || die "candidate PVC ${pvc} is not Bound"
done

remote "set -euo pipefail
  pod=\$(kubectl -n '${DEPLOY_NS}' get pods -l 'app=${PROD_DEPLOY}' \
    -o jsonpath='{.items[0].metadata.name}')
  [[ -n \"\${pod}\" ]]
  kubectl -n '${DEPLOY_NS}' exec \"\${pod}\" -c '${APP_CONTAINER_NAME}' -- \
    sh -eu -c 'for path in /data/intake-store /data/intake-events /data/mail-out; do test -d \"\$path\" -a -r \"\$path\" -a -w \"\$path\"; done'
" || die "candidate application cannot access one or more active mounts"

free_gb="$(remote "df -Pk / | awk 'NR == 2 {printf \"%d\", \\$4 / 1024 / 1024}'")"
[[ "${free_gb}" =~ ^[0-9]+$ && "${free_gb}" -ge "${MIN_FREE_GB}" ]] \
  || die "candidate system disk has less than ${MIN_FREE_GB} GiB free"
disk_pressure="$(remote "kubectl get node -o jsonpath='{.items[0].status.conditions[?(@.type==\"DiskPressure\")].status}'")"
[[ "${disk_pressure}" == "False" ]] || die "candidate node reports DiskPressure"

for route in \
  / \
  /verify \
  /review/request \
  /security \
  /support; do
  status="$(remote "curl --silent --show-error --output /dev/null --write-out '%{http_code}' --max-time 15 'http://127.0.0.1:3000${route}'")"
  [[ "${status}" == "200" ]] || die "candidate local route ${route} returned ${status:-000}"
done
mesh_status="$(remote "curl --silent --show-error --output /dev/null --write-out '%{http_code}' --max-time 15 '${MESH_DEV_URL}/support'")"
[[ "${mesh_status}" == "200" ]] || die "candidate mesh-dev support route returned ${mesh_status:-000}"

# Caddy and the app are tested locally with explicit Host headers and redirects
# disabled. Exact status/location assertions prevent a redirect to an old or
# unintended host from passing, without resolving or contacting public DNS.
probe_local_disposition() {
  local host url
  host="$1"
  url="$2"
  remote "curl --silent --show-error --output /dev/null \
    --write-out '%{http_code}|%{redirect_url}' \
    --max-time 15 --max-redirs 0 --header 'Host: ${host}' '${url}'"
}

assert_local_disposition() {
  local label host url expected actual
  label="$1"
  host="$2"
  url="$3"
  expected="$4"
  actual="$(probe_local_disposition "${host}" "${url}")" \
    || die "candidate ${label} disposition probe failed"
  [[ "${actual}" == "${expected}" ]] \
    || die "candidate ${label} disposition differs from the canonical host contract"
}

assert_local_disposition \
  "Caddy apex HTTP" \
  witnessops.com \
  http://127.0.0.1/review/request?source=aws-candidate \
  "308|https://witnessops.com/review/request?source=aws-candidate"
assert_local_disposition \
  "Caddy www HTTP" \
  www.witnessops.com \
  http://127.0.0.1/review/request?source=aws-candidate \
  "308|https://witnessops.com/review/request?source=aws-candidate"
assert_local_disposition \
  "Caddy legacy-docs HTTP" \
  docs.witnessops.com \
  http://127.0.0.1/aws-migration-doc-check?source=aws-candidate \
  "308|https://docs.witnessops.com/aws-migration-doc-check?source=aws-candidate"
assert_local_disposition \
  "app legacy-docs redirect" \
  docs.witnessops.com \
  http://127.0.0.1:3000/aws-migration-doc-check?source=aws-candidate \
  "308|https://witnessops.com/docs/aws-migration-doc-check?source=aws-candidate"

tmp_dir="$(mktemp -d "${TMPDIR:-/tmp}/witnessops-aws-candidate.XXXXXX")"
trap 'rm -rf -- "${tmp_dir}"' EXIT
valid_payload="${tmp_dir}/per-valid.json"
invalid_payload="${tmp_dir}/per-invalid.json"
signature_mutation_payload="${tmp_dir}/per-signature-mutation.json"

pnpm --silent exec tsx -e "import { makePublicExposureReviewReceipt } from './apps/witnessops-web/src/lib/public-exposure-review-verify-adapter.test-fixture.ts'; process.stdout.write(JSON.stringify({ receipt: makePublicExposureReviewReceipt() }));" \
  >"${valid_payload}"
pnpm --silent exec tsx -e "import { makePublicExposureReviewReceipt } from './apps/witnessops-web/src/lib/public-exposure-review-verify-adapter.test-fixture.ts'; const receipt = makePublicExposureReviewReceipt(); (receipt.claims as unknown[]).pop(); process.stdout.write(JSON.stringify({ receipt }));" \
  >"${invalid_payload}"
pnpm --silent exec tsx -e "import { makePublicExposureReviewReceipt } from './apps/witnessops-web/src/lib/public-exposure-review-verify-adapter.test-fixture.ts'; const receipt = makePublicExposureReviewReceipt(); (receipt.signature as Record<string, unknown>).signature = 'c' + 'b'.repeat(127); process.stdout.write(JSON.stringify({ receipt }));" \
  >"${signature_mutation_payload}"

post_candidate_verify() {
  remote "curl --silent --show-error --fail-with-body --max-time 15 \
    --header 'Content-Type: application/json' \
    --data-binary @- \
    http://127.0.0.1:3000/api/verify" <"$1"
}

assert_candidate_verdict() {
  local expected response
  expected="$1"
  response="$2"
  printf '%s' "${response}" | node -e '
    const fs = require("node:fs");
    const expected = process.argv[1];
    const payload = JSON.parse(fs.readFileSync(0, "utf8"));
    if (payload.ok !== true || payload.verdict !== expected) process.exit(1);
    if (expected === "indeterminate") {
      if (payload.scope !== "receipt-only" || payload.artifactRevalidation !== "not_performed") process.exit(1);
      const required = [
        "receipt_signature_cryptographic",
        "production_key_authorization",
        "request_record",
        "scope_authorization",
        "workflow_contract_complete",
        "manifest_hash",
        "artifact_hashes",
        "evidence_support",
      ];
      for (const name of required) {
        if (!payload.checks?.some((item) => item.name === name && item.status === "not_checked")) process.exit(1);
      }
    }
  ' "${expected}" || die "candidate /api/verify did not preserve ${expected} semantics"
}

valid_response="$(post_candidate_verify "${valid_payload}")"
assert_candidate_verdict indeterminate "${valid_response}"
invalid_response="$(post_candidate_verify "${invalid_payload}")"
assert_candidate_verdict invalid "${invalid_response}"
signature_mutation_response="$(post_candidate_verify "${signature_mutation_payload}")"
assert_candidate_verdict indeterminate "${signature_mutation_response}"

log "CANDIDATE_ACCEPTANCE_OK (read-only, pre-DNS, production signer trust unchanged)"
