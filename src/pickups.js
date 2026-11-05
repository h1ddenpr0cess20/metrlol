import { createCoin } from 'madness-engine/props/coin';
import { loadCoinLogo } from 'madness-engine/textures/coin/logo';
import { createKit } from 'madness-engine/kit';
import { model } from './models/library.js';
import { coinMetalAt } from './coin-metal.js';

/**
 * What there is to pick up, as it looks:
 *
 * - metal coins, struck with the Madness Engine logo and METRLOL lettering;
 *   copper in the early districts, silver through the middle of the city,
 *   and gold in its richer and more remote areas;
 * - golden GPUs, big, spinning, with a shaft of light going up from each so
 *   they can be seen across the city;
 * - whetstones (the stands are placed models, see `map.whetstone`): a
 *   painted pad in front of each, where the spikes are sharpened.
 */

const CHUNK = 16;
const COIN_RADIUS = 0.26;
const COIN_METALS = ['copper', 'silver', 'gold'];
const COIN_LOGO = await loadCoinLogo();
const coinTemplateCache = new WeakMap();

/**
 * Copy a coin component's geometry and bake its local transform into the
 * vertices. Madness Engine's InstancedMesh can then spin/place the whole
 * coin with one compact per-instance transform.
 */
function transformedGeometry(GFX, source, matrix) {
  const geometry = new GFX.BufferGeometry();
  for (const [name, attribute] of Object.entries(source.attributes)) {
    geometry.setAttribute(name, new GFX.BufferAttribute(attribute.array.slice(), attribute.itemSize, attribute.normalized));
  }
  if (source.index) geometry.setIndex(new GFX.BufferAttribute(source.index.array.slice(), 1));
  for (const part of source.groups) geometry.addGroup(part.start, part.count, part.materialIndex);
  geometry.setDrawRange(source.drawRange.start, source.drawRange.count);
  geometry.applyMatrix4(matrix);
  geometry.computeBoundingSphere();
  return geometry;
}

function coinTemplatesFor(GFX) {
  let templates = coinTemplateCache.get(GFX);
  if (templates) return templates;

  templates = Object.fromEntries(COIN_METALS.map((metal) => {
    const coin = createCoin(GFX, {
      radius: COIN_RADIUS,
      logo: COIN_LOGO,
      metal,
      year: '2026',
      motto: 'METRLOL',
    });
    const sourceGeometries = new Set();
    const parts = coin.spin.children.map((part) => {
      part.updateMatrix();
      sourceGeometries.add(part.geometry);
      return {
        geometry: transformedGeometry(GFX, part.geometry, part.matrix),
        material: part.material,
        castShadow: part.castShadow,
        receiveShadow: part.receiveShadow,
      };
    });
    // The baked copies are now the cached templates; release the temporary
    // geometry allocated by createCoin rather than keeping both sets alive.
    for (const geometry of sourceGeometries) geometry.dispose();
    return [metal, parts];
  }));

  coinTemplateCache.set(GFX, templates);
  return templates;
}

export function createPickups(GFX, run) {
  const group = new GFX.Group();
  group.name = 'pickups';
  const templates = coinTemplatesFor(GFX);

  // Coin instances are grouped by map chunk and metal. The coin's component
  // geometry is shared, so each chunk needs only one instanced draw per part.
  const chunks = new Map();
  for (const [i, s] of run.likes.entries()) {
    const key = `${Math.floor(s.x / CHUNK)},${Math.floor(s.z / CHUNK)}`;
    if (!chunks.has(key)) chunks.set(key, { seeds: [], mesh: null, spinners: [] });
    chunks.get(key).seeds.push({
      s,
      metal: coinMetalAt(run.map, s.x, s.z),
      phase: (i * 2.399) % (Math.PI * 2),
    });
  }

  const drawChunk = (chunk) => {
    if (chunk.mesh) group.remove(chunk.mesh);
    chunk.mesh = null;
    chunk.spinners = [];

    const live = chunk.seeds.filter(({ s }) => !s.got);
    if (!live.length) return;

    const chunkGroup = new GFX.Group();
    chunkGroup.name = 'coin-pickups-chunk';
    for (const metal of COIN_METALS) {
      const copies = live.filter((seed) => seed.metal === metal);
      if (!copies.length) continue;

      for (const part of templates[metal]) {
        const mesh = new GFX.InstancedMesh(part.geometry, part.material, copies.length);
        mesh.name = `${metal}-coin-pickups`;
        mesh.castShadow = part.castShadow;
        mesh.receiveShadow = part.receiveShadow;

        const phases = [];
        for (const { s, phase } of copies) {
          // run.likes stores the pickup 0.32 units above the ground.
          mesh.add(s.x, s.y - 0.32 + COIN_RADIUS, s.z, phase, 1);
          phases.push(phase);
        }
        mesh.update();
        chunkGroup.add(mesh);
        chunk.spinners.push({ mesh, phases });
      }
    }

    if (chunkGroup.children.length) {
      chunk.mesh = chunkGroup;
      group.add(chunkGroup);
    }
  };

  for (const chunk of chunks.values()) drawChunk(chunk);

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
      const chunk = chunks.get(`${Math.floor(s.x / CHUNK)},${Math.floor(s.z / CHUNK)}`);
      if (chunk) drawChunk(chunk);
    },
    sync(_dt, time) {
      for (const chunk of chunks.values()) {
        for (const { mesh, phases } of chunk.spinners) {
          const placements = mesh.instancePlace.array;
          for (let i = 0; i < phases.length; i++) placements[i * 4 + 3] = phases[i] + time * 1.8;
          mesh.instancePlace.needsUpdate = true;
        }
      }

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
