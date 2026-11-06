import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as GFX from 'madness-engine/gfx';
import { appearanceModelFor, appearanceVariantsFor, BASE_CAST, CAST } from '../src/cast/index.js';
import { bake, createModel } from 'madness-engine/models/model';
import { BOARD_DETAIL, FOES } from '../src/foes.js';

test('everybody in the cast is somebody, and everybody bakes within budget and moves', () => {
  const used = new Set(Object.values(FOES).map((f) => f.model));
  for (const name of Object.keys(BASE_CAST)) assert.ok(used.has(name), `${name} is sculpted but nobody is cast as them`);
  for (const [name, def] of Object.entries(BASE_CAST)) {
    const data = bake(def, { detail: BOARD_DETAIL });
    assert.ok(data.count > 300 && data.count <= (def.budget ?? 9000), `${name}: ${data.count} vertices`);
    const m = createModel(GFX, def, { detail: BOARD_DETAIL });
    const clips = typeof def.variant === 'function' ? ['idle', 'walk', 'run', 'jump', 'attack', 'ko'] : ['idle', 'walk', 'attack', 'ko'];
    for (const clip of clips) m.pose({ clip, t: 0.3, time: 1.2, seed: 1, speed: 1 });
  }
});


test('the refreshed roles use the newer character assets that fit them', () => {
  assert.equal(FOES.crossingguard.model, 'crossingguard');
  assert.equal(FOES.recruiter.model, 'officewoman');
  assert.equal(FOES.dpo.model, 'officeguy');
  assert.equal(FOES.doorman.model, 'bouncer');
  assert.equal(FOES.newsletter, undefined, 'the public foe key remains newsletter');
  assert.equal(FOES.newsletter.model, 'mailcarrier');
});


test('human cast members have seeded skin, eye, hair and clothing appearances', () => {
  for (const name of Object.keys(BASE_CAST)) {
    const base = BASE_CAST[name];
    if (typeof base.variant !== 'function' || typeof base.palette !== 'function') continue;
    const names = appearanceVariantsFor(name);
    assert.equal(names.length, 4, name);
    assert.equal(names[0], name);
    const palettes = names.map((variant) => {
      assert.ok(CAST[variant], variant + ' is registered for the bake worker');
      return CAST[variant].palette();
    });
    assert.ok(new Set(palettes.map((p) => p.skin)).size > 1, name + ' skin tones vary');
    assert.ok(new Set(palettes.map((p) => p.eyes)).size > 1, name + ' eye colours vary');
    if (base.palette().hair !== null) assert.ok(new Set(palettes.map((p) => p.hair)).size > 1, name + ' hair colours vary');
    if (Object.keys(base.palette().look).length) assert.ok(new Set(palettes.map((p) => JSON.stringify(p.look))).size > 1, name + ' clothing colours vary');
    assert.equal(appearanceModelFor(name, 19), appearanceModelFor(name, 19));
  }
});

test('newer human role models can pose the run and jump clips', () => {
  for (const name of ['officewoman', 'officeguy', 'crossingguard', 'mailcarrier', 'bouncer']) {
    const def = BASE_CAST[name];
    assert.equal(typeof def.variant, 'function', name + ' is a person model');
    const model = createModel(GFX, CAST[appearanceVariantsFor(name)[1]], { detail: BOARD_DETAIL });
    model.pose({ clip: 'run', t: 0.2, time: 1.1, seed: 7, speed: 1 });
    model.pose({ clip: 'jump', t: 0.2, time: 1.4, seed: 7, speed: 1 });
  }
});
