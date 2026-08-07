from __future__ import annotations

import importlib.util
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


TOOL_ROOT = Path(__file__).resolve().parents[1]
FIXTURES = Path(__file__).resolve().parent / "fixtures"
REPO_ROOT = TOOL_ROOT.parents[1]
SCRIPT = TOOL_ROOT / "supply_chain_gate.py"
IOC_FILE = REPO_ROOT / "security" / "supply-chain" / "emergency-iocs.tsv"
REVIEWS_FILE = REPO_ROOT / "security" / "supply-chain" / "lifecycle-reviews.tsv"

SPEC = importlib.util.spec_from_file_location("supply_chain_gate", SCRIPT)
assert SPEC and SPEC.loader
GATE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(GATE)


def run(command: list[str], cwd: Path, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, cwd=cwd, check=check, text=True, capture_output=True)


class SyntheticRepository:
    def __init__(self, lock_fixture: str, dependencies: dict[str, str] | None = None):
        self._temp = tempfile.TemporaryDirectory(prefix="witnessops-supply-chain-test-")
        self.root = Path(self._temp.name)
        shutil.copyfile(FIXTURES / lock_fixture, self.root / "pnpm-lock.yaml")
        self.write_package(dependencies or {})
        run(["git", "init", "--quiet"], self.root)
        run(["git", "config", "user.name", "WitnessOps fixture"], self.root)
        run(["git", "config", "user.email", "fixture@example.invalid"], self.root)
        run(["git", "add", "package.json", "pnpm-lock.yaml"], self.root)
        run(["git", "commit", "--quiet", "-m", "fixture baseline"], self.root)

    def write_package(self, dependencies: dict[str, str]) -> None:
        value = {"name": "inert-gate-fixture", "private": True, "dependencies": dependencies}
        (self.root / "package.json").write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")

    def replace_lock(self, fixture: str) -> None:
        shutil.copyfile(FIXTURES / fixture, self.root / "pnpm-lock.yaml")

    def close(self) -> None:
        self._temp.cleanup()


