import { RADIUS } from './ball.js';
import { SLOWEST } from './breakables.js';
import { createCrowd } from './crowd.js';
import { createHazards } from './hazards.js';
import { buildMap, DEPTH } from './map.js';
import { BREAK_SPEED, createBall, placeBall, PUSH, stepBall, TOP_SPEED } from './physics.js';
import { surfaceOf } from './surfaces.js';
import { createTown } from './town.js';
import { createTraffic } from './traffic.js';
import { groundAxes } from './view.js';

/**
 * The world as it runs, with nothing drawn or heard: the city, the traffic,
 * the crowd, the things that move, the spiked ball, and the rules — how the
 * spikes get knocked off, what blunts it, where it comes back to, what it
 * smashes and picks up. The game draws and plays it; the tests drive it.
 *
 * The ball has 100 spikes to start with. Hard landings, cars, drums, the
 * steam vents and the people it fails to smash take them off (half as many
 * as they would, the ball being durable); a whetstone
 * sharpens them back to 100 and is where the ball comes back to after it is
 * blunted. A token pump's head coming down on it blunts it outright. Tar
 * swallows it, and it's put back on the last firm ground.
 *
 * People are smashed by speed (`smash.js`); a smash is worth cred, and
 * smashes one after another build a combo (up to ×5) that multiplies it.
 */

/** The physics runs at a fixed rate, whatever the frame rate. */
export const STEP = 1 / 120;

export const SPIKES = 100;

/**
 * Acceleration: held, it pushes harder and lifts the top speed (so the
 * ball can hit what it couldn't), until the meter runs dry. The meter drains
 * at `drain` a second while accelerating and refills at `refill` when not;
 * run it right out and it can't be used again until it is back to `resume`.
 */
export const ACCEL = Object.freeze({ push: 1.9, top: 1.75, drain: 0.34, refill: 0.2, resume: 0.25 });

/** How hard a landing has to be to hurt, and how much each kind of knock costs. */
export const HURT = Object.freeze({ landing: 9.5, car: 2.6, drum: 3.2, flare: 34, foe: 1.6 });

/** How much of any knock actually costs spikes: the ball is a lump of forged steel, and it is built to last. */
export const DURABILITY = 0.5;

/** How long after a smash another still counts toward the combo, and the most it multiplies by. */
export const COMBO = Object.freeze({ window: 2.6, most: 5 });

/** How close counts as picking something up, from the middle of the ball. */
const REACH = { like: 0.55, gpu: 0.75, stone: 0.95 };

/** A push on the screen (x right, y up) as a push along the ground, for a camera turned to `yaw`. */
export function toGround({ x, y }, yaw) {
  const { right, up } = groundAxes(yaw);
  return [x * right[0] + y * up[0], x * right[1] + y * up[1]];
}

export function createRun(GFX, { ball = createBall({ r: RADIUS }), map = createTown(), found = [], foes = true } = {}) {
  const built = buildMap(map);
  const killY = -DEPTH - 2;
  const traffic = createTraffic(GFX, map, built.world);
  const hazards = createHazards(GFX, map, built.world, { killY });
  const crowd = createCrowd(GFX, map, built.world, { killY, enabled: foes });
  const { x, z } = map.start;
  const start = [x + 0.5, map.heightAt(x + 0.5, z + 0.5) + ball.r, z + 0.5];
  const likes = map.likes.map((s) => ({ ...s, y: (s.y ?? map.heightAt(s.x, s.z) ?? 0) + 0.32, got: false }));
  const gpus = map.gpus.map((g) => ({ ...g, y: (g.y ?? map.heightAt(g.x, g.z) ?? 0) + 0.42, got: found.includes(g.name) }));
  const stones = map.stones.map((p) => ({ ...p, y: map.heightAt(p.x, p.z) ?? 0 }));
  const run = {
    map, built, world: built.world, traffic, hazards, crowd, killY, ball, time: 0,
    likes, gpus, stones,
    spikes: SPIKES,
    breakables: map.breakables.map((b) => ({ ...b, broken: false, boxes: built.tagged.get(b.id) ?? [] })), broke: 0,
    cred: 0, smashed: 0, combo: 0, comboTime: 0, bestCombo: 0,
    safe: start,
    checkpoint: stones.find((p) => p.name === 'Home') ?? null,
    district: null,
    sinking: 0,
    cooldown: { car: 0, flare: 0, drum: 0 },
    accel: 1, winded: false,
  };
  hazards.place(0);
  placeBall(ball, ...start);
  crowd.clear(start[0], start[2]);
  return run;
}

