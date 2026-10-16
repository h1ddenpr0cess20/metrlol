import { windowLamps } from './buildings.js';
import { structureLights } from './structures.js';
import { TownMap } from './map.js';

/**
 * The whole world, one map: Metrlol. No levels — it is all there from the
 * start, and the ball can roll anywhere it can get to. It is the layout of
 * Petroll's Petroleum Springs, which is tested to be rollable end to end, in
 * new clothes and with a crowd in it:
 *
 *   Portland Heights  the suburbs, north-west: co-op houses, a drained pool
 *                 turned community garden, a consensus maze, a skate park.
 *                 The commune, the anarchists and the theorists. Home is here.
 *   The Alignment District  north, in the middle: the think-tank towers and
 *                 the alley behind them, a group house with a car park on
 *                 its roof, the plaza where the Pause protest has been for
 *                 a year, a building site. Doomers, effective altruists,
 *                 rationalists, safety researchers, and the reply guys.
 *   Brussels-sur-Mer  the filling station at the east end of the avenue,
 *                 now a fuel-tax station: a regulatory sandbox, the strike
 *                 picket, a footbridge over the superhighway to the cookie
 *                 banner on the hill, and a club with a queue behind it.
 *   The Information Superhighway  down the east side, four lanes of trucks
 *                 and tankers in both directions. Nobody brakes. Nobody reads.
 *   The Compute Farm  south-east: rolling dirt, token pumps nodding, a long
 *                 pipeline to roll along, the scaling-law derrick, a tar pit
 *                 of bad takes, the benchmark yard. Accelerationists, VCs
 *                 and podcasters.
 *   The Pause Compound  south-west: tanks, catwalks, a lift, and hot takes
 *                 alley, where the steam comes up out of the floor. The
 *                 Prophet of Doom lives here.
 *
 * Traffic drives round the town on the right. x runs to the right of the
 * map, z down it; the map is 128 tiles each way and a ring of grassy bank
 * keeps everything on it.
 */

export const SIZE = 128;
const CURB = 0.15;

/** The bank round the edge: up from nothing five tiles in to two and a half high at the very edge, a fence along the top. */
const berm = (X, Z) => {
  const d = Math.min(X, Z, SIZE - X, SIZE - Z);
  return d < 5 ? (5 - d) * 0.5 : 0;
};

/** The compute farm: rolling ground, fading out to level at its edges, flattened under the pads. */
const FIELD = { x0: 42, z0: 58, x1: 108, z1: 124 };
const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const pads = [];

function hills(X, Z) {
  const fade = Math.min(smooth((X - FIELD.x0) / 7), smooth((FIELD.x1 - X) / 7), smooth((Z - FIELD.z0) / 7), smooth((FIELD.z1 - Z) / 7));
  if (fade <= 0) return 0;
  let h = 1.0 + 0.75 * Math.sin(X / 6.3) * Math.cos(Z / 7.7) + 0.45 * Math.sin((X + 2 * Z) / 12.5);
  // Slick Hill: a mound in the west of the field.
  const r = Math.hypot(X - 60.5, Z - 84.5);
  if (r < 6) h += 2.6 * smooth(1 - r / 6);
  return Math.max(0, h) * fade;
}

function ground(X, Z) {
  let h = hills(X, Z);
  // Pads: level where something stands, blending back into the hills over two tiles.
  let best = 0, padH = 0;
  for (const p of pads) {
    const dx = Math.max(p.x - X, 0, X - (p.x + p.w)), dz = Math.max(p.z - Z, 0, Z - (p.z + p.d));
    const w = 1 - Math.max(dx, dz) / 2;
    if (w > best) { best = w; padH = p.h; }
  }
  if (best > 0) h = h + (padH - h) * smooth(best);
  return Math.max(h, berm(X, Z));
}

/** A level pad in the compute farm at the height of the ground under its middle (see `settle`). */
function pad(x, z, w, d) {
  const p = { x, z, w, d, h: hills(x + w / 2, z + d / 2) };
  pads.push(p);
  return p;
}

/**
 * Pads close enough that their slopes would meet are put at one height
 * between them, so there is never a step where two of them run together.
 */
function settle() {
  const group = pads.map((_, i) => i);
  const root = (i) => (group[i] === i ? i : (group[i] = root(group[i])));
  for (let i = 0; i < pads.length; i++) {
    for (let j = i + 1; j < pads.length; j++) {
      const a = pads[i], b = pads[j];
      const gap = Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w), a.z - (b.z + b.d), b.z - (a.z + a.d));
      if (gap < 4) group[root(i)] = root(j);
    }
  }
  const sums = new Map();
  pads.forEach((p, i) => {
    const r = root(i), s = sums.get(r) ?? [0, 0];
    sums.set(r, [s[0] + p.h * p.w * p.d, s[1] + p.w * p.d]);
  });
  pads.forEach((p, i) => {
    const [h, area] = sums.get(root(i));
    p.h = Math.round((h / area) * 20) / 20;
  });
}

