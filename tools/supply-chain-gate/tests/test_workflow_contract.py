from __future__ import annotations

import re
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
WORKFLOW_ROOT = REPO_ROOT / ".github" / "workflows"


def job_section(workflow: str, job_name: str) -> str:
    marker = f"\n  {job_name}:\n"
    start = workflow.find(marker)
    if start < 0:
        raise AssertionError(f"missing job {job_name}")
    remainder = workflow[start + len(marker) :]
    next_job = re.search(r"\n  [a-zA-Z_][a-zA-Z0-9_-]*:\n", remainder)
    end = len(workflow) if next_job is None else start + len(marker) + next_job.start()
    return workflow[start:end]


def multiline_run_scripts(workflow: str) -> list[str]:
    lines = workflow.splitlines()
    scripts: list[str] = []
    index = 0
    while index < len(lines):
        line = lines[index]
        if line.strip() != "run: |":
            index += 1
            continue
        run_indent = len(line) - len(line.lstrip())
        index += 1
        body: list[str] = []
        while index < len(lines):
            candidate = lines[index]
            if candidate.strip() and len(candidate) - len(candidate.lstrip()) <= run_indent:
                break
            body.append(candidate)
            index += 1
        scripts.append("\n".join(body))
    return scripts


class WorkflowContractTests(unittest.TestCase):
    def setUp(self) -> None:
        self.gate = (WORKFLOW_ROOT / "supply-chain-gate.yml").read_text(encoding="utf-8")
        self.build_image = (WORKFLOW_ROOT / "build-image.yml").read_text(encoding="utf-8")
        self.release = (WORKFLOW_ROOT / "release.yml").read_text(encoding="utf-8")
        self.runtime_dockerfile = (REPO_ROOT / "apps" / "witnessops-web" / "Dockerfile").read_text(
            encoding="utf-8"
        )

    def test_gate_and_build_jobs_are_contents_read_without_secrets_or_oidc(self) -> None:
        for workflow, jobs in (
            (self.gate, ("gate",)),
            (self.build_image, ("build", "verify_artifact")),
            (self.release, ("build", "verify_artifact")),
        ):
            for job_name in jobs:
                section = job_section(workflow, job_name)
                self.assertIn("    permissions:\n      contents: read\n", section)
                self.assertNotRegex(section, r"(?m)^\s+id-token:\s+(?:read|write)\s*$")
                self.assertNotRegex(section, r"(?m)^\s+packages:\s+(?:read|write)\s*$")
                self.assertNotRegex(section, r"(?m)^\s+contents:\s+write\s*$")
                self.assertNotRegex(section, r"(?m)^\s+environment:\s*")
                self.assertNotIn("${{ secrets.", section)

    def test_job_section_supports_hyphenated_job_ids(self) -> None:
        workflow = "jobs:\n  build:\n    permissions: read\n  publish-prod:\n    permissions: write\n"
        section = job_section(workflow, "build")
        self.assertIn("permissions: read", section)
        self.assertNotIn("publish-prod", section)
        self.assertNotIn("permissions: write", section)

    def test_frozen_install_is_gated_and_absent_from_privileged_jobs(self) -> None:
        for workflow in (self.build_image, self.release):
            build = job_section(workflow, "build")
            publish = job_section(workflow, "publish")
            self.assertRegex(
                build,
                r"needs:\s+(?:supply_chain_gate|\[[^\]]*\bsupply_chain_gate\b[^\]]*\])",
            )
            self.assertIn("run: pnpm install --frozen-lockfile", build)
            self.assertNotRegex(publish, r"(?m)^\s+run:\s+pnpm install\b")

            self.assertIn("DOCKERFILE_PATH: apps/witnessops-web/Dockerfile", workflow)

        self.assertNotIn(" AS builder", self.runtime_dockerfile)
        self.assertNotIn("COPY --from=builder", self.runtime_dockerfile)
        self.assertNotRegex(
            self.runtime_dockerfile,
            r"(?i)\b(?:npm|pnpm|yarn|bun)\s+(?:ci|install|run|build)\b",
        )
        self.assertIn("COPY apps/witnessops-web/.next/standalone ./", self.runtime_dockerfile)

    def test_artifact_verification_is_a_separate_job_boundary(self) -> None:
        for workflow in (self.build_image, self.release):
            verify = job_section(workflow, "verify_artifact")
            publish = job_section(workflow, "publish")

            self.assertIn("    permissions:\n      contents: read\n", verify)
            self.assertRegex(verify, r"needs:\s+(?:build|\[[^\]]*\bbuild\b[^\]]*\])")
            self.assertIn("EXPECTED_IMAGE_ARCHIVE_SHA256", verify)
            self.assertIn("sha256sum -c -", verify)
            self.assertIn("node deploy/ghcr/evidence.mjs candidate", verify)
            self.assertIn("node deploy/ghcr/scan.mjs", verify)
            self.assertIn("verified-image", verify)

            self.assertRegex(
                publish,
                r"needs:\s+\[[^\]]*\bverify_artifact\b[^\]]*\]",
            )
            self.assertIn("ref: ${{ github.workflow_sha }}", publish)
            self.assertIn("sparse-checkout:", publish)
            self.assertNotRegex(publish, r"(?m)^\s+environment:\s*")
            self.assertNotIn("${{ secrets.", publish)
            self.assertNotRegex(publish, r"(?m)^\s+run:\s+(?:npm|pnpm|yarn|bun)\b")
            self.assertNotRegex(publish, r"(?m)^\s+run:\s+docker\s+run\b")
            self.assertNotIn("pnpm --filter witnessops-web", publish)
            self.assertNotIn("docker buildx build", publish)
            self.assertIn("node deploy/ghcr/publish.mjs stage", publish)
            self.assertIn("VERIFIED_IMAGE_ARCHIVE_SHA256", publish)
            self.assertIn("node deploy/ghcr/evidence.mjs verify", publish)
            self.assertIn("verified-image", publish)

            build = job_section(workflow, "build")
            self.assertIn("docker buildx build", build)
            self.assertIn("type=oci,dest=", build)

    def test_pull_requests_and_main_pushes_validate_without_publish_authority(self) -> None:
        publish = job_section(self.build_image, "publish")
        self.assertRegex(self.build_image, r"(?m)^  pull_request:\s*$")
        self.assertIn('  push:\n    branches: ["main"]\n', self.build_image)
        self.assertIn(
            "    if: github.event_name == 'workflow_dispatch' && "
            "github.ref == 'refs/heads/main'\n",
            publish,
        )

    def test_required_gate_runs_for_every_pull_request(self) -> None:
        self.assertRegex(self.gate, r"(?m)^  pull_request:\s*$")
        pull_request_trigger = self.gate.split("\n  pull_request:\n", 1)[1].split(
            "\n  schedule:\n", 1
        )[0]
        self.assertNotIn("paths:", pull_request_trigger)

    def test_third_party_actions_are_pinned_to_full_commit_shas(self) -> None:
        for workflow in (self.gate, self.build_image, self.release):
            for reference in re.findall(r"(?m)^\s*uses:\s+([^\s#]+)", workflow):
                if reference.startswith("./"):
                    continue
                self.assertRegex(reference, r"^[^@]+@[0-9a-f]{40}$", reference)

    def test_release_versions_enter_shell_only_through_environment(self) -> None:
        scripts = "\n".join(multiline_run_scripts(self.release))
        for expression in (
            "${{ inputs.version }}",
            "${{ github.event.inputs.version }}",
            "${{ github.event.client_payload.version }}",
            "${{ needs.resolve_version.outputs.version }}",
            "${{ needs.resolve_version.outputs.semver }}",
        ):
            self.assertNotIn(expression, scripts)

        resolve = job_section(self.release, "resolve_version")
        build = job_section(self.release, "build")
        publish = job_section(self.release, "publish")
        self.assertIn(
            "REQUESTED_VERSION: ${{ github.event.client_payload.version }}",
            resolve,
        )
        self.assertIn('--version "${REQUESTED_VERSION}"', resolve)
        self.assertIn("EXPECTED_SEMVER: ${{ needs.resolve_version.outputs.semver }}", build)
        self.assertIn('"${EXPECTED_SEMVER}"', build)
        self.assertIn("VERSION: ${{ needs.resolve_version.outputs.version }}", publish)
        self.assertIn("SEMVER: ${{ needs.resolve_version.outputs.semver }}", publish)

    def test_release_runs_only_from_the_default_branch_dispatch_contract(self) -> None:
        trigger = self.release.split("\non:\n", 1)[1].split("\npermissions:\n", 1)[0]

        self.assertIn("  repository_dispatch:\n", trigger)
        self.assertIn("    types: [release-witnessops-web]\n", trigger)
        self.assertNotIn("workflow_dispatch:", trigger)
        self.assertNotRegex(trigger, r"(?m)^  push:\s*$")

    def test_release_source_is_one_exact_tag_commit_on_authoritative_main(self) -> None:
        resolve = job_section(self.release, "resolve_version")
        gate = job_section(self.release, "supply_chain_gate")
        build = job_section(self.release, "build")

        self.assertIn("ref: refs/heads/main", resolve)
        self.assertIn("fetch-depth: 0", resolve)
        self.assertIn("fetch-tags: true", resolve)
        self.assertIn("persist-credentials: false", resolve)
        self.assertIn("tools/supply-chain-gate/resolve_release_source.py", resolve)
        self.assertIn("--main-ref refs/remotes/origin/main", resolve)
        self.assertIn("commit_sha: ${{ steps.version.outputs.commit_sha }}", resolve)
        self.assertIn("tag_ref: ${{ steps.version.outputs.tag_ref }}", resolve)

        self.assertIn(
            "checkout_ref: ${{ needs.resolve_version.outputs.commit_sha }}",
            gate,
        )
        self.assertNotIn(
            "checkout_ref: ${{ needs.resolve_version.outputs.version }}",
            gate,
        )
        self.assertIn("ref: ${{ needs.resolve_version.outputs.commit_sha }}", build)
        self.assertNotIn("ref: ${{ needs.resolve_version.outputs.version }}", build)
        self.assertIn(
            "GATE_SOURCE_COMMIT: ${{ needs.supply_chain_gate.outputs.commit_sha }}",
            build,
        )
        self.assertIn('actual_source_commit="$(git rev-parse HEAD)"', build)
        self.assertIn(
            '[[ "${GATE_SOURCE_COMMIT}" != "${EXPECTED_SOURCE_COMMIT}" ]]',
            build,
        )

    def test_privileged_release_rechecks_remote_main_and_tag_before_publish_and_release(
        self,
    ) -> None:
        publish = job_section(self.release, "publish")

        self.assertEqual(
            publish.count('gh api "repos/${GITHUB_REPOSITORY}/git/ref/heads/main"'),
            2,
        )
        self.assertEqual(
            publish.count('gh api "repos/${GITHUB_REPOSITORY}/git/ref/tags/${VERSION}"'),
            2,
        )
        self.assertEqual(
            publish.count('gh api "repos/${GITHUB_REPOSITORY}/git/tags/${object_sha}"'),
            2,
        )
        self.assertEqual(
            publish.count('[[ "${observed_source_commit}" != "${EXPECTED_SOURCE_COMMIT}" ]]'),
            2,
        )
        self.assertEqual(
            publish.count('[[ "${observed_main_commit}" != "${EXPECTED_SOURCE_COMMIT}" ]]'),
            2,
        )
        self.assertLess(
            publish.index("- name: Log in to GHCR with GitHub token"),
            publish.index(
                "- name: Verify remote main and the release tag still name the authorized commit"
            ),
        )
        self.assertLess(
            publish.index(
                "- name: Verify remote main and the release tag still name the authorized commit"
            ),
            publish.index(
                "- name: Publish the exact verified image without building or running it"
            ),
        )
        self.assertIn('gh release create "${VERSION}" \\\n            --verify-tag \\', publish)

    def test_release_artifact_identity_uses_the_resolved_source_commit(self) -> None:
        publish = job_section(self.release, "publish")

        self.assertNotIn(
            "witnessops-web-build:${{ needs.supply_chain_gate.outputs.commit_sha }}",
            self.release,
        )
        self.assertIn(
            "witnessops-web-build:${{ needs.resolve_version.outputs.commit_sha }}",
            self.release,
        )
        self.assertIn(
            "SOURCE_COMMIT_SHA: ${{ needs.resolve_version.outputs.commit_sha }}",
            publish,
        )
        self.assertIn("commit_sha: process.env.SOURCE_COMMIT_SHA", publish)
        self.assertIn("tag_ref: process.env.SOURCE_TAG_REF", publish)
        self.assertIn("commit_sha: process.env.SUPPLY_CHAIN_COMMIT_SHA", publish)

    def test_reconstructable_evidence_fields_are_present(self) -> None:
        for workflow in (self.build_image, self.release):
            self.assertIn("SUPPLY_CHAIN_GRAPH_SHA256", workflow)
            self.assertIn("SUPPLY_CHAIN_LOCKFILE_SHA256", workflow)
            self.assertIn("STANDALONE_OUTPUT_SHA256", workflow)
            self.assertIn("VERIFIED_IMAGE_ARCHIVE_SHA256", workflow)
            self.assertIn("commit_sha", workflow)
            self.assertIn("package_manager", workflow)
            self.assertIn("package_graph_sha256", workflow)
            self.assertIn("lifecycle_review", workflow)
            self.assertIn("artifact_verification", workflow)

    def test_local_install_and_remote_build_paths_run_gate_first(self) -> None:
        k3s = (REPO_ROOT / "deploy" / "scripts" / "k3s-lib.sh").read_text(encoding="utf-8")
        health = (REPO_ROOT / "scripts" / "health-on-node22.sh").read_text(encoding="utf-8")
        build_shared_image = k3s.split("build_shared_image() {", 1)[1].split(
            "\ndeploy_prod() {", 1
        )[0]
        self.assertLess(
            build_shared_image.index("  if ! run_supply_chain_gate; then\n"),
            build_shared_image.index("  if ! sync_build_context"),
        )
        self.assertIn('die "Supply Chain Gate failed; refusing remote build"', build_shared_image)
        self.assertIn('merge-base HEAD origin/main', k3s)
        self.assertNotIn('base_ref="HEAD"', k3s)
        self.assertLess(
            health.index('python3 "$ROOT/tools/supply-chain-gate/supply_chain_gate.py"'),
            health.index('"$CONTAINER_CMD" run --rm'),
        )
        self.assertIn('merge-base HEAD origin/main', health)
        self.assertNotIn('GATE_ARGS+=(--base-ref HEAD)', health)




