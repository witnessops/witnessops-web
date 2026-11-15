#!/usr/bin/env python3
"""Keycloak clients for the Academy MCP resource server.

Secrets come from *_FILE or systemd credentials and are never printed.
The wrong-audience client and synthetic users are created only when
KC_CREATE_TEST_USERS=1.

usage: kc_mcp_setup.py setup | enable <user> | disable <user>
"""
import os
import pathlib
import sys
import urllib.parse

SERVER_KEYCLOAK = pathlib.Path(__file__).resolve().parents[2] / "witnessops-academy-server" / "keycloak"
if not SERVER_KEYCLOAK.is_dir():
    raise SystemExit("academy server keycloak helpers are missing")
sys.path.insert(0, str(SERVER_KEYCLOAK))

from config import CREATE_TEST_USERS, REALM, env, safe_url, secret
from kc_admin import req, token, uid


RESOURCE = safe_url("MCP_RESOURCE_URL")
CLIENT_ID = env("MCP_CLIENT_ID", "academy-mcp-client")
RS_CLIENT_ID = env("MCP_INTROSPECTION_CLIENT_ID", "academy-mcp-rs")
WRONG_CLIENT_ID = env("MCP_TEST_WRONGAUD_CLIENT_ID", "academy-mcp-wrongaud")
TOKEN_LIFESPAN = env("MCP_ACCESS_TOKEN_LIFESPAN_SECONDS", "120")
SCOPE = env("MCP_REQUIRED_SCOPE", "academy-mcp")
USERS = tuple(
    (env(f"TEST_MCP_LEARNER_{letter}_USERNAME", f"mcp-learner-{letter.lower()}"), f"TEST_MCP_LEARNER_{letter}_PASSWORD")
    for letter in "ABC"
)


def redirects():
    values = [item.strip() for item in env("MCP_CLIENT_REDIRECT_URIS", "http://127.0.0.1:18599/callback").split(",") if item.strip()]
    if not values:
        raise SystemExit("MCP client redirect list is empty")
    for value in values:
        parsed = urllib.parse.urlparse(value)
        loopback = parsed.hostname in ("127.0.0.1", "localhost", "::1")
        if parsed.scheme == "https" or (parsed.scheme == "http" and loopback):
            continue
        raise SystemExit("MCP client redirect must be https or loopback http")
    return values


def require_ok(status, label):
    print(label, status)
    if status >= 300:
        raise SystemExit(f"{label} failed")


def one(access, path):
    status, payload = req("GET", path, token=access)
    if status != 200:
        raise SystemExit(f"lookup failed status {status}")
    if not payload:
        return None
    return payload[0]


def upsert_client(access, representation):
    current = one(access, f"/admin/realms/{REALM}/clients?clientId={urllib.parse.quote(representation['clientId'])}")
    if current:
        representation = {**representation, "id": current["id"]}
        status, _body = req("PUT", f"/admin/realms/{REALM}/clients/{current['id']}", representation, access)
        require_ok(status, f"client update {representation['clientId']}")
        return current["id"]
    status, _body = req("POST", f"/admin/realms/{REALM}/clients", representation, access)
    require_ok(status, f"client create {representation['clientId']}")
    created = one(access, f"/admin/realms/{REALM}/clients?clientId={urllib.parse.quote(representation['clientId'])}")
    if not created:
        raise SystemExit(f"client missing after create {representation['clientId']}")
    return created["id"]


def public_client(client_id, name):
    return {
        "clientId": client_id,
        "name": name,
        "enabled": True,
        "protocol": "openid-connect",
        "publicClient": True,
        "standardFlowEnabled": True,
        "implicitFlowEnabled": False,
        "directAccessGrantsEnabled": False,
        "serviceAccountsEnabled": False,
        "frontchannelLogout": False,
        "fullScopeAllowed": False,
        "consentRequired": False,
        "redirectUris": redirects(),
        "webOrigins": [],
        "attributes": {
            "pkce.code.challenge.method": "S256",
            "access.token.lifespan": TOKEN_LIFESPAN,
            "oauth2.device.authorization.grant.enabled": "false",
            "oidc.ciba.grant.enabled": "false",
        },
    }


