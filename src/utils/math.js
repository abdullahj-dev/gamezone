export const rand   = (a, b) => Math.random() * (b - a) + a;
export const randInt= (a, b) => Math.floor(rand(a, b + 1));
export const dist   = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const angle  = (from, to) => Math.atan2(to.y - from.y, to.x - from.x);
export const clamp  = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp   = (a, b, t) => a + (b - a) * t;
export const norm   = (v) => { const m = Math.hypot(v.x, v.y) || 1; return { x: v.x/m, y: v.y/m }; };

export function hexRgb(hex) {
  return { r: parseInt(hex.slice(1,3),16), g: parseInt(hex.slice(3,5),16), b: parseInt(hex.slice(5,7),16) };
}
export function lighten(hex, a=70) {
  const c = hexRgb(hex);
  return `rgb(${Math.min(255,c.r+a)},${Math.min(255,c.g+a)},${Math.min(255,c.b+a)})`;
}
export function darken(hex, a=50) {
  const c = hexRgb(hex);
  return `rgb(${Math.max(0,c.r-a)},${Math.max(0,c.g-a)},${Math.max(0,c.b-a)})`;
}
export function hexAlpha(hex, alpha) {
  const { r,g,b } = hexRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}