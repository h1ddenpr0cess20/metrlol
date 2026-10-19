import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as GFX from '../src/vendor/gfx/index.js';
import { CAST } from '../src/cast/index.js';
import { bake, createModel } from '../src/cast/model.js';
import { BOARD_DETAIL, FOES } from '../src/foes.js';

test('everybody in the cast is somebody, and everybody bakes within budget and moves', () => {
  const used = new Set(Object.values(FOES).map((f) => f.model));
  for (const name of Object.keys(CAST)) assert.ok(used.has(name), `${name} is sculpted but nobody is cast as them`);
  for (const [name, def] of Object.entries(CAST)) {
    const data = bake(def, { detail: BOARD_DETAIL });
    assert.ok(data.count > 300 && data.count <= (def.budget ?? 9000), `${name}: ${data.count} vertices`);
    const m = createModel(GFX, def, { detail: BOARD_DETAIL });
    for (const clip of ['idle', 'walk', 'attack', 'ko']) m.pose({ clip, t: 0.3, time: 1.2, seed: 1, speed: 1 });
  }
});
