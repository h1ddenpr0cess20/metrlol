import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as GFX from '../src/vendor/gfx/index.js';
import { buildMap, isFlat } from '../src/map.js';
import { drawStructures, STRUCTURES } from '../src/structures.js';
import { SURFACES } from '../src/surfaces.js';
import { placeBall } from '../src/physics.js';
import { createRun, STEP, stepRun } from '../src/run.js';
import { createTown, SIZE } from '../src/town.js';
import { HOME } from '../src/view.js';

const town = createTown();
const inside = (s, x, y, z, r = 0) => x > s.min[0] - r && x < s.max[0] + r && y > s.min[1] - r && y < s.max[1] + r && z > s.min[2] - r && z < s.max[2] + r;

/** The parts of town, the superhighway and the far side aside. */
const DISTRICTS = ['Portland Heights', 'The Alignment District', 'The Ivory Tower', 'The Pause Compound', 'The Timeline', 'Hype Valley', 'Brussels-sur-Mer', 'The Compute Farm'];

test('the town is all there: every tile laid, of a surface there is, and the same every time', () => {
  assert.equal(town.cols, SIZE);
  assert.equal(SIZE, 256);
  for (const c of town.cells) {
    assert.ok(c, 'no holes in the map');
    assert.ok(SURFACES[c.surface], `a surface called ${c.surface}`);
    for (const h of c.h) assert.ok(Number.isFinite(h) && h > -2 && h < 12);
  }
  const again = createTown();
  assert.deepEqual(again.cells.map((c) => c.h), town.cells.map((c) => c.h));
});

test('it starts on safe ground at home, with an whetstone in the garden', () => {
  assert.ok(town.isSafe(town.start.x, town.start.z));
  assert.equal(town.districtAt(town.start.x, town.start.z).name, 'Portland Heights');
  const home = town.stones.find((p) => p.name === 'Home');
  assert.ok(Math.hypot(home.x - town.start.x, home.z - town.start.z) < 6);
});

test('42 golden GPUs, each with its own name, each somewhere on the map and not inside anything', () => {
  assert.equal(town.gpus.length, 42);
  assert.equal(new Set(town.gpus.map((g) => g.name)).size, 42);
  for (const g of town.gpus) {
    const y = (g.y ?? town.heightAt(g.x, g.z)) + 0.42;
    assert.notEqual(town.heightAt(g.x, g.z), null, g.name);
    for (const s of town.solids) assert.ok(!inside(s, g.x, y, g.z, 0.1), `${g.name} is inside something`);
    for (const c of town.cylinders) assert.ok(!(Math.hypot(g.x - c.x, g.z - c.z) < c.r + 0.1 && y > c.y0 && y < c.y1), `${g.name} is inside something round`);
  }
});

