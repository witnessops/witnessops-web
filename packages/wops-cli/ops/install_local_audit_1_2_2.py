#!/usr/bin/env python3
"""Install the accepted Local Audit 1.2.2 runtime for the WitnessOps CLI.

The only source input is the fixed CI-pinned producer under
tests/server-check/producer. --check validates it by building and discarding a
temporary runtime, or read-only validates an already installed runtime. --apply
requires root and publishes one verified tree without replacing an existing one.
"""
from __future__ import annotations

import ctypes
import errno
import fcntl
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import platform
import re
import shutil
import stat
import subprocess
import sys
import tarfile
import tempfile


IMPLEMENTATION_COMMIT = "fce41c194522e9d08d0683aa786bd4361c5ae0c2"
ARCHIVE_SHA256 = "8d32bcb4a2eb73faf7815d191826919fef8f16a80ecbfbf32a472a1ca525820e"
COLLECTOR_FINGERPRINT = "ac93a93dc1d89fc4c2a467b83a5131482d21a84342f1ac176823adf8bb0d372a"
PACKAGE_VERSION = "1.2.2"
SETUPTOOLS_VERSION = "80.9.0"
CRYPTOGRAPHY_VERSION = "50.0.1"
CFFI_VERSION = "2.0.0"
PYCPARSER_VERSION = "2.23"
SETUPTOOLS_WHEEL_SHA256 = "062d34222ad13e0cc312a4c02d73f059e86a4acbfbdea8f8f76b28c99f306922"
CRYPTOGRAPHY_WHEEL_SHA256 = (
    "ff838d62ec1bfce4f9ba7fa16f4a7b554cd8d0c299e6be37502161a660c84eef",
    "51593d180cf6d179bde5c5d065bed81386b1f381656ae7d042b7ffc87a9895ad",
    "51afcfceb15597cf2635068e4ac9a56b2abde622edde17f37d85fd7b5306497a",
    "e22dfed744bd4002e909464cb23d2f0b05c6f3113a79ef2e9864a53db737c733",
    "407fe2b6db00939c05c0e945e9914238f2f0a430974839429dafc82b1ee6bee5",
    "9dde0a357190eb3b1da1bb9ab750e9c85cba82ca5977aa0836cbb94e92611239",
)
PYCPARSER_WHEEL_SHA256 = "e5c6e8d3fbad53479cab09ac03729e0a9faf2bee3db8208a550daf5af81a5934"
CFFI_WHEEL_SHA256 = {
    11: "8941aaadaf67246224cee8c3803777eed332a19d909b47e29c9842ef1e79ac26",
    12: "3e17ed538242334bf70832644a32a7aae3d83b57567f9fd60a26257e992b79ba",
    13: "c8d3b5532fc71b7a77c09192b4a5a200ea992702734a2e9279a37f2478236f26",
    14: "afb8db5439b81cf9c9d0c80404b60c3cc9c3add93e114dcae767f1477cb53775",
}
TARGET = Path("/opt/witnessops/local-audit-1.2.2")
PRODUCER = Path(__file__).resolve().parent / "producer"
MAX_RUNTIME_FILES = 30_000
MAX_EVIDENCE_ENTRIES = 100_000
MAX_EVIDENCE_BYTES = 2 * 1024 * 1024 * 1024
PREVIOUS_COLLECTOR_FINGERPRINT = "2209c2b63de319b91452b4d7705c5f5178a1a13b6156f601b5ad588c11d280f8"
RUNTIME_LOCK_NAME = ".local-audit-1.2.2.runtime.lock"
RUNTIME_PROBE = (
    "import json; from importlib.metadata import version; import cryptography; "
    "from witnessops_local_audit.package import source_fingerprint, finalize_product; "
    "from witnessops_local_audit.capture import freeze_capture; "
    "from witnessops_local_audit.operator import main as operator_main; "
    "from witnessops_local_audit.cli import main as cli_main; "
    "print(json.dumps({'packageVersion': version('witnessops-local-server-audit'), "
    "'setuptoolsVersion': version('setuptools'), 'cryptographyVersion': cryptography.__version__, "
    "'collectorFingerprint': source_fingerprint()}))"
)
SAFE_ENV = {
    "PATH": "/usr/sbin:/usr/bin:/sbin:/bin",
    "LANG": "C.UTF-8",
    "PYTHONDONTWRITEBYTECODE": "1",
    "PYTHONNOUSERSITE": "1",
    "PIP_NO_CACHE_DIR": "1",
    "PIP_DISABLE_PIP_VERSION_CHECK": "1",
    "PIP_ROOT_USER_ACTION": "ignore",
}
HASH_LOCKED_PIP_OPTIONS = ("--only-binary=:all:", "--require-hashes")