export function createTown() {
  pads.length = 0;
  const c = new TownMap({ name: 'Metrlol', cols: SIZE, rows: SIZE });

  // The compute farm's pads, before the ground is laid, so it is laid round them.
  const P = {
    office: pad(50, 65, 7, 6),
    jack1: pad(54, 70, 6, 4),
    jack2: pad(66, 78, 6, 4),
    jack3: pad(58, 94, 6, 4),
    jack4: pad(82, 72, 6, 4),
    jack5: pad(90, 90, 6, 4),
    jack6: pad(76, 108, 6, 4),
    jack7: pad(54, 108, 6, 4),
    derrick: pad(75, 83, 12, 10),
    tar: pad(63, 97, 14, 11),
    yard: pad(87, 97, 12, 10),
    pipeEnd: pad(98, 65, 5, 5),
  };
  settle();
  for (const k of Object.keys(P)) P[k] = P[k].h;

  c.surface(0, 0, SIZE, SIZE, ground, { surface: 'grass' });
  for (let z = 0; z < SIZE; z++) {
    for (let x = 0; x < SIZE; x++) {
      const cell = c.cell(x, z);
      if (cell.h.some((v) => v > 0.05) && Math.min(x, z, SIZE - 1 - x, SIZE - 1 - z) < 5) cell.surface = 'berm';
    }
  }
  c.paint(FIELD.x0, FIELD.z0, FIELD.x1 - FIELD.x0, FIELD.z1 - FIELD.z0, 'dirt');
  for (const p of pads) c.paint(p.x, p.z, p.w, p.d, 'gravel');

  c.start = { x: 17, z: 18 };

  // The fence along the top of the bank, all the way round.
  const F = 0.35, top = berm(0, 0) + 1.3;
  c.prop('fence', 0, 0, { size: SIZE, inset: F });
  c.solid(0, 0, 0, SIZE, top, F).solid(0, 0, SIZE - F, SIZE, top, SIZE);
  c.solid(0, 0, 0, F, top, SIZE).solid(SIZE - F, 0, 0, SIZE, top, SIZE);

  streets(c);
  portlandHeights(c);
  alignmentDistrict(c);
  brussels(c);
  superhighway(c);
  computeFarm(c, P);
  pauseCompound(c);
  traffic(c);
  signs(c);
  crowds(c);
  windowLamps(c);
  structureLights(c);

  c.district('Portland Heights', 3, 3, 44, 57, '#7cb257');
  c.district('The Alignment District', 47, 3, 49, 57, '#8a8f9a');
  c.district('Brussels-sur-Mer', 90, 3, 21, 77, '#4a6ac8');
  c.district('The Information Superhighway', 111, 0, 11, SIZE, '#5a5d66');
  c.district('The Far Side', 122, 0, 6, SIZE, '#8c9a5a');
  c.district('The Compute Farm', 42, 58, 69, 70, '#b07c48');
  c.district('The Pause Compound', 0, 58, 42, 70, '#9aa0aa');
  return c;
}

/** A freestanding sign with words on both faces, and solid, standing on (x, z). */
function placard(c, x, z, text, { facing = 0, w = 1.8, h = 1.1, bg, fg, size, y = null } = {}) {
  c.prop('placard', x, z, { text, facing, w, h, bg, fg, size, y });
  const base = y ?? c.heightAt(x, z) ?? 0;
  const ex = facing % 2 === 0 ? w / 2 : 0.1, ez = facing % 2 === 0 ? 0.1 : w / 2;
  c.solid(x - ex, base, z - ez, x + ex, base + 0.5 + h, z + ez);
}

/** The signs: the commune's, the Pause protest's, the Eurocrats', the compute farm's. */
function signs(c) {
  const RED = { bg: '#d81c2a', fg: '#fff6ee' }, BLUE = { bg: '#1a3aa0', fg: '#f4d020' }, DARK = { bg: '#16161a', fg: '#e8e4d8' };
  // Portland Heights.
  placard(c, 11.8, 23.5, 'IN THIS HOUSE\nWE BELIEVE\nIN EVERYTHING', { facing: 3, size: 54 });
  placard(c, 36, 11.8, 'COMMUNITY\nGARDEN MEETING\nTHU 9PM (AGAIN)', { facing: 2, size: 46 });
  placard(c, 22, 32.5, 'CONSENSUS MAZE\nSTILL VOTING ON\nTHE EXIT', { facing: 2, size: 48 });
  placard(c, 36.5, 33.4, 'NO GODS\nNO MASTERS\nNO HELMETS', { facing: 2, ...DARK });
  // The Alignment District.
  placard(c, 61, 33.4, 'WHEN IN\nDOUBT,\nPAUSE.', { facing: 2, ...RED, size: 76 });
  placard(c, 56, 50.4, 'PAPERCLIPS:\nA WARNING', { facing: 0, size: 62 });
  placard(c, 54.5, 10.7, 'THE LONGTERM\nINSTITUTE', { facing: 0, size: 64, ...DARK });
  placard(c, 62, 27.4, 'p(doom) = 97%\n(UPDATED\nTUESDAY)', { facing: 0, size: 52 });
  placard(c, 80, 51, 'PAUSE THE CRANE\n(DEMAND #4)', { facing: 0, size: 52, ...RED });
  // Brussels-sur-Mer.
  placard(c, 104, 35.4, 'GRÈVE\nGÉNÉRALE\n(DAY 4)', { facing: 2, ...RED, size: 70 });
  placard(c, 98.6, 38.5, 'FORM 27B\nREQUIRED', { facing: 3, ...BLUE, size: 66 });
  placard(c, 108.2, 36.5, 'AI ACT\nARTICLE 1\nOF 113', { facing: 3, ...BLUE, size: 62 });
  placard(c, 103, 32.4, 'QUEUE STARTS\nHERE\n(SINCE THURSDAY)', { facing: 2, ...DARK, size: 52 });
  // The Compute Farm.
  placard(c, 57.5, 74.4, 'TOKEN PUMP\nDO NOT STAND\nUNDER HEAD', { facing: 0, size: 50 });
  placard(c, 93, 95.5, 'TIME HORIZON\nDOUBLES EVERY\n7 MONTHS*\n*ERROR BARS NOT SHOWN', { facing: 2, size: 38, h: 1.3, w: 2.2 });
  placard(c, 59.5, 79.4, 'LINE\nGO UP', { facing: 2, ...DARK, size: 90 });
  placard(c, 100.5, 63.8, 'END OF THE\nTRAINING RUN', { facing: 2, size: 60 });
  // The Pause Compound.
  placard(c, 21, 61.2, 'PAUSE COMPOUND\nHONK IF YOU\'RE\nSCARED', { facing: 2, ...RED, size: 50 });
  placard(c, 10, 64.4, 'THE END IS\nNIGH\n(AGAIN)', { facing: 2, size: 64 });
  placard(c, 28.5, 81.3, 'HOT TAKES ALLEY\nDO NOT ENTER', { facing: 2, size: 52, ...DARK });
}

/**
 * The people. Nobody is placed on a roof or in a wall (`map.crowd` sees to
 * that). The Pause protest is in the plaza, where it has been for a year;
 * the Eurocrats are on strike on the forecourt; the accelerationists are out
 * on the compute farm; everywhere else are the reply guys.
 */
