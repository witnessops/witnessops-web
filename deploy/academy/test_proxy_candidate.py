"""Real Caddy route acceptance with loopback-only synthetic upstreams. No TLS/keys."""
import copy
import http.client
import http.server
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import tempfile
import threading
import time
import unittest

ROOT = Path(__file__).resolve().parents[2]
CANDIDATE = Path(__file__).with_name("Caddyfile.academy")
HOST = "academy.witnessops.com"


def free_port():
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


class Upstream(http.server.BaseHTTPRequestHandler):
    def reply(self):
        body = self.rfile.read(int(self.headers.get("Content-Length", "0")))
        data = {"upstream": self.server.kind, "method": self.command,
                "path": self.path, "body": body.decode(),
                "xff": self.headers.get("X-Forwarded-For"),
                "forwarded": self.headers.get("Forwarded"),
                "origin": self.headers.get("Origin"),
                "csrf": self.headers.get("X-CSRF-Token")}
        self.server.seen.append(data)
        payload = json.dumps(data).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Content-Security-Policy", "default-src 'none'; connect-src 'self'")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(payload)

    do_GET = do_HEAD = do_POST = do_PUT = do_DELETE = do_PATCH = do_OPTIONS = reply

    def log_message(self, *_):
        pass


class ProxyCandidateTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.binary = os.environ.get("ACADEMY_CADDY_BIN") or shutil.which("caddy")
        if not cls.binary:
            if os.environ.get("ACADEMY_REQUIRE_CADDY") == "1":
                raise RuntimeError("Caddy required for Academy proxy acceptance")
            raise unittest.SkipTest("Caddy unavailable; required gate sets ACADEMY_REQUIRE_CADDY=1")
        cls.temp = tempfile.TemporaryDirectory(prefix="academy-proxy-test-")
        cls.scratch = Path(cls.temp.name)
        cls.env = {**os.environ, "XDG_DATA_HOME": str(cls.scratch / "data"),
                   "XDG_CONFIG_HOME": str(cls.scratch / "config")}
        cls.app = cls.backend("app")
        cls.mcp = cls.backend("mcp")
        cls.port = free_port()
        adapted = subprocess.run([cls.binary, "adapt", "--adapter", "caddyfile", "--config", str(CANDIDATE)],
                                 text=True, capture_output=True, check=True)
        cls.original = json.loads(adapted.stdout)
        # Validate the unmodified complete Academy HTTPS candidate, without running it.
        subprocess.run([cls.binary, "validate", "--adapter", "caddyfile", "--config", str(CANDIDATE)],
                       env=cls.env, capture_output=True, check=True)
        config = copy.deepcopy(cls.original)
        config["admin"] = {"disabled": True}
        config.pop("storage", None)
        config["apps"].pop("tls", None)
        public = cls.scratch / "public"
        shutil.copytree(ROOT / "apps/witnessops-academy/public", public)
        (public / ".synthetic-private").write_text("synthetic hidden file")

        def substitute(value):
            if isinstance(value, dict):
                for key, child in list(value.items()):
                    if key == "dial" and child == "127.0.0.1:18300":
                        value[key] = "127.0.0.1:" + str(cls.app.server_port)
                    elif key == "dial" and child == "127.0.0.1:18500":
                        value[key] = "127.0.0.1:" + str(cls.mcp.server_port)
                    elif key == "root" and child == "/srv/witnessops-academy/current":
                        value[key] = str(public)
                    else:
                        substitute(child)
            elif isinstance(value, list):
                for child in value:
                    substitute(child)
        substitute(config)
        for server in config["apps"]["http"]["servers"].values():
            server["listen"] = ["127.0.0.1:" + str(cls.port)]
            server["automatic_https"] = {"disable": True}
        path = cls.scratch / "test.json"
        path.write_text(json.dumps(config))
        cls.log = (cls.scratch / "caddy.log").open("w+")
        cls.process = subprocess.Popen([cls.binary, "run", "--config", str(path)],
                                       env=cls.env, stdout=cls.log, stderr=subprocess.STDOUT)
        for _ in range(100):
            try:
                if cls.request("GET", "/")[0] == 200:
                    return
            except OSError:
                # Retry connection failures while the disposable listener starts.
                pass
            if cls.process.poll() is not None:
                break
            time.sleep(0.05)
        cls.tearDownClass()
        raise RuntimeError("disposable Caddy failed to start")

    @classmethod
    def backend(cls, kind):
        server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), Upstream)
        server.kind, server.seen = kind, []
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        return server

    @classmethod
    def tearDownClass(cls):
        if hasattr(cls, "process"):
            cls.process.terminate()
            try:
                cls.process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                cls.process.kill()
                cls.process.wait()
        for name in ["app", "mcp"]:
            if hasattr(cls, name):
                getattr(cls, name).shutdown()
                getattr(cls, name).server_close()
        if hasattr(cls, "log"):
            cls.log.close()
        if hasattr(cls, "temp"):
            cls.temp.cleanup()

    @classmethod
    def request(cls, method, path, body=None, headers=None, host=HOST):
        connection = http.client.HTTPConnection("127.0.0.1", cls.port, timeout=5)
        try:
            connection.request(method, path, body=body, headers={"Host": host, **(headers or {})})
            response = connection.getresponse()
            return response.status, dict(response.getheaders()), response.read()
        finally:
            connection.close()

    def test_public_aliases_have_the_exact_redirect_and_no_backend_write(self):
        for path in [f"/lessons/{lesson}{suffix}" for lesson in ["report-or-evidence", "same-scope"]
                     for suffix in ["", "/", "/index.html?from=home"]]:
            for method in ["GET", "HEAD"]:
                status, headers, _ = self.request(method, path)
                self.assertEqual(status, 302)
                self.assertEqual(headers.get("Location"), "/academy/learn/" + path.split("/")[2])
            status, headers, _ = self.request("POST", path, "synthetic")
            self.assertEqual(status, 405)
            self.assertEqual(headers.get("Allow"), "GET, HEAD")

    def test_exact_app_allowlist_and_reserved_paths(self):
        allowed = {"/academy/learn/report-or-evidence": ["GET", "HEAD"],
                   "/academy/learn/report-or-evidence/chat": ["GET", "HEAD"],
                   "/academy/static/lesson-chat.js": ["GET", "HEAD"],
                   "/academy/static/lesson-chat.css": ["GET", "HEAD"],
                   "/academy/api/lessons/report-or-evidence/chat": ["GET"],
                   "/academy/api/lessons/report-or-evidence/chat/decision": ["POST"],
                   "/academy/learn/same-scope": ["GET", "HEAD"],
                   "/academy/api/lessons/same-scope/draft": ["GET", "PUT"],
                   "/academy/static/lesson.js": ["GET", "HEAD"],
                   "/academy/invitation": ["GET", "HEAD"],
                   "/academy/static/invitation.js": ["GET", "HEAD"],
                   "/academy/account": ["GET", "HEAD"],
                   "/academy/static/account.js": ["GET", "HEAD"],
                   "/academy/auth/register": ["GET"],
                   "/academy/auth/invitation": ["POST"],
                   "/academy/api/invitations/preview": ["POST"],
                   "/academy/api/invitations/redeem": ["POST"],
                   "/academy/auth/login": ["GET"], "/academy/auth/callback": ["GET"],
                   "/academy/api/lessons/report-or-evidence/draft": ["GET", "PUT"],
                   "/academy/auth/logout": ["POST"]}
        for path, methods in allowed.items():
            for method in methods:
                before = len(self.app.seen)
                status, _, _ = self.request(method, path)
                self.assertEqual(status, 200, (method, path))
                self.assertEqual(len(self.app.seen), before + 1)
        for method, path in [("POST", "/academy/api/lessons/report-or-evidence/draft"),
                             ("POST", "/academy/api/lessons/report-or-evidence/chat"),
                             ("GET", "/academy/api/lessons/report-or-evidence/chat/decision"),
                             ("PUT", "/academy/api/lessons/report-or-evidence/chat/decision"),
                             ("GET", "/academy/learn/same-scope/chat"),
                             ("DELETE", "/academy/api/lessons/report-or-evidence/draft"),
                             ("GET", "/academy/auth/logout"), ("HEAD", "/academy/auth/login"),
                             ("POST", "/academy/account"), ("HEAD", "/academy/auth/register"),
                             ("POST", "/academy/auth/register"), ("GET", "/academy/auth/register/other"),
                             ("GET", "/academy/healthz"), ("GET", "/academy/api/other"),
                             ("GET", "/academy/static/draft-text.mjs"),
                             ("PUT", "/academy/api/lessons/unknown/draft"),
                             ("POST", "/academy/api/lessons/same-scope/draft")]:
            before = len(self.app.seen)
            self.assertEqual(self.request(method, path)[0], 404, (method, path))
            self.assertEqual(len(self.app.seen), before)

    def test_draft_body_origin_csrf_and_client_address_are_forwarded_safely(self):
        payload = '{"content":"synthetic learner work","expected_version":0}'
        status, headers, data = self.request("PUT", "/academy/api/lessons/report-or-evidence/draft?owner_id=forged",
            payload, {"Content-Type": "application/json", "Origin": "https://" + HOST,
                      "X-CSRF-Token": "synthetic-csrf", "X-Forwarded-For": "198.51.100.44",
                      "Forwarded": "for=198.51.100.44"})
        self.assertEqual(status, 200)
        body = json.loads(data)
        self.assertEqual(body["body"], payload)
        self.assertEqual(body["csrf"], "synthetic-csrf")
        self.assertEqual(body["origin"], "https://" + HOST)
        self.assertEqual(body["xff"], "127.0.0.1")
        self.assertIsNone(body["forwarded"])
        self.assertIn("connect-src 'self'", headers["Content-Security-Policy"])
        self.assertNotIn("connect-src 'none'", headers["Content-Security-Policy"])

    def test_static_remains_read_only_and_private_paths_stay_hidden(self):
        status, headers, _ = self.request("GET", "/")
        self.assertEqual(status, 200)
        self.assertIn("connect-src 'none'", headers["Content-Security-Policy"])
        self.assertEqual(self.request("HEAD", "/")[2], b"")
        self.assertEqual(self.request("POST", "/")[0], 405)
        self.assertEqual(self.request("GET", "/.synthetic-private")[0], 404)
        self.assertEqual(self.request("GET", "/package.json")[0], 404)

    def test_mcp_metadata_and_foreign_host_isolation(self):
        for method, path in [("POST", "/mcp"), ("GET", "/mcp"), ("DELETE", "/mcp"),
                             ("GET", "/.well-known/oauth-protected-resource/mcp")]:
            self.assertEqual(json.loads(self.request(method, path)[2])["upstream"], "mcp")
        self.assertEqual(self.request("GET", "/.well-known/oauth-protected-resource")[0], 404)
        before = (len(self.app.seen), len(self.mcp.seen))
        self.request("PUT", "/academy/api/lessons/report-or-evidence/draft", host="foreign.example.invalid")
        self.assertEqual((len(self.app.seen), len(self.mcp.seen)), before)


if __name__ == "__main__":
    unittest.main()
