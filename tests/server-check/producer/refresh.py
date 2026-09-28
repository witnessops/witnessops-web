"""Apply the reviewed Local Audit source refresh and regenerate its identity."""
from __future__ import annotations

import gzip
import hashlib
import io
import json
from pathlib import Path, PurePosixPath
import tarfile


ROOT = Path(__file__).resolve().parent
ARCHIVE = ROOT / "local-audit-1.2.2.tar.gz"
IDENTITY = ROOT / "identity.json"
REFRESH_ID = "missing-sshd-is-an-unknown-ssh-probe"
BASE_ARCHIVE_SHA256 = "f5797a09d9cbaa87b55dd8511aef7316d1a3a5317df245a3d66f30e2b1a8a884"
BASE_OPERATOR_SHA256 = "416c4a6ce45c9f8d7ca8039b42fa6989962bfae57cb373703640c8fc96ac36b1"
BASE_REQUIRED = b'required = ("ss", "sshd", "sysctl", "systemctl", "timedatectl")'
REFRESHED_REQUIRED = b'required = ("ss", "sysctl", "systemctl", "timedatectl")'


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def fingerprint(files: dict[str, bytes]) -> str:
    digest = hashlib.sha256()
    prefix = "src/witnessops_local_audit/"
    for name in sorted(name for name in files if name.startswith(prefix) and name.endswith(".py")):
        digest.update(PurePosixPath(name).name.encode() + b"\0" + files[name] + b"\0")
    return digest.hexdigest()


def read_verified(identity: dict, archive_bytes: bytes) -> dict[str, bytes]:
    if sha256(archive_bytes) != identity.get("artifactSha256"):
        raise ValueError("Producer archive hash does not match its current identity.")
    files: dict[str, bytes] = {}
    with tarfile.open(fileobj=io.BytesIO(archive_bytes), mode="r:gz") as archive:
        members = archive.getmembers()
        if {member.name for member in members} != set(identity.get("files", {})) or len(members) != len(identity.get("files", {})):
            raise ValueError("Producer archive members do not match its current identity.")
        for member in members:
            if not member.isfile() or PurePosixPath(member.name).is_absolute() or ".." in PurePosixPath(member.name).parts:
                raise ValueError("Producer archive contains an unsupported member.")
            stream = archive.extractfile(member)
            if stream is None:
                raise ValueError("Producer archive member could not be read.")
            data = stream.read()
            if sha256(data) != identity["files"].get(member.name):
                raise ValueError("Producer member hash does not match its current identity.")
            files[member.name] = data
    if fingerprint(files) != identity.get("collectorFingerprint"):
        raise ValueError("Producer fingerprint does not match its current identity.")
    return files


def deterministic_archive(files: dict[str, bytes]) -> bytes:
    compressed = io.BytesIO()
    with gzip.GzipFile(fileobj=compressed, mode="wb", filename="", mtime=0) as gz:
        with tarfile.open(fileobj=gz, mode="w", format=tarfile.PAX_FORMAT) as archive:
            for name, data in sorted(files.items()):
                info = tarfile.TarInfo(name)
                info.size = len(data)
                info.mode = 0o644
                info.uid = info.gid = info.mtime = 0
                info.uname = info.gname = ""
                archive.addfile(info, io.BytesIO(data))
    return compressed.getvalue()


def refresh(identity: dict, archive_bytes: bytes) -> tuple[dict, bytes]:
    files = read_verified(identity, archive_bytes)
    current = files.get("src/witnessops_local_audit/operator.py", b"")
    operator_name = "src/witnessops_local_audit/operator.py"
    refresh_record = identity.get("refresh")
    if refresh_record is None:
        if sha256(archive_bytes) != BASE_ARCHIVE_SHA256 or BASE_REQUIRED not in current:
            raise ValueError("Refresh is allowed only from the accepted base producer archive.")
        base_files = dict(identity["files"])
        if base_files.get(operator_name) != BASE_OPERATOR_SHA256:
            raise ValueError("Base producer operator identity is unexpected.")
        current = current.replace(BASE_REQUIRED, REFRESHED_REQUIRED, 1)
        files[operator_name] = current
        identity = dict(identity)
        identity["refresh"] = {"id": REFRESH_ID, "baseArtifactSha256": BASE_ARCHIVE_SHA256,
                                "baseOperatorSha256": BASE_OPERATOR_SHA256, "baseFiles": base_files}
    else:
        expected_refresh = {"id": REFRESH_ID, "baseArtifactSha256": BASE_ARCHIVE_SHA256,
                            "baseOperatorSha256": BASE_OPERATOR_SHA256, "baseFiles": refresh_record.get("baseFiles")}
        if refresh_record != expected_refresh or not isinstance(expected_refresh["baseFiles"], dict):
            raise ValueError("Producer refresh identity is unexpected or source drifted.")
        base_files = expected_refresh["baseFiles"]
        if set(base_files) != set(files) or any(
            name != operator_name and sha256(files[name]) != base_files.get(name)
            for name in files
        ):
            raise ValueError("Producer source differs beyond the reviewed refresh change.")
        restored = current.replace(REFRESHED_REQUIRED, BASE_REQUIRED, 1)
        if BASE_REQUIRED in current or REFRESHED_REQUIRED not in current or sha256(restored) != base_files.get(operator_name):
            raise ValueError("Producer source differs beyond the reviewed refresh change.")

    archive_bytes = deterministic_archive(files)
    updated = {
        **identity,
        "collectorFingerprint": fingerprint(files),
        "artifactSha256": sha256(archive_bytes),
        "files": {name: sha256(data) for name, data in sorted(files.items())},
    }
    return updated, archive_bytes


def main() -> None:
    identity = json.loads(IDENTITY.read_text(encoding="utf-8"))
    archive_bytes = ARCHIVE.read_bytes()
    updated, refreshed_archive = refresh(identity, archive_bytes)
    ARCHIVE.write_bytes(refreshed_archive)
    IDENTITY.write_text(json.dumps(updated, indent=2, sort_keys=False) + "\n", encoding="utf-8")
    print(f"refresh_id={REFRESH_ID}")
    print(f"artifact_sha256={updated['artifactSha256']}")
    print(f"collector_fingerprint={updated['collectorFingerprint']}")


if __name__ == "__main__":
    main()