def set_default_scopes(access, client_uuid, wanted):
    status, scopes = req("GET", f"/admin/realms/{REALM}/client-scopes", token=access)
    if status != 200 or not isinstance(scopes, list):
        raise SystemExit(f"scope list failed status {status}")
    by_name = {item["name"]: item["id"] for item in scopes}
    for name in wanted:
        if name not in by_name:
            raise SystemExit(f"client scope missing {name}")
    status, current = req("GET", f"/admin/realms/{REALM}/clients/{client_uuid}/default-client-scopes", token=access)
    if status != 200 or not isinstance(current, list):
        raise SystemExit(f"default scope list failed status {status}")
    for item in current:
        if item["name"] not in wanted:
            removed, _body = req(
                "DELETE",
                f"/admin/realms/{REALM}/clients/{client_uuid}/default-client-scopes/{item['id']}",
                token=access,
            )
            require_ok(removed, f"default scope remove {item['name']}")
    status, optional = req("GET", f"/admin/realms/{REALM}/clients/{client_uuid}/optional-client-scopes", token=access)
    if status != 200 or not isinstance(optional, list):
        raise SystemExit(f"optional scope list failed status {status}")
    for item in optional:
        removed, _body = req(
            "DELETE",
            f"/admin/realms/{REALM}/clients/{client_uuid}/optional-client-scopes/{item['id']}",
            token=access,
        )
        require_ok(removed, f"optional scope remove {item['name']}")
    for name in wanted:
        added, _body = req(
            "PUT",
            f"/admin/realms/{REALM}/clients/{client_uuid}/default-client-scopes/{by_name[name]}",
            token=access,
        )
        require_ok(added, f"default scope add {name}")


def upsert_mapper(access, scope_id, name, config):
    status, mappers = req("GET", f"/admin/realms/{REALM}/client-scopes/{scope_id}/protocol-mappers/models", token=access)
    if status != 200 or not isinstance(mappers, list):
        raise SystemExit(f"mapper list failed status {status}")
    existing = next((item for item in mappers if item.get("name") == name), None)
    body = {
        "name": name,
        "protocol": "openid-connect",
        "protocolMapper": "oidc-audience-mapper",
        "config": config,
    }
    if existing:
        status, _body = req(
            "PUT",
            f"/admin/realms/{REALM}/client-scopes/{scope_id}/protocol-mappers/models/{existing['id']}",
            body,
            access,
        )
    else:
        status, _body = req("POST", f"/admin/realms/{REALM}/client-scopes/{scope_id}/protocol-mappers/models", body, access)
    require_ok(status, f"audience mapper {name}")


def ensure_scope(access):
    status, scopes = req("GET", f"/admin/realms/{REALM}/client-scopes", token=access)
    if status != 200 or not isinstance(scopes, list):
        raise SystemExit(f"scope list failed status {status}")
    current = next((item for item in scopes if item.get("name") == SCOPE), None)
    representation = {
        "name": SCOPE,
        "protocol": "openid-connect",
        "description": "Access to the Academy MCP server",
        "attributes": {"include.in.token.scope": "true", "display.on.consent.screen": "true"},
    }
    if current:
        status, _body = req("PUT", f"/admin/realms/{REALM}/client-scopes/{current['id']}", representation, access)
        require_ok(status, "scope update")
        return current["id"]
    status, _body = req("POST", f"/admin/realms/{REALM}/client-scopes", representation, access)
    require_ok(status, "scope create")
    status, scopes = req("GET", f"/admin/realms/{REALM}/client-scopes", token=access)
    if status != 200 or not isinstance(scopes, list):
        raise SystemExit(f"scope list failed status {status}")
    created = next((item for item in scopes if item.get("name") == SCOPE), None)
    if not created:
        raise SystemExit("mcp scope missing after create")
    return created["id"]


