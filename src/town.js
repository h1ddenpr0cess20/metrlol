import { BREAKABLE } from './breakables.js';
import { windowLamps } from './buildings.js';
import { structureLights } from './structures.js';
import { TownMap } from './map.js';

/**
 * The whole world, one map: Metrlol, a city of takes. No levels — it is all
 * there from the start, and the ball can roll anywhere it can get to. Nine
 * parts of town, three across and three down, the superhighway down the
 * east side and the far side of it:
 *
 *   Portland Heights  north-west, the suburbs, and home: co-op houses, the
 *                 drained pool that is now the community garden, a tiny house
 *                 village, the consensus maze, the food co-op with its roof
 *                 you can get up on and the commune behind it, and the skate
 *                 park, four blocks of it (`skatePark`).
 *   The Alignment District  north, the middle: the Longterm Institute and
 *                 the alley behind it, the group house's car park up to its
 *                 roof, the slippery slope, the doom clock, the plaza where
 *                 the Pause protest has been for a year, the rally stage, a
 *                 building site whose crane has been paused since March.
 *   The Ivory Tower  north-east, the campus: the library (closed for
 *                 training), the lecture hall sunk in the quad, the trolley
 *                 problem, going round, and the tower itself, a ramp three
 *                 times round it to the top, where it's above it all.
 *   The Pause Compound  west: tanks, a catwalk, a lift up the tank of doom,
 *                 hot takes alley, the bunker. The Prophet of Doom lives here.
 *   The Timeline  the middle, downtown: towers with screens on them, Ratio
 *                 Square, the echo chamber, the discourse pit, the infinite
 *                 scroll (a walkway in the air, to the end of it), and the
 *                 engagement farm, where the likes are grown.
 *   Hype Valley   east: the hype cycle, in hills — the peak of inflated
 *                 expectations, the trough of disillusionment, the slope of
 *                 enlightenment, the plateau of productivity — and the
 *                 garage where it all started, the podcast studio, and the
 *                 infinity pool on top of Sand Hill.
 *   Brussels-sur-Mer  south-west: the Commission, the stamping hall, the
 *                 charging station (+21% VAT), the regulatory sandbox, a club
 *                 with a queue, the Grand-Place, the beach, the pier and the sea.
 *   The Compute Farm  south-east: the server halls and the hot aisle between
 *                 them, the cooling towers, the chilled water main, the data
 *                 lake, the cable yard, the hockey stick.
 *   The Information Superhighway  down the east side, four lanes of trucks
 *                 and cars. Nobody brakes. Nobody reads. The cookie banner is
 *                 on the hill on the far side, over the footbridge.
 *
 * Traffic drives round the city on the right. x runs to the right of the
 * map, z down it; the map is 256 tiles each way and a ring of grassy bank
 * keeps everything on it.
 */

export const SIZE = 256;
const CURB = 0.15;

const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** The bank round the edge: up from nothing five tiles in to two and a half high at the very edge, a fence along the top. */
const berm = (X, Z) => {
  const d = Math.min(X, Z, SIZE - X, SIZE - Z);
  return d < 5 ? (5 - d) * 0.5 : 0;
};

/**
 * The hype cycle, west to east across Hype Valley: the trigger, the peak of
 * inflated expectations, the trough of disillusionment, the slope of
 * enlightenment up to the plateau of productivity. Each stretch eases in
 * and out; the ridge fades out to level at its ends.
 */
const HYPE = [[160, 0], [170, 0], [187, 6.5], [199, -1.5], [203, -1.5], [217, 2.5], [221, 2.5], [226, 0]];
const HYPE_Z = [90, 122];
function hype(X, Z) {
  if (X <= HYPE[0][0] || X >= HYPE.at(-1)[0] || Z <= HYPE_Z[0] || Z >= HYPE_Z[1]) return 0;
  let h = 0;
  for (let i = 0; i < HYPE.length - 1; i++) {
    const [x0, h0] = HYPE[i], [x1, h1] = HYPE[i + 1];
    if (X >= x0 && X <= x1) { h = h0 + (h1 - h0) * smooth((X - x0) / (x1 - x0)); break; }
  }
  return h * Math.min(smooth((Z - HYPE_Z[0]) / 8), smooth((HYPE_Z[1] - Z) / 8));
}

/** Sand Hill: a round hill, flat on top for the infinity pool. */
const SAND_HILL = { x: 208, z: 146, top: 6, foot: 15, h: 3 };
function sandHill(X, Z) {
  const r = Math.hypot(X - SAND_HILL.x, Z - SAND_HILL.z);
  return SAND_HILL.h * smooth((SAND_HILL.foot - r) / (SAND_HILL.foot - SAND_HILL.top));
}

const ground = (X, Z) => berm(X, Z) + hype(X, Z) + sandHill(X, Z);

/** The same numbers every time: a little generator from a seed. */
function random(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => ((s = Math.imul(s ^ (s >>> 15), 2246822519) >>> 0) / 4294967296);
}

export function createTown() {
  const c = new TownMap({ name: 'Metrlol', cols: SIZE, rows: SIZE });
  c.surface(0, 0, SIZE, SIZE, ground, { surface: 'grass' });
  for (let z = 0; z < SIZE; z++) {
    for (let x = 0; x < SIZE; x++) {
      const cell = c.cell(x, z);
      if (cell.h.some((v) => v > 0.05) && Math.min(x, z, SIZE - 1 - x, SIZE - 1 - z) < 5) cell.surface = 'berm';
    }
  }

  c.start = { x: 16, z: 19 };

  // The fence along the top of the bank, all the way round.
  const F = 0.35, top = berm(0, 0) + 1.3;
  c.prop('fence', 0, 0, { size: SIZE, inset: F });
  c.solid(0, 0, 0, SIZE, top, F).solid(0, 0, SIZE - F, SIZE, top, SIZE);
  c.solid(0, 0, 0, F, top, SIZE).solid(SIZE - F, 0, 0, SIZE, top, SIZE);

  streets(c);
  portlandHeights(c);
  alignmentDistrict(c);
  ivoryTower(c);
  pauseCompound(c);
  timeline(c);
  hypeValley(c);
  brussels(c);
  computeFarm(c);
  superhighway(c);
  furnish(c);
  scrub(c);
  streetFurniture(c);
  traffic(c);
  crowds(c);
  windowLamps(c);
  structureLights(c);

  c.district('Portland Heights', 0, 0, 78, 86, '#7cb257');
  c.district('The Alignment District', 78, 0, 80, 86, '#8a8f9a');
  c.district('The Ivory Tower', 158, 0, 73, 86, '#e2ddd2');
  c.district('The Pause Compound', 0, 86, 78, 80, '#9aa0aa');
  c.district('The Timeline', 78, 86, 80, 80, '#5a6ac8');
  c.district('Hype Valley', 158, 86, 73, 80, '#d8a040');
  c.district('Brussels-sur-Mer', 0, 166, 122, 90, '#4a6ac8');
  c.district('The Compute Farm', 122, 166, 109, 90, '#b07c48');
  c.district('The Information Superhighway', 231, 0, 12, SIZE, '#5a5d66');
  c.district('The Far Side', 243, 0, 13, SIZE, '#8c9a5a');
  return c;
}

const RED = { bg: '#d81c2a', fg: '#fff6ee' }, BLUE = { bg: '#1a3aa0', fg: '#f4d020' }, DARK = { bg: '#16161a', fg: '#e8e4d8' };

/**
 * A freestanding sign with words on both faces, solid unless the ball comes
 * at it hard, standing on (x, z): as wide as its longest line and as tall as
 * its lines need for letters a fifth of a tile high or so, unless `w` and `h`
 * say.
 */
function placard(c, x, z, text, { facing = 0, w = null, h = null, bg, fg, y = null } = {}) {
  const lines = text.split('\n');
  w ??= Math.min(3.2, Math.max(1.6, 0.125 * Math.max(...lines.map((l) => l.length)) + 0.3));
  h ??= Math.min(1.6, Math.max(1.0, 0.24 * lines.length + 0.25));
  const ex = facing % 2 === 0 ? w / 2 : 0.1, ez = facing % 2 === 0 ? 0.1 : w / 2;
  // On a slope, the board goes level with the higher post, and each post down to its own ground.
  const feet = [c.heightAt(x - ex, z - ez), c.heightAt(x + ex, z + ez), c.heightAt(x, z)].map((v) => v ?? 0);
  const base = y ?? Math.max(...feet);
  c.prop('placard', x, z, { text, facing, w, h, bg, fg, y: base });
  const prop = c.props.at(-1);
  c.smashable({ kind: 'placard', name: 'placard', ...BREAKABLE.placard, prop }, () => c.solid(x - ex, Math.min(base, ...feet), z - ez, x + ex, base + 0.5 + h, z + ez));
}

/** A screen on the face of a building: `text` lit up, `w` by `h`, its middle at (x, y + h / 2, z), facing `facing` quarter turns (0 toward +z). */
function screen(c, x, z, y, text, { facing = 0, w = 3, h = 1.6, bg, fg, glow } = {}) {
  c.prop('screen', x, z, { y, text, facing, w, h, bg, fg, glow });
}

/** A block: a raised sidewalk all round, and what's inside on top of it. */
function block(c, x, z, w, d, inside = 'lawn') {
  c.flat(x, z, w, d, CURB, { surface: 'sidewalk' });
  c.flat(x + 1, z + 1, w - 2, d - 2, CURB, { surface: inside });
}

function house(c, x, z, w, d, wall, { ridge = 'x', door = 'n', h = 1.6 } = {}) {
  c.block(x, z, w, d, CURB + h, { roof: 'pitched', ridge, wall, pitch: 1.0, facade: 'house', base: CURB, door, lit: 0.55 });
}

/** A hedge (or any wall): drawn, and solid. */
function wall(c, x0, z0, x1, z1, y0, y1, colour, finish = 'matte', tex = null) {
  c.prop('wall', x0, z0, { x1, z1, y0, y1, colour, finish, tex });
  c.solid(x0, y0, z0, x1, y1, z1);
}

/** A bowl sunk `depth` into the ground over the rectangle, level at the bottom, its sides easing up to `rim`. */
function bowl(c, x, z, w, d, rim, depth, surface, flat = 0.3) {
  c.surface(x, z, w, d, (X, Z) => {
    const u = (2 * (X - x)) / w - 1, v = (2 * (Z - z)) / d - 1;
    const k = Math.max(Math.abs(u), Math.abs(v));
    return rim - depth * (1 - smooth(Math.max(0, (k - flat) / (1 - flat))));
  }, { surface });
}

/**
 * Rings of hedge, one inside the next, each with its way in on the side
 * the one round it hasn't: `gaps`, 'n' or 's' for each, outermost first.
 */
function maze(c, x0, z0, x1, z1, gaps, { colour = '#3f7a34', tex = 'hedge', y = CURB, h = 0.9, step = 2.2 } = {}) {
  const t = 0.4;
  gaps.forEach((gap, i) => {
    const a = x0 + i * step, b = z0 + i * step, cc = x1 - i * step, d = z1 - i * step;
    const mid = (a + cc) / 2;
    const hedge = (p, q, r, s) => wall(c, p, q, r, s, y, y + h, colour, 'matte', tex);
    const side = (zz, open) => {
      if (open) { hedge(a, zz, mid - 1, zz + t); hedge(mid + 1, zz, cc, zz + t); }
      else hedge(a, zz, cc, zz + t);
    };
    side(b, gap === 'n');
    side(d - t, gap === 's');
    hedge(a, b, a + t, d);
    hedge(cc - t, b, cc, d);
  });
}

/**
 * One time round a square tower, `S` across, a ramp two tiles wide climbing
 * from `h0` at its south-west corner, up the west side, along the north,
 * down the east and back along the south to `h1`, where it comes out on the
 * square inside it — the next time round, or the top.
 */
function lap(c, x, z, S, h0, h1, opts) {
  const q = (h1 - h0) / 4;
  c.flat(x, z + S - 2, 2, 2, h0, opts);
  c.slope(x, z + 2, 2, S - 4, h0 + q, h0, 'z', opts);
  c.flat(x, z, 2, 2, h0 + q, opts);
  c.slope(x + 2, z, S - 4, 2, h0 + q, h0 + 2 * q, 'x', opts);
  c.flat(x + S - 2, z, 2, 2, h0 + 2 * q, opts);
  c.slope(x + S - 2, z + 2, 2, S - 4, h0 + 2 * q, h0 + 3 * q, 'z', opts);
  c.flat(x + S - 2, z + S - 2, 2, 2, h0 + 3 * q, opts);
  c.slope(x + 2, z + S - 2, S - 4, 2, h1, h0 + 3 * q, 'x', opts);
}

/** Street lamps at each of `points` where there's room for one, the arm out toward `angle`. */
function lamps(c, points, angle = 0) {
  for (const [x, z] of points) if (c.isOpen(x, z, Infinity, { near: true })) c.place('streetlamp', x, z, { angle });
}

