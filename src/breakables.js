/**
 * What the ball can smash besides people: the furniture of the streets.
 * `at` is how fast it has to be going toward it, in tiles a second, to go
 * through it (slower, and it is as solid as a wall); `hype` is the cred it is
 * worth, a little, and without a combo. The bigger, the faster.
 *
 * Models are listed by name (see `models/`); signs on posts are `placard`.
 */
export const BREAKABLE = Object.freeze({
  cone: { at: 2.5, hype: 5 },
  tyres: { at: 3, hype: 8 },
  bin: { at: 4, hype: 10 },
  mailbox: { at: 4, hype: 10 },
  placard: { at: 5, hype: 20 },
  bench: { at: 5, hype: 15 },
  hydrant: { at: 6, hype: 20 },
  charger: { at: 8, hype: 30 },
  dumpster: { at: 8, hype: 30 },
  streetlamp: { at: 9, hype: 25 },
  tree: { at: 10, hype: 30 },
  pine: { at: 10, hype: 30 },
  junker: { at: 10, hype: 40 },
  sedan: { at: 11, hype: 40 },
  hatchback: { at: 11, hype: 40 },
  pickup: { at: 11, hype: 40 },
  // Somebody's idea of a warning, in bronze. Hit it hard.
  statue: { at: 14, hype: 300 },
});

/** The slowest anything breaks at, so the run needn't look at the rest when the ball is slower. */
export const SLOWEST = Math.min(...Object.values(BREAKABLE).map((b) => b.at));
