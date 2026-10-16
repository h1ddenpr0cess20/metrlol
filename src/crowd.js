import { createFoeMesh, FOES, KNOCKED_OUT } from './foes.js';
import { collideBalls, createBall, placeBall, PUSH, stepBall } from './physics.js';
import { closingSpeed, resolveImpact } from './smash.js';

/**
 * The people in the way. Each is a ball to the physics, as the ball is: they
 * stand about their patch of the map, wander a little, and come at the ball
 * if it comes near, shouting. What happens when they meet is decided by how
 * fast the two were coming together (`smash.js`): fast enough and they are
 * smashed and thrown clear; not fast enough and they bounce off it, and it
 * costs the ball some of its spikes.
 *
 * Only those near the ball are simulated. Everyone else stands where they
 * were, in the pose they were in.
 */

/** Further than this from the ball, a foe stands still and is not posed. */
const SLEEP = 24;

/** How near the ball has to come for a foe to notice it, if the map doesn't say. */
const NOTICE = 6.5;

/** How long a foe that has taken a knock can't be hit again. */
const GUARD = Object.freeze({ foe: 0.9, boss: 1.5 });

/** How long before a foe shouts again. */
const HOARSE = 20;

export function createCrowd(GFX, map, world, { killY, enabled = true } = {}) {
  const group = new GFX.Group();
  group.name = 'crowd';
  const axis = new GFX.Vector3();
  const spinQ = new GFX.Quaternion();

  const foes = (enabled ? map.foes : []).map((m, i) => {
    const stats = FOES[m.kind];
    if (!stats) throw new Error(`${map.name}: no such foe as ${m.kind}`);
    const look = createFoeMesh(GFX, m.kind);
    look.group.rotation.y = m.facing ?? 0;
    group.add(look.group);
    const ground = map.heightAt(m.x, m.z) ?? 0;
    const ball = createBall({ x: m.x, y: ground + stats.radius, z: m.z, r: stats.radius, mass: stats.boss ? 50 : 2.5 });
    ball.grounded = true;
    return {
      ...m, i, stats, look, ball, heading: m.facing ?? 0, moving: false, chasing: false, striking: false,
      dead: false, gone: false, hp: stats.hp ?? stats.toughness, guard: 0, flung: null, downAt: 0,
      home: [m.x, ground + stats.radius, m.z], drift: null, driftUntil: 0, shoutedAt: -HOARSE, awake: false,
    };
  });

  /** The foe, thrown clear: up and away along `dir` ([x, z], unit), as hard as `speed`. */
  function fling(foe, dir, speed, time) {
    const b = foe.ball;
    const away = 3.5 + speed * 0.9;
    foe.dead = true;
    foe.downAt = time;
    foe.flung = {
      x: b.x, y: b.y - b.r, z: b.z, vx: dir[0] * away, vy: 4.5 + speed * 0.45, vz: dir[1] * away,
      axis: [-dir[1], dir[0]], rate: 7 + speed * 0.6, t: 0, ground: map.heightAt(b.x, b.z) ?? b.y - b.r,
    };
  }

  return {
    group, foes,

    /**
     * Somebody is standing where the ball is about to be put (a respawn, the
     * start): everyone within `r` of (x, z) is moved just outside it, to
     * somewhere they can stand, and made to call it home.
     */
    clear(x, z, r = 2.2) {
      for (const f of foes) {
        if (f.gone || f.dead) continue;
        const b = f.ball;
        const d = Math.hypot(b.x - x, b.z - z);
        if (d >= r + b.r) continue;
        const base = d > 1e-3 ? Math.atan2(b.z - z, b.x - x) : f.i;
        let moved = false;
        for (let ring = 0; ring < 3 && !moved; ring++) {
          for (let k = 0; k < 16 && !moved; k++) {
            const a = base + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * (Math.PI / 8);
            const rr = r + b.r + 0.3 + ring * 0.8;
            const nx = x + Math.cos(a) * rr, nz = z + Math.sin(a) * rr;
            const ground = map.heightAt(nx, nz);
            if (ground == null || !map.isOpen(nx, nz, Infinity, { near: true })) continue;
            placeBall(b, nx, ground + b.r, nz);
            f.home = [nx, ground + b.r, nz];
            moved = true;
          }
        }
        if (!moved) f.gone = true;
      }
    },

    /**
     * One step. `ball` is the player's, or null. Returns what happened to it
     * and the people: { type: 'smash' | 'bonk' | 'tap' | 'shout', grade, foe,
     * speed, damage, hype } for each.
     */
    step(dt, time, ball) {
      const events = [];
      for (const f of foes) {
        if (f.gone) continue;
        f.guard = Math.max(0, f.guard - dt);

        // Thrown clear: a fall through the air, then gone.
        if (f.flung) {
          const k = f.flung;
          k.t += dt;
          k.vy -= 24 * dt;
          k.x += k.vx * dt; k.y += k.vy * dt; k.z += k.vz * dt;
          if (k.y < k.ground) { k.y = k.ground; k.vy = Math.abs(k.vy) * 0.25; k.vx *= 0.6; k.vz *= 0.6; }
          if (time - f.downAt > KNOCKED_OUT) f.gone = true;
          continue;
        }

        const b = f.ball;
        const dx = ball ? ball.x - b.x : 0, dz = ball ? ball.z - b.z : 0;
        const dist = ball ? Math.hypot(dx, dz) : Infinity;
        f.awake = dist < SLEEP;
        if (!f.awake) { f.moving = false; f.chasing = false; continue; }

        // What it does: come at the ball if it is near its patch; otherwise drift about, or go home.
        const notice = f.notice ?? NOTICE;
        const fromHome = ball ? Math.hypot(ball.x - f.home[0], ball.z - f.home[2]) : Infinity;
        let ax = 0, az = 0;
        f.chasing = !!ball && dist < notice && fromHome < f.range + notice && Math.abs(ball.y - b.y) < 1.6 && dist > 1e-3;
        if (f.chasing) {
          ax = dx / dist; az = dz / dist;
          if (time - f.shoutedAt > HOARSE) {
            f.shoutedAt = time;
            events.push({ type: 'shout', foe: f });
          }
        } else {
          const hx = f.home[0] - b.x, hz = f.home[2] - b.z, hd = Math.hypot(hx, hz);
          if (hd > f.range) { ax = hx / hd * 0.6; az = hz / hd * 0.6; f.drift = null; }
          else {
            if (time > f.driftUntil) {
              // A short walk somewhere, then a stand about.
              const idle = f.drift != null;
              const a = ((f.i * 2.399963 + time * 0.7) % (Math.PI * 2));
              f.drift = idle ? null : [Math.cos(a) * 0.45, Math.sin(a) * 0.45];
              f.driftUntil = time + (idle ? 1.8 + (f.i % 5) * 0.5 : 1.0 + (f.i % 3) * 0.4);
            }
            if (f.drift) { ax = f.drift[0]; az = f.drift[1]; }
          }
        }
        stepBall(b, world, ax, az, dt, { push: PUSH * 0.4, topSpeed: f.chasing ? f.stats.speed : f.stats.speed * 0.35 });
        const speed = Math.hypot(b.vx, b.vz);
        f.moving = speed > 0.25;
        if (speed > 0.2) f.heading = Math.atan2(b.vx, b.vz);
        if (b.y < killY) { f.gone = true; continue; }

        // Meeting the ball.
        f.striking = false;
        if (!ball) continue;
        const reach = ball.r + b.r;
        const d3 = Math.hypot(ball.x - b.x, ball.y - b.y, ball.z - b.z);
        if (d3 < reach + 0.35) f.striking = true;
        if (d3 >= reach) continue;
        const stats = f.stats;
        const foe = { x: b.x, y: b.y - b.r, z: b.z, height: b.r * 2.4 };
        const speedIn = closingSpeed(ball, foe, [b.vx, b.vy, b.vz]);
        const hit = resolveImpact({ speed: speedIn, foe: stats });
        const ndx = (b.x - ball.x), ndz = (b.z - ball.z), nd = Math.hypot(ndx, ndz) || 1;
        if (f.guard > 0) { collideBalls(ball, b, 0.9); continue; }

        // Worn down, whether or not it is smashed.
        f.hp -= hit.hits;
        const smashed = (hit.grade === 'smash' || hit.grade === 'crit') && !stats.boss;
        if (smashed || f.hp <= 0) {
          fling(f, [ndx / nd, ndz / nd], speedIn, time);
          events.push({ type: 'smash', grade: smashed ? hit.grade : 'bonk', foe: f, speed: speedIn, damage: hit.damage, hype: stats.hype * hit.hype });
        } else {
          events.push({ type: hit.grade, grade: hit.grade, foe: f, speed: speedIn, damage: hit.damage, hype: 0 });
          f.guard = stats.boss ? GUARD.boss : GUARD.foe;
          collideBalls(ball, b, 0.9);
        }
      }
      return events;
    },

    /** Meshes to match, once a frame. */
    sync(dt, time) {
      for (const f of foes) {
        f.look.group.visible = !f.gone;
        if (f.gone) continue;
        const b = f.ball;
        if (f.flung) {
          const k = f.flung;
          f.look.group.position.set(k.x, k.y, k.z);
          axis.set(k.axis[0], 0, k.axis[1]);
          spinQ.setFromAxisAngle(axis, Math.min(Math.PI * 1.6, k.t * k.rate));
          f.look.group.quaternion.copy(spinQ);
          f.look.animate(time + f.i * 1.37, false, { down: true });
          continue;
        }
        f.look.group.position.set(b.x, b.y - b.r, b.z);
        f.look.group.quaternion.set(0, 0, 0, 1);
        let d = f.heading - f.look.body.rotation.y;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        f.look.body.rotation.y += d * Math.min(1, dt * 8);
        if (f.awake || !f.posed) {
          f.posed = true;
          f.look.animate(time + f.i * 1.37, f.moving, { chasing: f.chasing, striking: f.striking });
        }
      }
    },
  };
}
