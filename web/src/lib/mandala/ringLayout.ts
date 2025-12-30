// src/lib/mandala/ringLayout.ts
import { CX, CY } from "./constants";
import { ensureBaseCircle } from "./svgDom";
import { resolveLayoutKnobs, type MandalaLayoutKnobs, DEFAULT_LAYOUT } from "./layoutConfig";


/**
 * Packs active rings into a fixed band (innerR..outerR) using a midline system.
 * Fewer rings => thicker strokes, recentered stack.
 */
export type RingLayoutKnobs = {
  centerR?: number;
  band?: number;
  gapRatio?: number;
  strokeMin?: number;
  strokeMax?: number;
  showInactive?: boolean;
};

export function applyRingLayout(
  svg: SVGSVGElement,
  activeIds: string[],
  knobs: RingLayoutKnobs = {}
) {
  const CENTER_R = knobs.centerR ?? 391.25;
  const BAND = knobs.band ?? 120;
  const gapRatio = knobs.gapRatio ?? 0.35;
  const strokeMin = knobs.strokeMin ?? 14;
  const strokeMax = knobs.strokeMax ?? 44;

  const n = Math.max(1, activeIds.length);

  const thicknessRaw = BAND / (n + (n - 1) * gapRatio);
  const gap = thicknessRaw * gapRatio;

  const stroke = Math.max(strokeMin, Math.min(strokeMax, thicknessRaw));
  const usedBand = n * stroke + (n - 1) * gap;
  const outerEdge = CENTER_R + usedBand / 2;

  activeIds.forEach((id, i) => {
    const rMid = outerEdge - stroke / 2 - i * (stroke + gap);

    const base = ensureBaseCircle(svg, id, CX, CY);
    base.setAttribute("r", String(rMid));
    base.setAttribute("stroke-width", String(stroke));
    base.setAttribute("stroke", "transparent");
    base.setAttribute("pointer-events", "none");
  });
}

