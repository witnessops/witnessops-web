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
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import stat
import subprocess
import sys
import tarfile
import tempfile


IMPLEMENTATION_COMMIT = "fce41c194522e9d08d0683aa786bd4361c5ae0c2"
ARCHIVE_SHA256 = "f5797a09d9cbaa87b55dd8511aef7316d1a3a5317df245a3d66f30e2b1a8a884"
COLLECTOR_FINGERPRINT = "2209c2b63de319b91452b4d7705c5f5178a1a13b6156f601b5ad588c11d280f8"
PACKAGE_VERSION = "1.2.2"
SETUPTOOLS_VERSION = "80.9.0"
CRYPTOGRAPHY_VERSION = "50.0.1"
TARGET = Path("/opt/witnessops/local-audit-1.2.2")
REPOSITORY_ROOT = Path(__file__).resolve().parents[3]
PRODUCER = REPOSITORY_ROOT / "tests/server-check/producer"
MAX_RUNTIME_FILES = 30_000
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


def validate_report(report: object) -> None:
    if not isinstance(report, dict):
        raise InstallError("Runtime identity check failed.")
    expected = {
        "packageVersion": PACKAGE_VERSION,
        "setuptoolsVersion": SETUPTOOLS_VERSION,
        "cryptographyVersion": CRYPTOGRAPHY_VERSION,
        "collectorFingerprint": COLLECTOR_FINGERPRINT,
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


def validate_runtime_tree(runtime: Path, expected_uid: int, *, check_ancestors: bool = True) -> str:
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
        validate_report(json.loads(result.stdout))
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
    return COLLECTOR_FINGERPRINT


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
    if sys.platform != "linux" or sys.version_info < (3, 11):
        raise InstallError("A Linux host with Python 3.11 or newer is required.")
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
        _run_hidden(
            [
                str(venv_python), "-m", "pip", "install", "--no-cache-dir", "--disable-pip-version-check",
                f"setuptools=={SETUPTOOLS_VERSION}", f"cryptography=={CRYPTOGRAPHY_VERSION}",
            ],
            SAFE_ENV,
        )
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


def main(argv: list[str] | None = None) -> int:
    args = list(sys.argv[1:] if argv is None else argv)
    if args not in (["--check"], ["--apply"]):
        print("Usage: install_local_audit_1_2_2.py --check | --apply", file=sys.stderr)
        return 2
    try:
        if args[0] == "--check":
            archive_digest = check_mode()
            runtime_state = "installed-runtime-verified" if os.path.lexists(TARGET) else "temporary-runtime-verified"
        else:
            archive_digest = apply_mode()
            runtime_state = "installed-runtime-verified"
        print(
            f"status=PASS\narchive_sha256={archive_digest}\npackage_version={PACKAGE_VERSION}\n"
            f"cryptography_version={CRYPTOGRAPHY_VERSION}\ncollector_fingerprint={COLLECTOR_FINGERPRINT}\n"
            f"runtime={runtime_state}"
        )
        return 0
    except InstallError as error:
        print(str(error), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
