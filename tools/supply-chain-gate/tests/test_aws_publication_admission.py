"""Execute the publication guard with inert downstream markers, never AWS access."""
import unittest
import test_app_admission as fixtures
from test_canary_admission import ROOT, job, step, script

WORKFLOW = ROOT / '.github/workflows/aws-release-reusable.yml'
STEP = 'Verify dependency admission before publication build'


class AwsPublicationAdmissionContracts(unittest.TestCase):
    def test_low_authority_direct_gate_before_build(self):
        text = WORKFLOW.read_text()
        gate = job(text, 'supply_chain_gate')
        self.assertEqual(gate.strip(), "if: needs.validate.outputs.operation == 'publish-image'\n    needs: validate\n    uses: ./.github/workflows/supply-chain-gate.yml\n    permissions:\n      contents: read\n    with:\n      checkout_ref: ${{ github.sha }}\n      base_ref: ${{ format('{0}^', github.sha) }}")
        build = job(text, 'build_image')
        self.assertIn('needs: [validate, supply_chain_gate]', build)
        self.assertIn("if: needs.validate.outputs.operation == 'publish-image'", build)
        for body in (gate, build):
            for forbidden in ('always()', 'continue-on-error:', 'id-token:', 'secrets:', 'environment:'):
                self.assertNotIn(forbidden, body)
            self.assertIn('permissions:\n      contents: read', body)
        for name in ('validate', 'build_image'):
            body = job(text, name)
            self.assertIn('ref: ${{ github.sha }}', body)
            self.assertIn('persist-credentials: false', body)
        guard = step(build, STEP)
        for expression in ('needs.supply_chain_gate.result', 'needs.supply_chain_gate.outputs.status',
                           'needs.supply_chain_gate.outputs.commit_sha', 'github.sha',
                           'needs.supply_chain_gate.outputs.lockfile_sha256',
                           'needs.validate.outputs.source_commit', 'needs.validate.outputs.operation'):
            self.assertIn(expression, guard)
        self.assertNotIn('${{', script(guard))
        self.assertLess(build.index(STEP), build.index('sudo'))
        self.assertLess(build.index(STEP), build.index('docker buildx build'))
        self.assertIn('needs: [validate, build_image]', job(text, 'publish_image'))
        for name in ('deploy_staging', 'deploy_production'):
            self.assertIn('needs: [validate, validate_scan_evidence]', job(text, name))


class AwsPublicationAdmissionExecutionTests(unittest.TestCase):
    def setUp(self):
        self.fixture = fixtures.AppAdmissionExecutionTests(methodName='runTest')
        self.fixture.setUp()
        self.addCleanup(self.fixture.doCleanups)
        self.fixture.env.update(EVENT_NAME='workflow_dispatch', OPERATION='publish-image',
                                VALIDATED_SOURCE=self.fixture.commits[-1])
        self.fixture.chain = script(step(job(WORKFLOW.read_text(), 'build_image'), STEP))
        self.fixture.chain += 'pnpm install --frozen-lockfile\nsigning-stub\n'

    def test_matching_evidence_reaches_stubs(self):
        result = self.fixture.run_chain()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.fixture.marker.read_text(), 'install-stub\nsigning-stub\n')

    def test_non_publication_operations_and_events_fail(self):
        for value in ('deploy-staging', 'deploy-production', '', None, 'other'):
            self.fixture.reject({'OPERATION': value})
        for value in ('push', 'pull_request', 'workflow_call', '', None):
            self.fixture.reject({'EVENT_NAME': value})

    def test_validated_source_mismatch_fails(self):
        for value in (None, '', 'main', '0'*40, 'f'*40, self.fixture.commits[0]):
            self.fixture.reject({'VALIDATED_SOURCE': value})

    def test_bad_prerequisite_results_fail(self):
        self.fixture.test_rejected_job_results_prevent_install_and_signing_stubs()

    def test_bad_admission_statuses_fail(self):
        self.fixture.test_rejected_admission_statuses_prevent_install_and_signing_stubs()

    def test_bad_source_evidence_fails(self):
        self.fixture.test_missing_invalid_or_mismatched_source_prevents_stubs()

    def test_bad_lockfile_evidence_fails(self):
        self.fixture.test_missing_invalid_or_mismatched_lock_hash_prevents_stubs()

    def test_missing_parent_fails(self):
        root = self.fixture.commits[0]
        self.fixture.reject({'EVENT_SHA': root, 'VALIDATED_SOURCE': root, 'ADMITTED_SHA': root})


if __name__ == '__main__':
    unittest.main()