class InstallError(RuntimeError):
    pass


def _regular_nonsymlink(path: Path, label: str) -> os.stat_result:
    try:
        info = path.lstat()
    except OSError as error:
        raise InstallError(f"{label} is unavailable.") from error
    if not stat.S_ISREG(info.st_mode) or stat.S_ISLNK(info.st_mode):
        raise InstallError(f"{label} must be a regular file, not a symlink.")
    return info


def _fingerprint(files: dict[str, bytes]) -> str:
    digest = hashlib.sha256()
    prefix = "src/witnessops_local_audit/"
    names = sorted(
        PurePosixPath(name).name
        for name in files
        if name.startswith(prefix) and name.endswith(".py") and "/" not in name[len(prefix):]
    )
    for name in names:
        digest.update(name.encode() + b"\0" + files[prefix + name] + b"\0")
    return digest.hexdigest()


def load_accepted_source(producer: Path = PRODUCER) -> tuple[dict[str, bytes], str]:
    """Verify the fixed archive and identity manifest before installation work."""
    manifest_path = producer / "identity.json"
    archive_path = producer / "local-audit-1.2.2.tar.gz"
    _regular_nonsymlink(manifest_path, "Producer identity manifest")
    _regular_nonsymlink(archive_path, "Producer archive")
    try:
        identity = json.loads(manifest_path.read_text(encoding="utf-8"))
        archive = archive_path.read_bytes()
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        raise InstallError("Producer identity input is invalid.") from error
    archive_digest = hashlib.sha256(archive).hexdigest()
    if not isinstance(identity, dict) or (
        identity.get("implementationCommit") != IMPLEMENTATION_COMMIT
        or identity.get("version") != PACKAGE_VERSION
        or identity.get("collectorFingerprint") != COLLECTOR_FINGERPRINT
        or identity.get("artifactSha256") != ARCHIVE_SHA256
        or archive_digest != ARCHIVE_SHA256
        or not isinstance(identity.get("files"), dict)
    ):
        raise InstallError("Producer identity verification failed.")

    expected = identity["files"]
    extracted: dict[str, bytes] = {}
    try:
        with tarfile.open(fileobj=io.BytesIO(archive), mode="r:gz") as bundle:
            members = bundle.getmembers()
            names = [member.name for member in members]
            if len(names) != len(set(names)) or set(names) != set(expected):
                raise InstallError("Producer archive file list is invalid.")
            for member in members:
                name = member.name
                path = PurePosixPath(name)
                if (
                    not member.isfile()
                    or path.is_absolute()
                    or ".." in path.parts
                    or not path.parts
                    or path.as_posix() != name
                    or member.size > 4 * 1024 * 1024
                ):
                    raise InstallError("Producer archive contains an unsupported path or file type.")
                source = bundle.extractfile(member)
                if source is None:
                    raise InstallError("Producer archive could not be read.")
                data = source.read()
                if hashlib.sha256(data).hexdigest() != expected.get(name):
                    raise InstallError("Producer file identity verification failed.")
                extracted[name] = data
    except (OSError, tarfile.TarError) as error:
        raise InstallError("Producer archive is invalid.") from error

    if _fingerprint(extracted) != COLLECTOR_FINGERPRINT:
        raise InstallError("Producer collector fingerprint verification failed.")
    if "pyproject.toml" not in extracted or "src/witnessops_local_audit/operator.py" not in extracted:
        raise InstallError("Producer package layout is incomplete.")
    return extracted, archive_digest


def validate_report(report: object, *, expected_fingerprint: str = COLLECTOR_FINGERPRINT) -> None:
    if not isinstance(report, dict):
        raise InstallError("Runtime identity check failed.")
    expected = {
        "packageVersion": PACKAGE_VERSION,
        "setuptoolsVersion": SETUPTOOLS_VERSION,
        "cryptographyVersion": CRYPTOGRAPHY_VERSION,
        "collectorFingerprint": expected_fingerprint,
    }
    if any(report.get(key) != value for key, value in expected.items()):
        raise InstallError("Runtime version or collector fingerprint check failed.")


