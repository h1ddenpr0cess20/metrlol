import { CAST } from './cast/index.js';
import { isBaked, ready } from './cast/library.js';
import { createModel } from './cast/model.js';

/**
 * Who is in the way. The discourse is out on the streets of Metrlol, and it
 * has opinions: the Pause crowd and the doomers, the effective altruists and
 * the rationalists, the commune and the theorists, the Eurocrats on strike
 * and the accelerationists on a podcast, and the reply guys, who are
 * everywhere. Each is a caricature of an idea, not of anyone in particular:
 * the ball is equally rude to all of it.
 *
 * `model` is who they are sculpted as (`cast/`, baked in the background as
 * the page loads; the cast is Metroll's, mostly in new clothes). How each
 * takes being rolled over is the same as in Metroll (`smash.js`):
 *
 *   `toughness`  the speed (tiles a second) the ball has to hit them at to
 *                smash them in one go. Slower and they only get knocked about:
 *                they take that much of their `hp` and the ball takes some of
 *                their `power`.
 *   `power`      how much it hurts to bounce off them.
 *   `hype`       what smashing them is worth (the cred).
 *   `speed`      how fast they walk, when they come at the ball.
 *   `shout`      what they say when they notice it.
 *   `hp`         (a boss) how much it takes in all.
 */

