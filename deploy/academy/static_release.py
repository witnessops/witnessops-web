#!/usr/bin/env python3
"""Build and promote a bounded, public-only Academy static release.

The host commands are deliberately not connected to a GitHub workflow. They
require a separately authorized operator action and an independently pinned
manifest/archive identity.
"""

import argparse
import fcntl
import hashlib
import io
import json
import os
import re
import shutil
import stat
import subprocess
import tarfile
import tempfile
import uuid
from contextlib import contextmanager
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
PUBLIC_TREE = "apps/witnessops-academy/public/"
HOST_ROOT = Path("/srv/witnessops-academy")
ALLOWED_SUFFIXES = frozenset({".html", ".css", ".js", ".mjs", ".png", ".svg", ".woff2"})
SOURCE_PATTERN = re.compile(r"[0-9a-f]{40}\Z")
SHA_PATTERN = re.compile(r"[0-9a-f]{64}\Z")
SEGMENT_PATTERN = re.compile(r"[a-z0-9][a-z0-9._-]*\Z")
MAX_FILES = 512
MAX_FILE_BYTES = 16 * 1024 * 1024
MAX_TOTAL_BYTES = 64 * 1024 * 1024
MAX_ARCHIVE_BYTES = 72 * 1024 * 1024
MAX_MANIFEST_BYTES = 256 * 1024


class ReleaseError(Exception):
    """A release boundary or expected-state check failed."""


def require_source(value):
    if not isinstance(value, str) or not SOURCE_PATTERN.fullmatch(value):
        raise ReleaseError("source commit must be a full lowercase Git SHA")
    return value


def require_sha(value, label):
    if not isinstance(value, str) or not SHA_PATTERN.fullmatch(value):
        raise ReleaseError(f"{label} must be a lowercase SHA-256 hex digest")
    return value


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def public_path(value):
    if not isinstance(value, str) or not value or "\\" in value or value.startswith("/"):
        raise ReleaseError("invalid public path")
    segments = value.split("/")
    if any(not SEGMENT_PATTERN.fullmatch(segment) for segment in segments):
        raise ReleaseError("hidden, traversing or unsupported public path")
    if Path(value).suffix not in ALLOWED_SUFFIXES:
        raise ReleaseError("unsupported public file extension")
    return value