def _safe_directory(path: Path, expected_uid: int) -> os.stat_result:
    info = path.lstat()
    if not stat.S_ISDIR(info.st_mode) or stat.S_ISLNK(info.st_mode):
        raise InstallError("Runtime contains an unsafe directory.")
    if info.st_uid != expected_uid or info.st_mode & 0o022:
        raise InstallError("Runtime ownership or write permissions are unsafe.")
    return info


def validate_runtime_tree(
    runtime: Path,
    expected_uid: int,
    *,
    check_ancestors: bool = True,
    expected_fingerprint: str = COLLECTOR_FINGERPRINT,
) -> str:
    """Apply the runtime file, owner, mode and identity checks used by wops."""
    runtime = runtime.absolute()
    resolved_runtime = runtime.resolve(strict=True)
    _safe_directory(runtime, expected_uid)
    _safe_directory(runtime / "bin", expected_uid)
    python = runtime / "bin/python3"
    try:
        real_python = python.resolve(strict=True)
        python_stat = real_python.lstat()
    except OSError as error:
        raise InstallError("Runtime Python is unavailable.") from error
    allowed_python_owners = {expected_uid, 0} if not check_ancestors else {expected_uid}
    if (
        not stat.S_ISREG(python_stat.st_mode)
        or python_stat.st_uid not in allowed_python_owners
        or python_stat.st_mode & 0o022
    ):
        raise InstallError("Runtime Python ownership or permissions are unsafe.")

    count = 0
    visited: set[Path] = set()

    def walk(path: Path) -> None:
        nonlocal count
        count += 1
        if count > MAX_RUNTIME_FILES:
            raise InstallError("Runtime file limit exceeded.")
        try:
            actual = path.resolve(strict=True)
            if actual in visited:
                return
            visited.add(actual)
            info = actual.lstat()
        except OSError as error:
            raise InstallError("Runtime contains an unreadable path.") from error
        within_runtime = actual == resolved_runtime or resolved_runtime in actual.parents
        allowed_owner = expected_uid if within_runtime or check_ancestors else 0
        parent = actual
        while True:
            parent_info = parent.lstat()
            if parent_info.st_uid != allowed_owner or parent_info.st_mode & 0o022:
                raise InstallError("Runtime code path ownership or permissions are unsafe.")
            if parent == Path("/") or (parent == resolved_runtime and not check_ancestors):
                break
            parent = parent.parent
        if stat.S_ISDIR(info.st_mode):
            for child in actual.iterdir():
                walk(child)
        elif not stat.S_ISREG(info.st_mode):
            raise InstallError("Runtime contains an unsupported file type.")

    walk(runtime)
    try:
        result = subprocess.run(
            [str(python), "-I", "-c", RUNTIME_PROBE],
            check=True,
            text=True,
            capture_output=True,
            env=SAFE_ENV,
            timeout=15,
        )
        validate_report(json.loads(result.stdout), expected_fingerprint=expected_fingerprint)
        for command in (
            [str(python), "-I", "-m", "witnessops_local_audit.operator", "audit", "capture", "--help"],
            [str(python), "-I", "-m", "witnessops_local_audit.operator", "audit", "finalize", "--help"],
        ):
            subprocess.run(
                command,
                check=True,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                env=SAFE_ENV,
                timeout=10,
            )
    except (OSError, subprocess.SubprocessError, json.JSONDecodeError) as error:
        raise InstallError("Runtime version, import or entry-point check failed.") from error
    return expected_fingerprint


def _check_installed_target(target: Path) -> None:
    if target != TARGET:
        raise InstallError("Only the fixed Local Audit runtime target is supported.")
    for path in (Path("/opt"), Path("/opt/witnessops"), target, target / "runtime", target / "runtime/bin"):
        _safe_directory(path, 0)
    staging = target / "staging"
    try:
        info = staging.lstat()
    except OSError as error:
        raise InstallError("Root-only CLI staging directory is unavailable.") from error
    if (
        not stat.S_ISDIR(info.st_mode)
        or stat.S_ISLNK(info.st_mode)
        or info.st_uid != 0
        or stat.S_IMODE(info.st_mode) != 0o700
    ):
        raise InstallError("Root-only CLI staging directory has unsafe custody.")
    validate_runtime_tree(target / "runtime", 0)