function crowds(c) {
  // Portland Heights.
  c.crowd('commune', 11, 11, 14, 16, 3, { seed: 1 }).crowd('commune', 31, 11, 14, 16, 2, { seed: 2 });
  c.crowd('theorist', 31, 11, 14, 16, 2, { seed: 3 });
  c.crowd('scroller', 11, 33, 14, 18, 3, { seed: 4 });
  c.crowd('anarchist', 31, 33, 14, 18, 3, { seed: 5 });
  // The Alignment District: the plaza, the offices, the building site.
  c.crowd('pauser', 51, 33, 14, 18, 7, { seed: 6, range: 4 });
  c.crowd('doomer', 51, 33, 14, 18, 3, { seed: 7 });
  c.crowd('altruist', 51, 33, 14, 18, 3, { seed: 8 });
  c.crowd('forecaster', 51, 33, 14, 18, 2, { seed: 9 });
  c.crowd('purist', 51, 33, 14, 18, 1, { seed: 10 });
  c.crowd('longtermist', 51, 33, 14, 18, 1, { seed: 11 });
  c.crowd('researcher', 51, 33, 14, 18, 2, { seed: 12 });
  c.crowd('rationalist', 58, 12, 1, 14, 2, { seed: 13, range: 6 });
  c.crowd('replyguy', 50, 10, 1, 18, 2, { seed: 14, range: 8 }).crowd('thoughtleader', 65, 10, 1, 18, 2, { seed: 15, range: 8 });
  c.crowd('substacker', 71, 43, 14, 8, 2, { seed: 16 }).crowd('vc', 71, 43, 14, 8, 2, { seed: 17 });
  c.crowd('farmer', 51, 33, 14, 18, 2, { seed: 18 }).crowd('gatekeeper', 71, 43, 14, 8, 1, { seed: 19 });
  // Brussels-sur-Mer: the strike on the forecourt, the club's yard.
  c.crowd('eurocrat', 96, 35, 14, 7, 4, { seed: 20 }).crowd('striker', 96, 35, 14, 7, 4, { seed: 21 });
  c.crowd('commuter', 96, 35, 14, 7, 3, { seed: 22 });
  c.crowd('raver', 96, 8, 15, 24, 4, { seed: 23 }).crowd('doorman', 96, 8, 15, 24, 2, { seed: 24 });
  c.foe('troll', 99.5, 35.5, { range: 1.5, notice: 5 });
  // The Far Side, up on the hill.
  c.crowd('accelerationist', 122, 24, 3, 22, 3, { seed: 25, maxH: 3 });
  // The Compute Farm: the pads.
  c.crowd('podcaster', 50, 65, 7, 6, 2, { seed: 26, maxH: 4 }).crowd('podcaster', 63, 97, 14, 11, 1, { seed: 27, maxH: 4 });
  c.crowd('accelerationist', 87, 97, 12, 10, 3, { seed: 28, maxH: 4 }).crowd('vc', 87, 97, 12, 10, 2, { seed: 29, maxH: 4 });
  c.crowd('accelerationist', 75, 83, 12, 10, 2, { seed: 30, maxH: 4 }).crowd('thoughtleader', 75, 83, 12, 10, 1, { seed: 31, maxH: 4 });
  // The Pause Compound.
  c.crowd('pauser', 5, 66, 36, 50, 6, { seed: 32, range: 4 });
  c.crowd('doomer', 5, 66, 36, 50, 4, { seed: 33 }).crowd('forecaster', 5, 66, 36, 50, 2, { seed: 34 });
  c.crowd('researcher', 5, 66, 36, 50, 2, { seed: 35 }).crowd('purist', 5, 66, 36, 50, 2, { seed: 36 });
  c.crowd('rationalist', 5, 66, 36, 50, 2, { seed: 37 });
  c.foe('prophet', 24.5, 112.5, { range: 2.5, notice: 8 });
}

/** The grid of streets: five running down, three across, the avenue on to the gas station. */
const DOWN = [6, 26, 46, 66, 86];
const ACROSS = [6, 28, 52];

function streets(c) {
  for (const x of DOWN) c.flat(x, 6, 4, 50, 0, { surface: 'road' });
  for (const z of ACROSS) c.flat(6, z, 84, 4, 0, { surface: 'road' });
  c.flat(90, 52, 6, 4, 0, { surface: 'road' });
  // South: into the compound, and the dirt road into the compute farm.
  c.flat(26, 56, 4, 6, 0, { surface: 'road' });
  c.flat(46, 56, 4, 7, 0, { surface: 'dirt' });

  const inStreet = (v, list, w = 4) => list.some((s) => v >= s - 0.01 && v <= s + w + 0.01);
  // Yellow dashes down the middle of each street, but not across the junctions.
  for (const z of ACROSS) {
    for (let x = 6.5; x < (z === 52 ? 95 : 89); x += 2) if (!inStreet(x, DOWN) && !inStreet(x + 1, DOWN)) c.mark(x, z + 1.94, 1, 0.12, '#f2c230');
  }
  for (const x of DOWN) {
    for (let z = 6.5; z < 55; z += 2) if (!inStreet(z, ACROSS) && !inStreet(z + 1, ACROSS)) c.mark(x + 1.94, z, 0.12, 1, '#f2c230');
  }
  // Zebra crossings on every side of every junction.
  for (const x of DOWN) {
    for (const z of ACROSS) {
      for (let k = 0; k < 4; k++) {
        if (z > 6) c.mark(x + 0.2 + k, z - 0.9, 0.5, 0.8);
        if (z < 52) c.mark(x + 0.2 + k, z + 4.1, 0.5, 0.8);
        if (x > 6) c.mark(x - 0.9, z + 0.2 + k, 0.8, 0.5);
        if (x < 86) c.mark(x + 4.1, z + 0.2 + k, 0.8, 0.5);
      }
    }
  }
  // Street lamps on the corners, trees along the avenue.
  // Street lamps on the corners, their arms out over the junction; more along the long blocks.
  // At the kerb's edge, so the pavement past them is wide enough for the ball.
  const kerb = 0.2;
  for (const x of DOWN) for (const z of ACROSS) c.place('streetlamp', x - kerb, z - kerb, { angle: -Math.PI / 4 });
  // (Not along the car park, where the pavement runs between its wall and the kerb.)
  for (const x of DOWN) for (const z of [18.5, 41.5]) if (!(x === 86 && z === 18.5)) c.place('streetlamp', x - kerb, z, { angle: 0 });
  for (const z of ACROSS) for (const x of [17.5, 37.5, 57.5, 77.5]) c.place('streetlamp', x, z - kerb, { angle: -Math.PI / 2 });
  for (let x = 8; x < 92; x += 6) if (!inStreet(x, [26, 46])) c.place(x % 4 ? 'tree' : 'pine', x + 0.5, 57.5, { scale: 0.9 + (x % 3) * 0.1, angle: x });
  for (let z = 12; z < 50; z += 7) c.place('pine', 3.5, z + 0.5, { scale: 1.1, angle: z });
}

