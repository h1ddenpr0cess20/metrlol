import { createKit } from 'madness-engine/kit';
import { linearRGB } from 'madness-engine/color';
import { createBuildings } from './buildings.js';
import { createPlaced } from './placed.js';
import { drawStructures, seams } from './structures.js';
import { surfaceMaterial, wallMaterial } from 'madness-engine/textures/town/textures.metrlol';

/**
 * The world as it is drawn: the tiles (a mesh per surface for each square
 * of the map, each with its own painted texture), their walls, the paint on
 * the roads, the decks, every prop, and the land beyond the bank — scrub
 * running out to the horizon, with pylons, wind turbines, data centres and
 * a water tower on it, so the city sits in a country and not in a void.
 */

export function createWorldMeshes(GFX, map, built) {
  const group = new GFX.Group();
  group.name = 'world';

  const geometry = (parts) => {
    const g = new GFX.BufferGeometry();
    g.setAttribute('position', new GFX.BufferAttribute(parts.position, 3));
    g.setAttribute('normal', new GFX.BufferAttribute(parts.normal, 3));
    g.setAttribute('color', new GFX.BufferAttribute(parts.color, 3));
    if (parts.uv) g.setAttribute('uv', new GFX.BufferAttribute(parts.uv, 2));
    g.computeBoundingSphere();
    return g;
  };

  // The ground and the walls in squares of the map, so what's out of view isn't drawn.
  for (const [surface, all] of built.tops) {
    for (const parts of chunks(all)) {
      const mesh = new GFX.Mesh(geometry(parts), surfaceMaterial(GFX, surface));
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      mesh.name = `ground-${surface}`;
      group.add(mesh);
    }
  }
  for (const [name, all] of built.walls) {
    for (const parts of chunks(all)) {
      const mesh = new GFX.Mesh(geometry(parts), wallMaterial(GFX, name));
      mesh.receiveShadow = true;
      mesh.castShadow = true;
      mesh.name = `walls-${name}`;
      group.add(mesh);
    }
  }

  // Road paint: flat quads just above the ground.
  const paint = { position: [], normal: [], color: [] };
  for (const m of map.marks) {
    const y = (map.heightAt(m.x + m.w / 2, m.z + m.d / 2) ?? 0) + 0.012;
    const l = built.light(m.x + m.w / 2, y, m.z + m.d / 2);
    const c = linearRGB(m.colour).map((v, i) => v * 0.8 * l[i]);
    const quad = [[m.x, m.z], [m.x, m.z + m.d], [m.x + m.w, m.z], [m.x + m.w, m.z], [m.x, m.z + m.d], [m.x + m.w, m.z + m.d]];
    for (const [x, z] of quad) {
      paint.position.push(x, y, z);
      paint.normal.push(0, 1, 0);
      paint.color.push(...c);
    }
  }
  if (paint.position.length) {
    const g = geometry({ position: new Float32Array(paint.position), normal: new Float32Array(paint.normal), color: new Float32Array(paint.color) });
    const lines = new GFX.Mesh(g, new GFX.MeshStandardMaterial({ name: 'road-paint', vertexColors: true, roughness: 0.6 }));
    lines.receiveShadow = true;
    group.add(lines);
  }

  // Decks, props and the country round about, in one kit; roofs over places the ball goes, each on its own.
  const kit = createKit(GFX);
  const roofKits = [];
  for (const d of map.decks) {
    const k = d.roof ? createKit(GFX) : kit;
    k.slab(d.x, d.h - d.thick, d.z, d.x + d.w, d.h, d.z + d.d, d.colour);
    k.slab(d.x, d.h - d.thick - 0.12, d.z + 0.1, d.x + d.w, d.h - d.thick, d.z + d.d - 0.1, '#5a6068');
    // A roof: standing seams across it, and flashing round its edge.
    if (d.roof) seams(k, d.x, d.z, d.x + d.w, d.z + d.d, d.h, d.colour);
    if (d.roof) { k.bounds = { x0: d.x, z0: d.z, x1: d.x + d.w, z1: d.z + d.d, y: d.h - d.thick }; roofKits.push(k); }
  }
  const structures = drawStructures(GFX, map, built.light);
  roofKits.push(...structures.roofs);
  group.add(structures.group);
  country(kit, map);
  group.add(kit.build({ name: 'decks-and-country' }));
  group.add(land(GFX, map));
  const placed = createPlaced(GFX, map, built.light);
  group.add(placed);
  group.add(createBuildings(GFX, map));

  const occluders = roofKits.map((k) => {
    const mesh = new GFX.Group();
    for (const [finish, g] of Object.entries(k.geometries())) {
      const m = new GFX.Mesh(g, new GFX.MeshStandardMaterial({ name: `roof-${finish}`, vertexColors: true, roughness: 0.7, transparent: true, opacity: 1 }));
      m.castShadow = true;
      m.receiveShadow = true;
      mesh.add(m);
    }
    group.add(mesh);
    return { mesh, bounds: k.bounds, fade: 1 };
  });

  /** Roofs fade away while the ball is under them, and come back after. */
  group.userData.uncover = (ball, dt) => {
    for (const o of occluders) {
      const b = o.bounds;
      const under = ball.x > b.x0 - 0.6 && ball.x < b.x1 + 0.6 && ball.z > b.z0 - 0.6 && ball.z < b.z1 + 0.6 && ball.y < b.y;
      o.fade += ((under ? 0.08 : 1) - o.fade) * Math.min(1, dt * 6);
      for (const m of o.mesh.children) {
        m.material.opacity = o.fade;
        m.material.depthWrite = o.fade > 0.95;
      }
    }
  };
  /** A prop smashed: gone from view. */
  group.userData.smash = (item) => {
    if (item.kind === 'model') placed.userData.remove(item.model);
    else if (structures.placards.has(item.prop)) structures.placards.get(item.prop).visible = false;
  };
  /** Every prop back where it was (a new run of the world). */
  group.userData.restoreProps = () => {
    placed.userData.restore();
    for (const piece of structures.placards.values()) piece.visible = true;
  };
  return group;
}