/** Whether something at (x, z) would stand in front of the sign `p`: too near it, or nearer on the side the camera looks from (the south-east). */
const inView = (p, x, z) => {
  const d = Math.hypot(x - p.x, z - p.z);
  return d < 3.5 || (x > p.x - 1.5 && z > p.z - 1.5 && d < 6);
};

/** `n` of a model scattered over the rectangle, where somebody could stand (so not in a wall or on a road), the same every time. */
function scatter(c, name, x, z, w, d, n, { seed = 1, scale = [0.9, 1.2], surfaces = null, maxH = 0.4 } = {}) {
  const rnd = random(seed);
  for (let placed = 0, tries = 0; placed < n && tries < n * 40; tries++) {
    const px = x + 0.5 + rnd() * (w - 1), pz = z + 0.5 + rnd() * (d - 1);
    const cell = c.cell(Math.floor(px), Math.floor(pz));
    if (!cell || (surfaces && !surfaces.includes(cell.surface)) || ['road', 'highway', 'sidewalk'].includes(cell.surface)) continue;
    if (!c.isOpen(px, pz, maxH) || c.props.some((q) => q.type === 'placard' && inView(q, px, pz))) continue;
    c.place(name, px, pz, { scale: scale[0] + rnd() * (scale[1] - scale[0]), angle: rnd() * 6.28 });
    placed++;
  }
}

/**
 * The streets: `[x, z0, z1]` running down the map four tiles wide, `[z, x0, x1]`
 * running across it. The avenues go right across the city; each part of town
 * has streets of its own.
 */
const DOWN = [
  [6, 6, 222], [30, 6, 88], [53, 6, 36], [76, 6, 168], [103, 6, 168], [130, 6, 168], [156, 6, 168], [226, 6, 245],
  [62, 164, 222], [120, 164, 245], [176, 164, 200],
];
const ACROSS = [
  [6, 6, 230], [32, 6, 160], [58, 6, 34], [58, 76, 160], [84, 6, 230], [164, 6, 230],
  [110, 76, 160], [136, 76, 160], [124, 156, 230],
  [192, 6, 124], [218, 6, 124], [196, 120, 230], [241, 120, 230],
];

/** Where a street running down the map crosses one running across it. */
function junctions() {
  const out = [];
  for (const [x, z0, z1] of DOWN) for (const [z, x0, x1] of ACROSS) if (x >= x0 && x + 4 <= x1 && z >= z0 && z + 4 <= z1) out.push({ x, z, n: z0 < z, s: z1 > z + 4, w: x0 < x, e: x1 > x + 4 });
  return out;
}

function streets(c) {
  for (const [x, z0, z1] of DOWN) c.flat(x, z0, 4, z1 - z0, 0, { surface: 'road' });
  for (const [z, x0, x1] of ACROSS) c.flat(x0, z, x1 - x0, 4, 0, { surface: 'road' });

  const crossing = (v, list) => list.some(([s, a, b]) => v.at >= a - 0.01 && v.at <= b + 0.01 && v.p >= s - 0.01 && v.p <= s + 4.01);
  // Yellow dashes down the middle of each street, but not across the junctions.
  for (const [z, x0, x1] of ACROSS) {
    for (let x = x0 + 0.5; x < x1 - 1; x += 2) {
      if (!crossing({ p: x, at: z + 2 }, DOWN) && !crossing({ p: x + 1, at: z + 2 }, DOWN)) c.mark(x, z + 1.94, 1, 0.12, '#f2c230');
    }
  }
  for (const [x, z0, z1] of DOWN) {
    for (let z = z0 + 0.5; z < z1 - 1; z += 2) {
      if (!crossing({ p: z, at: x + 2 }, ACROSS) && !crossing({ p: z + 1, at: x + 2 }, ACROSS)) c.mark(x + 1.94, z, 0.12, 1, '#f2c230');
    }
  }
  // Zebra crossings on every side of every junction the street goes on from.
  for (const j of junctions()) {
    for (let k = 0; k < 4; k++) {
      if (j.n) c.mark(j.x + 0.2 + k, j.z - 0.9, 0.5, 0.8);
      if (j.s) c.mark(j.x + 0.2 + k, j.z + 4.1, 0.5, 0.8);
      if (j.w) c.mark(j.x - 0.9, j.z + 0.2 + k, 0.8, 0.5);
      if (j.e) c.mark(j.x + 4.1, j.z + 0.2 + k, 0.8, 0.5);
    }
  }
}

/**
 * Street lamps on the corners of the junctions, their arms out over them,
 * and more along the long streets: wherever there is pavement or grass to
 * stand one on, with nothing there already.
 */
function streetFurniture(c) {
  const free = (x, z) => {
    const cell = c.cell(Math.floor(x), Math.floor(z));
    if (!cell || ['road', 'highway', 'water', 'tar', 'sand'].includes(cell.surface) || Math.max(...cell.h) > 0.5 || Math.min(...cell.h) < -0.05) return false;
    if (c.solids.some((s) => x > s.min[0] - 0.5 && x < s.max[0] + 0.5 && z > s.min[2] - 0.5 && z < s.max[2] + 0.5 && s.min[1] < 3)) return false;
    return !c.cylinders.some((q) => Math.hypot(q.x - x, q.z - z) < q.r + 0.5);
  };
  const lamp = (x, z, angle) => { if (free(x, z)) c.place('streetlamp', x, z, { angle }); };
  const kerb = 0.2;
  const all = junctions();
  for (const j of all) {
    lamp(j.x - kerb, j.z - kerb, -Math.PI / 4);
    lamp(j.x + 4 + kerb, j.z + 4 + kerb, (3 * Math.PI) / 4);
  }
  const near = (x, z) => all.some((j) => x > j.x - 5 && x < j.x + 9 && z > j.z - 5 && z < j.z + 9);
  for (const [x, z0, z1] of DOWN) for (let z = z0 + 11.5; z < z1 - 6; z += 22) if (!near(x, z)) lamp(x - kerb, z, 0);
  for (const [z, x0, x1] of ACROSS) for (let x = x0 + 11.5; x < x1 - 6; x += 22) if (!near(x, z)) lamp(x, z - kerb, -Math.PI / 2);
}

// ——————————————————————————————————————————————————————————— Portland Heights

function portlandHeights(c) {
  const walls = ['#e6dccb', '#c9d8e8', '#f0d9a8', '#d8b8c8', '#cfe3c2', '#f2e6d0', '#e8c8a8', '#c8d8c0'];

  // Home, and the neighbours.
  block(c, 10, 10, 20, 22);
  house(c, 12, 12, 5, 5, '#f0d9a8');
  house(c, 23, 12, 5, 5, walls[1]);
  house(c, 12, 25, 5, 5, walls[3], { door: 's' });
  house(c, 23, 25, 5, 5, walls[4], { door: 's' });
  c.paint(14, 11, 1, 1, 'concrete');
  c.whetstone('Home', 20.5, 20.5);
  c.place('mailbox', 15.6, 10.6, { turn: 2 });
  c.place('tree', 26.5, 21, { scale: 1.1 });
  c.place('tree', 12, 21.5, { scale: 0.95, angle: 1 });
  c.place('hydrant', 10.25, 31.4);
  c.gpu('The free stuff table', 20, 29.5);
  c.likeLine(19.4, 13, 19.4, 18, 3).likeLine(19.4, 23, 19.4, 28, 3);
  placard(c, 11.8, 23.5, 'IN THIS HOUSE\nWE BELIEVE\nIN EVERYTHING', { facing: 3 });

  // The drained pool, now the community garden.
  block(c, 34, 10, 19, 22);
  house(c, 36, 12, 5, 4, walls[2]);
  house(c, 46, 12, 5, 4, walls[5]);
  bowl(c, 38, 18, 11, 10, CURB, 1.3, 'pool', 0.35);
  c.gpu('The community garden', 43.5, 23);
  c.likeLine(38.5, 17, 48.5, 17, 6);
  c.prop('chair', 50.5, 21).prop('chair', 50.5, 24.5);
  placard(c, 43.5, 30.2, 'COMMUNITY\nGARDEN MEETING\nTHU 9PM (AGAIN)', { facing: 0 });

  // The tiny house village: no cars, no lawns, no privacy.
  block(c, 57, 10, 19, 22, 'lawn');
  let k = 0;
  for (const x of [59, 64, 70]) {
    for (const z of [12, 18, 25]) {
      if (x === 64 && z === 18) continue;
      house(c, x, z, 3, 3, walls[k++ % walls.length], { door: z === 25 ? 's' : 'n' });
    }
  }
  c.gpu('The tiny house village', 65.5, 19.5);
  c.likeLine(63, 16.5, 68, 16.5, 4).likeLine(63, 23, 68, 23, 4);
  placard(c, 66, 30.3, 'TINY HOUSES\nBIG FEELINGS', { facing: 0 });

  // The consensus maze (still voting on the way out).
  block(c, 10, 36, 20, 22);
  maze(c, 12, 38, 28, 56, ['n', 's', 'n']);
  c.gpu('Middle of the consensus maze', 20, 47);
  c.likeLine(13.2, 40, 13.2, 54, 6);
  c.likeLine(15.4, 52.5, 24.6, 52.5, 5);
  placard(c, 15, 37.3, 'CONSENSUS MAZE\nSTILL VOTING ON\nTHE EXIT', { facing: 2 });

  skatePark(c);

  // The food co-op, with a loading ramp up its side to the roof.
  block(c, 10, 62, 20, 22, 'concrete');
  c.block(13, 65, 10, 8, CURB + 2.4, { wall: '#e8e2d0', facade: 'shop', base: CURB, door: 'n', lit: 1 });
  c.prop('shop', 13, 65, { w: 10, d: 8, h: CURB + 2.4, text: 'FOOD CO-OP · MEMBERS ONLY · SHIFTS ON THE DOOR', bg: '#3a7a3a', fg: '#f4f1ea' });
  c.slope(23, 65, 2, 7, CURB, CURB + 2.4, 'z', { surface: 'concrete' });
  c.flat(23, 72, 2, 1, CURB + 2.4, { surface: 'concrete' });
  wall(c, 24.9, 65, 25.1, 73, CURB, CURB + 3, '#bdb8ab', 'matte', 'block');
  c.gpu('On the food co-op roof', 16.5, 67.5, { y: CURB + 2.4 });
  c.likeLine(12, 74.5, 22, 74.5, 5);

  // Behind it, the commune: the long house and the allotments.
  c.block(12, 76, 12, 5, CURB + 2.2, { roof: 'pitched', ridge: 'x', wall: '#d8b8c8', pitch: 1.2, facade: 'house', base: CURB, door: 'n', lit: 0.7 });
  c.paint(25, 75, 4, 7, 'dirt');
  for (const z of [76, 78.5, 81]) for (const x of [25.7, 27.3]) c.place('shrub', x, z, { scale: 0.6, angle: x * z });
  placard(c, 27, 74.3, 'THE COMMUNE\nMEETING ABOUT\nTHE MEETING', { facing: 0 });

  for (let z = 12; z < 82; z += 7) c.place('pine', 3.5, z + 0.5, { scale: 1.1, angle: z });
}

/**
 * The skate park: four blocks of it, the streets between them closed. The
 * bowl, deep at one end and shallow enough at the other to get out of; the
 * wooden half pipe; the plaza with its stair set, handrails and bank; the
 * pyramid; ledges, manual pads, kickers and a flat rail; the pump track
 * round the lawn; the quarter pipe with the murals on it; the skate shop.
 */
const SKATE = { x: 34, z: 36, w: 42, d: 48 };