/** A block: a raised sidewalk all round, and what's inside on top of it. */
function block(c, x, z, w, d, inside = 'lawn') {
  c.flat(x, z, w, d, CURB, { surface: 'sidewalk' });
  c.flat(x + 1, z + 1, w - 2, d - 2, CURB, { surface: inside });
}

function house(c, x, z, w, d, wall, { ridge = 'x', door = 'n' } = {}) {
  c.block(x, z, w, d, CURB + 1.6, { roof: 'pitched', ridge, wall, pitch: 1.0, facade: 'house', base: CURB, door, lit: 0.55 });
}

/** A hedge (or any wall): drawn, and solid. */
function wall(c, x0, z0, x1, z1, y0, y1, colour, finish = 'matte', tex = null) {
  c.prop('wall', x0, z0, { x1, z1, y0, y1, colour, finish, tex });
  c.solid(x0, y0, z0, x1, y1, z1);
}

function portlandHeights(c) {
  const walls = ['#e6dccb', '#c9d8e8', '#f0d9a8', '#d8b8c8', '#cfe3c2', '#f2e6d0'];

  // Home, and the neighbours.
  block(c, 10, 10, 16, 18);
  house(c, 12, 12, 5, 5, '#f0d9a8');
  house(c, 18, 12, 5, 5, walls[1]);
  house(c, 12, 20, 5, 5, walls[3], { door: 's' });
  house(c, 18, 20, 5, 5, walls[4], { door: 's' });
  c.paint(14, 11, 1, 1, 'concrete');
  c.whetstone('Home', 20.5, 18.5);
  c.place('mailbox', 15.6, 10.6, { turn: 2 });
  c.place('tree', 24, 18.5, { scale: 1.1 });
  c.place('tree', 11.5, 18.5, { scale: 0.95, angle: 1 });
  c.place('hydrant', 10.25, 26.4);
  c.gpu('The free stuff table', 23.5, 25.5);
  c.likeLine(17.5, 13, 17.5, 25, 7);

  // The drained pool, now the community garden.
  block(c, 30, 10, 16, 18);
  house(c, 32, 12, 5, 4, walls[2]);
  house(c, 39, 12, 5, 4, walls[5]);
  c.surface(33, 18, 9, 8, (X, Z) => {
    const u = (2 * (X - 33)) / 9 - 1, v = (2 * (Z - 18)) / 8 - 1;
    const k = Math.max(Math.abs(u), Math.abs(v));
    return CURB - 1.3 * (1 - smooth(Math.max(0, (k - 0.35) / 0.65)));
  }, { surface: 'pool' });
  c.gpu('The community garden', 37.5, 22);
  c.likeLine(33.5, 17, 41.5, 17, 5);
  c.prop('chair', 43.5, 20.5).prop('chair', 43.5, 23.5);

  // The consensus maze (still voting on the way out).
  block(c, 10, 32, 16, 20);
  const g = '#3f7a34', top = CURB + 0.9;
  const ring = (x0, z0, x1, z1, gap) => {
    const t = 0.4;
    // gap: which side has the way in, 'n' or 's'; the way in is two tiles in the middle.
    const mid = (x0 + x1) / 2;
    const hedge = (a, b, cc, d) => wall(c, a, b, cc, d, CURB, top, g, 'matte', 'hedge');
    const side = (zz, open) => {
      if (open) { hedge(x0, zz, mid - 1, zz + t); hedge(mid + 1, zz, x1, zz + t); }
      else hedge(x0, zz, x1, zz + t);
    };
    side(z0, gap === 'n');
    side(z1 - t, gap === 's');
    hedge(x0, z0, x0 + t, z1);
    hedge(x1 - t, z0, x1, z1);
  };
  ring(12, 34, 24, 50, 'n');
  ring(14.2, 36.2, 21.8, 47.8, 's');
  ring(16.4, 38.4, 19.6, 45.6, 'n');
  c.gpu('Middle of the consensus maze', 18, 42);
  c.likeLine(13.2, 36, 13.2, 49, 6);
  c.likeLine(15.4, 49, 22.6, 49, 4);

  // The skate park, murals on the quarter pipe, a funbox, a bank.
  block(c, 30, 32, 16, 20, 'concrete');
  c.surface(41, 34, 4, 16, (X) => CURB + 1.75 * ((X - 41) / 4) ** 2, { surface: 'concrete' });
  c.flat(34, 39, 3, 5, CURB + 0.8, { surface: 'concrete' });
  c.slope(31, 39, 3, 5, CURB, CURB + 0.8, 'x', { surface: 'concrete' });
  c.slope(34, 44, 3, 3, CURB + 0.8, CURB, 'z', { surface: 'concrete' });
  c.slope(34, 36, 3, 3, CURB, CURB + 0.8, 'z', { surface: 'concrete' });
  c.gpu('Up the quarter pipe (mural side)', 44.5, 42, { y: CURB + 1.75 * (3.5 / 4) ** 2 });
  c.likeLine(35.5, 40, 35.5, 43, 3);
  c.prop('rail', 38, 47, { length: 5 });
}

