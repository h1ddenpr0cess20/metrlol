import { CAST } from './cast/index.js';
import { materialsOf } from 'madness-engine/models/model';
import { createEffects } from './effects.js';
import { createPlayer } from 'madness-engine/heroes/ball';
import { createPickups } from './pickups.js';
import { horizon, say } from './quips.js';
import { rollSpin, turn } from 'madness-engine/physics';
import { createRun, putBack, respawn, SPIKES, STEP, stepRun, toGround } from './run.js';
import { createWorldMeshes } from './scenery.js';
import { LAMP_LIGHTS } from './stage.js';
import { HOME } from 'madness-engine/views/town';

/**
 * The game: one city, all of it open from the start. Roll anywhere; find the
 * 42 golden GPUs; smash the people in the way, fast enough to do it in one
 * go, and say something unkind about it afterwards. Get blunted and the ball
 * is back at the last whetstone it rolled over; go into the tar and it's
 * back on the last firm ground. What it has found is kept between visits.
 */

const BANNERS = {
  blunted: 'BLUNTED!',
  squashed: 'SQUASHED!',
  sunk: 'GLOOP!',
};

/** What it is called when it lands (see `smash.js`). */
const GRADES = { crit: 'OBLITERATED!', smash: 'SMASHED!', bonk: 'BONK', tap: 'WEAK' };

/** How close the camera comes for the title, and how fast it circles. */
const TITLE_ZOOM = 0.34;
const TITLE_TURN = 0.16;

