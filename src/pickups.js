import { createKit } from 'madness-engine/kit';
import { model } from './models/library.js';
import { mergeCopies } from './placed.js';

/**
 * What there is to pick up, as it looks:
 *
 * - likes, little red hearts lying about in lines — drawn in chunks of the
 *   map, each chunk redrawn when a like in it is collected;
 * - golden GPUs, big, spinning, with a shaft of light going up from each so
 *   they can be seen across the city;
 * - whetstones (the stands are placed models, see `map.whetstone`): a
 *   painted pad in front of each, where the spikes are sharpened.
 */

const CHUNK = 16;
const LIKE_SCALE = 2;

export function createPickups(GFX, run) {
  const group = new GFX.Group();
  group.name = 'pickups';
  // The likes are lit a little more than what's round them, so they can be seen in the dark.
  const lit = run.built?.light ?? (() => [1, 1, 1]);
  const light = (x, y, z) => lit(x, y, z).map((v) => Math.max(0.85, v * 1.2));

  // Likes, by chunk.
  const chunks = new Map();
  for (const [i, s] of run.likes.entries()) {
    const key = `${Math.floor(s.x / CHUNK)},${Math.floor(s.z / CHUNK)}`;
    if (!chunks.has(key)) chunks.set(key, { seeds: [], mesh: null });
    chunks.get(key).seeds.push({ s, angle: (i * 2.399) % (Math.PI * 2) });
  }
  const drawChunk = (chunk) => {
    if (chunk.mesh) group.remove(chunk.mesh);
    const copies = chunk.seeds.filter(({ s }) => !s.got).map(({ s, angle }) => ({ x: s.x, y: s.y - 0.32 + 0.03 * LIKE_SCALE, z: s.z, angle, scale: LIKE_SCALE }));
    chunk.mesh = copies.length ? mergeCopies(GFX, 'like', copies, light) : null;
    if (chunk.mesh) group.add(chunk.mesh);
  };
  for (const c of chunks.values()) drawChunk(c);

  // Golden GPUs.
  const beamMaterial = new GFX.MeshBasicMaterial({ name: 'beam', color: new GFX.Color('#ffd760'), transparent: true, opacity: 0.16, depthWrite: false, blending: GFX.AdditiveBlending, side: GFX.DoubleSide });
  const haloMaterial = new GFX.MeshBasicMaterial({ name: 'halo', color: new GFX.Color('#ffe08a'), transparent: true, opacity: 0.3, depthWrite: false, blending: GFX.AdditiveBlending });
  const beamGeometry = new GFX.CylinderGeometry(0.16, 0.34, 14, 16, 1, true);
  beamGeometry.translate(0, 7, 0);
  const gold = model(GFX, 'gpu');
  const golden = run.gpus.map((g, i) => {
    const holder = new GFX.Group();
    holder.position.set(g.x, g.y, g.z);
    const spin = new GFX.Group();
    const card = new GFX.Mesh(gold.geometry, gold.materials);
    card.castShadow = true;
    card.position.y = -0.2;
    card.rotation.x = -0.35;
    spin.add(card);
    const halo = new GFX.Mesh(new GFX.SphereGeometry(0.4, 16, 12), haloMaterial);
    const beam = new GFX.Mesh(beamGeometry, beamMaterial);
    beam.position.y = -0.3;
    holder.add(spin, halo, beam);
    holder.visible = !g.got;
    group.add(holder);
    return { g, holder, spin, halo, phase: i * 0.7 };
  });

  // The whetstones' pads.
  const padKit = createKit(GFX);
  for (const p of run.stones) {
    const y = p.y;
    padKit.cyl([p.x, y + 0.01, p.z], 0.62, 0.02, '#d8402e', { segments: 32 });
    padKit.cyl([p.x, y + 0.02, p.z], 0.5, 0.02, '#3a3e48', { segments: 32 });
    padKit.cyl([p.x, y + 0.03, p.z], 0.2, 0.02, '#aab2c2', { segments: 24 });
  }
  if (!padKit.empty) group.add(padKit.build({ name: 'whetstone-pads' }));

  return {
    group,
    /** A like was collected: redraw its chunk. */
    eaten(s) {
      const c = chunks.get(`${Math.floor(s.x / CHUNK)},${Math.floor(s.z / CHUNK)}`);
      if (c) drawChunk(c);
    },
    sync(dt, time) {
      for (const o of golden) {
        o.holder.visible = !o.g.got;
        if (o.g.got) continue;
        o.spin.rotation.y = time * 1.8 + o.phase;
        o.spin.position.y = Math.sin(time * 2.2 + o.phase) * 0.06;
        const k = 1 + Math.sin(time * 4 + o.phase) * 0.1;
        o.halo.scale.setScalar(k);
      }
    },
  };
}