def _verify_python_environment(python: str = sys.executable) -> None:
    try:
        libc = os.confstr("CS_GNU_LIBC_VERSION") if sys.platform == "linux" else None
    except (AttributeError, OSError, ValueError):
        libc = None
    libc_match = re.fullmatch(r"glibc (\d+)\.(\d+)", libc or "")
    if (
        sys.platform != "linux"
        or platform.python_implementation() != "CPython"
        or platform.machine() != "x86_64"
        or sys.version_info.major != 3
        or sys.version_info.minor not in CFFI_WHEEL_SHA256
        or not libc_match
        or tuple(map(int, libc_match.groups())) < (2, 17)
    ):
        raise InstallError("CPython 3.11-3.14 on x86_64 glibc 2.17 or newer is required.")
    try:
        import venv  # noqa: F401
    except ImportError as error:
        raise InstallError("Python venv support is unavailable; no system package was installed.") from error
    if not Path(python).is_absolute():
        raise InstallError("Python executable path is invalid.")


def _write_source(files: dict[str, bytes], destination: Path) -> None:
    for name, data in files.items():
        relative = PurePosixPath(name)
        target = destination.joinpath(*relative.parts)
        target.parent.mkdir(parents=True, exist_ok=True, mode=0o755)
        target.write_bytes(data)
        target.chmod(0o644)


def _dependency_requirements(python_minor: int = sys.version_info.minor) -> str:
    cffi_hash = CFFI_WHEEL_SHA256.get(python_minor)
    if cffi_hash is None:
        raise InstallError("No hash-pinned cffi wheel is accepted for this Python version.")
    return (
        f"setuptools=={SETUPTOOLS_VERSION} --hash=sha256:{SETUPTOOLS_WHEEL_SHA256}\n"
        f"cryptography=={CRYPTOGRAPHY_VERSION} "
        f"{' '.join(f'--hash=sha256:{digest}' for digest in CRYPTOGRAPHY_WHEEL_SHA256)}\n"
        f"cffi=={CFFI_VERSION} --hash=sha256:{cffi_hash}\n"
        f"pycparser=={PYCPARSER_VERSION} --hash=sha256:{PYCPARSER_WHEEL_SHA256}\n"
    )


def _pip_install_requirements(
    python: str,
    requirements_file: Path,
    pip_options: tuple[str, ...] = (),
) -> None:
    _run_hidden(
        [
            python,
            "-m",
            "pip",
            "install",
            "--no-cache-dir",
            "--disable-pip-version-check",
            *HASH_LOCKED_PIP_OPTIONS,
            *pip_options,
            "-r",
            str(requirements_file),
        ],
        SAFE_ENV,
    )


def _install_runtime_dependencies(venv_python: Path, stage: Path) -> None:
    requirements = stage / "requirements.txt"
    requirements.write_text(_dependency_requirements(), encoding="utf-8")
    requirements.chmod(0o600)
    try:
        _pip_install_requirements(str(venv_python), requirements)
    finally:
        requirements.unlink(missing_ok=True)


def _run_hidden(command: list[str], env: dict[str, str], timeout: int = 600) -> None:
    try:
        subprocess.run(command, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, env=env, timeout=timeout)
    except (OSError, subprocess.SubprocessError) as error:
        raise InstallError("Pinned runtime preparation failed.") from error


def _rewrite_entrypoint_paths(runtime: Path, final_runtime: Path) -> None:
    old = str(runtime).encode()
    new = str(final_runtime).encode()
    if len(new) > 120:
        raise InstallError("Fixed runtime path is too long for an entry point.")
    for path in (runtime / "bin").iterdir():
        if not path.is_file() or path.is_symlink():
            continue
        try:
            data = path.read_bytes()
        except OSError as error:
            raise InstallError("Runtime entry point could not be inspected.") from error
        if old in data:
            path.write_bytes(data.replace(old, new))