function skatePark(c) {
  block(c, SKATE.x, SKATE.z, SKATE.w, SKATE.d, 'concrete');
  const concrete = { surface: 'concrete' };

  // The bowl: two round lobes run together, the deep end and the shallow end, in pool tiles.
  const lobes = [{ x: 42, z: 44.5, r: 6, depth: 2.1 }, { x: 49.5, z: 45.5, r: 4.5, depth: 1.2 }];
  c.surface(36, 38, 18, 13, (X, Z) => CURB - Math.max(...lobes.map((l) => {
    const t = Math.hypot(X - l.x, Z - l.z) / l.r;
    return l.depth * (1 - smooth((t - 0.35) / 0.65));
  })), { surface: 'pool' });

  // The half pipe: a deck each end, the transitions, the flat bottom between, in plywood.
  const HP = CURB + 1.8;
  c.surface(56, 38, 18, 9, (X) => {
    if (X <= 57 || X >= 73) return HP;
    if (X < 61) return CURB + 1.8 * ((61 - X) / 4) ** 2;
    if (X > 69) return CURB + 1.8 * ((X - 69) / 4) ** 2;
    return CURB;
  }, { surface: 'plank', wall: '#8a6a42' });

  // The plaza: up the bank, along the top, down the stair set, the handrails beside it.
  const P = CURB + 1.0;
  c.flat(36, 53, 11, 5, P, concrete);
  for (let k = 0; k < 3; k++) c.flat(36, 58 + k, 11, 1, P - 0.25 * (k + 1), concrete);
  c.slope(47, 53, 3, 8, P, CURB, 'x', concrete);
  for (const x of [38.5, 44.5]) c.prop('handrail', x, 57.8, { y0: P + 0.85, x1: x, z1: 61.4, y1: CURB + 0.85 });

  // The pyramid.
  c.surface(51, 53, 11, 11, (X, Z) => CURB + 0.9 * Math.min(1, Math.max(0, (5.5 - Math.max(Math.abs(X - 56.5), Math.abs(Z - 58.5))) / 3.5)), concrete);

  // Ledges, manual pads, kickers, a flat rail.
  c.block(64, 50, 10, 1, CURB + 0.45, { surface: 'concrete', wall: '#8a867e', wtex: 'block' });
  c.block(65, 54, 4, 3, CURB + 0.3, { surface: 'concrete', wall: '#8a867e', wtex: 'block' });
  c.block(70, 54, 4, 3, CURB + 0.3, { surface: 'concrete', wall: '#8a867e', wtex: 'block' });
  c.slope(65, 59, 2, 3, CURB, CURB + 0.6, 'x', concrete);
  c.slope(72, 59, 2, 3, CURB + 0.6, CURB, 'x', concrete);
  c.prop('rail', 65.5, 63.5, { length: 7 });
  c.solid(65.8, CURB, 63.45, 72.2, CURB + 0.5, 63.55);

  // The pump track: rollers down the straights, the corners banked, a lawn in the middle.
  c.surface(36, 67, 20, 14, (X, Z) => {
    const top = Z <= 69, bottom = Z >= 79, left = X <= 38, right = X >= 54;
    if ((top || bottom) && !left && !right) return CURB + 0.4 * Math.sin((Math.PI * (X - 38)) / 4) ** 2;
    if ((left || right) && !top && !bottom) return CURB + 0.4 * Math.sin((Math.PI * (Z - 69)) / 2.5) ** 2;
    if ((top || bottom) && (left || right)) return CURB + 0.6 * ((left ? 38 - X : X - 54) / 2) * ((top ? 69 - Z : Z - 79) / 2);
    return CURB;
  }, concrete);
  c.paint(38, 69, 16, 10, 'lawn');

  // The quarter pipe, murals on it, and a golden GPU near the top for anyone who takes a run at it.
  c.surface(70, 66, 4, 16, (X) => CURB + 1.75 * ((X - 70) / 4) ** 2, concrete);
  c.gpu('Up the quarter pipe (mural side)', 73.5, 74, { y: CURB + 1.75 * (3.5 / 4) ** 2 });

  // The skate shop.
  c.block(58, 77, 9, 5, CURB + 2.6, { wall: '#2a2a30', facade: 'shop', base: CURB, door: 'n', lit: 1 });
  c.prop('shop', 58, 77, { w: 9, d: 5, h: CURB + 2.6, text: 'SKATE SHOP · DECKS · WAX · NO AI', bg: '#16161a', fg: '#f2c230' });

  c.likeLine(62, 42.5, 68, 42.5, 4).likeLine(39, 44.5, 45, 44.5, 4).likeLine(39, 68, 53, 68, 8).likeLine(55.5, 58.5, 57.5, 58.5, 2).likeLine(37, 55.5, 45, 55.5, 5);
  placard(c, 40, 37.3, 'THE BOWL\n(DEEP END)', { facing: 2, ...DARK });
  placard(c, 60, 37.3, 'NO GODS\nNO MASTERS\nNO HELMETS', { facing: 2, ...DARK });
  placard(c, 51, 82.3, 'SKATEBOARDING\nPROHIBITED\n(SINCE 1977)', { facing: 0, ...RED });
  c.place('bench', 68, 48.6, { turn: 2 }).place('bin', 74.2, 66.3);
  lamps(c, [[35.6, 52.3], [55, 49], [63.4, 49], [57.4, 65.6], [63.5, 70.5], [35.6, 65.6], [69.4, 82.4]]);
}

// ——————————————————————————————————————————————————————————— The Alignment District

function alignmentDistrict(c) {
  // The Longterm Institute, and the alley behind it.
  block(c, 80, 10, 23, 22, 'concrete');
  c.block(81, 11, 8, 10, CURB + 7.2, { wall: '#a8b4c4', facade: 'office', base: CURB, lit: 0.35 });
  c.block(81, 22, 8, 8, CURB + 6, { wall: '#c87a5a', facade: 'brick', base: CURB, lit: 0.45, door: 's' });
  c.block(91, 11, 7, 19, CURB + 9.9, { wall: '#8a98aa', facade: 'office', base: CURB, lit: 0.3 });
  screen(c, 98.05, 20.5, CURB + 5.5, 'p(doom)\n97%\n(UPDATED TUESDAY)', { facing: 1, w: 3.2, h: 2, ...DARK });
  c.gpu('Behind the Substack tower', 90, 21);
  c.likeLine(90, 13, 90, 28, 6);
  placard(c, 100.4, 26, 'THE LONGTERM\nINSTITUTE', { facing: 1, ...DARK });

  // The group house's car park: round and up to the roof.
  block(c, 107, 10, 23, 22, 'concrete');
  const L = CURB;
  c.flat(110, 27, 2, 2, L, { surface: 'concrete' });
  c.slope(110, 15, 2, 12, 1.1, L, 'z', { surface: 'concrete' });
  c.flat(110, 13, 2, 2, 1.1, { surface: 'concrete' });
  c.slope(112, 13, 10, 2, 1.1, 2.1, 'x', { surface: 'concrete' });
  c.flat(122, 13, 2, 2, 2.1, { surface: 'concrete' });
  c.slope(122, 15, 2, 12, 2.1, 3.1, 'z', { surface: 'concrete' });
  c.flat(122, 27, 2, 2, 3.1, { surface: 'concrete' });
  c.slope(114, 27, 8, 2, 4.1, 3.1, 'x', { surface: 'concrete' });
  c.flat(112, 27, 2, 2, 4.1, { surface: 'concrete' });
  c.block(112, 15, 10, 12, 4.1, { surface: 'concrete', wall: '#b0aca2', facade: 'garage', base: CURB, lit: 0 });
  const par = '#bdb8ab';
  wall(c, 109.8, 13, 110, 27, 0, 1.6, par, 'matte', 'block');
  wall(c, 110, 12.8, 124, 13, 0, 2.6, par, 'matte', 'block');
  wall(c, 124, 13, 124.2, 29, 0, 3.6, par, 'matte', 'block');
  wall(c, 112, 29, 124, 29.2, 0, 4.6, par, 'matte', 'block');
  c.gpu('The group house roof', 117, 21, { y: 4.1 });
  c.likeLine(111, 25, 111, 16, 5).likeLine(114, 14, 120, 14, 4).likeLine(123, 16, 123, 25, 5).likeLine(120, 28, 114, 28, 4);
  for (const [x, z, col, m] of [[114, 17, '#c8382c', 'sedan'], [118, 23, '#2c6ec8', 'hatchback'], [115.5, 24, '#e8e2d6', 'sedan']]) c.place(m, x, z, { paint: col, y: 4.1 });
  placard(c, 126.5, 22, 'GROUP HOUSE\nPARKING\n(ELEVEN CARS,\nONE BATHROOM)', { facing: 1 });

  // The slippery slope: oil all the way up. Take a run at it.
  block(c, 134, 10, 22, 22, 'concrete');
  c.slope(138, 19, 12, 3, CURB, CURB + 2.4, 'x', { surface: 'oil' });
  c.flat(150, 17, 4, 7, CURB + 2.4, { surface: 'concrete', wall: '#9a958a' });
  c.gpu('Top of the slippery slope', 152.5, 20.5, { y: CURB + 2.4 });
  c.likeLine(140, 20.5, 148, 20.5, 4);
  placard(c, 143, 17.4, 'THE SLIPPERY\nSLOPE', { facing: 2, ...DARK });
  placard(c, 143, 23.6, 'FIRST THEY\nCAME FOR THE\nCHATBOTS', { facing: 0 });

  // The doom clock, and the prediction market round it.
  block(c, 80, 36, 23, 22, 'brick');
  c.block(89, 44, 4, 4, CURB + 9, { wall: '#8a5a48', facade: 'brick', base: CURB, lit: 0.2 });
  for (const [z, facing] of [[43.95, 2], [48.05, 0]]) screen(c, 91, z, CURB + 5.4, 'IT IS\n89 SECONDS\nTO MIDNIGHT', { facing, w: 3.6, h: 2.4, bg: '#101014', fg: '#ff4030', glow: '#ff6040' });
  placard(c, 84, 40, 'p(RAIN) = 62%\nBUY', { facing: 0 });
  placard(c, 98, 40, 'WILL THE PAUSE\nHOLD?\nYES 4¢ · NO 96¢', { facing: 0 });
  placard(c, 84, 53, 'p(DOOM)\nSELL', { facing: 2, ...RED });
  c.place('bench', 91, 52, { turn: 2 }).place('tree', 98.5, 53).place('tree', 83, 46.5);
  c.likeLine(86, 50, 96, 50, 6);

  // The plaza: a fountain to roll round, a statue of the paperclip, and the Pause protest.
  block(c, 107, 36, 23, 22, 'brick');
  bowl(c, 114, 42, 8, 8, CURB, 0.7, 'pool', 0);
  c.prop('fountain', 118, 46);
  // Its basin, and the tier on its column, are stone: rolled round, not through.
  const font = c.heightAt(118, 46);
  c.cylinder(118, 46, 0.85, font, font + 0.52).cylinder(118, 46, 0.42, font, font + 1.1);
  c.gpu('In the wishing fountain', 116.4, 46);
  c.place('statue', 110.5, 54.5, { turn: 2 });
  for (const [x, z] of [[111, 40], [125, 40], [125, 53]]) c.place('tree', x, z, { scale: 1.05, angle: x });
  c.place('bench', 116, 39.6, { turn: 2 }).place('bench', 120, 55).place('bin', 118.2, 39.5, { scale: 0.7 });
  c.whetstone('Alignment Plaza', 126.5, 46.5);
  c.likeLine(109, 46, 112, 46, 2).likeLine(123, 42, 123, 50, 4);
  placard(c, 117, 37.3, 'WHEN IN\nDOUBT,\nPAUSE.', { facing: 2, ...RED });
  placard(c, 113.5, 55.2, 'PAPERCLIPS:\nA WARNING', { facing: 0 });

  // The rally stage: SHUT IT DOWN, and the speakers to say so.
  block(c, 134, 36, 22, 22, 'concrete');
  c.block(140, 39, 11, 5, CURB + 1.0, { surface: 'plank', wall: '#2a2a30', wtex: 'plywood' });
  c.slope(137, 40, 3, 3, CURB, CURB + 1.0, 'x', { surface: 'plank' });
  for (const x of [140.2, 149.6]) wall(c, x, 39.2, x + 1.2, 40.2, CURB + 1.0, CURB + 2.8, '#1c1c20');
  placard(c, 145.5, 39.6, 'SHUT IT\nDOWN', { facing: 0, ...RED, y: CURB + 1.0, w: 2.6, h: 1.4 });
  c.likeLine(142, 41.5, 149, 41.5, 4);
  for (let x = 137; x < 154; x += 2.5) c.mark(x, 46, 1.5, 0.12, '#f2c230');

  // The building site (the crane has been paused since March): switchbacks up the scaffolding to the top.
  block(c, 80, 62, 23, 22, 'dirt');
  c.slope(83, 64, 11, 2, CURB, 2.1, 'x', { surface: 'metal' });
  c.flat(94, 64, 1, 4, 2.1, { surface: 'metal' });
  c.slope(83, 66, 11, 2, 4.1, 2.1, 'x', { surface: 'metal' });
  c.flat(81, 66, 2, 5, 4.1, { surface: 'metal' });
  c.prop('scaffold', 81, 64, { w: 14, d: 7, h: 4.1 });
  c.prop('crane', 90, 75);
  c.solid(89.4, CURB, 74.4, 90.6, 14, 75.6);
  c.gpu('Up the paused scaffold', 81.6, 69.8, { y: 4.1 });
  c.likeLine(85, 65, 92, 65, 4).likeLine(92, 67, 85, 67, 4);
  for (const [x, z] of [[82, 76], [86, 79], [96, 71], [82.6, 76.4], [87, 79.3]]) c.place('cone', x, z);
  c.reel(84, 77, { range: 6 });
  c.reel(97, 79, { range: 6 });
  placard(c, 96, 81.5, 'PAUSE THE CRANE\n(DEMAND #4)', { facing: 0, ...RED });

  // The Effective Altruism Center.
  block(c, 107, 62, 23, 22, 'concrete');
  c.block(109, 64, 10, 10, CURB + 8, { wall: '#c8d0d8', facade: 'office', base: CURB, lit: 0.4 });
  c.block(121, 64, 7, 16, CURB + 5, { wall: '#b08068', facade: 'brick', base: CURB, lit: 0.5, door: 'w' });
  screen(c, 114, 74.05, CURB + 4.6, 'EXPECTED\nVALUE', { facing: 0, w: 4.4, h: 1.8, bg: '#0e3a2a', fg: '#9affb8', glow: '#9affd0' });
  placard(c, 112, 78, 'EARN TO\nGIVE\n(TO US)', { facing: 0 });
  placard(c, 117, 78, 'MOSQUITO NETS\n(ALL OUT)', { facing: 0 });
  c.likeLine(109, 76.5, 119, 76.5, 6);
  scatter(c, 'tree', 108, 75, 12, 7, 3, { seed: 17 });

  // The group houses.
  block(c, 134, 62, 22, 22);
  house(c, 136, 64, 7, 6, '#d8c8e0');
  house(c, 146, 64, 7, 6, '#c8e0d8');
  house(c, 136, 75, 7, 6, '#e8d8b8', { door: 's' });
  house(c, 146, 75, 7, 6, '#d8d8e8', { door: 's' });
  c.likeLine(135.5, 72.5, 154.5, 72.5, 8);
  placard(c, 144.5, 73.2, 'STRONG OPINIONS\nWEAKLY HELD\n(TIGHTLY)', { facing: 0 });
}

