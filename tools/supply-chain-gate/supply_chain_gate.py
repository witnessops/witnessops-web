#!/usr/bin/env python3
"""Deterministic, non-executing dependency admission gate for WitnessOps.

The gate reads manifests, lockfiles, public advisory metadata, and static npm
package metadata. It never imports or executes package code.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
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

Pair = tuple[str, str]
ResolutionMap = dict[Pair, tuple[str, ...]]


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


def unsupported_dependency_sources(repo: Path) -> list[dict[str, str]]:
    records: list[dict[str, str]] = []
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
                if dependency_spec_is_unsupported(spec):
                    records.append(
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
            records.append(
                {
                    "manifest": relative,
                    "dependency_field": "pnpm.patchedDependencies",
                    "package": package,
                    "specifier_sha256": source_sha256(patch_path),
                }
            )
    return sorted(
        records,
        key=lambda item: (
            item["manifest"],
            item["dependency_field"],
            item["package"],
        ),
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


def parse_pnpm_lock(data: bytes, label: str = "pnpm-lock.yaml") -> set[Pair]:
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise GateError(f"{label}: lockfile is not UTF-8") from exc

    if any(
        re.match(r"^['\"]?patchedDependencies['\"]?\s*:", line)
        for line in text.splitlines()
    ) or "patch_hash=" in text:
        raise unsupported_pnpm_patch(label, text)

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
        pair = split_package_key(package_key)
        if pair is None:
            raise unsupported_source(f"{label}: pnpm package entry", package_key)
        pairs.add(pair)

    if not saw_packages:
        raise GateError(f"{label}: missing packages section")
    validate_pnpm_resolution_sources(data, label)
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


def parse_lockfile_bytes(path: str | Path, data: bytes) -> set[Pair]:
    name = Path(path).name
    if name == "pnpm-lock.yaml":
        return parse_pnpm_lock(data, str(path))
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
        match = re.search(
            rf"(?:^|,)\s*['\"]?{key}['\"]?\s*:\s*"
            rf"(\"(?:\\.|[^\"])*\"|'(?:''|[^'])*'|[^,}}]+)",
            content,
        )
        if match:
            fields[key] = decode_yaml_scalar(match.group(1))
    return fields


def validate_pnpm_resolution_fields(fields: Mapping[str, str], label: str) -> None:
    unsupported = {key: fields[key] for key in ("type", "repo", "commit", "path") if key in fields}
    if unsupported:
        raise unsupported_source(label, canonical_json_bytes(unsupported).decode("utf-8"))
    tarball = fields.get("tarball")
    if tarball:
        validate_registry_tarball_source(tarball, label)


def validate_pnpm_resolution_sources(data: bytes, label: str) -> None:
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise GateError(f"{label}: lockfile is not UTF-8") from exc

    section = ""
    in_resolution = False
    for line in text.splitlines():
        top = re.match(r"^([A-Za-z][A-Za-z0-9_-]*):\s*$", line)
        if top:
            section = top.group(1)
            in_resolution = False
            continue
        if section != "packages":
            continue
        if re.match(r"^  \S.*:\s*$", line):
            in_resolution = False
            continue
        resolution = re.match(r"^    resolution:\s*(.*)$", line)
        if resolution:
            fields = parse_inline_resolution(resolution.group(1))
            validate_pnpm_resolution_fields(fields, f"{label}: pnpm resolution")
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
                )
            elif line and len(line) - len(line.lstrip()) <= 4:
                in_resolution = False


def parse_pnpm_resolution_map(data: bytes, label: str = "pnpm-lock.yaml") -> ResolutionMap:
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise GateError(f"{label}: lockfile is not UTF-8") from exc

    pairs = parse_pnpm_lock(data, label)
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
            current_pair = split_package_key(decode_yaml_scalar(entry.group(1)))
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


def parse_lockfile_resolution_map(path: str | Path, data: bytes) -> ResolutionMap:
    name = Path(path).name
    if name == "pnpm-lock.yaml":
        return parse_pnpm_resolution_map(data, str(path))
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


def base_graph(repo: Path, base_ref: str | None, lockfiles: Sequence[Path]) -> set[Pair]:
    if not base_ref:
        return set()
    pairs: set[Pair] = set()
    for lockfile in lockfiles:
        relative = repository_relative_path(repo, lockfile, "lockfile")
        data = git_blob(repo, base_ref, relative)
        if data is None:
            continue
        pairs.update(parse_lockfile_bytes(relative, data))
    return pairs


def compare_lockfile_resolutions(
    repo: Path, base_ref: str | None, lockfiles: Sequence[Path]
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
        base_resolutions = parse_lockfile_resolution_map(relative, base_data)
        current_resolutions = parse_lockfile_resolution_map(relative, current_data)
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
    commit_sha = "UNKNOWN"
    unsupported_sources: list[dict[str, str]] = []

    try:
        commit_sha = run_git(repo, ["rev-parse", "HEAD"]).strip()
        unsupported_sources = unsupported_dependency_sources(repo)
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
        for lockfile in lockfiles:
            if not lockfile.is_file():
                raise GateError(f"missing lockfile: {lockfile}")
            relative = repository_relative_path(repo, lockfile, "lockfile")
            try:
                pairs = parse_lockfile_bytes(relative, lockfile.read_bytes())
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
                new_pairs = sorted(graph - base_graph(repo, args.base_ref, lockfiles))
                resolution_changes, resolution_changed_pairs = compare_lockfile_resolutions(
                    repo, args.base_ref, lockfiles
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
        lifecycle_pairs = sorted(introduced_pair_set | rejected_review_pairs)
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