/** How many tiles across a square of the ground drawn as one is. */
const CHUNK = 64;

/** Triangles (position, normal, color, uv; three vertices each) shared out into squares of the map by where they are. */
function chunks(parts, size = CHUNK) {
  const out = new Map();
  const n = parts.position.length / 9;
  for (let t = 0; t < n; t++) {
    const p = parts.position;
    const cx = (p[t * 9] + p[t * 9 + 3] + p[t * 9 + 6]) / 3, cz = (p[t * 9 + 2] + p[t * 9 + 5] + p[t * 9 + 8]) / 3;
    const key = `${Math.floor(cx / size)},${Math.floor(cz / size)}`;
    if (!out.has(key)) out.set(key, []);
    out.get(key).push(t);
  }
  return [...out.values()].map((tris) => Object.fromEntries(Object.entries(parts).map(([k, v]) => {
    const w = v.length / n;
    const a = new Float32Array(tris.length * w);
    tris.forEach((t, i) => a.set(v.subarray(t * w, t * w + w), i * w));
    return [k, a];
  })));
}

/** The ground beyond the map: a wide disc of scrub fading to the haze at the horizon. */
function land(GFX, map) {
  const cx = map.cols / 2, cz = map.rows / 2, half = Math.max(cx, cz);
  // Out from the edge of the map, ring by ring.
  const rings = [0, 6, 36, 76, 136, 216, 316].map((r, i) => (i ? half + r : 0));
  // Scrub in the dark, going to the glow of the city lights at the horizon.
  const colours = ['#2a2c1c', '#2a2c1c', '#262619', '#231f17', '#211a15', '#1e1613', '#1a1210'].map(linearRGB);
  const seg = 144;
  const position = [], normal = [], color = [];
  // The innermost ring is the map's own edge: the land doesn't run under the town, where it would show through anything sunk below it.
  const edge = (a) => Math.min(cx / Math.max(1e-6, Math.abs(Math.cos(a))), cz / Math.max(1e-6, Math.abs(Math.sin(a)))) - 0.5;
  const pt = (ri, a) => {
    const r = ri === 0 ? edge(a) : Math.max(rings[ri], edge(a) + 2);
    return [cx + Math.cos(a) * r, -0.03, cz + Math.sin(a) * r];
  };
  for (let ri = 0; ri < rings.length - 1; ri++) {
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
      const quad = [[ri, a0], [ri + 1, a1], [ri + 1, a0], [ri, a0], [ri, a1], [ri + 1, a1]];
      for (const [r, a] of quad) {
        position.push(...pt(r, a));
        normal.push(0, 1, 0);
        color.push(...colours[r]);
      }
    }
  }
  const g = new GFX.BufferGeometry();
  g.setAttribute('position', new GFX.BufferAttribute(new Float32Array(position), 3));
  g.setAttribute('normal', new GFX.BufferAttribute(new Float32Array(normal), 3));
  g.setAttribute('color', new GFX.BufferAttribute(new Float32Array(color), 3));
  g.computeBoundingSphere();
  const mesh = new GFX.Mesh(g, new GFX.MeshStandardMaterial({ name: 'land', vertexColors: true, roughness: 1 }));
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  return mesh;
}