function alignmentDistrict(c) {
  // Offices, and the alley behind them.
  block(c, 50, 10, 16, 18, 'concrete');
  c.block(51, 11, 7, 9, CURB + 7.2, { wall: '#a8b4c4', facade: 'office', base: CURB, lit: 0.35 });
  c.block(51, 21, 7, 6, CURB + 6, { wall: '#c87a5a', facade: 'brick', base: CURB, lit: 0.45, door: 's' });
  c.block(59, 11, 6, 16, CURB + 9.9, { wall: '#8a98aa', facade: 'office', base: CURB, lit: 0.3 });
  // A dumpster round the side of the car park, out of everybody's way.
  c.place('dumpster', 71.55, 25, { turn: 1 });
  c.gpu('Behind the Substack tower', 58.5, 25.5);
  c.likeLine(58.5, 14, 58.5, 24, 5);

  // The group house's car park: round and up to the roof.
  block(c, 70, 10, 16, 18, 'concrete');
  const L = CURB;
  c.flat(71, 25, 2, 2, L, { surface: 'concrete' });
  c.slope(71, 13, 2, 12, 1.1, L, 'z', { surface: 'concrete' });
  c.flat(71, 11, 2, 2, 1.1, { surface: 'concrete' });
  c.slope(73, 11, 10, 2, 1.1, 2.1, 'x', { surface: 'concrete' });
  c.flat(83, 11, 2, 2, 2.1, { surface: 'concrete' });
  c.slope(83, 13, 2, 12, 2.1, 3.1, 'z', { surface: 'concrete' });
  c.flat(83, 25, 2, 2, 3.1, { surface: 'concrete' });
  c.slope(75, 25, 8, 2, 4.1, 3.1, 'x', { surface: 'concrete' });
  c.flat(73, 25, 2, 2, 4.1, { surface: 'concrete' });
  c.block(73, 13, 10, 12, 4.1, { surface: 'concrete', wall: '#b0aca2', facade: 'garage', base: CURB, lit: 0 });
  const par = '#bdb8ab';
  wall(c, 70.8, 11, 71, 25, 0, 1.6, par, 'matte', 'block');
  wall(c, 71, 10.8, 85, 11, 0, 2.6, par, 'matte', 'block');
  wall(c, 85, 11, 85.2, 27, 0, 3.6, par, 'matte', 'block');
  wall(c, 73, 27, 85, 27.2, 0, 4.6, par, 'matte', 'block');
  c.gpu('The group house roof', 78, 19, { y: 4.1 });
  c.likeLine(72, 23, 72, 14, 5).likeLine(75, 12, 81, 12, 4).likeLine(84, 14, 84, 23, 5).likeLine(81, 26, 75, 26, 4);
  for (const [x, z, col, m] of [[75, 15, '#c8382c', 'sedan'], [79, 21, '#2c6ec8', 'hatchback'], [76.5, 22, '#e8e2d6', 'sedan']]) {
    c.place(m, x, z, { paint: col, y: 4.1 });
  }

  // The plaza: a fountain to roll round, a statue of the paperclip, and the Pause protest.
  block(c, 50, 32, 16, 20, 'brick');
  c.surface(54, 38, 8, 8, (X, Z) => {
    const r = Math.hypot(X - 58, Z - 42) / 4;
    return CURB - 0.7 * (1 - smooth(Math.min(1, r)));
  }, { surface: 'pool' });
  c.prop('fountain', 58, 42);
  c.gpu('In the wishing fountain', 56.4, 42);
  c.place('statue', 52.5, 48.5, { turn: 2 });
  for (const [x, z] of [[53, 36], [63, 36], [53, 48.5], [63, 47]]) c.place('tree', x, z, { scale: 1.05, angle: x });
  c.place('bench', 56, 35.6, { turn: 2 }).place('bench', 60, 49.4).place('bin', 58.2, 35.5, { scale: 0.7 });
  c.whetstone('Alignment Plaza', 62.5, 42.5);
  c.likeLine(52, 42, 54, 42, 2).likeLine(62, 38, 62, 46, 4);

  // The building site (the crane has been paused since March): switchbacks up the scaffolding to the top.
  block(c, 70, 32, 16, 20, 'dirt');
  c.slope(73, 34, 11, 2, CURB, 2.1, 'x', { surface: 'metal' });
  c.flat(84, 34, 1, 4, 2.1, { surface: 'metal' });
  c.slope(73, 36, 11, 2, 4.1, 2.1, 'x', { surface: 'metal' });
  c.flat(71, 36, 2, 5, 4.1, { surface: 'metal' });
  c.prop('scaffold', 71, 34, { w: 14, d: 7, h: 4.1 });
  c.prop('crane', 80, 45);
  c.solid(79.4, CURB, 44.4, 80.6, 14, 45.6);
  c.gpu('Scaffold of the Pause rally', 71.6, 39.8, { y: 4.1 });
  c.likeLine(75, 35, 82, 35, 4).likeLine(82, 37, 75, 37, 4);
  for (const [x, z] of [[72, 46], [76, 49], [84, 41], [72.6, 46.4], [77, 49.3]]) c.place('cone', x, z);
  c.drum(74, 46, { range: 6 });
  c.drum(83, 48, { range: 6 });
}