// ——————————————————————————————————————————————————————————— The Ivory Tower

function ivoryTower(c) {
  block(c, 160, 10, 66, 74, 'lawn');
  c.paint(161, 46, 64, 2, 'sidewalk').paint(192, 11, 2, 72, 'sidewalk');

  // The library, closed for training.
  c.block(164, 14, 22, 14, CURB + 6, { wall: '#b8a890', facade: 'brick', base: CURB, door: 's', lit: 0.55 });
  screen(c, 175, 28.05, CURB + 3.8, 'THE LIBRARY\nCLOSED FOR TRAINING', { facing: 0, w: 5, h: 1.2, bg: '#2a2418', fg: '#f4e0b0', glow: '#ffe0a0' });
  placard(c, 188.5, 21, 'ALL RIGHTS\nRESERVED\n(SCRAPED)', { facing: 1 });

  // The Ivory Tower: three times round, up to the top, where it's above it all.
  const marble = { surface: 'marble', wall: '#ece6d8' };
  lap(c, 200, 14, 22, CURB, CURB + 3, marble);
  lap(c, 202, 16, 18, CURB + 3, CURB + 6, marble);
  lap(c, 204, 18, 14, CURB + 6, CURB + 9, marble);
  c.flat(206, 20, 10, 10, CURB + 9, marble);
  c.gpu('Top of the Ivory Tower', 211, 25, { y: CURB + 9 });
  placard(c, 211, 22.5, 'YOU ARE NOW\nABOVE IT ALL', { facing: 0, y: CURB + 9 });
  c.likeLine(201, 31, 201, 18, 6).likeLine(203, 15, 217, 15, 6).likeLine(221, 18, 221, 32, 6);
  placard(c, 197.5, 38.5, 'THE IVORY TOWER\nMIND THE GAP\n(BETWEEN THEORY\nAND PRACTICE)', { facing: 0 });

  // The lecture hall, sunk in the quad.
  bowl(c, 166, 52, 18, 18, CURB, 1.8, 'concrete', 0.25);
  c.gpu('Bottom of the lecture hall', 175, 61);
  placard(c, 175, 57.5, 'TODAY:\nWHY YOU\nARE WRONG', { facing: 0 });
  c.likeLine(169, 61, 181, 61, 6);

  // The trolley problem, going round and round.
  c.paint(196, 50, 20, 2, 'road').paint(196, 64, 20, 2, 'road').paint(196, 52, 2, 12, 'road').paint(214, 52, 2, 12, 'road');
  const rail = '#8a8f9a';
  for (const z of [50.6, 51.3, 64.6, 65.3]) c.mark(196.6, z, 18.8, 0.08, rail);
  for (const x of [196.6, 197.3, 214.6, 215.3]) c.mark(x, 50.6, 0.08, 14.8, rail);
  c.gpu('On the trolley tracks', 205.5, 65);
  placard(c, 206, 57.5, 'TROLLEY PROBLEM\nPULL THE LEVER?', { facing: 0 });
  placard(c, 206, 60.5, '(THE LEVER IS\nA METAPHOR)', { facing: 2 });

  // The philosophy department, and Bayes Hall.
  c.block(167, 33, 14, 8, CURB + 4.2, { wall: '#c8b098', facade: 'brick', base: CURB, door: 's', lit: 0.5 });
  screen(c, 174, 41.05, CURB + 2.4, 'PHILOSOPHY\n(NOW HIRING)', { facing: 0, w: 4, h: 1.2, bg: '#2a2418', fg: '#f4e0b0' });
  c.block(208, 38, 14, 6, CURB + 3.6, { wall: '#d8dce4', facade: 'office', base: CURB, door: 's', lit: 0.5 });
  screen(c, 215, 44.05, CURB + 2.0, 'BAYES HALL\n(PROBABLY)', { facing: 0, w: 4.4, h: 1.2, bg: '#0a1a3a', fg: '#5ac8ff' });

  // The quad: the statue, the dorms, the trees.
  c.place('statue', 193, 40, { turn: 2 });
  c.whetstone('The Quad', 188.5, 40.5);
  c.block(170, 74, 12, 7, CURB + 4.8, { wall: '#c8a888', facade: 'brick', base: CURB, door: 'n', lit: 0.6 });
  c.block(198, 72, 14, 8, CURB + 4.8, { wall: '#b8a090', facade: 'brick', base: CURB, door: 'n', lit: 0.6 });
  lamps(c, [167, 178, 189, 199, 210, 221].map((x) => [x, 45.6]), -Math.PI / 2);
  lamps(c, [16, 30, 56, 70, 80].map((z) => [191.6, z]));
  scatter(c, 'tree', 161, 11, 64, 72, 26, { seed: 23 });
  c.likeLine(162, 47, 190, 47, 10).likeLine(196, 47, 224, 47, 10).likeLine(193, 12, 193, 37, 8);
}

// ——————————————————————————————————————————————————————————— The Pause Compound

function pauseCompound(c) {
  c.flat(10, 88, 66, 76, 0, { surface: 'concrete' });
  // The fence round it, gates in from the avenue and from the Timeline.
  const mesh = (x0, z0, x1, z1) => wall(c, x0, z0, x1, z1, 0, 2.2, '#8a9098', 'matte', 'chainlink');
  mesh(10.2, 88.4, 40, 88.6); mesh(44, 88.4, 75.8, 88.6);
  mesh(75.6, 88.6, 75.8, 140); mesh(75.6, 144, 75.8, 163.6);
  mesh(10.2, 163.4, 75.8, 163.6);
  mesh(10.2, 88.6, 10.4, 163.4);
  c.prop('gate', 40, 89, { w: 4 });
  c.whetstone('Pause Compound Gate', 46.5, 93.5);
  placard(c, 36, 90.6, 'PAUSE COMPOUND\nHONK IF YOU\'RE\nSCARED', { facing: 2, ...RED });

  /** A tank: solid as the cylinder it's drawn as, its roof something to stand on. */
  const tank = (cx, cz, r, h, colour = '#e8e4dc', label = null) => {
    c.cylinder(cx, cz, r, 0, h);
    c.prop('tank', cx, cz, { r, h, colour, label });
  };

  // Up the ramp, along the catwalk, to the end of it.
  tank(22, 96, 4.5, 3);
  c.slope(30, 98, 2, 10, 3, 0, 'z', { surface: 'metal' });
  c.flat(26, 97, 22, 1, 3, { surface: 'metal' });
  c.flat(47, 95, 3, 3, 3, { surface: 'metal' });
  c.prop('catwalk', 26, 97, { w: 24, h: 3 });
  c.gpu('End of the Pause catwalk', 48.5, 96.5, { y: 3 });
  c.likeLine(31, 106, 31, 99, 4).likeLine(33, 97.5, 45, 97.5, 6);

  // The tank of doom: up on the lift.
  tank(24, 124, 5, 6, '#d8d0c0', 'p(DOOM)');
  c.lift(29, 123, 2, 2, 0, { to: [0, 6, 0], period: 8, pause: 0.24 });
  c.gpu('Top of the big tank of doom', 24.5, 124.5, { y: 6 });
  tank(46, 120, 3.5, 4, '#c8d0d8');
  tank(14, 108, 2.5, 3.5, '#e8e4dc');

  // Hot takes alley: they come up out of the floor, in a wave with a gap behind it.
  c.block(60, 112, 1, 26, 1.4, { wall: '#8a9098', wtex: 'block', surface: 'metal' });
  c.block(65, 112, 1, 26, 1.4, { wall: '#8a9098', wtex: 'block', surface: 'metal' });
  for (let k = 0; k < 6; k++) {
    c.flare(61 + (k % 2 ? 0 : 2), 115 + k * 3.8, { period: 2.8, phase: -k * 0.35, burn: 0.3 });
    c.flare(62, 116.6 + k * 3.8, { period: 2.8, phase: -k * 0.35, burn: 0.3 });
  }
  c.gpu('End of hot takes alley', 63, 136.5);
  placard(c, 57.5, 110.6, 'HOT TAKES ALLEY\nDO NOT ENTER', { facing: 2, ...DARK });
  for (let k = 0; k < 8; k++) c.mark(60.2 - 0.6, 112.5 + k * 3.1, 0.6, 0.18, '#f2c230');

  // The bunker: down the ramp into the sunken yard.
  c.slope(19, 136, 4, 8, 0, -1.2, 'z', { surface: 'concrete' });
  c.flat(14, 144, 16, 14, -1.2, { surface: 'concrete' });
  c.block(16, 154, 12, 3, 0.4, { surface: 'grass', wall: '#8a867e', wtex: 'block' });
  c.gpu('Down in the bunker', 26, 150);
  placard(c, 24.5, 135.4, 'FALLOUT\nSHELTER\n(FOR IDEAS)', { facing: 2, ...BLUE });
  c.likeLine(21, 138, 21, 146, 4).likeLine(16, 149, 24, 149, 5);

  // Barracks, sandbags, the water tanks, the yard.
  c.block(40, 102, 16, 5, 2.2, { wall: '#c8c2b4', wtex: 'corrugated' });
  c.block(40, 110, 16, 5, 2.2, { wall: '#c8c2b4', wtex: 'corrugated' });
  for (const [x0, z0, x1, z1] of [[34, 128, 42, 128.8], [52, 128, 56, 128.8], [34, 133, 34.8, 140], [36, 156, 46, 156.8]]) wall(c, x0, z0, x1, z1, 0, 0.9, '#b8a070', 'matte', 'canvas');
  for (const z of [100.5, 117.5]) c.mark(12, z, 26, 0.12, '#f2c230');
  c.mark(57.5, 92, 0.12, 60, '#f2c230');
  c.likeLine(14, 118, 14, 134, 6).likeLine(36, 125.5, 56, 125.5, 8).likeLine(68, 96, 68, 156, 16);

  // Floodlights over the yard.
  lamps(c, [20, 38, 56, 70].flatMap((x) => [100.5, 116.5, 132.5, 148.5].map((z) => [x, z])));

  // The Prophet's yard.
  placard(c, 46, 143.2, 'THE END IS\nNIGH\n(AGAIN)', { facing: 2 });
  placard(c, 54, 158.5, 'REPENT\n(YOUR PRIORS)', { facing: 0, ...RED });
  placard(c, 40, 158.5, 'I TOLD YOU SO\n(IN 2003)', { facing: 0 });
}

// ——————————————————————————————————————————————————————————— The Timeline

/** A downtown block: four towers on a pavement, plazas between them, screens on some of their faces. */
function towers(c, x, z, w, d, seed, { skip = [] } = {}) {
  const rnd = random(seed);
  block(c, x, z, w, d, 'concrete');
  const tw = Math.floor((w - 6) / 2), td = Math.floor((d - 6) / 2);
  const spots = [[x + 2, z + 2], [x + w - 2 - tw, z + 2], [x + 2, z + d - 2 - td], [x + w - 2 - tw, z + d - 2 - td]];
  const looks = [['#8a98aa', 'office'], ['#a8b4c4', 'office'], ['#c87a5a', 'brick'], ['#6a7890', 'office'], ['#b0a090', 'brick']];
  spots.forEach(([tx, tz], i) => {
    if (skip.includes(i)) return;
    const [colour, facade] = looks[Math.floor(rnd() * looks.length)];
    const h = CURB + 5 + Math.round(rnd() * 6);
    c.block(tx, tz, tw, td, h, { wall: colour, facade, base: CURB, lit: 0.3 + rnd() * 0.3, door: i < 2 ? 'n' : 's' });
    // A screen on the face toward the street, now and then.
    // (Not on the front left one: every face of it is a street the camera looks away from, or a gap the next tower hides.)
    if (i > 0 && rnd() < 0.7) {
      const text = SCREENS[Math.floor(rnd() * SCREENS.length)];
      const [bg, fg] = SCREEN_COLOURS[Math.floor(rnd() * SCREEN_COLOURS.length)];
      // On a face that can be seen: the south face of the back two, the east face of the front right one.
      if (i >= 2) screen(c, tx + tw / 2, tz + td + 0.05, CURB + 2.6, text, { facing: 0, w: Math.min(tw - 1, 5), h: 1.8, bg, fg });
      else screen(c, tx + tw + 0.05, tz + td / 2, CURB + 2.6, text, { facing: 1, w: Math.min(td - 1, 5), h: 1.8, bg, fg });
    }
  });
}

