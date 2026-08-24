from __future__ import annotations

import hashlib
import http.server
import importlib.machinery
import io
import json
import os
from pathlib import Path
import tarfile
import tempfile
import threading
import unittest
from unittest import mock


THIS_DIR = Path(__file__).resolve().parent
adapter = importlib.machinery.SourceFileLoader(
    "witnessops_deploy_v1", str(THIS_DIR / "witnessops-deploy-v1")
).load_module()


def digest(value: bytes) -> str:
    return f"sha256:{hashlib.sha256(value).hexdigest()}"


def valid_config() -> dict:
    return {
        "schema_version": 1,
        "account_id": "123456789012",
        "region": "eu-central-1",
        "registry": "123456789012.dkr.ecr.eu-central-1.amazonaws.com",
        "repository": "witnessops-web",
        "namespace": "witnessops",
        "application_container": "witnessops-web",
        "base_env_secret": "witnessops-base",
        "admin_oidc_secret": "witnessops-admin",
        "credentials_file": "/root/.aws/credentials",
        "containerd_namespace": "k8s.io",
        "lanes": {
            "staging": {
                "deployment": "witnessops-web-staging",
                "smoke_urls": ["http://127.0.0.1:3100/"],
            },
            "production": {
                "deployment": "witnessops-web",
                "smoke_urls": ["https://witnessops.com/"],
            },
        },
    }


class FakeResponse(io.BytesIO):
    def __init__(self, value: bytes, headers: dict[str, str] | None = None):
        super().__init__(value)
        self.headers = headers or {}
        self.status = 200

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        self.close()


class ConfigTests(unittest.TestCase):
    def write_config(self, value: dict, mode: int = 0o600) -> tuple[tempfile.TemporaryDirectory, Path]:
        directory = tempfile.TemporaryDirectory()
        path = Path(directory.name) / "deploy-v1.json"
        path.write_text(json.dumps(value), encoding="utf-8")
        path.chmod(mode)
        return directory, path

    def test_valid_config(self):
        directory, path = self.write_config(valid_config())
        self.addCleanup(directory.cleanup)
        loaded = adapter.load_config(path, enforce_root=False)
        self.assertEqual(loaded["repository"], "witnessops-web")

    def test_config_rejects_extra_fields(self):
        value = valid_config()
        value["arbitrary_command"] = "id"
        directory, path = self.write_config(value)
        self.addCleanup(directory.cleanup)
        with self.assertRaisesRegex(adapter.AdapterError, "unsupported field inventory"):
            adapter.load_config(path, enforce_root=False)

    def test_config_rejects_cross_account_registry(self):
        value = valid_config()
        value["registry"] = "999999999999.dkr.ecr.eu-central-1.amazonaws.com"
        directory, path = self.write_config(value)
        self.addCleanup(directory.cleanup)
        with self.assertRaisesRegex(adapter.AdapterError, "does not match"):
            adapter.load_config(path, enforce_root=False)

    def test_config_rejects_group_writable_file(self):
        directory, path = self.write_config(valid_config(), mode=0o620)
        self.addCleanup(directory.cleanup)
        with self.assertRaisesRegex(adapter.AdapterError, "group/world writable"):
            adapter.load_config(path, enforce_root=False)