function brussels(c) {
  // The forecourt, a fuel-tax station.
  c.flat(96, 34, 15, 31, 0, { surface: 'forecourt' });
  c.flat(99, 44, 1, 6, 0.2, { surface: 'concrete' });
  c.flat(103, 44, 1, 6, 0.2, { surface: 'concrete' });
  for (const z of [45.2, 48.2]) {
    for (const x of [99.5, 103.5]) {
      c.place('gaspump', x, z + 0.5, { y: 0.2, scale: 0.95 });
    }
  }
  c.prop('canopy', 97, 42, { w: 10, d: 10, h: 2.7 });
  for (const [x, z] of [[97.25, 42.6], [105.75, 42.6], [97.25, 51.4], [105.75, 51.4]]) c.solid(x - 0.15, 0, z - 0.15, x + 0.15, 2.7, z + 0.15);
  c.paint(100, 45, 2, 3, 'oil').paint(104, 48, 2, 2, 'oil').paint(97, 52, 2, 1, 'oil');
  for (let x = 96.5; x < 111; x += 3) c.mark(x, 64.4, 2, 0.12);

  // The Euro shop (closed for lunch), with a loading ramp up its side.
  c.block(102, 56, 7, 8, 2.4, { wall: '#ece6da', facade: 'shop', base: 0, door: 'n', lit: 1 });
  c.prop('shop', 102, 56, { w: 7, d: 8, h: 2.4 });
  c.slope(109, 56, 2, 7, 0, 2.4, 'z', { surface: 'concrete' });
  c.flat(109, 63, 2, 1, 2.4, { surface: 'concrete' });
  c.flat(102, 64, 9, 1, 0, { surface: 'forecourt' });
  wall(c, 110.9, 56, 111.1, 64, 0, 3, '#bdb8ab', 'matte', 'block');
  c.gpu('On the Euro shop roof', 105.5, 58.5, { y: 2.4 });
  c.whetstone('Brussels', 98.5, 55.5);

  // The regulatory sandbox: a tunnel, wet all through.
  c.block(96, 57, 6, 1, 2.2, { wall: '#5a9ad8', wtex: 'corrugated' });
  c.block(96, 63, 6, 1, 2.2, { wall: '#5a9ad8', wtex: 'corrugated' });
  c.flat(96, 58, 6, 5, 0, { surface: 'wet' });
  c.deck(95.8, 56.8, 6.4, 7.4, 2.5, { colour: '#e8e4dc', roof: true });
  c.prop('carwash', 96, 58, { w: 6, d: 5 });
  c.gpu('In the regulatory sandbox', 99, 60.5);

  // The footbridge over the superhighway, to the cookie banner on the hill.
  c.slope(101, 34, 10, 2, 0, 2.7, 'x', { surface: 'concrete' });
  c.deck(111, 34, 11.2, 2, 2.7, { colour: '#a7a39a' });
  // Its sides: walls beside the ramp, railings along the deck (the traffic goes under).
  wall(c, 101, 33.8, 111, 34, 0, 3.3, '#5a6068', 'shiny');
  wall(c, 101, 36, 111, 36.2, 0, 3.3, '#5a6068', 'shiny');
  wall(c, 111, 33.8, 122, 34, 2.7, 3.3, '#5a6068', 'shiny');
  wall(c, 111, 36, 115.8, 36.2, 2.7, 3.3, '#5a6068', 'shiny');
  wall(c, 117.4, 36, 122, 36.2, 2.7, 3.3, '#5a6068', 'shiny');
  c.flat(122, 24, 3, 22, 2.7, { surface: 'grass', wall: '#6a4a2c' });
  c.prop('billboard', 123.6, 31, { text: 'ACCEPT ALL\nCOOKIES?', tag: 'REJECT ALL · 47 MORE STEPS' });
  c.solid(123.2, 2.7, 28.6, 124.0, 6.5, 33.4);
  c.gpu('Under the cookie banner', 122.8, 26.5, { y: 2.7 });
  c.likeLine(103, 35, 109, 35, 4);
  c.likeLine(112, 35, 121, 35, 5, { y: 2.7 });

  // North of the forecourt: the club's yard, with the queue.
  c.flat(96, 8, 15, 24, 0, { surface: 'gravel' });
  for (const [x, z, col, r] of [[99, 12, '#8a3a26', 0.3], [104, 11, '#4a6a8a', 1.2], [99, 18, '#6a7a3a', 2.1], [106, 19, '#8a8a8e', 0.6], [101, 26, '#a05a2a', 1.6]]) {
    c.place('junker', x, z, { angle: r * 1.3 });
    c.cylinder(x, z, 0.9, 0, 0.9);
    void col;
  }
  for (const [x, z] of [[108, 14], [108, 25], [97, 30]]) {
    c.place('tyres', x, z, { angle: x });
  }
  c.likeLine(97, 15, 109, 15, 6).likeLine(103, 22, 103, 30, 4);
}

function superhighway(c) {
  c.flat(111, 0, 11, SIZE, 0, { surface: 'highway' });
  c.flat(116, 4, 1, SIZE - 8, 0.5, { surface: 'concrete' });
  // Crossovers in the barrier, for the police and the breakdown trucks (and balls).
  for (const z of [70, 100]) c.flat(116, z, 1, 3, 0, { surface: 'highway' });
  for (let z = 0; z < SIZE; z += 3) {
    c.mark(113.94, z, 0.12, 1.6);
    c.mark(118.94, z, 0.12, 1.6);
  }
  c.mark(111.9, 0, 0.1, SIZE, '#f2f0e8').mark(121.0, 0, 0.1, SIZE, '#f2f0e8');
  // Tunnels where it goes through the bank at each end, and nothing gets past them.
  c.prop('tunnel', 111, 0, { w: 11, d: 4, facing: 1 });
  c.prop('tunnel', 111, SIZE - 4, { w: 11, d: 4, facing: -1 });
  // The tunnels solid, portal and all, so nothing gets in behind them off the banks either side.
  c.solid(110.2, 0, 0, 122.8, 4.2, 3.9);
  c.solid(110.2, 0, SIZE - 3.9, 122.8, 4.2, SIZE);
  c.gpu('On the central reservation', 116.5, 37.7, { y: 0.5 });
  // The far side: the grass behind the billboard, all the way down to the corner.
  c.likeLine(123.5, 50, 123.5, 118, 12);
  c.gpu('The edge of the feed', 124.6, 124.6, { y: berm(124.6, 124.6) });
}

