// src/lib/mandala/animations.ts
import { CX, CY } from "./constants";

export function animateRingIn(svg: SVGSVGElement, planetId: string) {
  const g = svg.querySelector(`#${planetId}-segments`);
  if (!(g instanceof SVGGElement)) return;

  g.getAnimations?.().forEach((a) => a.cancel());

  g.animate(
    [
      {
        transform: `translate(${CX}px, ${CY}px) scale(0.985) translate(${-CX}px, ${-CY}px)`,
        opacity: 0.0,
        filter: "blur(0.6px)",
      },
      {
        transform: `translate(${CX}px, ${CY}px) scale(1) translate(${-CX}px, ${-CY}px)`,
        opacity: 1.0,
        filter: "blur(0px)",
      },
    ],
    {
      duration: 420,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      fill: "both",
    }
  );
}

export function animateRingMove(svg: SVGSVGElement, planetId: string, oldR: number, newR: number) {
  const g = svg.querySelector(`#${planetId}-segments`);
  if (!(g instanceof SVGGElement)) return;
  if (!newR || !isFinite(newR)) return;

  const fromScale = oldR && newR ? oldR / newR : 1;

  g.getAnimations?.().forEach((a) => a.cancel());

  g.animate(
    [
      { transform: `translate(${CX}px, ${CY}px) scale(${fromScale}) translate(${-CX}px, ${-CY}px)` },
      { transform: `translate(${CX}px, ${CY}px) scale(1) translate(${-CX}px, ${-CY}px)` },
    ],
    {
      duration: 520,
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      fill: "both",
    }
  );
}
