"""AWS validation admission contracts; fixture markers never build or publish."""
import unittest
import test_app_admission as app_fixtures
from test_canary_admission import ROOT, job, step, script

WORKFLOW = ROOT / '.github/workflows/aws-phase3-validate.yml'
STEP = 'Verify dependency admission before image build'


class AwsValidationAdmissionContracts(unittest.TestCase):
    def test_direct_gates_and_guard_precede_docker(self):
        text = WORKFLOW.read_text()
        gate = job(text, 'supply_chain_gate')
        build = job(text, 'build_image')
        self.assertEqual(gate.strip(), "uses: ./.github/workflows/supply-chain-gate.yml\n    permissions:\n      contents: read\n    with:\n      checkout_ref: ${{ github.sha }}\n      base_ref: ${{ github.event_name == 'pull_request' && github.event.pull_request.base.sha || github.event_name == 'workflow_dispatch' && format('{0}^', github.sha) || 'MISSING_REQUIRED_COMPARISON_BASE' }}")
        self.assertIn('checkout_ref: ${{ github.sha }}', gate)
        self.assertIn("github.event_name == 'pull_request' && github.event.pull_request.base.sha", gate)
        self.assertIn("github.event_name == 'workflow_dispatch' && format('{0}^', github.sha)", gate)
        self.assertIn("|| 'MISSING_REQUIRED_COMPARISON_BASE'", gate)
        self.assertIn('needs: [validate, supply_chain_gate]', build)
        for body in (gate, build):
            self.assertNotRegex(body.split('    steps:')[0], r'(?m)^    (if|continue-on-error):')
            self.assertNotIn('continue-on-error:', body)
            self.assertIn('permissions:\n      contents: read', body)
            self.assertNotIn('id-token:', body)
            self.assertNotIn('secrets:', body)
        for identifier in ('validate', 'build_image'):
            body = job(text, identifier)
            self.assertIn('ref: ${{ github.sha }}', body)
            self.assertIn('persist-credentials: false', body)
        self.assertIn('fetch-depth: 0', build)
        guard = step(build, STEP)
        for expression in ('needs.supply_chain_gate.result', 'needs.supply_chain_gate.outputs.status',
                           'needs.supply_chain_gate.outputs.commit_sha', 'github.sha',
                           'needs.supply_chain_gate.outputs.lockfile_sha256'):
            self.assertIn(expression, guard)
        self.assertIn('python3 -I tools/supply-chain-gate/verify_install_admission.py', guard)
        self.assertLess(build.index(STEP), build.index('sudo'))
        self.assertLess(build.index(STEP), build.index('docker buildx build'))
        self.assertNotIn('${{', script(guard))
        for path in ('.github/workflows/supply-chain-gate.yml', 'tools/supply-chain-gate/**', 'security/supply-chain/**'):
            self.assertIn('      - "'+path+'"', text)

    def test_noop_gate_with_expected_text_in_comments_is_rejected(self):
        import tempfile
        from unittest.mock import patch
        text = WORKFLOW.read_text()
        original = '  supply_chain_gate:\n' + job(text, 'supply_chain_gate')
        replacement = '  supply_chain_gate:\n    runs-on: ubuntu-latest\n    steps:\n      - run: true\n'
        replacement += '\n'.join('# ' + line for line in original.splitlines())
        mutated = text.replace(original, replacement)
        self.assertNotEqual(mutated, text)
        with tempfile.TemporaryDirectory() as directory:
            path = ROOT.__class__(directory) / 'workflow.yml'
            path.write_text(mutated)
            with patch(__name__ + '.WORKFLOW', path):
                with self.assertRaises(AssertionError):
                    self.test_direct_gates_and_guard_precede_docker()


class AwsValidationAdmissionExecutionTests(unittest.TestCase):
    def setUp(self):
        self.fixture = app_fixtures.AppAdmissionExecutionTests(methodName='runTest')
        self.fixture.setUp()
        self.addCleanup(self.fixture.doCleanups)
        self.env = self.fixture.env
        self.commits = self.fixture.commits
        self.reject = self.fixture.reject
        self.env['EVENT_NAME'] = 'pull_request'
        self.fixture.chain = script(step(job(WORKFLOW.read_text(), 'build_image'), STEP))
        # Existing fixture markers stand in for downstream install/build work.
        self.fixture.chain += 'pnpm install --frozen-lockfile\ntest "${CONFORMANCE_STUB_RESULT}" = success\nsigning-stub\n'

    def test_push_event_is_unsupported(self):
        self.reject({'EVENT_NAME': 'push'})

    def test_push_is_rejected_even_with_self_base(self):
        self.reject({'EVENT_NAME': 'push', 'PUSH_BEFORE': self.commits[-1]})

    def test_missing_zero_invalid_or_unavailable_pr_base_prevents_stubs(self):
        for value in (None, '', '0'*40, 'HEAD', 'bad-sha', 'f'*40):
            with self.subTest(base=value):
                self.reject({'PR_BASE': value})

    def test_unsupported_events_prevent_stubs(self):
        for value in ('push', 'schedule', 'workflow_call', '', None):
            with self.subTest(event=value):
                self.reject({'EVENT_NAME': value})

    def test_manual_run_uses_exact_event_first_parent(self):
        self.fixture.test_manual_run_uses_exact_event_first_parent()

    def test_pr_requires_valid_available_non_self_base(self):
        self.fixture.test_pr_requires_valid_available_non_self_base()

    def test_rejected_job_results_prevent_install_and_signing_stubs(self):
        self.fixture.test_rejected_job_results_prevent_install_and_signing_stubs()

    def test_rejected_admission_statuses_prevent_install_and_signing_stubs(self):
        self.fixture.test_rejected_admission_statuses_prevent_install_and_signing_stubs()

    def test_missing_invalid_or_mismatched_source_prevents_stubs(self):
        self.fixture.test_missing_invalid_or_mismatched_source_prevents_stubs()

    def test_missing_invalid_or_mismatched_lock_hash_prevents_stubs(self):
        self.fixture.test_missing_invalid_or_mismatched_lock_hash_prevents_stubs()

    def test_unavailable_manual_parent_prevents_stubs(self):
        self.fixture.test_unavailable_manual_parent_prevents_stubs()

    def test_failed_conformance_stub_prevents_signing_stub(self):
        self.fixture.test_failed_conformance_stub_prevents_signing_stub()


if __name__ == '__main__':
    unittest.main()