def _build_runtime(
    stage: Path,
    files: dict[str, bytes],
    final_runtime: Path,
    python: str,
    expected_uid: int,
    *,
    check_ancestors: bool = True,
) -> None:
    previous_umask = os.umask(0o022)
    try:
        source = stage / "source"
        runtime = stage / "runtime"
        _write_source(files, source)
        _run_hidden([python, "-m", "venv", str(runtime)], SAFE_ENV)
        venv_python = runtime / "bin/python3"
        _install_runtime_dependencies(venv_python, stage)
        _run_hidden(
            [
                str(venv_python), "-m", "pip", "install", "--no-cache-dir", "--no-deps",
                "--no-build-isolation", str(source),
            ],
            SAFE_ENV,
        )
        shutil.rmtree(source)
        _rewrite_entrypoint_paths(runtime, final_runtime)
        staging = stage / "staging"
        staging.mkdir(mode=0o700)
        staging.chmod(0o700)
        stage.chmod(0o755)
    finally:
        os.umask(previous_umask)
    validate_runtime_tree(runtime, expected_uid, check_ancestors=check_ancestors)


def _ensure_secure_parent(parent: Path, expected_uid: int) -> bool:
    created = False
    _safe_directory(Path("/opt"), 0)
    if parent == Path("/opt/witnessops") and not os.path.lexists(parent):
        parent.mkdir(mode=0o755)
        created = True
    try:
        _safe_directory(parent, expected_uid)
    except (InstallError, OSError):
        if created:
            parent.rmdir()
        raise
    return created


def _rename_noreplace(source: Path, target: Path) -> None:
    """Atomically publish on Linux, refusing an existing target even on races."""
    libc = ctypes.CDLL(None, use_errno=True)
    renameat2 = getattr(libc, "renameat2", None)
    if renameat2 is None:
        raise InstallError("Atomic no-replace rename is unavailable on this host.")
    renameat2.argtypes = [ctypes.c_int, ctypes.c_char_p, ctypes.c_int, ctypes.c_char_p, ctypes.c_uint]
    renameat2.restype = ctypes.c_int
    result = renameat2(-100, os.fsencode(source), -100, os.fsencode(target), 1)  # RENAME_NOREPLACE
    if result != 0:
        code = ctypes.get_errno()
        if code == errno.EEXIST:
            raise InstallError("Target already exists; replacement is not supported.")
        raise InstallError("Atomic runtime publication failed.")


def check_mode(producer: Path = PRODUCER, target: Path = TARGET, python: str = sys.executable) -> str:
    files, archive_digest = load_accepted_source(producer)
    if os.path.lexists(target):
        _check_installed_target(target)
        return archive_digest
    _verify_python_environment(python)
    # A disposable isolated runtime validates dependencies and entry points
    # without changing the fixed /opt installation path.
    expected_uid = os.geteuid()
    with tempfile.TemporaryDirectory(prefix="wops-local-audit-check-") as temp:
        stage = Path(temp) / "stage"
        stage.mkdir(mode=0o700)
        _build_runtime(stage, files, TARGET / "runtime", python, expected_uid, check_ancestors=False)
    return archive_digest


def apply_mode(
    producer: Path = PRODUCER,
    target: Path = TARGET,
    python: str = sys.executable,
    expected_uid: int = 0,
    require_root: bool = True,
) -> str:
    if target != TARGET and require_root:
        raise InstallError("Only the fixed Local Audit runtime target is supported.")
    if require_root and os.geteuid() != 0:
        raise InstallError("Run --apply as root.")
    if sys.platform != "linux":
        raise InstallError("The Local Audit runtime installer supports Linux only.")
    files, archive_digest = load_accepted_source(producer)
    _verify_python_environment(python)
    if os.path.lexists(target):
        raise InstallError("Target already exists; replacement is not supported.")
    parent_created = _ensure_secure_parent(target.parent, expected_uid)
    stage: Path | None = None
    try:
        stage = Path(tempfile.mkdtemp(prefix=".local-audit-1.2.2.install-", dir=target.parent))
        stage.chmod(0o700)
        final_runtime = target / "runtime"
        _build_runtime(stage, files, final_runtime, python, expected_uid)
        stage_info = stage.lstat()
        if stage_info.st_uid != expected_uid or stat.S_IMODE(stage_info.st_mode) != 0o755:
            raise InstallError("Staged installation ownership or mode is unsafe.")
        _rename_noreplace(stage, target)
        stage = None
        _check_installed_target(target)
        return archive_digest
    finally:
        if stage is not None:
            shutil.rmtree(stage, ignore_errors=True)
        if parent_created:
            try:
                target.parent.rmdir()
            except OSError:
                pass


