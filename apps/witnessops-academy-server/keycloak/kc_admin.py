#!/usr/bin/env python3
"""Keycloak admin helper for the disposable Academy realm.

Secrets come from *_FILE or systemd credentials and are never printed.
KC_ADMIN_PASSWORD_GRANT=1 is the disposable-CI password grant.
Test users are created only when KC_CREATE_TEST_USERS=1.
The audience mapper is copied from academy-realm.json.

usage: kc_admin.py setup | user-id <username> | logout-user <username> | sessions <username>
"""
import json
import os
import pathlib
import sys
import urllib.error
import urllib.parse
import urllib.request

from config import APP, CREATE_TEST_USERS, KC, REALM, enabled, env, secret

HERE = pathlib.Path(__file__).resolve().parent
REALM_FILE = HERE / "academy-realm.json"


def public_error(body):
    if not isinstance(body, str) or body == "":
        return ""
    if ("ey" + "J") in body or "access_token" in body or "password" in body.lower():
        return "[redacted]"
    return body[:180]


def req(method, path, body=None, token=None, form=None):
    headers = {}
    data = None
    if token:
        headers["Authorization"] = "Bearer " + token
    if form is not None:
        data = urllib.parse.urlencode(form).encode()
        headers["Content-Type"] = "application/x-www-form-urlencoded"
    elif body is not None:
        data = json.dumps(body).encode()
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(KC + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            raw = response.read()
            parsed = json.loads(raw) if raw else None
            return response.status, parsed
    except urllib.error.HTTPError as error:
        raw = error.read().decode("utf-8", "replace")
        return error.code, public_error(raw)


def token():
    if not enabled("KC_ADMIN_PASSWORD_GRANT"):
        return secret("KC_ADMIN_ACCESS_TOKEN")
    status, payload = req(
        "POST",
        "/realms/master/protocol/openid-connect/token",
        form={
            "grant_type": "password",
            "client_id": "admin-cli",
            "username": env("KC_ADMIN_USERNAME"),
            "password": secret("KC_ADMIN_PASSWORD"),
        },
    )
    if status != 200 or not isinstance(payload, dict) or "access_token" not in payload:
        raise SystemExit(f"admin token request failed status {status}")
    return payload["access_token"]


def uid(access, username):
    status, payload = req(
        "GET",
        f"/admin/realms/{REALM}/users?exact=true&username={urllib.parse.quote(username)}",
        token=access,
    )
    if status != 200 or not payload:
        raise SystemExit(f"user lookup failed status {status}")
    return payload[0]["id"]


def audience_mapper_body():
    document = json.loads(REALM_FILE.read_text(encoding="utf-8"))
    client = next(item for item in document["clients"] if item["clientId"] == "academy-app")
    mapper = next(
        item for item in client["protocolMappers"] if item["protocolMapper"] == "oidc-audience-mapper"
    )
    return {
        "name": mapper["name"],
        "protocol": mapper["protocol"],
        "protocolMapper": mapper["protocolMapper"],
        "consentRequired": mapper.get("consentRequired", False),
        "config": mapper["config"],
    }


def ssl_required():
    # A published container port sees the docker bridge address, so Keycloak's
    # "external" policy rejects loopback HTTP. Disposable CI sets KC_SSL_REQUIRED=none.
    # An https admin URL stays sslRequired=all.
    configured = os.environ.get("KC_SSL_REQUIRED", "")
    if configured:
        return configured
    if KC.startswith("https://"):
        return "all"
    return "external"


def realm_payload():
    return {
        "realm": REALM,
        "enabled": True,
        "registrationAllowed": False,
        "loginWithEmailAllowed": False,
        "bruteForceProtected": True,
        "sslRequired": ssl_required(),
        "accessTokenLifespan": 300,
        "ssoSessionIdleTimeout": 1800,
        "ssoSessionMaxLifespan": 28800,
    }


def client_payload():
    return {
        "clientId": "academy-app",
        "name": "Academy lesson server",
        "enabled": True,
        "protocol": "openid-connect",
        "publicClient": False,
        "clientAuthenticatorType": "client-secret",
        "secret": secret("ACADEMY_OIDC_CLIENT_SECRET"),
        "standardFlowEnabled": True,
        "implicitFlowEnabled": False,
        "directAccessGrantsEnabled": False,
        "serviceAccountsEnabled": False,
        "frontchannelLogout": False,
        "redirectUris": [APP + "/academy/auth/callback"],
        "webOrigins": [],
        "attributes": {
            "pkce.code.challenge.method": "S256",
            "post.logout.redirect.uris": APP + "/academy/learn/report-or-evidence",
            "backchannel.logout.session.required": "true",
        },
    }


def require_ok(status, label):
    print(label, status)
    if status >= 300:
        raise SystemExit(f"{label} failed")


def ensure_realm(access):
    status, _payload = req("GET", f"/admin/realms/{REALM}", token=access)
    if status == 200:
        print("realm present", status)
        return
    if status != 404:
        raise SystemExit(f"realm lookup failed status {status}")
    created, _body = req("POST", "/admin/realms", realm_payload(), access)
    require_ok(created, "realm create")


def client_record(access):
    status, payload = req("GET", f"/admin/realms/{REALM}/clients?clientId=academy-app", token=access)
    if status != 200 or not payload:
        return None
    return payload[0]


def ensure_client(access):
    current = client_record(access)
    payload = client_payload()
    if current:
        payload["id"] = current["id"]
        updated, _body = req("PUT", f"/admin/realms/{REALM}/clients/{current['id']}", payload, access)
        require_ok(updated, "client update")
    else:
        created, _body = req("POST", f"/admin/realms/{REALM}/clients", payload, access)
        require_ok(created, "client create")
    current = client_record(access)
    if not current:
        raise SystemExit("academy-app client missing after upsert")
    return current["id"]


def ensure_audience_mapper(access, client_id):
    wanted = audience_mapper_body()
    collection = f"/admin/realms/{REALM}/clients/{client_id}/protocol-mappers/models"
    status, mappers = req("GET", collection, token=access)
    if status != 200 or not isinstance(mappers, list):
        raise SystemExit(f"mapper lookup failed status {status}")
    existing = next((item for item in mappers if item.get("name") == wanted["name"]), None)
    if existing:
        status, _body = req("PUT", f"{collection}/{existing['id']}", wanted, access)
        require_ok(status, "audience mapper update")
    else:
        status, _body = req("POST", collection, wanted, access)
        require_ok(status, "audience mapper create")
    status, mappers = req("GET", collection, token=access)
    if status != 200 or not isinstance(mappers, list):
        raise SystemExit(f"mapper lookup failed status {status}")
    saved = next((item for item in mappers if item.get("protocolMapper") == "oidc-audience-mapper"), None)
    if not saved:
        raise SystemExit("audience mapper missing")
    config = saved.get("config") or {}
    for key, value in wanted["config"].items():
        if str(config.get(key)) != str(value):
            raise SystemExit(f"audience mapper field {key} mismatch")
    if config.get("included.client.audience") != "academy-app":
        raise SystemExit("audience mapper client mismatch")


def assert_client_contract(access):
    current = client_record(access)
    if not current:
        raise SystemExit("academy-app client missing")
    redirects = current.get("redirectUris") or []
    expected = APP + "/academy/auth/callback"
    if redirects != [expected] or any("*" in item for item in redirects):
        raise SystemExit("academy-app redirectUris must be the exact callback")
    attributes = current.get("attributes") or {}
    if attributes.get("pkce.code.challenge.method") != "S256":
        raise SystemExit("academy-app pkce code challenge method must be S256")
    print("client contract ok")


def ensure_test_users(access):
    if not CREATE_TEST_USERS:
        print("test users skipped")
        return
    users = (
        (env("TEST_LEARNER_A_USERNAME", "learner-a"), "TEST_LEARNER_A_PASSWORD"),
        (env("TEST_LEARNER_B_USERNAME", "learner-b"), "TEST_LEARNER_B_PASSWORD"),
    )
    for username, secret_name in users:
        status, existing = req(
            "GET",
            f"/admin/realms/{REALM}/users?exact=true&username={urllib.parse.quote(username)}",
            token=access,
        )
        if status != 200:
            raise SystemExit(f"user lookup failed status {status}")
        body = {
            "username": username,
            "enabled": True,
            "email": f"{username}@example.invalid",
            "emailVerified": True,
            "firstName": "Learner",
            "lastName": "Synthetic " + username[-1].upper(),
            "requiredActions": [],
        }
        if not existing:
            created, _body = req("POST", f"/admin/realms/{REALM}/users", body, access)
            require_ok(created, f"user create {username}")
        else:
            body["id"] = existing[0]["id"]
            updated, _body = req("PUT", f"/admin/realms/{REALM}/users/{existing[0]['id']}", body, access)
            require_ok(updated, f"user update {username}")
        user_id = uid(access, username)
        status, _body = req(
            "PUT",
            f"/admin/realms/{REALM}/users/{user_id}/reset-password",
            {"type": "password", "value": secret(secret_name), "temporary": False},
            access,
        )
        require_ok(status, f"password set {username}")


def setup():
    access = token()
    ensure_realm(access)
    client_id = ensure_client(access)
    ensure_audience_mapper(access, client_id)
    ensure_test_users(access)
    assert_client_contract(access)


def main():
    command = sys.argv[1]
    if command == "setup":
        setup()
    elif command == "user-id":
        print(uid(token(), sys.argv[2]))
    elif command == "logout-user":
        access = token()
        status, _body = req(
            "POST",
            f"/admin/realms/{REALM}/users/{uid(access, sys.argv[2])}/logout",
            token=access,
        )
        print("admin logout", sys.argv[2], status)
        if status >= 300:
            raise SystemExit("admin logout failed")
    elif command == "sessions":
        access = token()
        status, payload = req(
            "GET",
            f"/admin/realms/{REALM}/users/{uid(access, sys.argv[2])}/sessions",
            token=access,
        )
        if status != 200 or not isinstance(payload, list):
            raise SystemExit(f"session lookup failed status {status}")
        print(json.dumps([item["id"] for item in payload]))
    else:
        raise SystemExit("usage: kc_admin.py setup | user-id <username> | logout-user <username> | sessions <username>")


if __name__ == "__main__":
    main()
