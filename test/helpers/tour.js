/**
 * The way round every golden GPU in the city, for the autopilot: where it
 * finds its own way (`to`), and where it follows set waypoints (`via`) —
 * up the quarter pipe, the slippery slope and the hockey stick flat out,
 * up the food co-op's ramp and the Euro shop's, over the footbridge and
 * off it onto the central reservation, across the superhighway in a gap in
 * the traffic, along the chilled water main, along the plank to the island
 * in the data lake, up and down the lifts, down hot takes alley one vent at
 * a time, in and out of the stamping hall one stamp at a time, along the
 * infinite scroll.
 */

import { flaresOut, laneClear, liftAtEnd, stampUp } from './autopilot.js';

const v = (x, z, o = {}) => [x, z, o];

/**
 * Down hot takes alley behind the wave: wait between two rows of vents
 * until the next row has gone quiet and will stay quiet long enough, then go.
 */
function hotTakesAlley() {
  const x = 62.5;
  const out = [v(x, 111.2, { speed: 2.5 })];
  const waits = [114, 118.2, 122, 125.8, 129.6, 133.4];
  waits.forEach((z, i) => {
    const next = waits[i + 1] ?? 137;
    out.push(v(x, z, { until: flaresOut(x, (z + next) / 2, 2.4, 1.3), stop: true, speed: 3, radius: 0.35 }));
  });
  out.push(v(63, 136.5, { speed: 3 }));
  return out;
}

/**
 * Into the stamping hall to the end and back out: before each stamp, wait
 * for it to be on its way up, then go under it.
 */
function stampingHall() {
  const z = 186.5, xs = [34, 38, 42, 46, 50];
  const out = [v(29.6, z, { speed: 2 })];
  xs.forEach((x, i) => out.push(v(x - 1.2, z, { until: stampUp(i), stop: true, speed: 3, radius: 0.3 })));
  out.push(v(53.5, z, { speed: 2.5, stop: true }));
  for (let i = xs.length - 1; i >= 0; i--) out.push(v(xs[i] + 2.2, z, { until: stampUp(i), stop: true, speed: 3, radius: 0.3 }));
  out.push(v(29.5, z, { speed: 3 }));
  return out;
}

/** Up lift `i` from `foot` to the top, and over to `top` (and back down, the other way). */
const liftUp = (i, foot, top) => [v(...foot, { until: liftAtEnd(i, 0), stop: true }), v(1, 1, { on: i, until: liftAtEnd(i, 1), stop: true, speed: 2 }), v(...top, { speed: 2.5 })];
const liftDown = (i, edge, foot) => [v(...edge, { until: liftAtEnd(i, 1), stop: true, speed: 2 }), v(1, 1, { on: i, until: liftAtEnd(i, 0), stop: true, speed: 2 }), v(...foot, { speed: 2 })];