function computeFarm(c, P) {
  // The field office.
  c.prop('trailer', 51, 66, { w: 4, d: 2, y: P.office });
  c.solid(51, P.office, 66, 55, P.office + 1.5, 68);
  c.whetstone('Compute Farm Office', 55.5, 69.5);

  // Dirt roads round the field.
  const road = (x, z, w, d) => c.paint(x, z, w, d, 'dirt');
  road(47, 63, 58, 2); road(47, 117, 58, 2); road(47, 63, 2, 56); road(103, 63, 2, 56);

  // Token pumps. Each nods over the tile at its head.
  const jack = (x, z, h, opts) => {
    c.pumpjack(x, z, opts);
    c.solid(x - 4.4, h, z + 0.1, x - 2.6, h + 1.1, z + 0.9);
  };
  jack(59, 71, P.jack1, { period: 3.4 });
  jack(71, 79, P.jack2, { period: 3.0, phase: 1 });
  jack(63, 95, P.jack3, { period: 3.6, phase: 2 });
  jack(87, 73, P.jack4, { period: 3.2, phase: 0.5 });
  jack(95, 91, P.jack5, { period: 2.8, phase: 1.5 });
  jack(81, 109, P.jack6, { period: 3.3, phase: 2.5 });
  jack(59, 109, P.jack7, { period: 3.1, phase: 0.2 });
  c.gpu('Under the nodding token pump', 63.5, 95.5, { y: P.jack3 });

  // The pipeline: a long, thin, high way along the top.
  const PIPE = 3.6;
  // The ramp up starts flush with the ground under it, corner for corner.
  c.surface(58, 68, 6, 1, (X, Z) => ground(58, Z) + (PIPE - ground(58, Z)) * ((X - 58) / 6), { surface: 'metal' });
  c.flat(64, 68, 35, 1, PIPE, { surface: 'metal' });
  c.flat(99, 66, 3, 3, PIPE, { surface: 'metal' });
  c.prop('pipeline', 58, 68, { to: 102, h: PIPE });
  c.gpu('End of the training run', 100.5, 67.5, { y: PIPE });
  c.likeLine(66, 68.5, 96, 68.5, 10);

  // The scaling-law derrick: up on the lift to the platform at the top.
  const D = P.derrick, TOP = D + 8;
  c.prop('derrick', 80, 86, { w: 4, d: 4, y: D, top: TOP });
  c.deck(80, 86, 4, 4, TOP, { colour: '#8a6a42' });
  for (const [x, z] of [[80, 86], [83.6, 86], [80, 89.6], [83.6, 89.6]]) c.solid(x, D, z, x + 0.4, TOP - 0.3, z + 0.4);
  c.lift(78, 87, 2, 2, D, { to: [0, 8, 0], period: 9, pause: 0.22 });
  wall(c, 79.9, TOP, 84.1, TOP + 0.5, 85.9, 86.1, '#c8382c');
  c.solids.pop();
  c.solid(79.9, TOP, 85.9, 84.1, TOP + 0.5, 86.1);
  c.solid(79.9, TOP, 89.9, 84.1, TOP + 0.5, 90.1);
  c.solid(83.9, TOP, 85.9, 84.1, TOP + 0.5, 90.1);
  c.gpu('Top of the scaling law', 82, 88, { y: TOP });
  c.likeLine(76, 85, 76, 91, 4);

  // The tar pit of bad takes, and the island in the middle of it.
  const T = P.tar;
  c.flat(65, 99, 10, 7, T - 0.6, { surface: 'tar' });
  c.flat(69, 101, 2, 3, T, { surface: 'dirt' });
  c.flat(65, 102, 4, 1, T, { surface: 'plank' });
  c.gpu('Bad takes tar pit island', 70, 102.5, { y: T });
  c.prop('sign', 63.6, 101, { text: 'DANGER\nBAD TAKES', y: T });

  // The benchmark yard: stacks to weave through, and drums that roll after you.
  const Y = P.yard;
  for (const [x, z] of [[89, 99], [92, 101], [95, 98.5], [89, 104], [93, 105], [96.5, 102.5]]) {
    for (const [dx, dz, dy] of [[-0.33, -0.33, 0], [0.33, -0.33, 0], [-0.33, 0.33, 0], [0.33, 0.33, 0], [0, 0, 0.88]]) c.place('drum', x + dx, z + dz, { y: Y + dy, angle: dx * 7 + dz * 3 });
    c.solid(x - 0.7, Y, z - 0.7, x + 0.7, Y + 1.8, z + 0.7);
  }
  c.drum(91, 99); c.drum(96, 105);
  c.gpu('The benchmark yard', 97.5, 105.5, { y: Y });
  c.likeLine(88, 102.6, 95, 102.6, 4);

  // The hockey stick: slick all down one side of it.
  c.paint(58, 80, 6, 3, 'oil').paint(63, 82, 3, 5, 'oil');
  c.gpu('Top of the hockey stick', 60.5, 84.5);

  // Scrub, rocks and old spills over all the open ground.
  let seed = 4242;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const open = (x, z) => {
    const cell = c.cell(Math.floor(x), Math.floor(z));
    if (!cell || cell.surface !== 'dirt') return false;
    if (Math.abs(x - 48) < 2 || Math.abs(x - 104) < 2 || Math.abs(z - 64) < 2 || Math.abs(z - 118) < 2) return false;
    return !c.solids.some((s) => x > s.min[0] - 1 && x < s.max[0] + 1 && z > s.min[2] - 1 && z < s.max[2] + 1);
  };
  for (let i = 0; i < 420; i++) {
    const x = FIELD.x0 + 2 + rnd() * (FIELD.x1 - FIELD.x0 - 4), z = FIELD.z0 + 2 + rnd() * (FIELD.z1 - FIELD.z0 - 4);
    if (!open(x, z)) continue;
    const k = rnd();
    if (k < 0.6) c.place('shrub', x, z, { scale: 0.7 + rnd() * 0.8, angle: rnd() * 6 });
    else c.place('rock', x, z, { scale: 0.6 + rnd() * 1.1, angle: rnd() * 6 });
  }

  // Seeds along the roads.
  c.likeLine(48, 70, 48, 114, 12).likeLine(52, 118, 100, 118, 13).likeLine(104, 112, 104, 68, 12);
}

