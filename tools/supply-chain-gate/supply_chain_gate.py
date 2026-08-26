#!/usr/bin/env python3
"""Deterministic, non-executing dependency admission gate for WitnessOps.

The gate reads manifests, lockfiles, public advisory metadata, and static npm
package metadata. It never imports or executes package code.
"""

from __future__ import annotations

import argparse
import base64
import csv
import hashlib
import json
import os
import posixpath
import re
import stat
import subprocess
import sys
import tarfile
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from typing import Any, Callable, Iterable, Mapping, Sequence


SCHEMA_VERSION = "witnessops.supply-chain-gate.v1"
OSV_API_URL = "https://api.osv.dev/v1/querybatch"
NPM_REGISTRY_URL = "https://registry.npmjs.org"
OSV_UPSTREAM_SOURCES = (
    {
        "name": "GitHub Advisory Database",
        "url": "https://github.com/github/advisory-database",
    },
    {
        "name": "OpenSSF Malicious Packages",
        "url": "https://github.com/ossf/malicious-packages",
    },
    {
        "name": "npm advisory data aggregated by OSV",
        "url": "https://google.github.io/osv.dev/data/",
    },
)
LOCKFILE_NAMES = {
    "pnpm-lock.yaml",
    "package-lock.json",
    "yarn.lock",
    "bun.lock",
    "bun.lockb",
}
IGNORED_PARTS = {
    ".git",
    ".next",
    ".turbo",
    "artifacts",
    "build",
    "coverage",
    "dist",
    "node_modules",
}
DEPENDENCY_FIELDS = (
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies",
    "peerDependenciesMeta",
    "bundleDependencies",
    "bundledDependencies",
    "overrides",
    "resolutions",
    "workspaces",
)
LIFECYCLE_KEYS = ("preinstall", "install", "postinstall", "prepare")
SUSPICIOUS_SCRIPT_PATTERNS = {
    "network_download": re.compile(
        r"(?:https?://|\bcurl\b|\bwget\b|\bfetch\s*\(|https?\.request|\baxios\b)", re.I
    ),
    "shell_or_powershell": re.compile(
        r"(?:\bbash\b|\bsh\s+-c\b|powershell|cmd\.exe|child_process|execFile|execSync|spawnSync)",
        re.I,
    ),
    "binary_launcher": re.compile(
        r"(?:\bnode(?:-gyp)?\b|\bprebuild-install\b|\bnode-pre-gyp\b|\bpython[23]?\b|"
        r"\bnpm\b|\bpnpm\b|\byarn\b|\bbun\b|\brun-s\b|\bts-scripts\b|\bgit\b|"
        r"\.(?:exe|dll|so|dylib)\b)",
        re.I,
    ),
    "encoded_or_obfuscated": re.compile(
        r"(?:base64|fromCharCode|eval\s*\(|Function\s*\(|Buffer\.from\s*\([^)]*(?:hex|base64))", re.I
    ),
    "credential_or_persistence": re.compile(
        r"(?:\.ssh|\.npmrc|kubeconfig|vault|github_token|npm_token|aws_access_key|"
        r"google_application_credentials|azure_|process\.env|keychain|hooksPath|\bhusky\b|"
        r"launchagents?|systemd|crontab)",
        re.I,
    ),
}
MAX_OSV_RESPONSE_BYTES = 32 * 1024 * 1024
MAX_NPM_METADATA_BYTES = 4 * 1024 * 1024
MAX_REVIEWED_TARBALL_BYTES = 64 * 1024 * 1024
MAX_REVIEWED_TARBALL_ENTRIES = 10_000
MAX_REVIEWED_TARBALL_EXPANDED_BYTES = 256 * 1024 * 1024
MAX_REVIEWED_PACKAGE_JSON_BYTES = 1024 * 1024
REGISTRY_VERSION_PATTERN = re.compile(
    r"^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)"
    r"(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?"
    r"(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$"
)
TRUSTED_REGISTRY_TARBALL_HOSTS = frozenset({"registry.npmjs.org", "registry.yarnpkg.com"})
UNSUPPORTED_DEPENDENCY_PREFIXES = (
    "file:",
    "git:",
    "git+",
    "git@",
    "github:",
    "gitlab:",
    "bitbucket:",
    "http:",
    "https:",
    "link:",
    "patch:",
    "portal:",
    "ssh:",
)
VENDORED_ARTIFACT_REVIEW_FIELDS = (
    "package",
    "version",
    "path",
    "sha256",
    "status",
    "source",
    "rationale",
)
NPM_PACKAGE_NAME_PATTERN = re.compile(
    r"^(?:@[a-z0-9][a-z0-9._-]*/)?[a-z0-9][a-z0-9._-]*$",
    re.I,
)

Pair = tuple[str, str]
ResolutionMap = dict[Pair, tuple[str, ...]]
ReviewedArtifactKey = tuple[str, str]
ReviewedArtifactMap = dict[ReviewedArtifactKey, dict[str, str]]


class GateError(RuntimeError):
    """Deterministic input or policy error."""


class CoverageError(RuntimeError):
    """Required intelligence was unavailable or unverifiable."""


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    return sha256_bytes(path.read_bytes())


def sha512_sri(data: bytes) -> str:
    digest = hashlib.sha512(data).digest()
    return "sha512-" + base64.b64encode(digest).decode("ascii")


def canonical_json_bytes(value: Any) -> bytes:
    return (json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False) + "\n").encode(
        "utf-8"
    )


def canonical_graph_bytes(pairs: Iterable[Pair]) -> bytes:
    rows = [f"{name}\t{version}\n" for name, version in sorted(set(pairs))]
    return "".join(rows).encode("utf-8")


def resolution_fingerprint(fields: Mapping[str, str]) -> str:
    normalized = {key: fields[key] for key in sorted(fields) if fields[key]}
    return sha256_bytes(canonical_json_bytes(normalized))


def freeze_resolution_map(
    pairs: Iterable[Pair], records: Mapping[Pair, set[str]]
) -> ResolutionMap:
    empty = resolution_fingerprint({})
    return {
        pair: tuple(sorted(records.get(pair, {empty})))
        for pair in sorted(set(pairs))
    }


def resolution_set_sha256(fingerprints: Sequence[str]) -> str:
    return sha256_bytes(canonical_json_bytes(sorted(set(fingerprints))))


def add_resolution_record(
    records: dict[Pair, set[str]], pair: Pair | None, fields: Mapping[str, str]
) -> None:
    if pair is not None:
        records.setdefault(pair, set()).add(resolution_fingerprint(fields))


def is_registry_version(version: str) -> bool:
    return bool(REGISTRY_VERSION_PATTERN.fullmatch(version))


def source_sha256(value: str) -> str:
    return sha256_bytes(value.encode("utf-8", errors="surrogatepass"))


def unsupported_source(label: str, value: str) -> GateError:
    return GateError(
        f"{label}: unsupported non-registry package source "
        f"(source_sha256={source_sha256(value)})"
    )


def unsupported_pnpm_patch(label: str, value: str) -> GateError:
    return GateError(
        f"{label}: pnpm patched dependencies are unsupported "
        f"(evidence_sha256={source_sha256(value)})"
    )


def validate_registry_tarball_source(value: str, label: str) -> None:
    parsed = urllib.parse.urlparse(value)
    if parsed.scheme.lower() in {"http", "https"} and (
        parsed.hostname or ""
    ).lower() in TRUSTED_REGISTRY_TARBALL_HOSTS:
        return
    raise unsupported_source(label, value)


def dependency_spec_is_unsupported(value: str) -> bool:
    spec = value.strip()
    lowered = spec.lower()
    if lowered.startswith(("workspace:", "catalog:", "npm:")):
        return False
    if lowered.startswith(UNSUPPORTED_DEPENDENCY_PREFIXES):
        return True
    if spec.startswith(("./", "../", "/", "\\\\")):
        return True
    # npm and pnpm accept owner/repository as a hosted-git shorthand.
    return "/" in spec


def contains_control_character(value: str) -> bool:
    return any(ord(character) < 32 or ord(character) == 127 for character in value)


def normalize_reviewed_artifact_path(value: str, label: str) -> str:
    if (
        not value
        or "\\" in value
        or contains_control_character(value)
        or urllib.parse.unquote(value) != value
    ):
        raise GateError(f"{label}: reviewed artifact path is not canonical")
    if re.search(r"[*?\[\]{}]", value):
        raise GateError(f"{label}: reviewed artifact path may not contain wildcards")
    path = PurePosixPath(value)
    if path.is_absolute() or any(part in {"", ".", ".."} for part in path.parts):
        raise GateError(f"{label}: reviewed artifact path must be repository-relative")
    if path.suffix != ".tgz" or path.as_posix() != value:
        raise GateError(f"{label}: reviewed artifact path must name one canonical .tgz file")
    return value


def parse_vendored_artifact_reviews(data: bytes, label: str) -> ReviewedArtifactMap:
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise GateError(f"{label}: review data is not UTF-8") from exc
    lines = [line for line in text.splitlines() if not line.startswith("#")]
    if not lines:
        raise GateError(f"{label}: missing TSV header")
    reader = csv.DictReader(lines, delimiter="\t")
    if tuple(reader.fieldnames or ()) != VENDORED_ARTIFACT_REVIEW_FIELDS:
        raise GateError(
            f"{label}: expected exact fields {', '.join(VENDORED_ARTIFACT_REVIEW_FIELDS)}"
        )
    reviews: ReviewedArtifactMap = {}
    for row_number, row in enumerate(reader, start=2):
        if None in row:
            raise GateError(f"{label}:{row_number}: unexpected extra TSV field")
        normalized = {key: (value or "").strip() for key, value in row.items() if key is not None}
        if not any(normalized.values()):
            continue
        if any(not normalized.get(field) for field in VENDORED_ARTIFACT_REVIEW_FIELDS):
            raise GateError(f"{label}:{row_number}: missing required field")
        package = normalized["package"]
        version = normalized["version"]
        path = normalize_reviewed_artifact_path(
            normalized["path"], f"{label}:{row_number}"
        )
        digest = normalized["sha256"]
        status = normalized["status"].upper()
        if not NPM_PACKAGE_NAME_PATTERN.fullmatch(package):
            raise GateError(f"{label}:{row_number}: invalid npm package name")
        if not is_registry_version(version):
            raise GateError(f"{label}:{row_number}: invalid package version")
        if not re.fullmatch(r"[0-9a-f]{64}", digest):
            raise GateError(f"{label}:{row_number}: invalid artifact SHA-256")
        if status not in {"APPROVED", "BLOCKED"}:
            raise GateError(f"{label}:{row_number}: invalid review status")
        normalized["path"] = path
        normalized["status"] = status
        key = (package, path)
        if key in reviews:
            raise GateError(f"{label}: duplicate artifact review for {package} at {path}")
        reviews[key] = normalized
    return reviews


