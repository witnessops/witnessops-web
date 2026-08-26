#!/usr/bin/env python3
"""Deterministic, path-bound metadata for the three WitnessOps live-state roots."""

from __future__ import annotations

import hashlib
import json
import os
import stat
import struct
import sys
from dataclasses import dataclass
from decimal import Decimal


HELPER_VERSION = "1.1.1"
MAX_FILE_BYTES = 4 * 1024 * 1024
MAX_TOTAL_BYTES = 128 * 1024 * 1024
MAX_FILES = 10_000
MAX_DIRECTORIES = 2_048
MAX_ENTRIES_PER_DIRECTORY = 10_000
MAX_DEPTH = 64
MAX_RELATIVE_PATH_BYTES = 4_096
READ_CHUNK_BYTES = 1024 * 1024
MAX_JSON_INTEGER_DIGITS = 1_024
MAX_JSON_FLOAT_CHARACTERS = 4_096


@dataclass(frozen=True)
class RootSpec:
    label: str
    path: str
    record_format: str


@dataclass(frozen=True)
class DirectoryObservation:
    components: tuple[bytes, ...]
    metadata: os.stat_result


@dataclass(frozen=True)
class FileObservation:
    relative: bytes
    components: tuple[bytes, ...]
    metadata: os.stat_result
    size: int
    mtime_ns: int
    sha256: str


ROOT_SPECS = (
    RootSpec("intake-store", "/srv/witnessops-web/intake-store", "json-document"),
    RootSpec("intake-events", "/srv/witnessops-web/intake-events", "json-lines"),
    RootSpec("mail-out", "/srv/witnessops-web/mail-out", "raw-artifact"),
)


class ObservationError(Exception):
    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


def _fail(code: str) -> None:
    raise ObservationError(code)


def _same_stat(left: os.stat_result, right: os.stat_result) -> bool:
    return (
        left.st_dev == right.st_dev
        and left.st_ino == right.st_ino
        and left.st_mode == right.st_mode
        and left.st_size == right.st_size
        and left.st_mtime_ns == right.st_mtime_ns
        and left.st_ctime_ns == right.st_ctime_ns
    )


def _directory_flags() -> int:
    if not hasattr(os, "O_DIRECTORY") or not hasattr(os, "O_NOFOLLOW"):
        _fail("platform-missing-no-follow")
    flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW
    if hasattr(os, "O_CLOEXEC"):
        flags |= os.O_CLOEXEC
    if hasattr(os, "O_NONBLOCK"):
        flags |= os.O_NONBLOCK
    return flags


def _file_flags() -> int:
    if not hasattr(os, "O_NOFOLLOW"):
        _fail("platform-missing-no-follow")
    flags = os.O_RDONLY | os.O_NOFOLLOW
    if hasattr(os, "O_CLOEXEC"):
        flags |= os.O_CLOEXEC
    if hasattr(os, "O_NONBLOCK"):
        flags |= os.O_NONBLOCK
    return flags


def _safe_component(name: bytes) -> None:
    if not name or name in (b".", b"..") or b"/" in name or b"\x00" in name:
        _fail("path-traversal")


def _open_absolute_directory(path_value: str) -> int:
    encoded = os.fsencode(path_value)
    if not encoded.startswith(b"/") or encoded == b"/" or os.path.normpath(encoded) != encoded:
        _fail("root-path-invalid")
    components = tuple(component for component in encoded.split(b"/") if component)
    for component in components:
        _safe_component(component)

    try:
        descriptor = os.open(b"/", _directory_flags())
    except OSError:
        _fail("root-unavailable")
    try:
        for component in components:
            try:
                next_descriptor = os.open(component, _directory_flags(), dir_fd=descriptor)
            except OSError:
                _fail("root-unavailable")
            os.close(descriptor)
            descriptor = next_descriptor
        metadata = os.fstat(descriptor)
        if not stat.S_ISDIR(metadata.st_mode):
            _fail("root-not-directory")
        return descriptor
    except BaseException:
        os.close(descriptor)
        raise


def _open_relative_directory(root_descriptor: int, components: tuple[bytes, ...]) -> int:
    descriptor = os.dup(root_descriptor)
    try:
        for component in components:
            _safe_component(component)
            try:
                next_descriptor = os.open(component, _directory_flags(), dir_fd=descriptor)
            except OSError:
                _fail("directory-changed")
            os.close(descriptor)
            descriptor = next_descriptor
        return descriptor
    except BaseException:
        os.close(descriptor)
        raise