class PublicTestAdmissionContracts(unittest.TestCase):
    workflows = (
        ("ui-proof-homepage-hero.yml", "homepage-hero-ui-proof", "Homepage hero UI proof",
         ("pnpm ui-proof:hero:ci", "pnpm ui-proof:skill-conformance",
          "pnpm --filter witnessops-web test", "pnpm smoke:buyer-path:test")),
        ("pdf-pagination.yml", "pdf-pagination", "PDF Pagination Gate", ("pnpm test:pdf-pagination",)),
    )

    def test_public_jobs_use_direct_gate_and_exact_event_comparison(self):
        for file, job_id, name, commands in self.workflows:
            with self.subTest(file=file):
                workflow = (WORKFLOW_ROOT / file).read_text()
                gate = job_section(workflow, "supply_chain_gate")
                job = job_section(workflow, job_id)
                self.assertIn("uses: ./.github/workflows/supply-chain-gate.yml", gate)
                self.assertIn("permissions:\n      contents: read", gate)
                self.assertIn("checkout_ref: ${{ github.sha }}", gate)
                self.assertIn("github.event_name == 'workflow_dispatch' && format('{0}^', github.sha)", gate)
                self.assertIn("github.event.pull_request.base.sha || 'MISSING_REQUIRED_COMPARISON_BASE'", gate)
                self.assertNotIn("HEAD", gate)
                self.assertIn("needs: supply_chain_gate", job)
                for section in (gate, job.split("    steps:")[0]):
                    self.assertNotRegex(section, r"(?m)^    (if|continue-on-error):")
                self.assertIn(f"name: {name}", job)
                self.assertIn("ref: ${{ needs.supply_chain_gate.outputs.commit_sha }}", job)
                self.assertIn("persist-credentials: false", job)
                identity = job.index("Reject missing or unbound checkout identity")
                checkout = job.index("uses: actions/checkout@")
                guard = job.index("run: python3 -I tools/supply-chain-gate/verify_install_admission.py")
                self.assertLess(identity, checkout)
                self.assertLess(checkout, guard)
                for tooling in ("uses: pnpm/action-setup@", "uses: actions/setup-node@",
                                "cache: pnpm", "run: pnpm install --frozen-lockfile"):
                    self.assertLess(guard, job.index(tooling))
                for expression in ("needs.supply_chain_gate.result", "needs.supply_chain_gate.outputs.status",
                                   "needs.supply_chain_gate.outputs.commit_sha", "github.sha",
                                   "needs.supply_chain_gate.outputs.lockfile_sha256"):
                    self.assertIn(expression, job)
                for command in (*commands, "pnpm --filter witnessops-web build",
                                "pnpm exec playwright install chromium --with-deps"):
                    self.assertIn(command, job)
                self.assertIn('".github/workflows/supply-chain-gate.yml"', workflow)
                self.assertIn('"tools/supply-chain-gate/**"', workflow)
                self.assertIn('"security/supply-chain/**"', workflow)

    def test_ui_collect_then_enforce_is_preserved(self):
        workflow = (WORKFLOW_ROOT / "ui-proof-homepage-hero.yml").read_text()
        self.assertIn("id: ui_proof\n        continue-on-error: true", workflow)
        self.assertIn("id: skill_ui_proof\n        continue-on-error: true", workflow)
        enforcement = workflow.split("      - name: Enforce UI proof blocking policy\n")[1]
        self.assertIn("if: always()", enforcement)
        self.assertIn('test -f artifacts/ui-proof/homepage-hero/latest.json', enforcement)
        self.assertIn('steps.ui_proof.outcome', enforcement)
        self.assertIn('steps.skill_ui_proof.outcome', enforcement)
        self.assertEqual(enforcement.count("exit 1"), 2)
        self.assertIn("retention-days: 14", workflow)

    def test_actual_guard_rejects_bad_evidence_before_stub_install(self):
        import hashlib
        import os
        import subprocess
        import sys
        import tempfile

        guard = REPO_ROOT / "tools/supply-chain-gate/verify_install_admission.py"
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            lock = b"lockfileVersion: '9.0'\n"
            (root / "pnpm-lock.yaml").write_bytes(lock)
            def git(*args):
                return subprocess.check_output(["git", *args], cwd=root, text=True).strip()
            git("init", "-q")
            git("add", "pnpm-lock.yaml")
            git("-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid",
                "-c", "commit.gpgsign=false", "-c", "core.hooksPath=/dev/null",
                "commit", "-qm", "fixture")
            head = git("rev-parse", "HEAD")
            baseline = dict(os.environ, ADMISSION_RESULT="success", ADMISSION_STATUS="PASS",
                            ADMITTED_SHA=head, EVENT_SHA=head,
                            ADMITTED_LOCK_SHA256=hashlib.sha256(lock).hexdigest(),
                            GUARD=str(guard), PYTHON_TEST=sys.executable)
            marker = root / "installation-reached"
            cases = [("accepted", {}, True)]
            for status in ("BLOCKED", "COVERAGE DEGRADED", "", "unexpected"):
                cases.append(("status-" + status, {"ADMISSION_STATUS": status}, False))
            for result in ("failure", "cancelled", "skipped", "", "unexpected"):
                cases.append(("result-" + result, {"ADMISSION_RESULT": result}, False))
            for value in ("", "abc", "a" * 39, "g" * 40, "main", "a" * 40):
                cases.append(("sha-" + value, {"ADMITTED_SHA": value}, False))
            cases += [
                ("missing SHA", {"ADMITTED_SHA": None}, False),
                ("missing status", {"ADMISSION_STATUS": None}, False),
                ("missing result", {"ADMISSION_RESULT": None}, False),
                ("event mismatch", {"EVENT_SHA": "b" * 40}, False),
                ("checkout mismatch", {"EVENT_SHA": "b" * 40, "ADMITTED_SHA": "b" * 40}, False),
                ("empty lock hash", {"ADMITTED_LOCK_SHA256": ""}, False),
                ("malformed lock hash", {"ADMITTED_LOCK_SHA256": "g" * 64}, False),
                ("wrong lock hash", {"ADMITTED_LOCK_SHA256": "c" * 64}, False),
                ("missing lock hash", {"ADMITTED_LOCK_SHA256": None}, False),
            ]
            for name, overrides, accepted in cases:
                with self.subTest(case=name):
                    marker.unlink(missing_ok=True)
                    env = baseline.copy()
                    for key, value in overrides.items():
                        if value is None:
                            env.pop(key, None)
                        else:
                            env[key] = value
                    result = subprocess.run(
                        ["bash", "-c", '"$PYTHON_TEST" -I "$GUARD" && printf installed > installation-reached'],
                        cwd=root, env=env, capture_output=True, text=True)
                    self.assertEqual(result.returncode == 0, accepted, result.stderr)
                    self.assertEqual(marker.exists(), accepted)
            (root / "pnpm-lock.yaml").unlink()
            result = subprocess.run([sys.executable, "-I", str(guard)], cwd=root, env=baseline,
                                    capture_output=True)
            self.assertNotEqual(result.returncode, 0)


    def test_required_comparison_base_unavailable_fails_closed(self):
        import importlib.util
        import tempfile

        spec = importlib.util.spec_from_file_location(
            "gate_comparison_contract", REPO_ROOT / "tools/supply-chain-gate/supply_chain_gate.py")
        gate = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(gate)
        with tempfile.TemporaryDirectory() as directory:
            import subprocess
            repo = Path(directory)
            subprocess.run(["git", "init", "-q"], cwd=repo, check=True)
            for base in ("MISSING_REQUIRED_COMPARISON_BASE", "a" * 40 + "^"):
                with self.subTest(base=base), self.assertRaises(gate.GateError):
                    gate.evaluate_git_change(repo, base)


if __name__ == "__main__":
    unittest.main()
