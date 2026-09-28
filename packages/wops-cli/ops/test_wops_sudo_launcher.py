from __future__ import annotations

import os
from pathlib import Path
import stat
import subprocess
import tempfile
import unittest

import install_wops_sudo_launcher as installer


class SudoLauncherTest(unittest.TestCase):
    def test_production_template_uses_fixed_interpreter_and_entrypoint(self):
        rendered = installer.render_launcher().decode()
        self.assertIn("NODE='/usr/bin/node'", rendered)
        self.assertIn("MAIN='/usr/local/lib/node_modules/@witnessops/cli/src/main.mjs'", rendered)
        self.assertNotIn("/usr/bin/env node", rendered)
        self.assertIn("Run wops auth commands as your normal user", rendered)

    def test_launcher_installer_refuses_unprivileged_application(self):
        if os.geteuid() == 0:
            self.skipTest("root-only installer refusal is covered by non-root execution")
        with self.assertRaisesRegex(installer.InstallError, "as root"):
            installer.validate_prerequisites()

    def test_normal_cli_keeps_the_users_node_path(self):
        if os.geteuid() == 0:
            self.skipTest("normal-user dispatch must run without root")
        with tempfile.TemporaryDirectory(prefix="wops-user-launcher-") as temporary:
            root = Path(temporary)
            node = root / "node"
            main = root / "main.mjs"
            launcher = root / "wops"
            node.write_text("#!/bin/sh\nprintf 'user-node-invoked\\n'\nprintf 'arg=%s\\n' \"$@\"\n", encoding="utf-8")
            node.chmod(0o755)
            main.write_text("// test entrypoint\n", encoding="utf-8")
            launcher.write_bytes(installer.render_launcher(node=node, main=main))
            launcher.chmod(0o755)
            result = subprocess.run(
                [str(launcher), "auth", "status"], check=False, capture_output=True, text=True,
                env={"PATH": str(root), "LANG": "C"}, timeout=10,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("user-node-invoked", result.stdout)
            self.assertIn(f"arg={main}", result.stdout)
            self.assertIn("arg=auth", result.stdout)
            self.assertIn("arg=status", result.stdout)

    def test_fixed_launcher_runs_under_sudo_like_restricted_path(self):
        if os.geteuid() != 0:
            self.skipTest("acceptance test creates root-owned fixtures and must run as root")
        with tempfile.TemporaryDirectory(prefix="wops-root-launcher-", dir="/root") as temporary:
            root = Path(temporary)
            node = root / "fixed-node"
            main = root / "main.mjs"
            launcher = root / "wops"
            marker = root / "should-not-execute"
            node.write_text(
                "#!/bin/sh\n"
                "[ -z \"${NODE_OPTIONS-}\" ] || { printf 'NODE_OPTIONS leaked\\n' >&2; exit 42; }\n"
                "if [ \"${1-}\" = --version ]; then printf 'v22.23.3\\n'; exit 0; fi\n"
                "printf 'fixed-node-invoked\\n'\n"
                "printf 'arg=%s\\n' \"$@\"\n",
                encoding="utf-8",
            )
            node.chmod(0o755)
            main.write_text("// root-owned test entrypoint\n", encoding="utf-8")
            main.chmod(0o644)
            installer.apply(node=node, main=main, destination=launcher)
            launcher_stat = launcher.stat()
            self.assertEqual(launcher_stat.st_uid, 0)
            self.assertEqual(stat.S_IMODE(launcher_stat.st_mode), 0o755)
            unsafe_argument = f"; touch {marker}"
            denied = subprocess.run(
                [str(launcher), "auth", "status"], check=False, capture_output=True, text=True,
                env={"PATH": "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin", "LANG": "C", "SUDO_UID": "1000"}, timeout=10,
            )
            self.assertEqual(denied.returncode, 126)
            self.assertIn("Run wops auth commands as your normal user", denied.stderr)
            result = subprocess.run(
                [str(launcher), "server", "check", "--help", unsafe_argument],
                check=False,
                capture_output=True,
                text=True,
                env={"PATH": "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin", "LANG": "C", "SUDO_UID": "1000", "NODE_OPTIONS": "--require=/tmp/user-controlled.js"},
                timeout=10,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("fixed-node-invoked", result.stdout)
            self.assertIn(f"arg={main}", result.stdout)
            self.assertIn(f"arg={unsafe_argument}", result.stdout)
            self.assertFalse(marker.exists())


if __name__ == "__main__":
    unittest.main()