class OciTests(unittest.TestCase):
    def test_verified_single_platform_archive(self):
        source_commit = "a" * 40
        image_config = json.dumps(
            {
                "architecture": "amd64",
                "os": "linux",
                "config": {
                    "Labels": {
                        "org.opencontainers.image.revision": source_commit,
                    }
                },
            },
            separators=(",", ":"),
        ).encode()
        layer = b"reviewed-layer"
        config_digest = digest(image_config)
        layer_digest = digest(layer)
        manifest = json.dumps(
            {
                "schemaVersion": 2,
                "mediaType": "application/vnd.oci.image.manifest.v1+json",
                "config": {
                    "mediaType": "application/vnd.oci.image.config.v1+json",
                    "digest": config_digest,
                    "size": len(image_config),
                },
                "layers": [
                    {
                        "mediaType": "application/vnd.oci.image.layer.v1.tar+gzip",
                        "digest": layer_digest,
                        "size": len(layer),
                    }
                ],
            },
            separators=(",", ":"),
        ).encode()
        image_digest = digest(manifest)
        responses = {
            f"manifests/{image_digest}": (
                manifest,
                {
                    "Content-Type": "application/vnd.oci.image.manifest.v1+json",
                    "Docker-Content-Digest": image_digest,
                },
            ),
            f"blobs/{config_digest}": (image_config, {}),
            f"blobs/{layer_digest}": (layer, {}),
        }

        def request(url, _token, accept=None):
            del accept
            for suffix, (value, headers) in responses.items():
                if url.endswith(suffix):
                    return FakeResponse(value, headers)
            raise AssertionError(url)

        with tempfile.TemporaryDirectory() as directory, mock.patch.object(
            adapter, "load_credentials", return_value=("A" * 20, "s" * 40, "t" * 40)
        ), mock.patch.object(
            adapter, "get_ecr_authorization", return_value="dGVzdDp0b2tlbg=="
        ), mock.patch.object(adapter, "registry_request", side_effect=request):
            archive = adapter.fetch_oci_archive(
                valid_config(),
                image_digest,
                source_commit,
                config_digest,
                Path(directory),
            )
            with tarfile.open(archive, "r:") as stream:
                names = set(stream.getnames())
            self.assertIn("index.json", names)
            self.assertIn(f"blobs/sha256/{image_digest.removeprefix('sha256:')}", names)
            self.assertIn(f"blobs/sha256/{config_digest.removeprefix('sha256:')}", names)
            self.assertIn(f"blobs/sha256/{layer_digest.removeprefix('sha256:')}", names)

    def test_rejects_image_index(self):
        value = b'{"schemaVersion":2,"mediaType":"application/vnd.oci.image.index.v1+json"}'
        image_digest = digest(value)
        response = FakeResponse(
            value,
            {
                "Content-Type": "application/vnd.oci.image.index.v1+json",
                "Docker-Content-Digest": image_digest,
            },
        )
        with tempfile.TemporaryDirectory() as directory, mock.patch.object(
            adapter, "load_credentials", return_value=("A" * 20, "s" * 40, "t" * 40)
        ), mock.patch.object(
            adapter, "get_ecr_authorization", return_value="dGVzdDp0b2tlbg=="
        ), mock.patch.object(adapter, "registry_request", return_value=response):
            with self.assertRaisesRegex(adapter.AdapterError, "single-platform"):
                adapter.fetch_oci_archive(
                    valid_config(),
                    image_digest,
                    "a" * 40,
                    digest(b"config"),
                    Path(directory),
                )

    def test_rejects_wrong_image_platform(self):
        source_commit = "a" * 40
        image_config = json.dumps(
            {
                "architecture": "arm64",
                "os": "linux",
                "config": {
                    "Labels": {
                        "org.opencontainers.image.revision": source_commit,
                    }
                },
            },
            separators=(",", ":"),
        ).encode()
        layer = b"reviewed-layer"
        config_digest = digest(image_config)
        layer_digest = digest(layer)
        manifest = json.dumps(
            {
                "schemaVersion": 2,
                "mediaType": "application/vnd.oci.image.manifest.v1+json",
                "config": {"digest": config_digest, "size": len(image_config)},
                "layers": [{"digest": layer_digest, "size": len(layer)}],
            },
            separators=(",", ":"),
        ).encode()
        image_digest = digest(manifest)
        responses = {
            f"manifests/{image_digest}": (
                manifest,
                {
                    "Content-Type": "application/vnd.oci.image.manifest.v1+json",
                    "Docker-Content-Digest": image_digest,
                },
            ),
            f"blobs/{config_digest}": (image_config, {}),
            f"blobs/{layer_digest}": (layer, {}),
        }

        def request(url, _token, accept=None):
            del accept
            for suffix, (value, headers) in responses.items():
                if url.endswith(suffix):
                    return FakeResponse(value, headers)
            raise AssertionError(url)

        with tempfile.TemporaryDirectory() as directory, mock.patch.object(
            adapter, "load_credentials", return_value=("A" * 20, "s" * 40, "t" * 40)
        ), mock.patch.object(
            adapter, "get_ecr_authorization", return_value="dGVzdDp0b2tlbg=="
        ), mock.patch.object(adapter, "registry_request", side_effect=request):
            with self.assertRaisesRegex(adapter.AdapterError, "linux-amd64"):
                adapter.fetch_oci_archive(
                    valid_config(),
                    image_digest,
                    source_commit,
                    config_digest,
                    Path(directory),
                )


