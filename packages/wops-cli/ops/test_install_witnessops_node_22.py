from __future__ import annotations

import hashlib
import importlib.util
import io
import os
from pathlib import Path
import stat
import tarfile
import tempfile
import unittest
from unittest.mock import patch


SCRIPT = Path(__file__).with_name("install_witnessops_node_22.py")
SPEC = importlib.util.spec_from_file_location("witnessops_node22_installer", SCRIPT)
assert SPEC and SPEC.loader
installer = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(installer)


NODE_SCRIPT = b"#!/bin/sh\nprintf 'v22.23.3\\n'\n"


def make_archive(*, extra_member: tuple[str, bytes] | None = None, extra_link: bool = False) -> bytes:
    root = installer.ARCHIVE_ROOT
    directories = [
        root, f"{root}/bin", f"{root}/lib", f"{root}/lib/node_modules",
        f"{root}/lib/node_modules/corepack", f"{root}/lib/node_modules/corepack/dist",
        f"{root}/lib/node_modules/npm", f"{root}/lib/node_modules/npm/bin",
    ]
    files = {
        f"{root}/bin/node": NODE_SCRIPT,
        f"{root}/lib/node_modules/corepack/dist/corepack.js": b"// fixture\n",
        f"{root}/lib/node_modules/npm/bin/npm-cli.js": b"// fixture\n",
        f"{root}/lib/node_modules/npm/bin/npx-cli.js": b"// fixture\n",
    }
    if extra_member:
        files[extra_member[0]] = extra_member[1]
    output = io.BytesIO()
    with tarfile.open(fileobj=output, mode="w:xz") as archive:
        for name in directories:
            item = tarfile.TarInfo(name)
            item.type = tarfile.DIRTYPE
            item.mode = 0o755
            archive.addfile(item)
        for name, data in files.items():
            item = tarfile.TarInfo(name)
            item.size = len(data)
            item.mode = 0o755 if name.endswith("/node") else 0o644
            archive.addfile(item, io.BytesIO(data))
        for name, target in installer.EXPECTED_LINKS.items():
            item = tarfile.TarInfo(name)
            item.type = tarfile.SYMTYPE
            item.linkname = target
            archive.addfile(item)
        if extra_link:
            item = tarfile.TarInfo(f"{root}/bin/unexpected")
            item.type = tarfile.SYMTYPE
            item.linkname = "../../outside"
            archive.addfile(item)
    return output.getvalue()


class WitnessOpsNode22InstallerTest(unittest.TestCase):
    def with_pins(self, archive: bytes):
        return (
            patch.object(installer, "ARCHIVE_SHA256", hashlib.sha256(archive).hexdigest()),
            patch.object(installer, "NODE_BINARY_SHA256", hashlib.sha256(NODE_SCRIPT).hexdigest()),
        )

    def test_official_release_identity_is_pinned(self):
        self.assertEqual(installer.VERSION, "22.23.3")
        self.assertEqual(installer.SOURCE_URL, "https://nodejs.org/download/release/v22.23.3/node-v22.23.3-linux-x64.tar.xz")
        self.assertEqual(len(installer.ARCHIVE_SHA256), 64)
        self.assertEqual(len(installer.NODE_BINARY_SHA256), 64)

    def test_install_check_and_remove_validate_exact_runtime_tree(self):
        archive = make_archive()
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            archive_path = base / installer.ARCHIVE_NAME
            archive_path.write_bytes(archive)
            target = base / "node-22"
            patches = self.with_pins(archive)
            with patches[0], patches[1]:
                digest = installer.apply_archive(archive_path, target, os.getuid(), require_root=False)
                self.assertEqual(digest, hashlib.sha256(NODE_SCRIPT).hexdigest())
                self.assertEqual(installer.validate_installation(target, os.getuid(), check_ancestors=False), digest)
                node = target / "bin/node"
                self.assertEqual(stat.S_IMODE(node.stat().st_mode), 0o755)
                self.assertEqual(node.read_bytes(), NODE_SCRIPT)
                self.assertTrue((target / "bin/npm").is_symlink())
                installer.remove_installation(target, os.getuid(), require_root=False)
                self.assertFalse(target.exists())

    def test_tampered_archive_fails_before_target_creation(self):
        archive = make_archive()
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            archive_path = base / "node.tar.xz"
            archive_path.write_bytes(archive + b"tampered")
            target = base / "node-22"
            patches = self.with_pins(archive)
            with patches[0], patches[1], self.assertRaisesRegex(installer.InstallError, "SHA-256"):
                installer.apply_archive(archive_path, target, os.getuid(), require_root=False)
            self.assertFalse(target.exists())
            self.assertEqual(list(base.glob(".node-22.install-*")), [])

    def test_archive_path_traversal_rejected_even_with_matching_test_pin(self):
        archive = make_archive(extra_member=(f"{installer.ARCHIVE_ROOT}/../escape", b"bad"))
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "node.tar.xz"
            path.write_bytes(archive)
            patches = self.with_pins(archive)
            with patches[0], patches[1], self.assertRaisesRegex(installer.InstallError, "unsafe or duplicate path"):
                installer._archive_manifest(installer._read_archive(path))

    def test_unexpected_archive_symlink_rejected(self):
        archive = make_archive(extra_link=True)
        with tempfile.TemporaryDirectory() as temp:
            path = Path(temp) / "node.tar.xz"
            path.write_bytes(archive)
            patches = self.with_pins(archive)
            with patches[0], patches[1], self.assertRaisesRegex(installer.InstallError, "unexpected symbolic link"):
                installer._archive_manifest(installer._read_archive(path))

    def test_existing_target_fails_without_replacing_it(self):
        archive = make_archive()
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            archive_path = base / "node.tar.xz"
            archive_path.write_bytes(archive)
            target = base / "node-22"
            target.mkdir()
            marker = target / "keep"
            marker.write_bytes(b"existing")
            patches = self.with_pins(archive)
            with patches[0], patches[1], self.assertRaisesRegex(installer.InstallError, "already exists"):
                installer.apply_archive(archive_path, target, os.getuid(), require_root=False)
            self.assertEqual(marker.read_bytes(), b"existing")
            self.assertEqual(list(base.glob(".node-22.install-*")), [])

    def test_install_check_rejects_modified_file_and_writable_directory(self):
        archive = make_archive()
        with tempfile.TemporaryDirectory() as temp:
            base = Path(temp)
            archive_path = base / "node.tar.xz"
            archive_path.write_bytes(archive)
            target = base / "node-22"
            patches = self.with_pins(archive)
            with patches[0], patches[1]:
                installer.apply_archive(archive_path, target, os.getuid(), require_root=False)
                (target / "lib/node_modules/npm/bin/npm-cli.js").write_bytes(b"changed")
                with self.assertRaisesRegex(installer.InstallError, "digest differs"):
                    installer.validate_installation(target, os.getuid(), check_ancestors=False)
                (target / "lib/node_modules/npm/bin/npm-cli.js").write_bytes(b"// fixture\n")
                (target / "bin").chmod(0o777)
                with self.assertRaisesRegex(installer.InstallError, "unsafe owner or writable permissions"):
                    installer.validate_installation(target, os.getuid(), check_ancestors=False)


if __name__ == "__main__":
    unittest.main()