def _relative_path(components: tuple[bytes, ...]) -> bytes:
    relative = b"/".join(components)
    if not relative or len(relative) > MAX_RELATIVE_PATH_BYTES:
        _fail("path-limit-exceeded")
    return relative


def _reject_json_constant(_value: str) -> None:
    raise ValueError("non-standard JSON constant")


def _parse_json_integer(value: str) -> int:
    digits = value[1:] if value.startswith("-") else value
    if len(digits) > MAX_JSON_INTEGER_DIGITS:
        raise ValueError("JSON integer limit exceeded")
    return int(value)


def _parse_json_float(value: str) -> Decimal:
    if len(value) > MAX_JSON_FLOAT_CHARACTERS:
        raise ValueError("JSON float limit exceeded")
    return Decimal(value)


def _parse_json(text: str) -> None:
    json.loads(
        text,
        parse_constant=_reject_json_constant,
        parse_float=_parse_json_float,
        parse_int=_parse_json_integer,
    )


def _validate_records(payload: bytes, record_format: str) -> None:
    if record_format != "raw-artifact":
        try:
            text = payload.decode("utf-8")
        except UnicodeDecodeError:
            _fail("invalid-utf8")

        try:
            if record_format == "json-document":
                _parse_json(text)
            elif record_format == "json-lines":
                for raw_line in text.split("\n"):
                    line = raw_line[:-1] if raw_line.endswith("\r") else raw_line
                    if "\r" in line:
                        _fail("invalid-json-framing")
                    if line.strip(" \t"):
                        _parse_json(line)
            else:
                _fail("unknown-record-format")
        except (json.JSONDecodeError, OverflowError, RecursionError, ValueError):
            _fail("invalid-json")


def _child_stat(directory_descriptor: int, name: bytes) -> os.stat_result:
    try:
        return os.stat(name, dir_fd=directory_descriptor, follow_symlinks=False)
    except OSError:
        _fail("filesystem-read-failed")


def _read_regular_file_at(
    directory_descriptor: int,
    name: bytes,
    before: os.stat_result,
    record_format: str,
) -> tuple[int, int, str]:
    if not stat.S_ISREG(before.st_mode) or stat.S_ISLNK(before.st_mode):
        _fail("unsupported-object")
    if before.st_size < 0 or before.st_size > MAX_FILE_BYTES:
        _fail("file-limit-exceeded")

    try:
        descriptor = os.open(name, _file_flags(), dir_fd=directory_descriptor)
    except OSError:
        _fail("filesystem-read-failed")
    try:
        opened = os.fstat(descriptor)
        if not stat.S_ISREG(opened.st_mode) or not _same_stat(before, opened):
            _fail("file-changed")
        payload = bytearray()
        digest = hashlib.sha256()
        total = 0
        while True:
            chunk = os.read(descriptor, READ_CHUNK_BYTES)
            if not chunk:
                break
            total += len(chunk)
            if total > MAX_FILE_BYTES:
                _fail("file-limit-exceeded")
            digest.update(chunk)
            payload.extend(chunk)
        after_read = os.fstat(descriptor)
    except OSError:
        _fail("filesystem-read-failed")
    finally:
        os.close(descriptor)

    after_path = _child_stat(directory_descriptor, name)
    if total != before.st_size or not _same_stat(before, after_read) or not _same_stat(before, after_path):
        _fail("file-changed")
    _validate_records(bytes(payload), record_format)
    return total, before.st_mtime_ns, digest.hexdigest()


