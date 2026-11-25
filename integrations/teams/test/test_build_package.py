import importlib.util
import json
import pathlib
import tempfile
import unittest
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("teams_pkg_builder", ROOT / "build-package.py")
BUILDER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BUILDER)
SYNTHETIC_ID = "a0000000-0000-4000-8000-000000000123"


class PackageContractTest(unittest.TestCase):
    def test_sso_manifest_binds_one_named_app_and_one_trusted_domain(self):
        with tempfile.TemporaryDirectory() as directory:
            destination = pathlib.Path(directory) / "teams.zip"
            BUILDER.make_package(destination, SYNTHETIC_ID)
            with zipfile.ZipFile(destination) as archive:
                self.assertIsNone(archive.testzip())
                self.assertEqual(set(archive.namelist()), {"manifest.json", "color.png", "outline.png"})
                manifest = json.loads(archive.read("manifest.json"))
                self.assertEqual(manifest["staticTabs"][0]["scopes"], ["personal"])
                self.assertEqual(manifest["validDomains"], ["academy.witnessops.com"])
                self.assertEqual(manifest["webApplicationInfo"], {
                    "id": SYNTHETIC_ID,
                    "resource": "api://academy.witnessops.com/" + SYNTHETIC_ID,
                })
                for name, size in (("color.png", 96), ("outline.png", 20)):
                    data = archive.read(name)
                    self.assertEqual(data[:8], bytes.fromhex("89504e470d0a1a0a"))
                    self.assertEqual(int.from_bytes(data[16:20], "big"), size)
                    self.assertEqual(int.from_bytes(data[20:24], "big"), size)

    def test_default_manifest_does_not_claim_to_have_sso(self):
        with tempfile.TemporaryDirectory() as directory:
            destination = pathlib.Path(directory) / "teams.zip"
            BUILDER.make_package(destination)
            with zipfile.ZipFile(destination) as archive:
                manifest = json.loads(archive.read("manifest.json"))
                self.assertNotIn("webApplicationInfo", manifest)

    def test_bad_app_identifiers_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            destination = pathlib.Path(directory) / "teams.zip"
            for bad in ("", "random", "00000000-0000-4000-8000-000000000123?evil", SYNTHETIC_ID.upper()):
                with self.subTest(bad=bad):
                    with self.assertRaises(SystemExit):
                        BUILDER.make_package(destination, bad)
            self.assertFalse(destination.exists())

    def test_private_zip_is_byte_deterministic(self):
        with tempfile.TemporaryDirectory() as directory:
            a, b = (pathlib.Path(directory) / name for name in ("a.zip", "b.zip"))
            BUILDER.make_package(a, SYNTHETIC_ID)
            BUILDER.make_package(b, SYNTHETIC_ID)
            self.assertEqual(a.read_bytes(), b.read_bytes())


if __name__ == "__main__":
    unittest.main()
