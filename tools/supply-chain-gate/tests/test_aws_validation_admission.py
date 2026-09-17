"""AWS validation admission contracts; fixture markers never build or publish."""
import unittest
from test_app_admission import AppAdmissionExecutionTests as Fixtures
from test_canary_admission import ROOT, job, step, script

WORKFLOW = ROOT / '.github/workflows/aws-phase3-validate.yml'
STEP = 'Verify dependency admission before image build'


class AwsValidationAdmissionContracts(unittest.TestCase):
    def test_direct_gates_and_guard_precede_docker(self):
        text = WORKFLOW.read_text()
        gate = job(text, 'supply_chain_gate')
        build = job(text, 'build_image')
        self.assertIn('uses: ./.github/workflows/supply-chain-gate.yml', gate)
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


class AwsValidationAdmissionExecutionTests(Fixtures):
    def setUp(self):
        super().setUp()
        self.env['EVENT_NAME'] = 'pull_request'
        self.chain = script(step(job(WORKFLOW.read_text(), 'build_image'), STEP))
        # Existing fixture markers stand in for downstream install/build work.
        self.chain += 'pnpm install --frozen-lockfile\ntest "${CONFORMANCE_STUB_RESULT}" = success\nsigning-stub\n'

    def test_push_uses_before_commit_for_complete_pushed_range(self):
        self.reject({'EVENT_NAME': 'push'})

    def test_push_cannot_compare_source_to_itself(self):
        self.reject({'EVENT_NAME': 'push', 'PUSH_BEFORE': self.commits[-1]})

    def test_missing_zero_invalid_or_unavailable_push_base_prevents_stubs(self):
        for value in (None, '', '0'*40, 'HEAD', 'bad-sha', 'f'*40):
            with self.subTest(base=value):
                self.reject({'PR_BASE': value})

    def test_unsupported_events_prevent_stubs(self):
        for value in ('push', 'schedule', 'workflow_call', '', None):
            with self.subTest(event=value):
                self.reject({'EVENT_NAME': value})


del Fixtures

if __name__ == '__main__':
    unittest.main()
