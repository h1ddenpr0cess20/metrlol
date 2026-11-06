import assert from 'node:assert/strict';
import { test } from 'node:test';

import { paintMetalReflections } from '../src/metal-room.js';

test('the town reflection room gets bright neutral softboxes without replacing its base lighting', () => {
  const painted = [];
  const stack = [];
  const ctx = {
    globalCompositeOperation: 'source-over',
    fillStyle: '',
    shadowColor: '',
    shadowBlur: 0,
    save() { stack.push({ fillStyle: this.fillStyle, shadowColor: this.shadowColor, shadowBlur: this.shadowBlur }); },
    restore() { Object.assign(this, stack.pop()); },
    fillRect(x, y, width, height) {
      painted.push({
        x, y, width, height, color: this.fillStyle,
        composite: this.globalCompositeOperation,
        blur: this.shadowBlur,
      });
    },
  };
  const room = { width: 1024, height: 512, getContext: (kind) => kind === '2d' ? ctx : null };

  assert.equal(paintMetalReflections(room), room);
  assert.equal(painted.length, 4, 'three broad cards and one reflection strip');
  assert.ok(painted.every((box) => box.composite === 'lighter'));
  assert.ok(painted.every((box) => box.width > 0 && box.height > 0 && box.blur > 0));
  assert.ok(painted.some((box) => box.color === 'rgba(255,255,255,0.88)'));
  assert.equal(ctx.globalCompositeOperation, 'source-over', 'restore the room painter compositing mode');
});

test('the reflection helper is safe without a browser canvas', () => {
  assert.equal(paintMetalReflections(null), null);
  const room = { width: 1, height: 1, getContext: () => null };
  assert.equal(paintMetalReflections(room), room);
});