def local_tarball_spec_path(spec: str) -> str | None:
    value = spec.strip()
    if not value.lower().startswith("file:"):
        return None
    raw_path = value[5:]
    if PurePosixPath(raw_path).suffix.lower() != ".tgz":
        return None
    return raw_path


def resolve_manifest_local_tarball(
    repo: Path, manifest: Path, raw_path: str, label: str
) -> tuple[str, Path]:
    if (
        not raw_path
        or "\\" in raw_path
        or contains_control_character(raw_path)
        or urllib.parse.unquote(raw_path) != raw_path
    ):
        raise GateError(f"{label}: local tarball path is not canonical")
    if re.search(r"[*?\[\]{}]", raw_path) or PurePosixPath(raw_path).is_absolute():
        raise GateError(f"{label}: local tarball path is unsupported")
    candidate = Path(os.path.normpath(str(manifest.parent / raw_path)))
    try:
        relative = candidate.relative_to(repo)
    except ValueError as exc:
        raise GateError(f"{label}: local tarball path escapes repository root") from exc
    relative_value = relative.as_posix()
    normalize_reviewed_artifact_path(relative_value, label)
    return relative_value, candidate


def require_regular_file_without_symlinks(repo: Path, relative: str, label: str) -> Path:
    current = repo
    for part in PurePosixPath(relative).parts:
        current = current / part
        try:
            metadata = current.lstat()
        except OSError as exc:
            raise GateError(f"{label}: reviewed artifact is missing") from exc
        if stat.S_ISLNK(metadata.st_mode):
            raise GateError(f"{label}: reviewed artifact path traverses a symlink")
    metadata = current.lstat()
    if not stat.S_ISREG(metadata.st_mode):
        raise GateError(f"{label}: reviewed artifact is not a regular file")
    if metadata.st_size > MAX_REVIEWED_TARBALL_BYTES:
        raise GateError(f"{label}: reviewed artifact exceeds the inert inspection size limit")
    return current


def inspect_npm_tarball(path: Path, package: str, version: str, label: str) -> dict[str, Any]:
    try:
        with tarfile.open(path, mode="r:gz") as archive:
            entry_count = 0
            expanded_size = 0
            names: set[str] = set()
            package_json_member: tarfile.TarInfo | None = None
            for member in archive:
                entry_count += 1
                if entry_count > MAX_REVIEWED_TARBALL_ENTRIES:
                    raise GateError(
                        f"{label}: archive entry count exceeds the inert inspection limit"
                    )
                member_name = member.name
                member_path = PurePosixPath(member_name)
                if (
                    not member_name
                    or "\\" in member_name
                    or member_path.is_absolute()
                    or any(part in {"", ".", ".."} for part in member_path.parts)
                    or member_path.as_posix() != member_name
                ):
                    raise GateError(f"{label}: archive contains a non-canonical member path")
                if member_name in names:
                    raise GateError(f"{label}: archive contains a duplicate member path")
                names.add(member_name)
                if member.isdir():
                    continue
                if not member.isfile():
                    raise GateError(f"{label}: archive contains a non-regular member")
                expanded_size += member.size
                if expanded_size > MAX_REVIEWED_TARBALL_EXPANDED_BYTES:
                    raise GateError(f"{label}: archive expansion exceeds the inert inspection limit")
                if member_name == "package/package.json":
                    package_json_member = member
            if package_json_member is None:
                raise GateError(f"{label}: archive is missing package/package.json")
            if package_json_member.size > MAX_REVIEWED_PACKAGE_JSON_BYTES:
                raise GateError(f"{label}: package/package.json exceeds the inspection limit")
            extracted = archive.extractfile(package_json_member)
            if extracted is None:
                raise GateError(f"{label}: package/package.json is unreadable")
            package_json_bytes = extracted.read(MAX_REVIEWED_PACKAGE_JSON_BYTES + 1)
    except (tarfile.TarError, OSError) as exc:
        raise GateError(f"{label}: artifact is not a readable gzip npm tarball") from exc
    try:
        metadata = json.loads(package_json_bytes)
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise GateError(f"{label}: package/package.json is invalid JSON") from exc
    if not isinstance(metadata, dict):
        raise GateError(f"{label}: package/package.json root must be an object")
    if metadata.get("name") != package:
        raise GateError(f"{label}: archive package name differs from the reviewed tuple")
    if metadata.get("version") != version:
        raise GateError(f"{label}: archive package version differs from the reviewed tuple")
    return {
        "archive_entry_count": entry_count,
        "expanded_size": expanded_size,
        "package_json_sha256": sha256_bytes(package_json_bytes),
    }


def inspect_dependency_sources(
    repo: Path, reviews: ReviewedArtifactMap
) -> tuple[list[dict[str, str]], list[dict[str, Any]], ReviewedArtifactMap, list[str]]:
    unsupported: list[dict[str, str]] = []
    reviewed_records: list[dict[str, Any]] = []
    accepted: ReviewedArtifactMap = {}
    blocked: list[str] = []
    for manifest in discover_files(repo, {"package.json"}):
        relative = repository_relative_path(repo, manifest, "manifest")
        try:
            parsed = json.loads(manifest.read_bytes())
        except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise GateError(f"{relative}: invalid package.json") from exc
        if not isinstance(parsed, dict):
            raise GateError(f"{relative}: package.json root must be an object")
        for field in (
            "dependencies",
            "devDependencies",
            "optionalDependencies",
            "peerDependencies",
        ):
            dependencies = parsed.get(field, {})
            if dependencies is None:
                continue
            if not isinstance(dependencies, dict):
                raise GateError(f"{relative}: {field} must be an object")
            for package, spec in dependencies.items():
                if not isinstance(package, str) or not isinstance(spec, str):
                    raise GateError(f"{relative}: {field} contains a non-string dependency")
                raw_tarball_path = local_tarball_spec_path(spec)
                if raw_tarball_path is not None:
                    artifact_path, _ = resolve_manifest_local_tarball(
                        repo,
                        manifest,
                        raw_tarball_path,
                        f"{relative}: {field} {package}",
                    )
                    review = reviews.get((package, artifact_path))
                    record: dict[str, Any] = {
                        "package": package,
                        "version": review["version"] if review else "",
                        "source_class": "reviewed-local-tarball",
                        "path": artifact_path,
                        "artifact_sha256": "",
                        "review_status": review["status"] if review else "UNAPPROVED",
                        "review_source": review["source"] if review else "",
                        "manifest": relative,
                        "dependency_field": field,
                        "decision": "BLOCKED",
                    }
                    if review is None:
                        blocked.append(
                            f"unapproved local tarball dependency: {package} at {artifact_path}"
                        )
                        reviewed_records.append(record)
                        continue
                    if review["status"] != "APPROVED":
                        blocked.append(
                            f"review status blocks local tarball dependency: {package} at {artifact_path}"
                        )
                        reviewed_records.append(record)
                        continue
                    try:
                        artifact = require_regular_file_without_symlinks(
                            repo, artifact_path, f"{package} at {artifact_path}"
                        )
                        artifact_bytes = artifact.read_bytes()
                        actual_sha256 = sha256_bytes(artifact_bytes)
                        record["artifact_sha256"] = actual_sha256
                        if actual_sha256 != review["sha256"]:
                            raise GateError(
                                f"{package} at {artifact_path}: artifact SHA-256 differs from review"
                            )
                        record.update(
                            inspect_npm_tarball(
                                artifact,
                                package,
                                review["version"],
                                f"{package} at {artifact_path}",
                            )
                        )
                    except GateError as exc:
                        blocked.append(str(exc))
                        reviewed_records.append(record)
                        continue
                    record["decision"] = "ACCEPTED"
                    reviewed_records.append(record)
                    accepted_review = dict(review)
                    accepted_review["integrity"] = sha512_sri(artifact_bytes)
                    accepted[(package, artifact_path)] = accepted_review
                elif dependency_spec_is_unsupported(spec):
                    unsupported.append(
                        {
                            "manifest": relative,
                            "dependency_field": field,
                            "package": package,
                            "specifier_sha256": source_sha256(spec),
                        }
                    )
        pnpm = parsed.get("pnpm", {})
        if pnpm is None:
            pnpm = {}
        if not isinstance(pnpm, dict):
            raise GateError(f"{relative}: pnpm must be an object")
        patched_dependencies = pnpm.get("patchedDependencies", {})
        if patched_dependencies is None:
            patched_dependencies = {}
        if not isinstance(patched_dependencies, dict):
            raise GateError(f"{relative}: pnpm.patchedDependencies must be an object")
        for package, patch_path in patched_dependencies.items():
            if not isinstance(package, str) or not isinstance(patch_path, str):
                raise GateError(
                    f"{relative}: pnpm.patchedDependencies contains a non-string entry"
                )
            unsupported.append(
                {
                    "manifest": relative,
                    "dependency_field": "pnpm.patchedDependencies",
                    "package": package,
                    "specifier_sha256": source_sha256(patch_path),
                }
            )
    return (
        sorted(
            unsupported,
            key=lambda item: (
                item["manifest"],
                item["dependency_field"],
                item["package"],
            ),
        ),
        sorted(
            reviewed_records,
            key=lambda item: (
                item["path"],
                item["package"],
                item["manifest"],
                item["dependency_field"],
            ),
        ),
        accepted,
        sorted(set(blocked)),
    )


def decode_yaml_scalar(raw: str) -> str:
    value = raw.strip()
    if len(value) >= 2 and value[0] == value[-1] == "'":
        return value[1:-1].replace("''", "'")
    if len(value) >= 2 and value[0] == value[-1] == '"':
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError as exc:
            raise GateError(f"invalid quoted YAML key: {value}") from exc
        if not isinstance(parsed, str):
            raise GateError(f"non-string YAML key: {value}")
        return parsed
    return value


