"""Cross-component acceptance for a retained failed attempt and launcher upgrade."""
from __future__ import annotations

import os
import unittest

from test_install_local_audit_1_2_2 import LocalAuditInstallerTest
from test_wops_sudo_launcher import SudoLauncherTest


class WorkstationUpgradeAcceptanceTest(unittest.TestCase):
    def test_retained_attempt_survives_runtime_upgrade_and_launcher_stays_bounded(self):
        if os.geteuid() != 0:
            self.skipTest("fixture acceptance creates root-owned runtime and launcher paths")
        # This fixture has the same journal shape as a failed, authorized run:
        # authority.json and pending.json exist; capture.json does not.
        LocalAuditInstallerTest().test_upgrade_swaps_only_runtime_and_preserves_retained_failed_attempt_bytes()
        # This invokes only a fake Node binary with `server check --help`; no
        # installed CLI, collector, API client, or collection path is run.
        SudoLauncherTest().test_fixed_launcher_runs_under_sudo_like_restricted_path()
        # Root CI also proves that ordinary auth commands dispatch through the
        # user PATH under an unprivileged UID, separate from the root launcher.
        if os.geteuid() == 0:
            SudoLauncherTest().test_normal_cli_keeps_the_users_node_path()


if __name__ == "__main__":
    unittest.main()
