// src/components/mandala/client.tsx
"use client";

import { useEffect, useRef } from "react";
import { BODY_ORDER, CX, CY, type SegmentsPayload, type HoverInfo } from "@/lib/mandala/constants";
import { injectArcStyles } from "@/lib/mandala/styles";
import { applyRingLayout } from "@/lib/mandala/ringLayout";
import { buildSegmentedRing } from "@/lib/mandala/buildRing";
import { animateRingIn, animateRingMove } from "@/lib/mandala/animations";

type MandalaClientProps = {
  year: number;
  visiblePlanets: Record<string, boolean>;
  onHover?: (info: HoverInfo) => void;
};

type InitRunner = (year: number) => void;

export default function MandalaClient({ year, visiblePlanets, onHover }: MandalaClientProps) {
  const prevRadiusRef = useRef<Map<string, number>>(new Map());
  const initRef = useRef<InitRunner>(() => {});
  const visiblePlanetsRef = useRef<Record<string, boolean>>(visiblePlanets);

  useEffect(() => {
    visiblePlanetsRef.current = visiblePlanets;
  }, [visiblePlanets]);

  useEffect(() => {
    const svgEl = document.querySelector("#MandalaSvg");
    if (!(svgEl instanceof SVGSVGElement)) return;

    const svg = svgEl;
    injectArcStyles();

    const rings = new Map<string, any>();

    let transits: SegmentsPayload["transits"] = {};
    let YEAR_START: Date | null = null;
    let YEAR_END: Date | null = null;

    async function fetchYearSegments(y: number): Promise<SegmentsPayload> {
      const res = await fetch(`/api/segments?year=${y}`);
      if (!res.ok) throw new Error(`segments fetch failed ${res.status}`);
      return res.json();
    }

    async function init(y: number) {
      const payload = await fetchYearSegments(y);

      const yearText = svg.querySelector("#YearLabel tspan");
      if (yearText) yearText.textContent = String(payload.year);

      transits = payload.transits;
      YEAR_START = new Date(payload.year_start_utc);
      YEAR_END = new Date(payload.year_end_utc);

      rings.clear();

      const labelLayer = svg.querySelector("#GateLabels");
      if (labelLayer) labelLayer.innerHTML = "";

      const allIds = BODY_ORDER.filter((id) => transits[id]);
      const vp = visiblePlanetsRef.current;
      const activeIds = allIds.filter((id) => vp[id] !== false);

      applyRingLayout(svg, activeIds);

      const prevRadius = prevRadiusRef.current;

      for (const id of activeIds) {
        const hadBefore = prevRadius.has(id);

        const built = buildSegmentedRing({
          svg,
          planetId: id,
          transits,
          yearStart: YEAR_START!,
          yearEnd: YEAR_END!,
          onHover,
        });

        if (built) {
          rings.set(id, built);

          const base = svg.querySelector(`#${id}`);
          if (base instanceof SVGCircleElement) {
            const newR = parseFloat(base.getAttribute("r") || "0");

            if (!hadBefore) {
              animateRingIn(svg, id);
              prevRadius.set(id, newR);
            } else {
              const oldR = prevRadius.get(id) ?? newR;
              animateRingMove(svg, id, oldR, newR);
              prevRadius.set(id, newR);
            }
          }
        }
      }

      for (const id of allIds) {
        const on = vp[id] !== false;

        const base = svg.querySelector(`#${id}`);
        if (base instanceof SVGCircleElement) base.style.display = on ? "" : "none";

        const segGroup = svg.querySelector(`#${id}-segments`);
        if (segGroup instanceof SVGGElement) segGroup.style.display = on ? "" : "none";
      }

      (window as any).transits = transits;
      (window as any).YEAR_START = YEAR_START;
      (window as any).YEAR_END = YEAR_END;
    }

    initRef.current = (yy: number) => {
      init(yy).catch(console.warn);
    };

    initRef.current(year);

    return () => {
      for (const id of BODY_ORDER) {
        const segGroup = svg.querySelector(`#${id}-segments`);
        if (segGroup instanceof SVGGElement) segGroup.remove();

        const base = svg.querySelector(`#${id}`);
        if (base instanceof SVGCircleElement) base.remove();
      }

      const labelLayer = svg.querySelector("#GateLabels");
      if (labelLayer) labelLayer.remove();
    };
  }, []); // mount only

  useEffect(() => {
    initRef.current(year);
  }, [year, visiblePlanets]);

  return null;
}
