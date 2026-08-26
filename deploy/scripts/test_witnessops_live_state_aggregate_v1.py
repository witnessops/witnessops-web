#!/usr/bin/env python3

from __future__ import annotations

import contextlib
import hashlib
import io
import json
import os
import struct
import tempfile
import unittest
from pathlib import Path
from unittest import mock

import witnessops_live_state_aggregate_v1 as aggregate


class LiveStateAggregateTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(os.path.realpath(self.temporary.name))

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def spec(self, record_format: str = "json-document") -> aggregate.RootSpec:
        return aggregate.RootSpec("fixture", str(self.root), record_format)

    @staticmethod
    def expected(entries: list[tuple[bytes, bytes]]) -> str:
        digest = hashlib.sha256()
        for relative, payload in sorted(entries):
            digest.update(struct.pack(">Q", len(relative)))
            digest.update(relative)
            digest.update(struct.pack(">Q", len(payload)))
            digest.update(hashlib.sha256(payload).digest())
        return digest.hexdigest()

    def write(self, relative: str, payload: bytes) -> None:
        target = self.root / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(payload)

    def test_exact_production_contract_has_no_path_override(self) -> None:
        self.assertEqual(
            [(spec.label, spec.path, spec.record_format) for spec in aggregate.ROOT_SPECS],
            [
                ("intake-store", "/srv/witnessops-web/intake-store", "json-document"),
                ("intake-events", "/srv/witnessops-web/intake-events", "json-lines"),
                ("mail-out", "/srv/witnessops-web/mail-out", "json-document"),
            ],
        )
        stderr = io.StringIO()
        with contextlib.redirect_stderr(stderr):
            self.assertEqual(aggregate.main(["--root", "/tmp"]), 2)
        self.assertEqual(stderr.getvalue(), "live-state aggregate failed: unsupported-argument\n")

    def test_path_bound_digest_is_deterministic(self) -> None:
        first = b'{"value":1}\n'
        second = b'{"value":2}\n'
        self.write("nested/b.json", second)
        self.write("a.json", first)
        result = aggregate.observe_root(self.spec())
        expected = self.expected([(b"a.json", first), (b"nested/b.json", second)])
        self.assertEqual(result["path_bound_sha256"], expected)
        self.assertEqual(result["files"], 2)
        self.assertEqual(result["bytes"], len(first) + len(second))

    def test_rename_changes_the_path_bound_digest(self) -> None:
        payload = b'{"value":1}\n'
        self.write("before.json", payload)
        before = aggregate.observe_root(self.spec())["path_bound_sha256"]
        (self.root / "before.json").rename(self.root / "after.json")
        after = aggregate.observe_root(self.spec())["path_bound_sha256"]
        self.assertNotEqual(before, after)

    def test_empty_root_is_sha256_of_empty_stream(self) -> None:
        result = aggregate.observe_root(self.spec())
        self.assertEqual(result["path_bound_sha256"], hashlib.sha256(b"").hexdigest())
        self.assertEqual(result["files"], 0)
        self.assertIsNone(result["min_mtime_ns"])
        self.assertIsNone(result["max_mtime_ns"])

    def test_json_document_and_json_lines_validation(self) -> None:
        self.write("valid.json", b'{"ok":true}\n')
        self.assertEqual(aggregate.observe_root(self.spec())["invalid_records"], 0)

        self.root.joinpath("valid.json").write_bytes(b'{"broken":')
        with self.assertRaisesRegex(aggregate.ObservationError, "invalid-json"):
            aggregate.observe_root(self.spec())

        self.root.joinpath("valid.json").write_bytes(b'{"first":1}\n\n{"second":2}\n')
        self.assertEqual(aggregate.observe_root(self.spec("json-lines"))["invalid_records"], 0)
        self.root.joinpath("valid.json").write_bytes(b'{"first":1}\nnot-json\n')
        with self.assertRaisesRegex(aggregate.ObservationError, "invalid-json"):
            aggregate.observe_root(self.spec("json-lines"))

    def test_nonstandard_constants_and_jsonl_framing_fail_closed(self) -> None:
        for payload in (b"NaN", b"Infinity", b'{"value":NaN}'):
            self.root.joinpath("record.json").write_bytes(payload)
            with self.assertRaisesRegex(aggregate.ObservationError, "invalid-json"):
                aggregate.observe_root(self.spec())

        for payload in (
            b'{"first":1}\v{"second":2}\n',
            b'{"first":1}\f{"second":2}\n',
            b'{"first":1}\r{"second":2}\n',
        ):
            self.root.joinpath("record.json").write_bytes(payload)
            with self.assertRaisesRegex(aggregate.ObservationError, "invalid-json"):
                aggregate.observe_root(self.spec("json-lines"))

        huge_integer = b"1" * 5_000
        self.root.joinpath("record.json").write_bytes(huge_integer)
        with self.assertRaisesRegex(aggregate.ObservationError, "invalid-json"):
            aggregate.observe_root(self.spec())

    def test_invalid_utf8_fails_without_emitting_payload(self) -> None:
        self.write("private-record.json", b"\xff\xfe")
        with self.assertRaisesRegex(aggregate.ObservationError, "invalid-utf8"):
            aggregate.observe_root(self.spec())

    def test_symlink_and_fifo_are_unsupported(self) -> None:
        self.write("target.json", b"{}")
        os.symlink(self.root / "target.json", self.root / "link.json")
        with self.assertRaisesRegex(aggregate.ObservationError, "unsupported-object"):
            aggregate.observe_root(self.spec())
        (self.root / "link.json").unlink()
        os.mkfifo(self.root / "pipe")
        with self.assertRaisesRegex(aggregate.ObservationError, "unsupported-object"):
            aggregate.observe_root(self.spec())

    def test_symlinked_ancestor_is_not_an_exact_root(self) -> None:
        real_parent = self.root / "real-parent"
        real_root = real_parent / "root"
        real_root.mkdir(parents=True)
        alias_parent = self.root / "alias-parent"
        os.symlink(real_parent, alias_parent)
        with self.assertRaisesRegex(aggregate.ObservationError, "root-unavailable"):
            aggregate.observe_root(
                aggregate.RootSpec("fixture", str(alias_parent / "root"), "json-document")
            )

    def test_resource_bounds_fail_before_unbounded_collection(self) -> None:
        self.write("one.json", b"{}")
        self.write("two.json", b"{}")
        with mock.patch.object(aggregate, "MAX_FILES", 1):
            with self.assertRaisesRegex(aggregate.ObservationError, "file-count-limit-exceeded"):
                aggregate.observe_root(self.spec())
        with mock.patch.object(aggregate, "MAX_TOTAL_BYTES", 3):
            with self.assertRaisesRegex(aggregate.ObservationError, "total-byte-limit-exceeded"):
                aggregate.observe_root(self.spec())

    def test_final_file_revalidation_rejects_a_mixed_time_aggregate(self) -> None:
        self.write("record.json", b'{"value":1}')
        original = aggregate._read_regular_file_at
        changed = False

        def mutate_after_read(*args: object, **kwargs: object) -> tuple[int, int, str]:
            nonlocal changed
            result = original(*args, **kwargs)
            if not changed:
                changed = True
                self.root.joinpath("record.json").write_bytes(b'{"value":2}')
            return result

        with mock.patch.object(aggregate, "_read_regular_file_at", side_effect=mutate_after_read):
            with self.assertRaisesRegex(aggregate.ObservationError, "file-changed"):
                aggregate.observe_root(self.spec())

    def test_output_shape_contains_no_paths_or_record_values(self) -> None:
        self.write("private-customer-name.json", b'{"secret_field":"private-value"}')
        result = aggregate.observe_root(self.spec())
        encoded = json.dumps(result, sort_keys=True)
        self.assertEqual(
            set(result),
            {
                "label",
                "files",
                "bytes",
                "min_mtime_ns",
                "max_mtime_ns",
                "path_bound_sha256",
                "invalid_records",
            },
        )
        self.assertNotIn("private-customer-name", encoded)
        self.assertNotIn("private-value", encoded)


if __name__ == "__main__":
    unittest.main()