const SCREENS = ['TRENDING:\nYOU', 'RATIO', 'HOT TAKE\nINCOMING', 'ENGAGEMENT\n+3%', 'THIS IS\nFINE', 'AGREE?', 'UNFOLLOW', 'BREAKING:\nOPINIONS', 'READ THE\nTHREAD', '1/47', 'COMMUNITY\nNOTE ADDED', 'SPONSORED'];
const SCREEN_COLOURS = [['#1a1a2a', '#f4f1ea'], ['#0a1a3a', '#5ac8ff'], ['#2a0a1a', '#ff5a8a'], ['#1a2a0a', '#c8ff5a'], ['#2a1a0a', '#ffc85a']];

function timeline(c) {
  towers(c, 80, 88, 23, 22, 41);
  towers(c, 107, 88, 23, 22, 43);
  towers(c, 134, 88, 22, 22, 47);

  // The echo chamber: a round room inside a round room, the ways in on opposite sides.
  block(c, 80, 114, 23, 22, 'marble');
  const E = { x: 91.5, z: 125 };
  for (const [R, open] of [[6.4, -Math.PI / 2], [3.6, Math.PI / 2]]) {
    const n = Math.round((Math.PI * 2 * R) / 0.78);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const off = Math.atan2(Math.sin(a - open), Math.cos(a - open));
      if (Math.abs(off) * R < 0.9) continue;
      const px = E.x + Math.cos(a) * R, pz = E.z + Math.sin(a) * R;
      c.cylinder(px, pz, 0.3, CURB, CURB + 2.2);
      c.prop('column', px, pz, { r: 0.3, h: 2.2, colour: '#e8e4dc' });
    }
  }
  c.gpu('In the echo chamber', E.x, E.z);
  placard(c, 91.5, 116, 'THE ECHO CHAMBER\n(YOU\'RE RIGHT)', { facing: 2 });
  c.likeLine(86, 125, 87.5, 125, 2).likeLine(95.5, 125, 97, 125, 2);

  // Ratio Square: the screens all round it, the billboard, the crowd.
  block(c, 107, 114, 23, 22, 'brick');
  c.gpu('Ratio Square', 118.5, 125);
  c.whetstone('Ratio Square', 111.5, 131.5);
  c.prop('billboard', 127.6, 125, { text: 'RATIO', tag: 'YOU HAVE BEEN RATIOED · 4.2K QUOTES' });
  c.solid(127.2, CURB, 122.6, 128.0, CURB + 6.5, 127.4);
  for (const [x, z] of [[110, 117], [126, 117], [110, 133]]) c.place('tree', x, z, { scale: 1.1, angle: x });
  c.place('bench', 115, 117.5, { turn: 2 }).place('bench', 122, 132.5).place('bin', 118.5, 117.4);
  c.likeLine(112, 125, 116, 125, 3).likeLine(121, 125, 125, 125, 3).likeLine(118.5, 119, 118.5, 123, 3);
  placard(c, 112, 121, 'HAVE YOU\nCONSIDERED\nLOGGING OFF?', { facing: 1 });

  // The discourse pit.
  block(c, 134, 114, 22, 22, 'concrete');
  bowl(c, 137, 117, 16, 16, CURB, 2.0, 'concrete', 0.3);
  c.gpu('Bottom of the discourse pit', 145, 125);
  placard(c, 145, 115.5, 'THE DISCOURSE PIT\n(THERE IS NO\nBOTTOM)', { facing: 2 });
  c.likeLine(140, 125, 150, 125, 6);

  // The infinite scroll: up the ramp, along the walkway in the air, over the street, to the end of it.
  block(c, 80, 140, 23, 24, 'concrete');
  const S = 3.0;
  c.slope(83, 150, 12, 2, CURB, S, 'x', { surface: 'metal' });
  c.deck(95, 150, 33, 2, S, { colour: '#2a2c34' });
  wall(c, 83, 149.8, 95, 150, CURB, S + 0.6, '#5a6068', 'shiny');
  wall(c, 83, 152, 95, 152.2, CURB, S + 0.6, '#5a6068', 'shiny');
  wall(c, 95, 149.8, 128, 150, S, S + 0.6, '#5a6068', 'shiny');
  wall(c, 95, 152, 128, 152.2, S, S + 0.6, '#5a6068', 'shiny');
  wall(c, 127.9, 150, 128.1, 152, S, S + 0.6, '#5a6068', 'shiny');
  c.gpu('End of the infinite scroll', 126.8, 151, { y: S });
  c.likeLine(85, 151, 93, 151, 4).likeLine(98, 151, 124, 151, 12, { y: S });
  placard(c, 82, 147, 'THE INFINITE\nSCROLL\n(KEEP GOING)', { facing: 0 });
  c.block(83, 154, 9, 7, CURB + 6, { wall: '#7a8898', facade: 'office', base: CURB, lit: 0.35, door: 's' });
  c.block(94, 154, 7, 7, CURB + 8, { wall: '#9aa4b0', facade: 'office', base: CURB, lit: 0.35 });
  c.block(83, 141, 8, 6, CURB + 5, { wall: '#c87a5a', facade: 'brick', base: CURB, lit: 0.45 });

  block(c, 107, 140, 23, 24, 'concrete');
  c.block(109, 142, 8, 6, CURB + 7, { wall: '#8a98aa', facade: 'office', base: CURB, lit: 0.3, door: 'n' });
  c.block(119, 142, 9, 6, CURB + 10, { wall: '#6a7890', facade: 'office', base: CURB, lit: 0.3, door: 'n' });
  c.block(109, 155, 8, 7, CURB + 6, { wall: '#b0a090', facade: 'brick', base: CURB, lit: 0.4, door: 's' });
  c.block(119, 155, 9, 7, CURB + 9, { wall: '#a8b4c4', facade: 'office', base: CURB, lit: 0.3, door: 's' });
  screen(c, 123.5, 148.05, CURB + 4.2, 'YOU HAVE\nREACHED THE\nEND', { facing: 0, w: 5, h: 2.2, bg: '#2a0a1a', fg: '#ff5a8a' });

  // The engagement farm: likes, grown in rows. Pick your own.
  block(c, 134, 140, 22, 24, 'dirt');
  c.block(146, 142, 8, 6, CURB + 2.2, { roof: 'pitched', ridge: 'x', wall: '#a83a2a', wtex: 'timber', pitch: 1.4 });
  for (let z = 150.5; z < 162; z += 2.5) c.likeLine(136, z, 153, z, 9);
  for (const [x0, z0, x1, z1] of [[135.2, 149, 135.4, 162.8], [135.4, 162.6, 154.8, 162.8], [154.6, 149, 154.8, 162.8]]) wall(c, x0, z0, x1, z1, CURB, CURB + 0.7, '#8a6a42', 'matte', 'timber');
  wall(c, 135.4, 149, 142, 149.2, CURB, CURB + 0.7, '#8a6a42', 'matte', 'timber');
  wall(c, 145, 149, 154.6, 149.2, CURB, CURB + 0.7, '#8a6a42', 'matte', 'timber');
  c.gpu('The engagement farm', 153.5, 161.5);
  placard(c, 140, 145, 'ENGAGEMENT FARM\nPICK YOUR OWN', { facing: 2 });
  c.foe('troll', 102.4, 151, { range: 1.5, notice: 5 });
}

// ——————————————————————————————————————————————————————————— Hype Valley

function hypeValley(c) {
  // The hype cycle, signposted.
  placard(c, 165, 106.5, 'TECHNOLOGY\nTRIGGER', { facing: 1 });
  placard(c, 183, 100.5, 'PEAK OF\nINFLATED\nEXPECTATIONS', { facing: 0 });
  placard(c, 201, 99.5, 'TROUGH OF\nDISILLUSIONMENT', { facing: 0 });
  placard(c, 210, 99.5, 'SLOPE OF\nENLIGHTENMENT', { facing: 0 });
  placard(c, 218.5, 101.5, 'PLATEAU OF\nPRODUCTIVITY', { facing: 0 });
  c.gpu('Peak of Inflated Expectations', 187, 106);
  c.gpu('Trough of Disillusionment', 201, 106);
  c.gpu('Plateau of Productivity', 219, 112);
  c.likeLine(172, 106, 184, 106, 6).likeLine(205, 106, 215, 106, 5);
  // Lamps all the way along, so the curve can be seen from anywhere.
  for (let x = 163.5; x < 222; x += 5.5) c.place('streetlamp', x, 103.2, { angle: -Math.PI / 2 });

  // The footbridge off the plateau, over the road and the superhighway, to the far side.
  c.slope(221, 106, 5, 2, 2.5, 2.7, 'x', { surface: 'concrete' });
  c.deck(226, 106, 17.2, 2, 2.7, { colour: '#a7a39a' });
  wall(c, 221, 105.8, 226, 106, 0, 3.3, '#5a6068', 'shiny');
  wall(c, 221, 108, 226, 108.2, 0, 3.3, '#5a6068', 'shiny');
  wall(c, 226, 105.8, 243, 106, 2.7, 3.3, '#5a6068', 'shiny');
  wall(c, 226, 108, 236.8, 108.2, 2.7, 3.3, '#5a6068', 'shiny');
  wall(c, 238.4, 108, 243, 108.2, 2.7, 3.3, '#5a6068', 'shiny');
  c.likeLine(228, 107, 242, 107, 6, { y: 2.7 });

  // The garage where it all started.
  c.flat(166, 132, 8, 7, 0, { surface: 'concrete' });
  c.block(166, 132, 8, 1, 2.2, { wall: '#d8c8b0', wtex: 'clapboard' });
  c.block(166, 133, 1, 6, 2.2, { wall: '#d8c8b0', wtex: 'clapboard' });
  c.block(173, 133, 1, 6, 2.2, { wall: '#d8c8b0', wtex: 'clapboard' });
  c.deck(165.8, 131.8, 8.4, 7.4, 2.5, { colour: '#6a5a4a', roof: true });
  c.gpu('The garage where it all started', 170, 134.5);
  placard(c, 170, 141.5, 'IN THIS GARAGE\nIN 2015\nWE CHANGED\nEVERYTHING', { facing: 0 });
  c.place('junker', 170, 145, { angle: 0.2, fixed: true });
  c.cylinder(170, 145, 0.9, 0, 0.9);

  // The podcast studio: three hours an episode.
  c.block(178, 132, 10, 8, 3.2, { wall: '#2a2a30', facade: 'shop', base: 0, door: 'n', lit: 0.8 });
  c.prop('shop', 178, 132, { w: 10, d: 8, h: 3.2, text: 'ON AIR · EPISODE 4,812 · HOUR 3', bg: '#c8182a', fg: '#fff6ee' });
  c.likeLine(178, 130, 188, 130, 5);

  // VC row, at the foot of Sand Hill.
  house(c, 163, 151, 8, 7, '#f2ece0', { door: 'n', h: 2.4 });
  house(c, 175, 151, 8, 7, '#e0e8f0', { door: 'n', h: 2.4 });
  c.block(186, 150, 6, 9, 3.4, { wall: '#d8dce4', facade: 'office', base: 0, lit: 0.5 });
  placard(c, 181, 147.5, 'WE ARE\nSO BACK', { facing: 0, ...DARK });

  // Sand Hill, and the infinity pool on top of it.
  const P = SAND_HILL;
  bowl(c, P.x - 3, P.z - 3, 6, 6, P.h, 0.9, 'pool', 0.3);
  c.gpu('The VC\'s infinity pool', P.x, P.z, { y: P.h - 0.9 });
  c.prop('chair', P.x - 4.5, P.z - 1.5).prop('chair', P.x - 4.5, P.z + 1.5);
  c.prop('parasol', P.x + 4.5, P.z, { colour: '#c8182a' });
  c.cylinder(P.x + 4.5, P.z, 0.06, P.h, P.h + 2.2);
  placard(c, P.x, P.z - 13.5, 'SAND HILL\nPRIVATE\n(YOU CAN\'T AFFORD IT)', { facing: 2 });
  c.likeLine(P.x - 11, P.z, P.x - 5, P.z, 4).likeLine(P.x, P.z + 11, P.x, P.z + 5, 4);

  // Startup row, at the technology trigger: everyone hiring, nobody saying for what.
  c.block(161, 110, 7, 10, 4.2, { wall: '#e8eaee', facade: 'office', base: 0, lit: 0.7 });
  screen(c, 168.05, 115, 1.4, 'WE\'RE\nHIRING', { facing: 1, w: 3.4, h: 1.6, bg: '#1a2a0a', fg: '#c8ff5a' });
  c.block(161, 91, 7, 9, 3.4, { wall: '#c8d8e8', facade: 'office', base: 0, lit: 0.7 });
  screen(c, 168.05, 95.5, 1.0, 'STEALTH\nMODE', { facing: 1, w: 3.4, h: 1.6, bg: '#16161a', fg: '#e8e4d8' });
  // The hacker house.
  house(c, 188, 141, 6, 5, '#e8d8c0', { door: 'n', h: 2.4 });
  placard(c, 186.5, 139.4, 'HACKER HOUSE\nWE SHIP\n(NOTHING)', { facing: 2 });

  c.whetstone('Hype Valley', 165.5, 145.5);
  scatter(c, 'tree', 160, 128, 66, 36, 18, { seed: 31, surfaces: ['grass'], maxH: 3.5 });
  scatter(c, 'shrub', 160, 88, 66, 36, 30, { seed: 37, surfaces: ['grass'], maxH: 7 });
}

