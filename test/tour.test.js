import assert from 'node:assert/strict';
import { test } from 'node:test';

import { drive } from './helpers/autopilot.js';
import { TOUR } from './helpers/tour.js';

test('the autopilot finds every golden GPU in one go, without being blunted', () => {
  const result = drive(TOUR);
  assert.ok(result.finished, `stuck: ${JSON.stringify(result.stuck)}`);
  assert.equal(result.losses.length, 0, JSON.stringify(result.losses));
  const golden = result.run.gpus.map((g) => g.name);
  assert.deepEqual([...result.found].sort(), [...golden].sort());
  for (const leg of TOUR.filter((l) => l.expect)) assert.ok(result.found.includes(leg.expect), leg.expect);
  assert.ok(result.time < 2400, `took ${result.time.toFixed(0)}s`);
});
