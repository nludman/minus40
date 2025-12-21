// src/lib/mandala/buildRing.ts
import { gateColors } from "@/lib/gateColors";
import { clamp01, polarToXY, rotateTo12oclock } from "./geometry";
import { createGateLabel, ensureLabelLayer, makeCircleLike } from "./svgDom";
import type { SegmentsPayload, HoverInfo } from "./constants";

type BuildRingArgs = {
  svg: SVGSVGElement;
  planetId: string;
  transits: SegmentsPayload["transits"];
  yearStart: Date;
  yearEnd: Date;
  onHover?: (info: HoverInfo) => void;
};

export function buildSegmentedRing({
  svg,
  planetId,
  transits,
  yearStart,
  yearEnd,
  onHover,
}: BuildRingArgs) {
  const base = svg.querySelector(`#${planetId}`) as SVGCircleElement | null;
  if (!base) {
    console.warn(`Missing circle with id="${planetId}" in SVG`);
    return null;
  }

  const cx = parseFloat(base.getAttribute("cx") || "0");
  const cy = parseFloat(base.getAttribute("cy") || "0");
  const r = parseFloat(base.getAttribute("r") || "0");
  const sw = parseFloat(base.getAttribute("stroke-width") || "20");

  const OUTLINE_EXTRA = 2;
  const BASE_INSET = 4;

  const C = 2 * Math.PI * r;

  base.style.display = "none";

  let g = svg.querySelector(`#${planetId}-segments`);
  if (g instanceof SVGGElement) {
    g.innerHTML = "";
  } else {
    g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("id", `${planetId}-segments`);
    base.insertAdjacentElement("afterend", g);
  }

  (g as SVGGElement).style.transformOrigin = "600px 600px";
  (g as SVGGElement).style.transformBox = "fill-box";

  const planet = transits[planetId];
  if (!planet || !Array.isArray(planet.segments)) {
    console.warn(`No segments found for ${planetId}`);
    return null;
  }

  const yearTotal = yearEnd.getTime() - yearStart.getTime();

  for (const seg of planet.segments) {
    const segStart = new Date(seg.start);
    const segEnd = new Date(seg.end);

    let startFrac = clamp01((segStart.getTime() - yearStart.getTime()) / yearTotal);
    let endFrac = clamp01((segEnd.getTime() - yearStart.getTime()) / yearTotal);

    const swNow = sw - BASE_INSET;
    const PAD_PX = Math.max(6, swNow * 0.512 + 1);
    const padFrac = PAD_PX / C;

    startFrac += padFrac;
    endFrac -= padFrac;

    const EPS = 1e-6;
    startFrac = Math.max(0, Math.min(1 - EPS, startFrac));
    endFrac = Math.max(0, Math.min(1 - EPS, endFrac));

    if (endFrac <= startFrac) continue;

    const lenFrac = Math.max(0, endFrac - startFrac);
    const visible = C * lenFrac;
    const gap = C - visible;

    let dashOffset = -C * startFrac;
    if (Math.abs(dashOffset + C) < 1e-4) dashOffset = -C + 1e-4;

    const wrap = document.createElementNS("http://www.w3.org/2000/svg", "g");
    wrap.setAttribute("class", "seg-wrap");
    (wrap as any).dataset.planet = planetId;
    (wrap as any).dataset.gate = String(seg.gate);

    wrap.addEventListener("mouseenter", () => onHover?.({ planet: planetId, gate: seg.gate }));
    wrap.addEventListener("mouseleave", () => onHover?.(null));

    const outlineArc = makeCircleLike(base);
    outlineArc.setAttribute("class", "seg-outline");
    outlineArc.setAttribute("stroke", "rgba(255,255,255,0.22)");
    outlineArc.setAttribute("stroke-linecap", "round");
    outlineArc.setAttribute("stroke-width", String(sw + OUTLINE_EXTRA));
    (outlineArc as any).style.strokeDasharray = `${visible} ${gap}`;
    (outlineArc as any).style.strokeDashoffset = `${dashOffset}`;
    rotateTo12oclock(outlineArc, cx, cy);

    const baseArc = makeCircleLike(base);
    baseArc.setAttribute("class", "seg-base");
    baseArc.setAttribute("stroke", "#ffffff");
    baseArc.setAttribute("stroke-linecap", "round");
    baseArc.setAttribute("stroke-width", String(sw - BASE_INSET));
    (baseArc as any).style.strokeDasharray = `${visible} ${gap}`;
    (baseArc as any).style.strokeDashoffset = `${dashOffset}`;
    rotateTo12oclock(baseArc, cx, cy);

    const colorArc = makeCircleLike(base);
    colorArc.setAttribute("class", "seg-color");
    colorArc.setAttribute("stroke", gateColors[seg.gate] || "#fff");
    colorArc.setAttribute("stroke-linecap", "round");
    colorArc.setAttribute("stroke-width", String(sw - BASE_INSET));
    (colorArc as any).style.strokeDasharray = `${visible} ${gap}`;
    (colorArc as any).style.strokeDashoffset = `${dashOffset}`;
    rotateTo12oclock(colorArc, cx, cy);

    wrap.appendChild(outlineArc);
    wrap.appendChild(baseArc);
    wrap.appendChild(colorArc);
    g.appendChild(wrap);

    const MIN_LABEL_DAYS = 7;
    const segDays = (segEnd.getTime() - segStart.getTime()) / (24 * 60 * 60 * 1000);

    if (segDays >= MIN_LABEL_DAYS) {
      const labelLayer = ensureLabelLayer(svg);

      const midFrac = (startFrac + endFrac) / 2;
      const angleDeg = midFrac * 360 - 90;

      const pos = polarToXY(cx, cy, r, angleDeg);

      const label = createGateLabel(String(seg.gate));
      label.setAttribute("x", String(pos.x));
      label.setAttribute("y", String(pos.y));
      label.setAttribute("opacity", "0.7");

      labelLayer.appendChild(label);
    }
  }

  return { C };
}
