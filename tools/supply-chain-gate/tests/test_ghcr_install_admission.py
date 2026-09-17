"""Actual GHCR pre-install guard fixtures; no installation or publication."""
import unittest
import test_app_admission as fixtures
from test_canary_admission import ROOT, job, step, script

BUILD = ROOT / '.github/workflows/build-image.yml'
RELEASE = ROOT / '.github/workflows/release.yml'
BUILD_STEP = 'Verify dependency admission before package tooling'
RELEASE_STEP = 'Confirm the gate and build use the same authorized commit'


class GhcrAdmissionContracts(unittest.TestCase):
    def test_gate_and_guard_order_and_authority(self):
        for path, name, needs in ((BUILD, BUILD_STEP, 'needs: supply_chain_gate'),
                                  (RELEASE, RELEASE_STEP, 'needs: [resolve_version, supply_chain_gate]')):
            text = path.read_text()
            body = job(text, 'build')
            gate = job(text, 'supply_chain_gate')
            self.assertIn('uses: ./.github/workflows/supply-chain-gate.yml', gate)
            self.assertIn(needs, body)
            for value in (body, gate):
                self.assertNotIn('continue-on-error:', value)
                self.assertNotRegex(value.split('    steps:')[0], r'(?m)^    if:')
                self.assertNotIn('id-token:', value)
                self.assertNotIn('secrets:', value)
            guard = step(body, name)
            for expression in ('needs.supply_chain_gate.result', 'needs.supply_chain_gate.outputs.status',
                               'needs.supply_chain_gate.outputs.commit_sha',
                               'needs.supply_chain_gate.outputs.lockfile_sha256'):
                self.assertIn(expression, guard)
            for marker in ('uses: pnpm/action-setup@', 'uses: actions/setup-node@', 'pnpm install --frozen-lockfile'):
                self.assertLess(body.index(guard)+len(guard), body.index(marker))
            self.assertNotIn('${{', script(guard))
            self.assertIn('persist-credentials: false', body)
        build = BUILD.read_text()
        self.assertIn('checkout_ref: ${{ github.sha }}', job(build, 'supply_chain_gate'))
        self.assertIn('ref: ${{ github.sha }}', job(build, 'build'))
        release = RELEASE.read_text()
        self.assertIn('checkout_ref: ${{ needs.resolve_version.outputs.commit_sha }}', job(release, 'supply_chain_gate'))
        self.assertIn('ref: ${{ needs.resolve_version.outputs.commit_sha }}', job(release, 'build'))
        guard = step(job(release, 'build'), RELEASE_STEP)
        self.assertIn('EVENT_SHA: ${{ needs.resolve_version.outputs.commit_sha }}', guard)
        self.assertIn('WORKFLOW_SHA: ${{ github.workflow_sha }}', guard)
        self.assertIn('git show "${WORKFLOW_SHA}:tools/supply-chain-gate/verify_install_admission.py"', guard)


class GhcrBuildExecutionTests(fixtures.AppAdmissionExecutionTests):
    def setUp(self):
        super().setUp()
        self.chain = script(step(job(BUILD.read_text(), 'build'), BUILD_STEP))
        self.chain += 'pnpm install --frozen-lockfile\ntest "${CONFORMANCE_STUB_RESULT}" = success\nsigning-stub\n'


class GhcrReleaseExecutionTests(unittest.TestCase):
    def setUp(self):
        self.f = fixtures.AppAdmissionExecutionTests(methodName='runTest')
        self.f.setUp()
        self.addCleanup(self.f.doCleanups)
        sha = self.f.commits[-1]
        self.f.env.update(EVENT_NAME='repository_dispatch', WORKFLOW_SHA=sha,
                          EXPECTED_SOURCE_COMMIT=sha, GATE_SOURCE_COMMIT=sha,
                          RUNNER_TEMP=str(self.f.repo.parent))
        self.f.chain = script(step(job(RELEASE.read_text(), 'build'), RELEASE_STEP))
        self.f.chain += 'pnpm install --frozen-lockfile\nsigning-stub\n'

    def test_matching_evidence_passes(self):
        result = self.f.run_chain()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.f.marker.read_text(), 'install-stub\nsigning-stub\n')

    def test_release_source_can_differ_from_workflow_source(self):
        old = self.f.commits[0]
        self.f.git('checkout', '--detach', old)
        result = self.f.run_chain({'EVENT_SHA': old, 'EXPECTED_SOURCE_COMMIT': old,
                                  'GATE_SOURCE_COMMIT': old, 'ADMITTED_SHA': old})
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_candidate_helper_is_not_executed(self):
        helper = self.f.repo / 'tools/supply-chain-gate/verify_install_admission.py'
        helper.write_text('raise SystemExit("candidate helper must not execute")\n')
        self.test_matching_evidence_passes()

    def test_tag_without_helper_uses_workflow_revision(self):
        helper = self.f.repo / 'tools/supply-chain-gate/verify_install_admission.py'
        original = helper.read_bytes()
        self.f.git('rm', 'tools/supply-chain-gate/verify_install_admission.py')
        args = ('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid',
                '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', 'commit', '-qm')
        self.f.git(*args, 'release source without helper')
        source = self.f.git('rev-parse', 'HEAD').strip()
        helper.parent.mkdir(parents=True, exist_ok=True)
        helper.write_bytes(original)
        self.f.git('add', str(helper.relative_to(self.f.repo)))
        self.f.git(*args, 'workflow helper')
        workflow = self.f.git('rev-parse', 'HEAD').strip()
        self.f.git('checkout', '--detach', source)
        result = self.f.run_chain({'EVENT_SHA': source, 'EXPECTED_SOURCE_COMMIT': source,
                                  'GATE_SOURCE_COMMIT': source, 'ADMITTED_SHA': source,
                                  'WORKFLOW_SHA': workflow})
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertFalse(helper.exists())
        self.assertEqual(list(self.f.repo.parent.glob('release-admission.*.py')), [])

    def test_rejected_results(self):
        self.f.test_rejected_job_results_prevent_install_and_signing_stubs()

    def test_rejected_statuses(self):
        self.f.test_rejected_admission_statuses_prevent_install_and_signing_stubs()

    def test_rejected_source(self):
        self.f.test_missing_invalid_or_mismatched_source_prevents_stubs()
        for key in ('EXPECTED_SOURCE_COMMIT', 'GATE_SOURCE_COMMIT'):
            for value in (None, '', 'main', 'f'*40):
                self.f.reject({key: value})

    def test_rejected_lock(self):
        self.f.test_missing_invalid_or_mismatched_lock_hash_prevents_stubs()

    def test_rejected_workflow_source(self):
        for value in (None, '', 'HEAD', '0'*40, 'f'*40):
            self.f.reject({'WORKFLOW_SHA': value})

    def test_rejected_event(self):
        for value in (None, '', 'push', 'pull_request', 'workflow_dispatch'):
            self.f.reject({'EVENT_NAME': value})


if __name__ == '__main__':
    unittest.main()