def split_package_key(value: str) -> Pair | None:
    key = value.strip()
    if key.startswith("/"):
        key = key[1:]
    key = key.split("(", 1)[0]
    if not key or key.startswith(("file:", "link:", "workspace:")):
        return None

    separator = key.rfind("@")
    if separator > 0 and (not key.startswith("@") or separator > key.find("/")):
        name, version = key[:separator], key[separator + 1 :]
    else:
        # pnpm lockfileVersion 5 used /name/version and /@scope/name/version.
        slash = key.rfind("/")
        if slash <= 0:
            return None
        name, version = key[:slash], key[slash + 1 :]

    if not name or not is_registry_version(version):
        return None
    return name, version


def pnpm_package_blocks(text: str) -> list[tuple[str, list[str]]]:
    blocks: list[tuple[str, list[str]]] = []
    section = ""
    current_key: str | None = None
    current_lines: list[str] = []

    def flush() -> None:
        nonlocal current_key, current_lines
        if current_key is not None:
            blocks.append((current_key, current_lines))
        current_key, current_lines = None, []

    for line in text.splitlines():
        top = re.match(r"^([A-Za-z][A-Za-z0-9_-]*):\s*$", line)
        if top:
            flush()
            section = top.group(1)
            continue
        if section != "packages":
            continue
        entry = re.match(r"^  (\S.*):\s*$", line)
        if entry:
            flush()
            current_key = decode_yaml_scalar(entry.group(1))
            continue
        if current_key is not None:
            current_lines.append(line)
    flush()
    return blocks


def split_pnpm_local_tarball_key(value: str) -> tuple[str, str] | None:
    marker = "@file:"
    index = value.rfind(marker)
    if index <= 0:
        return None
    return value[:index], value[index + len(marker) :]


def normalize_lockfile_local_tarball_path(raw_path: str, importer: str, label: str) -> str:
    if (
        not raw_path
        or "\\" in raw_path
        or contains_control_character(raw_path)
        or urllib.parse.unquote(raw_path) != raw_path
    ):
        raise GateError(f"{label}: local tarball path is not canonical")
    if re.search(r"[*?\[\]{}]", raw_path) or PurePosixPath(raw_path).is_absolute():
        raise GateError(f"{label}: local tarball path is unsupported")
    base = "" if importer in {"", "."} else importer
    normalized = posixpath.normpath(posixpath.join(base, raw_path))
    if normalized == ".." or normalized.startswith("../") or normalized.startswith("/"):
        raise GateError(f"{label}: local tarball path escapes repository root")
    return normalize_reviewed_artifact_path(normalized, label)


def normalize_pnpm_importer(value: str, label: str) -> str:
    if value == ".":
        return value
    if (
        not value
        or "\\" in value
        or contains_control_character(value)
        or urllib.parse.unquote(value) != value
        or re.search(r"[*?\[\]{}]", value)
    ):
        raise GateError(f"{label}: importer path is not canonical")
    path = PurePosixPath(value)
    if (
        path.is_absolute()
        or any(part in {"", ".", ".."} for part in path.parts)
        or path.as_posix() != value
    ):
        raise GateError(f"{label}: importer path must be repository-relative")
    return value


def parse_pnpm_local_tarball_records(
    text: str, label: str, approved: ReviewedArtifactMap
) -> dict[str, dict[str, str]]:
    records: dict[str, dict[str, str]] = {}
    for package_key, lines in pnpm_package_blocks(text):
        local_key = split_pnpm_local_tarball_key(package_key)
        if local_key is None:
            continue
        package, raw_path = local_key
        path = normalize_lockfile_local_tarball_path(
            raw_path, "", f"{label}: pnpm package entry {package}"
        )
        review = approved.get((package, path))
        if review is None:
            raise unsupported_source(f"{label}: pnpm package entry", package_key)
        version = ""
        resolution_fields: dict[str, str] = {}
        in_resolution = False
        for line in lines:
            match_version = re.match(r"^    version:\s*(.+?)\s*$", line)
            if match_version:
                version = decode_yaml_scalar(match_version.group(1))
                continue
            resolution = re.match(r"^    resolution:\s*(.*)$", line)
            if resolution:
                resolution_fields.update(parse_inline_resolution(resolution.group(1)))
                in_resolution = not bool(resolution.group(1).strip())
                continue
            if in_resolution:
                nested = re.match(
                    r"^      ['\"]?(integrity|tarball|type|repo|commit|path)['\"]?:\s*(.+?)\s*$",
                    line,
                )
                if nested:
                    resolution_fields[nested.group(1)] = decode_yaml_scalar(nested.group(2))
                elif line and len(line) - len(line.lstrip()) <= 4:
                    in_resolution = False
        if version != review["version"]:
            raise GateError(
                f"{label}: local tarball lock version differs for {package} at {path}"
            )
        if resolution_fields.get("tarball") != f"file:{path}":
            raise GateError(
                f"{label}: local tarball resolution path differs for {package} at {path}"
            )
        if not resolution_fields.get("integrity"):
            raise GateError(
                f"{label}: local tarball resolution lacks integrity for {package} at {path}"
            )
        expected_integrity = review.get("integrity")
        if expected_integrity and resolution_fields["integrity"] != expected_integrity:
            raise GateError(
                f"{label}: local tarball integrity differs from artifact bytes "
                f"for {package} at {path}"
            )
        unsupported = {
            key: resolution_fields[key]
            for key in ("type", "repo", "commit", "path")
            if key in resolution_fields
        }
        if unsupported:
            raise unsupported_source(
                f"{label}: local tarball resolution",
                canonical_json_bytes(unsupported).decode("utf-8"),
            )
        if package_key in records:
            raise GateError(f"{label}: duplicate local tarball package entry {package_key}")
        records[package_key] = {
            "package": package,
            "version": version,
            "path": path,
            "integrity": resolution_fields["integrity"],
            "tarball": resolution_fields["tarball"],
        }
    return records


def pnpm_registry_pairs(text: str, label: str) -> set[Pair]:
    pairs: set[Pair] = set()
    for package_key, _ in pnpm_package_blocks(text):
        if split_pnpm_local_tarball_key(package_key) is not None:
            continue
        pair = split_package_key(package_key)
        if pair is None:
            raise unsupported_source(f"{label}: pnpm package entry", package_key)
        pairs.add(pair)
    return pairs


def validate_pnpm_local_tarball_importers(
    text: str, label: str, approved: ReviewedArtifactMap
) -> set[tuple[str, str, str]]:
    section = ""
    importer = ""
    dependency_group = ""
    package = ""
    fields: dict[str, str] = {}
    records: set[tuple[str, str, str]] = set()

    def flush() -> None:
        nonlocal package, fields
        if not package:
            fields = {}
            return
        file_fields = {
            key: value
            for key, value in fields.items()
            if value.strip().lower().startswith("file:")
        }
        if file_fields:
            if set(file_fields) != {"specifier", "version"}:
                raise GateError(
                    f"{label}: incomplete local tarball importer identity for {package}"
                )
            specifier_path = normalize_lockfile_local_tarball_path(
                file_fields["specifier"].strip()[5:],
                importer,
                f"{label}: importer {importer} dependency {package}",
            )
            version_path = normalize_lockfile_local_tarball_path(
                file_fields["version"].strip()[5:],
                "",
                f"{label}: importer {importer} dependency {package}",
            )
            if specifier_path != version_path:
                raise GateError(
                    f"{label}: importer paths differ for local tarball dependency {package}"
                )
            review = approved.get((package, specifier_path))
            if review is None:
                raise unsupported_source(
                    f"{label}: importer local tarball dependency", package
                )
            records.add((package, review["version"], specifier_path))
        package, fields = "", {}

    for line in text.splitlines():
        top = re.match(r"^([A-Za-z][A-Za-z0-9_-]*):\s*$", line)
        if top:
            flush()
            section = top.group(1)
            importer = dependency_group = ""
            continue
        if section != "importers":
            continue
        importer_match = re.match(r"^  (\S.*):\s*$", line)
        if importer_match:
            flush()
            importer = normalize_pnpm_importer(
                decode_yaml_scalar(importer_match.group(1)),
                f"{label}: importer",
            )
            dependency_group = ""
            continue
        group_match = re.match(
            r"^    (dependencies|devDependencies|optionalDependencies):\s*$", line
        )
        if group_match:
            flush()
            dependency_group = group_match.group(1)
            continue
        if not importer or not dependency_group:
            continue
        package_match = re.match(r"^      (\S.*):\s*$", line)
        if package_match:
            flush()
            package = decode_yaml_scalar(package_match.group(1))
            continue
        if not package:
            continue
        field_match = re.match(r"^        (specifier|version):\s*(.+?)\s*$", line)
        if field_match:
            fields[field_match.group(1)] = decode_yaml_scalar(field_match.group(2))
    flush()
    return records


def parse_pnpm_lock(
    data: bytes,
    label: str = "pnpm-lock.yaml",
    approved_local_tarballs: ReviewedArtifactMap | None = None,
) -> set[Pair]:
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise GateError(f"{label}: lockfile is not UTF-8") from exc

    if any(
        re.match(r"^['\"]?patchedDependencies['\"]?\s*:", line)
        for line in text.splitlines()
    ) or "patch_hash=" in text:
        raise unsupported_pnpm_patch(label, text)

    approved = approved_local_tarballs or {}
    local_records = parse_pnpm_local_tarball_records(text, label, approved)
    importer_records = validate_pnpm_local_tarball_importers(text, label, approved)
    package_records = {
        (record["package"], record["version"], record["path"])
        for record in local_records.values()
    }
    if importer_records != package_records:
        raise GateError(f"{label}: local tarball importer and package identities differ")
    section = ""
    pairs: set[Pair] = set()
    saw_packages = False
    for line in text.splitlines():
        top = re.match(r"^([A-Za-z][A-Za-z0-9_-]*):\s*$", line)
        if top:
            section = top.group(1)
            saw_packages = saw_packages or section == "packages"
            continue
        if section != "packages":
            continue
        entry = re.match(r"^  (\S.*):\s*$", line)
        if not entry:
            continue
        package_key = decode_yaml_scalar(entry.group(1))
        if package_key in local_records:
            record = local_records[package_key]
            pairs.add((record["package"], record["version"]))
            continue
        pair = split_package_key(package_key)
        if pair is None:
            raise unsupported_source(f"{label}: pnpm package entry", package_key)
        pairs.add(pair)

    if not saw_packages:
        raise GateError(f"{label}: missing packages section")
    validate_pnpm_resolution_sources(data, label, local_records)
    return pairs


