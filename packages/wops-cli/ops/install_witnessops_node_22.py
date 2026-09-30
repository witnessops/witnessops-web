#!/usr/bin/env python3
"""Fetch/check/install/remove the pinned WitnessOps Node.js 22 runtime."""
from __future__ import annotations

import argparse
import ctypes
import errno
import hashlib
import io
import json
import lzma
import os
from pathlib import Path, PurePosixPath
import shutil
import stat
import subprocess
import tarfile
import tempfile
from urllib.parse import urlsplit
from urllib.request import urlopen


VERSION = "22.23.3"
ARCHIVE_NAME = f"node-v{VERSION}-linux-x64.tar.xz"
SOURCE_URL = f"https://nodejs.org/download/release/v{VERSION}/{ARCHIVE_NAME}"
SOURCE_IDENTITY = "Node.js official release archive (nodejs.org/dist)"
ARCHIVE_SHA256 = "df450af89261115ef9f9e3830c3eeb2cc9213b63c720b1af623cb5dcbe2e02de"
NODE_BINARY_SHA256 = "fde6a4bf8d0562f7751d1a2d6cb9b417c4cfe107bbcb0aa3e9a24e125e348f48"
ARCHIVE_ROOT = f"node-v{VERSION}-linux-x64"
NODE_MEMBER = f"{ARCHIVE_ROOT}/bin/node"
EXPECTED_LINKS = {
    f"{ARCHIVE_ROOT}/bin/corepack": "../lib/node_modules/corepack/dist/corepack.js",
    f"{ARCHIVE_ROOT}/bin/npm": "../lib/node_modules/npm/bin/npm-cli.js",
    f"{ARCHIVE_ROOT}/bin/npx": "../lib/node_modules/npm/bin/npx-cli.js",
}
ROOT = Path("/opt/witnessops/node-22")
MAX_ARCHIVE_BYTES = 100 * 1024 * 1024
MAX_ARCHIVE_MEMBERS = 15_000
MAX_UNCOMPRESSED_BYTES = 300 * 1024 * 1024
SAFE_ENV = {"PATH": "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin", "LANG": "C", "HOME": "/nonexistent"}


class InstallError(RuntimeError):
    pass


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _manifest_bytes(members: dict[str, dict]) -> bytes:
    record = {
        "schema": "witnessops.node-runtime.v1",
        "version": VERSION,
        "sourceIdentity": SOURCE_IDENTITY,
        "sourceUrl": SOURCE_URL,
        "archiveSha256": ARCHIVE_SHA256,
        "nodeBinarySha256": NODE_BINARY_SHA256,
        "members": members,
    }
    return (json.dumps(record, sort_keys=True, separators=(",", ":")) + "\n").encode()


def _read_archive(path: Path) -> bytes:
    try:
        info = path.lstat()
        if not stat.S_ISREG(info.st_mode) or stat.S_ISLNK(info.st_mode) or info.st_size > MAX_ARCHIVE_BYTES:
            raise InstallError("Node.js archive must be a bounded regular file, not a symlink.")
        descriptor = os.open(path, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0))
        with os.fdopen(descriptor, "rb") as stream:
            opened = os.fstat(stream.fileno())
            if (opened.st_dev, opened.st_ino, opened.st_size) != (info.st_dev, info.st_ino, info.st_size):
                raise InstallError("Node.js archive changed during read.")
            data = stream.read(MAX_ARCHIVE_BYTES + 1)
            after = os.fstat(stream.fileno())
            if len(data) > MAX_ARCHIVE_BYTES or (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns) != (
                opened.st_dev, opened.st_ino, opened.st_size, opened.st_mtime_ns
            ):
                raise InstallError("Node.js archive changed during read.")
    except OSError as error:
        raise InstallError("Node.js archive is unavailable.") from error
    if _sha256(data) != ARCHIVE_SHA256:
        raise InstallError("Node.js archive SHA-256 does not match the pinned release.")
    return data


def _normal_file_mode(mode: int) -> int:
    if mode & 0o7000:
        raise InstallError("Node.js archive contains a privileged file mode.")
    return 0o755 if mode & 0o111 else 0o644