def _fsync_directory(path: Path) -> None:
    descriptor = os.open(path, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
    try:
        os.fsync(descriptor)
    finally:
        os.close(descriptor)


def _evidence_tree_digest(root: Path, expected_uid: int) -> str:
    """Hash a private evidence tree without following links or changing it."""
    digest = hashlib.sha256()
    entries_seen = 0
    bytes_seen = 0

    def visit(path: Path, relative: str) -> None:
        nonlocal entries_seen, bytes_seen
        entries_seen += 1
        if entries_seen > MAX_EVIDENCE_ENTRIES:
            raise InstallError("Retained evidence entry limit exceeded.")
        try:
            info = path.lstat()
        except OSError as error:
            raise InstallError("Retained evidence tree could not be inspected.") from error
        if info.st_uid != expected_uid or info.st_mode & 0o022:
            raise InstallError("Retained evidence ownership or permissions are unsafe.")
        digest.update(relative.encode("utf-8") + b"\0")
        digest.update(f"{stat.S_IFMT(info.st_mode):o}:{stat.S_IMODE(info.st_mode):04o}:{info.st_uid}:{info.st_gid}\0".encode())
        if stat.S_ISDIR(info.st_mode):
            for child in sorted(path.iterdir(), key=lambda item: item.name):
                visit(child, f"{relative}/{child.name}")
            return
        if not stat.S_ISREG(info.st_mode):
            raise InstallError("Retained evidence tree contains an unsupported file type.")
        bytes_seen += info.st_size
        if bytes_seen > MAX_EVIDENCE_BYTES:
            raise InstallError("Retained evidence byte limit exceeded.")
        file_hash = hashlib.sha256()
        flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0)
        try:
            descriptor = os.open(path, flags)
            with os.fdopen(descriptor, "rb") as stream:
                opened = os.fstat(stream.fileno())
                if (opened.st_dev, opened.st_ino, opened.st_size) != (info.st_dev, info.st_ino, info.st_size):
                    raise InstallError("Retained evidence changed during inspection.")
                for chunk in iter(lambda: stream.read(1024 * 1024), b""):
                    file_hash.update(chunk)
                after = os.fstat(stream.fileno())
                if (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns) != (
                    opened.st_dev, opened.st_ino, opened.st_size, opened.st_mtime_ns
                ):
                    raise InstallError("Retained evidence changed during inspection.")
        except OSError as error:
            raise InstallError("Retained evidence file could not be hashed.") from error
        digest.update(file_hash.digest())

    visit(root, ".")
    return digest.hexdigest()


def _rename_exchange(left: Path, right: Path) -> None:
    """Atomically exchange two directories on the same filesystem."""
    libc = ctypes.CDLL(None, use_errno=True)
    renameat2 = getattr(libc, "renameat2", None)
    if renameat2 is None:
        raise InstallError("Atomic runtime exchange is unavailable on this host.")
    renameat2.argtypes = [ctypes.c_int, ctypes.c_char_p, ctypes.c_int, ctypes.c_char_p, ctypes.c_uint]
    renameat2.restype = ctypes.c_int
    result = renameat2(-100, os.fsencode(left), -100, os.fsencode(right), 2)  # RENAME_EXCHANGE
    if result != 0:
        raise InstallError("Atomic runtime exchange failed; installed runtime was not intentionally changed.")