def package_name_from_node_modules_path(path: str) -> str | None:
    marker = "node_modules/"
    if marker not in path:
        return None
    tail = path.rsplit(marker, 1)[1]
    if tail.startswith("@"):
        parts = tail.split("/")
        return "/".join(parts[:2]) if len(parts) >= 2 else None
    return tail.split("/", 1)[0]


def validate_package_lock_record_source(record: Mapping[str, Any], label: str) -> None:
    if record.get("link") is True:
        return
    version = record.get("version")
    if isinstance(version, str) and not is_registry_version(version):
        raise unsupported_source(label, version)
    resolved = record.get("resolved")
    if isinstance(resolved, str):
        validate_registry_tarball_source(resolved, label)


def parse_package_lock(data: bytes, label: str = "package-lock.json") -> set[Pair]:
    try:
        parsed = json.loads(data)
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise GateError(f"{label}: invalid JSON") from exc
    if not isinstance(parsed, dict):
        raise GateError(f"{label}: root must be an object")

    pairs: set[Pair] = set()
    packages = parsed.get("packages")
    if isinstance(packages, dict):
        for install_path, record in packages.items():
            if not install_path or not isinstance(record, dict):
                continue
            validate_package_lock_record_source(record, f"{label}: {install_path}")
            name = record.get("name") or package_name_from_node_modules_path(str(install_path))
            version = record.get("version")
            if isinstance(name, str) and isinstance(version, str) and is_registry_version(version):
                pairs.add((name, version))

    def walk(dependencies: Any) -> None:
        if not isinstance(dependencies, dict):
            return
        for name, record in dependencies.items():
            if not isinstance(name, str) or not isinstance(record, dict):
                continue
            validate_package_lock_record_source(record, f"{label}: dependency {name}")
            version = record.get("version")
            if isinstance(version, str) and is_registry_version(version):
                pairs.add((name, version))
            walk(record.get("dependencies"))

    walk(parsed.get("dependencies"))
    if not isinstance(packages, dict) and not isinstance(parsed.get("dependencies"), dict):
        raise GateError(f"{label}: no packages or dependencies object")
    return pairs


def yarn_selector_name(selector: str) -> str | None:
    value = selector.strip().strip('"').strip("'")
    if not value:
        return None
    separator = value.rfind("@")
    if separator <= 0 or (value.startswith("@") and separator <= value.find("/")):
        return None
    return value[:separator]


def validate_yarn_selector_source(selector: str, label: str) -> None:
    value = selector.strip().strip('"').strip("'")
    name = yarn_selector_name(value)
    if not name:
        raise unsupported_source(f"{label}: Yarn selector", value)
    spec = value[len(name) + 1 :]
    if spec.lower().startswith("workspace:"):
        return
    if dependency_spec_is_unsupported(spec):
        raise unsupported_source(f"{label}: Yarn selector for {name}", spec)


def validate_yarn_resolution_source(value: str, label: str) -> None:
    if re.fullmatch(r"(?:@[^/@\s]+/[^/@\s]+|[^/@\s]+)@npm:.+", value):
        return
    validate_registry_tarball_source(value, label)


def parse_yarn_lock(data: bytes, label: str = "yarn.lock") -> set[Pair]:
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise GateError(f"{label}: lockfile is not UTF-8") from exc

    pairs: set[Pair] = set()
    selectors: list[str] = []
    version: str | None = None
    resolution: str | None = None

    def flush() -> None:
        nonlocal selectors, version, resolution
        if version:
            name = yarn_selector_name(resolution or "")
            if not name and selectors:
                name = yarn_selector_name(selectors[0])
            if name and is_registry_version(version):
                pairs.add((name, version))
        selectors, version, resolution = [], None, None

    for line in text.splitlines():
        if line and not line[0].isspace() and line.rstrip().endswith(":"):
            flush()
            header = line.rstrip()[:-1]
            if header == "__metadata":
                continue
            selectors = [part.strip() for part in re.split(r",\s*", header)]
            for selector in selectors:
                validate_yarn_selector_source(selector, label)
            continue
        if not selectors:
            continue
        match_version = re.match(r"^\s+version(?::|\s+)\s*[\"']?([^\"'\s]+)", line)
        if match_version:
            version = match_version.group(1)
            continue
        match_resolution = re.match(r"^\s+resolution(?::|\s+)\s*[\"']?([^\"']+)", line)
        if match_resolution:
            resolution = match_resolution.group(1).strip()
            validate_yarn_resolution_source(resolution, label)
            continue
        match_resolved = re.match(r"^\s+resolved(?::|\s+)\s*[\"']?([^\"']+)", line)
        if match_resolved:
            validate_registry_tarball_source(match_resolved.group(1).strip(), label)
    flush()
    return pairs


def parse_lockfile_bytes(
    path: str | Path,
    data: bytes,
    approved_local_tarballs: ReviewedArtifactMap | None = None,
) -> set[Pair]:
    name = Path(path).name
    if name == "pnpm-lock.yaml":
        return parse_pnpm_lock(data, str(path), approved_local_tarballs)
    if name == "package-lock.json":
        return parse_package_lock(data, str(path))
    if name == "yarn.lock":
        return parse_yarn_lock(data, str(path))
    if name in {"bun.lock", "bun.lockb"}:
        raise CoverageError(f"{path}: Bun lockfile parsing is not implemented")
    raise GateError(f"unsupported lockfile: {path}")


def parse_inline_resolution(raw: str) -> dict[str, str]:
    value = raw.strip()
    if not (value.startswith("{") and value.endswith("}")):
        return {}
    fields: dict[str, str] = {}
    content = value[1:-1]
    for key in ("integrity", "tarball", "type", "repo", "commit", "path"):
        matches = list(re.finditer(
            rf"(?:^|,)\s*['\"]?{key}['\"]?\s*:\s*"
            rf"(\"(?:\\.|[^\"])*\"|'(?:''|[^'])*'|[^,}}]+)",
            content,
        ))
        if len(matches) > 1:
            raise GateError(f"pnpm inline resolution contains duplicate {key} field")
        if matches:
            fields[key] = decode_yaml_scalar(matches[0].group(1))
    return fields


def validate_pnpm_resolution_fields(
    fields: Mapping[str, str], label: str, allowed_local_tarball: str | None = None
) -> None:
    unsupported = {key: fields[key] for key in ("type", "repo", "commit", "path") if key in fields}
    if unsupported:
        raise unsupported_source(label, canonical_json_bytes(unsupported).decode("utf-8"))
    tarball = fields.get("tarball")
    if tarball:
        if allowed_local_tarball is not None and tarball == f"file:{allowed_local_tarball}":
            return
        validate_registry_tarball_source(tarball, label)


def validate_pnpm_resolution_sources(
    data: bytes,
    label: str,
    local_records: Mapping[str, Mapping[str, str]] | None = None,
) -> None:
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise GateError(f"{label}: lockfile is not UTF-8") from exc

    section = ""
    in_resolution = False
    current_local_tarball: str | None = None
    for line in text.splitlines():
        top = re.match(r"^([A-Za-z][A-Za-z0-9_-]*):\s*$", line)
        if top:
            section = top.group(1)
            in_resolution = False
            current_local_tarball = None
            continue
        if section != "packages":
            continue
        entry = re.match(r"^  (\S.*):\s*$", line)
        if entry:
            in_resolution = False
            key = decode_yaml_scalar(entry.group(1))
            record = (local_records or {}).get(key)
            current_local_tarball = record.get("path") if record else None
            continue
        resolution = re.match(r"^    resolution:\s*(.*)$", line)
        if resolution:
            fields = parse_inline_resolution(resolution.group(1))
            validate_pnpm_resolution_fields(
                fields,
                f"{label}: pnpm resolution",
                current_local_tarball,
            )
            in_resolution = not bool(resolution.group(1).strip())
            continue
        if in_resolution:
            nested = re.match(
                r"^      ['\"]?(integrity|tarball|type|repo|commit|path)['\"]?:\s*(.+?)\s*$",
                line,
            )
            if nested:
                validate_pnpm_resolution_fields(
                    {nested.group(1): decode_yaml_scalar(nested.group(2))},
                    f"{label}: pnpm resolution",
                    current_local_tarball,
                )
            elif line and len(line) - len(line.lstrip()) <= 4:
                in_resolution = False


def parse_pnpm_resolution_map(
    data: bytes,
    label: str = "pnpm-lock.yaml",
    approved_local_tarballs: ReviewedArtifactMap | None = None,
) -> ResolutionMap:
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise GateError(f"{label}: lockfile is not UTF-8") from exc

    approved = approved_local_tarballs or {}
    pairs = parse_pnpm_lock(data, label, approved)
    local_records = parse_pnpm_local_tarball_records(text, label, approved)
    records: dict[Pair, set[str]] = {}
    section = ""
    current_pair: Pair | None = None
    fields: dict[str, str] = {}
    in_resolution = False

    def flush() -> None:
        nonlocal current_pair, fields, in_resolution
        add_resolution_record(records, current_pair, fields)
        current_pair, fields, in_resolution = None, {}, False

    for line in text.splitlines():
        top = re.match(r"^([A-Za-z][A-Za-z0-9_-]*):\s*$", line)
        if top:
            flush()
            section = top.group(1)
            continue
        if section != "packages":
            continue
        entry = re.match(r"^  (\S.*):\s*$", line)
        if entry:
            flush()
            package_key = decode_yaml_scalar(entry.group(1))
            local_record = local_records.get(package_key)
            current_pair = (
                (local_record["package"], local_record["version"])
                if local_record
                else split_package_key(package_key)
            )
            continue
        if current_pair is None:
            continue
        resolution = re.match(r"^    resolution:\s*(.*)$", line)
        if resolution:
            fields.update(parse_inline_resolution(resolution.group(1)))
            in_resolution = not bool(resolution.group(1).strip())
            continue
        if in_resolution:
            nested = re.match(
                r"^      ['\"]?(integrity|tarball|type|repo|commit|path)['\"]?:\s*(.+?)\s*$",
                line,
            )
            if nested:
                fields[nested.group(1)] = decode_yaml_scalar(nested.group(2))
            elif line and len(line) - len(line.lstrip()) <= 4:
                in_resolution = False
    flush()
    return freeze_resolution_map(pairs, records)