/** What stands in the country round the city: pylons, scrub, wind turbines, data centres, a water tower, mesas. */
function country(k, map) {
  const W = map.cols, D = map.rows, half = Math.max(W, D) / 2;
  let s = 17;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  // Pylons marching past on the west and south.
  const pylon = (x, z) => {
    for (const [a, b] of [[[-0.8, -0.8], [-0.2, -0.2]], [[0.8, -0.8], [0.2, -0.2]], [[-0.8, 0.8], [-0.2, 0.2]], [[0.8, 0.8], [0.2, 0.2]]]) {
      k.beam([x + a[0], 0, z + a[1]], [x + b[0], 11, z + b[1]], 0.06, '#5a6068');
    }
    k.slab(x - 2.4, 9.5, z - 0.1, x + 2.4, 9.7, z + 0.1, '#5a6068');
    k.slab(x - 1.6, 10.8, z - 0.1, x + 1.6, 11, z + 0.1, '#5a6068');
  };
  for (let z = -20; z < D + 40; z += 32) pylon(-14, z);
  for (let x = 4; x < W + 30; x += 32) pylon(x, D + 14);
  for (let z = -10; z < D + 40; z += 32) pylon(W + 16, z);
  // Scrub and rocks out in the country.
  for (let i = 0; i < 420; i++) {
    const a = r() * Math.PI * 2, d = half + 18 + r() * 140;
    const x = W / 2 + Math.cos(a) * d, z = D / 2 + Math.sin(a) * d;
    if (x > -2 && x < W + 2 && z > -2 && z < D + 2) continue;
    if (r() < 0.75) k.sphere([x, 0.15, z], 0.5 + r() * 0.8, ['#6a7a3a', '#7a8044', '#5a6a32'][i % 3], { scale: [1, 0.6, 1] });
    else k.box([x, 0.3, z], [1 + r() * 2, 0.8 + r(), 1 + r() * 2], ['#8a6a4a', '#9a7a5a'][i % 2], { rot: [r(), r() * 3, r()] });
  }
  // Wind turbines along the ridges, a red light on each nacelle.
  const turbine = (x, z, h, turn) => {
    k.cyl([x, h / 2, z], [0.35, 0.7], h, '#d8dce2', { segments: 12, finish: 'shiny' });
    k.box([x, h + 0.3, z], [1.6, 0.7, 0.7], '#e8eaee', { rot: [0, turn, 0], finish: 'shiny' });
    const fx = x + Math.cos(turn) * 0.9, fz = z - Math.sin(turn) * 0.9;
    for (let b = 0; b < 3; b++) {
      const a = b * (Math.PI * 2 / 3) + turn * 3;
      k.beam([fx, h + 0.3, fz], [fx + Math.sin(turn) * Math.cos(a) * h * 0.45, h + 0.3 + Math.sin(a) * h * 0.45, fz + Math.cos(turn) * Math.cos(a) * h * 0.45], 0.18, '#f0f2f4');
    }
    k.sphere([x, h + 0.75, z], 0.14, '#ff3020', { finish: 'glow' });
  };
  for (const [x, z, h] of [[30, D + 40, 18], [74, D + 52, 20], [120, D + 36, 17], [168, D + 48, 19], [210, D + 34, 18], [W + 36, 200, 20], [W + 52, 150, 18], [-40, D - 30, 19], [-34, 60, 17]]) turbine(x, z, h, (x * 0.37 + z * 0.11) % 1.2 - 0.6);
  // Data centres out past the far side: long low sheds, rows of status lights along them.
  for (const [x, z, w, d] of [[W + 40, 40, 30, 14], [W + 44, 70, 26, 12], [W + 70, 110, 34, 16]]) {
    k.box([x, 2.5, z], [w, 5, d], '#4a4e56');
    let i = 0;
    for (let s = -w / 2 + 1; s < w / 2; s += 1.6, i++) k.box([x + s, 4.2, z - d / 2 - 0.02], [0.5, 0.18, 0.05], i % 3 ? '#5ac8ff' : '#9affb8', { finish: 'glow' });
  }
  // A water tower behind the suburbs, with the town's name on it.
  const tx = -16, tz = 14;
  for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) k.beam([tx + a * 2.2, 0, tz + b * 2.2], [tx + a * 1.6, 12, tz + b * 1.6], 0.14, '#9aa0aa');
  k.cyl([tx, 13.8, tz], 3.2, 3.6, '#c8ccd2', { finish: 'shiny', segments: 28 });
  k.cone([tx, 16.6, tz], 3.4, 2, '#9aa0aa', { segments: 28 });
  k.cyl([tx, 13.8, tz], 3.22, 1.0, '#c8382c', { segments: 28, open: true });
  // The power station that feeds the compute farm, out past the south-east corner: two chimneys, red lights up them.
  for (const [x, z, h] of [[W + 30, D + 30, 34], [W + 42, D + 22, 30]]) {
    k.cyl([x, h / 2, z], [1.2, 2.0], h, '#8a8f9a', { segments: 16 });
    for (let y = 6; y < h; y += 9) k.sphere([x, y, z - 1.8], 0.16, '#ff3020', { finish: 'glow' });
  }
  // A mesa or two on the far east.
  k.box([W + 160, 9, 60], [80, 18, 50], '#a8705a', { rot: [0, 0.3, 0] });
  k.box([W + 180, 6, 190], [60, 12, 70], '#b47a62', { rot: [0, -0.2, 0] });
}