def _archive_manifest(data: bytes) -> dict[str, dict]:
    if len(data) > MAX_ARCHIVE_BYTES or _sha256(data) != ARCHIVE_SHA256:
        raise InstallError("Node.js archive SHA-256 does not match the pinned release.")
    records: dict[str, dict] = {}
    seen: set[str] = set()
    links: dict[str, str] = {}
    total_bytes = 0
    node_hash = None
    root_seen = False
    try:
        with tarfile.open(fileobj=io.BytesIO(data), mode="r|xz") as archive:
            member_count = 0
            for member in archive:
                member_count += 1
                if member_count > MAX_ARCHIVE_MEMBERS:
                    raise InstallError("Node.js archive member count is invalid.")
                name = member.name
                path = PurePosixPath(name)
                if (name in seen or path.is_absolute() or not path.parts or ".." in path.parts
                        or path.as_posix() != name or path.parts[0] != ARCHIVE_ROOT):
                    raise InstallError("Node.js archive contains an unsafe or duplicate path.")
                seen.add(name)
                if name == ARCHIVE_ROOT:
                    if not member.isdir():
                        raise InstallError("Node.js archive root has an unexpected type.")
                    root_seen = True
                    continue
                relative = PurePosixPath(*path.parts[1:]).as_posix()
                if not relative or relative.startswith("../"):
                    raise InstallError("Node.js archive path escapes its release directory.")
                if relative == "identity.json":
                    raise InstallError("Node.js archive collides with the WitnessOps identity record.")
                if member.isdir():
                    records[relative] = {"type": "directory", "mode": 0o755}
                elif member.isfile():
                    total_bytes += member.size
                    if member.size < 0 or total_bytes > MAX_UNCOMPRESSED_BYTES:
                        raise InstallError("Node.js archive exceeds the uncompressed size limit.")
                    mode = _normal_file_mode(member.mode)
                    stream = archive.extractfile(member)
                    if stream is None:
                        raise InstallError("Node.js archive file could not be read.")
                    digest = hashlib.sha256()
                    size = 0
                    for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                        size += len(chunk)
                        digest.update(chunk)
                    if size != member.size:
                        raise InstallError("Node.js archive file size changed during inspection.")
                    file_hash = digest.hexdigest()
                    records[relative] = {"type": "file", "mode": mode, "size": size, "sha256": file_hash}
                    if name == NODE_MEMBER:
                        node_hash = file_hash
                elif member.issym():
                    if EXPECTED_LINKS.get(name) != member.linkname:
                        raise InstallError("Node.js archive contains an unexpected symbolic link.")
                    target = PurePosixPath(member.linkname)
                    resolved = list(path.parent.parts)
                    for part in target.parts:
                        if part == "..":
                            if len(resolved) <= 1:
                                raise InstallError("Node.js archive link escapes its release directory.")
                            resolved.pop()
                        elif part not in ("", "."):
                            resolved.append(part)
                    if not resolved or resolved[0] != ARCHIVE_ROOT:
                        raise InstallError("Node.js archive link escapes its release directory.")
                    links[relative] = member.linkname
                    records[relative] = {"type": "symlink", "target": member.linkname}
                else:
                    raise InstallError("Node.js archive contains a hard link or special file.")
            if links != {key.removeprefix(f"{ARCHIVE_ROOT}/"): value for key, value in EXPECTED_LINKS.items()}:
                raise InstallError("Node.js archive symlink layout differs from the official release contract.")
            if not root_seen:
                raise InstallError("Node.js archive release directory is missing.")
            if node_hash != NODE_BINARY_SHA256:
                raise InstallError("Node.js binary SHA-256 does not match the pinned artifact.")
            for relative in records:
                parent = PurePosixPath(relative).parent
                while parent.as_posix() != ".":
                    if records.get(parent.as_posix(), {}).get("type") != "directory":
                        raise InstallError("Node.js archive contains a path below a non-directory member.")
                    parent = parent.parent
    except (OSError, EOFError, lzma.LZMAError, tarfile.TarError) as error:
        raise InstallError("Node.js archive is invalid.") from error
    return dict(sorted(records.items()))