test('every part of town has golden GPUs in it, and every golden GPU is in one', () => {
  for (const g of town.gpus) assert.ok(town.districtAt(g.x, g.z), g.name);
  const counts = new Map();
  for (const g of town.gpus) {
    const d = town.districtAt(g.x, g.z).name;
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  for (const d of DISTRICTS) assert.ok(counts.get(d) >= 3, `${d} has ${counts.get(d) ?? 0}`);
});

test('every part of town has a whetstone in it', () => {
  const have = new Set(town.stones.map((s) => town.districtAt(s.x, s.z).name));
  for (const d of DISTRICTS) assert.ok(have.has(d), d);
});

test('the likes lie on the map, clear of anything solid', () => {
  assert.ok(town.likes.length > 400);
  for (const s of town.likes) {
    assert.notEqual(town.heightAt(s.x, s.z), null);
    const y = (s.y ?? town.heightAt(s.x, s.z)) + 0.32;
    for (const b of town.solids) assert.ok(!inside(b, s.x, y, s.z), `like at ${s.x},${s.z}`);
    for (const c of town.cylinders) assert.ok(!(Math.hypot(s.x - c.x, s.z - c.z) < c.r && y > c.y0 && y < c.y1), `like at ${s.x},${s.z} is inside something round`);
  }
});

test('whetstones stand on level ground with room round them', () => {
  assert.ok(town.stones.length >= 8);
  for (const p of town.stones) {
    const c = town.cell(Math.floor(p.x), Math.floor(p.z));
    assert.ok(isFlat(c), p.name);
    for (const s of town.solids) assert.ok(!inside(s, p.x, c.h[0] + 0.4, p.z, 0.4), `${p.name} is crowded`);
  }
});

test('a fence all the way round: nothing gets off the map', () => {
  const edges = [[0.1, 60], [SIZE - 0.1, 60], [60, 0.1], [60, SIZE - 0.1], [0.1, 0.1], [0.1, 200], [200, SIZE - 0.1]];
  for (const [x, z] of edges) {
    const y = town.heightAt(x, z) + 0.5;
    assert.ok(town.solids.some((s) => inside(s, x, y, z)), `no fence at ${x},${z}`);
  }
});

test('the traffic drives on roads', () => {
  const roadish = new Set(['road', 'highway', 'dirt', 'forecourt', 'concrete']);
  for (const r of town.roads) {
    for (const [x, z] of r.points) {
      const c = town.cell(Math.floor(x), Math.floor(z));
      if (r.open && !c) continue;
      assert.ok(roadish.has(c.surface), `a ${r.kind} loop goes over ${c.surface} at ${x},${z}`);
    }
  }
});

test('stamps come down on level tiles in a lane; vents, lifts and reels are on the map', () => {
  assert.ok(town.stamps.length >= 4);
  for (const p of town.stamps) {
    const c = town.cell(p.x, p.z);
    assert.ok(isFlat(c), `stamp at ${p.x},${p.z} on a slope`);
    // The lane: walls either side of it, so there is no getting round the stamp.
    const [a, b] = p.facing === 'z' ? [town.cell(p.x - 1, p.z), town.cell(p.x + 1, p.z)] : [town.cell(p.x, p.z - 1), town.cell(p.x, p.z + 1)];
    for (const n of [a, b]) assert.ok(n.h[0] > c.h[0] + 1, `stamp at ${p.x},${p.z} has a way round it`);
  }
  for (const f of town.flares) assert.notEqual(town.heightAt(f.x + 0.5, f.z + 0.5), null);
  for (const d of town.reels) assert.notEqual(town.heightAt(d.x, d.z), null);
  for (const l of town.lifts) assert.ok(l.period > 0 && l.to.some((v) => v !== 0));
});

test('every prop is one that can be drawn, and draws', () => {
  for (const p of town.props) assert.ok(STRUCTURES.includes(p.type), p.type);
  const drawn = drawStructures(GFX, town, buildMap(town).light);
  assert.ok(drawn.group.children.length > 0);
  // The signs are there: placards on both faces, screens, and the cookie banner.
  assert.ok(town.props.filter((p) => p.type === 'placard').length >= 50);
  assert.ok(town.props.filter((p) => p.type === 'screen').length >= 8);
  assert.ok(town.props.some((p) => p.type === 'billboard' && /COOKIES/.test(p.text)));
});

test('nothing solid stands in the road', () => {
  const road = (x, z) => ['road', 'highway'].includes(town.cell(Math.floor(x), Math.floor(z))?.surface);
  for (const m of town.models) {
    if (['sedan', 'hatchback', 'pickup', 'junker'].includes(m.name)) continue;
    assert.ok(!road(m.x, m.z), `${m.name} at ${m.x},${m.z}`);
  }
  for (const c of town.cylinders) assert.ok(!road(c.x, c.z) || c.y0 > 2, `post at ${c.x},${c.z}`);
  // Solids over the road only up out of the traffic's way (a footbridge's railings), or the tunnel mouths and the barrier at the ends.
  for (const s of town.solids) {
    const cx = (s.min[0] + s.max[0]) / 2, cz = (s.min[2] + s.max[2]) / 2;
    // (A wall along the road's edge, on the line between the tiles, isn't in it.)
    const inside = [[s.min[0] + 0.01, s.min[2] + 0.01], [s.max[0] - 0.01, s.max[2] - 0.01]].every(([x, z]) => road(x, z));
    if (!inside || s.min[1] >= 2) continue;
    assert.ok(s.max[2] <= 4 || s.min[2] >= town.rows - 4, `solid at ${cx},${cz}`);
  }
});

test('no oil field: the city is not made of petroleum', () => {
  const names = new Set(town.models.map((m) => m.name));
  for (const n of ['gaspump', 'pumpframe', 'drum']) assert.ok(!names.has(n), n);
  for (const t of ['derrick', 'stack', 'piperack', 'sphere']) assert.ok(!town.props.some((p) => p.type === t), t);
  const oil = town.cells.filter((c) => c.surface === 'oil').length;
  assert.ok(oil < 60, `${oil} tiles of oil`);
});

test('the skate park: a bowl near two deep that the ball can roll out of, a half pipe with a deck each end', () => {
  assert.ok(town.heightAt(42, 44.5) < -1.8, 'deep');
  for (const [push, name] of [[[1, 0], 'out the shallow end'], [[0, -1], 'up the deep end']]) {
    const run = createRun(GFX, { map: town, foes: false });
    placeBall(run.ball, 42, -1.9, 44.5);
    let out = false;
    for (let t = 0; t < 6 && !out; t += STEP) {
      stepRun(run, push, STEP);
      out = town.cell(Math.floor(run.ball.x), Math.floor(run.ball.z)).surface !== 'pool' || Math.hypot(run.ball.x - 42, run.ball.z - 44.5) > 6.5;
    }
    assert.ok(out, name);
  }
  assert.ok(town.heightAt(56.5, 42) > 1.8 && town.heightAt(73.5, 42) > 1.8 && town.heightAt(65, 42) < 0.2);
});

test('signs stand where they can be read: level, out in the open, nothing in front of them, a screen on its wall', () => {
  const near = (p, side, w, bottom, top) => {
    const f = ((p.facing ?? 0) % 4 + 4) % 4, n = [Math.round(Math.sin(f * Math.PI / 2)), Math.round(Math.cos(f * Math.PI / 2))];
    // The ground in front of the face, out to 1.6 tiles and as wide as the sign.
    const fx = [p.x + n[0] * side * 0.15, p.x + n[0] * side * 1.6].sort((a, b) => a - b), fz = [p.z + n[1] * side * 0.15, p.z + n[1] * side * 1.6].sort((a, b) => a - b);
    const rx = [Math.min(fx[0], p.x - Math.abs(n[1]) * w / 2), Math.max(fx[1], p.x + Math.abs(n[1]) * w / 2)];
    const rz = [Math.min(fz[0], p.z - Math.abs(n[0]) * w / 2), Math.max(fz[1], p.z + Math.abs(n[0]) * w / 2)];
    const over = (x0, z0, x1, z1, y1) => x1 > rx[0] && x0 < rx[1] && z1 > rz[0] && z0 < rz[1] && y1 > Math.min(top, bottom + 0.4);
    return town.cylinders.some((q) => over(q.x - q.r, q.z - q.r, q.x + q.r, q.z + q.r, q.y1))
      || town.solids.some((s) => (s.tag == null || town.breakables[s.tag]?.prop !== p) && over(s.min[0], s.min[2], s.max[0], s.max[2], s.max[1]))
      // ...and no wall or bank right up against it.
      || [-0.4, 0, 0.4].some((k) => town.heightAt(p.x + n[0] * side * 0.5 + Math.abs(n[1]) * k * w, p.z + n[1] * side * 0.5 + Math.abs(n[0]) * k * w) > bottom);
  };
  for (const p of town.props.filter((q) => q.type === 'placard')) {
    const f = ((p.facing ?? 0) % 4 + 4) % 4, along = f % 2 ? [0, 1] : [1, 0];
    for (const s of [-1, 1]) assert.ok(town.heightAt(p.x + along[0] * s * (p.w / 2 - 0.1), p.z + along[1] * s * (p.w / 2 - 0.1)) <= p.y + 0.05, `"${p.text}" sinks into the ground`);
    for (const side of [1, -1]) assert.ok(!near(p, side, p.w, p.y + 0.5, p.y + 0.5 + p.h), `something in front of "${p.text}"`);
  }
  const screens = town.props.filter((q) => q.type === 'screen');
  for (const p of screens) {
    const f = ((p.facing ?? 0) % 4 + 4) % 4, n = [Math.round(Math.sin(f * Math.PI / 2)), Math.round(Math.cos(f * Math.PI / 2))];
    for (const s of [-0.45, 0, 0.45]) {
      const x = p.x + n[1] * s * p.w, z = p.z - n[0] * s * p.w;
      assert.ok(town.heightAt(x - n[0] * 0.3, z - n[1] * 0.3) >= p.y + p.h, `"${p.text}" hangs off its wall`);
    }
    assert.ok(!near(p, 1, p.w, p.y, p.y + p.h), `something in front of "${p.text}"`);
    // Seen from the way the camera starts (from the south-east), or there's another of it that is.
    assert.ok(f < 2 || screens.some((o) => o !== p && o.text === p.text && o.facing < 2), `"${p.text}" only faces away`);
  }
});

test('the signs can be seen from where the camera is: nothing stands between it and most of them, most of the time', () => {
  // The camera sits behind the ball, up and to the south-east; the ball here and there round each sign.
  const dir = [Math.sin(HOME.yaw) * Math.cos(HOME.pitch), Math.sin(HOME.pitch), Math.cos(HOME.yaw) * Math.cos(HOME.pitch)];
  const D = 10 * HOME.zoom;
  const crowns = town.models.filter((m) => m.name === 'tree' || m.name === 'pine').map((m) => ({ x: m.x, z: m.z, r: (m.name === 'tree' ? 1.2 : 1.05) * m.scale, y0: m.y + m.scale, y1: m.y + (m.name === 'tree' ? 3 : 3.75) * m.scale }));
  for (const p of town.props.filter((q) => q.type === 'placard' || (q.type === 'screen' && q.facing < 2))) {
    const f = ((p.facing ?? 0) % 4 + 4) % 4, n = [Math.round(Math.sin(f * Math.PI / 2)), Math.round(Math.cos(f * Math.PI / 2))], a = [n[1], -n[0]];
    const mid = p.type === 'screen' ? p.y + p.h / 2 : p.y + 0.5 + p.h / 2;
    const near = (x, z, r) => Math.abs(x - p.x) < 9 + r && Math.abs(z - p.z) < 9 + r;
    const cr = crowns.filter((c) => near(c.x, c.z, c.r)), cy = town.cylinders.filter((c) => near(c.x, c.z, c.r));
    const so = town.solids.filter((q) => (q.tag == null || town.breakables[q.tag]?.prop !== p) && q.max[0] > p.x - 9 && q.min[0] < p.x + 9 && q.max[2] > p.z - 9 && q.min[2] < p.z + 9);
    const hidden = (x, y, z) => (town.heightAt(x, z) ?? -9) > y || cr.some((c) => Math.hypot(x - c.x, z - c.z) < c.r && y > c.y0 && y < c.y1)
      || cy.some((c) => Math.hypot(x - c.x, z - c.z) < c.r && y > c.y0 && y < c.y1)
      || so.some((q) => x > q.min[0] && x < q.max[0] && z > q.min[2] && z < q.max[2] && y > q.min[1] && y < q.max[1]);
    let views = 0, bad = 0;
    for (const bx of [-4, 0, 4]) {
      for (const bz of [-4, 0, 4]) {
        const cam = [p.x + bx + dir[0] * D, (town.heightAt(p.x + bx, p.z + bz) ?? 0) + dir[1] * D, p.z + bz + dir[2] * D];
        const toward = (cam[0] - p.x) * n[0] + (cam[2] - p.z) * n[1];
        if (p.type === 'screen' && toward < 0) continue;
        const face = p.type === 'screen' ? 1 : Math.sign(toward) || 1;
        views++;
        let blocked = 0;
        for (const k of [-0.35, 0, 0.35]) {
          for (const dy of [-0.25, 0.25]) {
            const o = [p.x + a[0] * k * p.w + n[0] * face * 0.12, mid + dy * p.h, p.z + a[1] * k * p.w + n[1] * face * 0.12];
            const v = [cam[0] - o[0], cam[1] - o[1], cam[2] - o[2]], L = Math.hypot(...v);
            for (let s = 0.2; s < L - 0.5; s += 0.1) if (hidden(o[0] + (v[0] / L) * s, o[1] + (v[1] / L) * s, o[2] + (v[2] / L) * s)) { blocked++; break; }
          }
        }
        if (blocked >= 3) bad++;
      }
    }
    assert.ok(bad / views <= 0.25, `"${p.text}" is hidden in ${bad} of ${views} views`);
  }
});