/** Back to the last whetstone, the spikes sharpened. */
export function respawn(run) {
  const p = run.checkpoint;
  if (p) placeBall(run.ball, p.x, p.y + run.ball.r + 0.05, p.z);
  else placeBall(run.ball, ...run.safe);
  run.spikes = SPIKES;
  run.sinking = 0;
  run.crowd.clear(run.ball.x, run.ball.z);
}

/** Back onto the last firm ground it crossed (after the tar). */
export function putBack(run) {
  placeBall(run.ball, ...run.safe);
  run.sinking = 0;
  run.crowd.clear(run.ball.x, run.ball.z);
}

/** The surface the ball is rolling on, if it's on the ground and not on something. */
export function under(run) {
  const b = run.ball;
  if (!b.grounded || b.on) return null;
  const c = run.map.cell(Math.floor(b.x), Math.floor(b.z));
  if (!c) return null;
  // Only if it's on the tile itself, not on a deck over it.
  const h = run.map.heightAt(b.x, b.z);
  return h != null && b.y - b.r - h < 0.12 ? c : null;
}

/**
 * One step of everything. `push` is along the ground ([x, z]). While
 * `live`, the rules apply and the drums and the crowd come at the ball; while
 * `moving` is false the ball stays where it is. Returns what happened: how
 * hard it hit anything, the knocks and what they cost, who it smashed, what
 * it picked up, and `outcome` — null, or 'blunted', 'squashed' or 'sunk'.
 */
