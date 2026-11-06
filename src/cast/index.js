import alien from 'madness-engine/characters/alien';
import archaeologist from 'madness-engine/characters/archaeologist';
import beerguy from 'madness-engine/characters/beerguy';
import blader from 'madness-engine/characters/blader';
import bouncer from 'madness-engine/characters/bouncer';
import cabbie from 'madness-engine/characters/cabbie';
import corgi from 'madness-engine/characters/corgi';
import coroner from 'madness-engine/characters/coroner';
import cowboy from 'madness-engine/characters/cowboy';
import critic from 'madness-engine/characters/critic';
import cultist from 'madness-engine/characters/cultist';
import cyclist from 'madness-engine/characters/cyclist';
import crossingguard from 'madness-engine/characters/crossingguard';
import dj from 'madness-engine/characters/dj';
import doomlord from 'madness-engine/characters/doomlord';
import drunk from 'madness-engine/characters/drunk';
import emo from 'madness-engine/characters/emo';
import engineer from 'madness-engine/characters/engineer';
import eurocrat from 'madness-engine/characters/eurocrat';
import floridaman from 'madness-engine/characters/floridaman';
import folkie from 'madness-engine/characters/folkie';
import foreman from 'madness-engine/characters/foreman';
import gatekeeper from 'madness-engine/characters/gatekeeper';
import gent from 'madness-engine/characters/gent';
import goth from 'madness-engine/characters/goth';
import hippie from 'madness-engine/characters/hippie';
import hipster from 'madness-engine/characters/hipster';
import hotdog from 'madness-engine/characters/hotdog';
import hxckid from 'madness-engine/characters/hxckid';
import influencer from 'madness-engine/characters/influencer';
import knight from 'madness-engine/characters/knight';
import lifeguard from 'madness-engine/characters/lifeguard';
import mailcarrier from 'madness-engine/characters/mailcarrier';
import mascot from 'madness-engine/characters/mascot';
import medic from 'madness-engine/characters/medic';
import mime from 'madness-engine/characters/mime';
import mogul from 'madness-engine/characters/mogul';
import mourner from 'madness-engine/characters/mourner';
import neighbour from 'madness-engine/characters/neighbour';
import nonna from 'madness-engine/characters/nonna';
import officeguy from 'madness-engine/characters/officeguy';
import officewoman from 'madness-engine/characters/officewoman';
import nuguy from 'madness-engine/characters/nuguy';
import pallbearer from 'madness-engine/characters/pallbearer';
import paparazzo from 'madness-engine/characters/paparazzo';
import pauser from 'madness-engine/characters/pauser';
import phone from 'madness-engine/characters/phone';
import poet from 'madness-engine/characters/poet';
import poser from 'madness-engine/characters/poser';
import promoter from 'madness-engine/characters/promoter';
import punk from 'madness-engine/characters/punk';
import purist from 'madness-engine/characters/purist';
import rat from 'madness-engine/characters/rat';
import raver from 'madness-engine/characters/raver';
import roadie from 'madness-engine/characters/roadie';
import robot from 'madness-engine/characters/robot';
import runner from 'madness-engine/characters/runner';
import scenekid from 'madness-engine/characters/scenekid';
import security from 'madness-engine/characters/security';
import skater from 'madness-engine/characters/skater';
import soundguy from 'madness-engine/characters/soundguy';
import stoner from 'madness-engine/characters/stoner';
import streetteam from 'madness-engine/characters/streetteam';
import suit from 'madness-engine/characters/suit';
import surfer from 'madness-engine/characters/surfer';
import tourist from 'madness-engine/characters/tourist';
import troll from 'madness-engine/characters/troll';
import waiter from 'madness-engine/characters/waiter';
import welder from 'madness-engine/characters/welder';
import wizard from 'madness-engine/characters/wizard';
import yeti from 'madness-engine/characters/yeti';
import zinekid from 'madness-engine/characters/zinekid';
import zombie from 'madness-engine/characters/zombie';
import { CAT_DEFS } from 'madness-engine/characters/cat';
import { diverse } from 'madness-engine/characters/person';

/** The black cat: Catroller's, at the size of a cat on these boards. */
const blackcat = { ...CAT_DEFS['cat-black'], scale: 0.8 };

