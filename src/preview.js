import { createPlayer, RADIUS } from 'madness-engine/heroes/ball';
import { CAST } from './cast/index.js';
import { createModel } from 'madness-engine/models/model';
import { FOES } from './foes.js';
import { createKit } from 'madness-engine/kit';
import { MODELS } from './models/index.js';
import { bake, materialsOf } from 'madness-engine/models/legacy-bake';
import { createStage } from './stage.js';

/**
 * A turntable: the spiked ball by default, any sculpted model
 * (`?model=sedan`; `?models=sedan,pickup` puts several in a row), or the
 * people (`?foes=pauser,eurocrat`, by foe name; `?foes=all`). `?paint=`
 * colours a vehicle; `?yaw`, `?zoom`, `?pitch` place the view; `?still`
 * stops it turning; `?day` lights it plainly.
 */

const q = new URLSearchParams(location.search);
const stage = await createStage(document.getElementById('view'));
const { GFX, scene, view } = stage;

const kit = createKit(GFX);
kit.slab(-8, -0.2, -6, 8, 0, 6, '#3a3c42');
for (let z = -5.8; z < 6; z += 1) kit.slab(-0.06, 0, z, 0.06, 0.004, z + 0.5, '#d8b030');
const floor = kit.build({ name: 'floor' });
scene.add(floor);

let focus = [0, RADIUS * 0.9, 0];
const names = (q.get('models') ?? q.get('model') ?? '').split(',').filter(Boolean);
const people = q.get('foes') === 'all' ? Object.keys(FOES) : (q.get('foes') ?? '').split(',').filter(Boolean);
if (people.length) {
  // The cast, in a row (or rows), each in its idle pose, animating.
  const per = Math.min(people.length, 8), gap = Number(q.get('gap') ?? 1.1);
  const models = people.map((n, i) => {
    const def = FOES[n];
    if (!def) throw new Error(`no foe ${n}`);
    const m = createModel(GFX, CAST[def.model], { detail: Number(q.get('detail') ?? 1) });
    m.group.position.set((i % per - (per - 1) / 2) * gap, 0, Math.floor(i / per) * -gap);
    scene.add(m.group);
    return m;
  });
  const poseAll = (t) => models.forEach((m, i) => m.pose({ clip: q.get('clip') ?? 'idle', t, time: t, seed: i * 1.37, speed: 1 }));
  if (q.has('still')) poseAll(0.4);
  else globalThis.tick = () => poseAll(performance.now() / 1000);
  focus = [0, 0.5, 0];
} else if (names.length) {
  let x = -(names.length - 1) * Number(q.get('gap') ?? 3.2) / 2;
  for (const n of names) {
    const def = MODELS[n];
    if (!def) throw new Error(`no model ${n}`);
    const { geometry } = bake(GFX, def);
    const mats = materialsOf(GFX, def, q.has('paint') ? { paint: { color: `#${q.get('paint')}` } } : {});
    const mesh = new GFX.Mesh(geometry, mats);
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.position.x = x;
    scene.add(mesh);
    x += Number(q.get('gap') ?? 3.2);
  }
  focus = [0, 0.6, 0];
} else {
  const { player, mace } = createPlayer(GFX);
  scene.add(player);
  if (q.has('hurt')) mace.hurtTo(Number(q.get('hurt')));
  const turn = new GFX.Quaternion();
  const axis = new GFX.Vector3(1, 0, 0);
  const rot = [0, 0, 0, 1];
  const speed = Number(q.get('speed') ?? 3);
  globalThis.tick = (dt) => {
    turn.setFromAxisAngle(axis, (speed / RADIUS) * dt);
    const cur = new GFX.Quaternion(rot[0], rot[1], rot[2], rot[3]).premultiply(turn);
    rot[0] = cur.x; rot[1] = cur.y; rot[2] = cur.z; rot[3] = cur.w;
    mace.update(dt, { q: rot, position: [0, RADIUS, 0] });
  };
}

view.yaw = view.aim.yaw = Number(q.get('yaw') ?? 0.6);
view.zoom = view.aim.zoom = Number(q.get('zoom') ?? (names.length || people.length ? 0.45 : 0.24));
view.pitch = view.aim.pitch = Number(q.get('pitch') ?? 0.42);
stage.target.set(...focus);
stage.focus.set(...focus);
if (q.has('day')) { stage.hemi.intensity = 1.4; stage.key.intensity = 2.2; }

let last = performance.now();
stage.renderer.setAnimationLoop((now) => {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!q.has('still')) view.yaw = view.aim.yaw += dt * 0.3;
  globalThis.tick?.(dt);
  stage.look();
  stage.render();
});