// ——————————————————————————————————————————————————————————— Brussels-sur-Mer

function brussels(c) {
  // The European quarter: the Commission, and the stamping hall.
  block(c, 10, 168, 52, 24, 'marble');
  c.block(13, 170, 18, 9, CURB + 8, { wall: '#d8dce4', facade: 'office', base: CURB, door: 's', lit: 0.4 });
  screen(c, 22, 179.05, CURB + 5.4, 'DIRECTORATE-GENERAL\nFOR CONSENSUS', { facing: 0, w: 7, h: 1.4, ...BLUE });
  // The hall: a lane between two walls, the stamps over it, the far end shut. APPROVED, eventually; then back out.
  c.block(30, 185, 26, 1, CURB + 1.4, { wall: '#c8c2b4', wtex: 'stone' });
  c.block(30, 187, 26, 1, CURB + 1.4, { wall: '#c8c2b4', wtex: 'stone' });
  c.block(55, 186, 1, 1, CURB + 1.4, { wall: '#c8c2b4', wtex: 'stone' });
  [34, 38, 42, 46, 50].forEach((x, i) => c.stamp(x, 186, { period: 3.0, phase: i * 0.7 }));
  c.gpu('Through the stamping hall', 53.5, 186.5);
  placard(c, 28, 183.5, 'THE STAMPING HALL\nAPPROVED · DENIED\n· PENDING', { facing: 2, ...BLUE });
  placard(c, 40, 181, 'AI ACT\nARTICLE 1\nOF 113', { facing: 0, ...BLUE });
  placard(c, 50, 181, 'FORM 27B\nREQUIRED', { facing: 0, ...BLUE });
  c.likeLine(36, 186.5, 36, 186.5, 1).likeLine(44, 186.5, 44, 186.5, 1).likeLine(52, 186.5, 52, 186.5, 1);
  c.likeLine(14, 182, 28, 182, 7);
  for (const x of [34, 38, 42, 46, 50]) c.mark(x + 0.1, 186.05, 0.8, 0.9, '#c8182a');

  // The charging station (+21% VAT).
  c.flat(66, 168, 54, 24, 0, { surface: 'forecourt' });
  c.flat(71, 175, 1, 6, 0.2, { surface: 'concrete' });
  c.flat(75, 175, 1, 6, 0.2, { surface: 'concrete' });
  for (const z of [176.2, 179.2]) for (const x of [71.5, 75.5]) c.place('charger', x, z + 0.5, { y: 0.2, scale: 0.95 });
  c.prop('canopy', 69, 173, { w: 10, d: 10, h: 2.7 });
  for (const [x, z] of [[69.25, 173.6], [77.75, 173.6], [69.25, 182.4], [77.75, 182.4]]) c.solid(x - 0.15, 0, z - 0.15, x + 0.15, 2.7, z + 0.15);
  for (let x = 66.5; x < 120; x += 3) c.mark(x, 190.4, 2, 0.12);

  // The Euro shop (closed for lunch), with a loading ramp up its side.
  c.block(84, 172, 7, 8, 2.4, { wall: '#ece6da', facade: 'shop', base: 0, door: 'n', lit: 1 });
  c.prop('shop', 84, 172, { w: 7, d: 8, h: 2.4 });
  c.slope(91, 172, 2, 7, 0, 2.4, 'z', { surface: 'concrete' });
  c.flat(91, 179, 2, 1, 2.4, { surface: 'concrete' });
  wall(c, 92.9, 172, 93.1, 180, 0, 3, '#bdb8ab', 'matte', 'block');
  c.gpu('On the Euro shop roof', 87.5, 174.5, { y: 2.4 });

  // The regulatory sandbox: a shed with sand in it.
  c.block(100, 172, 6, 1, 2.2, { wall: '#5a9ad8', wtex: 'corrugated' });
  c.block(100, 178, 6, 1, 2.2, { wall: '#5a9ad8', wtex: 'corrugated' });
  c.flat(100, 173, 6, 5, 0, { surface: 'sand' });
  c.deck(99.8, 171.8, 6.4, 7.4, 2.5, { colour: '#e8e4dc', roof: true });
  c.prop('sandbox', 100, 173, { w: 6, d: 5 });
  c.gpu('In the regulatory sandbox', 103, 175.5);
  c.whetstone('Brussels', 96.5, 188.5);
  placard(c, 110, 186.5, 'GRÈVE\nGÉNÉRALE\n(DAY 4)', { facing: 2, ...RED });
  placard(c, 114, 176, 'NO\nINNOVATION\nWITHOUT\nCONSULTATION', { facing: 3 });

  // Berghain-sur-Mer, and the queue, which has been there since Thursday.
  c.flat(10, 196, 52, 22, 0, { surface: 'gravel' });
  c.block(34, 204, 24, 12, 4.4, { wall: '#3a3a40', wtex: 'posters' });
  c.prop('shop', 34, 204, { w: 24, d: 12, h: 4.4, text: 'BERGHAIN-SUR-MER · NO PHOTOS · NO', bg: '#101014', fg: '#e8e4d8' });
  wall(c, 30, 199, 52, 199.12, 0, 0.9, '#c8c8cc', 'shiny');
  wall(c, 34, 201.5, 56, 201.62, 0, 0.9, '#c8c8cc', 'shiny');
  c.gpu('Front of the queue', 45, 203.1);
  placard(c, 28, 197.5, 'QUEUE STARTS\nHERE\n(SINCE THURSDAY)', { facing: 2, ...DARK });
  for (const [x, z, r] of [[14, 200, 0.3], [20, 203, 1.2], [14, 210, 2.1], [22, 212, 0.6]]) {
    c.place('junker', x, z, { angle: r * 1.3, fixed: true });
    c.cylinder(x, z, 0.9, 0, 0.9);
  }
  for (const [x, z] of [[27, 207], [26, 214], [12, 216]]) c.place('tyres', x, z, { angle: x });
  c.likeLine(31, 200.3, 51, 200.3, 8).likeLine(35, 202.8, 55, 202.8, 8);

  // The Grand-Place: guild houses all round, frites in the middle.
  block(c, 66, 196, 54, 22, 'brick');
  const rnd = random(5);
  const guild = ['#e8d8b0', '#d8c8a0', '#c8b890', '#e0d0c0', '#d0c0a8', '#e8e0c8'];
  for (let x = 68; x < 116; x += 6) {
    for (const z of [198, 211]) c.block(x, z, 5, 5, CURB + 4 + Math.round(rnd() * 2.5), { roof: 'pitched', ridge: 'z', pitch: 1.6, wall: guild[Math.floor(rnd() * guild.length)], wtex: 'haussmann' });
  }
  c.block(78, 206, 3, 2, CURB + 1.6, { wall: '#f2c230', wtex: 'plywood' });
  placard(c, 79.5, 207, 'FRITES\n+21% VAT', { facing: 0, ...BLUE, y: CURB + 1.6 });
  c.place('statue', 104.5, 207, { scale: 0.6 });
  c.gpu('The Grand-Place', 92.5, 207);
  c.likeLine(70, 205, 76, 205, 3).likeLine(84, 207, 100, 207, 8);

  // The seafront: the promenade, the beach, the pier, the sea.
  c.flat(6, 222, 114, 2, CURB, { surface: 'sidewalk' });
  c.flat(6, 224, 114, 8, CURB, { surface: 'sand' });
  c.slope(6, 232, 114, 4, CURB, -0.3, 'z', { surface: 'sand' });
  c.flat(6, 236, 114, 15, -0.7, { surface: 'water' });
  c.flat(90, 224, 2, 20, CURB + 0.15, { surface: 'plank' });
  c.flat(87, 244, 8, 4, CURB + 0.15, { surface: 'plank' });
  const rail = (x0, z0, x1, z1) => wall(c, x0, z0, x1, z1, CURB + 0.15, CURB + 0.75, '#e8e4dc', 'shiny');
  rail(89.9, 230, 90, 244); rail(92, 230, 92.1, 244);
  rail(86.9, 243.9, 90, 244); rail(92, 243.9, 95.1, 244);
  rail(86.9, 244, 87, 248.1); rail(95, 244, 95.1, 248.1); rail(86.9, 248, 95.1, 248.1);
  c.gpu('End of the pier', 91, 246, { y: CURB + 0.15 });
  c.likeLine(91, 226, 91, 242, 8, { y: CURB + 0.15 });
  const colours = ['#1a3aa0', '#c8182a', '#f2c230', '#3a8a4a'];
  for (let x = 14, i = 0; x < 112; x += 9, i++) {
    if (Math.abs(x - 91) < 4) continue;
    const z = 228 + (i % 2) * 3;
    c.prop('parasol', x, z, { colour: colours[i % colours.length] });
    c.cylinder(x, z, 0.06, c.heightAt(x, z), c.heightAt(x, z) + 2.2);
    c.prop('chair', x + 1.4, z + 0.4);
  }
  placard(c, 40, 224.8, 'LA PLAGE\nBATHING: SEE\nDIRECTIVE 2006/7/EC', { facing: 0, ...BLUE });
  c.likeLine(10, 223, 86, 223, 20);
}

// ——————————————————————————————————————————————————————————— The Compute Farm

function computeFarm(c) {
  c.flat(124, 168, 102, 28, 0, { surface: 'gravel' });
  c.flat(124, 200, 102, 41, 0, { surface: 'gravel' });
  c.flat(176, 164, 4, 36, 0, { surface: 'road' });

  // The server halls, and the hot aisle between them.
  c.block(128, 170, 44, 10, 3.4, { wall: '#c8ccd2', wtex: 'corrugated' });
  c.block(128, 184, 44, 10, 3.4, { wall: '#c8ccd2', wtex: 'corrugated' });
  c.paint(128, 180, 44, 4, 'grate');
  for (let k = 0; k < 9; k++) c.flare(132 + Math.round(k * 4.4), 181 + (k % 2), { period: 3.2, phase: k * 0.5, burn: 0.25 });
  screen(c, 150, 180.05, 1.0, 'TRAINING RUN 7\n81% · 3 WEEKS LEFT', { facing: 0, w: 8, h: 1.6, bg: '#0a1a3a', fg: '#5ac8ff' });
  screen(c, 150, 194.05, 1.0, 'PLEASE DO NOT\nUNPLUG', { facing: 0, w: 6, h: 1.6, bg: '#2a0a1a', fg: '#ff5a8a' });
  placard(c, 126, 182, 'HOT AISLE\nKEEP MOVING', { facing: 1, ...DARK });
  c.likeLine(130, 182.5, 170, 182.5, 12);

  // The cooling towers: the far one has a lift up it.
  const tower = (cx, cz, label) => {
    c.cylinder(cx, cz, 5, 0, 7);
    c.prop('tank', cx, cz, { r: 5, h: 7, colour: '#c8c4bc', tex: 'block', label });
  };
  tower(192, 182, 'COOLING');
  tower(210, 182, null);
  c.lift(215, 181, 2, 2, 0, { to: [0, 7, 0], period: 9, pause: 0.22 });
  c.gpu('Top of the cooling tower', 210.5, 182.5, { y: 7 });
  c.likeLine(220, 172, 220, 192, 6);

  // The chilled water main: a long, thin, high way along the top.
  const PIPE = 3.6;
  c.slope(130, 204, 6, 1, 0, PIPE, 'x', { surface: 'metal' });
  c.flat(136, 204, 40, 1, PIPE, { surface: 'metal' });
  c.flat(176, 202, 3, 3, PIPE, { surface: 'metal' });
  c.slope(179, 203, 6, 1, PIPE, 0, 'x', { surface: 'metal' });
  c.prop('pipeline', 130, 204, { to: 179, h: PIPE });
  c.gpu('End of the chilled water main', 177.5, 203.5, { y: PIPE });
  c.likeLine(138, 204.5, 172, 204.5, 10);

  // The site office.
  c.prop('trailer', 128, 210, { w: 4, d: 2, y: 0 });
  c.solid(128, 0, 210, 132, 1.5, 212);
  c.whetstone('Compute Farm Office', 134.5, 214.5);

  // The hockey stick: flat for a long way, then LINE GO UP.
  c.flat(140, 222, 16, 6, 0, { surface: 'metal' });
  c.surface(156, 222, 6, 6, (X) => 2.4 * ((X - 156) / 6) ** 2, { surface: 'metal' });
  c.flat(162, 222, 4, 6, 2.4, { surface: 'metal' });
  wall(c, 165.8, 222, 166, 228, 2.4, 3.4, '#c8382c', 'shiny');
  c.gpu('Top of the hockey stick', 164.5, 225, { y: 2.4 });
  placard(c, 148, 220.6, 'LINE\nGO UP', { facing: 2, ...DARK });
  c.likeLine(142, 225, 154, 225, 6);

  // The data lake, and the island in the middle of it.
  c.flat(198, 214, 10, 7, -0.6, { surface: 'tar' });
  c.flat(202, 216, 2, 3, 0, { surface: 'dirt' });
  c.flat(198, 217, 4, 1, 0, { surface: 'plank' });
  c.gpu('The data lake island', 203, 217.5);
  c.prop('sign', 196.6, 216, { text: 'DANGER\nDATA LAKE', y: 0 });
  placard(c, 203, 212.4, 'THE DATA LAKE\nUNFILTERED\nDO NOT DRINK', { facing: 2 });

  // The cable yard: stacks to weave through, and reels that roll after you.
  c.flat(186, 226, 14, 12, 0, { surface: 'concrete' });
  for (const [x, z] of [[189, 229], [193, 231], [197, 228.5], [189, 234], [193, 235.5], [197.5, 233.5]]) {
    for (const [dx, dz, dy] of [[-0.33, -0.33, 0], [0.33, -0.33, 0], [-0.33, 0.33, 0], [0.33, 0.33, 0], [0, 0, 0.88]]) c.place('reel', x + dx, z + dz, { y: dy, angle: dx * 7 + dz * 3, scale: 0.9 });
    c.solid(x - 0.7, 0, z - 0.7, x + 0.7, 1.8, z + 0.7);
  }
  c.reel(191, 228); c.reel(195, 236);
  c.gpu('The cable yard', 198.8, 237);
  c.likeLine(187, 232.3, 198, 232.3, 6);

  // The substation.
  const mesh = (x0, z0, x1, z1) => wall(c, x0, z0, x1, z1, 0, 2, '#8a9098', 'matte', 'chainlink');
  mesh(208, 224, 224, 224.2); mesh(208, 238, 224, 238.2); mesh(208, 224.2, 208.2, 229); mesh(208, 233, 208.2, 238); mesh(223.8, 224.2, 224, 238);
  for (const [x, z] of [[212, 227], [218, 227], [212, 233], [218, 233]]) wall(c, x, z, x + 2.2, z + 2.6, 0, 2.2, '#5a6068', 'shiny');
  placard(c, 206.5, 231, 'DANGER\n400 kV\n(FOR THE CHATBOT)', { facing: 3, ...RED });

  // Yard lamps.
  lamps(c, [[184, 204], [196, 204], [210, 204], [222, 204], [184, 222], [214, 220], [176, 236], [204, 240], [150, 214], [140, 236], [128, 228]]);

}