/** The default sculpt for each role. Non-human and highly specific sculpts remain unchanged. */
export const BASE_CAST = Object.freeze({
  alien, archaeologist, beerguy, blackcat, blader, bouncer, cabbie, corgi, coroner, cowboy,
  critic, cultist, cyclist, crossingguard, dj, doomlord, drunk, emo, engineer, eurocrat, floridaman, folkie, foreman,
  gatekeeper, gent, goth, hippie, hipster, hotdog, hxckid, influencer, knight, lifeguard, mailcarrier, mascot, medic,
  mime, mogul, mourner, neighbour, nonna, nuguy, officeguy, officewoman, pallbearer, paparazzo, pauser, phone, poet, poser,
  promoter, punk, purist, rat, raver, roadie, robot, runner, scenekid, security, skater, soundguy, stoner,
  streetteam, suit, surfer, tourist, troll, waiter, welder, wizard, yeti, zinekid, zombie,
});

const OUTFITS = Object.freeze([
  { top: '#287b83', bottom: '#34444f', accent: '#d8b56d' },
  { top: '#a94d46', bottom: '#303c50', accent: '#e2ba78' },
  { top: '#b8893f', bottom: '#394135', accent: '#e2d7c3' },
  { top: '#3d6595', bottom: '#333c52', accent: '#b7c3d0' },
  { top: '#785a87', bottom: '#453848', accent: '#c8a3b4' },
  { top: '#47735a', bottom: '#35443c', accent: '#d2c28e' },
  { top: '#bd6959', bottom: '#4b3940', accent: '#d9c7a8' },
  { top: '#586674', bottom: '#3d454d', accent: '#c6a15c' },
]);
const UPPER_CLOTHES = new Set(['torso', 'sleeve', 'cuff']);
const LOWER_CLOTHES = new Set(['legs', 'shin']);
const ACCENT_CLOTHES = new Set(['hand', 'boot', 'belt', 'buckle', 'sole', 'sandals']);

function hashSeed(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return hash >>> 0;
}

function clothingLook(definition, outfit) {
  const palette = definition.palette();
  const look = {};
  for (const slot of Object.keys(palette.look ?? {})) {
    if (UPPER_CLOTHES.has(slot)) look[slot] = outfit.top;
    else if (LOWER_CLOTHES.has(slot)) look[slot] = outfit.bottom;
    else if (ACCENT_CLOTHES.has(slot)) look[slot] = outfit.accent;
  }
  return look;
}

// Four stable looks per human: original plus three seeded skin/eye/hair and clothing combinations.
const VARIANT_DEFS = {};
const APPEARANCE_VARIANTS = {};
for (const [name, definition] of Object.entries(BASE_CAST)) {
  const variants = [name];
  if (typeof definition.variant === 'function' && typeof definition.palette === 'function') {
    const original = definition.palette();
    const used = {
      skin: new Set([original.skin]),
      eyes: new Set([original.eyes]),
      hair: new Set(original.hair === null ? [] : [original.hair]),
    };
    for (let index = 1; index < 4; index++) {
      const variantName = name + '__appearance_' + index;
      let colors;
      for (let attempt = 0; attempt < 128; attempt++) {
        colors = diverse(hashSeed(name + ':person:' + index) + attempt * 7919);
        if (!used.skin.has(colors.skin) && !used.eyes.has(colors.eyes) && (original.hair === null || !used.hair.has(colors.hair))) break;
      }
      used.skin.add(colors.skin);
      used.eyes.add(colors.eyes);
      if (original.hair !== null) used.hair.add(colors.hair);
      const outfit = OUTFITS[(hashSeed(name + ':outfit') + index - 1) % OUTFITS.length];
      VARIANT_DEFS[variantName] = definition.variant({
        ...colors,
        look: clothingLook(definition, outfit),
        name: (definition.name ?? name) + '-appearance-' + index,
      });
      variants.push(variantName);
    }
  }
  APPEARANCE_VARIANTS[name] = Object.freeze(variants);
}

export const CAST = Object.freeze({ ...BASE_CAST, ...VARIANT_DEFS });

export function appearanceVariantsFor(model) {
  return APPEARANCE_VARIANTS[model] ?? [model];
}

export function appearanceModelFor(model, seed = 0) {
  const variants = appearanceVariantsFor(model);
  const index = (Math.trunc(Number(seed) || 0) >>> 0) % variants.length;
  return variants[index];
}
