"""App admission wiring and actual-shell rejection tests; no live scheduler claims."""
import unittest
from test_canary_admission import (
    CanaryAdmissionExecutionTests as ExecutionFixtures, job, step, script,
    ROOT, ADMISSION_STEP,
)

WORKFLOW = ROOT / '.github/workflows/app-validation.yml'


class AppAdmissionContracts(unittest.TestCase):
    def test_both_jobs_bind_source_before_any_tooling_or_build(self):
        text = WORKFLOW.read_text()
        gate = job(text, 'supply_chain_gate')
        self.assertIn('checkout_ref: ${{ github.sha }}', gate)
        self.assertIn("github.event_name == 'pull_request' && github.event.pull_request.base.sha", gate)
        self.assertIn("github.event_name == 'push' && github.event.before != '" + '0'*40, gate)
        self.assertIn("github.event_name == 'workflow_dispatch' && format('{0}^', github.sha)", gate)
        self.assertIn("|| 'MISSING_REQUIRED_COMPARISON_BASE'", gate)
        scripts = []
        for identifier in ('app', 'image'):
            body = job(text, identifier)
            self.assertIn('    needs: supply_chain_gate\n', body)
            self.assertNotRegex(body.split('    steps:')[0], r'(?m)^    (if|continue-on-error):')
            self.assertNotIn('continue-on-error:', body)
            self.assertIn('ref: ${{ github.sha }}', body)
            self.assertNotIn('ref: ${{ needs.', body)
            self.assertIn('fetch-depth: 0', body)
            self.assertIn('persist-credentials: false', body)
            guard = step(body, ADMISSION_STEP)
            scripts.append(script(guard))
            for expression in ('needs.supply_chain_gate.result', 'needs.supply_chain_gate.outputs.status',
                               'needs.supply_chain_gate.outputs.commit_sha', 'github.sha',
                               'needs.supply_chain_gate.outputs.lockfile_sha256'):
                self.assertIn(expression, guard)
            guard_end = body.index(guard) + len(guard)
            for marker in ('uses: pnpm/action-setup@', 'uses: actions/setup-node@', 'cache: pnpm',
                           'pnpm install --frozen-lockfile'):
                self.assertLess(guard_end, body.index(marker))
            if identifier == 'image':
                self.assertLess(guard_end, body.index('docker buildx build'))
            self.assertNotIn('${{', script(guard))
        self.assertEqual(*scripts)


class AppAdmissionExecutionTests(ExecutionFixtures):
    """Reuse disposable Git/stub fixtures; execute the app's actual shell."""
    def setUp(self):
        super().setUp()
        self.env['PR_BASE'] = self.commits[0]
        body = job(WORKFLOW.read_text(), 'app')
        self.chain = script(step(body, ADMISSION_STEP))
        self.chain += 'pnpm install --frozen-lockfile\ntest "${CONFORMANCE_STUB_RESULT}" = success\nsigning-stub\n'

    def test_push_uses_before_commit_for_complete_pushed_range(self):
        result = self.run_chain()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.marker.read_text(), 'install-stub\nsigning-stub\n')

    def test_manual_run_uses_exact_event_first_parent(self):
        result = self.run_chain({'EVENT_NAME': 'workflow_dispatch', 'PUSH_BEFORE': ''})
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_pr_requires_valid_available_non_self_base(self):
        result = self.run_chain({'EVENT_NAME': 'pull_request'})
        self.assertEqual(result.returncode, 0, result.stderr)
        for value in (None, '', 'HEAD', '0'*40, 'f'*40, self.commits[-1]):
            with self.subTest(base=value):
                self.reject({'EVENT_NAME': 'pull_request', 'PR_BASE': value})

    def test_push_cannot_compare_source_to_itself(self):
        self.reject({'PUSH_BEFORE': self.commits[-1]})

    def test_unsupported_events_prevent_stubs(self):
        for value in ('schedule', 'workflow_call', '', None):
            with self.subTest(event=value):
                self.reject({'EVENT_NAME': value})


# Avoid discovering the imported fixture class as an additional test suite.
del ExecutionFixtures

if __name__ == '__main__':
    unittest.main()