class RuntimeContractTests(unittest.TestCase):
    def deployment(self, explicit_env=None):
        return {
            "spec": {
                "replicas": 1,
                "selector": {"matchLabels": {"app": "witnessops-web"}},
                "template": {
                    "spec": {
                        "containers": [
                            {
                                "name": "witnessops-web",
                                "image": f"docker.io/library/witnessops-web@{digest(b'old')}",
                                "envFrom": [
                                    {"secretRef": {"name": "witnessops-base"}},
                                    {"secretRef": {"name": "witnessops-admin"}},
                                ],
                                "env": explicit_env or [],
                            }
                        ]
                    }
                },
            }
        }

    def test_exact_runtime_contract(self):
        index, image = adapter.validate_runtime_contract(valid_config(), self.deployment())
        self.assertEqual(index, 0)
        self.assertTrue(image.startswith("docker.io/library/witnessops-web@sha256:"))

    def test_rejects_envfrom_reordering(self):
        value = self.deployment()
        value["spec"]["template"]["spec"]["containers"][0]["envFrom"].reverse()
        with self.assertRaisesRegex(adapter.AdapterError, "envFrom"):
            adapter.validate_runtime_contract(valid_config(), value)

    def test_rejects_protected_explicit_env(self):
        value = self.deployment(
            [{"name": "WITNESSOPS_GOOGLE_OIDC_CLIENT_SECRET", "value": "not-a-real-secret"}]
        )
        with self.assertRaisesRegex(adapter.AdapterError, "shadows"):
            adapter.validate_runtime_contract(valid_config(), value)

    def test_normalizes_containerd_and_pullable_runtime_ids(self):
        value = digest(b"runtime")
        self.assertEqual(adapter.normalize_runtime_image_id(f"containerd://{value}"), value)
        self.assertEqual(
            adapter.normalize_runtime_image_id(f"docker-pullable://registry/repo@{value}"),
            value,
        )

    def test_rejects_unqualified_runtime_id(self):
        with self.assertRaisesRegex(adapter.AdapterError, "SHA-256"):
            adapter.normalize_runtime_image_id("containerd://latest")

    def test_patch_image_compares_the_exact_observed_image(self):
        previous = f"registry.example/witnessops-web@{digest(b'previous')}"
        requested = f"registry.example/witnessops-web@{digest(b'requested')}"
        with mock.patch.object(adapter, "kubectl", return_value="") as kubectl:
            adapter.patch_image(valid_config(), "production", 0, previous, requested)
        patch_argument = next(
            value
            for value in kubectl.call_args.args
            if isinstance(value, str) and value.startswith("--patch=")
        )
        patch = json.loads(patch_argument.removeprefix("--patch="))
        self.assertEqual(
            patch,
            [
                {
                    "op": "test",
                    "path": "/spec/template/spec/containers/0/name",
                    "value": "witnessops-web",
                },
                {
                    "op": "test",
                    "path": "/spec/template/spec/containers/0/image",
                    "value": previous,
                },
                {
                    "op": "replace",
                    "path": "/spec/template/spec/containers/0/image",
                    "value": requested,
                },
            ],
        )

    def test_rollback_refuses_to_clobber_a_third_image(self):
        previous = f"registry.example/witnessops-web@{digest(b'previous')}"
        requested = f"registry.example/witnessops-web@{digest(b'requested')}"
        third = f"registry.example/witnessops-web@{digest(b'third')}"
        value = self.deployment()
        value["spec"]["template"]["spec"]["containers"][0]["image"] = third
        with mock.patch.object(adapter, "deployment", return_value=value), mock.patch.object(
            adapter, "patch_image"
        ) as patch:
            with self.assertRaisesRegex(adapter.AdapterError, "refused to overwrite"):
                adapter.restore_previous_image(
                    valid_config(),
                    "production",
                    requested,
                    previous,
                    digest(b"previous-config"),
                )
        patch.assert_not_called()

    def test_rollback_accepts_an_already_restored_image_without_patching(self):
        previous = f"registry.example/witnessops-web@{digest(b'previous')}"
        requested = f"registry.example/witnessops-web@{digest(b'requested')}"
        value = self.deployment()
        value["spec"]["template"]["spec"]["containers"][0]["image"] = previous
        with mock.patch.object(adapter, "deployment", return_value=value), mock.patch.object(
            adapter, "patch_image"
        ) as patch, mock.patch.object(adapter, "rollout") as rollout, mock.patch.object(
            adapter, "validate_running_identity"
        ) as validate_identity, mock.patch.object(adapter, "smoke") as smoke:
            adapter.restore_previous_image(
                valid_config(),
                "production",
                requested,
                previous,
                digest(b"previous-config"),
            )
        patch.assert_not_called()
        rollout.assert_called_once()
        validate_identity.assert_called_once()
        smoke.assert_called_once()


