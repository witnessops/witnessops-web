import hashlib
import importlib.util
import io
import json
import os
import subprocess
import sys
import tarfile
import tempfile
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).with_name("static_release.py")
SPEC = importlib.util.spec_from_file_location("academy_static_release", MODULE_PATH)
release = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(release)


def source_head():
    return subprocess.check_output(
        ["git", "-C", str(release.REPO_ROOT), "rev-parse", "HEAD"], text=True
    ).strip()


def bundle():
    source = source_head()
    archive, manifest = release.make_bundle(release.REPO_ROOT, source)
    return source, archive, manifest, release.sha256(archive), release.sha256(manifest)


class StaticReleaseTests(unittest.TestCase):
    def test_public_git_tree_is_deterministic_and_excludes_nonpublic_files(self):
        source, archive, manifest, archive_hash, manifest_hash = bundle()
        self.assertEqual((archive, manifest), release.make_bundle(release.REPO_ROOT, source))
        parsed, files = release.verify_bundle(
            archive, manifest, source, archive_hash, manifest_hash
        )
        self.assertEqual(parsed["source_commit"], source)
        self.assertIn("index.html", files)
        self.assertIn("lessons/report-or-evidence/index.html", files)
        self.assertIn("lessons/reported-versus-saved/index.html", files)
        self.assertIn("workbook/index.html", files)
        self.assertTrue(all(not name.startswith("docs/") for name in files))
        self.assertTrue(all(not name.startswith(".") for name in files))

    def test_stage_activate_and_guarded_first_release_rollback(self):
        source, archive, manifest, archive_hash, manifest_hash = bundle()
        with tempfile.TemporaryDirectory() as scratch:
            root = Path(scratch) / "academy"
            owner = os.getuid()
            self.assertTrue(release.stage(
                root, archive, manifest, source, archive_hash, manifest_hash, owner
            )["staged"])
            self.assertFalse(release.stage(
                root, archive, manifest, source, archive_hash, manifest_hash, owner
            )["staged"])
            self.assertEqual(release.current_source(root), "absent")
            self.assertEqual(release.activate(
                root, source, "absent", manifest_hash, owner
            )["current"], source)
            self.assertEqual(release.current_source(root), source)
            with self.assertRaises(release.ReleaseError):
                release.activate(root, "absent", "absent", "", owner)
            self.assertEqual(release.activate(
                root, "absent", source, "", owner
            )["current"], "absent")
            self.assertEqual(release.current_source(root), "absent")
            self.assertTrue((root / "releases" / source / "public" / "index.html").is_file())

    def test_installed_file_drift_blocks_activation(self):
        source, archive, manifest, archive_hash, manifest_hash = bundle()
        with tempfile.TemporaryDirectory() as scratch:
            root = Path(scratch) / "academy"
            owner = os.getuid()
            release.stage(root, archive, manifest, source, archive_hash, manifest_hash, owner)
            homepage = root / "releases" / source / "public" / "index.html"
            homepage.write_bytes(b"changed after staging")
            with self.assertRaisesRegex(release.ReleaseError, "unsafe|size|digest"):
                release.activate(root, source, "absent", manifest_hash, owner)
            self.assertEqual(release.current_source(root), "absent")

    def test_mode_only_drift_blocks_activation(self):
        source, archive, manifest, archive_hash, manifest_hash = bundle()
        with tempfile.TemporaryDirectory() as scratch:
            root = Path(scratch) / "academy"
            owner = os.getuid()
            release.stage(root, archive, manifest, source, archive_hash, manifest_hash, owner)
            homepage = root / "releases" / source / "public" / "index.html"
            homepage.chmod(0o600)
            with self.assertRaisesRegex(release.ReleaseError, "unsafe"):
                release.activate(root, source, "absent", manifest_hash, owner)
            self.assertEqual(release.current_source(root), "absent")

    def test_fifo_inputs_and_installed_manifest_fail_without_blocking(self):
        source, archive, manifest, archive_hash, manifest_hash = bundle()
        with tempfile.TemporaryDirectory() as scratch:
            root = Path(scratch) / "academy"
            fifo = Path(scratch) / "input-fifo"
            os.mkfifo(fifo)
            verify = subprocess.run(
                [sys.executable, str(MODULE_PATH), "verify", "--archive", str(fifo),
                 "--manifest", str(fifo), "--source-commit", source,
                 "--archive-sha256", archive_hash, "--manifest-sha256", manifest_hash],
                capture_output=True, text=True, timeout=3,
            )
            self.assertNotEqual(verify.returncode, 0)
            self.assertIn("bounded regular file", verify.stderr)
            release.stage(root, archive, manifest, source, archive_hash, manifest_hash, os.getuid())
            installed = root / "releases" / source / "manifest.json"
            installed.unlink()
            os.mkfifo(installed)
            installed.chmod(0o644)
            code = (
                "import importlib.util,os,pathlib,sys;"
                "s=importlib.util.spec_from_file_location('release',sys.argv[1]);"
                "m=importlib.util.module_from_spec(s);s.loader.exec_module(m);"
                "m.activate(pathlib.Path(sys.argv[2]),sys.argv[3],'absent',sys.argv[4],os.getuid())"
            )
            activation = subprocess.run(
                [sys.executable, "-c", code, str(MODULE_PATH), str(root), source, manifest_hash],
                capture_output=True, text=True, timeout=3,
            )
            self.assertNotEqual(activation.returncode, 0)
            self.assertIn("bounded regular file", activation.stderr)
            self.assertEqual(release.current_source(root), "absent")

    def test_archive_requires_external_digests_and_exact_file_set(self):
        source, archive, manifest, archive_hash, manifest_hash = bundle()
        with self.assertRaisesRegex(release.ReleaseError, "archive size or digest"):
            release.verify_bundle(archive + b"x", manifest, source, archive_hash, manifest_hash)
        with self.assertRaisesRegex(release.ReleaseError, "manifest digest"):
            release.verify_bundle(archive, manifest + b" ", source, archive_hash, manifest_hash)
        altered = json.loads(manifest)
        altered["files"] = altered["files"][:-1]
        altered_manifest = (json.dumps(altered, sort_keys=True, separators=(",", ":")) + "\n").encode()
        with self.assertRaisesRegex(release.ReleaseError, "path sets"):
            release.verify_bundle(
                archive, altered_manifest, source, archive_hash, release.sha256(altered_manifest)
            )

    def test_self_consistent_link_archive_is_still_rejected(self):
        source = source_head()
        stream = io.BytesIO()
        with tarfile.open(fileobj=stream, mode="w", format=tarfile.USTAR_FORMAT) as archive:
            link = tarfile.TarInfo("assets/link.svg")
            link.type = tarfile.SYMTYPE
            link.linkname = "/etc/passwd"
            archive.addfile(link)
            homepage = tarfile.TarInfo("index.html")
            homepage.size = 2
            homepage.mode = 0o644
            archive.addfile(homepage, io.BytesIO(b"ok"))
        archive_bytes = stream.getvalue()
        manifest = {
            "schema_version": 1,
            "source_commit": source,
            "archive_sha256": release.sha256(archive_bytes),
            "files": [
                {"path": "assets/link.svg", "size": 0, "sha256": hashlib.sha256(b"").hexdigest()},
                {"path": "index.html", "size": 2, "sha256": hashlib.sha256(b"ok").hexdigest()},
            ],
        }
        manifest_bytes = (json.dumps(manifest, sort_keys=True, separators=(",", ":")) + "\n").encode()
        with self.assertRaisesRegex(release.ReleaseError, "unsupported entry"):
            release.verify_bundle(
                archive_bytes, manifest_bytes, source, release.sha256(archive_bytes),
                release.sha256(manifest_bytes),
            )

    def test_rejects_hidden_traversing_and_unsupported_paths(self):
        for path in (".env", "docs/../answer-key.html", "docs/.secret.js", "/index.html", "image.jpg"):
            with self.subTest(path=path), self.assertRaises(release.ReleaseError):
                release.public_path(path)

    def test_git_tree_rejects_a_committed_symlink(self):
        with tempfile.TemporaryDirectory() as scratch:
            repo = Path(scratch)
            public = repo / release.PUBLIC_TREE
            public.mkdir(parents=True)
            (public / "index.html").write_text("home")
            (public / "asset.svg").symlink_to("/etc/passwd")
            subprocess.run(["git", "init", "-q", str(repo)], check=True)
            subprocess.run(["git", "-C", str(repo), "add", "--", release.PUBLIC_TREE], check=True)
            subprocess.run([
                "git", "-C", str(repo), "-c", "user.name=Academy Test",
                "-c", "user.email=academy-test@example.invalid", "commit", "-qm", "fixture"
            ], check=True)
            source = subprocess.check_output(["git", "-C", str(repo), "rev-parse", "HEAD"], text=True).strip()
            with self.assertRaisesRegex(release.ReleaseError, "link|nonregular"):
                release.source_files(repo, source)


if __name__ == "__main__":
    unittest.main()
