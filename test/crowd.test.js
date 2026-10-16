import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as GFX from '../src/vendor/gfx/index.js';
import { CAST } from '../src/cast/index.js';
import { bake, createModel } from '../src/cast/model.js';
import { FOES } from '../src/foes.js';
import { TownMap } from '../src/map.js';
import { placeBall } from '../src/physics.js';
import { QUIPS, horizon, say } from '../src/quips.js';
import { COMBO, createRun, SPIKES, STEP, stepRun } from '../src/run.js';
import { createTown } from '../src/town.js';
import { resolveImpact } from '../src/smash.js';

/** A level yard with one pauser standing 6 tiles down the +x road from the start. */
function yard(...foes) {
  const m = new TownMap({ name: 'yard', cols: 90, rows: 30 });
  m.flat(0, 0, 90, 30, 0, { surface: 'concrete' });
  m.start = { x: 3, z: 10 };
  for (const [kind, x, z] of foes) m.foe(kind, x, z, { range: 0 });
  m.district('Yard', 0, 0, 90, 30, '#888');
  return m;
}

/** Roll along +x at `speed`, holding it there, for `seconds` or until something is smashed; returns every step's output. */
function rollAt(run, speed, seconds) {
  const outs = [];
  for (let t = 0; t < seconds; t += STEP) {
    const b = run.ball;
    outs.push(stepRun(run, [Math.max(-1, Math.min(1, (speed - b.vx) * 0.9)), -b.vz], STEP));
  }
  return outs;
}

test('every foe is somebody the cast can be sculpted as', () => {
  for (const [kind, f] of Object.entries(FOES)) {
    assert.ok(CAST[f.model], `${kind} needs ${f.model}`);
    assert.ok(f.name && f.blurb && f.shout, kind);
    assert.ok(f.toughness > 0 && f.power > 0 && f.hype > 0 && f.radius > 0 && f.speed > 0, kind);
  }
});

test('the two new people bake and move', () => {
  for (const name of ['pauser', 'eurocrat']) {
    const data = bake(CAST[name], { detail: 0.5 });
    assert.ok(data.count > 500 && data.count <= CAST[name].budget, `${name}: ${data.count} vertices`);
    const m = createModel(GFX, CAST[name], { detail: 0.5 });
    for (const clip of ['idle', 'walk', 'attack', 'ko']) m.pose({ clip, t: 0.3, time: 1.2, seed: 1, speed: 1 });
  }
});

test('the city is full of people, none of them inside anything or on a roof', () => {
  const town = createTown();
  assert.ok(town.foes.length >= 90, `${town.foes.length} people`);
  for (const f of town.foes) {
    assert.ok(FOES[f.kind], f.kind);
    const h = town.heightAt(f.x, f.z);
    assert.notEqual(h, null, `${f.kind} at ${f.x},${f.z}`);
    for (const s of town.solids) {
      const inside = f.x > s.min[0] && f.x < s.max[0] && f.z > s.min[2] && f.z < s.max[2] && h + 0.3 > s.min[1] && h + 0.3 < s.max[1];
      assert.ok(!inside, `${f.kind} at ${f.x.toFixed(1)},${f.z.toFixed(1)} is inside something`);
    }
  }
  // Every side of the argument turns up.
  const kinds = new Set(town.foes.map((f) => f.kind));
  for (const k of ['pauser', 'doomer', 'altruist', 'rationalist', 'anarchist', 'eurocrat', 'striker', 'accelerationist', 'replyguy', 'prophet']) assert.ok(kinds.has(k), k);
});

test('fast enough, a pauser is smashed and thrown clear; the ball goes on at speed', () => {
  const run = createRun(GFX, { map: yard(['pauser', 12.5, 10.5]) });
  const outs = rollAt(run, 8, 2.5);
  const smash = outs.flatMap((o) => o.smashes);
  assert.equal(smash.length, 1);
  assert.ok(['smash', 'crit'].includes(smash[0].grade), smash[0].grade);
  assert.ok(run.cred >= FOES.pauser.hype);
  assert.equal(run.smashed, 1);
  assert.equal(run.spikes, SPIKES, 'a smash costs nothing');
  assert.ok(run.ball.x > 14, 'it carries on through');
  assert.ok(run.crowd.foes[0].dead);
});

test('too slowly, it only bounces off, and costs some spikes', () => {
  const run = createRun(GFX, { map: yard(['rationalist', 6.5, 10.5]) });
  const outs = rollAt(run, 1.6, 2.2);
  assert.equal(outs.flatMap((o) => o.smashes).length, 0);
  assert.ok(outs.flatMap((o) => o.knocks).length >= 1);
  assert.ok(run.spikes < SPIKES, `${run.spikes}`);
  assert.equal(run.smashed, 0);
});

test('they come at the ball when it comes near, and shout once', () => {
  const run = createRun(GFX, { map: yard(['doomer', 8.5, 10.5]) });
  const f = run.crowd.foes[0];
  f.range = 8;
  const start = f.ball.x;
  const outs = [];
  for (let t = 0; t < 1.5; t += STEP) outs.push(stepRun(run, [0, 0], STEP));
  assert.ok(f.ball.x < start - 0.3, 'it walks toward the ball');
  assert.equal(outs.flatMap((o) => o.shouts).length, 1);
});

test('smashes one after another build a combo that multiplies the cred', () => {
  const run = createRun(GFX, { map: yard(['pauser', 11.5, 10.5], ['pauser', 14.5, 10.5], ['pauser', 17.5, 10.5]) });
  const outs = rollAt(run, 9, 3);
  const hits = outs.flatMap((o) => o.smashes);
  assert.equal(hits.length, 3);
  assert.equal(run.combo, 3);
  assert.equal(run.bestCombo, 3);
  const base = FOES.pauser.hype;
  assert.ok(run.cred > base * 3, `${run.cred}`);
  assert.ok(COMBO.most >= 3);
});

test('speed decides it, as in Metroll: toughness smashes, half of it bonks, less taps', () => {
  const foe = FOES.altruist;
  assert.equal(resolveImpact({ speed: foe.toughness, foe }).grade, 'smash');
  assert.equal(resolveImpact({ speed: Math.max(13, foe.toughness * 1.7), foe }).grade, 'crit');
  assert.equal(resolveImpact({ speed: foe.toughness * 0.6, foe }).grade, 'bonk');
  assert.equal(resolveImpact({ speed: 0.5, foe }).grade, 'tap');
});

test('a smashed foe is gone after a moment, and nobody is simulated far from the ball', () => {
  const run = createRun(GFX, { map: yard(['pauser', 12.5, 10.5], ['doomer', 78.5, 27.5]) });
  const far = run.crowd.foes[1];
  const was = [far.ball.x, far.ball.z];
  placeBall(run.ball, 3.5, 0.36, 10.5);
  rollAt(run, 8, 4);
  assert.ok(run.crowd.foes[0].gone);
  assert.deepEqual([far.ball.x, far.ball.z], was);
});

test('the time horizon doubles every few smashes, and the ball always has something to say', () => {
  assert.equal(horizon(0), '1 min');
  assert.equal(horizon(6), '2 min');
  assert.equal(horizon(12), '4 min');
  assert.match(horizon(60), /hr$/);
  assert.match(horizon(200), /yr$/);
  for (const k of Object.keys(QUIPS).filter((k) => k !== 'district')) assert.ok(say(k).length > 3, k);
  for (const d of createTown().districts) assert.ok(say('district', { district: d.name }).length > 3, d.name);
});