class SupplyChainGateTests(unittest.TestCase):
    def setUp(self) -> None:
        self.repositories: list[SyntheticRepository] = []

    def tearDown(self) -> None:
        for repository in self.repositories:
            repository.close()

    def repository(self, lock_fixture: str, dependencies: dict[str, str] | None = None) -> SyntheticRepository:
        repository = SyntheticRepository(lock_fixture, dependencies)
        self.repositories.append(repository)
        return repository

    def invoke(
        self,
        repository: SyntheticRepository,
        *,
        osv_fixture: str = "osv-clean.json",
        base_ref: str | None = None,
        registry_fixture: str | None = None,
        ioc_file: Path | None = None,
        reviews_file: Path | None = None,
        lockfile: str | Path = "pnpm-lock.yaml",
    ) -> tuple[subprocess.CompletedProcess[str], dict]:
        output = repository.root / "out"
        command = [
            sys.executable,
            str(SCRIPT),
            "--repo-root",
            str(repository.root),
            "--lockfile",
            str(lockfile),
            "--ioc-file",
            str(ioc_file or IOC_FILE),
            "--lifecycle-reviews",
            str(reviews_file or REVIEWS_FILE),
            "--osv-snapshot",
            str(FIXTURES / osv_fixture),
            "--output-dir",
            str(output),
        ]
        if base_ref:
            command.extend(["--base-ref", base_ref])
        if registry_fixture:
            command.extend(["--registry-metadata-snapshot", str(FIXTURES / registry_fixture)])
        completed = run(command, repository.root, check=False)
        result = json.loads((output / "gate-result.json").read_text(encoding="utf-8"))
        return completed, result

    def test_clean_lockfile_passes_quietly(self) -> None:
        repository = self.repository("clean-pnpm-lock.yaml", {"safe-package": "1.0.0"})
        completed, result = self.invoke(repository)
        self.assertEqual(completed.returncode, 0, completed.stderr)
        self.assertRegex(completed.stdout, r"^PASS packages=1 graph_sha256=[0-9a-f]{64}\n$")
        self.assertEqual(result["status"], "PASS")
        self.assertEqual(result["graph"]["package_count"], 1)

    def test_external_lockfile_fails_closed_with_structured_evidence(self) -> None:
        repository = self.repository("clean-pnpm-lock.yaml", {"safe-package": "1.0.0"})
        with tempfile.TemporaryDirectory(prefix="witnessops-external-lockfile-") as temporary:
            external_lockfile = Path(temporary) / "pnpm-lock.yaml"
            shutil.copyfile(FIXTURES / "clean-pnpm-lock.yaml", external_lockfile)
            completed, result = self.invoke(repository, lockfile=external_lockfile)
            self.assertEqual(completed.returncode, 1)
            self.assertEqual(result["status"], "BLOCKED")
            self.assertIn("lockfile must be inside repository root", result["blocked_reasons"][0])
            with self.assertRaisesRegex(GATE.GateError, "lockfile must be inside repository root"):
                GATE.base_graph(repository.root, "HEAD", [external_lockfile])

    def test_campaign_versions_block_without_installing(self) -> None:
        for fixture, package, version in (
            ("keyv-pnpm-lock.yaml", "keyv", "6.0.0"),
            ("flat-cache-pnpm-lock.yaml", "flat-cache", "6.1.24"),
            ("file-entry-cache-pnpm-lock.yaml", "file-entry-cache", "11.1.6"),
        ):
            with self.subTest(package=package):
                repository = self.repository(fixture, {package: version})
                completed, result = self.invoke(repository)
                self.assertEqual(completed.returncode, 1)
                self.assertEqual(result["status"], "BLOCKED")
                self.assertIn(f"emergency IOC match: {package}@{version}", result["blocked_reasons"])

    def test_existing_osv_vulnerability_is_recorded_without_widening_gate(self) -> None:
        repository = self.repository("clean-pnpm-lock.yaml", {"safe-package": "1.0.0"})
        completed, result = self.invoke(repository, osv_fixture="osv-vulnerable.json")
        self.assertEqual(completed.returncode, 0)
        self.assertEqual(result["matches"]["osv_advisories"][0]["advisory"], "GHSA-inert-test-only")
        self.assertFalse(result["matches"]["osv_advisories"][0]["blocking"])

    def test_new_osv_vulnerable_version_blocks(self) -> None:
        repository = self.repository("empty-pnpm-lock.yaml")
        repository.write_package({"safe-package": "1.0.0"})
        repository.replace_lock("clean-pnpm-lock.yaml")
        completed, result = self.invoke(
            repository,
            osv_fixture="osv-vulnerable.json",
            base_ref="HEAD",
            registry_fixture="registry-metadata.json",
        )
        self.assertEqual(completed.returncode, 1)
        self.assertEqual(result["matches"]["osv_advisories"][0]["advisory"], "GHSA-inert-test-only")
        self.assertTrue(result["matches"]["osv_advisories"][0]["blocking"])

    def test_osv_malicious_package_blocks_even_without_a_diff(self) -> None:
        repository = self.repository("clean-pnpm-lock.yaml", {"safe-package": "1.0.0"})
        completed, result = self.invoke(repository, osv_fixture="osv-malicious.json")
        self.assertEqual(completed.returncode, 1)
        advisory = result["matches"]["osv_advisories"][0]
        self.assertEqual(advisory["classification"], "malicious_package")
        self.assertTrue(advisory["blocking"])

    def test_manifest_dependency_change_without_lockfile_blocks(self) -> None:
        repository = self.repository("clean-pnpm-lock.yaml", {"safe-package": "1.0.0"})
        repository.write_package({"safe-package": "2.0.0"})
        completed, result = self.invoke(repository, base_ref="HEAD")
        self.assertEqual(completed.returncode, 1)
        self.assertEqual(result["dependency_change"]["status"], "BLOCKED")
        self.assertEqual(result["dependency_change"]["semantic_manifest_changes"], ["package.json"])

    def test_formatting_only_manifest_change_does_not_require_lockfile(self) -> None:
        repository = self.repository("clean-pnpm-lock.yaml", {"safe-package": "1.0.0"})
        (repository.root / "package.json").write_text(
            '{\n    "dependencies": {"safe-package": "1.0.0"},\n    "private": true,\n    "name": "inert-gate-fixture"\n}\n',
            encoding="utf-8",
        )
        completed, result = self.invoke(repository, base_ref="HEAD")
        self.assertEqual(completed.returncode, 0, completed.stderr)
        self.assertEqual(result["dependency_change"]["semantic_manifest_changes"], [])

    def test_new_lifecycle_script_is_hashed_and_blocks(self) -> None:
        repository = self.repository("empty-pnpm-lock.yaml")
        repository.write_package({"risky-package": "1.0.0"})
        repository.replace_lock("risky-pnpm-lock.yaml")
        completed, result = self.invoke(
            repository,
            base_ref="HEAD",
            registry_fixture="registry-metadata.json",
        )
        self.assertEqual(completed.returncode, 1, completed.stderr)
        record = result["lifecycle_review"]["records"][0]
        self.assertEqual(record["package"], "risky-package")
        self.assertEqual(record["scripts"], {"preinstall": "node setup.mjs"})
        self.assertRegex(record["scripts_sha256"], r"^[0-9a-f]{64}$")
        self.assertRegex(record["metadata_sha256"], r"^[0-9a-f]{64}$")
        self.assertIn("binary_launcher", record["indicators"])
        self.assertEqual(record["review_outcome"], "REVIEW_REQUIRED")
        self.assertEqual(record["script_reviews"][0]["phase"], "preinstall")
        self.assertRegex(record["script_reviews"][0]["script_sha256"], r"^[0-9a-f]{64}$")

    def test_lifecycle_review_binds_package_version_phase_and_script_text_hash(self) -> None:
        script = "ts-scripts install && npm run build"
        script_sha256 = GATE.sha256_bytes(script.encode("utf-8"))
        with tempfile.TemporaryDirectory(prefix="witnessops-lifecycle-review-") as temporary:
            ledger = Path(temporary) / "reviews.tsv"
            ledger.write_text(
                "package\tversion\tphase\tscript_sha256\treviewed_at\toutcome\tsource\tnote\n"
                f"content-type\t2.0.0\tprepare\t{script_sha256}\t2026-08-07\tAPPROVED\t"
                "https://registry.npmjs.org/content-type/2.0.0\tStatic package-context review.\n",
                encoding="utf-8",
            )
            reviews = GATE.load_lifecycle_reviews(ledger)

        def metadata_loader(pair: tuple[str, str]) -> tuple[dict, str]:
            return (
                {"name": pair[0], "version": pair[1], "scripts": {"prepare": script}},
                f"fixture://{pair[0]}@{pair[1]}",
            )

        records, blocked, degraded = GATE.evaluate_lifecycle(
            [("content-type", "2.0.0"), ("path-to-regexp", "8.4.2")],
            reviews,
            metadata_loader,
        )
        self.assertEqual(degraded, [])
        self.assertEqual(records[0]["review_outcome"], "APPROVED")
        self.assertEqual(records[0]["script_reviews"][0]["phase"], "prepare")
        self.assertEqual(records[0]["script_reviews"][0]["script_sha256"], script_sha256)
        self.assertEqual(records[1]["review_outcome"], "REVIEW_REQUIRED")
        self.assertEqual(len(blocked), 1)
        self.assertIn("path-to-regexp@8.4.2 prepare", blocked[0])

    def test_blocked_lifecycle_review_applies_without_a_dependency_diff(self) -> None:
        repository = self.repository("risky-pnpm-lock.yaml", {"risky-package": "1.0.0"})
        script_sha256 = GATE.sha256_bytes(b"node setup.mjs")
        ledger = repository.root / "blocked-reviews.tsv"
        ledger.write_text(
            "package\tversion\tphase\tscript_sha256\treviewed_at\toutcome\tsource\tnote\n"
            f"risky-package\t1.0.0\tpreinstall\t{script_sha256}\t2026-08-07\tBLOCKED\t"
            "fixture://risky-package@1.0.0\tExplicit rejection.\n",
            encoding="utf-8",
        )
        completed, result = self.invoke(
            repository,
            registry_fixture="registry-metadata.json",
            reviews_file=ledger,
        )
        self.assertEqual(completed.returncode, 1)
        self.assertEqual(result["status"], "BLOCKED")
        self.assertIn("lifecycle review blocks risky-package@1.0.0 preinstall", completed.stderr)

    def test_malformed_osv_snapshot_is_coverage_degraded(self) -> None:
        repository = self.repository("clean-pnpm-lock.yaml", {"safe-package": "1.0.0"})
        completed, result = self.invoke(repository, osv_fixture="osv-malformed.json")
        self.assertEqual(completed.returncode, 2)
        self.assertEqual(result["status"], "COVERAGE DEGRADED")

    def test_malformed_emergency_ioc_source_is_coverage_degraded(self) -> None:
        repository = self.repository("clean-pnpm-lock.yaml", {"safe-package": "1.0.0"})
        malformed_ioc = repository.root / "malformed-iocs.tsv"
        malformed_ioc.write_text("package\tversion\nkeyv\t6.0.0\n", encoding="utf-8")
        completed, result = self.invoke(repository, ioc_file=malformed_ioc)
        self.assertEqual(completed.returncode, 2)
        self.assertEqual(result["status"], "COVERAGE DEGRADED")
        self.assertIn("emergency IOC coverage unavailable", result["degraded_reasons"][0])

    def test_graph_hash_is_deterministic(self) -> None:
        pairs = {("z-package", "2.0.0"), ("a-package", "1.0.0"), ("z-package", "2.0.0")}
        first = GATE.canonical_graph_bytes(pairs)
        second = GATE.canonical_graph_bytes(reversed(sorted(pairs)))
        self.assertEqual(first, second)
        self.assertEqual(GATE.sha256_bytes(first), GATE.sha256_bytes(second))

    def test_lifecycle_indicator_categories_are_static(self) -> None:
        indicators = GATE.script_indicators(
            {
                "install": (
                    "node -e \"require('child_process').execSync('curl https://example.invalid')\" "
                    "&& git config core.hooksPath hooks"
                )
            }
        )
        self.assertEqual(
            indicators,
            [
                "binary_launcher",
                "credential_or_persistence",
                "network_download",
                "shell_or_powershell",
            ],
        )

    def test_package_lock_and_yarn_lock_parsers(self) -> None:
        package_lock = json.dumps(
            {
                "lockfileVersion": 3,
                "packages": {
                    "": {"name": "fixture"},
                    "node_modules/safe-package": {"version": "1.0.0"},
                    "node_modules/@scope/tool": {"version": "2.0.0"},
                },
            }
        ).encode()
        yarn_lock = b'safe-package@^1.0.0:\n  version "1.0.0"\n\n"@scope/tool@^2.0.0":\n  version "2.0.0"\n'
        expected = {("safe-package", "1.0.0"), ("@scope/tool", "2.0.0")}
        self.assertEqual(GATE.parse_package_lock(package_lock), expected)
        self.assertEqual(GATE.parse_yarn_lock(yarn_lock), expected)

    def test_pnpm_parser_ignores_nested_peer_metadata(self) -> None:
        lockfile = b"""lockfileVersion: '9.0'
packages:
  '@scope/tool@2.0.0(peer@1.0.0)':
    peerDependencies:
      '@scope/peer': 1.0.0
  safe-package@1.0.0:
    resolution: {integrity: sha512-inert}
snapshots: {}
"""
        self.assertEqual(
            GATE.parse_pnpm_lock(lockfile),
            {("@scope/tool", "2.0.0"), ("safe-package", "1.0.0")},
        )


if __name__ == "__main__":
    unittest.main()