def parse_package_lock_resolution_map(
    data: bytes, label: str = "package-lock.json"
) -> ResolutionMap:
    try:
        parsed = json.loads(data)
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise GateError(f"{label}: invalid JSON") from exc
    if not isinstance(parsed, dict):
        raise GateError(f"{label}: root must be an object")

    pairs = parse_package_lock(data, label)
    records: dict[Pair, set[str]] = {}

    def fields_for(record: Mapping[str, Any]) -> dict[str, str]:
        return {
            key: value
            for key in ("resolved", "integrity")
            if isinstance((value := record.get(key)), str)
        }

    packages = parsed.get("packages")
    if isinstance(packages, dict):
        for install_path, record in packages.items():
            if not install_path or not isinstance(record, dict):
                continue
            name = record.get("name") or package_name_from_node_modules_path(str(install_path))
            version = record.get("version")
            pair = (
                (name, version)
                if isinstance(name, str)
                and isinstance(version, str)
                and is_registry_version(version)
                else None
            )
            add_resolution_record(records, pair, fields_for(record))

    def walk(dependencies: Any) -> None:
        if not isinstance(dependencies, dict):
            return
        for name, record in dependencies.items():
            if not isinstance(name, str) or not isinstance(record, dict):
                continue
            version = record.get("version")
            pair = (
                (name, version)
                if isinstance(version, str) and is_registry_version(version)
                else None
            )
            add_resolution_record(records, pair, fields_for(record))
            walk(record.get("dependencies"))

    walk(parsed.get("dependencies"))
    return freeze_resolution_map(pairs, records)


def parse_yarn_resolution_map(data: bytes, label: str = "yarn.lock") -> ResolutionMap:
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise GateError(f"{label}: lockfile is not UTF-8") from exc

    pairs = parse_yarn_lock(data, label)
    records: dict[Pair, set[str]] = {}
    selectors: list[str] = []
    version: str | None = None
    fields: dict[str, str] = {}

    def flush() -> None:
        nonlocal selectors, version, fields
        if version:
            name = yarn_selector_name(fields.get("resolution", ""))
            if not name and selectors:
                name = yarn_selector_name(selectors[0])
            pair = (name, version) if name and is_registry_version(version) else None
            add_resolution_record(records, pair, fields)
        selectors, version, fields = [], None, {}

    for line in text.splitlines():
        if line and not line[0].isspace() and line.rstrip().endswith(":"):
            flush()
            header = line.rstrip()[:-1]
            if header == "__metadata":
                continue
            selectors = [part.strip() for part in re.split(r",\s*", header)]
            continue
        if not selectors:
            continue
        match_version = re.match(r"^\s+version(?::|\s+)\s*[\"']?([^\"'\s]+)", line)
        if match_version:
            version = match_version.group(1)
            continue
        match_field = re.match(
            r"^\s+(resolved|resolution|integrity|checksum)(?::|\s+)\s*(.+?)\s*$", line
        )
        if match_field:
            fields[match_field.group(1)] = decode_yaml_scalar(match_field.group(2))
    flush()
    return freeze_resolution_map(pairs, records)


def parse_lockfile_resolution_map(
    path: str | Path,
    data: bytes,
    approved_local_tarballs: ReviewedArtifactMap | None = None,
) -> ResolutionMap:
    name = Path(path).name
    if name == "pnpm-lock.yaml":
        return parse_pnpm_resolution_map(data, str(path), approved_local_tarballs)
    if name == "package-lock.json":
        return parse_package_lock_resolution_map(data, str(path))
    if name == "yarn.lock":
        return parse_yarn_resolution_map(data, str(path))
    if name in {"bun.lock", "bun.lockb"}:
        raise CoverageError(f"{path}: Bun lockfile resolution parsing is not implemented")
    raise GateError(f"unsupported lockfile: {path}")


def ignored_path(path: Path, root: Path) -> bool:
    try:
        relative = path.relative_to(root)
    except ValueError:
        return True
    parts = relative.parts
    if any(part in IGNORED_PARTS for part in parts):
        return True
    return "tools" in parts and "supply-chain-gate" in parts and "fixtures" in parts


def ignored_relative_path(value: str) -> bool:
    parts = Path(value).parts
    if any(part in IGNORED_PARTS for part in parts):
        return True
    return "tools" in parts and "supply-chain-gate" in parts and "fixtures" in parts


def discover_files(root: Path, names: set[str]) -> list[Path]:
    found: list[Path] = []
    for current, dirs, files in os.walk(root):
        current_path = Path(current)
        dirs[:] = sorted(d for d in dirs if d not in IGNORED_PARTS)
        if ignored_path(current_path, root):
            dirs[:] = []
            continue
        for filename in sorted(files):
            if filename in names:
                path = current_path / filename
                if not ignored_path(path, root):
                    found.append(path)
    return sorted(found)


def load_tsv(path: Path, required_fields: Sequence[str]) -> list[dict[str, str]]:
    try:
        lines = [line for line in path.read_text(encoding="utf-8").splitlines() if not line.startswith("#")]
    except (OSError, UnicodeDecodeError) as exc:
        raise GateError(f"cannot read {path}: {exc}") from exc
    if not lines:
        raise GateError(f"{path}: missing TSV header")
    reader = csv.DictReader(lines, delimiter="\t")
    if not reader.fieldnames or any(field not in reader.fieldnames for field in required_fields):
        raise GateError(f"{path}: expected fields {', '.join(required_fields)}")
    rows: list[dict[str, str]] = []
    for row_number, row in enumerate(reader, start=2):
        normalized = {key: (value or "").strip() for key, value in row.items() if key is not None}
        if not any(normalized.values()):
            continue
        if any(not normalized.get(field) for field in required_fields):
            raise GateError(f"{path}:{row_number}: missing required field")
        rows.append(normalized)
    return rows


def load_iocs(path: Path) -> dict[Pair, dict[str, str]]:
    rows = load_tsv(path, ("package", "version", "source", "recorded_at", "note"))
    result: dict[Pair, dict[str, str]] = {}
    for row in rows:
        pair = (row["package"], row["version"])
        if pair in result:
            raise GateError(f"{path}: duplicate IOC {pair[0]}@{pair[1]}")
        result[pair] = row
    return result


def load_lifecycle_reviews(path: Path) -> dict[tuple[str, str, str, str], dict[str, str]]:
    rows = load_tsv(
        path,
        (
            "package",
            "version",
            "phase",
            "script_sha256",
            "reviewed_at",
            "outcome",
            "source",
            "note",
        ),
    )
    result: dict[tuple[str, str, str, str], dict[str, str]] = {}
    for row in rows:
        outcome = row["outcome"].upper()
        if outcome not in {"APPROVED", "BLOCKED"}:
            raise GateError(f"{path}: invalid lifecycle outcome {row['outcome']}")
        if row["phase"] not in {*LIFECYCLE_KEYS, "metadata_hasInstallScript"}:
            raise GateError(f"{path}: invalid lifecycle phase {row['phase']}")
        if not re.fullmatch(r"[0-9a-f]{64}", row["script_sha256"]):
            raise GateError(f"{path}: invalid lifecycle script SHA-256 {row['script_sha256']}")
        row["outcome"] = outcome
        key = (row["package"], row["version"], row["phase"], row["script_sha256"])
        if key in result:
            raise GateError(
                f"{path}: duplicate lifecycle review {key[0]}@{key[1]} {key[2]} {key[3]}"
            )
        result[key] = row
    return result


def read_json_object(data: bytes, label: str) -> dict[str, Any]:
    try:
        parsed = json.loads(data)
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise CoverageError(f"{label}: invalid JSON") from exc
    if not isinstance(parsed, dict):
        raise CoverageError(f"{label}: root must be an object")
    return parsed


def read_limited(response: Any, maximum: int, label: str) -> bytes:
    data = response.read(maximum + 1)
    if len(data) > maximum:
        raise CoverageError(f"{label}: response exceeds {maximum} bytes")
    return data


def post_json(url: str, payload: dict[str, Any], timeout: float, maximum: int) -> bytes:
    body = canonical_json_bytes(payload)
    request = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Accept": "application/json",
            "Content-Type": "application/json",
            "User-Agent": "witnessops-supply-chain-gate/1",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            return read_limited(response, maximum, url)
    except (OSError, urllib.error.URLError, urllib.error.HTTPError) as exc:
        raise CoverageError(f"{url}: {type(exc).__name__}: {exc}") from exc


