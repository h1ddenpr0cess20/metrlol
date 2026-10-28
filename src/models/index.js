import { CIVIC } from 'madness-engine/scenery/civic';
import { DISCOURSE } from 'madness-engine/scenery/discourse';
import { STREET } from 'madness-engine/scenery/street.metrlol';
import { truckwheel, VEHICLES, wheel } from 'madness-engine/scenery/vehicles.metrlol';

/** How much coarser than sculpted a model is meshed, by name: the seeds, a couple of hundred of them and tiny on screen. */
const COARSE = { like: 1.8 };

/** How much coarser a vehicle's far version (`sedan-far`) is: what the traffic draws away from the ball. */
export const FAR = 2.2;

/**
 * Every sculpted model, by name; and each vehicle again, coarser, for far
 * off, and without its wheels (`sedan-body`), for the traffic near by,
 * whose wheels (`wheel`, `truckwheel`) go round.
 */
export const MODELS = Object.fromEntries([
  ...Object.entries({ ...VEHICLES, ...STREET, ...CIVIC, ...DISCOURSE, wheel, truckwheel }).map(([name, def]) => [name, { coarse: COARSE[name] ?? 1, ...def }]),
  ...Object.entries(VEHICLES).map(([name, def]) => [`${name}-far`, { ...def, name: `${def.name}-far`, coarse: FAR }]),
  ...Object.values(VEHICLES).map((def) => [def.body.name, def.body]),
]);
