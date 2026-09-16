"""Canary admission contracts and local, inert rejection tests.

Execute the workflow's actual pre-install shell and PR3 Python guard in a
fixture Git checkout. pnpm installation and signing are marker-only stubs.
Job dependencies are checked statically; this is not an Actions scheduler,
conformance-suite, vulnerability-intelligence or signing integration test.
"""
from __future__ import annotations

import hashlib
import os
from pathlib import Path
import re
import shutil
import subprocess
import tempfile
import textwrap
import unittest


ROOT = Path(__file__).resolve().parents[3]
WORKFLOW = ROOT / ".github/workflows/canary-receipt-emit.yml"
GUARD = ROOT / "tools/supply-chain-gate/verify_install_admission.py"
ADMISSION_STEP = "Verify dependency admission before package tooling"
INSTALL_STEP = "Install dependencies from the frozen lockfile"
ZERO_SHA = "0" * 40
BASE_EXPRESSION = (
    "${{ github.event_name == 'push' && github.event.before != '"
    + ZERO_SHA
    + "' && github.event.before || github.event_name == 'workflow_dispatch' "
    "&& format('{0}^', github.sha) || 'MISSING_REQUIRED_COMPARISON_BASE' }}"
)


def job(text: str, name: str) -> str:
    marker = f"\n  {name}:\n"
    if marker not in text:
        raise AssertionError(f"missing job {name}")
    body = text.split(marker, 1)[1]
    return re.split(r"\n  [A-Za-z_][A-Za-z0-9_-]*:\n", body, maxsplit=1)[0]


def step(body: str, name: str) -> str:
    marker = f"      - name: {name}\n"
    if marker not in body:
        raise AssertionError(f"missing step {name}")
    return marker + re.split(r"\n      - ", body.split(marker, 1)[1], maxsplit=1)[0]


def script(body: str) -> str:
    if "        run: |\n" in body:
        return textwrap.dedent(body.split("        run: |\n", 1)[1]).strip() + "\n"
    match = re.search(r"^        run: (.+)$", body, re.MULTILINE)
    if match is None:
        raise AssertionError("missing run command")
    return match.group(1) + "\n"


