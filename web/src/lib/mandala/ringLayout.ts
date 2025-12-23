// src/lib/mandala/ringLayout.ts
import { CX, CY } from "./constants";
import { ensureBaseCircle } from "./svgDom";

/**
 * Packs active rings into a fixed band (innerR..outerR) using a midline system.
 * Fewer rings => thicker strokes, recentered stack.
 */
export function applyRingLayout(svg: SVGSVGElement, activeIds: string[]) {
  const CENTER_R = 391.25;
  const BAND = 120;

  const n = Math.max(1, activeIds.length);
  const gapRatio = 0.35;

  const thicknessRaw = BAND / (n + (n - 1) * gapRatio);
  const gap = thicknessRaw * gapRatio;

  const stroke = Math.max(14, Math.min(44, thicknessRaw));
  const usedBand = n * stroke + (n - 1) * gap;
  const outerEdge = CENTER_R + usedBand / 2;

  activeIds.forEach((id, i) => {
    const rMid = outerEdge - stroke / 2 - i * (stroke + gap);

    const base = ensureBaseCircle(svg, id, CX, CY);
    base.setAttribute("r", String(rMid));
    base.setAttribute("stroke-width", String(stroke));
    base.setAttribute("stroke", "transparent");
    base.style.display = "";
  });
}
