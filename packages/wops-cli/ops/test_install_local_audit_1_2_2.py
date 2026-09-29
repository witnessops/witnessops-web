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

    def upgrade_target(self, root: Path, fingerprint: str) -> tuple[Path, dict[str, bytes]]:
        target = root / "local-audit-1.2.2"
        old_report = {
            "packageVersion": installer.PACKAGE_VERSION,
            "setuptoolsVersion": installer.SETUPTOOLS_VERSION,
            "cryptographyVersion": installer.CRYPTOGRAPHY_VERSION,
            "collectorFingerprint": fingerprint,
        }
        old_runtime = self.fake_runtime(root / "old", old_report)
        target.mkdir(mode=0o755)
        old_runtime.rename(target / "runtime")
        staging = target / "staging"
        staging.mkdir(mode=0o700)
        wops_staging = staging / "wops"
        wops_staging.mkdir(mode=0o700)
        attempt = wops_staging / "attempt-fixture"
        attempt.mkdir(mode=0o700)
        files = {
            "authority.json": b'{"authority":"retained-fixture"}\n',
            "pending.json": b'{"executionId":"fixture","captureStarted":true}\n',
        }
        for name, content in files.items():
            path = attempt / name
            path.write_bytes(content)
            path.chmod(0o600)
        return target, files

    def fake_upgrade_build(self, report: dict | None = None):
        def build(stage, _files, _final_runtime, _python, _uid, **_kwargs):
            self.fake_runtime(stage, report)
        return build

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
            root = Path(temp)
            producer = self.copy_producer(root)
            target = root / "runtime-target"
            def fake_build(stage, _files, _final_runtime, _python, _uid, **_kwargs):
                (stage / "runtime").mkdir()
                (stage / "staging").mkdir(mode=0o700)
            with patch.object(installer, "_build_runtime", side_effect=fake_build):
                digest = installer.check_mode(producer, target)
            self.assertEqual(digest, installer.ARCHIVE_SHA256)
            self.assertFalse(target.exists())

    def test_upgrade_swaps_only_runtime_and_preserves_retained_failed_attempt_bytes(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            producer = self.copy_producer(root)
            target, expected_files = self.upgrade_target(root, installer.PREVIOUS_COLLECTOR_FINGERPRINT)
            attempt = target / "staging/wops/attempt-fixture"
            before = {name: hashlib.sha256((attempt / name).read_bytes()).hexdigest() for name in expected_files}
            with patch.object(installer, "_build_runtime", side_effect=self.fake_upgrade_build()):
                archive_digest, evidence_before, evidence_after, disposition, rollback_reference = installer.upgrade_mode(
                    producer, target, expected_uid=os.getuid(), require_root=False
                )
            after = {name: hashlib.sha256((attempt / name).read_bytes()).hexdigest() for name in expected_files}
            self.assertEqual(before, after)
            self.assertEqual({name: (attempt / name).read_bytes() for name in expected_files}, expected_files)
            self.assertFalse((attempt / "capture.json").exists())
            self.assertEqual(
                installer.validate_runtime_tree(
                    target / "runtime", os.getuid(), check_ancestors=False,
                    expected_fingerprint=installer.COLLECTOR_FINGERPRINT,
                ),
                installer.COLLECTOR_FINGERPRINT,
            )
            self.assertEqual(archive_digest, installer.ARCHIVE_SHA256)
            self.assertEqual(len(evidence_before), 64)
            self.assertEqual(evidence_before, evidence_after)
            self.assertEqual(disposition, "retained-as-rollback-artifact")
            self.assertEqual(Path(rollback_reference).name, "runtime")
            self.assertTrue(Path(rollback_reference).is_dir())
            self.assertEqual(
                installer.validate_runtime_tree(
                    Path(rollback_reference), os.getuid(), check_ancestors=False,
                    expected_fingerprint=installer.PREVIOUS_COLLECTOR_FINGERPRINT,
                ),
                installer.PREVIOUS_COLLECTOR_FINGERPRINT,
            )
            self.assertEqual({entry.name for entry in target.iterdir()}, {"runtime", "staging"})
            self.assertEqual(len(list(target.parent.glob(".local-audit-1.2.2.upgrade-*"))), 1)

    def test_upgrade_refuses_unknown_current_fingerprint_before_build(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            target, _ = self.upgrade_target(root, "9" * 64)
            old_runtime_hash = hashlib.sha256((target / "runtime/bin/python3").read_bytes()).hexdigest()
            with patch.object(installer, "_build_runtime") as build:
                with self.assertRaisesRegex(installer.InstallError, "version or collector fingerprint"):
                    installer.upgrade_mode(target=target, expected_uid=os.getuid(), require_root=False)
                build.assert_not_called()
            self.assertEqual(hashlib.sha256((target / "runtime/bin/python3").read_bytes()).hexdigest(), old_runtime_hash)

    def test_upgrade_rolls_back_if_published_runtime_fails_final_verification(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            target, expected_files = self.upgrade_target(root, installer.PREVIOUS_COLLECTOR_FINGERPRINT)
            attempt = target / "staging/wops/attempt-fixture"
            before = {name: hashlib.sha256((attempt / name).read_bytes()).hexdigest() for name in expected_files}
            wrong_report = {
                "packageVersion": installer.PACKAGE_VERSION,
                "setuptoolsVersion": installer.SETUPTOOLS_VERSION,
                "cryptographyVersion": installer.CRYPTOGRAPHY_VERSION,
                "collectorFingerprint": "f" * 64,
            }
            with patch.object(installer, "_build_runtime", side_effect=self.fake_upgrade_build(wrong_report)):
                with self.assertRaisesRegex(installer.InstallError, "version or collector fingerprint"):
                    installer.upgrade_mode(target=target, expected_uid=os.getuid(), require_root=False)
            self.assertEqual(
                installer.validate_runtime_tree(
                    target / "runtime", os.getuid(), check_ancestors=False,
                    expected_fingerprint=installer.PREVIOUS_COLLECTOR_FINGERPRINT,
                ),
                installer.PREVIOUS_COLLECTOR_FINGERPRINT,
            )
            self.assertEqual(before, {name: hashlib.sha256((attempt / name).read_bytes()).hexdigest() for name in expected_files})
            self.assertEqual(list(target.parent.glob(".local-audit-1.2.2.upgrade-*")), [])


if __name__ == "__main__":
    unittest.main()