class SmokeTests(unittest.TestCase):
    def start_server(self, callback):
        class Handler(http.server.BaseHTTPRequestHandler):
            def do_GET(self):
                callback(self)

            def log_message(self, _format, *_args):
                return

        server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()

        def stop():
            server.shutdown()
            server.server_close()
            thread.join(timeout=2)

        self.addCleanup(stop)
        return server

    def test_cross_authority_redirect_is_blocked_before_follow(self):
        target_received_get = threading.Event()

        def target(handler):
            target_received_get.set()
            handler.send_response(200)
            handler.end_headers()
            handler.wfile.write(b"ok")

        target_server = self.start_server(target)
        target_url = f"http://127.0.0.1:{target_server.server_port}/target"

        def redirect(handler):
            handler.send_response(302)
            handler.send_header("Location", target_url)
            handler.end_headers()

        redirect_server = self.start_server(redirect)
        value = valid_config()
        value["lanes"]["staging"]["smoke_urls"] = [
            f"http://127.0.0.1:{redirect_server.server_port}/redirect"
        ]
        with self.assertRaisesRegex(adapter.AdapterError, "redirected outside"):
            adapter.smoke(value, "staging")
        self.assertFalse(target_received_get.wait(timeout=0.1))

    def test_same_authority_redirect_remains_supported(self):
        final_received_get = threading.Event()

        def route(handler):
            if handler.path == "/redirect":
                handler.send_response(302)
                handler.send_header("Location", "/final")
                handler.end_headers()
                return
            final_received_get.set()
            handler.send_response(200)
            handler.end_headers()
            handler.wfile.write(b"ok")

        server = self.start_server(route)
        value = valid_config()
        value["lanes"]["staging"]["smoke_urls"] = [
            f"http://127.0.0.1:{server.server_port}/redirect"
        ]
        adapter.smoke(value, "staging")
        self.assertTrue(final_received_get.is_set())

    def test_cross_hostname_redirect_is_blocked_before_follow(self):
        target_received_get = threading.Event()

        def target(handler):
            target_received_get.set()
            handler.send_response(200)
            handler.end_headers()

        target_server = self.start_server(target)
        target_url = f"http://localhost:{target_server.server_port}/target"

        def redirect(handler):
            handler.send_response(302)
            handler.send_header("Location", target_url)
            handler.end_headers()

        redirect_server = self.start_server(redirect)
        value = valid_config()
        value["lanes"]["staging"]["smoke_urls"] = [
            f"http://127.0.0.1:{redirect_server.server_port}/redirect"
        ]
        with self.assertRaisesRegex(adapter.AdapterError, "redirected outside"):
            adapter.smoke(value, "staging")
        self.assertFalse(target_received_get.wait(timeout=0.1))

    def test_direct_http_200_smoke_remains_supported(self):
        def ok(handler):
            handler.send_response(200)
            handler.end_headers()
            handler.wfile.write(b"ok")

        server = self.start_server(ok)
        value = valid_config()
        value["lanes"]["staging"]["smoke_urls"] = [
            f"http://127.0.0.1:{server.server_port}/"
        ]
        adapter.smoke(value, "staging")


if __name__ == "__main__":
    unittest.main()
