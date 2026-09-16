"""Synthetic non-executable OCI fixture for gate/loopback registry tests only."""
import hashlib
import io
import json
import sys
import tarfile
from pathlib import Path

entries = {}
def blob(value, media):
    raw = json.dumps(value, separators=(",", ":")).encode()
    digest = hashlib.sha256(raw).hexdigest()
    entries["blobs/sha256/" + digest] = raw
    return {"digest": "sha256:" + digest, "size": len(raw), "mediaType": media}

config = blob({"os": "linux", "architecture": "amd64", "rootfs": {"type": "layers", "diff_ids": []},
               "config": {"User": "1001"}}, "application/vnd.oci.image.config.v1+json")
manifest = blob({"schemaVersion": 2, "mediaType": "application/vnd.oci.image.manifest.v1+json",
                 "config": config, "layers": []}, "application/vnd.oci.image.manifest.v1+json")
entries["index.json"] = json.dumps({"schemaVersion": 2, "manifests": [manifest]}).encode()
entries["oci-layout"] = b'{"imageLayoutVersion":"1.0.0"}'
dest = Path(sys.argv[1])
with tarfile.open(dest / "witnessops-web-image.tar", "w") as tar:
    for name, data in entries.items():
        info = tarfile.TarInfo(name)
        info.size = len(data)
        tar.addfile(info, io.BytesIO(data))
(dest / "manifest.raw").write_bytes(entries["blobs/sha256/" + manifest["digest"][7:]])
(dest / "config.raw").write_bytes(entries["blobs/sha256/" + config["digest"][7:]])