def git(repo, *args, check=True):
    result = subprocess.run(
        ["git", "-C", str(repo), *args],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if check and result.returncode != 0:
        raise ReleaseError(f"Git command failed: {args[0]}")
    return result


def source_files(repo, source):
    source = require_source(source)
    if git(repo, "cat-file", "-t", source).stdout.strip() != b"commit":
        raise ReleaseError("source identity is not a commit")
    tree = git(repo, "ls-tree", "-r", "-z", "--full-tree", source, "--", PUBLIC_TREE).stdout
    entries = [entry for entry in tree.split(b"\0") if entry]
    if not entries or len(entries) > MAX_FILES:
        raise ReleaseError("public tree is empty or exceeds the file limit")
    files = {}
    total = 0
    for entry in entries:
        try:
            header, raw_name = entry.split(b"\t", 1)
            mode, object_type, object_id = header.decode("ascii").split(" ")
            name = raw_name.decode("utf-8", "strict")
        except (ValueError, UnicodeDecodeError) as error:
            raise ReleaseError("malformed Git tree entry") from error
        if not name.startswith(PUBLIC_TREE):
            raise ReleaseError("Git tree escaped the public directory")
        relative = public_path(name[len(PUBLIC_TREE) :])
        if mode != "100644" or object_type != "blob":
            raise ReleaseError("public tree contains a link, executable or nonregular entry")
        if relative in files:
            raise ReleaseError("duplicate public file")
        size = git(repo, "cat-file", "-s", object_id).stdout.strip()
        if not size.isdigit() or int(size) > MAX_FILE_BYTES:
            raise ReleaseError("public file exceeds the size limit")
        content = git(repo, "cat-file", "blob", object_id).stdout
        if len(content) > MAX_FILE_BYTES:
            raise ReleaseError("public file exceeds the size limit")
        total += len(content)
        if total > MAX_TOTAL_BYTES:
            raise ReleaseError("public tree exceeds the size limit")
        files[relative] = content
    if "index.html" not in files:
        raise ReleaseError("public homepage is missing")
    return files


def archive_files(files):
    stream = io.BytesIO()
    with tarfile.open(fileobj=stream, mode="w", format=tarfile.USTAR_FORMAT) as archive:
        for path, content in sorted(files.items()):
            entry = tarfile.TarInfo(path)
            entry.size = len(content)
            entry.mode = 0o644
            entry.mtime = 0
            entry.uid = entry.gid = 0
            entry.uname = entry.gname = ""
            archive.addfile(entry, io.BytesIO(content))
    return stream.getvalue()


def make_bundle(repo, source):
    files = source_files(repo, source)
    archive_bytes = archive_files(files)
    manifest = {
        "schema_version": 1,
        "source_commit": source,
        "archive_sha256": sha256(archive_bytes),
        "files": [
            {"path": path, "size": len(content), "sha256": sha256(content)}
            for path, content in sorted(files.items())
        ],
    }
    manifest_bytes = (json.dumps(manifest, sort_keys=True, separators=(",", ":")) + "\n").encode()
    return archive_bytes, manifest_bytes


def no_duplicate_keys(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ReleaseError("duplicate manifest field")
        result[key] = value
    return result


def parse_manifest(data, expected_source):
    if len(data) > MAX_MANIFEST_BYTES:
        raise ReleaseError("manifest exceeds the size limit")
    try:
        manifest = json.loads(data.decode("utf-8"), object_pairs_hook=no_duplicate_keys)
    except (UnicodeDecodeError, ValueError) as error:
        raise ReleaseError("invalid release manifest") from error
    if not isinstance(manifest, dict) or set(manifest) != {
        "schema_version", "source_commit", "archive_sha256", "files"
    }:
        raise ReleaseError("unexpected manifest fields")
    if type(manifest["schema_version"]) is not int or manifest["schema_version"] != 1:
        raise ReleaseError("unsupported manifest schema")
    if manifest["source_commit"] != require_source(expected_source):
        raise ReleaseError("manifest source does not match the approved source")
    require_sha(manifest["archive_sha256"], "archive digest")
    records = manifest["files"]
    if not isinstance(records, list) or not 0 < len(records) <= MAX_FILES:
        raise ReleaseError("invalid manifest file count")
    total = 0
    names = []
    for record in records:
        if not isinstance(record, dict) or set(record) != {"path", "size", "sha256"}:
            raise ReleaseError("unexpected file record")
        names.append(public_path(record["path"]))
        if type(record["size"]) is not int or not 0 <= record["size"] <= MAX_FILE_BYTES:
            raise ReleaseError("invalid public file size")
        require_sha(record["sha256"], "file digest")
        total += record["size"]
    if names != sorted(set(names)) or "index.html" not in names or total > MAX_TOTAL_BYTES:
        raise ReleaseError("manifest path set is invalid")
    return manifest


def read_regular(path, limit):
    descriptor = os.open(path, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0))
    with os.fdopen(descriptor, "rb") as stream:
        entry = os.fstat(stream.fileno())
        if not stat.S_ISREG(entry.st_mode) or entry.st_size > limit:
            raise ReleaseError("release input is not a bounded regular file")
        data = stream.read(limit + 1)
    if len(data) > limit:
        raise ReleaseError("release input exceeds its size limit")
    return data


def verify_bundle(archive_bytes, manifest_bytes, source, archive_digest, manifest_digest):
    require_sha(archive_digest, "expected archive digest")
    require_sha(manifest_digest, "expected manifest digest")
    if len(archive_bytes) > MAX_ARCHIVE_BYTES or sha256(archive_bytes) != archive_digest:
        raise ReleaseError("archive size or digest mismatch")
    if sha256(manifest_bytes) != manifest_digest:
        raise ReleaseError("manifest digest mismatch")
    manifest = parse_manifest(manifest_bytes, source)
    if manifest["archive_sha256"] != archive_digest:
        raise ReleaseError("manifest/archive identity mismatch")
    expected = {record["path"]: record for record in manifest["files"]}
    files = {}
    try:
        with tarfile.open(fileobj=io.BytesIO(archive_bytes), mode="r:") as archive:
            for index, member in enumerate(archive):
                if index >= MAX_FILES or index >= len(expected) or member.name != list(expected)[index]:
                    raise ReleaseError("archive and manifest path sets differ")
                public_path(member.name)
                if (
                    member.type != tarfile.REGTYPE
                    or member.mode != 0o644
                    or member.mtime != 0
                    or member.uid != 0
                    or member.gid != 0
                    or member.linkname
                    or member.pax_headers
                    or member.size != expected[member.name]["size"]
                ):
                    raise ReleaseError("archive contains an unsupported entry")
                handle = archive.extractfile(member)
                if handle is None:
                    raise ReleaseError("archive file cannot be read")
                content = handle.read(MAX_FILE_BYTES + 1)
                if len(content) != member.size or sha256(content) != expected[member.name]["sha256"]:
                    raise ReleaseError("archive file digest mismatch")
                files[member.name] = content
    except (tarfile.TarError, OSError) as error:
        raise ReleaseError("invalid release archive") from error
    if set(files) != set(expected) or archive_files(files) != archive_bytes:
        raise ReleaseError("archive is incomplete or is not in the canonical format")
    return manifest, files


def check_directory(path, owner, readable=False):
    info = path.lstat()
    if (
        not stat.S_ISDIR(info.st_mode)
        or info.st_uid != owner
        or info.st_mode & 0o022
        or readable and info.st_mode & 0o055 != 0o055
    ):
        raise ReleaseError("release directory ownership or permissions are unsafe")


def prepare_root(root, owner):
    check_directory(root.parent, owner)
    if not root.exists():
        root.mkdir(mode=0o755)
        root.chmod(0o755)
    check_directory(root, owner, readable=True)
    releases = root / "releases"
    if not releases.exists():
        releases.mkdir(mode=0o755)
        releases.chmod(0o755)
    check_directory(releases, owner, readable=True)
    return releases


@contextmanager
def release_lock(root, owner):
    lock = root / ".academy-release.lock"
    flags = os.O_RDWR | os.O_CREAT | getattr(os, "O_NOFOLLOW", 0)
    descriptor = os.open(lock, flags, 0o600)
    try:
        info = os.fstat(descriptor)
        if not stat.S_ISREG(info.st_mode) or info.st_uid != owner or info.st_mode & 0o077:
            raise ReleaseError("release lock ownership or permissions are unsafe")
        fcntl.flock(descriptor, fcntl.LOCK_EX)
        yield
    finally:
        os.close(descriptor)


def verify_installed(root, source, manifest_digest, owner):
    require_source(source)
    require_sha(manifest_digest, "expected manifest digest")
    release = root / "releases" / source
    public = release / "public"
    check_directory(release, owner, readable=True)
    check_directory(public, owner, readable=True)
    manifest_info = (release / "manifest.json").lstat()
    if manifest_info.st_uid != owner or manifest_info.st_mode & 0o022:
        raise ReleaseError("installed manifest ownership or permissions are unsafe")
    manifest_bytes = read_regular(release / "manifest.json", MAX_MANIFEST_BYTES)
    if sha256(manifest_bytes) != manifest_digest:
        raise ReleaseError("installed manifest digest mismatch")
    manifest = parse_manifest(manifest_bytes, source)
    expected = {record["path"]: record for record in manifest["files"]}
    found = {}
    for directory, subdirs, filenames in os.walk(public, followlinks=False):
        parent = Path(directory)
        check_directory(parent, owner, readable=True)
        for name in subdirs:
            check_directory(parent / name, owner, readable=True)
        for name in filenames:
            candidate = parent / name
            relative = candidate.relative_to(public).as_posix()
            public_path(relative)
            info = candidate.lstat()
            if (
                not stat.S_ISREG(info.st_mode)
                or info.st_uid != owner
                or info.st_mode & 0o022
                or relative not in expected
                or info.st_size != expected[relative]["size"]
            ):
                raise ReleaseError("installed public file is unsafe or unexpected")
            if sha256(read_regular(candidate, MAX_FILE_BYTES)) != expected[relative]["sha256"]:
                raise ReleaseError("installed public file digest mismatch")
            found[relative] = True
    if set(found) != set(expected):
        raise ReleaseError("installed public file set differs from manifest")
    return manifest


def stage(root, archive_bytes, manifest_bytes, source, archive_digest, manifest_digest, owner):
    manifest, files = verify_bundle(
        archive_bytes, manifest_bytes, source, archive_digest, manifest_digest
    )
    releases = prepare_root(root, owner)
    with release_lock(root, owner):
        final = releases / source
        if final.exists() or final.is_symlink():
            verify_installed(root, source, manifest_digest, owner)
            return {"source_commit": source, "staged": False, "file_count": len(files)}
        temporary = Path(tempfile.mkdtemp(prefix=".academy-stage-", dir=releases))
        try:
            public = temporary / "public"
            public.mkdir(mode=0o755)
            public.chmod(0o755)
            for name, content in sorted(files.items()):
                parent = public
                for segment in name.split("/")[:-1]:
                    parent = parent / segment
                    parent.mkdir(exist_ok=True, mode=0o755)
                    parent.chmod(0o755)
                destination = parent / name.split("/")[-1]
                with destination.open("xb") as output:
                    output.write(content)
                destination.chmod(0o644)
            manifest_path = temporary / "manifest.json"
            with manifest_path.open("xb") as output:
                output.write(manifest_bytes)
            manifest_path.chmod(0o644)
            temporary.chmod(0o755)
            temporary.rename(final)
        except Exception:
            shutil.rmtree(temporary)
            raise
    return {"source_commit": manifest["source_commit"], "staged": True, "file_count": len(files)}


def current_source(root):
    current = root / "current"
    try:
        info = current.lstat()
    except FileNotFoundError:
        return "absent"
    if not stat.S_ISLNK(info.st_mode):
        raise ReleaseError("Academy active reference is not a symlink")
    target = os.readlink(current)
    match = re.fullmatch(r"releases/([0-9a-f]{40})/public", target)
    if not match:
        raise ReleaseError("Academy active reference has an unexpected target")
    return match.group(1)


def activate(root, source, expected_current, manifest_digest, owner):
    if source != "absent":
        require_source(source)
        require_sha(manifest_digest, "expected manifest digest")
    if expected_current != "absent":
        require_source(expected_current)
    prepare_root(root, owner)
    with release_lock(root, owner):
        observed = current_source(root)
        if observed != expected_current:
            raise ReleaseError("Academy active reference changed from the expected state")
        if source == observed:
            if source != "absent":
                verify_installed(root, source, manifest_digest, owner)
            return {"previous": observed, "current": source, "changed": False}
        current = root / "current"
        if source == "absent":
            current.unlink()
        else:
            verify_installed(root, source, manifest_digest, owner)
            temporary = root / f".current-{uuid.uuid4().hex}"
            try:
                temporary.symlink_to(f"releases/{source}/public")
                os.replace(temporary, current)
            finally:
                if temporary.is_symlink():
                    temporary.unlink()
    return {"previous": observed, "current": source, "changed": True}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    package = commands.add_parser("package", help="package one merged-main public tree")
    package.add_argument("--source-commit", required=True)
    package.add_argument("--output-dir", type=Path, required=True)
    check = commands.add_parser("verify", help="verify an independently pinned bundle")
    stage_command = commands.add_parser("stage", help="stage a verified release on the host")
    for command in (check, stage_command):
        command.add_argument("--archive", type=Path, required=True)
        command.add_argument("--manifest", type=Path, required=True)
        command.add_argument("--source-commit", required=True)
        command.add_argument("--archive-sha256", required=True)
        command.add_argument("--manifest-sha256", required=True)
    switch = commands.add_parser("activate", help="guarded Academy-only pointer switch")
    switch.add_argument("--source-commit", required=True, help="full SHA or absent")
    switch.add_argument("--expected-current", required=True, help="full SHA or absent")
    switch.add_argument("--manifest-sha256", default="", help="required for a release target")
    commands.add_parser("status", help="read Academy active reference")
    args = parser.parse_args()
    try:
        if args.command == "package":
            source = require_source(args.source_commit)
            if git(REPO_ROOT, "merge-base", "--is-ancestor", source, "origin/main", check=False).returncode:
                raise ReleaseError("source commit is not in the locally fetched main history")
            archive_bytes, manifest_bytes = make_bundle(REPO_ROOT, source)
            args.output_dir.mkdir()
            (args.output_dir / "academy-public.tar").write_bytes(archive_bytes)
            (args.output_dir / "manifest.json").write_bytes(manifest_bytes)
            result = {
                "source_commit": source,
                "archive_sha256": sha256(archive_bytes),
                "manifest_sha256": sha256(manifest_bytes),
                "file_count": len(parse_manifest(manifest_bytes, source)["files"]),
            }
        elif args.command in ("verify", "stage"):
            archive_bytes = read_regular(args.archive, MAX_ARCHIVE_BYTES)
            manifest_bytes = read_regular(args.manifest, MAX_MANIFEST_BYTES)
            if args.command == "stage":
                if os.geteuid() != 0:
                    raise ReleaseError("host staging requires root ownership")
                result = stage(
                    HOST_ROOT, archive_bytes, manifest_bytes, args.source_commit,
                    args.archive_sha256, args.manifest_sha256, 0,
                )
            else:
                manifest, _ = verify_bundle(
                    archive_bytes, manifest_bytes, args.source_commit,
                    args.archive_sha256, args.manifest_sha256,
                )
                result = {"source_commit": manifest["source_commit"], "file_count": len(manifest["files"])}
        elif args.command == "activate":
            if os.geteuid() != 0:
                raise ReleaseError("host activation requires root ownership")
            result = activate(
                HOST_ROOT, args.source_commit, args.expected_current,
                args.manifest_sha256, 0,
            )
        else:
            result = {"current": current_source(HOST_ROOT)}
        print(json.dumps(result, sort_keys=True))
    except (ReleaseError, OSError) as error:
        parser.exit(1, f"Academy static release refused: {error}\n")


if __name__ == "__main__":
    main()