export const TOUR = [
  // Portland Heights.
  { to: [20, 29.5], expect: 'The free stuff table' },
  { to: [20, 47], expect: 'Middle of the consensus maze' },
  { to: [23.5, 64.6] },
  { via: [v(23.5, 72.5, { speed: 3 }), v(21.6, 72.5, { speed: 2 }), v(16.5, 67.5, { speed: 2.5 })], expect: 'On the food co-op roof' },
  { via: [v(22.6, 72.5, { speed: 2 }), v(23.6, 72.4, { speed: 2 }), v(23.5, 65.5, { speed: 2.5 })] },
  { to: [44.6, 47], stop: true },
  { via: [v(51.9, 47, { speed: 12, radius: 0.9 })], expect: 'Up the quarter pipe (mural side)' },
  { to: [43.5, 23], expect: 'The community garden' },
  { to: [65.5, 19.5], expect: 'The tiny house village' },
  // The Alignment District.
  { to: [90, 21], expect: 'Behind the Substack tower' },
  { to: [117, 21], expect: 'The group house roof' },
  { to: [131.5, 20.5], stop: true },
  { via: [v(152.5, 20.5, { speed: 9, stop: true, radius: 0.6 })], expect: 'Top of the slippery slope' },
  { to: [116.4, 46], expect: 'In the wishing fountain' },
  { to: [81.6, 69.8], expect: 'Up the paused scaffold' },
  // The Ivory Tower.
  { to: [175, 61], expect: 'Bottom of the lecture hall' },
  { to: [205.5, 65], expect: 'On the trolley tracks' },
  { to: [211, 25], expect: 'Top of the Ivory Tower' },
  // Hype Valley, and over the footbridge to the central reservation.
  { to: [170, 134.5], expect: 'The garage where it all started' },
  { to: [208, 146], expect: 'The VC\'s infinity pool' },
  { to: [187, 106], expect: 'Peak of Inflated Expectations' },
  { to: [201, 106], expect: 'Trough of Disillusionment' },
  { to: [219, 112], expect: 'Plateau of Productivity' },
  { to: [219.5, 107] },
  { via: [v(225.5, 107, { speed: 3 }), v(237.6, 107.1, { speed: 2.5, stop: true }), v(237.6, 109.7, { speed: 1.3, reckless: true, stop: true })], expect: 'On the central reservation' },
  { via: [v(237.5, 110.6, { speed: 1, stop: true, reckless: true, until: laneClear([234, 236], 110.6, 16) }), v(230.8, 110.6, { speed: 6, reckless: true })] },
  // Back up on the plateau, and over the footbridge to the far side.
  { to: [219.5, 107] },
  { via: [v(225.5, 107, { speed: 3 }), v(242.6, 107, { speed: 3 }), v(244.6, 104), v(244.8, 94.5, { speed: 2.5 })], expect: 'Under the cookie banner' },
  { via: [v(245.6, 121.4, { speed: 3 }), v(246.3, 124.5, { speed: 2 })] },
  { to: [249.6, 249.6] },
  { via: [v(252.7, 252.7, { speed: 5 })], expect: 'The edge of the feed' },
  // Back across the superhighway at the crossover, into the compute farm.
  { to: [244.5, 201.5] },
  { via: [v(242.6, 201.5, { until: laneClear([239, 241], 201.5, 16), stop: true, reckless: true }), v(237.5, 201.5, { speed: 6, reckless: true, until: laneClear([234, 236], 201.5, 16), stop: true }), v(231, 201.5, { speed: 6, reckless: true })] },
  { to: [218.2, 182] },
  { via: liftUp(1, [218.2, 182], [210.5, 182.5]), expect: 'Top of the cooling tower' },
  { via: liftDown(1, [213.7, 182], [218.5, 182]) },
  { to: [198.8, 237], expect: 'The cable yard' },
  { to: [197.6, 217.5], stop: true },
  { via: [v(198.6, 217.5, { speed: 1.4 }), v(202.8, 217.5, { speed: 1.4, stop: true }), v(198.3, 217.5, { speed: 1.4, stop: true })], expect: 'The data lake island' },
  { to: [141, 225], stop: true },
  { via: [v(164.5, 225, { speed: 12, radius: 0.9 })], expect: 'Top of the hockey stick' },
  { to: [129.4, 204.5] },
  { via: [v(136, 204.5, { speed: 2.5 }), v(173.5, 204.5, { speed: 3.2 }), v(177.5, 203.5, { speed: 2 })], expect: 'End of the chilled water main' },
  // Brussels-sur-Mer.
  { to: [103, 175.5], expect: 'In the regulatory sandbox' },
  { to: [91.5, 171.6] },
  { via: [v(91.5, 179.5, { speed: 3 }), v(89.6, 179.5, { speed: 2 }), v(87.5, 174.5, { speed: 2.5 })], expect: 'On the Euro shop roof' },
  { via: [v(90.6, 179.5, { speed: 2 }), v(91.6, 179.4, { speed: 2 }), v(91.5, 172.5, { speed: 2.5 })] },
  { to: [92.5, 207], expect: 'The Grand-Place' },
  { to: [91, 246], expect: 'End of the pier' },
  { to: [45, 203.1], expect: 'Front of the queue' },
  { to: [28.5, 186.5] },
  { via: stampingHall(), expect: 'Through the stamping hall' },
  // The Pause Compound.
  { to: [26, 150], expect: 'Down in the bunker' },
  { to: [32.4, 124] },
  { via: liftUp(0, [32.4, 124], [24.5, 124.5]), expect: 'Top of the big tank of doom' },
  { via: liftDown(0, [28.3, 124], [32.5, 124]) },
  { to: [62.5, 110.4] },
  { via: hotTakesAlley(), expect: 'End of hot takes alley' },
  { to: [31, 108.6] },
  { via: [v(31, 99, { speed: 2.5 }), v(31.5, 97.5, { speed: 1.5 }), v(46.5, 97.5, { speed: 2.5 }), v(48.5, 96.5, { speed: 2 })], expect: 'End of the Pause catwalk' },
  { via: [v(46.5, 97.5, { speed: 2 }), v(31.5, 97.5, { speed: 2.5 }), v(31, 99, { speed: 1.5 }), v(31, 108, { speed: 2.5 })] },
  // The Timeline.
  { to: [91.5, 125], expect: 'In the echo chamber' },
  { to: [118.5, 125], expect: 'Ratio Square' },
  { to: [145, 125], expect: 'Bottom of the discourse pit' },
  { to: [153.5, 161.5], expect: 'The engagement farm' },
  { to: [82.4, 151] },
  { via: [v(95, 151, { speed: 3 }), v(126.8, 151, { speed: 3, stop: true })], expect: 'End of the infinite scroll' },
];
