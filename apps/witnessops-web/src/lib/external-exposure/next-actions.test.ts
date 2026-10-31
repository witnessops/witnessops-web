import assert from 'node:assert/strict';
import test from 'node:test';
import { snapshotFixture, cleanSnapshotFixture } from '../../../../../tests/external-exposure/fixture';
import { administratorTask, exposureNextActions } from './next-actions';
import { exampleExposureResult } from './example-result';
import { CHECK_IDS } from './contracts';

test('next actions preserve source order and separate follow-up from inconclusive collection', () => {
  const snapshot = snapshotFixture();
  const before = JSON.stringify(snapshot);
  const actions = exposureNextActions(snapshot.checks);
  assert.deepEqual(actions.map(action => action.check.check_id), [CHECK_IDS[1], CHECK_IDS[3], CHECK_IDS[4], CHECK_IDS[9]]);
  assert.equal(actions[0].followUp, snapshot.checks[1].recommendation);
  for (const action of actions.slice(1)) {
    assert.equal(action.label, 'Clarify this result');
    assert.match(action.followUp, /does not establish a configuration problem/);
    assert.notEqual(action.followUp, action.check.recommendation, 'Do not turn an inconclusive check into a repair instruction');
  }
  assert.equal(JSON.stringify(snapshot), before);
  assert.deepEqual(exposureNextActions(cleanSnapshotFixture().checks), []);
});

test('administrator handoff retains exact observation, status, source time and boundaries without raw network data', () => {
  const snapshot = snapshotFixture();
  const action = exposureNextActions(snapshot.checks)[0];
  const task = administratorTask(action, { hostname: snapshot.target, observedAt: snapshot.finished_at, example: false });
  for (const text of [snapshot.target, snapshot.finished_at, action.check.check_id, action.check.status, action.check.interpretation, ...action.check.evidence, ...action.check.limitations]) assert.ok(task.includes(text));
  assert.match(task, /No severity was assessed/);
  assert.match(task, /does not authorize a change or a new check/);
  assert.doesNotMatch(task, /93\.184\.216\.34|SYNTHETIC EXAMPLE/);
});

test('example is a labelled presentation with no collection identity or admitted report', () => {
  assert.deepEqual(exampleExposureResult.checks.map(check => check.check_id), CHECK_IDS);
  assert.equal(exampleExposureResult.finished_at, null);
  assert.equal(exampleExposureResult.started_at, null);
  assert.equal('usage' in exampleExposureResult, false);
  assert.equal('network' in exampleExposureResult, false);
  for (const action of exposureNextActions(exampleExposureResult.checks)) {
    const task = administratorTask(action, { hostname: exampleExposureResult.target, observedAt: null, example: true });
    assert.match(task, /^SYNTHETIC EXAMPLE/);
    assert.match(task, /Not observed — illustrative example/);
    assert.match(task, /not an observation of example.com/);
    assert.doesNotMatch(task, /sha256:|Snapshot data validation: Passed|2026-/);
  }
});