export const FOES = Object.freeze({
  // The Pause crowd, and the doomers.
  pauser: { model: 'pauser', name: 'Pause Protester', blurb: 'WHEN IN DOUBT, PAUSE. Is in doubt. About everything. Has a sign about it.', toughness: 4, power: 3, hype: 50, radius: 0.37, speed: 2.8, shout: 'PAUSE! PAUSE!' },
  doomer: { model: 'mourner', name: 'Doomer', blurb: 'A funeral. It is always a funeral. Has been dressed for it since 2022.', toughness: 5, power: 5, hype: 70, radius: 0.41, speed: 2.2, shout: 'p(doom) = 97%!' },
  forecaster: { model: 'coroner', name: 'Forecaster', blurb: 'Pronounces civilisation dead. Often prematurely. The date keeps moving.', toughness: 6, power: 6, hype: 80, radius: 0.37, speed: 3.0, shout: 'TIME OF DEATH: 2027!' },
  rationalist: { model: 'cultist', name: 'Rationalist', blurb: 'Eleven people in a group house, one bathroom and a prior. Updates constantly. Never in your direction.', toughness: 5, power: 5, hype: 80, radius: 0.38, speed: 1.9, shout: 'ACTUALLY, THE PRIOR...' },
  purist: { model: 'purist', name: 'Alignment Purist', blurb: 'Will tell you which of your safety plans are not real alignment. All of them.', toughness: 6, power: 6, hype: 90, radius: 0.37, speed: 2.8, shout: 'THAT\'S NOT REAL ALIGNMENT!' },
  researcher: { model: 'engineer', name: 'Safety Researcher', blurb: 'Has found fourteen ways it could go wrong, and a fifteenth in the paper under review.', toughness: 5, power: 6, hype: 70, radius: 0.41, speed: 3.0, shout: 'IT\'S COMPLICATED!' },
  // The effective altruists.
  altruist: { model: 'hxckid', name: 'Effective Altruist', blurb: 'Donates ten percent. Does not shut up about the ten percent.', toughness: 4, power: 4, hype: 60, radius: 0.35, speed: 4.4, shout: 'EXPECTED VALUE!' },
  longtermist: { model: 'wizard', name: 'Longtermist', blurb: 'Cares deeply about eight trillion people who do not exist yet. Not about you, who does.', toughness: 5, power: 6, hype: 90, radius: 0.38, speed: 2.0, shout: 'TRILLIONS UNBORN!' },
  // The commune and the theory.
  anarchist: { model: 'punk', name: 'Anarchist', blurb: 'Against all hierarchy. Has made a spreadsheet of who is in charge of the no-one-in-charge.', toughness: 5, power: 6, hype: 70, radius: 0.37, speed: 4.0, shout: 'NO GODS, NO MASTERS!' },
  commune: { model: 'hippie', name: 'Commune Member', blurb: 'A meeting about the meeting. Consensus is expected by Thursday. Of next year.', toughness: 4, power: 3, hype: 50, radius: 0.36, speed: 2.6, shout: 'LET\'S BLOCK THAT!' },
  theorist: { model: 'poet', name: 'Theorist', blurb: 'About to read. At length. In a language that is, technically, English.', toughness: 4, power: 4, hype: 60, radius: 0.36, speed: 2.8, shout: 'SEIZE THE MEANS!' },
  scroller: { model: 'emo', name: 'Doomscroller', blurb: 'Fine. Totally fine. Has been scrolling since Tuesday. It is Friday.', toughness: 3, power: 3, hype: 50, radius: 0.35, speed: 2.2, shout: 'I\'M FINE.' },
  // Brussels.
  eurocrat: { model: 'eurocrat', name: 'Eurocrat', blurb: 'There is a form. There is always a form. The form is in a form.', toughness: 5, power: 5, hype: 70, radius: 0.37, speed: 3.0, shout: 'THERE\'S A FORM!' },
  striker: { model: 'foreman', name: 'Striker', blurb: 'Knows exactly how long they have been on strike. It is a long weekend.', toughness: 6, power: 6, hype: 90, radius: 0.4, speed: 2.8, shout: 'GRÈVE!' },
  commuter: { model: 'blader', name: 'Scooter Commuter', blurb: 'Has right of way. The bike lane is wherever you are standing.', toughness: 5, power: 5, hype: 70, radius: 0.4, speed: 5.0, shout: 'DING DING!' },
  raver: { model: 'raver', name: 'Berlin Raver', blurb: 'Dancing since Friday. It is Monday. Does not intend to be told.', toughness: 3, power: 3, hype: 50, radius: 0.35, speed: 4.2, shout: 'ES IST MONTAG?!' },
  doorman: { model: 'clubber', name: 'Berghain Doorman', blurb: 'Your name is not on the list. Nobody\'s is. The policy is no.', toughness: 9, power: 9, hype: 150, radius: 0.5, speed: 2.4, shout: 'NEIN.' },
  // The feed.
  replyguy: { model: 'critic', name: 'Reply Guy', blurb: 'Has not read it. Replies "actually" anyway. Has done so eleven thousand times.', toughness: 4, power: 4, hype: 60, radius: 0.35, speed: 3.6, shout: 'ACTUALLY—' },
  substacker: { model: 'zinekid', name: 'Substack Writer', blurb: 'Eleven thousand words on why you are wrong. Paywall after the first paragraph.', toughness: 4, power: 3, hype: 50, radius: 0.34, speed: 3.6, shout: 'SUBSCRIBE!' },
  farmer: { model: 'streetteam', name: 'Engagement Farmer', blurb: 'Free stickers. Free flyers. A free grift, if you listen to the whole sentence.', toughness: 4, power: 3, hype: 50, radius: 0.37, speed: 4.0, shout: 'SMASH THAT LIKE!' },
  thoughtleader: { model: 'poser', name: 'Thought Leader', blurb: 'Wears the T-shirt of a startup that does not exist yet. Knows one framework. It is a 2x2.', toughness: 4, power: 3, hype: 40, radius: 0.37, speed: 3.0, shout: 'LET\'S UNPACK THAT' },
  accelerationist: { model: 'nuguy', name: 'Accelerationist', blurb: 'Wants to break stuff. Would like to be asked what. Has a lot of conviction, mostly about you.', toughness: 6, power: 7, hype: 90, radius: 0.43, speed: 3.4, shout: 'WE\'RE SO BACK!' },
  podcaster: { model: 'dj', name: 'Podcaster', blurb: 'Has interviewed everyone in town. Three hours each. Will interview you.', toughness: 3, power: 3, hype: 50, radius: 0.37, speed: 3.0, shout: 'SO, WALK ME THROUGH IT' },
  vc: { model: 'promoter', name: 'Venture Capitalist', blurb: 'Will fund you. Will not read the deck. Has a podcast about it.', toughness: 5, power: 4, hype: 60, radius: 0.37, speed: 3.6, shout: 'IT\'S AN INFLECTION POINT' },
  gatekeeper: { model: 'gatekeeper', name: 'Discourse Gatekeeper', blurb: 'Has been on this site since 2009. Will explain why this is not real discourse.', toughness: 7, power: 7, hype: 110, radius: 0.43, speed: 2.4, shout: 'WHO LET YOU IN?' },
  // And the rest.
  troll: { model: 'troll', name: 'Internet Troll', blurb: 'Lives under the bridge. Wants a toll. Does not take cards. Has been replying since 2009.', toughness: 9, power: 9, hype: 150, radius: 0.62, speed: 1.9, shout: 'RATIO!' },
  drunk: { model: 'drunk', name: 'The Regular', blurb: 'Fourth pint. Will explain the alignment problem to you. Wrongly.', toughness: 5, power: 5, hype: 60, radius: 0.4, speed: 2.4, shout: 'LISTEN. LISTEN.' },
  prophet: { model: 'doomlord', name: 'The Prophet of Doom', blurb: 'Has predicted the end of the world every year since 2003. Has been, technically, early.', toughness: 9, power: 8, hype: 700, radius: 1.0, speed: 1.2, shout: 'THE END IS NIGH. AGAIN.', boss: true, hp: 45 },
});

