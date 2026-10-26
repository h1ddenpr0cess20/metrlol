import { createKit } from 'madness-engine/kit';
import { linearRGB } from 'madness-engine/color';
import { wallMaterial } from 'madness-engine/textures/town/textures.metrlol';

/**
 * The city's bigger things — tanks and cooling towers, the mast, the crane,
 * the charging canopy, the sandbox, scaffolding, the chilled water main,
 * the screens on the towers, the parasols on the beach, containers, tents,
 * market stalls, solar panels, the tunnels, the billboard, the fence round
 * it all — drawn from the map's props
 * (`map.props`). What's solid about them is on the map already.
 *
 * Surfaces that want a texture (a tank's welded plates, the chain-link,
 * the hedges, concrete) are built of panels a tile or so across, each with
 * the whole texture on it (the renderer doesn't repeat textures), lit by
 * the night's light baked in as the ground is. Steelwork, tubes and trim
 * come from a kit of plain shapes.
 */

const TAU = Math.PI * 2;

/** Textured panels, gathered by texture. */
function panels(light) {
  const layers = new Map();
  const layer = (tex) => {
    if (!layers.has(tex)) layers.set(tex, { position: [], normal: [], color: [], uv: [] });
    return layers.get(tex);
  };
  const quad = (tex, a, b, c, d, n, colour, uv = [[0, 1], [1, 1], [1, 0], [0, 0]]) => {
    const out = layer(tex);
    const base = linearRGB(colour);
    for (const [p, t] of [[a, uv[0]], [b, uv[1]], [c, uv[2]], [a, uv[0]], [c, uv[2]], [d, uv[3]]]) {
      out.position.push(...p);
      out.normal.push(...n);
      const l = light(p[0] + n[0] * 0.3, p[1], p[2] + n[2] * 0.3);
      out.color.push(base[0] * l[0], base[1] * l[1], base[2] * l[2]);
      out.uv.push(...t);
    }
  };
  return {
    layers,
    /** An upright cylinder's side, in panels about a tile wide and a tile high. */
    cylinder(tex, x, z, r, y0, y1, colour, { band = 1 } = {}) {
      const n = Math.max(8, Math.round((TAU * r) / 1.2));
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * TAU, a1 = ((i + 1) / n) * TAU;
        const p0 = [x + Math.cos(a0) * r, z + Math.sin(a0) * r], p1 = [x + Math.cos(a1) * r, z + Math.sin(a1) * r];
        const am = (a0 + a1) / 2, nn = [Math.cos(am), 0, Math.sin(am)];
        for (let y = y0; y < y1 - 1e-4; y += band) {
          const ya = y, yb = Math.min(y1, y + band), v = (yb - ya) / band;
          quad(tex, [p1[0], ya, p1[1]], [p0[0], ya, p0[1]], [p0[0], yb, p0[1]], [p1[0], yb, p1[1]], nn, colour, [[0, 1], [1, 1], [1, 1 - v], [0, 1 - v]]);
        }
      }
    },
    /** One upright face from (x0, z0) to (x1, z1), y0 to y1, facing `n`, in panels a tile across. */
    face(tex, x0, z0, x1, z1, y0, y1, n, colour, { band = 1 } = {}) {
      const L = Math.hypot(x1 - x0, z1 - z0), cols = Math.max(1, Math.round(L));
      for (let i = 0; i < cols; i++) {
        const t0 = i / cols, t1 = (i + 1) / cols;
        const a = [x0 + (x1 - x0) * t0, z0 + (z1 - z0) * t0], b = [x0 + (x1 - x0) * t1, z0 + (z1 - z0) * t1];
        for (let y = y0; y < y1 - 1e-4; y += band) {
          const ya = y, yb = Math.min(y1, y + band), v = (yb - ya) / band;
          quad(tex, [a[0], ya, a[1]], [b[0], ya, b[1]], [b[0], yb, b[1]], [a[0], yb, a[1]], n, colour, [[0, 1], [1, 1], [1, 1 - v], [0, 1 - v]]);
        }
      }
    },
    /** A box, every side in panels (the top too, if `top`). */
    box(tex, x0, y0, z0, x1, y1, z1, colour, { top = true, band = 1 } = {}) {
      this.face(tex, x0, z0, x1, z0, y0, y1, [0, 0, -1], colour, { band });
      this.face(tex, x1, z1, x0, z1, y0, y1, [0, 0, 1], colour, { band });
      this.face(tex, x0, z1, x0, z0, y0, y1, [-1, 0, 0], colour, { band });
      this.face(tex, x1, z0, x1, z1, y0, y1, [1, 0, 0], colour, { band });
      if (top) {
        for (let x = x0; x < x1 - 1e-4; x += 1) for (let z = z0; z < z1 - 1e-4; z += 1) {
          const xa = x, xb = Math.min(x1, x + 1), za = z, zb = Math.min(z1, z + 1);
          quad(tex, [xa, y1, za], [xa, y1, zb], [xb, y1, zb], [xb, y1, za], [0, 1, 0], colour);
        }
      }
    },
  };
}

/** A lattice mast from (x, z) up `h`, `w` square at the foot and `top` at the head, braced in X's every `step`. */
function lattice(k, x, y, z, w, top, h, step, colour, t = 0.035) {
  const at = (f, i) => {
    const s = (w + (top - w) * f) / 2;
    return [[x - s, z - s], [x + s, z - s], [x + s, z + s], [x - s, z + s]][i];
  };
  for (let i = 0; i < 4; i++) {
    const a = at(0, i), b = at(1, i);
    k.beam([a[0], y, a[1]], [b[0], y + h, b[1]], t * 1.6, colour, { finish: 'shiny' });
  }
  for (let e = 0; e < h - 1e-4; e += step) {
    const f0 = e / h, f1 = Math.min(1, (e + step) / h);
    for (let i = 0; i < 4; i++) {
      const a0 = at(f0, i), b0 = at(f0, (i + 1) % 4), a1 = at(f1, i), b1 = at(f1, (i + 1) % 4);
      k.beam([a0[0], y + e, a0[1]], [b0[0], y + e, b0[1]], t, colour);
      k.beam([a0[0], y + e, a0[1]], [b1[0], y + Math.min(h, e + step), b1[1]], t * 0.8, colour);
      k.beam([b0[0], y + e, b0[1]], [a1[0], y + Math.min(h, e + step), a1[1]], t * 0.8, colour);
    }
  }
}

