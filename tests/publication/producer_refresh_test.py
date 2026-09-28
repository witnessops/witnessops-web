"""The accepted producer refresh must be deterministic and narrowly scoped."""
import importlib.util
import io
import json
from pathlib import Path
import tarfile
import unittest


ROOT = Path(__file__).resolve().parents[1] / "server-check/producer"
SPEC = importlib.util.spec_from_file_location("producer_refresh", ROOT / "refresh.py")
assert SPEC and SPEC.loader
refresh = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(refresh)


class ProducerRefreshTest(unittest.TestCase):
    def test_refresh_is_deterministic_and_binds_archive_to_source_identity(self):
        identity = json.loads((ROOT / "identity.json").read_text(encoding="utf-8"))
        archive = (ROOT / "local-audit-1.2.2.tar.gz").read_bytes()
        refreshed_identity, refreshed_archive = refresh.refresh(identity, archive)
        repeated_identity, repeated_archive = refresh.refresh(refreshed_identity, refreshed_archive)
        self.assertEqual(refreshed_identity, repeated_identity)
        self.assertEqual(refreshed_archive, repeated_archive)
        self.assertEqual(refreshed_identity["refresh"]["id"], refresh.REFRESH_ID)
        with tarfile.open(fileobj=io.BytesIO(refreshed_archive), mode="r:gz") as bundle:
            files = {member.name: bundle.extractfile(member).read() for member in bundle.getmembers()}
        operator_source = files["src/witnessops_local_audit/operator.py"]
        collector_source = files["src/witnessops_local_audit/collector.py"]
        self.assertIn(refresh.REFRESHED_REQUIRED, operator_source)
        self.assertNotIn(refresh.BASE_REQUIRED, operator_source)
        self.assertIn(b'["sshd", "-T", "-C"', collector_source)
        self.assertEqual(refresh.fingerprint(files), refreshed_identity["collectorFingerprint"])

    def test_refresh_refuses_unreviewed_source_or_identity_drift(self):
        identity = json.loads((ROOT / "identity.json").read_text(encoding="utf-8"))
        archive = (ROOT / "local-audit-1.2.2.tar.gz").read_bytes()
        altered = dict(identity)
        altered["refresh"] = {"id": "other-change"}
        with self.assertRaisesRegex(ValueError, "unexpected or source drifted"):
            refresh.refresh(altered, archive)
        with self.assertRaisesRegex(ValueError, "hash does not match"):
            refresh.refresh(identity, archive + b"changed")


if __name__ == "__main__":
    unittest.main()
