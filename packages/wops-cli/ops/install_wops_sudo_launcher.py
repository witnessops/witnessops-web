#!/usr/bin/env python3
"""Install the root-owned sudo entrypoint after validating fixed Node/CLI custody."""
from __future__ import annotations

import argparse
import os
from pathlib import Path
import re
import stat
import subprocess
import tempfile


NODE = Path("/usr/bin/node")
MAIN = Path("/usr/local/lib/node_modules/@witnessops/cli/src/main.mjs")
DESTINATION = Path("/usr/local/bin/wops")
CLI_ROOT = MAIN.parent.parent
TEMPLATE = Path(__file__).with_name("wops-sudo-launcher.sh.in")
SAFE_ENV = {"PATH": "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin", "LANG": "C"}


class InstallError(RuntimeError):
    pass


def _trusted_path(path: Path, *, file: bool, allow_symlink: bool = False) -> Path:
    try:
        resolved = path.resolve(strict=True)
    except OSError as error:
        raise InstallError(f"Required root-controlled path is unavailable: {path}") from error
    if not allow_symlink and resolved != path.absolute():
        raise InstallError(f"Required path must not resolve through a symlink: {path}")
    info = resolved.lstat()
    expected = stat.S_ISREG(info.st_mode) if file else stat.S_ISDIR(info.st_mode)
    if not expected or info.st_uid != 0 or info.st_mode & 0o022:
        raise InstallError(f"Required path is not root-controlled and non-writable: {path}")
    current = resolved.parent
    while current != Path("/"):
        parent = current.lstat()
        if not stat.S_ISDIR(parent.st_mode) or parent.st_uid != 0 or parent.st_mode & 0o022:
            raise InstallError(f"Path ancestor is not root-controlled and non-writable: {current}")
        current = current.parent
    return resolved


def render_launcher(node: Path = NODE, main: Path = MAIN, template: Path = TEMPLATE) -> bytes:
    source = template.read_text(encoding="utf-8")
    rendered = source.replace("@NODE_PATH@", str(node)).replace("@MAIN_PATH@", str(main))
    if "@NODE_PATH@" in rendered or "@MAIN_PATH@" in rendered:
        raise InstallError("Launcher template contains an unresolved fixed path.")
    return rendered.encode("utf-8")


def _trusted_tree(root: Path) -> None:
    root = _trusted_path(root, file=False)
    pending = [root]
    while pending:
        directory = pending.pop()
        try:
            entries = list(os.scandir(directory))
        except OSError as error:
            raise InstallError(f"Cannot inspect root-controlled CLI package: {directory}") from error
        for entry in entries:
            info = entry.stat(follow_symlinks=False)
            if info.st_uid != 0 or info.st_mode & 0o022:
                raise InstallError(f"CLI package tree is not root-controlled and non-writable: {entry.path}")
            if stat.S_ISDIR(info.st_mode):
                pending.append(Path(entry.path))
            elif not stat.S_ISREG(info.st_mode):
                raise InstallError(f"CLI package tree contains an unsupported entry: {entry.path}")


def validate_prerequisites(*, node: Path = NODE, main: Path = MAIN, destination: Path = DESTINATION) -> bytes:
    if os.geteuid() != 0:
        raise InstallError("Run the sudo launcher installer as root.")
    _trusted_path(node.parent, file=False)
    node_entry = node.lstat()
    if not (stat.S_ISREG(node_entry.st_mode) or stat.S_ISLNK(node_entry.st_mode)) or node_entry.st_uid != 0:
        raise InstallError(f"Required Node.js entrypoint is not root-controlled: {node}")
    _trusted_path(node, file=True, allow_symlink=True)
    _trusted_tree(main.parent.parent)
    main_real = _trusted_path(main, file=True)
    _trusted_path(destination.parent, file=False)
    try:
        result = subprocess.run([str(node), "--version"], check=True, capture_output=True, text=True,
                                timeout=5, env=SAFE_ENV)
    except (OSError, subprocess.SubprocessError) as error:
        raise InstallError("Root-controlled Node.js 22 is required at /usr/bin/node.") from error
    if not re.fullmatch(r"v22\.\d+\.\d+\s*", result.stdout):
        raise InstallError("Root-controlled Node.js 22 is required at /usr/bin/node.")
    try:
        info = destination.lstat()
    except FileNotFoundError:
        info = None
    if info is not None:
        desired = render_launcher(node, main)
        if stat.S_ISREG(info.st_mode) and info.st_uid == 0 and not info.st_mode & 0o022 and destination.read_bytes() == desired:
            return desired
        if not stat.S_ISLNK(info.st_mode) or destination.resolve(strict=True) != main_real:
            raise InstallError("Refusing to replace an unexpected existing /usr/local/bin/wops.")
    return render_launcher(node, main)


def apply(*, node: Path = NODE, main: Path = MAIN, destination: Path = DESTINATION) -> None:
    data = validate_prerequisites(node=node, main=main, destination=destination)
    with tempfile.NamedTemporaryFile(prefix=".wops-launcher-", dir=destination.parent, delete=False) as stream:
        temporary = Path(stream.name)
        stream.write(data)
        stream.flush()
        os.fsync(stream.fileno())
    try:
        os.chown(temporary, 0, 0)
        os.chmod(temporary, 0o755)
        os.replace(temporary, destination)
    finally:
        temporary.unlink(missing_ok=True)


def remove_launcher(*, node: Path = NODE, main: Path = MAIN, destination: Path = DESTINATION) -> None:
    if os.geteuid() != 0:
        raise InstallError("Run the sudo launcher installer as root.")
    try:
        info = destination.lstat()
    except FileNotFoundError:
        return
    if not stat.S_ISREG(info.st_mode) or info.st_uid != 0 or info.st_mode & 0o022:
        raise InstallError("Refusing to remove an unexpected /usr/local/bin/wops.")
    if destination.read_bytes() != render_launcher(node, main):
        raise InstallError("Refusing to remove an unexpected /usr/local/bin/wops.")
    destination.unlink()
    descriptor = os.open(destination.parent, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
    try:
        os.fsync(descriptor)
    finally:
        os.close(descriptor)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    modes = parser.add_mutually_exclusive_group(required=True)
    modes.add_argument("--check", action="store_true")
    modes.add_argument("--apply", action="store_true")
    modes.add_argument("--remove", action="store_true")
    args = parser.parse_args()
    try:
        if args.remove:
            remove_launcher()
            print("status=PASS")
            print("launcher=removed")
            return 0
        validate_prerequisites()
        if args.apply:
            apply()
    except InstallError as error:
        parser.error(str(error))
    print("status=PASS")
    print("launcher=/usr/local/bin/wops")
    print("node=/usr/bin/node (root-controlled Node.js 22)")
    print("privileged_command=server check only")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