export function createGame({ stage, hud, input, audio, storage }) {
  const { GFX, scene, view } = stage;
  const effects = createEffects(GFX, scene);
  const tint = '#aab2c2';
  const { player, mace } = createPlayer(GFX);
  scene.add(player);
  const xray = createXray(GFX);
  scene.add(xray.sprite);
  // What the camera saw last frame, for the crowd: only those in it are drawn.
  const seeing = { at: stage.target, frustum: new GFX.Frustum() };
  const viewProjection = new GFX.Matrix4();

  let saved = storage.load();
  let run = createRun(GFX, { found: saved.found });
  const world = createWorldMeshes(GFX, run.map, run.built);
  scene.add(world, run.traffic.group, run.hazards.group, run.crowd.group);
  let pickups = createPickups(GFX, run);
  scene.add(pickups.group);
  effects.setCourse(run.map);
  hud.setMap(run.map);

  const q = [0, 0, 0, 1];
  const w = [0, 0, 0];
  let state = 'title';  // title · play · lost · won
  let paused = false;
  let timer = 0;
  let accumulator = 0;
  let lostHow = null;
  let elapsed = saved.time;
  let likesGot = 0;
  let streak = 0, streakTimer = 0;
  let saveTimer = 0;
  let playZoom = HOME.zoom;
  const seen = new Set();

  const found = () => run.gpus.filter((g) => g.got).length;

  // The town's lamps, where their light comes from; the nearest few light the ball for real.
  const lamps = run.map.lamps.map((l) => ({ ...l, y: (l.y ?? run.map.heightAt(l.x, l.z) ?? 0) + l.height, color: new GFX.Color(l.colour) }));
  let lampTimer = 0;
  /** The real lights to the lamps nearest (x, z), and the flares that are burning. */
  function lightUp(x, z) {
    const near = lamps.map((l) => ({ l, d: Math.hypot(l.x - x, l.z - z) - l.reach * 0.3 })).sort((a, b) => a.d - b.d);
    stage.lampLights.forEach((light, i) => {
      const n = near[i];
      if (!n || n.d > 14) { light.intensity = 0; return; }
      light.position.set(n.l.x, n.l.y - 0.15, n.l.z);
      light.color.copy(n.l.color);
      light.distance = n.l.reach * 1.25;
      light.intensity = 1.6 * n.l.glow;
    });
  }
  void LAMP_LIGHTS;

  function enter(next) {
    state = next;
    timer = 0;
  }

  function reset({ fresh = false } = {}) {
    // A new run of the world: everything back where it was, the golden GPUs found kept unless starting over.
    if (fresh) saved = storage.clear();
    scene.remove(run.traffic.group, run.hazards.group, run.crowd.group, pickups.group);
    run = createRun(GFX, { found: saved.found, ball: run.ball, map: run.map });
    world.userData.restoreProps();
    scene.add(run.traffic.group, run.hazards.group, run.crowd.group);
    pickups = createPickups(GFX, run);
    scene.add(pickups.group);
    const stone = run.stones.find((p) => p.name === saved.stone);
    if (stone) { run.checkpoint = stone; respawn(run); }
    elapsed = saved.time;
    likesGot = 0;
    mace.hurtTo(1);
    seen.clear();
    const b = run.ball;
    stage.target.set(b.x, b.y, b.z);
  }

  function showTitle() {
    enter('title');
    paused = false;
    hud.paused(false);
    view.aim.zoom = TITLE_ZOOM;
    audio.startMusic();
    hud.title(saved, { found: found(), total: run.gpus.length });
  }

  function start({ fresh = false } = {}) {
    reset({ fresh });
    enter('play');
    view.aim.zoom = playZoom;
    hud.play();
    hud.spikes(run.spikes);
    hud.gold(found(), run.gpus.length);
    hud.likes(likesGot);
    hud.cred(run.cred, 0);
    hud.horizon(horizon(run.smashed));
    hud.clock(elapsed);
    audio.wake();
    audio.startMusic();
  }

  function save() {
    saved = storage.progress({ found: run.gpus.filter((g) => g.got).map((g) => g.name), stone: run.checkpoint?.name ?? null, time: elapsed });
  }

  function lose(how) {
    const b = run.ball;
    lostHow = how;
    enter('lost');
    hud.banner(BANNERS[how], 'big');
    if (how === 'sunk') {
      effects.gloop(b.x, b.y, b.z);
      audio.gloop();
    } else {
      effects.pop(b.x, b.y, b.z, b.vx, b.vz, tint);
      mace.body.visible = false;
      audio.pop();
      hud.quip(say('blunted'));
    }
  }

  function physics(push, boost) {
    const live = state === 'play';
    const moving = state !== 'lost' || lostHow === 'sunk';
    const out = stepRun(run, push, STEP, { live, moving: moving && state !== 'title', boost });
    if (state !== 'play') return;
    const b = run.ball;
    for (const car of out.honks) audio.honk(car.kind);
    if (out.hurt > 0) {
      hud.spikes(run.spikes);
      hud.hit();
      mace.hurtTo(run.spikes / SPIKES);
      mace.react('hurt');
      audio.squeak();
      if (out.hits.includes('car') || out.hits.includes('reel') || out.hits.includes('foe')) {
        effects.sparks(b.x, b.y, b.z);
        audio.clunk(Math.max(out.impact, 5));
      }
      if (out.hits.includes('flare')) audio.sizzle();
    } else if (out.impact > 3) {
      audio.knock(out.impact);
    }
    if (out.impact > 5) mace.knock(out.impact * 0.5);
    for (const foe of out.shouts) hud.toast(`${foe.stats.name}: “${foe.stats.shout}”`, 2.2);
    for (const e of out.knocks) {
      hud.quip(GRADES[e.grade], say(e.grade), 2.2);
    }
    for (const e of out.smashes) {
      const at = e.foe.ball;
      effects.sparks(at.x, at.y, at.z, 16);
      effects.chaff(at.x, at.y, at.z);
      audio.smash(e.grade === 'crit');
      mace.react('smash');
      const combo = run.combo > 1 ? ` ×${run.combo}` : '';
      hud.quip(`${GRADES[e.grade]}${combo}  +${Math.round(e.hype * run.combo)}`, say(run.combo >= 3 ? 'combo' : e.grade), 2.6);
      hud.cred(run.cred, run.combo);
      if (run.smashed % 6 === 0) {
        hud.horizon(horizon(run.smashed), true);
        hud.toast(say('horizon'), 3.4);
      } else {
        hud.horizon(horizon(run.smashed));
      }
    }
    for (const p of out.breaks) {
      const away = [(p.x - b.x), (p.z - b.z)], l = Math.hypot(away[0], away[1]) || 1;
      const sp = Math.hypot(b.vx, b.vz);
      if (p.kind === 'model') effects.debris(p.name, { ...p.model, y: p.base }, away[0] / l * sp, away[1] / l * sp);
      effects.sparks(p.x, p.base + 0.4, p.z, 8);
      world.userData.smash(p);
      audio.smash(false);
      hud.cred(run.cred, run.combo);
    }
    for (const s of out.picked) {
      likesGot++;
      pickups.eaten(s);
      effects.chaff(s.x, s.y, s.z);
      audio.like(streak++);
      streakTimer = 0.6;
      hud.likes(likesGot);
    }
    if (out.gpu) {
      const n = found();
      effects.confetti(out.gpu.x, out.gpu.y, out.gpu.z);
      audio.golden();
      hud.gold(n, run.gpus.length);
      if (n === run.gpus.length) {
        hud.banner(`EVERY GOLDEN GPU!\n${Math.floor(elapsed / 60)}:${String(Math.floor(elapsed % 60)).padStart(2, '0')}`, 'gold');
        hud.quip(say('won'));
        saved = storage.finished(elapsed);
        enter('won');
      } else {
        hud.banner('GOLDEN GPU!', 'gold');
        hud.toast(`★ ${out.gpu.name} · ${n} of ${run.gpus.length}`, 3.5);
        hud.quip(say('gpu'));
      }
      save();
    }
    if (out.sharpened) {
      hud.spikes(run.spikes);
      mace.hurtTo(1);
      hud.toast(`Whetstone · ${out.sharpened.name}`);
      hud.quip(say('sharpened'));
      audio.hiss();
      save();
    }
    if (out.district) {
      if (!seen.has(out.district.name)) {
        seen.add(out.district.name);
        hud.toast(out.district.name, 2.2);
        hud.quip(say('district', { district: out.district.name }));
        audio.chime();
      }
      hud.place(out.district.name);
    }
    if (out.outcome) lose(out.outcome);
  }

  function update(dt, presses) {
    const stick = input.stick();
    const look = input.view(dt);
    view.turn(look.turn, look.tilt);
    view.zoomBy(look.zoom);
    if (state === 'title') view.aim.yaw += TITLE_TURN * dt;
    else playZoom = view.aim.zoom;
    view.step(dt);

    for (const p of presses) {
      if (p === 'mute') hud.muted(audio.toggleMute());
      if (p === 'home') {
        view.reset();
        if (state === 'title') view.aim.zoom = TITLE_ZOOM;
      }
      if (p === 'pause' && state !== 'title') {
        paused = !paused;
        hud.paused(paused);
        if (paused) audio.stopMusic(); else audio.startMusic();
        if (paused) save();
      }
      if (p === 'start' && state === 'title') start();
      if ((p === 'start' || p === 'tap') && state === 'won' && timer > 2) {
        hud.banner(null);
        enter('play');
      }
    }
    if (paused) {
      audio.rolling(0, false);
      return;
    }

    timer += dt;
    const push = state === 'play' ? toGround(stick, view.yaw) : [0, 0];
    const boosting = input.boost();
    accumulator = Math.min(accumulator + dt, STEP * 12);
    while (accumulator >= STEP) {
      accumulator -= STEP;
      physics(state === 'play' ? push : [0, 0], state === 'play' && boosting);
    }

    const b = run.ball;
    switch (state) {
      case 'play':
      case 'won':
        elapsed += dt;
        hud.clock(elapsed);
        if (timer > 1 && hud.bannerShown && state === 'play') hud.banner(null);
        saveTimer += dt;
        if (saveTimer > 10) { saveTimer = 0; save(); }
        break;
      case 'lost':
        elapsed += dt;
        if (timer > 1.6) {
          if (lostHow === 'sunk') putBack(run);
          else respawn(run);
          mace.body.visible = true;
          mace.hurtTo(1);
          hud.banner(null);
          hud.spikes(run.spikes);
          enter('play');
        }
        break;
    }
    streakTimer -= dt;
    if (streakTimer <= 0) streak = 0;

    // The lantern over the ball, and the lamps round it.
    stage.focus.set(b.x, b.y, b.z);
    lampTimer -= dt;
    if (lampTimer <= 0) { lampTimer = 0.2; lightUp(b.x, b.z); }

    // The ball.
    player.visible = !(state === 'lost' && lostHow !== 'sunk');
    const speed = Math.hypot(b.vx, b.vz);
    if (b.grounded) rollSpin(b, w);
    else for (let i = 0; i < 3; i++) w[i] *= Math.max(0, 1 - 0.3 * dt);
    turn(q, w, dt);
    mace.update(dt, { q, position: [b.x, b.y, b.z] });
    hud.accel(run.accel, run.winded);
    if (state === 'lost' && lostHow === 'sunk') player.position.y = b.y - Math.min(1, timer / 0.8) * 0.8;

    world.userData.uncover(b, dt);
    xray.update(dt, b, stage.camera.position, run.map, player.visible);
    run.traffic.sync(stage.target);
    run.hazards.sync(dt, run.time);
    const camera = stage.camera;
    seeing.frustum.setFromProjectionMatrix(viewProjection.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    run.crowd.sync(dt, run.time, seeing);
    pickups.sync(dt, run.time);
    effects.update(dt);
    audio.rolling(state === 'play' && b.grounded ? speed : 0, b.grounded);
    if (state !== 'title') {
      hud.minimap({ ball: b, yaw: view.yaw, cars: run.traffic.cars, gpus: run.gpus, stones: run.stones, foes: run.crowd.foes, seen });
    }

    // The camera: after the ball.
    const target = stage.target;
    if (debug.look) {
      target.set(...debug.look.at);
      view.zoom = view.aim.zoom = debug.look.zoom;
      return;
    }
    const k = 1 - Math.exp(-(state === 'title' ? 2 : 6) * dt);
    target.x += (b.x - target.x) * k;
    target.y += (b.y - target.y) * k;
    target.z += (b.z - target.z) * k;
  }

  /** For the console and screenshots: the run, a camera override (`look`), and a way to jump about. */
  const debug = {
    stage, look: null,
    get run() { return run; },
    get ball() { return run.ball; },
    teleport(x, z) {
      const y = (run.map.topAt(x, z) ?? 0) + run.ball.r + 0.05;
      run.ball.x = x; run.ball.y = y; run.ball.z = z;
      run.ball.vx = run.ball.vy = run.ball.vz = 0;
      stage.target.set(x, y, z);
    },
  };

  reset();
  showTitle();

  return {
    update,
    start,
    /** The people the city has in it, by the name of their model, nearest the ball first: the order to bake them in. */
    cast() {
      const b = run.ball, nearest = new Map();
      for (const f of run.crowd.foes) {
        const d = Math.hypot(f.ball.x - b.x, f.ball.z - b.z);
        if (!(nearest.get(f.stats.model) <= d)) nearest.set(f.stats.model, d);
      }
      return [...nearest].sort((p, q) => p[1] - q[1]).map(([name]) => name);
    },
    /**
     * One of everything that comes into view later than the first frame, to
     * draw once beforehand (`stage.warm`): a triangle in each of the people's
     * materials (laid out as their meshes are), and each kind of flying bit.
     */
    samples() {
      const triangle = new GFX.BufferGeometry();
      for (const name of ['position', 'normal', 'color']) triangle.setAttribute(name, new GFX.BufferAttribute(new Float32Array(9), 3));
      const people = this.cast().flatMap((name) => materialsOf(GFX, CAST[name]).map((m) => new GFX.Mesh(triangle, m)));
      return [...people, ...effects.samples()];
    },
    startOver: () => start({ fresh: true }),
    get state() { return state; },
    get paused() { return paused; },
    /** Where the ball is on the screen, in CSS pixels, for the pointer controls. */
    marbleOnScreen(rect) {
      const b = run.ball;
      const v = new GFX.Vector3(b.x, b.y, b.z).project(stage.camera);
      return { x: rect.left + (v.x + 1) / 2 * rect.width, y: rect.top + (1 - v.y) / 2 * rect.height };
    },
    debug,
  };
}

/**
 * The ball, seen through what's in front of it: when a house or a tank is
 * between the camera and the ball, a ring where the ball is, drawn over
 * everything, so the ball is never lost behind the scenery.
 */
function createXray(GFX) {
  let map = null;
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(140, 200, 255, 0.18)';
    g.beginPath(); g.arc(64, 64, 58, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(200, 235, 255, 0.95)';
    g.lineWidth = 7;
    g.beginPath(); g.arc(64, 64, 56, 0, Math.PI * 2); g.stroke();
    // A little spiked ball, to say where it is.
    g.fillStyle = 'rgba(190, 198, 214, 0.95)';
    g.beginPath(); g.arc(64, 64, 17, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(190, 198, 214, 0.95)';
    g.lineWidth = 5;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.beginPath(); g.moveTo(64 + Math.cos(a) * 17, 64 + Math.sin(a) * 17); g.lineTo(64 + Math.cos(a) * 29, 64 + Math.sin(a) * 29); g.stroke();
    }
    map = new GFX.CanvasTexture(c);
    map.colorSpace = GFX.SRGBColorSpace;
  }
  const material = new GFX.SpriteMaterial({ map, transparent: true, opacity: 0, depthTest: false, depthWrite: false });
  const sprite = new GFX.Sprite(material);
  sprite.renderOrder = 1000;
  sprite.visible = false;
  let shown = 0;
  // (A little round each point, for the eaves.)
  const ROUND = [[0, 0], [0.3, 0.3], [-0.3, 0.3], [0.3, -0.3], [-0.3, -0.3]];
  // Only the big cylinders (tanks) hide the ball; the map's are fixed, so they are picked out once.
  let big = [], bigOf = null;
  return {
    sprite,
    update(dt, b, eye, townMap, visible) {
      if (bigOf !== townMap) { bigOf = townMap; big = townMap.cylinders.filter((c) => c.r > 1.5); }
      // Along the line from the eye to the ball, is anything standing higher than the line?
      let hidden = false;
      const dx = b.x - eye.x, dy = b.y - eye.y, dz = b.z - eye.z;
      const far = Math.hypot(dx, dy, dz);
      for (let d = 0.2; d < far && !hidden; d += 0.25) {
        if (d < b.r * 2.5) continue;
        const x = b.x - dx * (d / far), y = b.y - dy * (d / far), z = b.z - dz * (d / far);
        for (const [ox, oz] of ROUND) if ((townMap.heightAt(x + ox, z + oz) ?? -Infinity) > y + 0.05) { hidden = true; break; }
        if (!hidden) for (const c of big) if (c.y1 > y && Math.hypot(x - c.x, z - c.z) < c.r) { hidden = true; break; }
      }
      shown += ((hidden && visible ? 1 : 0) - shown) * Math.min(1, dt * 10);
      material.opacity = shown;
      sprite.visible = shown > 0.02;
      sprite.position.set(b.x, b.y, b.z);
      sprite.scale.setScalar(b.r * 2.1);
    },
  };
}
