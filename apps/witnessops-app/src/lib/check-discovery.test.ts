import test from 'node:test';
import assert from 'node:assert/strict';
import { CHECK_DISCOVERY } from './check-discovery';

test('discovery keeps only the two current execution models and bounded outputs', () => {
  assert.deepEqual(Object.keys(CHECK_DISCOVERY), ['hostname', 'linux_server']);
  assert.equal(CHECK_DISCOVERY.hostname.name, 'External Exposure Check');
  assert.equal(CHECK_DISCOVERY.linux_server.name, 'One Server Security Check');
  assert.match(CHECK_DISCOVERY.hostname.next, /after you authorize/);
  assert.match(CHECK_DISCOVERY.linux_server.next, /operator collects locally/);
  assert.match(CHECK_DISCOVERY.linux_server.input, /ZIP and matching signature/);
  for (const copy of Object.values(CHECK_DISCOVERY)) {
    assert.match(copy.output, /report.*compare/);
    assert.match(copy.boundary, /not/);
    assert.doesNotMatch(JSON.stringify(copy), /wops auth|curl|installer|server is secure|compliant|workflow_class|collector fingerprint|registry digest/i);
  }
});