const FONT = 'Anton, "Arial Black", Impact, system-ui, sans-serif';

/**
 * Words on a canvas the shape of the sign they go on (`w` by `h` tiles), as a
 * texture: the lines centred, and set as big as fits the part of it they go in
 * (`area`, top and bottom as fractions of its height), never so big a single
 * line takes more than `cap` of it. `accent` paints over the background first.
 * Null where there's no document (the tests). The canvas keeps the height the
 * letters came out, in tiles (`fit`), for checking they can be read.
 */
function words(GFX, lines, { w, h, bg = '#f4f1ea', fg = '#1c1b1a', accent = null, area = [0, 1], cap = 0.62 }) {
  if (typeof document === 'undefined') return null;
  const ppt = Math.min(256, 4096 / w);
  const W = Math.round(w * ppt), H = Math.max(32, Math.round(h * ppt));
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  if (accent) accent(ctx, W, H);
  const list = lines.split('\n');
  const top = H * area[0], tall = H * (area[1] - area[0]);
  const margin = Math.min(W, tall) * 0.1;
  let size = Math.min((tall - margin * 2) / (list.length * 1.08), tall * cap);
  ctx.font = `400 ${size}px ${FONT}`;
  const widest = Math.max(...list.map((l) => ctx.measureText(l).width));
  if (widest > W - margin * 2) size *= (W - margin * 2) / widest;
  ctx.font = `400 ${size}px ${FONT}`;
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  list.forEach((line, i) => ctx.fillText(line, W / 2, top + tall / 2 + (i - (list.length - 1) / 2) * size * 1.08));
  c.fit = size / ppt;
  c.text = lines;
  const t = new GFX.CanvasTexture(c);
  t.colorSpace = GFX.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** A sign: a plane with words on it, lit by itself (a neon or a lit box), facing `facing` round y from +z. */
function sign(GFX, texture, at, w, h, facing = 0, glow = 1) {
  const shade = Math.round(120 + 135 * glow).toString(16).padStart(2, '0');
  const m = new GFX.Mesh(new GFX.PlaneGeometry(w, h), new GFX.MeshBasicMaterial({ name: 'sign', map: texture, color: new GFX.Color(texture ? `#${shade}${shade}${shade}` : '#e8e2d6') }));
  m.position.set(...at);
  m.rotation.y = facing;
  return m;
}

const STEEL = '#6a7078', RED = '#c8382c', YELLOW = '#e8b020', WHITE = '#e8e4dc', CONCRETE = '#b0aa9e';

const DRAW = {
  fence(k, t, p, y, map) {
    // Chain-link panels round the top of the bank, galvanised posts every two tiles.
    const S = p.size, i = p.inset / 2;
    const at = (x, z) => Math.min(2.5, Math.max(0, (5 - Math.min(x, z, S - x, S - z)) * 0.5));
    for (const [x0, z0, x1, z1, n] of [[0, i, S, i, [0, 0, 1]], [S, S - i, 0, S - i, [0, 0, -1]], [i, S, i, 0, [1, 0, 0]], [S - i, 0, S - i, S, [-1, 0, 0]]]) {
      const L = Math.hypot(x1 - x0, z1 - z0);
      for (let s = 0; s < L; s += 1) {
        const ax = x0 + ((x1 - x0) * s) / L, az = z0 + ((z1 - z0) * s) / L, bx = x0 + ((x1 - x0) * (s + 1)) / L, bz = z0 + ((z1 - z0) * (s + 1)) / L;
        const ya = at(ax, az);
        t.face('chainlink', ax, az, bx, bz, ya + 0.05, ya + 1.3, n, '#9aa0a8', { band: 1.25 });
        if (s % 2 === 0) k.cyl([ax, ya + 0.7, az], 0.035, 1.4, '#8a9098', { segments: 8, finish: 'shiny' });
      }
      k.beam([x0, 2.5 + 1.32, z0], [x1, 2.5 + 1.32, z1], 0.025, '#8a9098', { finish: 'shiny' });
    }
    void y; void map;
  },

  wall(k, t, p) {
    if (p.tex) {
      const top = p.tex !== 'hedge';
      t.box(p.tex, p.x, p.y0, p.z, p.x1, p.y1, p.z1, p.colour, { top, band: Math.max(0.5, p.y1 - p.y0) });
      if (!top) {
        // A hedge: rounded along the top with leafy lumps.
        for (let x = p.x + 0.2; x < p.x1; x += 0.45) for (let z = p.z + 0.2; z < p.z1; z += 0.45) k.sphere([x, p.y1 - 0.05, z], 0.26, '#3e7a32', { scale: [1, 0.6, 1] });
      }
    } else k.slab(p.x, p.y0, p.z, p.x1, p.y1, p.z1, p.colour, { finish: p.finish });
  },

  chair(k, t, p, y) {
    k.box([p.x, y + 0.22, p.z], [0.5, 0.05, 1.2], '#f4f1ea', { rot: [0.1, 0, 0] });
    k.box([p.x, y + 0.42, p.z - 0.55], [0.5, 0.45, 0.05], '#f4f1ea', { rot: [-0.55, 0, 0] });
    for (let i = -4; i <= 4; i++) k.box([p.x, y + 0.255, p.z + i * 0.12], [0.46, 0.012, 0.06], '#3a8ac8', { rot: [0.1, 0, 0] });
    for (const sx of [-0.22, 0.22]) for (const sz of [-0.5, 0.5]) k.cyl([p.x + sx, y + 0.1, p.z + sz], 0.018, 0.2, '#c8ccd2', { finish: 'shiny' });
  },

  rail(k, t, p, y) {
    k.cyl([p.x + p.length / 2, y + 0.45, p.z], 0.04, p.length, '#c8ccd2', { rot: [0, 0, Math.PI / 2], finish: 'shiny', segments: 12 });
    for (const s of [0.3, p.length - 0.3]) {
      k.cyl([p.x + s, y + 0.22, p.z], 0.03, 0.45, '#8a8f9a', { finish: 'shiny' });
      k.cyl([p.x + s, y + 0.01, p.z], 0.12, 0.02, '#5a6068');
    }
  },

  /** A handrail from (x, y0, z) down to (x1, y1, z1), on posts. */
  handrail(k, t, p) {
    const a = [p.x, p.y0, p.z], b = [p.x1, p.y1, p.z1];
    k.beam(a, b, 0.035, '#c8ccd2', { finish: 'shiny', segments: 10 });
    for (const f of [0.05, 0.5, 0.95]) {
      const q = a.map((v, i) => v + (b[i] - v) * f);
      k.beam(q, [q[0], q[1] - 0.85, q[2]], 0.028, '#8a8f9a', { finish: 'shiny' });
    }
  },

  fountain(k, t, p, y) {
    // A stone basin in tiers, water in each, spilling over.
    k.cyl([p.x, y + 0.2, p.z], [0.32, 0.46], 0.4, '#c8c2b4', { segments: 24 });
    k.cyl([p.x, y + 0.45, p.z], [0.85, 0.6], 0.14, '#c8c2b4', { segments: 28 });
    k.cyl([p.x, y + 0.52, p.z], 0.78, 0.01, '#5aa8d0', { segments: 28, finish: 'glass' });
    k.cyl([p.x, y + 0.75, p.z], 0.1, 0.5, '#c8c2b4', { segments: 12 });
    k.cyl([p.x, y + 1.0, p.z], [0.42, 0.3], 0.1, '#c8c2b4', { segments: 20 });
    k.cyl([p.x, y + 1.05, p.z], 0.38, 0.01, '#5aa8d0', { segments: 20, finish: 'glass' });
    k.cyl([p.x, y + 1.4, p.z], [0.02, 0.06], 0.7, '#bfe6f5', { finish: 'glass', segments: 10 });
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      k.beam([p.x + Math.cos(a) * 0.4, y + 1.0, p.z + Math.sin(a) * 0.4], [p.x + Math.cos(a) * 0.62, y + 0.55, p.z + Math.sin(a) * 0.62], 0.012, '#d8f0fa', { finish: 'glass' });
    }
  },

  scaffold(k, t, p) {
    const { x, z, w, d, h } = p;
    for (let s = 0; s <= w; s += 2) for (const zz of [z, z + d]) k.cyl([x + s, h / 2 + 0.3, zz], 0.03, h + 0.6, '#9aa0a8', { segments: 8, finish: 'shiny' });
    for (let lv = 1; lv <= h + 0.5; lv += 1) for (const zz of [z, z + d]) k.cyl([x + w / 2, lv, zz], 0.025, w, '#9aa0a8', { rot: [0, 0, Math.PI / 2], segments: 8, finish: 'shiny' });
    for (let s = 0; s < w; s += 2) for (const zz of [z, z + d]) k.beam([x + s, 0.2, zz], [x + s + 2, h, zz], 0.02, '#9aa0a8');
    // Green safety netting down the far side, the boards' toe plates, a hoarding.
    t.face('chainlink', x + w, z + d + 0.02, x, z + d + 0.02, 0.2, h + 0.6, [0, 0, 1], '#3a7a4a', { band: 1.2 });
    k.slab(x, h + 0.6, z - 0.03, x + 4, h + 1.1, z + 0.03, YELLOW);
  },

  crane(k, t, p, y) {
    // A tower crane: a lattice mast, the slewing deck and cab, a long jib, the counter-jib and its weights, the hook.
    const H = 13;
    lattice(k, p.x, y, p.z, 1.2, 1.2, H, 1.2, YELLOW, 0.03);
    t.box('block', p.x - 1, y, p.z - 1, p.x + 1, y + 0.6, p.z + 1, CONCRETE);
    k.slab(p.x - 0.8, y + H, p.z - 0.8, p.x + 0.8, y + H + 0.3, p.z + 0.8, YELLOW, { finish: 'shiny' });
    k.box([p.x + 0.9, y + H + 0.7, p.z + 0.4], [0.9, 0.9, 0.9], '#e8e4dc', { finish: 'shiny' });
    k.box([p.x + 1.36, y + H + 0.8, p.z + 0.4], [0.02, 0.5, 0.75], '#2a3a4a', { finish: 'glass' });
    for (const [x0, x1] of [[-3.5, 0], [0, 10]]) {
      for (const dz of [-0.3, 0.3]) k.beam([p.x + x0, y + H + 0.35, p.z + dz], [p.x + x1, y + H + 0.35, p.z + dz], 0.035, YELLOW, { finish: 'shiny' });
      k.beam([p.x + x0, y + H + 1.0, p.z], [p.x + x1, y + H + 1.0, p.z], 0.035, YELLOW, { finish: 'shiny' });
      for (let s = x0; s < x1; s += 0.8) {
        k.beam([p.x + s, y + H + 0.35, p.z - 0.3], [p.x + s + 0.4, y + H + 1.0, p.z], 0.02, YELLOW);
        k.beam([p.x + s, y + H + 0.35, p.z + 0.3], [p.x + s + 0.4, y + H + 1.0, p.z], 0.02, YELLOW);
      }
    }
    k.beam([p.x, y + H + 2.4, p.z], [p.x + 10, y + H + 1.0, p.z], 0.015, '#2a2c30');
    k.beam([p.x, y + H + 2.4, p.z], [p.x - 3.5, y + H + 1.0, p.z], 0.015, '#2a2c30');
    lattice(k, p.x, y + H + 0.3, p.z, 0.8, 0.2, 2.1, 0.7, YELLOW, 0.025);
    k.box([p.x - 3.1, y + H - 0.1, p.z], [0.8, 1.0, 1.0], '#8a8680');
    k.beam([p.x + 7, y + H + 0.3, p.z], [p.x + 7, y + H - 4.5, p.z], 0.012, '#2a2c30');
    k.box([p.x + 7, y + H - 4.65, p.z], [0.3, 0.25, 0.2], RED, { finish: 'shiny' });
    k.sphere([p.x + 10, y + H + 1.1, p.z], 0.08, '#ff3020', { finish: 'glow' });
    k.sphere([p.x, y + H + 2.5, p.z], 0.08, '#ff3020', { finish: 'glow' });
  },

  canopy(k, t, p, y, map, roof) {
    const { x, z, w, d, h } = p;
    // The roof: a deep white fascia with a red band, lit panels underneath.
    roof.slab(x, h, z, x + w, h + 0.55, z + d, '#eceae4');
    seams(roof, x, z, x + w, z + d, h + 0.55, '#d8d6d0');
    for (const [a, b, c2, d2] of [[x - 0.02, z - 0.02, x + w + 0.02, z + 0.04], [x - 0.02, z + d - 0.04, x + w + 0.02, z + d + 0.02], [x - 0.02, z, x + 0.04, z + d], [x + w - 0.04, z, x + w + 0.02, z + d]]) {
      roof.slab(a, h + 0.14, b, c2, h + 0.4, d2, RED);
    }
    for (let i = 1; i < 5; i++) for (let j = 1; j < 5; j++) roof.slab(x + (w * i) / 5 - 0.5, h - 0.02, z + (d * j) / 5 - 0.3, x + (w * i) / 5 + 0.5, h, z + (d * j) / 5 + 0.3, '#fffbe8', { finish: 'glow' });
    roof.bounds = { x0: x, z0: z, x1: x + w, z1: z + d, y: h };
    for (const [cx, cz] of [[x + 0.25, z + 0.6], [x + w - 0.25, z + 0.6], [x + 0.25, z + d - 0.6], [x + w - 0.25, z + d - 0.6]]) {
      k.cyl([cx, h / 2, cz], 0.16, h, '#e8e4dc', { finish: 'shiny', segments: 16 });
      k.cyl([cx, 0.35, cz], 0.22, 0.7, RED, { segments: 16, finish: 'shiny' });
    }
    for (let i = 1; i < 5; i++) for (let j = 1; j < 5; j++) map.lamp(x + (w * i) / 5, z + (d * j) / 5, { colour: '#f4f6ff', reach: 3.4, height: h - 0.1, y: 0, glow: 0.45 });
  },

  billboard(k, t, p, y, map) {
    // Two steel legs, a catwalk, the board, the floodlights on it.
    for (const s of [-1.6, 1.6]) {
      k.cyl([p.x, y + 1.8, p.z + s], 0.14, 3.6, '#5a6068', { segments: 12, finish: 'shiny' });
      k.beam([p.x, y + 0.5, p.z + s], [p.x, y + 3.0, p.z - s * 0.4], 0.05, '#5a6068');
    }
    k.slab(p.x - 0.14, y + 3.0, p.z - 2.55, p.x + 0.06, y + 6.0, p.z + 2.55, '#2a2c30');
    k.slab(p.x - 0.6, y + 2.88, p.z - 2.45, p.x - 0.05, y + 2.94, p.z + 2.45, '#5a6068', { finish: 'shiny' });
    for (let s = -2.3; s <= 2.31; s += 0.4) k.cyl([p.x - 0.58, y + 3.2, p.z + s], 0.012, 0.5, '#5a6068');
    for (const s of [-1.5, 0, 1.5]) {
      k.beam([p.x - 0.4, y + 2.95, p.z + s], [p.x - 0.75, y + 3.15, p.z + s], 0.025, '#5a6068');
      k.box([p.x - 0.78, y + 3.18, p.z + s], [0.2, 0.1, 0.24], '#2a2c30');
      k.box([p.x - 0.73, y + 3.24, p.z + s], [0.04, 0.06, 0.2], '#fff4d8', { finish: 'glow' });
      map.lamp(p.x - 0.7, p.z + s, { colour: '#fff0d0', reach: 3.2, height: 3.3, y, glow: 0.8 });
    }
  },

  tunnel(k, t, p) {
    const { x, z, w, d, facing } = p;
    const face = facing > 0 ? z + d : z;
    const n = [0, 0, facing];
    t.box('block', x - 0.8, 0, face - 0.35, x, 3.8, face + 0.35, CONCRETE, { band: 1 });
    t.box('block', x + w, 0, face - 0.35, x + w + 0.8, 3.8, face + 0.35, CONCRETE, { band: 1 });
    t.box('block', x - 0.8, 2.9, face - 0.35, x + w + 0.8, 4.0, face + 0.35, CONCRETE, { band: 1.1 });
    k.slab(x, 0, z, x + w, 2.9, z + d, '#050506');
    k.slab(x - 1, 4.0, face - 0.45, x + w + 1, 4.2, face + 0.45, '#8b877e');
    for (let s = 1; s < w; s += 2.2) k.box([x + s, 2.75, face + n[2] * 0.36], [0.5, 0.08, 0.12], '#ffd88a', { finish: 'glow' });
  },

  trailer(k, t, p) {
    const { x, z, w, d, y } = p;
    t.box('corrugated', x, y + 0.3, z, x + w, y + 1.6, z + d, '#e8e4dc', { band: 1.3 });
    k.slab(x - 0.02, y + 0.95, z - 0.02, x + w + 0.02, y + 1.05, z + d + 0.02, '#2c6ec8');
    k.slab(x + 0.8, y + 0.4, z + d + 0.01, x + 1.4, y + 1.4, z + d + 0.04, '#8a8f9a', { finish: 'shiny' });
    k.slab(x + 2.4, y + 0.85, z + d + 0.01, x + 3.4, y + 1.3, z + d + 0.04, '#ffe6a8', { finish: 'glow' });
    for (const s of [0.3, w - 0.3]) for (const zz of [z + 0.2, z + d - 0.2]) k.box([x + s, y + 0.15, zz], [0.3, 0.3, 0.3], '#7a7f86');
    k.slab(x + 0.6, y, z + d, x + 1.6, y + 0.3, z + d + 0.6, '#8a6a42');
    k.box([x + 1.1, y + 1.5, z + d + 0.05], [0.18, 0.1, 0.06], '#ffe8b0', { finish: 'glow' });
  },

  pipeline(k, t, p) {
    const { x, z, to, h } = p;
    // A fat pipe under the walkway, flanged every few tiles, on legs, with a handrail along one side.
    const x0 = x + 6;
    k.cyl([(x0 + to) / 2, h - 0.4, z + 0.5], 0.36, to - x0, '#8a9098', { rot: [0, 0, Math.PI / 2], finish: 'shiny', segments: 20 });
    for (let s = x0 + 1; s < to; s += 3) {
      k.torus([s, h - 0.4, z + 0.5], 0.38, 0.05, '#5a6068', { rot: [0, Math.PI / 2, 0], finish: 'shiny' });
      k.beam([s, 0, z + 0.15], [s, h - 0.6, z + 0.35], 0.05, '#4a4e56');
      k.beam([s, 0, z + 0.85], [s, h - 0.6, z + 0.65], 0.05, '#4a4e56');
    }
  },

  mast(k, t, p) {
    const { x, z, w, d, y, top } = p;
    const H = top - y + 7;
    // Red and white, tapering, braced; the aerials at the top, a red light; rails round the deck; the lift's guide rails.
    lattice(k, x + w / 2, y, z + d / 2, w, 1.2, H, 1.5, RED, 0.045);
    lattice(k, x + w / 2, y + 0.75, z + d / 2, w * 0.98, 1.22, H - 0.75, 1.5, WHITE, 0.02);
    k.slab(x + w / 2 - 0.75, y + H, z + d / 2 - 0.75, x + w / 2 + 0.75, y + H + 0.4, z + d / 2 + 0.75, '#3a3d44');
    k.sphere([x + w / 2, y + H + 0.6, z + d / 2], 0.16, '#ff3020', { finish: 'glow' });
    for (const [a, b] of [[[x, z], [x + w, z]], [[x + w, z], [x + w, z + d]], [[x, z + d], [x + w, z + d]]]) {
      for (const hh of [0.25, 0.5]) k.beam([a[0], top + hh, a[1]], [b[0], top + hh, b[1]], 0.025, YELLOW, { finish: 'shiny' });
      for (let s = 0; s <= 1; s += 0.25) k.cyl([a[0] + (b[0] - a[0]) * s, top + 0.25, a[1] + (b[1] - a[1]) * s], 0.02, 0.5, YELLOW);
    }
    for (const s of [0, 2]) k.cyl([x - 2 + s, (y + top) / 2 + 0.3, z + 0.9], 0.05, top - y + 1, '#5a6068', { segments: 8, finish: 'shiny' });
    k.slab(x - 2.2, top + 0.6, z + 0.7, x + 0.2, top + 0.7, z + 3.3, '#5a6068');
  },

  gate(k, t, p, y) {
    for (const s of [-0.3, p.w + 0.3]) {
      k.box([p.x + s, y + 0.7, p.z], [0.3, 1.4, 0.3], '#e8e2d6');
      k.box([p.x + s, y + 1.42, p.z], [0.36, 0.06, 0.36], RED);
    }
    k.box([p.x - 1.2, y + 0.9, p.z + 0.2], [1.1, 1.8, 1.2], '#e8e4dc', { finish: 'shiny' });
    k.box([p.x - 0.64, y + 1.2, p.z + 0.2], [0.02, 0.6, 0.9], '#ffe6b0', { finish: 'glow' });
    k.box([p.x - 1.2, y + 1.85, p.z + 0.2], [1.3, 0.1, 1.4], RED);
    // The barrier arm, up.
    k.box([p.x - 0.1, y + 2.0, p.z], [0.1, 2.2, 0.1], '#f4f1ea', { rot: [0, 0, -0.2] });
    for (let i = 0; i < 4; i++) k.box([p.x - 0.1 + Math.sin(0.2) * (i * 0.5 - 0.6), y + 1.4 + i * 0.5, p.z], [0.11, 0.2, 0.11], RED, { rot: [0, 0, -0.2] });
  },

  tank(k, t, p, y, map) {
    const { x, z, r, h, colour } = p;
    // Welded plates all round (or concrete, a cooling tower), a shallow domed roof, a handrail round its rim, a ladder cage up the side, a band of colour.
    t.cylinder(p.tex ?? 'tankshell', x, z, r, 0, h, colour, { band: 1 });
    const seg = 40;
    for (let i = 0; i < 6; i++) k.cyl([x, h + 0.02 + i * 0.03, z], r * (1 - i * 0.12), 0.04, '#b8bec6', { segments: seg });
    k.torus([x, h, z], r, 0.06, '#9aa0a8', { rot: [Math.PI / 2, 0, 0] });
    for (let i = 0; i < Math.round(r * 6); i++) {
      const a = (i / Math.round(r * 6)) * TAU;
      k.cyl([x + Math.cos(a) * r * 0.97, h + 0.3, z + Math.sin(a) * r * 0.97], 0.02, 0.6, YELLOW, { segments: 4 });
    }
    k.torus([x, h + 0.6, z], r * 0.97, 0.025, YELLOW, { rot: [Math.PI / 2, 0, 0] });
    k.cyl([x, h * 0.62, z], r * 1.006, 0.5, RED, { segments: seg, open: true });
    const lx = x - r - 0.12;
    for (const s of [-0.24, 0.24]) k.cyl([lx, h / 2, z + s], 0.025, h, '#5a6068', { segments: 6 });
    for (let yy = 0.3; yy < h; yy += 0.32) k.cyl([lx, yy, z], 0.014, 0.48, '#5a6068', { rot: [Math.PI / 2, 0, 0], segments: 4 });
    for (let yy = 2; yy < h; yy += 0.6) k.torus([lx - 0.2, yy, z], 0.32, 0.015, '#5a6068', { rot: [Math.PI / 2, 0, 0] });
    map.lamp(x - r - 0.3, z, { colour: '#ffcf8a', reach: 4.5, height: Math.min(h, 3.2), y: 0, glow: 0.7 });
    void y;
  },

  catwalk(k, t, p) {
    const { x, z, w, h } = p;
    for (let s = x + 0.5; s < x + w; s += 3) {
      k.beam([s, 0, z + 0.1], [s, h - 0.05, z + 0.5], 0.05, STEEL);
      k.beam([s, 0, z + 0.9], [s, h - 0.05, z + 0.5], 0.05, STEEL);
    }
    for (const side of [0.05, 0.95]) {
      k.cyl([x + w / 2, h + 0.55, z + side], 0.025, w, YELLOW, { rot: [0, 0, Math.PI / 2], finish: 'shiny' });
      k.cyl([x + w / 2, h + 0.28, z + side], 0.018, w, YELLOW, { rot: [0, 0, Math.PI / 2] });
      for (let s = x; s <= x + w; s += 1.5) k.cyl([s, h + 0.28, z + side], 0.02, 0.56, YELLOW);
    }
  },

  sign(k, t, p, y) {
    k.cyl([p.x, y + 0.6, p.z + 0.5], 0.04, 1.2, '#5a6068', { segments: 8 });
    k.slab(p.x - 0.03, y + 0.84, p.z + 0.08, p.x + 0.03, y + 1.46, p.z + 0.92, '#3a3d44');
  },

  /** A column: plain, round, a cap on top. */
  column(k, t, p, y) {
    k.cyl([p.x, y + p.h / 2, p.z], p.r, p.h, p.colour ?? '#e8e4dc', { segments: 12, finish: 'shiny' });
    k.cyl([p.x, y + p.h + 0.05, p.z], p.r + 0.05, 0.1, p.colour ?? '#e8e4dc', { segments: 12 });
  },

  /** A beach parasol: a pole, a striped canopy, a deckchair's worth of shade. */
  parasol(k, t, p, y) {
    const c = p.colour ?? '#1a3aa0';
    k.cyl([p.x, y + 1.1, p.z], 0.035, 2.2, '#e8e4dc', { segments: 8 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      k.beam([p.x, y + 2.25, p.z], [p.x + Math.cos(a) * 1.1, y + 1.85, p.z + Math.sin(a) * 1.1], 0.012, '#e8e4dc');
    }
    k.cone([p.x, y + 2.3, p.z], 1.15, 0.5, c, { segments: 16 });
    k.cone([p.x, y + 2.31, p.z], 0.6, 0.26, '#f4f1ea', { segments: 16 });
  },

  /** A screen on a wall: a dark frame, its picture lit (see WORDS), facing `facing` quarter turns (0 toward +z). */
  screen(k, t, p, y, map) {
    const f = ((p.facing ?? 0) % 4 + 4) % 4, turn = f * Math.PI / 2;
    const n = [Math.sin(turn), Math.cos(turn)], along = [n[1], -n[0]];
    const hw = p.w / 2 + 0.08, at = y + p.h / 2;
    const a = [p.x - along[0] * hw, p.z - along[1] * hw], b = [p.x + along[0] * hw, p.z + along[1] * hw];
    k.slab(Math.min(a[0], b[0]) - Math.abs(n[0]) * 0.06, at - p.h / 2 - 0.08, Math.min(a[1], b[1]) - Math.abs(n[1]) * 0.06,
      Math.max(a[0], b[0]) + Math.abs(n[0]) * 0.06, at + p.h / 2 + 0.08, Math.max(a[1], b[1]) + Math.abs(n[1]) * 0.06, '#16161a');
    // Its glow on the street in front of it.
    map.lamp(p.x + n[0] * 1.5, p.z + n[1] * 1.5, { colour: p.glow ?? '#b8c8ff', reach: Math.min(8, 3 + p.w), height: 1.8, glow: 0.55 });
  },

  /** A shipping container from (x, z) to (x1, z1), corrugated, its doors at the `door` end ('x' or 'z' side), lying on the ground. */
  container(k, t, p, y) {
    const h = p.h ?? 2.6, c = p.colour ?? '#2a6ac8';
    t.box('corrugated', p.x, y, p.z, p.x1, y + h, p.z1, c, { band: h / 2 });
    const along = p.x1 - p.x > p.z1 - p.z;
    // The doors' bars and the corner castings.
    for (let i = 1; i <= 4; i++) {
      if (along) k.box([p.x1 + 0.02, y + h / 2, p.z + ((p.z1 - p.z) * i) / 5], [0.04, h * 0.9, 0.05], '#5a6068', { finish: 'shiny' });
      else k.box([p.x + ((p.x1 - p.x) * i) / 5, y + h / 2, p.z1 + 0.02], [0.05, h * 0.9, 0.04], '#5a6068', { finish: 'shiny' });
    }
    for (const cx of [p.x + 0.1, p.x1 - 0.1]) for (const cz of [p.z + 0.1, p.z1 - 0.1]) for (const cy of [y + 0.1, y + h - 0.1]) k.box([cx, cy, cz], [0.22, 0.2, 0.22], '#3a3d44');
  },

  /** A tent: a dome, or (`peak`) a bell tent on its pole, its guy ropes out to pegs. */
  tent(k, t, p, y) {
    const r = p.r ?? 1.1, c = p.colour ?? '#e07a2a';
    if (p.peak) {
      k.cone([p.x, y + 1.0, p.z], r, 2.0, c, { segments: 10 });
      k.cyl([p.x, y + 1.15, p.z], 0.03, 2.3, '#8a6a42', { segments: 6 });
    } else {
      k.sphere([p.x, y, p.z], r, c, { scale: [1, 0.72, 1], segments: 14 });
      k.box([p.x, y + 0.35, p.z + r * 0.92], [0.5, 0.6, 0.05], '#1c1c20');
    }
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i * Math.PI) / 2;
      k.beam([p.x + Math.cos(a) * r * 0.7, y + (p.peak ? 1.0 : 0.5), p.z + Math.sin(a) * r * 0.7], [p.x + Math.cos(a) * (r + 0.5), y, p.z + Math.sin(a) * (r + 0.5)], 0.008, '#e8e4dc');
    }
  },

  /** A market stall: a counter, four posts, a striped awning over it (see WORDS for its sign). Faces +z. */
  stall(k, t, p, y) {
    const w = p.w ?? 2.4, d = p.d ?? 1.2, c = p.colour ?? '#c8382c';
    k.box([p.x, y + 0.45, p.z], [w, 0.9, d * 0.6], '#8a6a42');
    k.box([p.x, y + 0.92, p.z], [w + 0.1, 0.05, d * 0.66], '#e8e4dc');
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) k.cyl([p.x + sx * (w / 2 - 0.05), y + 1.05, p.z + sz * (d / 2 - 0.05)], 0.025, 2.1, '#5a6068', { segments: 6 });
    const n = 8;
    for (let i = 0; i < n; i++) k.box([p.x - w / 2 + (w * (i + 0.5)) / n, y + 2.05, p.z + 0.05], [w / n + 0.01, 0.04, d + 0.3], i % 2 ? '#f4f1ea' : c, { rot: [0.22, 0, 0] });
  },

  /** A row of solar panels from x along `length`, tilted to the south, on their frames. */
  solar(k, t, p, y) {
    for (let s = 0; s < p.length - 0.5; s += 1.05) {
      k.box([p.x + s + 0.5, y + 0.95, p.z], [1.0, 0.05, 1.6], '#1a2a4a', { rot: [0.45, 0, 0], finish: 'glass' });
      k.box([p.x + s + 0.5, y + 0.92, p.z], [1.02, 0.03, 1.64], '#c8ccd2', { rot: [0.45, 0, 0], finish: 'shiny' });
      for (const dz of [-0.5, 0.5]) k.cyl([p.x + s + 0.5, y + (0.95 - dz * 0.7) / 2, p.z + dz * 0.9], 0.03, 0.95 - dz * 0.7, '#8a9098', { segments: 6 });
    }
  },

  /** The regulatory sandbox's toys: buckets, a spade, a castle, a little flag. */
  sandbox(k, t, p, y) {
    const { x, z, w, d } = p;
    k.cyl([x + 1.2, y + 0.18, z + 1.2], [0.14, 0.18], 0.36, '#c8382c', { segments: 12 });
    k.cyl([x + w - 1.4, y + 0.18, z + d - 1.1], [0.14, 0.18], 0.36, '#f2c230', { segments: 12 });
    k.box([x + w - 1.0, y + 0.3, z + 1.0], [0.08, 0.6, 0.03], '#2a5aa8', { rot: [0, 0, 0.5] });
    k.box([x + w / 2 + 1.4, y + 0.25, z + d / 2], [0.7, 0.5, 0.7], '#d8bc84');
    for (const [dx, dz] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) k.cyl([x + w / 2 + 1.4 + dx, y + 0.65, z + d / 2 + dz], 0.12, 0.3, '#d8bc84', { segments: 10 });
    k.cyl([x + w / 2 + 1.4, y + 1.0, z + d / 2], 0.012, 0.5, '#5a6068', { segments: 4 });
    k.box([x + w / 2 + 1.52, y + 1.17, z + d / 2], [0.22, 0.14, 0.01], '#1a3aa0');
  },

  /** A freestanding sign on two posts with words on both faces, `w` by `h` tiles, facing `facing` quarter turns (0 is toward +z, 1 toward +x). */
  placard(k, t, p, y, map) {
    const w = p.w ?? 1.8, h = p.h ?? 1.1, f = ((p.facing ?? 0) % 4 + 4) % 4;
    const along = f % 2 === 0 ? [1, 0] : [0, 1];
    const top = y + 0.5 + h;
    // Each post down to the ground under it, the board level.
    for (const s of [-1, 1]) {
      const px = p.x + along[0] * s * (w / 2 - 0.1), pz = p.z + along[1] * s * (w / 2 - 0.1);
      const foot = Math.min(y, map.heightAt(px, pz) ?? y);
      k.cyl([px, (foot + top) / 2, pz], 0.04, top - foot, '#4a3a2a', { segments: 8 });
    }
    const ex = along[0] ? w / 2 : 0.05, ez = along[1] ? w / 2 : 0.05;
    k.slab(p.x - ex, y + 0.5, p.z - ez, p.x + ex, top, p.z + ez, '#3a3d44');
  },

  shop() {},
};