function pauseCompound(c) {
  c.flat(3, 60, 39, 64, 0, { surface: 'concrete' });
  c.flat(26, 56, 4, 6, 0, { surface: 'road' });
  c.prop('gate', 26, 60, { w: 4 });
  c.whetstone('Pause Compound Gate', 32.5, 63.5);

  /** A tank: the tiles inside its circle at its height, and a drum drawn round them. */
  /** A tank: solid as the cylinder it's drawn as, its roof something to stand on. */
  const tank = (cx, cz, r, h, colour = '#e8e4dc') => {
    c.cylinder(cx, cz, r, 0, h);
    c.prop('tank', cx, cz, { r, h, colour });
  };
  tank(12, 70, 4.5, 3);
  tank(12, 88, 5, 6, '#d8d0c0');
  tank(26, 104, 4, 4.5, '#c8d0d8');
  tank(10, 112, 5, 5);

  // Up the ramp, along the catwalk, onto the short tank.
  c.slope(20, 72, 2, 10, 3, 0, 'z', { surface: 'metal' });
  c.flat(16, 71, 22, 1, 3, { surface: 'metal' });
  c.flat(37, 69, 3, 3, 3, { surface: 'metal' });
  c.prop('catwalk', 16, 71, { w: 24, h: 3 });
  c.gpu('End of the Pause catwalk', 38.5, 70.5, { y: 3 });
  c.likeLine(21, 80, 21, 73, 4).likeLine(23, 71.5, 35, 71.5, 6);

  // The tall tank: up on the lift.
  c.lift(17, 87, 2, 2, 0, { to: [0, 6, 0], period: 8, pause: 0.24 });
  c.gpu('Top of the big tank of doom', 12.5, 88.5, { y: 6 });

  // Hot takes alley: the steam comes up out of the floor.
  c.block(32, 82, 1, 26, 1.4, { wall: '#8a9098', wtex: 'block', surface: 'metal' });
  c.block(37, 82, 1, 26, 1.4, { wall: '#8a9098', wtex: 'block', surface: 'metal' });
  // In rows, each row going up a little after the one before: a wave of fire down the alley, with a gap behind it to ride.
  for (let k = 0; k < 6; k++) {
    c.flare(33 + (k % 2 ? 0 : 2), 85 + k * 3.8, { period: 2.8, phase: -k * 0.35, burn: 0.3 });
    c.flare(34, 86.6 + k * 3.8, { period: 2.8, phase: -k * 0.35, burn: 0.3 });
  }
  c.gpu('End of hot takes alley', 35, 106.5);
  c.prop('stack', 22, 92, { h: 14 });
  c.solid(21.2, 0, 91.2, 22.8, 14, 92.8);

  // Yellow walkways painted round the yard, hatching by the hazards, clutter.
  for (const z of [65.5, 81.5]) c.mark(4, z, 26, 0.12, '#f2c230');
  c.mark(30.5, 62, 0.12, 60, '#f2c230').mark(24.5, 82, 0.12, 40, '#f2c230');
  for (let k = 0; k < 8; k++) c.mark(31.2, 82.5 + k * 3.1, 0.6, 0.18, '#f2c230');
  for (const [x, z, l] of [[25, 66, 4], [6, 81, 3], [29, 99, 5], [15, 100, 3]]) c.prop('valves', x, z, { length: l });
  for (const [x, z] of [[27, 75], [5, 104], [38, 112]]) {
    c.prop('cylinders', x, z);
    c.solid(x - 0.2, 0, z - 0.2, x + 0.55, 1.1, z + 0.55);
  }
  c.block(34, 112, 5, 4, 2.2, { wall: '#c8c2b4', wtex: 'corrugated' });
  c.block(4, 62, 4, 3, 2.0, { wall: '#d8d2c4', wtex: 'corrugated' });

  // Pipes on racks overhead, a sphere tank, drums.
  c.prop('piperack', 4, 79, { to: 30 });
  c.prop('piperack', 4, 98, { to: 30 });
  for (const z of [79, 98]) for (let x = 4.5; x < 30; x += 5) c.solid(x - 0.15, 0, z - 0.15, x + 0.15, 3.4, z + 0.15);
  c.prop('sphere', 30, 116, { r: 3.5 });
  // Solid: its legs, and the sphere itself above them (there's room to roll about underneath).
  for (let i = 0; i < 8; i++) c.cylinder(30 + Math.cos(i * Math.PI / 4) * 3.45, 116 + Math.sin(i * Math.PI / 4) * 3.45, 0.18, 0, 4.7);
  c.cylinder(30, 116, 3.5, 2.4, 8.2);
  c.drum(20, 64); c.drum(6, 98);
  c.likeLine(6, 78, 30, 78, 8).likeLine(28, 64, 28, 110, 10).likeLine(5, 100, 5, 120, 5);
}

/**
 * The traffic. Two rings round the whole town, one each way; two more
 * round the middle; a car or two in and out of the gas station; trucks
 * round the compute farm; and the superhighway, which never stops.
 */
function traffic(c) {
  c.road([[9, 9], [87, 9], [87, 53], [9, 53]], { cars: 6, speed: 4.2 });
  c.road([[7, 7], [7, 55], [89, 55], [89, 7]], { cars: 6, speed: 4.6 });
  c.road([[29, 9], [67, 9], [67, 29], [29, 29]], { cars: 3, speed: 3.6 });
  c.road([[27, 29], [27, 55], [69, 55], [69, 29]], { cars: 3, speed: 3.8 });
  c.road([[92, 55], [106.5, 55], [106.5, 41], [101, 41], [101, 53], [92, 53]], { cars: 2, speed: 2.4 });
  c.road([[48, 64], [48, 118], [104, 118], [104, 64]], { cars: 2, speed: 3.4, kind: 'truck' });
  // The superhighway: open at both ends, into the tunnels.
  c.road([[113, -3], [113, SIZE + 3]], { cars: 3, speed: 7.5, kind: 'truck', brakes: false, open: true });
  c.road([[115, -3], [115, SIZE + 3]], { cars: 3, speed: 9, kind: 'car', brakes: false, open: true });
  c.road([[118, SIZE + 3], [118, -3]], { cars: 3, speed: 9.5, kind: 'car', brakes: false, open: true });
  c.road([[120, SIZE + 3], [120, -3]], { cars: 3, speed: 7, kind: 'tanker', brakes: false, open: true });
}
