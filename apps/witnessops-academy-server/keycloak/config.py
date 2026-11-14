"""Shared configuration for the Academy Keycloak setup helpers. Secrets are never printed."""
import os
import pathlib
import urllib.parse


def env(name, default=None):
    value = os.environ.get(name)
    if value:
        return value
    if default is not None:
        return default
    raise RuntimeError(f"missing env {name}")


def secret(name):
    file_name = os.environ.get(name + "_FILE")
    if file_name:
        return pathlib.Path(file_name).read_text().strip()
    directory = os.environ.get("CREDENTIALS_DIRECTORY")
    if directory and (pathlib.Path(directory) / name.lower()).is_file():
        return (pathlib.Path(directory) / name.lower()).read_text().strip()
    raise RuntimeError(
        f"missing secret {name}: set {name}_FILE or a systemd credential named {name.lower()}"
    )


def enabled(name, default=False):
    value = os.environ.get(name)
    if value is None or value == "":
        return default
    return value.lower() in ("1", "true", "yes", "on")


def safe_url(name, default=None):
    raw = env(name, default).rstrip("/")
    parsed = urllib.parse.urlparse(raw)
    if parsed.scheme == "https" or (
        parsed.scheme == "http" and parsed.hostname in ("127.0.0.1", "localhost", "::1")
    ):
        return raw
    raise RuntimeError(f"{name} must be HTTPS (plain HTTP permitted only on loopback)")


KC = safe_url("KC_ADMIN_BASE_URL")
REALM = env("KC_REALM", "academy")
APP = safe_url("ACADEMY_PUBLIC_ORIGIN")
CREATE_TEST_USERS = enabled("KC_CREATE_TEST_USERS")
