from __future__ import annotations

import importlib.util
import io
import json
import os
import shutil
import subprocess
import sys
import tarfile
import tempfile
import unittest
from pathlib import Path
from unittest import mock


TOOL_ROOT = Path(__file__).resolve().parents[1]
FIXTURES = Path(__file__).resolve().parent / "fixtures"
REPO_ROOT = TOOL_ROOT.parents[1]
SCRIPT = TOOL_ROOT / "supply_chain_gate.py"
IOC_FILE = REPO_ROOT / "security" / "supply-chain" / "emergency-iocs.tsv"
REVIEWS_FILE = REPO_ROOT / "security" / "supply-chain" / "lifecycle-reviews.tsv"
VENDORED_REVIEWS_HEADER = (
    "package\tversion\tpath\tsha256\tstatus\tsource\trationale\n"
)

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
        self.vendored_reviews = (
            self.root / "security" / "supply-chain" / "vendored-artifact-reviews.tsv"
        )
        self.vendored_reviews.parent.mkdir(parents=True)
        self.vendored_reviews.write_text(VENDORED_REVIEWS_HEADER, encoding="utf-8")
        self.write_package(dependencies or {})
        run(["git", "init", "--quiet"], self.root)
        run(["git", "config", "user.name", "WitnessOps fixture"], self.root)
        run(["git", "config", "user.email", "fixture@example.invalid"], self.root)
        run(
            [
                "git",
                "add",
                "package.json",
                "pnpm-lock.yaml",
                "security/supply-chain/vendored-artifact-reviews.tsv",
            ],
            self.root,
        )
        run(["git", "commit", "--quiet", "-m", "fixture baseline"], self.root)

    def write_package(self, dependencies: dict[str, str]) -> None:
        value = {"name": "inert-gate-fixture", "private": True, "dependencies": dependencies}
        (self.root / "package.json").write_text(json.dumps(value, indent=2) + "\n", encoding="utf-8")

    def replace_lock(self, fixture: str) -> None:
        shutil.copyfile(FIXTURES / fixture, self.root / "pnpm-lock.yaml")

    def write_review(
        self,
        package: str,
        version: str,
        path: str,
        digest: str,
        *,
        status: str = "APPROVED",
    ) -> None:
        self.vendored_reviews.write_text(
            VENDORED_REVIEWS_HEADER
            + f"{package}\t{version}\t{path}\t{digest}\t{status}\t"
            "fixture-authority@example.invalid\tExact inert fixture review.\n",
            encoding="utf-8",
        )

    def write_tarball(
        self,
        path: str,
        package: str,
        version: str,
        *,
        extra_member: str | None = None,
    ) -> Path:
        artifact = self.root / path
        artifact.parent.mkdir(parents=True, exist_ok=True)
        package_json = json.dumps(
            {"name": package, "version": version, "private": True},
            sort_keys=True,
        ).encode("utf-8")
        with tarfile.open(artifact, mode="w:gz") as archive:
            metadata = tarfile.TarInfo("package/package.json")
            metadata.size = len(package_json)
            metadata.mode = 0o644
            archive.addfile(metadata, io.BytesIO(package_json))
            if extra_member is not None:
                payload = b"inert"
                member = tarfile.TarInfo(extra_member)
                member.size = len(payload)
                member.mode = 0o644
                archive.addfile(member, io.BytesIO(payload))
        return artifact

    def write_local_dependency(self, package: str, version: str, path: str) -> None:
        self.write_package({package: f"file:{path}"})
        integrity = GATE.sha512_sri((self.root / path).read_bytes())
        (self.root / "pnpm-lock.yaml").write_text(
            "lockfileVersion: '9.0'\n"
            "importers:\n"
            "  .:\n"
            "    dependencies:\n"
            f"      {package}:\n"
            f"        specifier: file:{path}\n"
            f"        version: file:{path}\n"
            "packages:\n"
            f"  {package}@file:{path}:\n"
            f"    resolution: {{integrity: {integrity}, "
            f"tarball: file:{path}}}\n"
            f"    version: {version}\n"
            "snapshots:\n"
            f"  {package}@file:{path}: {{}}\n",
            encoding="utf-8",
        )

    def commit_all(self, message: str) -> None:
        run(["git", "add", "-A"], self.root)
        run(["git", "commit", "--quiet", "-m", message], self.root)

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

    def approved_local_dependency(
        self,
        *,
        package: str = "reviewed-package",
        version: str = "1.0.0",
        path: str = "vendor/reviewed-package-1.0.0.tgz",
        archive_package: str | None = None,
        archive_version: str | None = None,
        extra_member: str | None = None,
        approved_digest: str | None = None,
    ) -> tuple[SyntheticRepository, Path, str]:
        repository = self.repository("empty-pnpm-lock.yaml")
        artifact = repository.write_tarball(
            path,
            archive_package or package,
            archive_version or version,
            extra_member=extra_member,
        )
        artifact_bytes = artifact.read_bytes()
        digest = GATE.sha256_bytes(artifact_bytes)
        artifact.unlink()
        repository.write_review(
            package,
            version,
            path,
            approved_digest or digest,
        )
        repository.commit_all("establish reviewed artifact authority")
        artifact.write_bytes(artifact_bytes)
        repository.write_local_dependency(package, version, path)
        return repository, artifact, digest

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
            "--vendored-artifact-reviews",
            str(repository.vendored_reviews),
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

    def test_non_registry_package_source_fails_closed_without_exposing_url(self) -> None:
        repository = self.repository(
            "nonregistry-pnpm-lock.yaml", {"risky-package": "https://example.invalid/pkg.tgz"}
        )
        completed, result = self.invoke(repository)
        self.assertEqual(completed.returncode, 1)
        self.assertEqual(result["status"], "BLOCKED")
        self.assertIn("unsupported non-registry package source", result["blocked_reasons"][0])
        self.assertNotIn("example.invalid", json.dumps(result))
        self.assertNotIn("example.invalid", completed.stderr)
        with self.assertRaisesRegex(GATE.GateError, "unsupported non-registry package source"):
            GATE.parse_pnpm_lock((repository.root / "pnpm-lock.yaml").read_bytes())
        semver_key_with_external_tarball = b"""lockfileVersion: '9.0'
packages:
  risky-package@1.0.0:
    resolution: {'tarball': https://example.invalid/pkg.tgz, integrity: sha512-inert}
snapshots: {}
"""
        with self.assertRaisesRegex(GATE.GateError, "unsupported non-registry package source"):
            GATE.parse_pnpm_lock(semver_key_with_external_tarball)
        for spec in (
            "git+https://example.invalid/repo.git#commit",
            "github:example/repo#commit",
            "https://example.invalid/pkg.tgz",
            "../local-package",
            "example/repo#commit",
        ):
            with self.subTest(spec=spec):
                self.assertTrue(GATE.dependency_spec_is_unsupported(spec))
        for spec in ("^1.2.3", "latest", "npm:@scope/package@1.2.3", "workspace:*", "catalog:"):
            with self.subTest(spec=spec):
                self.assertFalse(GATE.dependency_spec_is_unsupported(spec))

    def test_unapproved_local_tgz_is_blocked(self) -> None:
        repository = self.repository("empty-pnpm-lock.yaml")
        repository.write_tarball(
            "vendor/unapproved-package-1.0.0.tgz", "unapproved-package", "1.0.0"
        )
        repository.write_local_dependency(
            "unapproved-package", "1.0.0", "vendor/unapproved-package-1.0.0.tgz"
        )
        completed, result = self.invoke(repository, base_ref="HEAD")
        self.assertEqual(completed.returncode, 1)
        self.assertEqual(result["status"], "BLOCKED")
        self.assertEqual(
            result["reviewed_artifacts"]["records"][0]["review_status"],
            "UNAPPROVED",
        )
        self.assertIn("unapproved local tarball dependency", completed.stderr)

    def test_exact_base_approved_local_tgz_is_accepted(self) -> None:
        repository, _, digest = self.approved_local_dependency()
        completed, result = self.invoke(repository, base_ref="HEAD")
        self.assertEqual(completed.returncode, 0, completed.stderr)
        self.assertEqual(result["status"], "PASS")
        record = result["reviewed_artifacts"]["records"][0]
        self.assertEqual(record["decision"], "ACCEPTED")
        self.assertEqual(record["artifact_sha256"], digest)
        self.assertEqual(record["source_class"], "reviewed-local-tarball")
        self.assertEqual(result["graph"]["package_count"], 1)

    def test_wrong_reviewed_artifact_sha_is_blocked(self) -> None:
        repository, _, _ = self.approved_local_dependency(approved_digest="0" * 64)
        completed, result = self.invoke(repository, base_ref="HEAD")
        self.assertEqual(completed.returncode, 1)
        self.assertIn("artifact SHA-256 differs from review", completed.stderr)
        self.assertEqual(result["reviewed_artifacts"]["records"][0]["decision"], "BLOCKED")

    def test_modified_tarball_bytes_are_blocked(self) -> None:
        repository, artifact, _ = self.approved_local_dependency()
        artifact.write_bytes(artifact.read_bytes() + b"modified")
        completed, _ = self.invoke(repository, base_ref="HEAD")
        self.assertEqual(completed.returncode, 1)
        self.assertIn("artifact SHA-256 differs from review", completed.stderr)

    def test_archive_package_name_mismatch_is_blocked(self) -> None:
        repository, _, _ = self.approved_local_dependency(
            archive_package="different-package"
        )
        completed, _ = self.invoke(repository, base_ref="HEAD")
        self.assertEqual(completed.returncode, 1)
        self.assertIn("archive package name differs", completed.stderr)

    def test_archive_package_version_mismatch_is_blocked(self) -> None:
        repository, _, _ = self.approved_local_dependency(archive_version="2.0.0")
        completed, _ = self.invoke(repository, base_ref="HEAD")
        self.assertEqual(completed.returncode, 1)
        self.assertIn("archive package version differs", completed.stderr)

    def test_tarball_inspection_streams_members(self) -> None:
        package_json = b'{"name":"reviewed-package","version":"1.0.0"}'
        member = tarfile.TarInfo("package/package.json")
        member.size = len(package_json)

        class StreamingArchive:
            def __enter__(self):
                return self

            def __exit__(self, *_args):
                return False

            def __iter__(self):
                yield member

            def getmembers(self):
                raise AssertionError("full archive materialization is forbidden")

            def extractfile(self, requested):
                self_outer.assertIs(requested, member)
                return io.BytesIO(package_json)

        self_outer = self
        with mock.patch.object(GATE.tarfile, "open", return_value=StreamingArchive()):
            result = GATE.inspect_npm_tarball(
                Path("unused.tgz"),
                "reviewed-package",
                "1.0.0",
                "streaming fixture",
            )
        self.assertEqual(result["archive_entry_count"], 1)

    def test_local_tarball_integrity_must_match_artifact_bytes(self) -> None:
        repository, artifact, _ = self.approved_local_dependency()
        integrity = GATE.sha512_sri(artifact.read_bytes())
        lockfile = repository.root / "pnpm-lock.yaml"
        lockfile.write_text(
            lockfile.read_text(encoding="utf-8").replace(integrity, "sha512-wrong"),
            encoding="utf-8",
        )
        completed, _ = self.invoke(repository, base_ref="HEAD")
        self.assertEqual(completed.returncode, 1)
        self.assertIn("integrity differs from artifact bytes", completed.stderr)

    def test_duplicate_inline_tarball_cannot_hide_remote_source(self) -> None:
        repository, _, _ = self.approved_local_dependency()
        path = "vendor/reviewed-package-1.0.0.tgz"
        lockfile = repository.root / "pnpm-lock.yaml"
        lockfile.write_text(
            lockfile.read_text(encoding="utf-8").replace(
                f"tarball: file:{path}}}",
                f"tarball: file:{path}, tarball: https://example.invalid/package.tgz}}",
            ),
            encoding="utf-8",
        )
        completed, _ = self.invoke(repository, base_ref="HEAD")
        self.assertEqual(completed.returncode, 1)
        self.assertIn("duplicate tarball field", completed.stderr)

    def test_local_tarball_package_requires_matching_importer_identity(self) -> None:
        repository, artifact, _ = self.approved_local_dependency()
        path = "vendor/reviewed-package-1.0.0.tgz"
        integrity = GATE.sha512_sri(artifact.read_bytes())
        (repository.root / "pnpm-lock.yaml").write_text(
            "lockfileVersion: '9.0'\n"
            "importers:\n"
            "  .: {}\n"
            "packages:\n"
            f"  reviewed-package@file:{path}:\n"
            f"    resolution: {{integrity: {integrity}, tarball: file:{path}}}\n"
            "    version: 1.0.0\n"
            "snapshots: {}\n",
            encoding="utf-8",
        )
        completed, _ = self.invoke(repository, base_ref="HEAD")
        self.assertEqual(completed.returncode, 1)
        self.assertIn("importer and package identities differ", completed.stderr)

    def test_registry_copy_of_reviewed_pair_still_gets_lifecycle_review(self) -> None:
        repository, _, _ = self.approved_local_dependency()
        lockfile = repository.root / "pnpm-lock.yaml"
        lockfile.write_text(
            lockfile.read_text(encoding="utf-8").replace(
                "snapshots:\n",
                "  reviewed-package@1.0.0:\n"
                "    resolution: {integrity: sha512-registry-copy}\n"
                "snapshots:\n",
            ),
            encoding="utf-8",
        )
        completed, result = self.invoke(
            repository,
            base_ref="HEAD",
            registry_fixture="registry-metadata.json",
        )
        self.assertEqual(completed.returncode, 0, completed.stderr)
        self.assertEqual(
            [record["package"] for record in result["lifecycle_review"]["records"]],
            ["reviewed-package"],
        )

    def test_dependency_path_traversal_is_blocked(self) -> None:
        repository = self.repository("empty-pnpm-lock.yaml")
        repository.write_package({"escape-package": "file:../escape-package.tgz"})
        completed, result = self.invoke(repository, base_ref="HEAD")
        self.assertEqual(completed.returncode, 1)
        self.assertIn("escapes repository root", completed.stderr)
        self.assertEqual(result["status"], "BLOCKED")

    def test_archive_member_path_traversal_is_blocked(self) -> None:
        repository, _, _ = self.approved_local_dependency(
            extra_member="package/../../escape"
        )
        completed, _ = self.invoke(repository, base_ref="HEAD")
        self.assertEqual(completed.returncode, 1)
        self.assertIn("archive contains a non-canonical member path", completed.stderr)

    def test_symlink_artifact_is_blocked(self) -> None:
        repository = self.repository("empty-pnpm-lock.yaml")
        target = repository.write_tarball(
            "vendor/real-package.tgz", "reviewed-package", "1.0.0"
        )
        digest = GATE.sha256_file(target)
        repository.write_review(
            "reviewed-package",
            "1.0.0",
            "vendor/reviewed-package-1.0.0.tgz",
            digest,
        )
        repository.commit_all("establish reviewed artifact authority")
        link = repository.root / "vendor" / "reviewed-package-1.0.0.tgz"
        os.symlink(target.name, link)
        repository.write_local_dependency(
            "reviewed-package", "1.0.0", "vendor/reviewed-package-1.0.0.tgz"
        )
        completed, _ = self.invoke(repository, base_ref="HEAD")
        self.assertEqual(completed.returncode, 1)
        self.assertIn("traverses a symlink", completed.stderr)

    def test_directory_file_dependency_remains_blocked(self) -> None:
        repository = self.repository("clean-pnpm-lock.yaml")
        (repository.root / "vendor" / "package").mkdir(parents=True)
        repository.write_package({"local-package": "file:vendor/package"})
        completed, result = self.invoke(repository, base_ref="HEAD")
        self.assertEqual(completed.returncode, 1)
        self.assertEqual(
            result["dependency_change"]["unsupported_sources"][0]["package"],
            "local-package",
        )

    def test_ordinary_local_file_dependency_remains_blocked(self) -> None:
        repository = self.repository("clean-pnpm-lock.yaml")
        repository.write_package({"local-package": "file:vendor/package.zip"})
        completed, result = self.invoke(repository, base_ref="HEAD")
        self.assertEqual(completed.returncode, 1)
        self.assertEqual(
            result["dependency_change"]["unsupported_sources"][0]["package"],
            "local-package",
        )

    def test_git_dependency_remains_blocked(self) -> None:
        repository = self.repository("clean-pnpm-lock.yaml")
        repository.write_package({"git-package": "git+https://example.invalid/pkg.git#deadbeef"})
        completed, result = self.invoke(repository, base_ref="HEAD")
        self.assertEqual(completed.returncode, 1)
        self.assertEqual(result["dependency_change"]["unsupported_sources"][0]["package"], "git-package")

    def test_remote_tarball_dependency_remains_blocked(self) -> None:
        repository = self.repository("clean-pnpm-lock.yaml")
        repository.write_package({"remote-package": "https://example.invalid/pkg.tgz"})
        completed, result = self.invoke(repository, base_ref="HEAD")
        self.assertEqual(completed.returncode, 1)
        self.assertEqual(result["dependency_change"]["unsupported_sources"][0]["package"], "remote-package")

    def test_link_dependency_remains_blocked(self) -> None:
        repository = self.repository("clean-pnpm-lock.yaml")
        repository.write_package({"link-package": "link:vendor/package"})
        completed, result = self.invoke(repository, base_ref="HEAD")
        self.assertEqual(completed.returncode, 1)
        self.assertEqual(result["dependency_change"]["unsupported_sources"][0]["package"], "link-package")

    def test_wildcard_artifact_approval_is_rejected(self) -> None:
        repository = self.repository("clean-pnpm-lock.yaml")
        repository.write_review(
            "reviewed-package",
            "1.0.0",
            "vendor/*.tgz",
            "0" * 64,
        )
        completed, _ = self.invoke(repository)
        self.assertEqual(completed.returncode, 1)
        self.assertIn("may not contain wildcards", completed.stderr)

    def test_approval_added_with_dependency_does_not_self_authorize(self) -> None:
        repository = self.repository("empty-pnpm-lock.yaml")
        artifact = repository.write_tarball(
            "vendor/reviewed-package-1.0.0.tgz", "reviewed-package", "1.0.0"
        )
        repository.write_review(
            "reviewed-package",
            "1.0.0",
            "vendor/reviewed-package-1.0.0.tgz",
            GATE.sha256_file(artifact),
        )
        repository.write_local_dependency(
            "reviewed-package", "1.0.0", "vendor/reviewed-package-1.0.0.tgz"
        )
        completed, result = self.invoke(repository, base_ref="HEAD")
        self.assertEqual(completed.returncode, 1)
        self.assertEqual(result["reviewed_artifacts"]["records"][0]["review_status"], "UNAPPROVED")
        self.assertTrue(
            result["reviewed_artifacts"]["authority"]["current_differs_from_authority"]
        )

    def test_approval_modified_with_dependency_does_not_change_base_authority(self) -> None:
        repository = self.repository("empty-pnpm-lock.yaml")
        repository.write_review(
            "other-package",
            "1.0.0",
            "vendor/other-package-1.0.0.tgz",
            "1" * 64,
        )
        repository.commit_all("establish unrelated review authority")
        artifact = repository.write_tarball(
            "vendor/reviewed-package-1.0.0.tgz", "reviewed-package", "1.0.0"
        )
        repository.write_review(
            "reviewed-package",
            "1.0.0",
            "vendor/reviewed-package-1.0.0.tgz",
            GATE.sha256_file(artifact),
        )
        repository.write_local_dependency(
            "reviewed-package", "1.0.0", "vendor/reviewed-package-1.0.0.tgz"
        )
        completed, result = self.invoke(repository, base_ref="HEAD")
        self.assertEqual(completed.returncode, 1)
        self.assertEqual(result["reviewed_artifacts"]["records"][0]["review_status"], "UNAPPROVED")

    def test_approval_for_another_artifact_cannot_authorize_dependency(self) -> None:
        repository = self.repository("empty-pnpm-lock.yaml")
        repository.write_review(
            "reviewed-package",
            "1.0.0",
            "vendor/other-package-1.0.0.tgz",
            "2" * 64,
        )
        repository.commit_all("establish other artifact authority")
        repository.write_tarball(
            "vendor/reviewed-package-1.0.0.tgz", "reviewed-package", "1.0.0"
        )
        repository.write_local_dependency(
            "reviewed-package", "1.0.0", "vendor/reviewed-package-1.0.0.tgz"
        )
        completed, _ = self.invoke(repository, base_ref="HEAD")
        self.assertEqual(completed.returncode, 1)
        self.assertIn("unapproved local tarball dependency", completed.stderr)

    def test_approval_only_change_passes_without_becoming_current_authority(self) -> None:
        repository = self.repository("clean-pnpm-lock.yaml", {"safe-package": "1.0.0"})
        repository.write_review(
            "future-package",
            "1.0.0",
            "vendor/future-package-1.0.0.tgz",
            "3" * 64,
        )
        completed, result = self.invoke(repository, base_ref="HEAD")
        self.assertEqual(completed.returncode, 0, completed.stderr)
        self.assertTrue(
            result["reviewed_artifacts"]["authority"]["current_differs_from_authority"]
        )
        self.assertEqual(result["reviewed_artifacts"]["records"], [])

    def test_reviewed_artifact_evidence_binds_exact_tuple(self) -> None:
        repository, _, digest = self.approved_local_dependency()
        authority_commit = run(["git", "rev-parse", "HEAD"], repository.root).stdout.strip()
        completed, result = self.invoke(repository, base_ref="HEAD")
        self.assertEqual(completed.returncode, 0, completed.stderr)
        record = result["reviewed_artifacts"]["records"][0]
        self.assertEqual(
            {
                key: record[key]
                for key in (
                    "package",
                    "version",
                    "source_class",
                    "path",
                    "artifact_sha256",
                    "review_status",
                    "review_source",
                )
            },
            {
                "package": "reviewed-package",
                "version": "1.0.0",
                "source_class": "reviewed-local-tarball",
                "path": "vendor/reviewed-package-1.0.0.tgz",
                "artifact_sha256": digest,
                "review_status": "APPROVED",
                "review_source": "fixture-authority@example.invalid",
            },
        )
        self.assertEqual(
            result["reviewed_artifacts"]["authority"]["authority_revision"],
            authority_commit,
        )
        self.assertEqual(
            result["reviewed_artifacts"]["lockfile_records"][0]["path"],
            "vendor/reviewed-package-1.0.0.tgz",
        )

    def test_pnpm_patched_dependencies_fail_closed(self) -> None:
        repository = self.repository("patched-pnpm-lock.yaml", {"safe-package": "1.0.0"})
        completed, result = self.invoke(repository)
        self.assertEqual(completed.returncode, 1)
        self.assertEqual(result["status"], "BLOCKED")
        self.assertIn("pnpm patched dependencies are unsupported", result["blocked_reasons"][0])
        self.assertNotIn("inert-safe-package.patch", json.dumps(result))
        with self.assertRaisesRegex(GATE.GateError, "pnpm patched dependencies are unsupported"):
            GATE.parse_pnpm_lock((repository.root / "pnpm-lock.yaml").read_bytes())
        patch_suffix_without_top_level_map = b"""lockfileVersion: '9.0'
packages:
  safe-package@1.0.0(patch_hash=inert-patch-hash):
    resolution: {integrity: sha512-inert-fixture}
snapshots: {}
"""
        with self.assertRaisesRegex(GATE.GateError, "pnpm patched dependencies are unsupported"):
            GATE.parse_pnpm_lock(patch_suffix_without_top_level_map)

        manifest_repository = self.repository(
            "clean-pnpm-lock.yaml", {"safe-package": "1.0.0"}
        )
        manifest = json.loads((manifest_repository.root / "package.json").read_text(encoding="utf-8"))
        manifest["pnpm"] = {
            "patchedDependencies": {
                "safe-package@1.0.0": "patches/inert-safe-package.patch"
            }
        }
        (manifest_repository.root / "package.json").write_text(
            json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
        )
        completed, result = self.invoke(manifest_repository)
        self.assertEqual(completed.returncode, 1)
        self.assertEqual(result["status"], "BLOCKED")
        self.assertEqual(
            result["dependency_change"]["unsupported_sources"][0]["dependency_field"],
            "pnpm.patchedDependencies",
        )
        self.assertNotIn("inert-safe-package.patch", json.dumps(result))

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

    def test_same_version_resolution_change_blocks_and_rechecks_lifecycle(self) -> None:
        repository = self.repository("clean-pnpm-lock.yaml", {"safe-package": "1.0.0"})
        lockfile = repository.root / "pnpm-lock.yaml"
        lockfile.write_text(
            lockfile.read_text(encoding="utf-8").replace(
                "sha512-inert-fixture", "sha512-substituted-fixture"
            ),
            encoding="utf-8",
        )
        completed, result = self.invoke(
            repository,
            base_ref="HEAD",
            osv_fixture="osv-vulnerable.json",
            registry_fixture="registry-metadata.json",
        )
        self.assertEqual(completed.returncode, 1)
        self.assertEqual(result["status"], "BLOCKED")
        self.assertEqual(
            result["dependency_change"]["resolution_changes"][0]["package"], "safe-package"
        )
        self.assertIn(
            "lockfile resolution changed without version change: safe-package@1.0.0",
            result["blocked_reasons"],
        )
        self.assertEqual(result["lifecycle_review"]["records"][0]["package"], "safe-package")
        self.assertTrue(result["matches"]["osv_advisories"][0]["introduced_by_change"])
        self.assertTrue(result["matches"]["osv_advisories"][0]["blocking"])

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
                    "node_modules/safe-package": {
                        "version": "1.0.0",
                        "resolved": "https://registry.npmjs.org/safe-package/-/safe-package-1.0.0.tgz",
                        "integrity": "sha512-inert",
                    },
                    "node_modules/@scope/tool": {"version": "2.0.0"},
                },
            }
        ).encode()
        yarn_lock = (
            b'safe-package@^1.0.0:\n  version "1.0.0"\n'
            b'  resolved "https://registry.yarnpkg.com/safe-package/-/safe-package-1.0.0.tgz#inert"\n'
            b'  integrity sha512-inert\n\n"@scope/tool@^2.0.0":\n  version "2.0.0"\n'
        )
        expected = {("safe-package", "1.0.0"), ("@scope/tool", "2.0.0")}
        self.assertEqual(GATE.parse_package_lock(package_lock), expected)
        self.assertEqual(GATE.parse_yarn_lock(yarn_lock), expected)
        package_resolutions = GATE.parse_package_lock_resolution_map(package_lock)
        yarn_resolutions = GATE.parse_yarn_resolution_map(yarn_lock)
        self.assertNotEqual(
            package_resolutions[("safe-package", "1.0.0")],
            GATE.parse_package_lock_resolution_map(package_lock.replace(b"sha512-inert", b"sha512-other"))[
                ("safe-package", "1.0.0")
            ],
        )
        self.assertNotEqual(
            yarn_resolutions[("safe-package", "1.0.0")],
            GATE.parse_yarn_resolution_map(yarn_lock.replace(b"sha512-inert", b"sha512-other"))[
                ("safe-package", "1.0.0")
            ],
        )

        untrusted_package_lock = package_lock.replace(
            b"https://registry.npmjs.org/safe-package/-/safe-package-1.0.0.tgz",
            b"https://example.invalid/safe-package.tgz",
        )
        with self.assertRaisesRegex(GATE.GateError, "unsupported non-registry package source"):
            GATE.parse_package_lock(untrusted_package_lock)

        untrusted_yarn_lock = yarn_lock.replace(
            b"https://registry.yarnpkg.com/safe-package/-/safe-package-1.0.0.tgz#inert",
            b"https://example.invalid/safe-package.tgz#inert",
        )
        with self.assertRaisesRegex(GATE.GateError, "unsupported non-registry package source"):
            GATE.parse_yarn_lock(untrusted_yarn_lock)

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
        self.assertNotEqual(
            GATE.parse_pnpm_resolution_map(lockfile)[("safe-package", "1.0.0")],
            GATE.parse_pnpm_resolution_map(lockfile.replace(b"sha512-inert", b"sha512-other"))[
                ("safe-package", "1.0.0")
            ],
        )


if __name__ == "__main__":
    unittest.main()
