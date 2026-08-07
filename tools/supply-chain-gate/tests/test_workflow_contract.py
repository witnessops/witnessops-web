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
    next_job = re.search(r"\n  [a-zA-Z_][a-zA-Z0-9_]*:\n", remainder)
    end = len(workflow) if next_job is None else start + len(marker) + next_job.start()
    return workflow[start:end]


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
            self.assertIn("manifest.json", verify)
            self.assertIn("verified-image", verify)

            self.assertRegex(
                publish,
                r"needs:\s+\[[^\]]*\bverify_artifact\b[^\]]*\]",
            )
            self.assertNotIn("actions/checkout@", publish)
            self.assertNotRegex(publish, r"(?m)^\s+environment:\s*")
            self.assertNotIn("${{ secrets.", publish)
            self.assertNotRegex(publish, r"(?m)^\s+run:\s+(?:npm|pnpm|yarn|bun)\b")
            self.assertNotRegex(publish, r"(?m)^\s+run:\s+docker\s+run\b")
            self.assertNotIn("pnpm --filter witnessops-web", publish)
            self.assertNotIn("docker buildx build", publish)
            self.assertIn("docker load --input", publish)
            self.assertIn("VERIFIED_IMAGE_ARCHIVE_SHA256", publish)
            self.assertIn("sha256sum -c -", publish)
            self.assertIn("verified-image", publish)

            build = job_section(workflow, "build")
            self.assertIn("docker buildx build", build)
            self.assertIn("type=docker,dest=", build)

    def test_pull_requests_can_validate_artifacts_without_publish_authority(self) -> None:
        publish = job_section(self.build_image, "publish")
        self.assertRegex(self.build_image, r"(?m)^  pull_request:\s*$")
        self.assertIn("    if: github.event_name != 'pull_request'\n", publish)

    def test_third_party_actions_are_pinned_to_full_commit_shas(self) -> None:
        for workflow in (self.gate, self.build_image, self.release):
            for reference in re.findall(r"(?m)^\s*uses:\s+([^\s#]+)", workflow):
                if reference.startswith("./"):
                    continue
                self.assertRegex(reference, r"^[^@]+@[0-9a-f]{40}$", reference)

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
        self.assertLess(k3s.index("  run_supply_chain_gate\n"), k3s.index("  rsync -az --delete"))
        self.assertLess(
            health.index('python3 "$ROOT/tools/supply-chain-gate/supply_chain_gate.py"'),
            health.index('"$CONTAINER_CMD" run --rm'),
        )


if __name__ == "__main__":
    unittest.main()