def _extract_archive(data: bytes, destination: Path, members: dict[str, dict]) -> None:
    if not destination.is_dir() or any(destination.iterdir()):
        raise InstallError("Node.js extraction staging directory is not empty and private.")
    links: list[tuple[Path, str]] = []
    with tarfile.open(fileobj=io.BytesIO(data), mode="r|xz") as archive:
        for member in archive:
            if member.name == ARCHIVE_ROOT:
                continue
            relative = PurePosixPath(*PurePosixPath(member.name).parts[1:]).as_posix()
            record = members[relative]
            target = destination.joinpath(*PurePosixPath(relative).parts)
            if record["type"] == "directory":
                target.mkdir(mode=0o755, parents=True, exist_ok=True)
                target.chmod(0o755)
            elif record["type"] == "file":
                target.parent.mkdir(mode=0o755, parents=True, exist_ok=True)
                source = archive.extractfile(member)
                if source is None:
                    raise InstallError("Node.js archive file could not be extracted.")
                digest = hashlib.sha256()
                size = 0
                with target.open("xb") as output:
                    while chunk := source.read(1024 * 1024):
                        size += len(chunk)
                        digest.update(chunk)
                        output.write(chunk)
                    output.flush()
                    os.fsync(output.fileno())
                target.chmod(record["mode"])
                if size != record["size"] or digest.hexdigest() != record["sha256"]:
                    raise InstallError("Node.js archive bytes changed during extraction.")
            elif record["type"] == "symlink":
                links.append((target, record["target"]))
            else:
                raise InstallError("Node.js archive contains an unsupported member.")
    for target, link in links:
        target.parent.mkdir(mode=0o755, parents=True, exist_ok=True)
        target.symlink_to(link)
    (destination / "identity.json").write_bytes(_manifest_bytes(members))
    (destination / "identity.json").chmod(0o644)
    for directory in sorted((p for p, r in members.items() if r["type"] == "directory"),
                            key=lambda item: len(PurePosixPath(item).parts), reverse=True):
        path = destination.joinpath(*PurePosixPath(directory).parts)
        descriptor = os.open(path, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
        try:
            os.fsync(descriptor)
        finally:
            os.close(descriptor)
    descriptor = os.open(destination, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
    try:
        os.fsync(descriptor)
    finally:
        os.close(descriptor)


def _safe_directory(path: Path, expected_uid: int, *, exact_mode: int | None = None) -> os.stat_result:
    try:
        info = path.lstat()
    except OSError as error:
        raise InstallError(f"Required Node.js runtime path is unavailable: {path}") from error
    if not stat.S_ISDIR(info.st_mode) or stat.S_ISLNK(info.st_mode) or info.st_uid != expected_uid or info.st_mode & 0o022:
        raise InstallError(f"Node.js runtime directory custody is unsafe: {path}")
    if exact_mode is not None and stat.S_IMODE(info.st_mode) != exact_mode:
        raise InstallError(f"Node.js runtime directory mode is unexpected: {path}")
    return info


def _check_ancestors(path: Path, expected_uid: int) -> None:
    current = path.parent
    while current != Path("/"):
        _safe_directory(current, expected_uid)
        current = current.parent


def _check_node_version(node: Path) -> None:
    try:
        result = subprocess.run([str(node), "--version"], check=True, text=True, capture_output=True,
                                env=SAFE_ENV, timeout=10)
    except (OSError, subprocess.SubprocessError) as error:
        raise InstallError("Pinned Node.js runtime self-test failed.") from error
    if result.stdout.strip() != f"v{VERSION}":
        raise InstallError("Pinned Node.js runtime reported an unexpected version.")


def check_archive(path: Path) -> str:
    data = _read_archive(path)
    members = _archive_manifest(data)
    with tempfile.TemporaryDirectory(prefix="witnessops-node22-check-") as temporary:
        node_path = Path(temporary) / "node"
        with tarfile.open(fileobj=io.BytesIO(data), mode="r|xz") as archive:
            for member in archive:
                if member.name == NODE_MEMBER:
                    source = archive.extractfile(member)
                    if source is None:
                        raise InstallError("Pinned Node.js binary could not be read.")
                    digest = hashlib.sha256()
                    with node_path.open("xb") as output:
                        while chunk := source.read(1024 * 1024):
                            digest.update(chunk)
                            output.write(chunk)
                    break
        if digest.hexdigest() != NODE_BINARY_SHA256 or members.get("bin/node", {}).get("sha256") != NODE_BINARY_SHA256:
            raise InstallError("Node.js binary SHA-256 does not match the pinned release.")
        node_path.chmod(0o755)
        _check_node_version(node_path)
    return ARCHIVE_SHA256


def validate_installation(root: Path = ROOT, expected_uid: int = 0, *, check_ancestors: bool = True) -> str:
    if root != ROOT and check_ancestors:
        raise InstallError("Only the fixed WitnessOps Node.js runtime path is supported.")
    _safe_directory(root, expected_uid, exact_mode=0o755)
    if check_ancestors:
        _check_ancestors(root, expected_uid)
    identity = root / "identity.json"
    try:
        identity_info = identity.lstat()
        if (not stat.S_ISREG(identity_info.st_mode) or stat.S_ISLNK(identity_info.st_mode)
                or identity_info.st_uid != expected_uid or stat.S_IMODE(identity_info.st_mode) != 0o644
                or identity_info.st_size > 8 * 1024 * 1024):
            raise InstallError("Node.js runtime identity record custody is unsafe.")
        descriptor = os.open(identity, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0))
        with os.fdopen(descriptor, "rb") as stream:
            if os.fstat(stream.fileno()).st_ino != identity_info.st_ino:
                raise InstallError("Node.js runtime identity record changed during read.")
            manifest_bytes = stream.read(8 * 1024 * 1024 + 1)
            if len(manifest_bytes) > 8 * 1024 * 1024:
                raise InstallError("Node.js runtime identity record is oversized.")
        manifest = json.loads(manifest_bytes.decode("utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        raise InstallError("Node.js runtime identity record is invalid.") from error
    if not isinstance(manifest, dict) or any(manifest.get(key) != value for key, value in {
        "schema": "witnessops.node-runtime.v1", "version": VERSION, "sourceIdentity": SOURCE_IDENTITY,
        "sourceUrl": SOURCE_URL, "archiveSha256": ARCHIVE_SHA256, "nodeBinarySha256": NODE_BINARY_SHA256,
    }.items()) or not isinstance(manifest.get("members"), dict):
        raise InstallError("Node.js runtime identity record does not match the pinned release.")
    members = manifest["members"]
    if any(not isinstance(name, str) or not isinstance(record, dict) for name, record in members.items()):
        raise InstallError("Node.js runtime identity member map is invalid.")
    expected_files = set(members)
    actual_files: set[str] = set()
    for current, directories, filenames in os.walk(root, topdown=True, followlinks=False):
        current_path = Path(current)
        for name in [*directories, *filenames]:
            path = current_path / name
            relative = path.relative_to(root).as_posix()
            actual_files.add(relative)
            info = path.lstat()
            if info.st_uid != expected_uid or (not stat.S_ISLNK(info.st_mode) and info.st_mode & 0o022):
                raise InstallError("Node.js runtime has unsafe owner or writable permissions.")
            if relative == "identity.json":
                continue
            record = members.get(relative)
            if not isinstance(record, dict):
                raise InstallError("Node.js runtime contains an unrecorded entry.")
            if record.get("type") == "directory":
                if not stat.S_ISDIR(info.st_mode) or stat.S_ISLNK(info.st_mode) or stat.S_IMODE(info.st_mode) != 0o755:
                    raise InstallError("Node.js runtime directory differs from the pinned manifest.")
            elif record.get("type") == "file":
                if not stat.S_ISREG(info.st_mode) or stat.S_ISLNK(info.st_mode) or stat.S_IMODE(info.st_mode) != record.get("mode"):
                    raise InstallError("Node.js runtime file differs from the pinned manifest.")
                digest = hashlib.sha256()
                with path.open("rb") as stream:
                    for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                        digest.update(chunk)
                if digest.hexdigest() != record.get("sha256") or info.st_size != record.get("size"):
                    raise InstallError("Node.js runtime file digest differs from the pinned manifest.")
            elif record.get("type") == "symlink":
                expected_target = EXPECTED_LINKS.get(f"{ARCHIVE_ROOT}/{relative}")
                if (not stat.S_ISLNK(info.st_mode) or expected_target is None
                        or record.get("target") != expected_target or os.readlink(path) != expected_target):
                    raise InstallError("Node.js runtime link differs from the pinned manifest.")
                link_path = PurePosixPath(expected_target)
                resolved_parts = list(PurePosixPath(relative).parent.parts)
                for part in link_path.parts:
                    if part == "..":
                        if not resolved_parts:
                            raise InstallError("Node.js runtime link escapes its root.")
                        resolved_parts.pop()
                    elif part not in ("", "."):
                        resolved_parts.append(part)
                resolved_relative = PurePosixPath(*resolved_parts).as_posix()
                if (not resolved_relative or resolved_relative.startswith("../")
                        or members.get(resolved_relative, {}).get("type") not in {"file", "directory"}):
                    raise InstallError("Node.js runtime link target is outside or missing from its root.")
            else:
                raise InstallError("Node.js runtime manifest contains an unsupported entry.")
    expected_with_manifest = expected_files | {"identity.json"}
    if actual_files != expected_with_manifest:
        raise InstallError("Node.js runtime is incomplete or contains unexpected files.")
    binary = members.get("bin/node", {})
    if binary.get("sha256") != NODE_BINARY_SHA256 or binary.get("type") != "file" or binary.get("mode") != 0o755:
        raise InstallError("Node.js runtime manifest does not bind the expected binary.")
    _check_node_version(root / "bin/node")
    return NODE_BINARY_SHA256


def _fsync_dir(path: Path) -> None:
    descriptor = os.open(path, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
    try:
        os.fsync(descriptor)
    finally:
        os.close(descriptor)


def _rename_noreplace(source: Path, target: Path) -> None:
    libc = ctypes.CDLL(None, use_errno=True)
    renameat2 = getattr(libc, "renameat2", None)
    if renameat2 is None:
        raise InstallError("Atomic Node.js runtime publication is unavailable.")
    renameat2.argtypes = [ctypes.c_int, ctypes.c_char_p, ctypes.c_int, ctypes.c_char_p, ctypes.c_uint]
    renameat2.restype = ctypes.c_int
    result = renameat2(-100, os.fsencode(source), -100, os.fsencode(target), 1)
    if result != 0:
        code = ctypes.get_errno()
        if code == errno.EEXIST:
            raise InstallError("Node.js runtime already exists; replacement is not supported.")
        raise InstallError("Atomic Node.js runtime publication failed.")


def apply_archive(archive_path: Path, root: Path = ROOT, expected_uid: int = 0, *, require_root: bool = True) -> str:
    if require_root and os.geteuid() != 0:
        raise InstallError("Run Node.js runtime installation as root.")
    if root != ROOT and require_root:
        raise InstallError("Only the fixed WitnessOps Node.js runtime path is supported.")
    if os.path.lexists(root):
        raise InstallError("Node.js runtime already exists; replacement is not supported.")
    archive_bytes = _read_archive(archive_path)
    members = _archive_manifest(archive_bytes)
    parent = root.parent
    if require_root:
        _safe_directory(Path("/opt"), 0)
        _safe_directory(Path("/opt/witnessops"), 0)
    else:
        _safe_directory(parent, expected_uid)
    stage = Path(tempfile.mkdtemp(prefix=".node-22.install-", dir=parent))
    try:
        stage.chmod(0o700)
        _extract_archive(archive_bytes, stage, members)
        stage.chmod(0o755)
        validate_installation(stage, expected_uid, check_ancestors=False)
        _rename_noreplace(stage, root)
        stage = None
        _fsync_dir(parent)
        validate_installation(root, expected_uid, check_ancestors=require_root)
        return NODE_BINARY_SHA256
    finally:
        if stage is not None:
            shutil.rmtree(stage, ignore_errors=True)


def remove_installation(root: Path = ROOT, expected_uid: int = 0, *, require_root: bool = True) -> None:
    if require_root and os.geteuid() != 0:
        raise InstallError("Run Node.js runtime removal as root.")
    validate_installation(root, expected_uid, check_ancestors=require_root)
    shutil.rmtree(root)
    _fsync_dir(root.parent)


def fetch_archive(output: Path) -> str:
    if output.exists() or output.is_symlink():
        raise InstallError("Refusing to overwrite an existing Node.js archive path.")
    if not output.parent.is_dir():
        raise InstallError("Node.js archive output directory is unavailable.")
    parsed = urlsplit(SOURCE_URL)
    if parsed.scheme != "https" or parsed.hostname != "nodejs.org":
        raise InstallError("Pinned Node.js source URL is invalid.")
    stage = output.with_name(f".{output.name}.download-{os.getpid()}")
    digest = hashlib.sha256()
    try:
        with urlopen(SOURCE_URL, timeout=30) as response:
            final = urlsplit(response.geturl())
            if final.scheme != "https" or final.hostname != "nodejs.org":
                raise InstallError("Node.js download left the approved source host.")
            with stage.open("xb") as destination:
                os.chmod(stage, 0o600)
                total = 0
                while chunk := response.read(1024 * 1024):
                    total += len(chunk)
                    if total > MAX_ARCHIVE_BYTES:
                        raise InstallError("Node.js release archive exceeded the size limit.")
                    digest.update(chunk)
                    destination.write(chunk)
                destination.flush()
                os.fsync(destination.fileno())
        if digest.hexdigest() != ARCHIVE_SHA256:
            raise InstallError("Downloaded Node.js archive SHA-256 does not match the pinned release.")
        _archive_manifest(stage.read_bytes())
        os.link(stage, output, follow_symlinks=False)
        stage.unlink()
        _fsync_dir(output.parent)
        return digest.hexdigest()
    except InstallError:
        raise
    except Exception as error:
        raise InstallError("Pinned Node.js archive download failed.") from error
    finally:
        stage.unlink(missing_ok=True)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument("--fetch", action="store_true", help="download the pinned official archive")
    modes.add_argument("--check", action="store_true", help="verify installed runtime and optional archive")
    modes.add_argument("--apply", action="store_true", help="install from a verified local archive")
    modes.add_argument("--remove", action="store_true", help="remove only the exact pinned runtime")
    parser.add_argument("--archive", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args(argv)
    try:
        if args.fetch:
            if not args.output or args.archive:
                parser.error("--fetch requires --output and does not accept --archive")
            digest = fetch_archive(args.output)
            print(f"status=PASS\narchive_sha256={digest}\nsource_url={SOURCE_URL}")
        elif args.apply:
            if not args.archive or args.output:
                parser.error("--apply requires --archive and does not accept --output")
            digest = apply_archive(args.archive)
            print(f"status=PASS\nnode_version={VERSION}\nnode_sha256={digest}\npath={ROOT / 'bin/node'}")
        elif args.remove:
            if args.archive or args.output:
                parser.error("--remove does not accept archive or output arguments")
            remove_installation()
            print("status=PASS\nruntime=removed")
        else:
            if args.output:
                parser.error("--check does not accept --output")
            archive_digest = check_archive(args.archive) if args.archive else None
            if ROOT.exists() or ROOT.is_symlink():
                digest = validate_installation()
                print(f"status=PASS\nnode_version={VERSION}\nnode_sha256={digest}\npath={ROOT / 'bin/node'}")
            elif archive_digest:
                print(f"status=PASS\narchive_sha256={archive_digest}\nnode_sha256={NODE_BINARY_SHA256}\nnode_version={VERSION}")
            else:
                raise InstallError("No installed Node.js runtime or archive was supplied for check.")
        return 0
    except InstallError as error:
        print(str(error), file=__import__("sys").stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