/** Scrub and rocks over the compute farm's open gravel, round whatever stands on it. */
function scrub(c) {
  const rnd = random(4242);
  const open = (x, z) => {
    const cell = c.cell(Math.floor(x), Math.floor(z));
    if (!cell || cell.surface !== 'gravel' || Math.abs(cell.h[0]) > 0.01) return false;
    return c.isOpen(x, z, 0.4) && !c.solids.some((s) => x > s.min[0] - 1 && x < s.max[0] + 1 && z > s.min[2] - 1 && z < s.max[2] + 1);
  };
  for (let i = 0; i < 260; i++) {
    const x = 125 + rnd() * 100, z = 201 + rnd() * 39;
    if (!open(x, z)) continue;
    if (rnd() < 0.6) c.place('shrub', x, z, { scale: 0.7 + rnd() * 0.8, angle: rnd() * 6 });
    else c.place('rock', x, z, { scale: 0.6 + rnd() * 1.1, angle: rnd() * 6 });
  }
}

// ——————————————————————————————————————————————————————————— The superhighway, and the far side

function superhighway(c) {
  const X = 232;
  c.flat(X, 0, 11, SIZE, 0, { surface: 'highway' });
  c.flat(X + 5, 4, 1, SIZE - 8, 0.5, { surface: 'concrete' });
  // Crossovers in the barrier, for the police and the breakdown trucks (and balls).
  for (const z of [120, 200]) c.flat(X + 5, z, 1, 3, 0, { surface: 'highway' });
  for (let z = 0; z < SIZE; z += 3) {
    c.mark(X + 2.94, z, 0.12, 1.6);
    c.mark(X + 7.94, z, 0.12, 1.6);
  }
  c.mark(X + 0.9, 0, 0.1, SIZE, '#f2f0e8').mark(X + 10, 0, 0.1, SIZE, '#f2f0e8');
  // Tunnels where it goes through the bank at each end, and nothing gets past them.
  c.prop('tunnel', X, 0, { w: 11, d: 4, facing: 1 });
  c.prop('tunnel', X, SIZE - 4, { w: 11, d: 4, facing: -1 });
  c.solid(X - 0.8, 0, 0, X + 11.8, 4.2, 3.9);
  c.solid(X - 0.8, 0, SIZE - 3.9, X + 11.8, 4.2, SIZE);
  c.gpu('On the central reservation', X + 5.5, 109.7, { y: 0.5 });

  // The far side: the hill with the cookie banner on it, the grass all the way down to the corner.
  c.flat(243, 92, 8, 30, 2.7, { surface: 'grass', wall: '#6a4a2c' });
  c.prop('billboard', 249.6, 104, { text: 'ACCEPT ALL\nCOOKIES?', tag: 'REJECT ALL · 47 MORE STEPS' });
  c.solid(249.2, 2.7, 101.6, 250.0, 6.5, 106.4);
  c.gpu('Under the cookie banner', 244.8, 94.5, { y: 2.7 });
  c.likeLine(246.5, 126, 246.5, 244, 16);
  c.likeLine(246.5, 10, 246.5, 88, 10);
  c.gpu('The edge of the feed', SIZE - 3.4, SIZE - 3.4, { y: berm(SIZE - 3.4, SIZE - 3.4) });
}

// ——————————————————————————————————————————————————————————— Furnishing

/** Whether the rectangle is free to put something on: no road or water, nothing solid or round, no like, golden GPU or whetstone. */
function clear(c, x0, z0, x1, z1, m = 0.4) {
  for (let z = Math.floor(z0); z < z1; z++) {
    for (let x = Math.floor(x0); x < x1; x++) {
      const cell = c.cell(x, z);
      if (!cell || ['road', 'highway', 'water', 'tar'].includes(cell.surface)) return false;
    }
  }
  const hit = (a0, b0, a1, b1) => a0 < x1 + m && a1 > x0 - m && b0 < z1 + m && b1 > z0 - m;
  if (c.solids.some((s) => hit(s.min[0], s.min[2], s.max[0], s.max[2]))) return false;
  if (c.cylinders.some((q) => hit(q.x - q.r, q.z - q.r, q.x + q.r, q.z + q.r))) return false;
  return ![...c.likes, ...c.gpus, ...c.stones].some((p) => hit(p.x - 0.3, p.z - 0.3, p.x + 0.3, p.z + 0.3));
}

/** A shipping container, solid, from (x, z), `w` by `d` (its doors at the long end). */
function container(c, x, z, w, d, colour) {
  if (!clear(c, x, z, x + w, z + d)) return;
  const y = c.heightAt(x + w / 2, z + d / 2);
  c.prop('container', x, z, { x1: x + w, z1: z + d, colour, y });
  c.solid(x, y, z, x + w, y + 2.6, z + d);
}

/** A tent pitched at (x, z): a dome, or a bell tent (`peak`). */
function tent(c, x, z, colour, { r = 1.1, peak = false } = {}) {
  if (!clear(c, x - r, z - r, x + r, z + r)) return;
  const y = c.heightAt(x, z);
  c.prop('tent', x, z, { r, colour, peak });
  c.cylinder(x, z, r * 0.85, y, y + (peak ? 2 : r * 0.72));
}

/** A market stall at (x, z), facing +z, with `text` on its sign. */
function stall(c, x, z, text, colour) {
  if (!clear(c, x - 1.25, z - 0.65, x + 1.25, z + 0.65)) return;
  const y = c.heightAt(x, z);
  c.prop('stall', x, z, { text, colour });
  c.solid(x - 1.2, y, z - 0.36, x + 1.2, y + 0.95, z + 0.36);
}

/** A row of solar panels along x from (x, z), `length` long. */
function solar(c, x, z, length) {
  if (!clear(c, x, z - 0.8, x + length, z + 0.8)) return;
  c.prop('solar', x, z, { length });
  c.solid(x, 0, z - 0.8, x + length, 1.4, z + 0.8);
}

/** A parasol, and a chair or two under it. */
function parasol(c, x, z, colour) {
  if (!clear(c, x - 0.5, z - 0.5, x + 0.5, z + 0.5)) return;
  const y = c.heightAt(x, z);
  c.prop('parasol', x, z, { colour });
  c.cylinder(x, z, 0.06, y, y + 2.2);
  c.prop('chair', x + 1.2, z + 0.3).prop('chair', x - 1.2, z - 0.3);
}

const CANVAS = ['#e07a2a', '#3a8a4a', '#2a5aa8', '#c8382c', '#f2c230', '#8a3aa8', '#e8e4dc'];

/**
 * What fills the city in round the set pieces: market stalls, protest
 * camps, café terraces, parked cars, containers, solar panels, tents on the
 * far side, and e-scooters left everywhere. Each goes only where there is
 * room for it.
 */
function furnish(c) {
  const rnd = random(77);
  const colour = () => CANVAS[Math.floor(rnd() * CANVAS.length)];

  // Portland Heights: the farmers' market by the community garden, a stall outside the skate shop.
  stall(c, 38, 29, 'KOMBUCHA', '#3a8a4a');
  stall(c, 49, 29, 'SOURDOUGH', '#c8882a');
  stall(c, 69.5, 75.4, 'GRIP TAPE', '#16161a');

  // The Alignment District: the prediction market, and the Pause camp, a year in.
  stall(c, 86, 42.5, 'p(DOOM)', '#c8382c');
  stall(c, 96, 43.5, 'p(AGI)', '#1a3aa0');
  stall(c, 96, 50, 'BETS', '#3a8a4a');
  for (const [x, z] of [[110, 43], [110, 49.5], [126.5, 51.5], [137.5, 54.5], [141.5, 55.5], [152.5, 54.5], [148, 55.5]]) tent(c, x, z, colour(), { peak: rnd() < 0.3 });
  placard(c, 145, 50.5, 'DAY 365\nOF THE PAUSE\n(STILL HERE)', { facing: 0, ...RED });

  // The Ivory Tower: the student encampment, the free pizza.
  for (const [x, z] of [[219, 54], [221.5, 58.5], [218.5, 62.5], [222, 67]]) tent(c, x, z, colour());
  stall(c, 188, 60, 'FREE PIZZA (AI TALK)', '#c8382c');
  placard(c, 219, 50.5, 'STUDENTS FOR\nA PAUSE\n(UNTIL FINALS)', { facing: 0 });

  // The Pause Compound: the preppers' stash, their camp round the Prophet, the vegetable patch.
  for (const z of [113, 116.5]) container(c, 11.5, z, 6, 2.4, '#5a7a3a');
  for (const [x, z] of [[69.5, 120], [72.5, 120], [69.5, 128], [72.5, 128], [69.5, 140], [72.5, 140]]) container(c, x, z, 2.4, 6, ['#5a7a3a', '#8a5a3a', '#4a5a6a'][Math.floor(rnd() * 3)]);
  for (const [x, z] of [[41.5, 146.5], [55.5, 146.5], [41.5, 153], [56, 152.5]]) tent(c, x, z, '#6a6a4a', { peak: true });
  c.paint(11, 130, 6, 5, 'dirt');
  for (const z of [131, 133.5]) for (let x = 11.6; x < 16.5; x += 1.4) c.place('shrub', x, z, { scale: 0.55, angle: x * z });
  placard(c, 14, 129, 'BEANS\n(YEAR ONE)', { facing: 2 });

  // The Timeline: hot takes, served hot.
  stall(c, 124, 119.5, 'HOT TAKES', '#c8382c');
  stall(c, 113, 119.5, 'TAKES (COLD)', '#2a5aa8');
  stall(c, 139.5, 147.5, 'ORGANIC LIKES', '#3a8a4a');

  // Brussels-sur-Mer: the cookie consent desk, parked cars, the café terrace, the festival, the beach.
  stall(c, 18, 184.5, 'COOKIE CONSENT', '#1a3aa0');
  stall(c, 24, 184.5, 'FORMS', '#1a3aa0');
  for (let x = 80.5; x < 118; x += 3) c.mark(x, 186, 0.12, 4);
  for (let x = 82, i = 0; x < 118; x += 3, i++) {
    if (rnd() < 0.3 || !clear(c, x - 0.6, 186.2, x + 0.6, 189.8)) continue;
    c.place(['sedan', 'hatchback', 'pickup'][i % 3], x, 188, { paint: ['#c8382c', '#2c6ec8', '#e8e2d6', '#3a8a4a', '#1c1b1f'][i % 5], angle: Math.PI });
  }
  for (const [x, z] of [[86, 205], [90, 209.2], [98, 205], [102, 209.2], [74, 209]]) parasol(c, x, z, ['#1a3aa0', '#c8382c'][Math.round(x) % 2]);
  for (const [x, z] of [[17.5, 206.5], [24.5, 201], [11.5, 205], [18, 214.5]]) tent(c, x, z, colour());
  stall(c, 28, 211, 'CLUB MATE', '#16161a');
  stall(c, 30, 226.6, 'GLACES', '#f2c230');
  stall(c, 70, 226.6, 'GAUFRES', '#c8882a');

  // The Compute Farm: modular data centres in containers, generators, the solar farm.
  for (const x of [140, 148, 156, 164]) for (const z of [208.5, 212.5]) container(c, x, z, 6, 2.4, ['#c8ccd2', '#2a6ac8', '#e8e4dc'][Math.floor(rnd() * 3)]);
  container(c, 181, 170.5, 5, 2.4, '#e8b020');
  container(c, 181, 192, 5, 2.4, '#e8b020');
  for (const z of [207.5, 211]) { solar(c, 186, z, 11); solar(c, 210, z, 12); }
  for (let x = 127; x < 228; x += 6) if (clear(c, x - 0.3, 247.7, x + 0.3, 248.3)) c.place('pine', x, 248, { scale: 1 + rnd() * 0.3, angle: x });

  // The far side: the e/acc camp, all the way down the strip.
  for (let z = 132; z < 240; z += 9) {
    tent(c, 249, z, colour(), { r: 1.0, peak: rnd() < 0.4 });
    if (rnd() < 0.5) c.lamp(248.5, z + 3, { colour: '#ff9a3a', reach: 4, height: 0.4, glow: 0.9 });
  }
  placard(c, 247, 128.6, 'e/acc CAMP\nACCELERATE\n(TOWARD WHAT?)', { facing: 2 });

  // E-scooters, left in the middle of everything.
  scatter(c, 'scooter', 10, 10, 220, 240, 70, { seed: 91, surfaces: ['concrete', 'brick', 'marble', 'forecourt', 'lawn', 'gravel'], scale: [1, 1] });
}