/** Words for the structures that carry them. */
const WORDS = {
  billboard(GFX, p, y) {
    const tex = words(GFX, p.text ?? 'METRLOL\nRoll on in', {
      w: 4.95, h: 2.95, bg: '#f4c430', fg: '#1c1b1a', area: [0, 0.8],
      accent(ctx, w, h) {
        ctx.fillStyle = '#c8382c';
        ctx.fillRect(0, h * 0.8, w, h * 0.2);
        const tag = p.tag ?? 'NEXT LEFT';
        let size = h * 0.12;
        ctx.font = `400 ${size}px ${FONT}`;
        size *= Math.min(1, (w * 0.92) / ctx.measureText(tag).width);
        ctx.font = `400 ${size}px ${FONT}`;
        ctx.fillStyle = '#f4f1ea';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tag, w / 2, h * 0.9);
      },
    });
    // Both faces: the board can be seen coming and going.
    return [sign(GFX, tex, [p.x - 0.15, y + 4.5, p.z], 4.95, 2.95, -Math.PI / 2, 0.75), sign(GFX, tex, [p.x + 0.07, y + 4.5, p.z], 4.95, 2.95, Math.PI / 2, 0.75)];
  },
  shop(GFX, p) {
    const tex = words(GFX, p.text ?? 'EURO SHOP · CLOSED (LUNCH)', { w: p.w * 0.94, h: 0.42, bg: p.bg ?? '#1a3aa0', fg: p.fg ?? '#f4d020', cap: 0.7 });
    // Over the front, and again round the back.
    return [sign(GFX, tex, [p.x + p.w / 2, p.h - 0.3, p.z - 0.04], p.w * 0.94, 0.42, Math.PI, 1), sign(GFX, tex, [p.x + p.w / 2, p.h - 0.3, p.z + p.d + 0.04], p.w * 0.94, 0.42, 0, 1)];
  },
  sign(GFX, p, y) {
    const tex = words(GFX, p.text, { w: 0.8, h: 0.6, bg: '#f2c230', fg: '#1c1b1a' });
    return [sign(GFX, tex, [p.x - 0.05, y + 1.15, p.z + 0.5], 0.8, 0.6, -Math.PI / 2, 0.5), sign(GFX, tex, [p.x + 0.05, y + 1.15, p.z + 0.5], 0.8, 0.6, Math.PI / 2, 0.5)];
  },
  placard(GFX, p, y) {
    const w = p.w ?? 1.8, h = p.h ?? 1.1, f = ((p.facing ?? 0) % 4 + 4) % 4;
    const tex = words(GFX, p.text, { w, h, bg: p.bg ?? '#f4f0e6', fg: p.fg ?? '#1c1b1a' });
    const turn = f * Math.PI / 2, n = [Math.sin(turn), Math.cos(turn)];
    const at = y + 0.5 + h / 2;
    return [
      sign(GFX, tex, [p.x + n[0] * 0.07, at, p.z + n[1] * 0.07], w, h, turn, 0.8),
      sign(GFX, tex, [p.x - n[0] * 0.07, at, p.z - n[1] * 0.07], w, h, turn + Math.PI, 0.8),
    ];
  },
  canopy(GFX, p) {
    const tex = words(GFX, p.text ?? 'CHARGING  ·  €0.79/kWh  ·  +21% VAT  ·  PLEASE ACCEPT ALL COOKIES', { w: p.w * 0.96, h: 0.26, bg: '#1a3aa0', fg: '#f4d020', cap: 0.75 });
    return [sign(GFX, tex, [p.x + p.w / 2, p.h + 0.27, p.z + p.d + 0.04], p.w * 0.96, 0.26, 0, 1)];
  },
  stall(GFX, p, y) {
    if (!p.text) return [];
    const tex = words(GFX, p.text, { w: (p.w ?? 2.4) * 0.8, h: 0.4, bg: p.colour ?? '#c8382c', fg: '#fff6ee', cap: 0.7 });
    return [sign(GFX, tex, [p.x, y + 1.55, p.z + (p.d ?? 1.2) / 2 + 0.12], (p.w ?? 2.4) * 0.8, 0.4, 0, 0.85)];
  },
  sandbox(GFX, p, y) {
    const tex = words(GFX, 'REGULATORY SANDBOX', { w: 3.2, h: 0.24, bg: '#1a3aa0', fg: '#f4d020', cap: 0.75 });
    // Over both ends of the shed.
    return [sign(GFX, tex, [p.x - 0.29, y + 2.2, p.z + p.d / 2], 3.2, 0.24, -Math.PI / 2, 1), sign(GFX, tex, [p.x + p.w + 0.29, y + 2.2, p.z + p.d / 2], 3.2, 0.24, Math.PI / 2, 1)];
  },
  tank(GFX, p) {
    if (!p.label) return [];
    const tex = words(GFX, p.label, { w: 3.6, h: 0.75, bg: p.colour ?? '#e8e4dc', fg: '#c8382c', cap: 0.8 });
    return [sign(GFX, tex, [p.x + p.r * 0.71 + 0.03, p.h * 0.4, p.z + p.r * 0.71 + 0.03], 3.6, 0.75, Math.PI / 4, 0.5)];
  },
  screen(GFX, p, y) {
    const f = ((p.facing ?? 0) % 4 + 4) % 4, turn = f * Math.PI / 2;
    const tex = words(GFX, p.text, { w: p.w, h: p.h, bg: p.bg ?? '#1a1a2a', fg: p.fg ?? '#f4f1ea' });
    return [sign(GFX, tex, [p.x + Math.sin(turn) * 0.07, y + p.h / 2, p.z + Math.cos(turn) * 0.07], p.w, p.h, turn, 1)];
  },
};

