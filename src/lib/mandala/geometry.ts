// src/lib/mandala/geometry.ts
export function clamp01(t: number) {
  return Math.max(0, Math.min(1, t));
}

export function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

export function rotateTo12oclock(el: SVGElement, cx: number, cy: number) {
  el.setAttribute("transform", `rotate(-90 ${cx} ${cy})`);
}