def ensure_test_users(access):
    if not CREATE_TEST_USERS:
        print("mcp test users skipped")
        return
    for username, secret_name in USERS:
        current = one(access, f"/admin/realms/{REALM}/users?exact=true&username={urllib.parse.quote(username)}")
        body = {
            "username": username,
            "enabled": True,
            "email": f"{username}@example.invalid",
            "emailVerified": True,
            "firstName": "MCP",
            "lastName": "Synthetic " + username[-1].upper(),
            "requiredActions": [],
        }
        if current:
            body["id"] = current["id"]
            status, _body = req("PUT", f"/admin/realms/{REALM}/users/{current['id']}", body, access)
            require_ok(status, f"user update {username}")
        else:
            status, _body = req("POST", f"/admin/realms/{REALM}/users", body, access)
            require_ok(status, f"user create {username}")
        status, _body = req(
            "PUT",
            f"/admin/realms/{REALM}/users/{uid(access, username)}/reset-password",
            {"type": "password", "value": secret(secret_name), "temporary": False},
            access,
        )
        require_ok(status, f"password set {username}")


def setup():
    access = token()
    scope_id = ensure_scope(access)
    upsert_mapper(access, scope_id, "mcp-audience", {
        "included.custom.audience": RESOURCE,
        "access.token.claim": "true",
        "id.token.claim": "false",
        "introspection.token.claim": "true",
        "lightweight.claim": "false",
    })
    # Keycloak answers introspection for a client that is in the token audience.
    upsert_mapper(access, scope_id, "mcp-rs-audience", {
        "included.client.audience": RS_CLIENT_ID,
        "access.token.claim": "true",
        "id.token.claim": "false",
        "introspection.token.claim": "true",
        "lightweight.claim": "false",
    })
    client_uuid = upsert_client(access, public_client(CLIENT_ID, "Academy MCP client"))
    set_default_scopes(access, client_uuid, ["basic", SCOPE])
    upsert_client(access, {
        "clientId": RS_CLIENT_ID,
        "name": "Academy MCP resource server",
        "enabled": True,
        "protocol": "openid-connect",
        "publicClient": False,
        "clientAuthenticatorType": "client-secret",
        "secret": secret("MCP_INTROSPECTION_CLIENT_SECRET"),
        "standardFlowEnabled": False,
        "implicitFlowEnabled": False,
        "directAccessGrantsEnabled": False,
        "serviceAccountsEnabled": False,
        "fullScopeAllowed": False,
        "redirectUris": [],
        "webOrigins": [],
    })
    if not CREATE_TEST_USERS:
        print("mcp negative-test client skipped")
        return
    wrong_uuid = upsert_client(access, public_client(WRONG_CLIENT_ID, "Academy MCP negative test client"))
    set_default_scopes(access, wrong_uuid, ["basic"])
    ensure_test_users(access)


def set_enabled(username, enabled):
    access = token()
    user_id = uid(access, username)
    status, representation = req("GET", f"/admin/realms/{REALM}/users/{user_id}", token=access)
    if status != 200 or not isinstance(representation, dict):
        raise SystemExit(f"user lookup failed status {status}")
    representation["enabled"] = enabled
    status, _body = req("PUT", f"/admin/realms/{REALM}/users/{user_id}", representation, access)
    require_ok(status, f"user {username} {'enabled' if enabled else 'disabled'}")


def main():
    if len(sys.argv) < 2:
        raise SystemExit("usage: kc_mcp_setup.py setup | enable <user> | disable <user>")
    command = sys.argv[1]
    if command == "setup":
        setup()
    elif command == "enable":
        set_enabled(sys.argv[2], True)
    elif command == "disable":
        set_enabled(sys.argv[2], False)
    else:
        raise SystemExit("usage: kc_mcp_setup.py setup | enable <user> | disable <user>")


if __name__ == "__main__":
    os.umask(0o077)
    main()