class CanaryAdmissionContractTests(unittest.TestCase):
    def setUp(self) -> None:
        self.workflow = WORKFLOW.read_text(encoding="utf-8")
        self.verify = job(self.workflow, "verify-conformance")
        self.emit = job(self.workflow, "emit-receipt")

    def test_dependency_chain_has_no_failure_bypass(self) -> None:
        gate = job(self.workflow, "supply_chain_gate")
        self.assertIn("uses: ./.github/workflows/supply-chain-gate.yml", gate)
        self.assertIn("    needs: supply_chain_gate\n", self.verify)
        self.assertIn("    needs: verify-conformance\n", self.emit)
        for section in (gate, self.verify, self.emit):
            self.assertNotRegex(section, r"(?m)^    (?:if|continue-on-error):")
            self.assertNotIn("continue-on-error:", section)
            self.assertNotIn("always()", section)
            self.assertNotIn("failure()", section)
            self.assertNotIn("cancelled()", section)
        self.assertNotRegex(self.verify, r"(?m)^        if:")

    def test_gate_and_conformance_remain_low_authority(self) -> None:
        for section in (job(self.workflow, "supply_chain_gate"), self.verify):
            self.assertIn("    permissions:\n      contents: read\n", section)
            self.assertNotRegex(section, r"(?m)^\s+(?:id-token|packages|environment):")
            self.assertNotIn("secrets:", section)
            self.assertNotIn("${{ secrets.", section)
        self.assertIn("      id-token: write\n", self.emit)
        self.assertNotIn("pnpm install", self.emit)

    def test_exact_checkout_and_guard_environment(self) -> None:
        checkout = step(self.verify, "Checkout")
        self.assertIn("          ref: ${{ github.sha }}\n", checkout)
        self.assertIn("          fetch-depth: 0\n", checkout)
        self.assertIn("          persist-credentials: false", checkout)
        admission = step(self.verify, ADMISSION_STEP)
        for key, expression in {
            "ADMISSION_RESULT": "needs.supply_chain_gate.result",
            "ADMISSION_STATUS": "needs.supply_chain_gate.outputs.status",
            "ADMITTED_SHA": "needs.supply_chain_gate.outputs.commit_sha",
            "EVENT_SHA": "github.sha",
            "ADMITTED_LOCK_SHA256": "needs.supply_chain_gate.outputs.lockfile_sha256",
            "EVENT_NAME": "github.event_name",
            "PUSH_BEFORE": "github.event.before",
        }.items():
            self.assertIn(f"          {key}: ${{{{ {expression} }}}}", admission)
        self.assertIn("        shell: bash\n", admission)
        self.assertIn("python3 -I tools/supply-chain-gate/verify_install_admission.py", script(admission))
        self.assertNotIn("${{", script(admission))

    def test_guard_precedes_package_tooling_and_cache(self) -> None:
        guard_position = self.verify.index(f"      - name: {ADMISSION_STEP}\n")
        for name in ("Set up pnpm", "Set up Node.js", INSTALL_STEP, "Prove governed verifier conformance"):
            self.assertLess(guard_position, self.verify.index(f"      - name: {name}\n"))
        prefix = self.verify[:guard_position]
        self.assertNotRegex(prefix, r"(?m)^\s+run:")
        self.assertNotRegex(prefix, r"(?m)^\s+cache:")
        self.assertEqual(script(step(self.verify, INSTALL_STEP)), "pnpm install --frozen-lockfile\n")

    def test_comparison_base_wiring_is_explicit_and_not_optional(self) -> None:
        gate = job(self.workflow, "supply_chain_gate")
        self.assertIn("      checkout_ref: ${{ github.sha }}\n", gate)
        self.assertIn(f"      base_ref: {BASE_EXPRESSION}\n", gate)
        admission = script(step(self.verify, ADMISSION_STEP))
        self.assertIn('comparison_base="${PUSH_BEFORE}"', admission)
        self.assertIn('comparison_base="${EVENT_SHA}^"', admission)
        self.assertIn('git cat-file -e "${comparison_base}^{commit}"', admission)
        self.assertLess(admission.index("git cat-file"), admission.index("verify_install_admission.py"))

    def test_existing_commands_names_and_signing_contract_remain(self) -> None:
        self.assertIn('  push:\n    branches: ["main"]\n  workflow_dispatch: {}\n', self.workflow)
        self.assertNotIn("pull_request:", self.workflow)
        self.assertIn("name: Verify governed verifier conformance without signing authority", self.verify)
        self.assertIn("name: Emit signed receipt for public proof surface manifest", self.emit)
        conformance = script(step(self.verify, "Prove governed verifier conformance"))
        for command in (
            "pnpm verify:skill-contract",
            "sha256sum -c MANIFEST.sha256",
            "node verify.mjs | tee /tmp/governed-agent-verifier-offline-verdict.json",
            "grep -F '\"verdict\": \"ARTIFACT_SET_CONSISTENT\"' /tmp/governed-agent-verifier-offline-verdict.json",
        ):
            self.assertIn(command, conformance)
        self.assertIn("source_revision: ${{ steps.bind-source.outputs.source_revision }}", self.verify)
        self.assertIn("VERIFIED_SOURCE_REVISION: ${{ needs.verify-conformance.outputs.source_revision }}", self.emit)
        self.assertIn('test "${VERIFIED_SOURCE_REVISION}" = "${GITHUB_SHA}"', self.emit)
        self.assertIn(r"canary-receipt-emit\\.yml@refs/heads/main$", self.emit)
        self.assertIn("          retention-days: 90\n", self.emit)
        for reference in re.findall(r"(?m)^\s*uses:\s+([^\s#]+)", self.workflow):
            if not reference.startswith("./"):
                self.assertRegex(reference, r"^[^@]+@[0-9a-f]{40}$")


class CanaryAdmissionExecutionTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory(prefix="canary-admission-test-")
        self.addCleanup(self.temp.cleanup)
        self.repo = Path(self.temp.name)
        self.bin = self.repo / "stub-bin"
        self.bin.mkdir()
        self.env = {
            "PATH": str(self.bin) + os.pathsep + os.environ.get("PATH", "/usr/bin:/bin"),
            "HOME": str(self.repo),
            "LC_ALL": "C",
            "GIT_CONFIG_NOSYSTEM": "1",
            "GIT_CONFIG_GLOBAL": os.devnull,
            "GIT_TERMINAL_PROMPT": "0",
        }
        target = self.repo / "tools/supply-chain-gate/verify_install_admission.py"
        target.parent.mkdir(parents=True)
        shutil.copyfile(GUARD, target)
        self.lock = self.repo / "pnpm-lock.yaml"
        self.lock.write_text("lockfileVersion: '9.0'\n", encoding="utf-8")
        self.git("init", "-q")
        self.git("add", "pnpm-lock.yaml", str(target.relative_to(self.repo)))
        self.commits = []
        for index in range(3):
            self.git("-c", "user.name=Canary fixture", "-c", "user.email=fixture@example.invalid",
                     "-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null",
                     "commit", "-q", "--allow-empty", "-m", f"fixture {index}")
            self.commits.append(self.git("rev-parse", "HEAD").strip())
        self.marker = self.repo / "stub-effects.log"
        for name, body in {
            "pnpm": '[ "$*" = "install --frozen-lockfile" ] || exit 90\nprintf "install-stub\\n" >> "$STUB_LOG"\n',
            "signing-stub": 'printf "signing-stub\\n" >> "$STUB_LOG"\n',
        }.items():
            path = self.bin / name
            path.write_text("#!/bin/sh\nset -eu\n" + body, encoding="utf-8")
            path.chmod(0o700)
        self.env.update({
            "ADMISSION_RESULT": "success",
            "ADMISSION_STATUS": "PASS",
            "ADMITTED_SHA": self.commits[-1],
            "EVENT_SHA": self.commits[-1],
            "ADMITTED_LOCK_SHA256": hashlib.sha256(self.lock.read_bytes()).hexdigest(),
            "EVENT_NAME": "push",
            "PUSH_BEFORE": self.commits[0],
            "CONFORMANCE_STUB_RESULT": "success",
            "STUB_LOG": str(self.marker),
        })
        verify = job(WORKFLOW.read_text(encoding="utf-8"), "verify-conformance")
        # Use the actual workflow shell and install command, never a copied guard.
        self.chain = script(step(verify, ADMISSION_STEP)) + script(step(verify, INSTALL_STEP))
        # Marker-only continuation models default success chaining. The real
        # cross-job dependency is tested structurally, not executed here.
        self.chain += 'test "${CONFORMANCE_STUB_RESULT}" = success\nsigning-stub\n'

    def git(self, *args: str) -> str:
        return subprocess.check_output(["git", *args], cwd=self.repo, env=self.env, text=True, stderr=subprocess.PIPE)

    def run_chain(self, changes: dict[str, str | None] | None = None) -> subprocess.CompletedProcess[str]:
        env = dict(self.env)
        for key, value in (changes or {}).items():
            if value is None:
                env.pop(key, None)
            else:
                env[key] = value
        self.marker.unlink(missing_ok=True)
        return subprocess.run(["bash", "--noprofile", "--norc", "-e", "-o", "pipefail", "-c", self.chain],
                              cwd=self.repo, env=env, text=True, capture_output=True, timeout=10)

    def reject(self, changes: dict[str, str | None] | None = None) -> None:
        result = self.run_chain(changes)
        self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertFalse(self.marker.exists(), "rejected admission reached an installation/signing stub")

    def test_push_uses_before_commit_for_complete_pushed_range(self) -> None:
        result = self.run_chain()
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn(f"Canary dependency comparison base: {self.commits[0]}\n", result.stdout)
        self.assertEqual(self.marker.read_text(), "install-stub\nsigning-stub\n")

    def test_manual_run_uses_exact_event_first_parent(self) -> None:
        result = self.run_chain({"EVENT_NAME": "workflow_dispatch", "PUSH_BEFORE": ""})
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn(f"Canary dependency comparison base: {self.commits[-1]}^\n", result.stdout)
        self.assertEqual(self.marker.read_text(), "install-stub\nsigning-stub\n")

    def test_rejected_job_results_prevent_install_and_signing_stubs(self) -> None:
        for value in ("failure", "cancelled", "skipped", "", "unexpected", None):
            with self.subTest(result=value):
                self.reject({"ADMISSION_RESULT": value})

    def test_rejected_admission_statuses_prevent_install_and_signing_stubs(self) -> None:
        for value in ("BLOCKED", "COVERAGE DEGRADED", "", "pass", "unexpected", None):
            with self.subTest(status=value):
                self.reject({"ADMISSION_STATUS": value})

    def test_missing_invalid_or_mismatched_source_prevents_stubs(self) -> None:
        for key in ("ADMITTED_SHA", "EVENT_SHA"):
            for value in (None, "", "bad-sha", "f" * 40):
                with self.subTest(key=key, value=value):
                    self.reject({key: value})
        self.reject({"ADMITTED_SHA": self.commits[0], "EVENT_SHA": self.commits[0]})

    def test_missing_invalid_or_mismatched_lock_hash_prevents_stubs(self) -> None:
        for value in (None, "", "bad-hash", "f" * 64):
            with self.subTest(lock_hash=value):
                self.reject({"ADMITTED_LOCK_SHA256": value})
        self.lock.write_text("tampered: true\n", encoding="utf-8")
        self.reject()
        self.lock.unlink()
        self.reject()

    def test_missing_zero_invalid_or_unavailable_push_base_prevents_stubs(self) -> None:
        for value in (None, "", ZERO_SHA, "HEAD", "bad-sha", "f" * 40):
            with self.subTest(push_before=value):
                self.reject({"PUSH_BEFORE": value})

    def test_unavailable_manual_parent_prevents_stubs(self) -> None:
        self.git("checkout", "-q", "--detach", self.commits[0])
        self.reject({"EVENT_NAME": "workflow_dispatch", "EVENT_SHA": self.commits[0],
                     "ADMITTED_SHA": self.commits[0], "PUSH_BEFORE": ""})

    def test_unsupported_events_prevent_stubs(self) -> None:
        for value in ("pull_request", "schedule", "", None):
            with self.subTest(event=value):
                self.reject({"EVENT_NAME": value})

    def test_failed_conformance_stub_prevents_signing_stub(self) -> None:
        result = self.run_chain({"CONFORMANCE_STUB_RESULT": "failure"})
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.marker.read_text(), "install-stub\n")


if __name__ == "__main__":
    unittest.main()
