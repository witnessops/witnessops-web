#!/usr/bin/env bash
# Real disposable Matrix homeserver and Element Web for Academy widget acceptance.
# Deliberately CI-only; never points at operational Community or learner records.
set +x
set -euo pipefail
umask 077
: "${GITHUB_ACTIONS:?GitHub ephemeral CI runner required}"
: "${RUNNER_TEMP:?Runner scratch path required}"
: "${ACADEMY_CI_ENV:?Pinned disposable Academy fixture required}"
: "${ACADEMY_CI_SECRET_DIR:?Secret directory required}"
: "${ACADEMY_TEST_RESTART_APP_CMD:?Existing disposable restart script required}"
: "${ACADEMY_DB_NAME:?Disposable database required}"
[[ "${ACADEMY_E2E:-}" == 1 && "${ACADEMY_CHAT_DISPOSABLE:-}" == 1 && "${ACADEMY_ACCESS_POLICY:-}" == session-only ]] || { echo 'incorrect disposable fixture'; exit 1; }
[[ "${ACADEMY_PUBLIC_ORIGIN:-}" == http://127.0.0.1:18300 ]] || { echo 'refusing non-fixture academy origin'; exit 1; }
[[ "${MCP_RESOURCE_URL:-}" == http://127.0.0.1:18500/mcp ]] || { echo 'refusing non-fixture MCP resource'; exit 1; }
[[ "${ACADEMY_DB_HOST:-}" == 127.0.0.1 ]] || { echo 'refusing external database'; exit 1; }
for addr in 127.0.0.1:18008 127.0.0.1:18444; do
  if timeout 1 bash -c "</dev/tcp/${addr/:/\/}" 2>/dev/null; then echo "disposable port is already in use"; exit 1; fi
done
LAB="$RUNNER_TEMP/academy-element-widget"
mkdir -p "$LAB/synapse" "$ACADEMY_CI_SECRET_DIR"
chmod 700 "$LAB" "$LAB/synapse" "$ACADEMY_CI_SECRET_DIR"
SYNAPSE_CONTAINER="academy-element-synapse-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}"
ELEMENT_CONTAINER="academy-element-web-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}"
SYNAPSE_IMAGE='docker.io/matrixdotorg/synapse:v1.165.0'
ELEMENT_IMAGE='docker.io/vectorim/element-web:v1.12.35'
ORIGIN_ADDED=0
cleanup() {
  status=$?
  trap - EXIT
  docker rm -f "$ELEMENT_CONTAINER" "$SYNAPSE_CONTAINER" >/dev/null 2>&1 || true
  if [[ "$ORIGIN_ADDED" == 1 && -f "$ACADEMY_CI_ENV" ]]; then
    python3 - "$ACADEMY_CI_ENV" <<'PY'
import pathlib,sys
p=pathlib.Path(sys.argv[1]); lines=p.read_text().splitlines()
p.write_text('\n'.join(x for x in lines if not x.startswith('ACADEMY_MATRIX_WIDGET_ORIGINS='))+'\n')
p.chmod(0o600)
PY
    unset ACADEMY_MATRIX_WIDGET_ORIGINS
    bash "$ACADEMY_TEST_RESTART_APP_CMD" "$ACADEMY_DB_NAME" >/dev/null 2>&1 || true
  fi
  echo "DISPOSABLE ELEMENT CLEANUP: containers removed; origin allowlist reverted (status $status)"
  exit "$status"
}
trap cleanup EXIT

# These are synthetic credentials. Their bytes remain on the CI runner and are
# already covered by the existing secret/JWT evidence scanner.
openssl rand -hex 24 > "$ACADEMY_CI_SECRET_DIR/matrix_registration_secret"
openssl rand -hex 24 > "$ACADEMY_CI_SECRET_DIR/matrix_learner_password"
chmod 600 "$ACADEMY_CI_SECRET_DIR"/matrix_*
echo 'Pulling pinned-version disposable Element and Synapse images'
docker pull "$SYNAPSE_IMAGE" >/dev/null
docker pull "$ELEMENT_IMAGE" >/dev/null
for img in "$SYNAPSE_IMAGE" "$ELEMENT_IMAGE"; do
  echo "Test image $(docker inspect --type=image -f '{{index .RepoDigests 0}}' "$img")"
done

docker run --rm --network none \
  --env SYNAPSE_SERVER_NAME=academy-test.invalid \
  --env SYNAPSE_REPORT_STATS=no \
  --env UID="$(id -u)" --env GID="$(id -g)" \
  --volume "$LAB/synapse:/data" "$SYNAPSE_IMAGE" generate >/dev/null
[[ -s "$LAB/synapse/homeserver.yaml" ]] || { echo 'Synapse configuration was not generated'; exit 1; }
python3 - "$LAB/synapse/homeserver.yaml" "$ACADEMY_CI_SECRET_DIR/matrix_registration_secret" <<'PY'
import pathlib,sys
conf=pathlib.Path(sys.argv[1]); pw=pathlib.Path(sys.argv[2]).read_text().strip()
with conf.open('a') as f:
    f.write('\nregistration_shared_secret: '+repr(pw)+'\n')
    f.write('enable_registration: false\n')
    f.write('public_baseurl: "http://127.0.0.1:18008/"\n')
PY

docker run -d --name "$SYNAPSE_CONTAINER" --publish 127.0.0.1:18008:8008 \
  --env UID="$(id -u)" --env GID="$(id -g)" \
  --volume "$LAB/synapse:/data" "$SYNAPSE_IMAGE" >/dev/null
ready=0
for _ in $(seq 1 90); do
  if curl --max-time 2 -fsS http://127.0.0.1:18008/_matrix/client/versions >/dev/null 2>&1; then ready=1; break; fi
  sleep 2
done
[[ "$ready" == 1 ]] || { echo 'Disposable Synapse did not start'; exit 1; }

docker exec "$SYNAPSE_CONTAINER" register_new_matrix_user \
  --no-admin -u academy-learner -p "$(cat "$ACADEMY_CI_SECRET_DIR/matrix_learner_password")" \
  -c /data/homeserver.yaml http://localhost:8008 >/dev/null

python3 - "$ACADEMY_CI_SECRET_DIR/matrix_learner_password" "$LAB/room-id" <<'PY'
import json,pathlib,urllib.request,urllib.parse,sys
password=pathlib.Path(sys.argv[1]).read_text().strip(); roompath=pathlib.Path(sys.argv[2])
base='http://127.0.0.1:18008'
def request(path, data, token=None, method='POST'):
    req=urllib.request.Request(base+path, data=json.dumps(data).encode(), method=method,
      headers={'Content-Type':'application/json', **({'Authorization':'Bearer '+token} if token else {})})
    with urllib.request.urlopen(req, timeout=10) as res: return json.load(res)
login=request('/_matrix/client/v3/login',{'type':'m.login.password','identifier':{'type':'m.id.user','user':'academy-learner'},'password':password,'initial_device_display_name':'disposable-academy-test'})
token=login['access_token']
room=request('/_matrix/client/v3/createRoom',{'visibility':'private','preset':'private_chat','name':'Academy Decision Room — disposable'},token)['room_id']
widget={'type':'m.custom','name':'Academy Decision Room','url':'http://127.0.0.1:18300/academy/learn/report-or-evidence?format=matrix','data':{}}
request('/_matrix/client/v3/rooms/'+urllib.parse.quote(room,safe='')+'/state/im.vector.modular.widgets/academy-decision-room',widget,token,method='PUT')
roompath.write_text(room); roompath.chmod(0o600)
# Log out this setup device. Element logs in independently in Chromium.
request('/_matrix/client/v3/logout',{},token)
PY

cat > "$LAB/element-config.json" <<'JSON'
{"default_server_config":{"m.homeserver":{"base_url":"http://127.0.0.1:18008","server_name":"academy-test.invalid"}},"brand":"Element Web — disposable Academy acceptance","default_theme":"dark","disable_guests":true,"disable_custom_urls":true,"integrations_ui_url":null,"integrations_rest_url":null,"integrations_widgets_urls":[]}
JSON
chmod 644 "$LAB/element-config.json"  # Public loopback-only settings; readable by the unprivileged Element container.
docker run -d --name "$ELEMENT_CONTAINER" --publish 127.0.0.1:18444:8080 \
  --env ELEMENT_WEB_PORT=8080 \
  --volume "$LAB/element-config.json:/app/config.json:ro" "$ELEMENT_IMAGE" >/dev/null
ready=0
for _ in $(seq 1 40); do
  if curl --max-time 2 -fsS http://127.0.0.1:18444/config.json >/dev/null 2>&1; then ready=1; break; fi
  sleep 1
done
if [[ "$ready" != 1 ]]; then
  echo 'Disposable Element Web did not start'
  docker inspect --format 'Element container status={{.State.Status}} exit={{.State.ExitCode}}' "$ELEMENT_CONTAINER" || true
  # Error category only; no startup environment, headers, bodies or private tokens.
  docker logs --tail 40 "$ELEMENT_CONTAINER" 2>&1 |
    grep -E -i 'permission denied|bind\(|address already in use|permission|emerg|invalid number|error|fail' |
    sed -E 's/[A-Za-z0-9_=-]{80,}/[REDACTED]/g' | tail -12 || true
  exit 1
fi

if grep -q '^ACADEMY_MATRIX_WIDGET_ORIGINS=' "$ACADEMY_CI_ENV"; then
  echo 'Origin setting was already present, refusing to modify'; exit 1
fi
export ACADEMY_MATRIX_WIDGET_ORIGINS=http://127.0.0.1:18444
printf '%s\n' "ACADEMY_MATRIX_WIDGET_ORIGINS=$ACADEMY_MATRIX_WIDGET_ORIGINS" >> "$ACADEMY_CI_ENV"
ORIGIN_ADDED=1
bash "$ACADEMY_TEST_RESTART_APP_CMD" "$ACADEMY_DB_NAME"
# One fresh synthetic Academy/Keycloak principal, separate from existing CI learners.
export TEST_MATRIX_ACADEMY_USERNAME="learner-new-$(openssl rand -hex 12)"
export TEST_MATRIX_ACADEMY_PASSWORD_FILE="$TEST_LEARNER_B_PASSWORD_FILE"
python3 apps/witnessops-academy-server/keycloak/kc_admin.py create-test-invitee "$TEST_MATRIX_ACADEMY_USERNAME" >/dev/null
export MATRIX_TEST_ROOM_ID_FILE="$LAB/room-id"
export MATRIX_TEST_PASSWORD_FILE="$ACADEMY_CI_SECRET_DIR/matrix_learner_password"
export MATRIX_TEST_ELEMENT_URL=http://127.0.0.1:18444
export MATRIX_TEST_SYNAPSE_URL=http://127.0.0.1:18008
node apps/witnessops-academy-mcp/test/matrix-element-e2e.mjs
