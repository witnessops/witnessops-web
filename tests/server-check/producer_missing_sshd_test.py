"""Regression: absent sshd must leave SSH unknown without aborting collection."""
from __future__ import annotations

import argparse
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from witnessops_local_audit import collector, operator


class MissingSshdTest(unittest.TestCase):
    def setUp(self):
        self.authority = {
            "operator_id": "operator-test",
            "authority_source": {"operator_declaration": {"expected_ssh_exposure": "none"}},
            "target": {"asset_id": "test-asset", "expected_listeners": []},
        }

    def test_capture_continues_and_keeps_ssh_unknown(self):
        commands = []
        expected_ssh = []

        def which(name, path=None):
            if name == "sshd":
                return None
            return f"/test-bin/{name}"

        def read_only(argv):
            commands.append(argv[0])
            if argv[0] == "sshd":
                return {"argv": argv, "status": "unavailable", "returncode": None, "stdout": "", "stderr": ""}
            return {"argv": argv, "status": "captured", "returncode": 0, "stdout": "", "stderr": ""}

        def capture_product(**kwargs):
            expected_ssh.append(kwargs["authority"]["authority_source"]["operator_declaration"]["expected_ssh_exposure"])
            ssh, ssh_evidence = collector._ssh_posture("fixture-host")
            self.assertEqual(ssh["status"], "unknown")
            self.assertEqual(ssh["permit_root_login"], "unknown")
            self.assertEqual(ssh["password_authentication"], "unknown")
            self.assertEqual(ssh["pubkey_authentication"], "unknown")
            self.assertFalse(ssh["effective_configuration"])
            self.assertEqual(ssh_evidence["status"], "unavailable")
            firewall, _ = collector._firewall_posture()
            listeners, _ = collector._listener_posture([])
            services, _ = collector._service_posture()
            self.assertIn(firewall["status"], {"unknown", "inactive", "active"})
            self.assertEqual(listeners["status"], "observed")
            self.assertEqual(services["status"], "observed")
            self.assertIn("ss", commands)
            self.assertIn("systemctl", commands)
            return b"synthetic-capture-bytes"

        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp)
            args = argparse.Namespace(live_approved=True, authority="/unused", operator_id="operator-test", output=temp)
            def write_capture(destination, data):
                destination.write_bytes(data)
                return "a" * 64

            with patch.object(operator, "_runtime_dependencies"), patch.object(operator, "_runtime"), \
                 patch.object(operator, "_json", return_value=self.authority), \
                 patch.object(operator, "observed_hostname", return_value="fixture-host"), \
                 patch.object(operator, "evaluate_authority", return_value={"decision": "ADMIT"}), \
                 patch.object(operator, "_directory", return_value=output), \
                 patch.object(operator.shutil, "which", side_effect=which), \
                 patch.object(operator.shutil, "disk_usage", return_value=SimpleNamespace(free=64 * 1024 * 1024)), \
                 patch("witnessops_local_audit.collector.run_read_only_command", side_effect=read_only), \
                 patch("witnessops_local_audit.package.capture_product", side_effect=capture_product), \
                 patch("witnessops_local_audit.capture.write_capture", side_effect=write_capture):
                self.assertEqual(operator.command_capture(args), 0)

            self.assertEqual(expected_ssh, ["none"])
            self.assertTrue((output / "capture.json").is_file())
            self.assertIn("sshd", commands)
            self.assertIn("ufw", commands)


if __name__ == "__main__":
    unittest.main()
