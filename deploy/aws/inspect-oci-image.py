#!/usr/bin/env python3
"""Validate a single-platform OCI archive without extracting untrusted paths."""
import hashlib
import json
import sys
import tarfile


def inspect_image(path):
    with tarfile.open(path) as archive:
        def read(name):
            member = archive.getmember(name)
            if not member.isfile():
                raise ValueError("OCI descriptor must reference a regular file")
            return archive.extractfile(member).read()

        def blob(descriptor):
            digest = descriptor["digest"]
            if len(digest) != 71 or not digest.startswith("sha256:") or any(c not in "0123456789abcdef" for c in digest[7:]):
                raise ValueError("invalid OCI digest")
            data = read("blobs/sha256/" + digest[7:])
            if len(data) != descriptor["size"] or hashlib.sha256(data).hexdigest() != digest[7:]:
                raise ValueError("OCI blob hash or size mismatch")
            return data

        index = json.loads(read("index.json"))
        if len(index["manifests"]) != 1:
            raise ValueError("one image required; attestations/indexes are separate")
        descriptor = index["manifests"][0]
        manifest = json.loads(blob(descriptor))
        if manifest.get("mediaType") != "application/vnd.oci.image.manifest.v1+json":
            raise ValueError("single OCI image manifest required")
        config = json.loads(blob(manifest["config"]))
        if config.get("os") != "linux" or config.get("architecture") != "amd64":
            raise ValueError("linux/amd64 required")
        for layer in manifest["layers"]:
            blob(layer)
        return {"image_digest": descriptor["digest"], "config_digest": manifest["config"]["digest"]}


if __name__ == "__main__":
    print(json.dumps(inspect_image(sys.argv[1])))
