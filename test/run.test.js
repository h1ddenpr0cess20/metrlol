import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as GFX from '../src/vendor/gfx/index.js';
import { TownMap } from '../src/map.js';
import { placeBall } from '../src/physics.js';
import { SPIKES, createRun, putBack, respawn, STEP, stepRun } from '../src/run.js';

/** A little test yard: level ground, a tar pit, a vent, a rubber stamp, a tower to fall off, a road. */
function yard() {
  const m = new TownMap({ name: 'yard', cols: 40, rows: 30 });
  m.flat(0, 0, 40, 30, 0, { surface: 'concrete' });
  m.start = { x: 3, z: 3 };
  m.flat(10, 2, 3, 3, -0.6, { surface: 'tar' });
  m.flat(20, 2, 2, 2, 6, { surface: 'concrete' });
  m.whetstone("Yard", 5.5, 10.5);
  m.flare(30, 3);
  m.stamp(30, 12, { period: 3 });
  m.flat(0, 20, 40, 4, 0, { surface: 'road' });
  m.road([[1, 22], [39, 22]], { cars: 1, speed: 6, open: true, brakes: false });
  m.gpu('Shiny', 3.5, 14.5);
  m.likeLine(3.5, 6, 3.5, 8, 3);
  m.district('Yard', 0, 0, 40, 30, '#888');
  return m;
}

const roll = (run, seconds, push = [0, 0]) => {
  const outs = [];
  for (let t = 0; t < seconds; t += STEP) outs.push(stepRun(run, push));
  return outs;
};

test('it starts whole, at the start, and knows where it is', () => {
  const run = createRun(GFX, { map: yard() });
  assert.equal(run.spikes, SPIKES);
  const outs = roll(run, 0.5);
  assert.equal(outs.find((o) => o.district)?.district.name, 'Yard');
  assert.ok(Math.abs(run.ball.x - 3.5) < 0.01);
});

test('rolling over likes collects them, and a golden GPU is found', () => {
  const run = createRun(GFX, { map: yard() });
  const outs = roll(run, 3, [0, 1]);
  assert.equal(outs.flatMap((o) => o.picked).length, 3);
  assert.equal(outs.find((o) => o.gpu)?.gpu.name, 'Shiny');
  assert.ok(run.gpus[0].got);
});

test('golden GPUs already found stay found', () => {
  const run = createRun(GFX, { map: yard(), found: ['Shiny'] });
  assert.ok(run.gpus[0].got);
});

test('a hard landing cracks the spikes; a long drop pops it more than a short one', () => {
  const hurt = (y) => {
    const run = createRun(GFX, { map: yard() });
    placeBall(run.ball, 25, y, 25);
    return roll(run, 2).reduce((n, o) => n + o.hurt, 0);
  };
  assert.equal(hurt(1.5), 0, 'a little drop is nothing');
  assert.ok(hurt(4) > 0);
  assert.ok(hurt(9) > hurt(5));
});

test('the whetstone tops the spikes up and is where it comes back to', () => {
  const run = createRun(GFX, { map: yard() });
  run.spikes = 30;
  placeBall(run.ball, 5.5, 0.4, 10.5);
  const outs = roll(run, 0.3);
  assert.ok(outs.some((o) => o.sharpened));
  assert.equal(run.spikes, SPIKES);
  placeBall(run.ball, 30, 0.4, 25);
  run.spikes = 0;
  respawn(run);
  assert.ok(Math.hypot(run.ball.x - 5.5, run.ball.z - 10.5) < 0.01);
  assert.equal(run.spikes, SPIKES);
});

test('tar swallows it, and it goes back to the last firm ground', () => {
  const run = createRun(GFX, { map: yard() });
  placeBall(run.ball, 6.5, 0.4, 3.5);
  const outs = roll(run, 4, [1, 0]);
  assert.equal(outs.find((o) => o.outcome)?.outcome, 'sunk');
  putBack(run);
  assert.ok(run.ball.x < 10, 'back on firm ground');
  assert.ok(run.map.isSafe(Math.floor(run.ball.x), Math.floor(run.ball.z)));
});

test('a hot take out of a vent burns it and throws it up', () => {
  const run = createRun(GFX, { map: yard() });
  placeBall(run.ball, 30.5, 0.36, 3.5);
  run.time = 2.9;
  const outs = roll(run, 0.5);
  const hit = outs.find((o) => o.hits.includes('flare'));
  assert.ok(hit, 'burned');
  assert.ok(run.spikes < SPIKES && run.spikes > 0);
});

test('a stamp coming down on it pops it outright', () => {
  const run = createRun(GFX, { map: yard() });
  placeBall(run.ball, 30.5, 0.36, 12.5);
  // Half way through its stroke the stamp is at the top, about to come down.
  run.time = 1.5;
  const outs = roll(run, 2);
  assert.equal(outs.find((o) => o.outcome)?.outcome, 'squashed');
});

test('a car knocks it about and cracks the spikes', () => {
  const run = createRun(GFX, { map: yard() });
  const car = run.traffic.cars[0];
  placeBall(run.ball, car.x + 3, 0.36, 22);
  const outs = roll(run, 1.5);
  assert.ok(outs.some((o) => o.hits.includes('car')), 'hit');
  assert.ok(run.ball.x > car.x, 'shoved along ahead of it');
  assert.ok(run.spikes < SPIKES);
});

test('enough knocks and it pops', () => {
  const run = createRun(GFX, { map: yard() });
  run.spikes = 5;
  placeBall(run.ball, 25, 8, 25);
  const outs = roll(run, 2);
  assert.equal(outs.find((o) => o.outcome)?.outcome, 'blunted');
});

test('accelerating gets a higher top speed, drains the meter, and refills when let go', () => {
  const top = (boost) => {
    const run = createRun(GFX, { map: yard(), foes: false });
    let fastest = 0;
    for (let t = 0; t < 2; t += STEP) {
      stepRun(run, [0, 1], STEP, { boost });
      fastest = Math.max(fastest, Math.hypot(run.ball.vx, run.ball.vz));
    }
    return { fastest, run };
  };
  const plain = top(false), fast = top(true);
  assert.ok(fast.fastest > plain.fastest * 1.3, `${fast.fastest} v ${plain.fastest}`);
  assert.ok(fast.run.accel < 1 && plain.run.accel === 1);
  const run = fast.run;
  for (let t = 0; t < 6; t += STEP) stepRun(run, [0, 0], STEP, { boost: false });
  assert.equal(run.accel, 1);
});

test('run the meter dry and it can\'t be used again until it has recovered a little', () => {
  const run = createRun(GFX, { map: yard(), foes: false });
  let on = 0;
  for (let t = 0; t < 4; t += STEP) on += stepRun(run, [0, 1], STEP, { boost: true }).accelerating ? STEP : 0;
  assert.ok(on > 2.5 && on < 3.5, `${on}s of acceleration`);
  assert.ok(run.winded);
  assert.equal(stepRun(run, [0, 1], STEP, { boost: true }).accelerating, false);
});
