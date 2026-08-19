from __future__ import annotations

import importlib.util
import subprocess
import tempfile
import unittest
from pathlib import Path


TOOL_ROOT = Path(__file__).resolve().parents[1]
SCRIPT = TOOL_ROOT / "resolve_release_source.py"
SPEC = importlib.util.spec_from_file_location("resolve_release_source", SCRIPT)
assert SPEC is not None and SPEC.loader is not None
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


def git(repo: Path, *arguments: str) -> str:
    completed = subprocess.run(
        ["git", "-C", str(repo), *arguments],
        check=True,
        capture_output=True,
        text=True,
    )
    return completed.stdout.strip()


class ReleaseSourceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_dir = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp_dir.cleanup)
        self.repo = Path(self.temp_dir.name) / "repo"
        self.repo.mkdir()
        git(self.repo, "init", "--initial-branch=main")
        git(self.repo, "config", "user.name", "WitnessOps Test")
        git(self.repo, "config", "user.email", "test@example.invalid")
        (self.repo / "state.txt").write_text("initial\n", encoding="utf-8")
        git(self.repo, "add", "state.txt")
        git(self.repo, "commit", "-m", "initial")
        (self.repo / "state.txt").write_text("release\n", encoding="utf-8")
        git(self.repo, "commit", "-am", "release")
        self.main_sha = git(self.repo, "rev-parse", "HEAD")
        git(self.repo, "update-ref", "refs/remotes/origin/main", self.main_sha)

    def resolve(self, version: str = "v1.2.3") -> dict[str, str]:
        return MODULE.resolve_release_source(
            self.repo,
            version,
            "refs/remotes/origin/main",
        )

    def test_lightweight_tag_on_main_resolves_exact_commits(self) -> None:
        git(self.repo, "tag", "v1.2.3")
        result = self.resolve()

        self.assertEqual(result["tag_ref"], "refs/tags/v1.2.3")
        self.assertEqual(result["commit_sha"], self.main_sha)
        self.assertEqual(result["base_ref"], git(self.repo, "rev-parse", "HEAD^"))
        self.assertRegex(result["base_ref"], r"^[0-9a-f]{40}$")

    def test_annotated_tag_on_main_resolves_peeled_commit(self) -> None:
        git(self.repo, "tag", "-a", "v1.2.3", "-m", "release")
        self.assertEqual(self.resolve()["commit_sha"], self.main_sha)

    def test_semver_named_branch_without_tag_is_rejected(self) -> None:
        git(self.repo, "branch", "v1.2.3")
        with self.assertRaisesRegex(
            MODULE.ReleaseSourceError,
            "required release tag refs/tags/v1.2.3 does not exist",
        ):
            self.resolve()

    def test_tag_outside_main_ancestry_is_rejected(self) -> None:
        git(self.repo, "switch", "--detach", "HEAD^")
        (self.repo / "off-main.txt").write_text("unreviewed\n", encoding="utf-8")
        git(self.repo, "add", "off-main.txt")
        git(self.repo, "commit", "-m", "off main")
        git(self.repo, "tag", "v1.2.3")

        with self.assertRaisesRegex(
            MODULE.ReleaseSourceError,
            "is not descended from refs/remotes/origin/main",
        ):
            self.resolve()

    def test_moved_tag_is_revalidated_against_main(self) -> None:
        git(self.repo, "tag", "v1.2.3", self.main_sha)
        self.assertEqual(self.resolve()["commit_sha"], self.main_sha)
        git(self.repo, "switch", "--detach", "HEAD^")
        (self.repo / "moved.txt").write_text("moved\n", encoding="utf-8")
        git(self.repo, "add", "moved.txt")
        git(self.repo, "commit", "-m", "moved tag target")
        git(self.repo, "tag", "--force", "v1.2.3")

        with self.assertRaises(MODULE.ReleaseSourceError):
            self.resolve()

    def test_non_semver_input_is_rejected_as_data(self) -> None:
        marker = Path(self.temp_dir.name) / "should-not-exist"
        with self.assertRaisesRegex(MODULE.ReleaseSourceError, "is not a vX.Y.Z"):
            self.resolve(f"v1.2.3;touch {marker}")
        self.assertFalse(marker.exists())


if __name__ == "__main__":
    unittest.main()