def _scan_directory(
    descriptor: int,
    components: tuple[bytes, ...],
    depth: int,
    record_format: str,
    files: list[FileObservation],
    directories: list[DirectoryObservation],
    totals: dict[str, int],
) -> None:
    if depth > MAX_DEPTH:
        _fail("depth-limit-exceeded")
    current = os.fstat(descriptor)
    if not stat.S_ISDIR(current.st_mode):
        _fail("directory-changed")
    totals["directories"] += 1
    if totals["directories"] > MAX_DIRECTORIES:
        _fail("directory-limit-exceeded")
    directories.append(DirectoryObservation(components, current))

    names: list[bytes] = []
    try:
        with os.scandir(descriptor) as iterator:
            for entry in iterator:
                name = os.fsencode(entry.name)
                _safe_component(name)
                names.append(name)
                if len(names) > MAX_ENTRIES_PER_DIRECTORY:
                    _fail("directory-entry-limit-exceeded")
    except OSError:
        _fail("filesystem-read-failed")

    for name in sorted(names):
        before = _child_stat(descriptor, name)
        child_components = components + (name,)
        _relative_path(child_components)
        if stat.S_ISLNK(before.st_mode):
            _fail("unsupported-object")
        if stat.S_ISDIR(before.st_mode):
            try:
                child_descriptor = os.open(name, _directory_flags(), dir_fd=descriptor)
            except OSError:
                _fail("directory-changed")
            try:
                if not _same_stat(before, os.fstat(child_descriptor)):
                    _fail("directory-changed")
                _scan_directory(
                    child_descriptor,
                    child_components,
                    depth + 1,
                    record_format,
                    files,
                    directories,
                    totals,
                )
            finally:
                os.close(child_descriptor)
            continue
        if not stat.S_ISREG(before.st_mode):
            _fail("unsupported-object")

        totals["files"] += 1
        if totals["files"] > MAX_FILES:
            _fail("file-count-limit-exceeded")
        if before.st_size < 0 or totals["bytes"] + before.st_size > MAX_TOTAL_BYTES:
            _fail("total-byte-limit-exceeded")
        size, mtime_ns, file_sha256 = _read_regular_file_at(
            descriptor,
            name,
            before,
            record_format,
        )
        totals["bytes"] += size
        files.append(
            FileObservation(
                _relative_path(child_components),
                child_components,
                before,
                size,
                mtime_ns,
                file_sha256,
            )
        )


def _revalidate_directory(root_descriptor: int, observation: DirectoryObservation) -> None:
    descriptor = _open_relative_directory(root_descriptor, observation.components)
    try:
        if not _same_stat(observation.metadata, os.fstat(descriptor)):
            _fail("directory-changed")
    finally:
        os.close(descriptor)


def _revalidate_file(root_descriptor: int, observation: FileObservation) -> None:
    parent_descriptor = _open_relative_directory(root_descriptor, observation.components[:-1])
    try:
        name = observation.components[-1]
        path_metadata = _child_stat(parent_descriptor, name)
        try:
            descriptor = os.open(name, _file_flags(), dir_fd=parent_descriptor)
        except OSError:
            _fail("file-changed")
        try:
            opened = os.fstat(descriptor)
            if not _same_stat(observation.metadata, opened) or not _same_stat(
                observation.metadata,
                path_metadata,
            ):
                _fail("file-changed")
        finally:
            os.close(descriptor)
    finally:
        os.close(parent_descriptor)


def observe_root(spec: RootSpec) -> dict[str, object]:
    root_descriptor = _open_absolute_directory(spec.path)
    try:
        root_metadata = os.fstat(root_descriptor)
        files: list[FileObservation] = []
        directories: list[DirectoryObservation] = []
        totals = {"files": 0, "directories": 0, "bytes": 0}
        _scan_directory(
            root_descriptor,
            (),
            0,
            spec.record_format,
            files,
            directories,
            totals,
        )
        files.sort(key=lambda observation: observation.relative)

        for observation in files:
            _revalidate_file(root_descriptor, observation)
        for observation in directories:
            _revalidate_directory(root_descriptor, observation)

        final_root_descriptor = _open_absolute_directory(spec.path)
        try:
            if not _same_stat(root_metadata, os.fstat(final_root_descriptor)):
                _fail("root-changed")
        finally:
            os.close(final_root_descriptor)

        aggregate = hashlib.sha256()
        mtimes: list[int] = []
        for observation in files:
            aggregate.update(struct.pack(">Q", len(observation.relative)))
            aggregate.update(observation.relative)
            aggregate.update(struct.pack(">Q", observation.size))
            aggregate.update(bytes.fromhex(observation.sha256))
            mtimes.append(observation.mtime_ns)

        return {
            "label": spec.label,
            "files": totals["files"],
            "bytes": totals["bytes"],
            "min_mtime_ns": min(mtimes) if mtimes else None,
            "max_mtime_ns": max(mtimes) if mtimes else None,
            "path_bound_sha256": aggregate.hexdigest(),
            "invalid_records": 0,
        }
    finally:
        os.close(root_descriptor)


def collect() -> list[dict[str, object]]:
    return [observe_root(spec) for spec in ROOT_SPECS]


def main(argv: list[str]) -> int:
    if argv == ["--version"]:
        print(HELPER_VERSION)
        return 0
    if argv:
        print("live-state aggregate failed: unsupported-argument", file=sys.stderr)
        return 2
    try:
        results = collect()
    except ObservationError as error:
        print(f"live-state aggregate failed: {error.code}", file=sys.stderr)
        return 1
    for result in results:
        print(json.dumps(result, sort_keys=True, separators=(",", ":")))
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