def get_json(url: str, timeout: float, maximum: int) -> dict[str, Any]:
    request = urllib.request.Request(
        url,
        method="GET",
        headers={"Accept": "application/json", "User-Agent": "witnessops-supply-chain-gate/1"},
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            data = read_limited(response, maximum, url)
    except (OSError, urllib.error.URLError, urllib.error.HTTPError) as exc:
        raise CoverageError(f"{url}: {type(exc).__name__}: {exc}") from exc
    return read_json_object(data, url)


def query_osv(pairs: Sequence[Pair], url: str, timeout: float) -> tuple[dict[Pair, list[dict[str, str]]], dict[str, Any]]:
    findings: dict[Pair, list[dict[str, str]]] = {pair: [] for pair in pairs}
    raw_pages: list[dict[str, Any]] = []
    chunk_size = 500

    for start in range(0, len(pairs), chunk_size):
        chunk = list(pairs[start : start + chunk_size])
        pending: list[tuple[int, Pair, str | None]] = [(index, pair, None) for index, pair in enumerate(chunk)]
        while pending:
            queries = []
            for _, (name, version), page_token in pending:
                query: dict[str, Any] = {
                    "package": {"ecosystem": "npm", "name": name},
                    "version": version,
                }
                if page_token:
                    query["page_token"] = page_token
                queries.append(query)
            response = read_json_object(
                post_json(url, {"queries": queries}, timeout, MAX_OSV_RESPONSE_BYTES),
                url,
            )
            raw_pages.append(response)
            results = response.get("results")
            if not isinstance(results, list) or len(results) != len(pending):
                raise CoverageError(f"{url}: result count does not match query count")
            next_pending: list[tuple[int, Pair, str | None]] = []
            for pending_item, result in zip(pending, results):
                index, pair, _ = pending_item
                if not isinstance(result, dict):
                    raise CoverageError(f"{url}: result {start + index} is not an object")
                vulns = result.get("vulns", [])
                if not isinstance(vulns, list):
                    raise CoverageError(f"{url}: vulns for {pair[0]}@{pair[1]} is not a list")
                for vuln in vulns:
                    if not isinstance(vuln, dict) or not isinstance(vuln.get("id"), str):
                        raise CoverageError(f"{url}: malformed advisory for {pair[0]}@{pair[1]}")
                    findings[pair].append(
                        {"id": vuln["id"], "modified": str(vuln.get("modified", ""))}
                    )
                token = result.get("next_page_token")
                if token:
                    if not isinstance(token, str):
                        raise CoverageError(f"{url}: invalid pagination token")
                    next_pending.append((index, pair, token))
            pending = next_pending

    normalized = [
        {
            "package": name,
            "version": version,
            "advisories": sorted(findings[(name, version)], key=lambda item: item["id"]),
        }
        for name, version in pairs
    ]
    return findings, {
        "name": "OSV querybatch (GitHub Advisory Database and OpenSSF-format sources)",
        "url": url,
        "upstream_sources": list(OSV_UPSTREAM_SOURCES),
        "status": "checked",
        "retrieved_at": utc_now(),
        "response_sha256": sha256_bytes(canonical_json_bytes(normalized)),
        "query_count": len(pairs),
        "page_count": len(raw_pages),
    }


def load_osv_snapshot(path: Path, pairs: Sequence[Pair]) -> tuple[dict[Pair, list[dict[str, str]]], dict[str, Any]]:
    raw = path.read_bytes()
    parsed = read_json_object(raw, str(path))
    records = parsed.get("records")
    if not isinstance(records, list):
        raise CoverageError(f"{path}: records must be a list")
    lookup: dict[Pair, list[dict[str, str]]] = {}
    for record in records:
        if not isinstance(record, dict):
            raise CoverageError(f"{path}: record must be an object")
        package, version, advisories = record.get("package"), record.get("version"), record.get("advisories")
        if not isinstance(package, str) or not isinstance(version, str) or not isinstance(advisories, list):
            raise CoverageError(f"{path}: malformed record")
        normalized: list[dict[str, str]] = []
        for advisory in advisories:
            if isinstance(advisory, str):
                normalized.append({"id": advisory, "modified": ""})
            elif isinstance(advisory, dict) and isinstance(advisory.get("id"), str):
                normalized.append({"id": advisory["id"], "modified": str(advisory.get("modified", ""))})
            else:
                raise CoverageError(f"{path}: malformed advisory")
        pair = (package, version)
        if pair in lookup:
            raise CoverageError(f"{path}: duplicate record {package}@{version}")
        lookup[pair] = normalized
    missing = [f"{name}@{version}" for name, version in pairs if (name, version) not in lookup]
    if missing:
        raise CoverageError(f"{path}: missing {len(missing)} queried package records")
    return {pair: lookup[pair] for pair in pairs}, {
        "name": "OSV deterministic test snapshot",
        "url": str(path),
        "upstream_sources": list(OSV_UPSTREAM_SOURCES),
        "status": "checked",
        "retrieved_at": str(parsed.get("retrieved_at", "fixture")),
        "response_sha256": sha256_bytes(raw),
        "query_count": len(pairs),
        "page_count": 1,
    }


def extract_lifecycle_scripts(metadata: Mapping[str, Any]) -> dict[str, str]:
    scripts = metadata.get("scripts", {})
    if scripts is None:
        scripts = {}
    if not isinstance(scripts, dict):
        raise CoverageError("npm metadata scripts field is not an object")
    result: dict[str, str] = {}
    for key in LIFECYCLE_KEYS:
        value = scripts.get(key)
        if value is not None:
            if not isinstance(value, str):
                raise CoverageError(f"npm metadata script {key} is not a string")
            result[key] = value
    if metadata.get("hasInstallScript") is True and not result:
        result["metadata_hasInstallScript"] = "true"
    return result


def registry_metadata_url(registry_url: str, pair: Pair) -> str:
    name, version = pair
    encoded_name = urllib.parse.quote(name, safe="")
    encoded_version = urllib.parse.quote(version, safe="")
    return f"{registry_url.rstrip('/')}/{encoded_name}/{encoded_version}"


def fetch_registry_metadata(pair: Pair, registry_url: str, timeout: float) -> tuple[dict[str, Any], str]:
    url = registry_metadata_url(registry_url, pair)
    return get_json(url, timeout, MAX_NPM_METADATA_BYTES), url


def load_registry_snapshot(path: Path) -> tuple[dict[Pair, dict[str, Any]], dict[Pair, str]]:
    parsed = read_json_object(path.read_bytes(), str(path))
    records = parsed.get("records")
    if not isinstance(records, list):
        raise CoverageError(f"{path}: records must be a list")
    metadata: dict[Pair, dict[str, Any]] = {}
    sources: dict[Pair, str] = {}
    for record in records:
        if not isinstance(record, dict):
            raise CoverageError(f"{path}: record must be an object")
        package, version, value = record.get("package"), record.get("version"), record.get("metadata")
        if not isinstance(package, str) or not isinstance(version, str) or not isinstance(value, dict):
            raise CoverageError(f"{path}: malformed registry record")
        pair = (package, version)
        if pair in metadata:
            raise CoverageError(f"{path}: duplicate registry record {package}@{version}")
        metadata[pair] = value
        sources[pair] = f"{path}#{package}@{version}"
    return metadata, sources


def script_indicators(scripts: Mapping[str, str]) -> list[str]:
    combined = "\n".join(f"{key}={value}" for key, value in sorted(scripts.items()))
    return sorted(name for name, pattern in SUSPICIOUS_SCRIPT_PATTERNS.items() if pattern.search(combined))


def evaluate_lifecycle(
    new_pairs: Sequence[Pair],
    reviews: Mapping[tuple[str, str, str, str], Mapping[str, str]],
    metadata_loader: Callable[[Pair], tuple[Mapping[str, Any], str]],
) -> tuple[list[dict[str, Any]], list[str], list[str]]:
    records: list[dict[str, Any]] = []
    blocked: list[str] = []
    degraded: list[str] = []
    for pair in new_pairs:
        name, version = pair
        try:
            metadata, source = metadata_loader(pair)
            scripts = extract_lifecycle_scripts(metadata)
        except CoverageError as exc:
            degraded.append(f"lifecycle metadata unavailable for {name}@{version}: {exc}")
            continue
        script_bytes = canonical_json_bytes(scripts)
        scripts_sha256 = sha256_bytes(script_bytes)
        metadata_sha256 = sha256_bytes(canonical_json_bytes(metadata))
        outcome = "NOT_REQUIRED"
        script_reviews: list[dict[str, str]] = []
        if scripts:
            phase_outcomes: list[str] = []
            for phase, script_text in sorted(scripts.items()):
                script_sha256 = sha256_bytes(script_text.encode("utf-8"))
                review = reviews.get((name, version, phase, script_sha256))
                phase_outcome = "REVIEW_REQUIRED" if review is None else str(review["outcome"])
                phase_outcomes.append(phase_outcome)
                if review is None:
                    blocked.append(
                        f"new lifecycle script requires review: {name}@{version} "
                        f"{phase} {script_sha256}"
                    )
                elif phase_outcome == "BLOCKED":
                    blocked.append(
                        f"lifecycle review blocks {name}@{version} {phase} {script_sha256}"
                    )
                script_reviews.append(
                    {
                        "phase": phase,
                        "script_sha256": script_sha256,
                        "review_outcome": phase_outcome,
                        "review_source": review.get("source", "") if review else "",
                        "reviewed_at": review.get("reviewed_at", "") if review else "",
                        "review_note": review.get("note", "") if review else "",
                    }
                )
            if "BLOCKED" in phase_outcomes:
                outcome = "BLOCKED"
            elif "REVIEW_REQUIRED" in phase_outcomes:
                outcome = "REVIEW_REQUIRED"
            else:
                outcome = "APPROVED"
        records.append(
            {
                "package": name,
                "version": version,
                "scripts": scripts,
                "scripts_sha256": scripts_sha256,
                "indicators": script_indicators(scripts),
                "metadata_source": source,
                "metadata_retrieved_at": utc_now(),
                "metadata_sha256": metadata_sha256,
                "review_outcome": outcome,
                "script_reviews": script_reviews,
            }
        )
    return records, blocked, degraded


def run_git(repo: Path, arguments: Sequence[str], allow_failure: bool = False) -> str:
    completed = subprocess.run(
        ["git", "-C", str(repo), *arguments],
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    if completed.returncode != 0 and not allow_failure:
        detail = completed.stderr.strip() or completed.stdout.strip()
        raise GateError(f"git {' '.join(arguments)} failed: {detail}")
    return completed.stdout


def git_blob(repo: Path, revision: str, relative_path: str) -> bytes | None:
    completed = subprocess.run(
        ["git", "-C", str(repo), "show", f"{revision}:{relative_path}"],
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
    )
    return completed.stdout if completed.returncode == 0 else None


def load_vendored_artifact_review_authority(
    repo: Path, path: Path, base_ref: str | None
) -> tuple[ReviewedArtifactMap, dict[str, Any]]:
    if path.is_symlink() or not path.is_file():
        raise GateError("vendored artifact review ledger must be a regular repository file")
    relative = repository_relative_path(repo, path, "vendored artifact review ledger")
    current_bytes = path.read_bytes()
    parse_vendored_artifact_reviews(current_bytes, relative)
    current_sha256 = sha256_bytes(current_bytes)

    if base_ref:
        authority_revision = run_git(repo, ["rev-parse", f"{base_ref}^{{commit}}"]).strip()
        authority_bytes = git_blob(repo, authority_revision, relative)
        if authority_bytes is None:
            authority_reviews: ReviewedArtifactMap = {}
            authority_status = "ABSENT_ON_BASE"
            authority_sha256 = ""
        else:
            authority_reviews = parse_vendored_artifact_reviews(
                authority_bytes, f"{authority_revision}:{relative}"
            )
            authority_status = "LOADED_FROM_BASE"
            authority_sha256 = sha256_bytes(authority_bytes)
    else:
        authority_revision = run_git(repo, ["rev-parse", "HEAD"]).strip()
        authority_bytes = current_bytes
        authority_reviews = parse_vendored_artifact_reviews(authority_bytes, relative)
        authority_status = "LOADED_FROM_CURRENT"
        authority_sha256 = current_sha256

    return authority_reviews, {
        "review_file": relative,
        "authority_revision": authority_revision,
        "authority_status": authority_status,
        "authority_sha256": authority_sha256,
        "current_sha256": current_sha256,
        "current_differs_from_authority": current_sha256 != authority_sha256,
    }


def dependency_contract(data: bytes | None, label: str) -> dict[str, Any]:
    if data is None:
        return {}
    try:
        parsed = json.loads(data)
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise GateError(f"{label}: invalid package.json") from exc
    if not isinstance(parsed, dict):
        raise GateError(f"{label}: package.json root must be an object")
    contract = {field: parsed.get(field) for field in DEPENDENCY_FIELDS if field in parsed}
    pnpm = parsed.get("pnpm")
    if isinstance(pnpm, dict):
        contract["pnpm"] = pnpm
    return contract


def assess_manifest_lock_change(
    changed_files: Sequence[str],
    base_reader: Callable[[str], bytes | None],
    current_reader: Callable[[str], bytes | None],
) -> dict[str, Any]:
    manifest_changes: list[str] = []
    policy_files = sorted(path for path in set(changed_files) if not ignored_relative_path(path))
    for path in policy_files:
        if Path(path).name != "package.json":
            continue
        before = dependency_contract(base_reader(path), f"base:{path}")
        after = dependency_contract(current_reader(path), f"current:{path}")
        if before != after:
            manifest_changes.append(path)
    lock_changes = sorted(path for path in policy_files if Path(path).name in LOCKFILE_NAMES)
    blocked = bool(manifest_changes and not lock_changes)
    return {
        "semantic_manifest_changes": manifest_changes,
        "lockfile_changes": lock_changes,
        "resolution_changes": [],
        "unsupported_sources": [],
        "status": "BLOCKED" if blocked else "PASS",
        "reason": "dependency declarations changed without a lockfile change" if blocked else "",
    }


def evaluate_git_change(repo: Path, base_ref: str | None) -> tuple[dict[str, Any], set[Pair]]:
    if not base_ref:
        return {
            "base_ref": "",
            "semantic_manifest_changes": [],
            "lockfile_changes": [],
            "resolution_changes": [],
            "unsupported_sources": [],
            "status": "NOT_APPLICABLE",
            "reason": "no comparison base supplied",
        }, set()
    run_git(repo, ["cat-file", "-e", f"{base_ref}^{{commit}}"])
    changed_files = [line for line in run_git(repo, ["diff", "--name-only", base_ref, "--"]).splitlines() if line]
    changed_files.extend(
        line
        for line in run_git(repo, ["ls-files", "--others", "--exclude-standard"]).splitlines()
        if line
    )
    result = assess_manifest_lock_change(
        changed_files,
        lambda path: git_blob(repo, base_ref, path),
        lambda path: (repo / path).read_bytes() if (repo / path).is_file() else None,
    )
    result["base_ref"] = base_ref
    return result, set()


def base_graph(
    repo: Path,
    base_ref: str | None,
    lockfiles: Sequence[Path],
    base_approved_local_tarballs: ReviewedArtifactMap | None = None,
) -> set[Pair]:
    if not base_ref:
        return set()
    pairs: set[Pair] = set()
    for lockfile in lockfiles:
        relative = repository_relative_path(repo, lockfile, "lockfile")
        data = git_blob(repo, base_ref, relative)
        if data is None:
            continue
        pairs.update(parse_lockfile_bytes(relative, data, base_approved_local_tarballs))
    return pairs


def compare_lockfile_resolutions(
    repo: Path,
    base_ref: str | None,
    lockfiles: Sequence[Path],
    current_approved_local_tarballs: ReviewedArtifactMap | None = None,
    base_approved_local_tarballs: ReviewedArtifactMap | None = None,
) -> tuple[list[dict[str, str]], set[Pair]]:
    if not base_ref:
        return [], set()
    changes: list[dict[str, str]] = []
    changed_pairs: set[Pair] = set()
    for lockfile in lockfiles:
        relative = repository_relative_path(repo, lockfile, "lockfile")
        base_data = git_blob(repo, base_ref, relative)
        if base_data is None:
            continue
        current_data = lockfile.read_bytes()
        base_resolutions = parse_lockfile_resolution_map(
            relative, base_data, base_approved_local_tarballs
        )
        current_resolutions = parse_lockfile_resolution_map(
            relative, current_data, current_approved_local_tarballs
        )
        for pair in sorted(base_resolutions.keys() & current_resolutions.keys()):
            before = base_resolutions[pair]
            after = current_resolutions[pair]
            if before == after:
                continue
            changed_pairs.add(pair)
            changes.append(
                {
                    "lockfile": relative,
                    "package": pair[0],
                    "version": pair[1],
                    "base_resolution_sha256": resolution_set_sha256(before),
                    "current_resolution_sha256": resolution_set_sha256(after),
                }
            )
    return changes, changed_pairs


def parse_args(argv: Sequence[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo-root", default=".")
    parser.add_argument("--lockfile", action="append", default=[])
    parser.add_argument("--base-ref")
    parser.add_argument("--ioc-file", default="security/supply-chain/emergency-iocs.tsv")
    parser.add_argument("--lifecycle-reviews", default="security/supply-chain/lifecycle-reviews.tsv")
    parser.add_argument(
        "--vendored-artifact-reviews",
        default="security/supply-chain/vendored-artifact-reviews.tsv",
    )
    parser.add_argument("--osv-url", default=OSV_API_URL)
    parser.add_argument("--osv-snapshot")
    parser.add_argument("--registry-url", default=NPM_REGISTRY_URL)
    parser.add_argument("--registry-metadata-snapshot")
    parser.add_argument("--output-dir", default="artifacts/supply-chain-gate")
    parser.add_argument("--timeout", type=float, default=20.0)
    return parser.parse_args(argv)


def resolve_under(root: Path, value: str) -> Path:
    path = Path(value)
    return path if path.is_absolute() else root / path


def repository_relative_path(root: Path, path: Path, label: str) -> str:
    try:
        return path.resolve().relative_to(root).as_posix()
    except ValueError as exc:
        raise GateError(f"{label} must be inside repository root: {path}") from exc


def display_path(path: Path, root: Path) -> str:
    try:
        return path.relative_to(root).as_posix()
    except ValueError:
        return str(path)


def package_manager_identity(repo: Path, lock_records: Sequence[Mapping[str, Any]]) -> str:
    package_json = repo / "package.json"
    if package_json.is_file():
        try:
            parsed = json.loads(package_json.read_bytes())
        except (OSError, json.JSONDecodeError, UnicodeDecodeError):
            parsed = {}
        if isinstance(parsed, dict) and isinstance(parsed.get("packageManager"), str):
            return parsed["packageManager"]
    formats = sorted({str(record.get("format", "")) for record in lock_records})
    return ",".join(formats) if formats else "UNKNOWN"


def main(argv: Sequence[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    repo = Path(args.repo_root).resolve()
    output_dir = resolve_under(repo, args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    blocked_reasons: list[str] = []
    degraded_reasons: list[str] = []
    intelligence: list[dict[str, Any]] = []
    lock_records: list[dict[str, Any]] = []
    emergency_matches: list[dict[str, Any]] = []
    advisory_matches: list[dict[str, Any]] = []
    lifecycle_records: list[dict[str, Any]] = []
    dependency_change: dict[str, Any] = {
        "base_ref": args.base_ref or "",
        "semantic_manifest_changes": [],
        "lockfile_changes": [],
        "resolution_changes": [],
        "unsupported_sources": [],
        "status": "UNKNOWN",
        "reason": "not evaluated",
    }
    graph: set[Pair] = set()
    registry_graph: set[Pair] = set()
    commit_sha = "UNKNOWN"
    unsupported_sources: list[dict[str, str]] = []
    reviewed_artifacts: dict[str, Any] = {
        "authority": {},
        "records": [],
        "lockfile_records": [],
    }
    authority_reviews: ReviewedArtifactMap = {}
    base_approved_reviews: ReviewedArtifactMap = {}
    accepted_local_tarballs: ReviewedArtifactMap = {}

    try:
        commit_sha = run_git(repo, ["rev-parse", "HEAD"]).strip()
        review_path = resolve_under(repo, args.vendored_artifact_reviews)
        authority_reviews, review_authority = load_vendored_artifact_review_authority(
            repo, review_path, args.base_ref
        )
        reviewed_artifacts["authority"] = review_authority
        base_approved_reviews = {
            key: dict(review)
            for key, review in authority_reviews.items()
            if review["status"] == "APPROVED"
        }
        (
            unsupported_sources,
            reviewed_records,
            accepted_local_tarballs,
            reviewed_artifact_blocks,
        ) = inspect_dependency_sources(repo, authority_reviews)
        reviewed_artifacts["records"] = reviewed_records
        blocked_reasons.extend(reviewed_artifact_blocks)
        dependency_change["unsupported_sources"] = unsupported_sources
        for record in unsupported_sources:
            blocked_reasons.append(
                "unsupported non-registry package source: "
                f"{record['package']} in {record['manifest']} {record['dependency_field']} "
                f"(specifier_sha256={record['specifier_sha256']})"
            )
        if args.lockfile:
            lockfiles = [resolve_under(repo, value) for value in args.lockfile]
        else:
            lockfiles = discover_files(repo, LOCKFILE_NAMES)
        if not lockfiles:
            raise GateError("no dependency lockfiles found")
        reviewed_lock_records: list[dict[str, str]] = []
        for lockfile in lockfiles:
            if not lockfile.is_file():
                raise GateError(f"missing lockfile: {lockfile}")
            relative = repository_relative_path(repo, lockfile, "lockfile")
            try:
                lockfile_bytes = lockfile.read_bytes()
                pairs = parse_lockfile_bytes(
                    relative, lockfile_bytes, accepted_local_tarballs
                )
                if lockfile.name == "pnpm-lock.yaml":
                    lockfile_text = lockfile_bytes.decode("utf-8")
                    registry_graph.update(pnpm_registry_pairs(lockfile_text, relative))
                    local_records = parse_pnpm_local_tarball_records(
                        lockfile_text, relative, accepted_local_tarballs
                    )
                    reviewed_lock_records.extend(
                        {
                            "lockfile": relative,
                            "package": record["package"],
                            "version": record["version"],
                            "path": record["path"],
                            "integrity": record["integrity"],
                            "source_class": "reviewed-local-tarball",
                        }
                        for record in local_records.values()
                    )
                else:
                    registry_graph.update(pairs)
            except CoverageError as exc:
                degraded_reasons.append(str(exc))
                pairs = set()
            graph.update(pairs)
            lock_records.append(
                {
                    "path": relative,
                    "format": lockfile.name,
                    "sha256": sha256_file(lockfile),
                    "package_count": len(pairs),
                }
            )
        reviewed_artifacts["lockfile_records"] = sorted(
            reviewed_lock_records,
            key=lambda item: (item["lockfile"], item["path"], item["package"]),
        )
        expected_reviewed_tuples = {
            (package, review["version"], path)
            for (package, path), review in accepted_local_tarballs.items()
        }
        observed_reviewed_tuples = {
            (record["package"], record["version"], record["path"])
            for record in reviewed_lock_records
        }
        for package, version, path in sorted(
            expected_reviewed_tuples - observed_reviewed_tuples
        ):
            blocked_reasons.append(
                f"reviewed local tarball is missing exact lockfile identity: "
                f"{package}@{version} at {path}"
            )

        graph_bytes = canonical_graph_bytes(graph)
        graph_path = output_dir / "package-graph.tsv"
        graph_path.write_bytes(graph_bytes)
        graph_sha256 = sha256_bytes(graph_bytes)

        dependency_change, _ = evaluate_git_change(repo, args.base_ref)
        dependency_change["unsupported_sources"] = unsupported_sources
        if dependency_change["status"] == "BLOCKED":
            blocked_reasons.append(str(dependency_change["reason"]))

        if args.base_ref:
            try:
                new_pairs = sorted(
                    graph
                    - base_graph(
                        repo,
                        args.base_ref,
                        lockfiles,
                        base_approved_reviews,
                    )
                )
                resolution_changes, resolution_changed_pairs = compare_lockfile_resolutions(
                    repo,
                    args.base_ref,
                    lockfiles,
                    accepted_local_tarballs,
                    base_approved_reviews,
                )
                dependency_change["resolution_changes"] = resolution_changes
                for pair in sorted(resolution_changed_pairs):
                    blocked_reasons.append(
                        "lockfile resolution changed without version change: "
                        f"{pair[0]}@{pair[1]}"
                    )
            except CoverageError as exc:
                new_pairs = []
                resolution_changed_pairs = set()
                degraded_reasons.append(f"base lockfile coverage unavailable: {exc}")
        else:
            new_pairs = []
            resolution_changed_pairs = set()
        introduced_pair_set = set(new_pairs) | resolution_changed_pairs

        ioc_path = resolve_under(repo, args.ioc_file)
        try:
            iocs = load_iocs(ioc_path)
            ioc_bytes = ioc_path.read_bytes()
            intelligence.append(
                {
                    "name": "WitnessOps emergency IOC list",
                    "url": display_path(ioc_path, repo),
                    "status": "checked",
                    "retrieved_at": utc_now(),
                    "response_sha256": sha256_bytes(ioc_bytes),
                    "query_count": len(graph),
                }
            )
        except (GateError, OSError) as exc:
            iocs = {}
            degraded_reasons.append(f"emergency IOC coverage unavailable: {exc}")
            intelligence.append(
                {
                    "name": "WitnessOps emergency IOC list",
                    "url": display_path(ioc_path, repo),
                    "status": "degraded",
                    "retrieved_at": utc_now(),
                    "reason": str(exc),
                    "query_count": len(graph),
                }
            )
        for pair in sorted(graph):
            if pair in iocs:
                row = iocs[pair]
                emergency_matches.append(
                    {
                        "package": pair[0],
                        "version": pair[1],
                        "source": row["source"],
                        "recorded_at": row["recorded_at"],
                        "review_after": row.get("review_after", ""),
                        "note": row["note"],
                    }
                )
                blocked_reasons.append(f"emergency IOC match: {pair[0]}@{pair[1]}")

        ordered_graph = sorted(graph)
        try:
            if args.osv_snapshot:
                osv_results, osv_source = load_osv_snapshot(resolve_under(repo, args.osv_snapshot), ordered_graph)
            else:
                osv_results, osv_source = query_osv(ordered_graph, args.osv_url, args.timeout)
            intelligence.append(osv_source)
            for pair in ordered_graph:
                for advisory in osv_results.get(pair, []):
                    advisory_id = advisory["id"]
                    classification = "malicious_package" if advisory_id.startswith("MAL-") else "vulnerability"
                    blocking = classification == "malicious_package" or pair in introduced_pair_set
                    advisory_matches.append(
                        {
                            "package": pair[0],
                            "version": pair[1],
                            "advisory": advisory_id,
                            "modified": advisory.get("modified", ""),
                            "source": args.osv_url if not args.osv_snapshot else str(args.osv_snapshot),
                            "classification": classification,
                            "introduced_by_change": pair in introduced_pair_set,
                            "blocking": blocking,
                        }
                    )
                    if blocking:
                        blocked_reasons.append(
                            f"OSV {classification}: {pair[0]}@{pair[1]} ({advisory_id})"
                        )
        except (CoverageError, OSError) as exc:
            degraded_reasons.append(f"OSV coverage unavailable: {exc}")
            intelligence.append(
                {
                    "name": "OSV querybatch (GitHub Advisory Database and OpenSSF-format sources)",
                    "url": args.osv_snapshot or args.osv_url,
                    "upstream_sources": list(OSV_UPSTREAM_SOURCES),
                    "status": "degraded",
                    "retrieved_at": utc_now(),
                    "reason": str(exc),
                    "query_count": len(graph),
                }
            )

        reviews_path = resolve_under(repo, args.lifecycle_reviews)
        try:
            reviews = load_lifecycle_reviews(reviews_path)
        except (GateError, OSError) as exc:
            reviews = {}
            degraded_reasons.append(f"lifecycle review ledger unavailable: {exc}")
        rejected_review_pairs = {
            (key[0], key[1])
            for key, review in reviews.items()
            if review["outcome"] == "BLOCKED" and (key[0], key[1]) in graph
        }
        reviewed_pair_set = {
            (review["package"], review["version"])
            for review in accepted_local_tarballs.values()
        }
        reviewed_only_pair_set = reviewed_pair_set - registry_graph
        lifecycle_pairs = sorted(
            (introduced_pair_set | rejected_review_pairs) - reviewed_only_pair_set
        )
        if lifecycle_pairs:
            snapshot_metadata: dict[Pair, dict[str, Any]] | None = None
            snapshot_sources: dict[Pair, str] | None = None
            snapshot_error: CoverageError | None = None
            if args.registry_metadata_snapshot:
                try:
                    snapshot_metadata, snapshot_sources = load_registry_snapshot(
                        resolve_under(repo, args.registry_metadata_snapshot)
                    )
                except CoverageError as exc:
                    snapshot_error = exc
                    degraded_reasons.append(f"registry metadata snapshot unavailable: {exc}")

            def metadata_loader(pair: Pair) -> tuple[Mapping[str, Any], str]:
                if snapshot_error is not None:
                    raise snapshot_error
                if snapshot_metadata is not None and snapshot_sources is not None:
                    if pair not in snapshot_metadata:
                        raise CoverageError(f"missing registry metadata record for {pair[0]}@{pair[1]}")
                    return snapshot_metadata[pair], snapshot_sources[pair]
                return fetch_registry_metadata(pair, args.registry_url, args.timeout)

            records, lifecycle_blocked, lifecycle_degraded = evaluate_lifecycle(
                lifecycle_pairs, reviews, metadata_loader
            )
            lifecycle_records.extend(records)
            blocked_reasons.extend(lifecycle_blocked)
            degraded_reasons.extend(lifecycle_degraded)

        status = "BLOCKED" if blocked_reasons else "COVERAGE DEGRADED" if degraded_reasons else "PASS"
        result = {
            "schema_version": SCHEMA_VERSION,
            "status": status,
            "generated_at": utc_now(),
            "repository": str(repo),
            "commit_sha": commit_sha,
            "package_manager": package_manager_identity(repo, lock_records),
            "lockfiles": lock_records,
            "graph": {
                "path": graph_path.relative_to(output_dir).as_posix(),
                "package_count": len(graph),
                "sha256": graph_sha256,
            },
            "intelligence": intelligence,
            "dependency_change": dependency_change,
            "reviewed_artifacts": reviewed_artifacts,
            "new_packages": [{"package": name, "version": version} for name, version in new_pairs],
            "lifecycle_review": {
                "status": (
                    "BLOCKED"
                    if any("lifecycle" in reason for reason in blocked_reasons)
                    else "COVERAGE DEGRADED"
                    if any("lifecycle" in reason or "registry metadata" in reason for reason in degraded_reasons)
                    else "PASS"
                    if lifecycle_pairs
                    else "NOT_APPLICABLE"
                ),
                "records": lifecycle_records,
            },
            "matches": {
                "emergency_iocs": emergency_matches,
                "osv_advisories": advisory_matches,
            },
            "blocked_reasons": sorted(set(blocked_reasons)),
            "degraded_reasons": sorted(set(degraded_reasons)),
            "build_result": "NOT_RUN",
        }
    except (GateError, OSError) as exc:
        status = "BLOCKED"
        blocked_reasons.append(str(exc))
        graph_path = output_dir / "package-graph.tsv"
        if not graph_path.exists():
            graph_path.write_bytes(b"")
        result = {
            "schema_version": SCHEMA_VERSION,
            "status": status,
            "generated_at": utc_now(),
            "repository": str(repo),
            "commit_sha": commit_sha,
            "package_manager": "UNKNOWN",
            "lockfiles": lock_records,
            "graph": {
                "path": graph_path.relative_to(output_dir).as_posix(),
                "package_count": len(graph),
                "sha256": sha256_file(graph_path),
            },
            "intelligence": intelligence,
            "dependency_change": dependency_change,
            "reviewed_artifacts": reviewed_artifacts,
            "new_packages": [],
            "lifecycle_review": {"status": "UNKNOWN", "records": lifecycle_records},
            "matches": {"emergency_iocs": emergency_matches, "osv_advisories": advisory_matches},
            "blocked_reasons": sorted(set(blocked_reasons)),
            "degraded_reasons": sorted(set(degraded_reasons)),
            "build_result": "NOT_RUN",
        }

    result_path = output_dir / "gate-result.json"
    result_path.write_bytes(json.dumps(result, indent=2, sort_keys=True, ensure_ascii=False).encode("utf-8") + b"\n")
    if result["status"] == "PASS":
        print(
            f"PASS packages={result['graph']['package_count']} graph_sha256={result['graph']['sha256']}"
        )
        return 0
    stream = sys.stderr
    print(
        f"{result['status']} packages={result['graph']['package_count']} "
        f"graph_sha256={result['graph']['sha256']} result={result_path}",
        file=stream,
    )
    for reason in result["blocked_reasons"] + result["degraded_reasons"]:
        print(f"- {reason}", file=stream)
    return 1 if result["status"] == "BLOCKED" else 2


if __name__ == "__main__":
    raise SystemExit(main())
