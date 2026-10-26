import { SURFACES } from 'madness-engine/textures/town/surfaces.metrlol';
import { groundAxes } from 'madness-engine/views/town';

/**
 * Everything on screen that isn't the 3D view: the spikes meter, the golden
 * GPUs found, the cred, the time horizon and the time along the top; the
 * ball's own remarks, and the big messages in the middle; the map in the
 * corner, turned with the camera so up on it is up the screen; the title
 * screen.
 */

export function createHud(root, { onStart, onNew }) {
  const $ = (id) => root.querySelector(`#${id}`);
  const top = $('top');
  const placeEl = $('place');
  const goldEl = $('gold');
  const likesEl = $('likes');
  const credEl = $('cred');
  const comboEl = $('combo');
  const horizonEl = $('horizon');
  const quipEl = $('quip');
  const accelEl = $('accel');
  const accelFill = $('accel-fill');
  const clockEl = $('clock');
  const spikesEl = $('spikes');
  const spikesFill = $('spikes-fill');
  const bannerEl = $('banner');
  const toastEl = $('toast');
  const titleEl = $('title');
  const startEl = $('start');
  const freshEl = $('fresh');
  const bestEl = $('best');
  const pauseEl = $('pause');
  const muteEl = $('mute');
  const mapEl = $('minimap');
  let shown = false;
  let toastTimer = 0;
  let quipTimer = 0;

  muteEl.addEventListener('click', (e) => {
    e.stopPropagation();
    muteEl.dispatchEvent(new CustomEvent('mute', { bubbles: true }));
  });
  startEl.addEventListener('click', (e) => { e.stopPropagation(); onStart(); });
  freshEl.addEventListener('click', (e) => { e.stopPropagation(); onNew(); });
  for (const b of [startEl, freshEl]) b.addEventListener('pointerdown', (e) => e.stopPropagation());

  // The map: the ground painted once, the moving things over it every frame.
  let base = null, map = null;
  const ctx = mapEl.getContext('2d');

  const time = (s) => {
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  return {
    get bannerShown() { return shown; },

    /** The map to draw in the corner: its ground, painted now. */
    setMap(m) {
      map = m;
      base = document.createElement('canvas');
      base.width = m.cols; base.height = m.rows;
      const b = base.getContext('2d');
      const img = b.createImageData(m.cols, m.rows);
      for (let z = 0; z < m.rows; z++) {
        for (let x = 0; x < m.cols; x++) {
          const c = m.cell(x, z);
          const hex = (SURFACES[c?.surface] ?? SURFACES.grass).map;
          const n = parseInt(hex.slice(1), 16);
          const h = c ? Math.max(...c.h) : 0;
          const k = Math.min(1.5, 0.85 + h * 0.06);
          const i = (z * m.cols + x) * 4;
          img.data[i] = Math.min(255, ((n >> 16) & 255) * k);
          img.data[i + 1] = Math.min(255, ((n >> 8) & 255) * k);
          img.data[i + 2] = Math.min(255, (n & 255) * k);
          img.data[i + 3] = 255;
        }
      }
      b.putImageData(img, 0, 0);
      b.fillStyle = 'rgba(240,236,226,0.85)';
      for (const mk of m.marks) if (mk.w * mk.d < 2) b.fillRect(mk.x, mk.z, Math.max(0.6, mk.w), Math.max(0.6, mk.d));
    },

    /**
     * The map, every frame: centred on the ball, turned to the camera's
     * `yaw`, `zoom` tiles across, with the cars, the people, the whetstones and
     * the golden GPUs not yet found in the districts it has been to.
     */
    minimap({ ball, yaw, cars, gpus, stones, foes = [], seen, span = 56 }) {
      if (!base) return;
      const W = mapEl.width, H = mapEl.height;
      const s = W / span;
      const { up } = groundAxes(yaw);
      const angle = -Math.PI / 2 - Math.atan2(up[1], up[0]);
      ctx.save();
      ctx.clearRect(0, 0, W, H);
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, W / 2 - 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = '#6a5a4a';
      ctx.fillRect(0, 0, W, H);
      ctx.translate(W / 2, H / 2);
      ctx.rotate(angle);
      ctx.scale(s, s);
      ctx.translate(-ball.x, -ball.z);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(base, 0, 0);
      ctx.fillStyle = '#f4f1ea';
      for (const c of cars) ctx.fillRect(c.x - 0.7, c.z - 0.7, 1.4, 1.4);
      ctx.fillStyle = '#e8503a';
      for (const f of foes) if (!f.gone && !f.dead && Math.abs(f.ball.x - ball.x) < span && Math.abs(f.ball.z - ball.z) < span) ctx.fillRect(f.ball.x - 0.5, f.ball.z - 0.5, 1, 1);
      for (const p of stones) {
        ctx.fillStyle = '#c8382c';
        ctx.beginPath(); ctx.arc(p.x, p.z, 1.3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath(); ctx.arc(p.x, p.z, 0.5, 0, Math.PI * 2); ctx.fill();
      }
      for (const g of gpus) {
        if (g.got) continue;
        const d = map.districtAt(g.x, g.z);
        if (d && !seen.has(d.name)) continue;
        ctx.fillStyle = '#ffd23a';
        ctx.strokeStyle = '#3a2a00';
        ctx.lineWidth = 0.4;
        star(ctx, g.x, g.z, 1.8);
      }
      ctx.restore();
      // The ball, in the middle.
      ctx.fillStyle = '#c9d0de';
      ctx.strokeStyle = '#1c1b1a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, 5, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, W / 2 - 2, 0, Math.PI * 2);
      ctx.stroke();
    },

    title(saved, { found, total }) {
      titleEl.hidden = false;
      top.hidden = true;
      mapEl.hidden = true;
      bannerEl.hidden = true;
      shown = false;
      startEl.textContent = found > 0 ? 'CARRY ON' : 'ROLL OUT';
      freshEl.hidden = found === 0;
      const bits = [];
      if (found > 0) bits.push(`${found} of ${total} golden GPUs`);
      if (saved.best) bits.push(`best: all ${total} in ${time(saved.best)}`);
      bestEl.textContent = bits.join(' · ');
    },

    play() {
      titleEl.hidden = true;
      top.hidden = false;
      mapEl.hidden = false;
    },

    place(name) { placeEl.textContent = name ?? ''; },
    gold(n, total) { goldEl.textContent = `${n}/${total}`; },
    likes(n) { likesEl.textContent = String(n); },

    /** The cred, and the combo that's multiplying it (0 or 1 for none). */
    cred(n, combo) {
      credEl.textContent = n.toLocaleString('en-US');
      comboEl.textContent = combo > 1 ? `×${combo}` : '';
      comboEl.classList.toggle('on', combo > 1);
    },

    /** The METR-style time horizon (it doubles every few smashes); `jump` makes it flash. */
    horizon(text, jump = false) {
      horizonEl.textContent = text;
      if (!jump) return;
      horizonEl.classList.remove('jump');
      void horizonEl.offsetWidth;
      horizonEl.classList.add('jump');
    },

    /**
     * The ball's remark, for a few seconds: a headline (OBLITERATED! ×3) and a
     * line under it; with no line, just the remark.
     */
    quip(headline, line = '', seconds = 3.2) {
      quipEl.hidden = false;
      quipEl.innerHTML = '';
      const add = (tag, text) => {
        const e = document.createElement(tag);
        e.textContent = text;
        quipEl.append(e);
      };
      if (line) { add('b', headline); add('span', line); } else add('span', headline);
      quipEl.classList.remove('in');
      void quipEl.offsetWidth;
      quipEl.classList.add('in');
      clearTimeout(quipTimer);
      quipTimer = setTimeout(() => { quipEl.hidden = true; }, seconds * 1000);
    },

    clock(s) { clockEl.textContent = time(s); },

    spikes(v) {
      const k = Math.max(0, Math.min(1, v / 100));
      spikesFill.style.width = `${k * 100}%`;
      spikesEl.classList.toggle('low', k <= 0.3);
    },

    /** The acceleration meter, 0 to 1; `winded` while it recovers. */
    accel(v, winded = false) {
      accelFill.style.width = `${Math.max(0, Math.min(1, v)) * 100}%`;
      accelEl.classList.toggle('winded', winded);
    },

    /** A knock: the meter shakes. */
    hit() {
      spikesEl.classList.remove('shake');
      void spikesEl.offsetWidth;
      spikesEl.classList.add('shake');
    },

    banner(text, size = 'normal') {
      shown = text != null;
      bannerEl.hidden = !shown;
      if (!shown) return;
      bannerEl.textContent = text;
      bannerEl.className = size;
      void bannerEl.offsetWidth;
      bannerEl.classList.add('pop');
    },

    /** A line along the bottom for a few seconds: where it is, what it found. */
    toast(text, seconds = 2.6) {
      toastEl.textContent = text;
      toastEl.hidden = false;
      toastEl.classList.remove('in');
      void toastEl.offsetWidth;
      toastEl.classList.add('in');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => { toastEl.hidden = true; }, seconds * 1000);
    },

    paused(on) { pauseEl.hidden = !on; },

    muted(on) {
      muteEl.setAttribute('aria-pressed', String(on));
      muteEl.textContent = on ? 'sound off' : 'sound on';
    },
  };
}

function star(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}
