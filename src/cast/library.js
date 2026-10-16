import { CAST } from './index.js';
import { adopt } from './model.js';

/**
 * The cast, baked in the background as the page starts: a few workers share
 * out the work, and each mesh is handed over as it is done. Until then whoever
 * wants one waits (`ready`) or carries on with a stand-in. Under node (no
 * workers) nothing bakes and the stand-ins stay.
 */

const done = new Map();
const waiting = new Map();
const key = (name, detail) => `${name}@${detail}`;

/** Whether `name` at `detail` is ready to use. */
export const isBaked = (name, detail) => done.has(key(name, detail));

/** Resolves once `name` at `detail` is baked. */
export function ready(name, detail) {
  const k = key(name, detail);
  if (done.has(k)) return Promise.resolve();
  if (!waiting.has(k)) {
    let resolve;
    const p = new Promise((r) => { resolve = r; });
    waiting.set(k, { p, resolve });
  }
  return waiting.get(k).p;
}

/** Starts baking `names` at `detail`, first come first served across the workers. */
export function preload(names = Object.keys(CAST), detail = 0.5) {
  if (typeof Worker === 'undefined') return;
  const queue = names.filter((n) => CAST[n] && !done.has(key(n, detail)));
  const count = Math.max(1, Math.min(queue.length, (navigator.hardwareConcurrency || 4) - 1, 4));
  for (let i = 0; i < count; i++) {
    const worker = new Worker(new URL('./bake.worker.js', import.meta.url), { type: 'module' });
    const next = () => {
      const name = queue.shift();
      if (!name) { worker.terminate(); return; }
      worker.postMessage({ name, detail });
    };
    worker.onmessage = ({ data: { name, detail: d, data } }) => {
      adopt(CAST[name], d, data);
      const k = key(name, d);
      done.set(k, true);
      waiting.get(k)?.resolve();
      next();
    };
    worker.onerror = (e) => console.error('metrlol: a person would not bake', e);
    next();
  }
}
