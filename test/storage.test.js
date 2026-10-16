import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createStorage } from '../src/storage.js';

const memory = () => {
  const data = new Map();
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => data.set(k, String(v)) };
};

test('remembers the golden GPUs found, the last whetstone, the time and the best', () => {
  const store = memory();
  const s = createStorage(store);
  assert.deepEqual(s.load(), { found: [], stone: null, time: 0, best: 0 });
  s.progress({ found: ['The free stuff table', 'The community garden', 'The free stuff table'], stone: 'Alignment Plaza', time: 120 });
  s.finished(900);
  s.finished(1200);
  const again = createStorage(store).load();
  assert.deepEqual(again.found, ['The free stuff table', 'The community garden']);
  assert.equal(again.stone, 'Alignment Plaza');
  assert.equal(again.time, 120);
  assert.equal(again.best, 900);
  const cleared = createStorage(store).clear();
  assert.deepEqual(cleared.found, []);
  assert.equal(cleared.best, 900);
});

test('plays on without storage, or with storage that throws or holds rubbish', () => {
  assert.deepEqual(createStorage(null).load(), { found: [], stone: null, time: 0, best: 0 });
  const angry = { getItem() { throw new Error('no'); }, setItem() { throw new Error('no'); } };
  assert.equal(createStorage(angry).finished(10).best, 10);
  assert.deepEqual(createStorage({ getItem: () => '{nope', setItem() {} }).load().found, []);
  assert.deepEqual(createStorage({ getItem: () => '{"found":"lots","time":-4,"best":"x","stone":3}', setItem() {} }).load(), { found: [], stone: null, time: 0, best: 0 });
});
