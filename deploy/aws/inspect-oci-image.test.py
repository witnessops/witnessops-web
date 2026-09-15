import hashlib
import importlib.util
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("oci", Path(__file__).with_name("inspect-oci-image.py"))
oci = importlib.util.module_from_spec(spec)
spec.loader.exec_module(oci)


class OciTests(unittest.TestCase):
    def archive(self, change=lambda entries: None, arch="amd64"):
        entries = {}
        def blob(value, media):
            raw = json.dumps(value).encode()
            digest = hashlib.sha256(raw).hexdigest()
            entries["blobs/sha256/" + digest] = raw
            return {"digest": "sha256:" + digest, "size": len(raw), "mediaType": media}
        config = blob({"os": "linux", "architecture": arch}, "application/vnd.oci.image.config.v1+json")
        manifest = blob({"mediaType": "application/vnd.oci.image.manifest.v1+json", "config": config, "layers": []}, "application/vnd.oci.image.manifest.v1+json")
        entries["index.json"] = json.dumps({"manifests": [manifest]}).encode()
        change(entries)
        temp = tempfile.NamedTemporaryFile(suffix=".tar")
        with tarfile.open(temp.name, "w") as tar:
            for name, data in entries.items():
                info = tarfile.TarInfo(name)
                info.size = len(data)
                tar.addfile(info, io.BytesIO(data))
        return temp, manifest, config

    def test_identity(self):
        temp, manifest, config = self.archive()
        with temp:
            self.assertEqual(oci.inspect_image(temp.name), {"image_digest": manifest["digest"], "config_digest": config["digest"]})

    def test_tamper(self):
        def change(entries):
            name = next(iter(entries))
            entries[name] += b" "
        temp, _, _ = self.archive(change)
        with temp, self.assertRaises(ValueError):
            oci.inspect_image(temp.name)

    def test_wrong_architecture(self):
        temp, _, _ = self.archive(arch="arm64")
        with temp, self.assertRaises(ValueError):
            oci.inspect_image(temp.name)

    def test_multiple_images(self):
        def change(entries):
            index = json.loads(entries["index.json"])
            index["manifests"] *= 2
            entries["index.json"] = json.dumps(index).encode()
        temp, _, _ = self.archive(change)
        with temp, self.assertRaises(ValueError):
            oci.inspect_image(temp.name)

    def test_path_traversal(self):
        def change(entries):
            index = json.loads(entries["index.json"])
            index["manifests"][0]["digest"] = "sha256:../../outside"
            entries["index.json"] = json.dumps(index).encode()
        temp, _, _ = self.archive(change)
        with temp, self.assertRaises(ValueError):
            oci.inspect_image(temp.name)

if __name__ == "__main__":
    unittest.main()
