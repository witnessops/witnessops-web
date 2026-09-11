"""Narrow app adapter to the installed, accepted Local Audit producer. Never collects."""
import hashlib
import json
import os
from pathlib import Path
import sys
import zipfile
from witnessops_local_audit.capture import validate_capture
from witnessops_local_audit.package import finalize_product, source_fingerprint
from witnessops_local_audit.operator import _check_trust, _key
from witnessops_local_audit.verifier import verify_proofpack

# Paths and signer are operator configuration, supplied only by the app process.
def main():
    mode, directory, key_path, key_id = sys.argv[1:]
    root = Path(directory)
    registry = root / "registry.json"
    if mode == "preflight":
        _check_trust(registry, _key(Path(key_path)), key_id)
        print(json.dumps({"collectorHash": source_fingerprint()}))
        return
    raw = (root / "capture.json").read_bytes()
    capture, _ = validate_capture(raw)
    if capture["mode"] != "live_approved" or capture["observations"]["synthetic"] is not False:
        raise ValueError("live capture required")
    if mode == "validate":
        print(json.dumps({"authority": capture["authority"], "hostname": capture["hostname"], "collectorHash": capture["collector_hash"]}))
        return
    if mode != "finalize":
        raise ValueError("unsupported operation")
    _check_trust(registry, _key(Path(key_path)), key_id)
    marker = root / "started"
    digest = hashlib.sha256(raw).hexdigest()
    if not marker.exists():
        # A crash after this durable marker cannot silently trigger a second signing event.
        fd = os.open(marker, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, "w") as handle:
            handle.write(digest)
            handle.flush()
            os.fsync(handle.fileno())
        fd = os.open(root, os.O_RDONLY)
        os.fsync(fd)
        os.close(fd)
        finalize_product(raw, signing_key_path=Path(key_path), public_key_id=key_id, output_root=root)
    if marker.read_text() != digest:
        raise ValueError("capture correspondence failed")
    packs = list(root.glob("proofpack-*.zip"))
    if len(packs) != 1:
        raise ValueError("incomplete issuance requires operator reconciliation")
    pack = packs[0]
    signature = pack.with_name(pack.name + ".sig.json")
    result = verify_proofpack(pack, signature, registry)
    if result["status"] != "valid":
        raise ValueError("independent verification failed")
    # Independent verifier has already accepted ZIP structure, member bounds and semantics.
    # Reused output must correspond to this exact frozen source, not merely another valid pack.
    with zipfile.ZipFile(pack) as archive:
        if json.loads(archive.read("evidence/observations.json")) != capture["observations"]:
            raise ValueError("final observations differ from capture")
        if json.loads(archive.read("evidence/authority.json")) != capture["authority"]:
            raise ValueError("final authority differs from capture")
        record = json.loads(archive.read("evidence/run_record.json"))
        if record["collector"]["source_sha256"] != capture["collector_hash"]:
            raise ValueError("collector correspondence failed")
    print(json.dumps({"zipName": pack.name}))

if __name__ == "__main__":
    try:
        main()
    except Exception:
        # Neither captures, key paths nor dependency exception text are diagnostics output.
        print("Local Audit finalization unavailable or input rejected", file=sys.stderr)
        sys.exit(1)
