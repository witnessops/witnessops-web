#!/usr/bin/env python3
"""WitnessOps receipt verifier v1.

Boundary:
- no target contact
- no runbook execution
- no source artifact mutation

This verifier combines the read-only validation contract checks with Ed25519
signature verification through an explicit trusted-signer registry.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import re
import sys
from pathlib import Path
from datetime import datetime, timezone
from typing import Any, Dict, Optional

try:
    from cryptography.exceptions import InvalidSignature
    from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

    CRYPTO_AVAILABLE = True
except Exception:
    CRYPTO_AVAILABLE = False

SHA256_RE = re.compile(r"^[a-f0-9]{64}$")
COMMIT_RE = re.compile(r"^([a-f0-9]{40}|unknown)$")

REQUIRED_TOP_LEVEL = [
    "receipt_version",
    "bridge_spec",
    "receipt_id",
    "run_id",
    "source",
    "authority",
    "execution",
    "evidence",
    "bridge",
    "signature",
    "verifier",
]

REQUIRED_CHECKS = [
    "schema_valid",
    "signature_present",
    "signature_valid",
    "signer_known",
    "bridge_spec_supported",
    "source_receipt_hash_matches",
    "evidence_manifest_hash_matches",
    "execution_state_hash_matches",
    "hash_manifest_entries_match_artifacts",
    "required_authority_artifacts_present",
]


def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def load_json(path: str) -> Any:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def check(status: str, failure_state: Optional[str], detail: str) -> Dict[str, Any]:
    return {"status": status, "failure_state": failure_state, "detail": detail}


def canonicalize_json_bytes(obj: Any) -> bytes:
    return json.dumps(obj, sort_keys=True, separators=(",", ":")).encode("utf-8")


def validate_receipt_shape(receipt: Any) -> Optional[str]:
    if not isinstance(receipt, dict):
        return "receipt is not an object"

    unexpected = sorted(set(receipt.keys()) - set(REQUIRED_TOP_LEVEL))
    if unexpected:
        return f"unexpected top-level fields: {', '.join(unexpected)}"

    for key in REQUIRED_TOP_LEVEL:
        if key not in receipt:
            return f"missing top-level field: {key}"

    if receipt["receipt_version"] != "witnessops.receipt.v1":
        return "receipt_version mismatch"
    if receipt["bridge_spec"] != "WITNESSOPS_RECEIPT_BRIDGE_SPEC_V1":
        return "bridge_spec mismatch"

    for key in ["receipt_id", "run_id"]:
        if not isinstance(receipt[key], str) or not receipt[key]:
            return f"{key} must be a non-empty string"

    source = receipt["source"]
    if not isinstance(source, dict):
        return "source must be an object"
    for key in ["repo", "commit", "run_directory", "source_receipt_path", "source_manifest_path"]:
        if key not in source:
            return f"source missing {key}"
        if not isinstance(source[key], str) or not source[key]:
            return f"source.{key} must be a non-empty string"
    if not COMMIT_RE.match(source["commit"]):
        return "source.commit must be 40 hex chars or unknown"

    authority = receipt["authority"]
    if not isinstance(authority, dict):
        return "authority must be an object"
    for key in [
        "authorization_artifact",
        "rules_of_engagement_artifact",
        "scope_artifact",
        "approval_state",
        "approval_artifacts",
    ]:
        if key not in authority:
            return f"authority missing {key}"
    for key in ["authorization_artifact", "rules_of_engagement_artifact", "scope_artifact", "approval_state"]:
        if not isinstance(authority[key], str) or not authority[key]:
            return f"authority.{key} must be a non-empty string"
    if not isinstance(authority["approval_artifacts"], list):
        return "authority.approval_artifacts must be an array"

    execution = receipt["execution"]
    if not isinstance(execution, dict):
        return "execution must be an object"
    for key in ["runbook_id", "operator_identity", "execution_state_path", "execution_state_hash"]:
        if key not in execution:
            return f"execution missing {key}"
    for key in ["runbook_id", "operator_identity", "execution_state_path"]:
        if not isinstance(execution[key], str) or not execution[key]:
            return f"execution.{key} must be a non-empty string"
    if not isinstance(execution["execution_state_hash"], str) or not SHA256_RE.match(execution["execution_state_hash"]):
        return "execution.execution_state_hash must be sha256 hex"

    evidence = receipt["evidence"]
    if not isinstance(evidence, dict):
        return "evidence must be an object"
    for key in [
        "evidence_manifest_path",
        "evidence_manifest_hash",
        "hash_manifest_path",
        "source_receipt_hash",
        "included_artifacts",
    ]:
        if key not in evidence:
            return f"evidence missing {key}"
    for key in ["evidence_manifest_path", "hash_manifest_path"]:
        if not isinstance(evidence[key], str) or not evidence[key]:
            return f"evidence.{key} must be a non-empty string"
    for key in ["evidence_manifest_hash", "source_receipt_hash"]:
        if not isinstance(evidence[key], str) or not SHA256_RE.match(evidence[key]):
            return f"evidence.{key} must be sha256 hex"
    if not isinstance(evidence["included_artifacts"], list) or not evidence["included_artifacts"]:
        return "evidence.included_artifacts must be a non-empty array"

    bridge = receipt["bridge"]
    if not isinstance(bridge, dict):
        return "bridge must be an object"
    for key in ["normalized_record_hash", "created_at_utc", "bridge_tool"]:
        if key not in bridge:
            return f"bridge missing {key}"
    if not SHA256_RE.match(str(bridge["normalized_record_hash"])):
        return "bridge.normalized_record_hash must be sha256 hex"
    if not isinstance(bridge["bridge_tool"], str) or not bridge["bridge_tool"]:
        return "bridge.bridge_tool must be a non-empty string"

    signature = receipt["signature"]
    if not isinstance(signature, dict):
        return "signature must be an object"
    for key in ["algorithm", "signer_id", "key_id", "signature_path", "signature_encoding"]:
        if key not in signature:
            return f"signature missing {key}"
    if signature["algorithm"] not in ["ed25519", "rsa-pss-sha256", "unknown"]:
        return "signature.algorithm unsupported by schema"
    if signature["signature_encoding"] not in ["base64", "hex", "unknown"]:
        return "signature.signature_encoding unsupported by schema"
    for key in ["signer_id", "key_id", "signature_path"]:
        if not isinstance(signature[key], str) or not signature[key]:
            return f"signature.{key} must be a non-empty string"

    verifier = receipt["verifier"]
    if not isinstance(verifier, dict):
        return "verifier must be an object"
    for key in ["expected_verifier", "verification_inputs", "required_checks"]:
        if key not in verifier:
            return f"verifier missing {key}"
    if not isinstance(verifier["verification_inputs"], list) or not verifier["verification_inputs"]:
        return "verifier.verification_inputs must be a non-empty array"
    if not isinstance(verifier["required_checks"], list) or not verifier["required_checks"]:
        return "verifier.required_checks must be a non-empty array"

    return None


def load_trusted_signer(registry_path: Optional[str], signer_id: str, key_id: str) -> tuple[Optional[dict], Dict[str, Any]]:
    if not registry_path:
        return None, check("fail", "trust_registry_unavailable", "trusted signer registry not supplied")
    if not os.path.exists(registry_path):
        return None, check("fail", "trust_registry_unavailable", "trusted signer registry missing")

    try:
        registry = load_json(registry_path)
    except (OSError, json.JSONDecodeError) as exc:
        return None, check("fail", "trust_registry_unavailable", f"trusted signer registry unreadable: {exc}")

    signer = registry.get("signers", {}).get(signer_id) if isinstance(registry, dict) else None
    if not isinstance(signer, dict):
        return None, check("fail", "unknown_signer", "signer not found in trusted registry")
    if signer.get("key_id") != key_id:
        return None, check("fail", "unknown_signer", "signer key_id does not match receipt")
    if signer.get("algorithm") != "ed25519":
        return None, check("fail", "unsupported_algorithm", "trusted signer algorithm is not ed25519")
    if signer.get("public_key_encoding") != "base64":
        return None, check("fail", "unsupported_algorithm", "trusted signer public key encoding is not base64")
    if not isinstance(signer.get("public_key"), str) or not signer["public_key"]:
        return None, check("fail", "unknown_signer", "trusted signer public key missing")

    return signer, check("pass", None, "signer found in trusted registry")


def read_signature_bytes(signature_path: str, encoding: str) -> bytes:
    data = open(signature_path, "rb").read()
    if encoding == "base64":
        return base64.b64decode(data.strip(), validate=True)
    if encoding == "hex":
        return bytes.fromhex(data.decode("ascii").strip())
    return data


def verify_signature(receipt: dict, signature_path: str, signer: dict) -> Optional[str]:
    if not CRYPTO_AVAILABLE:
        return "cryptography library not available"

    signature = receipt.get("signature", {})
    if signature.get("algorithm") != "ed25519":
        return "unsupported signature algorithm"

    try:
        sig_bytes = read_signature_bytes(signature_path, signature.get("signature_encoding", "unknown"))
        pub_bytes = base64.b64decode(signer["public_key"], validate=True)
        key = Ed25519PublicKey.from_public_bytes(pub_bytes)
        key.verify(sig_bytes, canonicalize_json_bytes(receipt))
        return None
    except (InvalidSignature, ValueError, KeyError, OSError) as exc:
        return f"signature verification failed: {exc}"


def bundle_file(root: Path, logical: str) -> Path:
    if not isinstance(logical, str) or not logical or "\\" in logical or ":" in logical:
        raise ValueError("invalid bundle path")
    parts = logical.split("/")
    if any(part in ("", ".", "..") for part in parts):
        raise ValueError("bundle path must be canonical and relative")
    path = root
    for part in parts:
        path = path / part
        if path.is_symlink():
            raise ValueError("symlinks are not bundle artifacts")
    if not path.is_file() or not path.resolve().is_relative_to(root):
        raise ValueError("bundle artifact missing or outside root")
    return path


def reconcile_hash_manifest(hash_manifest_path: str, receipt: dict,
                            artifact_paths: Dict[str, str], bundle_root: str) -> Dict[str, Any]:
    try:
        root = Path(bundle_root).resolve(strict=True)
        evidence = receipt["evidence"]
        manifest_path = bundle_file(root, evidence["evidence_manifest_path"])
        if sha256_file(str(manifest_path)) != evidence["evidence_manifest_hash"]:
            raise ValueError("manifest is not bound to the signed receipt")
        manifest = load_json(str(manifest_path))
        artifacts = manifest.get("artifacts")
        if not isinstance(artifacts, list) or not artifacts:
            raise ValueError("signed manifest has no artifacts")
        expected: Dict[str, str] = {}
        for artifact in artifacts:
            logical, digest = artifact["path"], artifact["sha256"]
            if logical in expected or not isinstance(digest, str) or not SHA256_RE.fullmatch(digest):
                raise ValueError("duplicate artifact or invalid digest")
            bundle_file(root, logical)
            expected[logical] = digest
        # The source manifest is signed by digest, not the adjacent text index.
        # Bind the text index to the complete signed artifact set plus source inputs.
        sources = {
            receipt["execution"]["execution_state_path"]: receipt["execution"]["execution_state_hash"],
            evidence["evidence_manifest_path"]: evidence["evidence_manifest_hash"],
            receipt["source"]["source_receipt_path"]: evidence["source_receipt_hash"],
        }
        for logical, digest in sources.items():
            if logical in expected and expected[logical] != digest:
                raise ValueError("conflicting signed digests")
            expected[logical] = digest
        for logical, actual in artifact_paths.items():
            if Path(actual).absolute() != bundle_file(root, logical):
                raise ValueError("supplied source does not match its canonical bundle path")
        if Path(hash_manifest_path).absolute() != bundle_file(root, evidence["hash_manifest_path"]):
            raise ValueError("hash manifest path mismatch")
        listed: Dict[str, str] = {}
        for line in Path(hash_manifest_path).read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            match = re.fullmatch(r"(\S+)\s+sha256:([a-f0-9]{64})", line.strip())
            if not match or match[1] in listed:
                raise ValueError("malformed, unsupported or duplicate hash entry")
            listed[match[1]] = match[2]
        if listed != expected:
            raise ValueError("hash index differs from the complete signed artifact set")
        required = [receipt["authority"][key] for key in
                    ("authorization_artifact", "rules_of_engagement_artifact", "scope_artifact")]
        required += receipt["authority"]["approval_artifacts"]
        if any(logical not in expected for logical in required):
            raise ValueError("authority artifact absent from signed manifest")
        for logical, digest in expected.items():
            if sha256_file(str(bundle_file(root, logical))) != digest:
                raise ValueError(f"hash mismatch for {logical}")
        return check("pass", None, f"all {len(expected)} signed artifact hashes matched")
    except (OSError, ValueError, TypeError, KeyError, AttributeError) as exc:
        return check("fail", "hash_manifest_mismatch", str(exc))


def main() -> int:
    parser = argparse.ArgumentParser(description="Read-only WitnessOps receipt verifier v1")
    parser.add_argument("--receipt", required=True)
    parser.add_argument("--signature", required=True)
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--hash-manifest", required=True)
    parser.add_argument("--state", required=True)
    parser.add_argument("--source-receipt", required=True)
    parser.add_argument("--trusted-signers")
    parser.add_argument("--bundle-root", help="Defaults to the receipt directory")
    parser.add_argument("--json", action="store_true", dest="json_output")
    args = parser.parse_args()

    checks: Dict[str, Dict[str, Any]] = {}
    failure_state: Optional[str] = None
    failure_detail: Optional[str] = None
    receipt_id: Optional[str] = None
    run_id: Optional[str] = None

    required_paths = {
        "receipt": args.receipt,
        "manifest": args.manifest,
        "hash_manifest": args.hash_manifest,
        "state": args.state,
        "source_receipt": args.source_receipt,
    }

    missing = [name for name, path in required_paths.items() if not os.path.exists(path)]
    if missing:
        for check_name in REQUIRED_CHECKS:
            checks[check_name] = check("skipped", "missing_required_input", f"missing required input(s): {', '.join(missing)}")
        result = "invalid"
        failure_state = "missing_required_input"
        failure_detail = f"missing required input(s): {', '.join(missing)}"
    else:
        try:
            receipt = load_json(args.receipt)
            receipt_id = receipt.get("receipt_id") if isinstance(receipt, dict) else None
            run_id = receipt.get("run_id") if isinstance(receipt, dict) else None
            schema_error = validate_receipt_shape(receipt)
            if schema_error:
                checks["schema_valid"] = check("fail", "schema_invalid", schema_error)
            else:
                checks["schema_valid"] = check("pass", None, "receipt shape accepted by verifier")
        except OSError as exc:
            checks["schema_valid"] = check("fail", "input_unreadable", str(exc))
            receipt = {}
        except json.JSONDecodeError as exc:
            checks["schema_valid"] = check("fail", "schema_invalid", str(exc))
            receipt = {}

        if os.path.exists(args.signature):
            checks["signature_present"] = check("pass", None, "signature file supplied")
        else:
            checks["signature_present"] = check("fail", "missing_signature", "detached signature file missing")

        signature_meta = receipt.get("signature", {}) if isinstance(receipt, dict) else {}
        signer, checks["signer_known"] = load_trusted_signer(
            args.trusted_signers,
            str(signature_meta.get("signer_id", "")),
            str(signature_meta.get("key_id", "")),
        )

        if checks["signature_present"]["status"] == "pass" and checks["signer_known"]["status"] == "pass" and isinstance(receipt, dict):
            signature_error = verify_signature(receipt, args.signature, signer or {})
            if signature_error:
                checks["signature_valid"] = check("fail", "signature_invalid", signature_error)
            else:
                checks["signature_valid"] = check("pass", None, "signature verified against trusted signer")
        else:
            checks["signature_valid"] = check("fail", "signature_invalid", "signature could not be verified")

        if isinstance(receipt, dict) and receipt.get("bridge_spec") == "WITNESSOPS_RECEIPT_BRIDGE_SPEC_V1":
            checks["bridge_spec_supported"] = check("pass", None, "bridge spec supported")
        else:
            checks["bridge_spec_supported"] = check("fail", "unsupported_bridge_spec", "bridge spec unsupported or missing")

        try:
            source_hash = sha256_file(args.source_receipt)
            expected = receipt.get("evidence", {}).get("source_receipt_hash") if isinstance(receipt, dict) else None
            if source_hash == expected:
                checks["source_receipt_hash_matches"] = check("pass", None, "source receipt hash matched")
            else:
                checks["source_receipt_hash_matches"] = check("fail", "source_receipt_hash_mismatch", "source receipt hash mismatch")
        except OSError as exc:
            checks["source_receipt_hash_matches"] = check("fail", "input_unreadable", str(exc))

        try:
            manifest_hash = sha256_file(args.manifest)
            expected = receipt.get("evidence", {}).get("evidence_manifest_hash") if isinstance(receipt, dict) else None
            if manifest_hash == expected:
                checks["evidence_manifest_hash_matches"] = check("pass", None, "evidence manifest hash matched")
            else:
                checks["evidence_manifest_hash_matches"] = check("fail", "evidence_manifest_hash_mismatch", "evidence manifest hash mismatch")
        except OSError as exc:
            checks["evidence_manifest_hash_matches"] = check("fail", "input_unreadable", str(exc))

        try:
            state_hash = sha256_file(args.state)
            expected = receipt.get("execution", {}).get("execution_state_hash") if isinstance(receipt, dict) else None
            if state_hash == expected:
                checks["execution_state_hash_matches"] = check("pass", None, "execution state hash matched")
            else:
                checks["execution_state_hash_matches"] = check("fail", "execution_state_hash_mismatch", "execution state hash mismatch")
        except OSError as exc:
            checks["execution_state_hash_matches"] = check("fail", "input_unreadable", str(exc))

        checks["hash_manifest_entries_match_artifacts"] = reconcile_hash_manifest(
            args.hash_manifest,
            receipt if isinstance(receipt, dict) else {},
            {
                str(receipt.get("execution", {}).get("execution_state_path", "")) if isinstance(receipt, dict) else "": args.state,
                str(receipt.get("evidence", {}).get("evidence_manifest_path", "")) if isinstance(receipt, dict) else "": args.manifest,
                str(receipt.get("source", {}).get("source_receipt_path", "")) if isinstance(receipt, dict) else "": args.source_receipt,
            },
            args.bundle_root or str(Path(args.receipt).absolute().parent),
        )

        authority = receipt.get("authority", {}) if isinstance(receipt, dict) else {}
        required_authority = ["authorization_artifact", "rules_of_engagement_artifact", "scope_artifact"]
        missing_authority = [k for k in required_authority if not authority.get(k)]
        if missing_authority:
            checks["required_authority_artifacts_present"] = check(
                "fail", "authority_artifact_missing", f"missing authority fields: {', '.join(missing_authority)}"
            )
        else:
            checks["required_authority_artifacts_present"] = check("pass", None, "required authority fields present in receipt")

        result = "valid"
        for name in REQUIRED_CHECKS:
            c = checks.get(name, check("skipped", "missing_required_check", "required check not emitted"))
            checks[name] = c
            if c["status"] == "fail":
                result = "invalid"
                failure_state = failure_state or c["failure_state"]
                failure_detail = failure_detail or c["detail"]
            elif c["status"] == "skipped" and result != "invalid":
                result = "indeterminate"
                failure_state = failure_state or c["failure_state"]
                failure_detail = failure_detail or c["detail"]

    out = {
        "contract_version": "witnessops.validation.v1",
        "result": result,
        "receipt_id": receipt_id,
        "run_id": run_id,
        "checked_at_utc": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "checks": checks,
        "failure_state": failure_state,
        "failure_detail": failure_detail,
    }

    print(json.dumps(out, indent=2, sort_keys=True))
    return 0 if result == "valid" else 1


if __name__ == "__main__":
    sys.exit(main())