export function stepRun(run, push, dt = STEP, { live = true, moving = true, boost = false } = {}) {
  const ball = run.ball;
  run.time += dt;
  run.hazards.place(run.time, dt);
  const honks = run.traffic.step(dt, live && moving ? ball : null);
  const events = run.hazards.step(dt, run.time, live && moving ? ball : null);
  const crowd = run.crowd.step(dt, run.time, live && moving ? ball : null);
  const out = { accelerating: false, impact: 0, hurt: 0, hits: [], honks, picked: [], gpu: null, sharpened: null, district: null, outcome: null, surface: null, smashes: [], breaks: [], knocks: [], shouts: [], cred: 0, combo: 0 };
  if (!moving) return out;

  for (const k in run.cooldown) run.cooldown[k] -= dt;
  run.comboTime = Math.max(0, run.comboTime - dt);
  if (run.comboTime === 0) run.combo = 0;
  const cell = under(run);
  const kind = surfaceOf(cell);
  out.surface = cell?.surface ?? null;
  const grip = cell ? kind.grip : 1;
  // Street furniture: through it if the ball comes at it hard enough, otherwise it is as solid as a wall.
  const speed = Math.hypot(ball.vx, ball.vz);
  if (live && speed >= SLOWEST) {
    for (const p of run.breakables) {
      if (p.broken || Math.abs(p.x - ball.x) > p.r + 2.5 || Math.abs(p.z - ball.z) > p.r + 2.5) continue;
      if (ball.y - ball.r > p.top || ball.y + ball.r < p.base) continue;
      const dx = p.x - ball.x, dz = p.z - ball.z, d = Math.hypot(dx, dz) || 1e-6;
      if (d - p.r - ball.r > 0.1 + speed * dt * 2) continue;
      if ((ball.vx * dx + ball.vz * dz) / d < p.at) continue;
      p.broken = true;
      for (const box of p.boxes) box.solid = false;
      ball.vx *= 0.94; ball.vz *= 0.94;
      run.cred += p.hype;
      run.broke++;
      out.cred += p.hype;
      out.breaks.push(p);
    }
  }

  // Accelerating: only while pushing, and only with something in the meter.
  const pushing = push[0] !== 0 || push[1] !== 0;
  const on = live && boost && pushing && !run.winded && run.accel > 0;
  run.accel = Math.max(0, Math.min(1, run.accel + (on ? -ACCEL.drain : ACCEL.refill) * dt));
  if (run.accel <= 0) run.winded = true;
  else if (run.winded && run.accel >= ACCEL.resume) run.winded = false;
  out.accelerating = on;
  const result = stepBall(ball, run.world, push[0] * grip, push[1] * grip, dt, {
    drag: cell ? kind.drag : 0.5,
    push: on ? PUSH * ACCEL.push : PUSH,
    topSpeed: on ? TOP_SPEED * ACCEL.top : TOP_SPEED,
  });
  // Never under the ground: if something shoved it there (a car into a kerb or a bank), up onto it again.
  const ground = run.map.heightAt(ball.x, ball.z);
  if (ground != null && ball.y < ground - 0.02) {
    ball.y = ground + ball.r;
    ball.vy = Math.max(0, ball.vy);
  }
  out.impact = result.impact;
  if (!live) return out;

  const hurt = (n, why) => {
    n *= DURABILITY;
    run.spikes = Math.max(0, run.spikes - n);
    out.hurt += n;
    out.hits.push(why);
  };

  if (result.crushed) { out.outcome = 'squashed'; return out; }
  if (result.landed && result.impact > HURT.landing) {
    hurt(result.impact >= BREAK_SPEED ? 55 + (result.impact - BREAK_SPEED) * 10 : (result.impact - HURT.landing) * 9, 'landing');
  }
  const car = run.traffic.touching(ball);
  if (car && result.impact > HURT.car && run.cooldown.car <= 0) {
    hurt(8 + (result.impact - HURT.car) * 7, 'car');
    run.cooldown.car = 0.5;
    if (!honks.includes(car)) honks.push(car);
  }
  if (events.bump > HURT.drum && run.cooldown.drum <= 0) {
    hurt((events.bump - HURT.drum) * 6 + 4, 'drum');
    run.cooldown.drum = 0.4;
  }
  if (events.burned && run.cooldown.flare <= 0) {
    hurt(HURT.flare, 'flare');
    ball.vy = Math.max(ball.vy, 5.5);
    run.cooldown.flare = 0.8;
  }
  // The people: smashed, or bounced off (which costs some of the spikes).
  for (const e of crowd) {
    if (e.type === 'shout') { out.shouts.push(e.foe); continue; }
    if (e.type === 'smash') {
      run.smashed++;
      run.combo = run.comboTime > 0 ? Math.min(COMBO.most, run.combo + 1) : 1;
      run.comboTime = COMBO.window;
      run.bestCombo = Math.max(run.bestCombo, run.combo);
      const cred = Math.round(e.hype * run.combo);
      run.cred += cred;
      out.cred += cred;
      out.combo = run.combo;
      out.smashes.push(e);
    } else {
      hurt(e.damage * HURT.foe, 'foe');
      out.knocks.push(e);
    }
  }
  if (run.spikes <= 0) { out.outcome = 'blunted'; return out; }
  if (ball.y < run.killY) { out.outcome = 'sunk'; return out; }

  // Tar: it goes under if it sits in it.
  if (cell && kind.sinks) {
    run.sinking += dt;
    if (run.sinking > 0.7) { out.outcome = 'sunk'; return out; }
  } else {
    run.sinking = Math.max(0, run.sinking - dt * 2);
  }

  // Firm ground to come back to.
  if (cell && !kind.sinks) {
    const cx = Math.floor(ball.x), cz = Math.floor(ball.z);
    if (run.map.isSafe(cx, cz)) run.safe = [cx + 0.5, cell.h[0] + ball.r, cz + 0.5];
  }

  // Likes, golden GPUs, whetstones.
  for (const s of run.likes) {
    if (s.got || Math.abs(s.x - ball.x) > 1 || Math.abs(s.z - ball.z) > 1) continue;
    if (Math.hypot(s.x - ball.x, s.y - ball.y, s.z - ball.z) < REACH.like) { s.got = true; out.picked.push(s); }
  }
  for (const g of run.gpus) {
    if (g.got || Math.abs(g.x - ball.x) > 1.5 || Math.abs(g.z - ball.z) > 1.5) continue;
    if (Math.hypot(g.x - ball.x, g.y - ball.y, g.z - ball.z) < REACH.gpu) { g.got = true; out.gpu = g; }
  }
  for (const p of run.stones) {
    if (Math.hypot(p.x - ball.x, p.z - ball.z) < REACH.stone && Math.abs(ball.y - ball.r - p.y) < 0.6) {
      if (run.checkpoint !== p || run.spikes < SPIKES) out.sharpened = p;
      run.checkpoint = p;
      run.spikes = SPIKES;
    }
  }
  const d = run.map.districtAt(ball.x, ball.z);
  if (d && d !== run.district) { run.district = d; out.district = d; }
  return out;
}
