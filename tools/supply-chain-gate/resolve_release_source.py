#!/usr/bin/env python3
"""Resolve one authorized release tag to immutable Git commits."""

from __future__ import annotations

import argparse
import re
import subprocess
from pathlib import Path


SEMVER_TAG = re.compile(r"^v[0-9]+\.[0-9]+\.[0-9]+$")
FULL_SHA = re.compile(r"^[0-9a-f]{40}$")


class ReleaseSourceError(RuntimeError):
    """Raised when a release ref cannot satisfy the source-authority contract."""


def run_git(repo_root: Path, *arguments: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", "-C", str(repo_root), *arguments],
        check=False,
        capture_output=True,
        text=True,
    )


def require_commit(repo_root: Path, revision: str, label: str) -> str:
    completed = run_git(
        repo_root,
        "rev-parse",
        "--verify",
        "--end-of-options",
        f"{revision}^{{commit}}",
    )
    commit = completed.stdout.strip()
    if completed.returncode != 0 or not FULL_SHA.fullmatch(commit):
        raise ReleaseSourceError(f"{label} does not resolve to one commit")
    return commit


def resolve_release_source(
    repo_root: Path,
    version: str,
    main_ref: str,
) -> dict[str, str]:
    if not SEMVER_TAG.fullmatch(version):
        raise ReleaseSourceError(f"version {version!r} is not a vX.Y.Z SemVer tag")

    tag_ref = f"refs/tags/{version}"
    tag_exists = run_git(repo_root, "show-ref", "--verify", "--quiet", tag_ref)
    if tag_exists.returncode != 0:
        raise ReleaseSourceError(f"required release tag {tag_ref} does not exist")

    commit_sha = require_commit(repo_root, tag_ref, tag_ref)
    main_sha = require_commit(repo_root, main_ref, main_ref)
    ancestry = run_git(repo_root, "merge-base", "--is-ancestor", commit_sha, main_sha)
    if ancestry.returncode == 1:
        raise ReleaseSourceError(
            f"release tag {tag_ref} resolves to {commit_sha}, which is not descended from {main_ref}"
        )
    if ancestry.returncode != 0:
        raise ReleaseSourceError("git could not establish release-tag ancestry")

    base_ref = require_commit(repo_root, f"{commit_sha}^", "release tag parent")
    return {
        "version": version,
        "semver": version.removeprefix("v"),
        "tag_ref": tag_ref,
        "commit_sha": commit_sha,
        "base_ref": base_ref,
    }


def append_github_outputs(path: Path, values: dict[str, str]) -> None:
    with path.open("a", encoding="utf-8") as output:
        for key in ("version", "semver", "tag_ref", "commit_sha", "base_ref"):
            output.write(f"{key}={values[key]}\n")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, default=Path.cwd())
    parser.add_argument("--version", required=True)
    parser.add_argument("--main-ref", default="refs/remotes/origin/main")
    parser.add_argument("--github-output", type=Path, required=True)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        values = resolve_release_source(
            args.repo_root.resolve(),
            args.version,
            args.main_ref,
        )
        append_github_outputs(args.github_output, values)
    except ReleaseSourceError as error:
        print(f"release source rejected: {error}", flush=True)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