def _acquire_runtime_exclusive_lock(target: Path, expected_uid: int) -> int:
    lock_path = target.parent / RUNTIME_LOCK_NAME
    try:
        info = lock_path.lstat()
        if (not stat.S_ISREG(info.st_mode) or stat.S_ISLNK(info.st_mode)
                or info.st_uid != expected_uid or stat.S_IMODE(info.st_mode) != 0o600):
            raise InstallError("Shared runtime lock custody is unsafe; upgrade refused.")
        descriptor = os.open(lock_path, os.O_RDWR | getattr(os, "O_NOFOLLOW", 0))
        opened = os.fstat(descriptor)
        if (opened.st_dev, opened.st_ino, opened.st_uid, stat.S_IMODE(opened.st_mode)) != (
            info.st_dev, info.st_ino, expected_uid, 0o600
        ):
            os.close(descriptor)
            raise InstallError("Shared runtime lock changed during inspection; upgrade refused.")
    except OSError as error:
        raise InstallError("Shared runtime lock is unavailable; install the current root launcher first.") from error
    try:
        fcntl.flock(descriptor, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError as error:
        os.close(descriptor)
        raise InstallError("A server check is using the Local Audit runtime; upgrade refused.") from error
    return descriptor


def _check_upgrade_layout(target: Path, expected_uid: int, *, require_root: bool) -> tuple[str, str]:
    if require_root and target != TARGET:
        raise InstallError("Only the fixed Local Audit runtime target is supported.")
    if require_root:
        _safe_directory(Path("/opt"), 0)
        _safe_directory(Path("/opt/witnessops"), 0)
    _safe_directory(target.parent, expected_uid)
    _safe_directory(target, expected_uid)
    try:
        names = {entry.name for entry in target.iterdir()}
    except OSError as error:
        raise InstallError("Installed runtime layout is unavailable.") from error
    if names != {"runtime", "staging"}:
        raise InstallError("Installed runtime layout is unexpected; upgrade refused.")
    runtime_fingerprint = validate_runtime_tree(
        target / "runtime", expected_uid, check_ancestors=require_root,
        expected_fingerprint=PREVIOUS_COLLECTOR_FINGERPRINT
    )
    staging = target / "staging"
    try:
        info = staging.lstat()
    except OSError as error:
        raise InstallError("Root-only CLI staging directory is unavailable.") from error
    if not stat.S_ISDIR(info.st_mode) or stat.S_ISLNK(info.st_mode) or info.st_uid != expected_uid or stat.S_IMODE(info.st_mode) != 0o700:
        raise InstallError("Root-only CLI staging directory has unsafe custody.")
    evidence_digest = _evidence_tree_digest(staging, expected_uid)
    return runtime_fingerprint, evidence_digest


def _upgrade_mode_locked(
    producer: Path = PRODUCER,
    target: Path = TARGET,
    python: str = sys.executable,
    expected_uid: int = 0,
    require_root: bool = True,
) -> tuple[str, str, str, str, str]:
    """Upgrade only runtime/ from the one accepted old fingerprint."""
    if target != TARGET and require_root:
        raise InstallError("Only the fixed Local Audit runtime target is supported.")
    if require_root and os.geteuid() != 0:
        raise InstallError("Run --upgrade as root.")
    if sys.platform != "linux":
        raise InstallError("The Local Audit runtime installer supports Linux only.")
    _verify_python_environment(python)
    old_fingerprint, evidence_before = _check_upgrade_layout(target, expected_uid, require_root=require_root)
    if old_fingerprint != PREVIOUS_COLLECTOR_FINGERPRINT:
        raise InstallError("Current collector fingerprint is not the one accepted for upgrade.")
    previous_upgrade_stages = list(target.parent.glob(".local-audit-1.2.2.upgrade-*"))
    if previous_upgrade_stages:
        raise InstallError("A prior Local Audit rollback artifact exists; inspect it before another upgrade.")
    files, archive_digest = load_accepted_source(producer)
    parent_created = _ensure_secure_parent(target.parent, expected_uid) if require_root else False
    stage: Path | None = None
    runtime_lock_fd: int | None = None
    exchanged = False
    retain_stage = False
    try:
        stage = Path(tempfile.mkdtemp(prefix=".local-audit-1.2.2.upgrade-", dir=target.parent))
        stage.chmod(0o700)
        _fsync_directory(target.parent)
        final_runtime = target / "runtime"
        _build_runtime(stage, files, final_runtime, python, expected_uid, check_ancestors=False)
        validate_runtime_tree(
            stage / "runtime", expected_uid, check_ancestors=False, expected_fingerprint=COLLECTOR_FINGERPRINT
        )
        # _build_runtime creates this private staging path for first installs;
        # it is not part of the new runtime and must not be exchanged.
        temporary_staging = stage / "staging"
        if temporary_staging.exists():
            shutil.rmtree(temporary_staging)
        stage.chmod(0o700)
        # The installed launcher holds this same lock shared for the complete
        # privileged CLI process. Do not exchange runtime code during a check.
        runtime_lock_fd = _acquire_runtime_exclusive_lock(target, expected_uid)
        _rename_exchange(stage / "runtime", target / "runtime")
        exchanged = True
        _fsync_directory(target)
        _fsync_directory(stage)
        try:
            validate_runtime_tree(target / "runtime", expected_uid, check_ancestors=require_root)
            evidence_after = _evidence_tree_digest(target / "staging", expected_uid)
            if evidence_after != evidence_before:
                raise InstallError("Retained evidence changed during runtime upgrade.")
            stage_info = _safe_directory(stage, expected_uid)
            if stat.S_IMODE(stage_info.st_mode) != 0o700:
                raise InstallError("Rollback artifact directory mode is unexpected.")
            if {entry.name for entry in stage.iterdir()} != {"runtime"}:
                raise InstallError("Rollback artifact layout is unexpected.")
            validate_runtime_tree(
                stage / "runtime", expected_uid, check_ancestors=False,
                expected_fingerprint=PREVIOUS_COLLECTOR_FINGERPRINT,
            )
            _fsync_directory(target.parent)
        except BaseException:
            try:
                _rename_exchange(stage / "runtime", target / "runtime")
            except InstallError as rollback_error:
                retain_stage = True
                raise InstallError(
                    f"Runtime verification failed; previous runtime remains at {stage / 'runtime'} "
                    "but atomic rollback could not be completed."
                ) from rollback_error
            exchanged = False
            _fsync_directory(target)
            _fsync_directory(stage)
            validate_runtime_tree(
                target / "runtime", expected_uid, check_ancestors=require_root,
                expected_fingerprint=PREVIOUS_COLLECTOR_FINGERPRINT
            )
            if _evidence_tree_digest(target / "staging", expected_uid) != evidence_before:
                raise InstallError("Retained evidence differs after rollback; rollback runtime preserved.")
            raise

        rollback_reference = stage / "runtime"
        retain_stage = True
        stage = None
        return archive_digest, evidence_before, evidence_after, "retained-as-rollback-artifact", str(rollback_reference)
    finally:
        if runtime_lock_fd is not None:
            os.close(runtime_lock_fd)
        if stage is not None and not retain_stage:
            # Before exchange this is only the staged new runtime. After a
            # successful exchange stage/runtime is the old runtime; preserve
            # it if the function did not reach its explicit verified cleanup.
            if not exchanged:
                shutil.rmtree(stage, ignore_errors=True)
        if parent_created:
            try:
                target.parent.rmdir()
            except OSError:
                pass


def upgrade_mode(
    producer: Path = PRODUCER,
    target: Path = TARGET,
    python: str = sys.executable,
    expected_uid: int = 0,
    require_root: bool = True,
) -> tuple[str, str, str, str, str]:
    """Serialize upgrades through the already existing target directory."""
    if require_root and target != TARGET:
        raise InstallError("Only the fixed Local Audit runtime target is supported.")
    try:
        descriptor = os.open(target, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0) | getattr(os, "O_NOFOLLOW", 0))
    except OSError as error:
        raise InstallError("Installed runtime target cannot be locked safely.") from error
    try:
        try:
            fcntl.flock(descriptor, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError as error:
            raise InstallError("Another Local Audit runtime upgrade is already in progress.") from error
        return _upgrade_mode_locked(producer, target, python, expected_uid, require_root)
    finally:
        os.close(descriptor)


def main(argv: list[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    if args not in (["--check"], ["--apply"], ["--upgrade"]):
        print("Usage: install_local_audit_1_2_2.py --check | --apply | --upgrade", file=sys.stderr)
        return 2
    try:
        if args[0] == "--check":
            archive_digest = check_mode()
            runtime_state = "installed-runtime-verified" if os.path.lexists(TARGET) else "temporary-runtime-verified"
        elif args[0] == "--apply":
            archive_digest = apply_mode()
            runtime_state = "installed-runtime-verified"
        else:
            archive_digest, evidence_before, evidence_after, rollback_disposition, rollback_reference = upgrade_mode()
            runtime_state = "upgraded-runtime-verified"
        print(
            f"status=PASS\narchive_sha256={archive_digest}\npackage_version={PACKAGE_VERSION}\n"
            f"cryptography_version={CRYPTOGRAPHY_VERSION}\ncollector_fingerprint={COLLECTOR_FINGERPRINT}\n"
            f"runtime={runtime_state}"
        )
        if args[0] == "--upgrade":
            print(f"retained_staging_sha256_before={evidence_before}")
            print(f"retained_staging_sha256_after={evidence_after}")
            print("retained_staging_preserved=true")
            print(f"previous_runtime_fingerprint={PREVIOUS_COLLECTOR_FINGERPRINT}")
            print(f"previous_runtime_disposition={rollback_disposition}")
            print(f"previous_runtime_reference={rollback_reference}")
        return 0
    except InstallError as error:
        print(str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