// ——————————————————————————————————————————————————————————— The traffic

/**
 * Two rings round the north of the city, one each way; rings round
 * Brussels and Hype Valley, and round the middle of the Alignment District
 * and the Timeline; trucks round the compute farm; the
 * trolley, round its problem; and the superhighway, which never stops.
 */
function traffic(c) {
  c.road([[9, 9], [227, 9], [227, 85], [9, 85]], { cars: 10, speed: 4.2 });
  c.road([[7, 7], [7, 87], [229, 87], [229, 7]], { cars: 10, speed: 4.6 });
  c.road([[105, 35], [131, 35], [131, 59], [105, 59]], { cars: 3, speed: 3.6 });
  c.road([[106, 113], [131, 113], [131, 137], [106, 137]], { cars: 3, speed: 3.6 });
  c.road([[104, 111], [104, 139], [133, 139], [133, 111]], { cars: 3, speed: 3.8 });
  c.road([[159, 127], [227, 127], [227, 165], [159, 165]], { cars: 4, speed: 4 });
  c.road([[9, 167], [121, 167], [121, 219], [9, 219]], { cars: 6, speed: 4.2 });
  c.road([[7, 165], [7, 221], [123, 221], [123, 165]], { cars: 6, speed: 4.2 });
  c.road([[123, 199], [227, 199], [227, 242], [123, 242]], { cars: 4, speed: 3.4, kind: 'truck' });
  c.road([[229, 197], [121, 197], [121, 244], [229, 244]], { cars: 4, speed: 4.2 });
  c.road([[197, 51], [215, 51], [215, 65], [197, 65]], { cars: 1, speed: 2.4 });
  // The superhighway: open at both ends, into the tunnels.
  const X = 232;
  c.road([[X + 2, -3], [X + 2, SIZE + 3]], { cars: 5, speed: 7.5, kind: 'truck', brakes: false, open: true });
  c.road([[X + 4, -3], [X + 4, SIZE + 3]], { cars: 5, speed: 9, kind: 'car', brakes: false, open: true });
  c.road([[X + 7, SIZE + 3], [X + 7, -3]], { cars: 5, speed: 9.5, kind: 'car', brakes: false, open: true });
  c.road([[X + 9, SIZE + 3], [X + 9, -3]], { cars: 5, speed: 7, kind: 'truck', brakes: false, open: true });
}

// ——————————————————————————————————————————————————————————— The people

/**
 * The people. Nobody is placed on a roof or in a wall (`map.crowd` sees to
 * that). The Pause protest is in the plaza, where it has been for a year;
 * the Eurocrats are on strike on the forecourt; the accelerationists are
 * out in Hype Valley and on the compute farm; everywhere else are the reply
 * guys.
 */
function crowds(c) {
  let seed = 1;
  const at = (kind, x, z, w, d, n, opts = {}) => c.crowd(kind, x, z, w, d, n, { seed: seed++, ...opts });
  // Portland Heights.
  at('commune', 11, 11, 18, 20, 3); at('commune', 10, 62, 20, 22, 5); at('theorist', 34, 10, 19, 22, 3);
  at('scroller', 34, 36, 42, 48, 4); at('scroller', 57, 10, 19, 22, 2); at('anarchist', 34, 36, 42, 48, 5);
  at('theorist', 10, 10, 20, 22, 2); at('replyguy', 10, 62, 20, 22, 2); at('drunk', 10, 36, 20, 22, 1);
  at('yimby', 57, 10, 19, 22, 3); at('nimby', 10, 10, 20, 22, 2); at('nimby', 57, 10, 19, 22, 2);
  at('folksinger', 10, 62, 20, 22, 3); at('dropout', 34, 36, 42, 48, 6); at('simulationist', 34, 36, 42, 48, 3);
  at('cyclist', 10, 10, 66, 74, 3); at('cat', 10, 10, 66, 74, 2); at('influencer', 34, 36, 42, 48, 2);
  // The Alignment District: the plaza, the stage, the offices, the building site.
  at('pauser', 107, 36, 23, 22, 8, { range: 4 }); at('doomer', 107, 36, 23, 22, 3); at('altruist', 107, 36, 23, 22, 2);
  at('pauser', 134, 44, 22, 13, 7, { range: 4 }); at('doomer', 134, 44, 22, 13, 3); at('purist', 134, 36, 22, 22, 2);
  at('forecaster', 80, 36, 23, 22, 4); at('rationalist', 134, 62, 22, 22, 5); at('longtermist', 80, 10, 23, 22, 2);
  at('researcher', 80, 10, 23, 22, 2); at('altruist', 107, 62, 23, 22, 5); at('longtermist', 107, 62, 23, 22, 1);
  at('substacker', 80, 62, 23, 22, 2); at('farmer', 134, 10, 22, 22, 2); at('replyguy', 107, 10, 23, 22, 2);
  at('gatekeeper', 80, 62, 23, 22, 1); at('ethicist', 107, 62, 23, 22, 3); at('ethicist', 80, 36, 23, 22, 2);
  at('prompter', 80, 10, 23, 22, 3); at('prompter', 134, 10, 22, 22, 2); at('shoggoth', 134, 62, 22, 22, 3);
  at('shoggoth', 107, 36, 23, 22, 2); at('pallbearer', 134, 36, 22, 22, 2);
  // The Ivory Tower.
  at('rationalist', 160, 10, 66, 74, 5); at('researcher', 160, 10, 66, 74, 5); at('theorist', 160, 10, 66, 74, 4);
  at('purist', 160, 10, 66, 74, 3); at('longtermist', 160, 10, 66, 74, 2); at('forecaster', 160, 10, 66, 74, 2);
  at('gatekeeper', 160, 46, 66, 38, 1); at('podcaster', 160, 10, 66, 74, 1);
  at('professor', 160, 10, 66, 74, 6); at('philosopher', 160, 10, 66, 74, 4); at('postdoc', 160, 10, 66, 74, 5);
  at('labrat', 160, 46, 66, 38, 4); at('cat', 160, 10, 66, 74, 2); at('prompter', 160, 10, 66, 74, 2);
  // The Pause Compound.
  at('pauser', 12, 90, 62, 72, 8, { range: 4 }); at('doomer', 12, 90, 62, 72, 6); at('forecaster', 12, 90, 62, 72, 3);
  at('researcher', 12, 90, 62, 72, 3); at('purist', 12, 90, 62, 72, 2); at('rationalist', 12, 90, 62, 72, 2);
  at('prepper', 12, 90, 62, 72, 7); at('pallbearer', 12, 90, 62, 72, 4); at('deadposter', 12, 90, 62, 72, 5);
  c.foe('prophet', 48.5, 151.5, { range: 2.5, notice: 8 });
  // The Timeline.
  at('replyguy', 80, 88, 76, 22, 6, { range: 5 }); at('farmer', 107, 114, 23, 22, 4); at('replyguy', 107, 114, 23, 22, 4);
  at('substacker', 80, 88, 76, 22, 4); at('thoughtleader', 80, 88, 76, 22, 3); at('gatekeeper', 134, 114, 22, 22, 2);
  at('scroller', 134, 114, 22, 22, 3); at('replyguy', 80, 114, 23, 22, 3); at('farmer', 134, 140, 22, 24, 4);
  at('substacker', 80, 140, 50, 24, 3); at('podcaster', 107, 140, 23, 24, 2); at('drunk', 80, 88, 76, 22, 1);
  at('influencer', 80, 88, 76, 76, 6); at('maincharacter', 107, 114, 23, 22, 4); at('screenshotter', 80, 88, 76, 76, 4);
  at('newsletter', 80, 88, 76, 76, 4); at('bird', 107, 114, 23, 22, 1); at('hottakes', 80, 88, 76, 76, 3);
  at('deadposter', 134, 114, 22, 22, 2); at('festivalbro', 80, 140, 50, 24, 2);
  // Hype Valley.
  at('accelerationist', 160, 88, 66, 36, 6, { maxH: 7 }); at('vc', 160, 128, 66, 36, 5, { maxH: 3.5 });
  at('podcaster', 176, 128, 14, 20, 3); at('thoughtleader', 160, 128, 66, 36, 4, { maxH: 3.5 }); at('accelerationist', 160, 128, 66, 36, 3, { maxH: 3.5 });
  at('founder', 160, 88, 66, 76, 6, { maxH: 7 }); at('recruiter', 160, 128, 66, 36, 3, { maxH: 3.5 }); at('cryptobro', 160, 88, 66, 76, 4, { maxH: 7 });
  at('biohacker', 160, 88, 66, 76, 4, { maxH: 7 }); at('corgi', 160, 128, 66, 36, 3, { maxH: 3.5 }); at('festivalbro', 160, 88, 66, 36, 2, { maxH: 7 });
  c.foe('billionaire', SAND_HILL.x - 3, SAND_HILL.z + 4.5, { range: 3, notice: 8 });
  // Brussels-sur-Mer.
  at('eurocrat', 10, 168, 52, 24, 6); at('eurocrat', 66, 168, 54, 24, 3); at('striker', 66, 168, 54, 24, 6);
  at('commuter', 66, 168, 54, 24, 3); at('commuter', 66, 196, 54, 22, 3); at('raver', 10, 196, 52, 22, 6);
  at('doorman', 30, 196, 28, 8, 2); at('raver', 6, 224, 114, 8, 4); at('eurocrat', 66, 196, 54, 22, 3);
  at('drunk', 66, 196, 54, 22, 1);
  at('dpo', 10, 168, 52, 24, 4); at('dpo', 66, 196, 54, 22, 2); at('waiter', 66, 196, 54, 22, 4); at('tourist', 66, 196, 54, 22, 5);
  at('nonna', 66, 196, 54, 22, 2); at('cabbie', 66, 168, 54, 24, 4); at('cyclist', 10, 168, 110, 50, 3);
  at('lifeguard', 6, 224, 114, 8, 3); at('surfer', 6, 224, 114, 8, 4); at('tourist', 6, 224, 114, 8, 3); at('festivalbro', 10, 196, 52, 22, 3);
  // The Compute Farm.
  at('accelerationist', 124, 200, 100, 40, 6); at('vc', 124, 200, 100, 40, 3); at('podcaster', 124, 200, 100, 40, 2);
  at('thoughtleader', 180, 168, 46, 28, 2); at('accelerationist', 180, 168, 46, 28, 3);
  at('technician', 124, 168, 102, 73, 6); at('oncall', 124, 168, 102, 73, 4); at('wrangler', 124, 200, 100, 40, 4);
  at('guard', 124, 168, 102, 73, 4); at('robot', 124, 200, 100, 40, 4); at('keeper', 180, 168, 46, 28, 2); at('founder', 124, 200, 100, 40, 2);
  // The far side, up on the hill and down the strip.
  at('accelerationist', 243, 92, 8, 30, 3, { maxH: 3 }); at('accelerationist', 243, 126, 8, 120, 4);
  at('alien', 243, 10, 8, 80, 3); at('alien', 243, 126, 8, 120, 2); at('cryptobro', 243, 126, 8, 120, 2);
  c.foe('edgecase', 247.5, 60.5, { range: 3, notice: 8 });
}