/**
 * The structures, drawn (`placards` is each sign on posts, by its prop, a group to hide when it is smashed): one kit for the steelwork, the textured panels by
 * texture, the signs, and the roofs (each its own, to fade while the
 * ball is under it). Lights some of them carry go onto the map.
 */
export function drawStructures(GFX, map, light) {
  // The steelwork in a kit for each 24-tile square of the map, so what's out of view isn't drawn.
  const kits = new Map();
  const kitAt = (x, z) => {
    const key = `${Math.floor(x / 24)},${Math.floor(z / 24)}`;
    if (!kits.has(key)) kits.set(key, createKit(GFX));
    return kits.get(key);
  };
  const t = panels(light);
  const extras = [], roofs = [];
  const placards = new Map();
  // The lights are on the map already (`structureLights`): drawing doesn't add them again.
  const quiet = Object.create(map);
  quiet.lamp = () => quiet;
  map.props.forEach((p) => {
    const draw = DRAW[p.type];
    if (!draw) throw new Error(`no structure called ${p.type}`);
    const y = p.y ?? map.heightAt(p.x, p.z) ?? 0;
    const roof = createKit(GFX);
    // The fence goes all the way round: it gets a kit of its own.
    // A sign on posts goes through if the ball comes at it hard enough: it is a group of its own, to hide.
    const own = p.type === 'placard' ? createKit(GFX) : null;
    draw(own ?? (p.type === 'fence' ? kitAt(-100, -100) : kitAt(p.x, p.z)), t, p, y, quiet, roof);
    if (!roof.empty) roofs.push(roof);
    const signs = WORDS[p.type] ? WORDS[p.type](GFX, p, y) : [];
    if (own) {
      const piece = new GFX.Group();
      piece.name = 'placard';
      piece.add(own.build({ name: 'placard-posts' }), ...signs);
      placards.set(p, piece);
    } else extras.push(...signs);
  });
  const group = new GFX.Group();
  group.name = 'structures';
  for (const k of kits.values()) if (!k.empty) group.add(k.build({ name: 'steelwork' }));
  for (const [tex, parts] of t.layers) {
    const g = new GFX.BufferGeometry();
    g.setAttribute('position', new GFX.BufferAttribute(new Float32Array(parts.position), 3));
    g.setAttribute('normal', new GFX.BufferAttribute(new Float32Array(parts.normal), 3));
    g.setAttribute('color', new GFX.BufferAttribute(new Float32Array(parts.color), 3));
    g.setAttribute('uv', new GFX.BufferAttribute(new Float32Array(parts.uv), 2));
    g.computeBoundingSphere();
    const mesh = new GFX.Mesh(g, wallMaterial(GFX, tex));
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.name = `panels-${tex}`;
    group.add(mesh);
  }
  for (const e of extras) group.add(e);
  for (const piece of placards.values()) group.add(piece);
  return { group, roofs, placards };
}

