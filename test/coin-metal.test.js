import assert from 'node:assert/strict';
import { test } from 'node:test';

import { coinMetalAt } from '../src/coin-metal.js';

const DISTRICTS = [
  ['Portland Heights', 'copper'],
  ['The Alignment District', 'copper'],
  ['The Pause Compound', 'copper'],
  ['The Ivory Tower', 'silver'],
  ['The Timeline', 'silver'],
  ['Brussels-sur-Mer', 'silver'],
  ['Hype Valley', 'gold'],
  ['The Compute Farm', 'gold'],
  ['The Information Superhighway', 'gold'],
  ['The Far Side', 'gold'],
];

test('coin metal follows the pickup district', () => {
  for (const [name, expected] of DISTRICTS) {
    const map = { districtAt: () => ({ name }) };
    assert.equal(coinMetalAt(map, 12, 34), expected, name);
  }
});

test('an unmapped area falls back to copper', () => {
  assert.equal(coinMetalAt({ districtAt: () => null }, 0, 0), 'copper');
});