/** How finely the foes on the board are meshed: half the grid of a close-up. */
export const BOARD_DETAIL = 0.5;

/** How long an attack plays through, and how long a beaten foe takes to go before it is gone. */
export const STRIKE = 0.9;
export const KNOCKED_OUT = 1.35;

/**
 * A foe to look at, standing on (0, 0, 0) and facing +z. `animate(t, moving,
 * how)` makes it live; `body` is the part that turns to face the way it goes.
 * `how`: `chasing` (it hurries), `striking` (the ball is in its reach: it
 * attacks, an attack at a time) and `down` (it is beaten).
 *
 * Each is sculpted and baked in the background as the page loads, and there
 * once its bake is in. Until then — and under node, where nothing bakes — a
 * plain stand-in goes in its place.
 */
export function createFoeMesh(GFX, kind) {
  const def = FOES[kind];
  const group = new GFX.Group();
  group.name = kind;
  const body = new GFX.Group();
  group.add(body);
  let model = null;
  const stand = standIn(GFX, def);
  body.add(stand);
  const attach = () => {
    model = createModel(GFX, CAST[def.model], { detail: BOARD_DETAIL });
    body.add(model.group);
    body.remove(stand);
  };
  if (isBaked(def.model, BOARD_DETAIL)) attach();
  else if (typeof window !== 'undefined') ready(def.model, BOARD_DETAIL).then(attach);
  const choose = clips();
  return {
    group,
    body,
    animate(t, moving, { chasing = false, ...how } = {}) {
      if (!model) return;
      model.pose({ ...choose(t, moving, how), time: t, speed: chasing ? 1 : 0.6 });
    },
  };
}

/** Which clip it plays, and how far in: down once beaten, an attack when the ball is in reach, else walking or idle. */
function clips() {
  let clip = 'idle', since = 0;
  return (t, moving, { striking = false, down = false } = {}) => {
    let next = down ? 'ko' : striking ? 'attack' : moving ? 'walk' : 'idle';
    // An attack plays through before it does anything else, and then another, if the ball is still there.
    if (clip === 'attack' && !down && t - since < STRIKE) next = 'attack';
    else if (clip === 'attack' && next === 'attack') since = t;
    if (next !== clip) { clip = next; since = t; }
    return { clip, t: t - since };
  };
}

/** A plain figure for a foe with no model (yet): a capsule and a head. */
function standIn(GFX, f) {
  const group = new GFX.Group();
  const material = new GFX.MeshStandardMaterial({ name: 'standin', color: new GFX.Color('#c8a070'), roughness: 0.7 });
  const h = f.radius * 2.4;
  const torso = new GFX.Mesh(new GFX.CylinderGeometry(f.radius * 0.8, f.radius * 0.9, h * 0.7, 12), material);
  torso.position.y = h * 0.35;
  const head = new GFX.Mesh(new GFX.SphereGeometry(f.radius * 0.7, 12, 8), material);
  head.position.y = h * 0.85;
  torso.castShadow = head.castShadow = true;
  group.add(torso, head);
  return group;
}
