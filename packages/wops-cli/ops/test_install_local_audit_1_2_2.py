from __future__ import annotations

import importlib.util
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch
import zipfile


SCRIPT = Path(__file__).with_name("install_local_audit_1_2_2.py")
SPEC = importlib.util.spec_from_file_location("local_audit_installer", SCRIPT)
assert SPEC and SPEC.loader
installer = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(installer)


class LocalAuditInstallerTest(unittest.TestCase):
    def copy_producer(self, root: Path) -> Path:
        source = installer.PRODUCER
        target = root / "producer"
        target.mkdir()
        for name in ("identity.json", "local-audit-1.2.2.tar.gz"):
            (target / name).write_bytes((source / name).read_bytes())
        return target

    def fake_runtime(self, base: Path, report: dict | None = None) -> Path:
        report = report or {
            "packageVersion": installer.PACKAGE_VERSION,
            "setuptoolsVersion": installer.SETUPTOOLS_VERSION,
            "cryptographyVersion": installer.CRYPTOGRAPHY_VERSION,
            "collectorFingerprint": installer.COLLECTOR_FINGERPRINT,
        }
        runtime = base / "runtime"
        bindir = runtime / "bin"
        bindir.mkdir(parents=True, mode=0o755)
        runtime.chmod(0o755)
        bindir.chmod(0o755)
        probe = (
            "#!" + os.sys.executable + "\n"
            "import json, sys\n"
            "if '-c' in sys.argv:\n"
            f"    print(json.dumps({report!r}))\n"
            "elif '-m' in sys.argv:\n"
            "    raise SystemExit(0)\n"
        )
        python = bindir / "python3"
        python.write_text(probe)
        python.chmod(0o755)
        return runtime

    def test_altered_archive_fails_before_any_installation_path_is_created(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            producer = self.copy_producer(root)
            archive = producer / "local-audit-1.2.2.tar.gz"
            archive.write_bytes(archive.read_bytes() + b"changed")
            target = root / "runtime-target"
            with self.assertRaisesRegex(installer.InstallError, "identity verification failed"):
                installer.apply_mode(producer, target, expected_uid=os.getuid(), require_root=False)
            self.assertFalse(target.exists())
            self.assertEqual(list(root.glob(".local-audit-1.2.2.install-*")), [])

    def test_wrong_collector_fingerprint_fails_before_installation(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            producer = self.copy_producer(root)
            identity_path = producer / "identity.json"
            identity = json.loads(identity_path.read_text())
            identity["collectorFingerprint"] = "0" * 64
            identity_path.write_text(json.dumps(identity))
            with self.assertRaisesRegex(installer.InstallError, "identity verification failed"):
                installer.load_accepted_source(producer)

    def test_wrong_dependency_version_fails_runtime_identity_check(self):
        report = {
            "packageVersion": installer.PACKAGE_VERSION,
            "setuptoolsVersion": installer.SETUPTOOLS_VERSION,
            "cryptographyVersion": "50.0.0",
            "collectorFingerprint": installer.COLLECTOR_FINGERPRINT,
        }
        with self.assertRaisesRegex(installer.InstallError, "version or collector fingerprint"):
            installer.validate_report(report)

    def test_dependency_install_uses_hash_mode_and_complete_runtime_lock(self):
        requirements = installer._dependency_requirements(12)
        for package in ("setuptools==80.9.0", "cryptography==50.0.1", "cffi==2.0.0", "pycparser==2.23"):
            self.assertIn(package, requirements)
        self.assertEqual(requirements.count("--hash=sha256:"), 9)
        self.assertEqual(installer.HASH_LOCKED_PIP_OPTIONS, ("--only-binary=:all:", "--require-hashes"))

    def test_pip_rejects_tampered_dependency_artifact(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            wheelhouse = root / "wheelhouse"
            wheelhouse.mkdir()
            wheel_name = "tamper_probe-0.0.1-py3-none-any.whl"
            wheel_contents = io.BytesIO()
            with zipfile.ZipFile(wheel_contents, "w") as archive:
                archive.writestr("tamper_probe.py", "VALUE = 1\n")
                archive.writestr(
                    "tamper_probe-0.0.1.dist-info/METADATA",
                    "Metadata-Version: 2.1\nName: tamper-probe\nVersion: 0.0.1\n\n",
                )
                archive.writestr(
                    "tamper_probe-0.0.1.dist-info/WHEEL",
                    "Wheel-Version: 1.0\nGenerator: test\nRoot-Is-Purelib: true\nTag: py3-none-any\n\n",
                )
                archive.writestr("tamper_probe-0.0.1.dist-info/RECORD", "")
            expected_hash = hashlib.sha256(wheel_contents.getvalue()).hexdigest()
            (wheelhouse / wheel_name).write_bytes(wheel_contents.getvalue() + b"substituted artifact")
            requirements = root / "requirements.txt"
            requirements.write_text(
                f"tamper-probe==0.0.1 --hash=sha256:{expected_hash}\n",
                encoding="utf-8",
            )
            venv = root / "venv"
            subprocess.run(
                [os.sys.executable, "-m", "venv", str(venv)],
                check=True,
                env=installer.SAFE_ENV,
                timeout=30,
            )
            result = subprocess.run(
                [
                    str(venv / "bin/python3"),
                    "-m",
                    "pip",
                    "install",
                    "--no-cache-dir",
                    *installer.HASH_LOCKED_PIP_OPTIONS,
                    "--no-index",
                    "--find-links",
                    str(wheelhouse),
                    "--target",
                    str(root / "installed"),
                    "-r",
                    str(requirements),
                ],
                check=False,
                text=True,
                capture_output=True,
                env=installer.SAFE_ENV,
                timeout=30,
            )
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("do not match the hashes", result.stderr.lower())
            self.assertFalse((root / "installed").exists())

    def test_existing_target_fails_closed_without_replacing_contents(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            producer = self.copy_producer(root)
            target = root / "runtime-target"
            target.mkdir()
            marker = target / "keep"
            marker.write_text("existing")
            with self.assertRaisesRegex(installer.InstallError, "Target already exists"):
                installer.apply_mode(producer, target, expected_uid=os.getuid(), require_root=False)
            self.assertEqual(marker.read_text(), "existing")
            self.assertEqual(list(root.glob(".local-audit-1.2.2.install-*")), [])

    def test_group_or_other_writable_runtime_code_fails(self):
        with tempfile.TemporaryDirectory() as temp:
            runtime = self.fake_runtime(Path(temp))
            (runtime / "bin/python3").chmod(0o775)
            with self.assertRaisesRegex(installer.InstallError, "Runtime Python ownership or permissions"):
                installer.validate_runtime_tree(runtime, os.getuid(), check_ancestors=False)

    def test_installed_runtime_contract_matches_cli_checks(self):
        with tempfile.TemporaryDirectory() as temp:
            runtime = self.fake_runtime(Path(temp))
            self.assertEqual(
                installer.validate_runtime_tree(runtime, os.getuid(), check_ancestors=False),
                installer.COLLECTOR_FINGERPRINT,
            )

    def test_full_install_validation_rejects_unsafe_ancestor(self):
        with tempfile.TemporaryDirectory() as temp:
            runtime = self.fake_runtime(Path(temp))
            with self.assertRaisesRegex(installer.InstallError, "Runtime code path ownership or permissions"):
                installer.validate_runtime_tree(runtime, os.getuid(), check_ancestors=True)

    def test_check_mode_uses_disposable_tree_and_leaves_fixed_target_untouched(self):
        with tempfile.TemporaryDirectory() as temp:
            producer = self.copy_producer(Path(temp))
            def fake_build(stage, _files, _final_runtime, _python, _uid, **_kwargs):
                (stage / "runtime").mkdir()
                (stage / "staging").mkdir(mode=0o700)
            with patch.object(installer, "_build_runtime", side_effect=fake_build):
                digest = installer.check_mode(producer, installer.TARGET)
            self.assertEqual(digest, installer.ARCHIVE_SHA256)
            self.assertFalse(installer.TARGET.exists())


if __name__ == "__main__":
    unittest.main()