/** The lights the structures carry, put on the map before it is built (so they are baked into the ground). */
export function structureLights(map) {
  const dummy = { slab() {}, box() {}, cyl() {}, cone() {}, sphere() {}, torus() {}, beam() {}, get empty() { return true; } };
  const t = { cylinder() {}, face() {}, box() {} };
  for (const p of map.props) {
    if (!['canopy', 'billboard', 'tank', 'screen'].includes(p.type)) continue;
    const y = p.y ?? map.heightAt(p.x, p.z) ?? 0;
    DRAW[p.type](dummy, t, p, y, map, dummy);
  }
}

export const STRUCTURES = Object.keys(DRAW);

/** A metal roof's top from (x0, z0) to (x1, z1) at `y`: standing seams every half tile, a darker flashing round the edge. */
export function seams(k, x0, z0, x1, z1, y, colour) {
  const dark = shadeHex(colour, 0.78), light = shadeHex(colour, 1.06);
  for (let x = x0 + 0.45; x < x1 - 0.2; x += 0.45) k.slab(x - 0.025, y, z0 + 0.08, x + 0.025, y + 0.05, z1 - 0.08, light);
  k.slab(x0 - 0.03, y, z0 - 0.03, x1 + 0.03, y + 0.08, z0 + 0.08, dark);
  k.slab(x0 - 0.03, y, z1 - 0.08, x1 + 0.03, y + 0.08, z1 + 0.03, dark);
  k.slab(x0 - 0.03, y, z0, x0 + 0.08, y + 0.08, z1, dark);
  k.slab(x1 - 0.08, y, z0, x1 + 0.03, y + 0.08, z1, dark);
}

const shadeHex = (hex, k) => '#' + [1, 3, 5].map((i) => Math.round(Math.min(255, parseInt(hex.slice(i, i + 2), 16) * k)).toString(16).padStart(2, '0')).join('');
