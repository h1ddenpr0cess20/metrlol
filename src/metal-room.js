/**
 * Adds studio softboxes to the town's night reflection map.
 *
 * The world stays dark: these are reflection cards, not scene lights. Fully
 * metallic materials have almost no diffuse response, so a mostly-black
 * environment makes chrome look black. Broad neutral cards give it readable
 * highlights while the original night colours remain around them.
 */
const SOFTBOXES = Object.freeze([
  { x: 0.12, y: 0.07, w: 0.19, h: 0.11, color: 'rgba(255,255,255,0.88)' },
  { x: 0.42, y: 0.04, w: 0.15, h: 0.13, color: 'rgba(226,238,255,0.82)' },
  { x: 0.72, y: 0.09, w: 0.18, h: 0.11, color: 'rgba(255,232,210,0.82)' },
  { x: 0.27, y: 0.37, w: 0.31, h: 0.035, color: 'rgba(255,255,255,0.4)' },
]);

/**
 * Paints softbox reflections over an existing equirectangular room canvas.
 * Safe in non-browser contexts and leaves the original room untouched when
 * no 2D canvas context is available.
 */
export function paintMetalReflections(room) {
  if (!room || typeof room.getContext !== 'function' || !(room.width > 0) || !(room.height > 0)) return room;
  const ctx = room.getContext('2d');
  if (!ctx || typeof ctx.fillRect !== 'function') return room;

  const composite = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter';
  for (const box of SOFTBOXES) {
    ctx.save?.();
    ctx.shadowColor = box.color;
    ctx.shadowBlur = Math.max(6, room.height * 0.035);
    ctx.fillStyle = box.color;
    ctx.fillRect(box.x * room.width, box.y * room.height, box.w * room.width, box.h * room.height);
    ctx.restore?.();
  }
  ctx.globalCompositeOperation = composite;
  return room;
}
