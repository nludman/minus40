"use client";

import { useEffect, useRef } from "react";
import { gateColors } from "@/lib/gateColors";

type Segment = { start: string; end: string; gate: number };
type PlanetSegments = { segments: Segment[] };
type SegmentsPayload = {
  year: number;
  year_start_utc: string;
  year_end_utc: string;
  transits: Record<string, PlanetSegments>;
};
type MandalaClientProps = {
  year: number;
  visiblePlanets: Record<string, boolean>;
  onHover?: (info: { planet: string; gate: number } | null) => void;
};


const BODY_ORDER = ["Pluto", "Neptune", "Uranus", "Saturn"] as const;

const CX = 600;
const CY = 600;

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

    const svg = svgEl; // keep this binding: TS stays happy when passing into helpers

    const rings = new Map<string, any>();

    // Runtime data loaded from /api/segments
    let transits: SegmentsPayload["transits"] = {};
    let YEAR_START: Date | null = null;
    let YEAR_END: Date | null = null;

    function animateRingMove(planetId: string, newR: number) {
  const g = svg.querySelector(`#${planetId}-segments`);
  if (!(g instanceof SVGGElement)) return;

  if (!newR || !isFinite(newR)) return;

  const prevRadius = prevRadiusRef.current;

  const oldR = prevRadius.get(planetId) ?? newR;
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

  prevRadius.set(planetId, newR);
}



    function animateRingIn(planetId: string) {
      const g = svg.querySelector(`#${planetId}-segments`);
      if (!(g instanceof SVGGElement)) return;

      const cx = 600;
      const cy = 600;

      // Kill any prior animation to avoid stacking
      g.getAnimations?.().forEach((a) => a.cancel());

      g.animate(
        [
          {
            transform: `translate(${cx}px, ${cy}px) scale(0.985) translate(${-cx}px, ${-cy}px)`,
            opacity: 0.0,
            filter: "blur(0.6px)",
          },
          {
            transform: `translate(${cx}px, ${cy}px) scale(1) translate(${-cx}px, ${-cy}px)`,
            opacity: 1.0,
            filter: "blur(0px)",
          },
        ],
        {
          duration: 420,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)", // simple, alive
          fill: "both",
        }
      );
        }


    // --- Inject hover styles for segment reveal + programmable outline ---
    (function injectArcStyles() {
      if (document.getElementById("mandala-arc-styles")) return;
      const style = document.createElement("style");
      style.id = "mandala-arc-styles";
      style.textContent = `
        .seg-wrap { cursor: pointer; }

        /* Color layer reveals on hover */
        .seg-wrap .seg-color { opacity: 0; transition: opacity 180ms ease; }
        .seg-wrap:hover .seg-color { opacity: 1; }

        /* Base fades back slightly on hover so color reads */
        .seg-wrap .seg-base { opacity: 0.92; transition: opacity 180ms ease; }
        .seg-wrap:hover .seg-base { opacity: 0.25; }

        /* Outline is its own programmable semantic channel */
        .seg-wrap .seg-outline { opacity: 0.24; transition: opacity 180ms ease, stroke 180ms ease; }
        .seg-wrap:hover .seg-outline { opacity: 0.5; }
      `;
      document.head.appendChild(style);
    })();

    function ensureLabelLayer(svgEl2: SVGSVGElement) {
      let g = svgEl2.querySelector("#GateLabels") as SVGGElement | null;
      if (g) return g;

      g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("id", "GateLabels");
      svgEl2.appendChild(g); // on top
      return g;
    }

    // --- geometry helpers ---
    function clamp01(t: number) {
      return Math.max(0, Math.min(1, t));
    }

    function polarToXY(cx: number, cy: number, r: number, angleDeg: number) {
      const a = (angleDeg * Math.PI) / 180;
      return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
    }

    function makeCircleLike(base: SVGCircleElement) {
      const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      c.setAttribute("cx", base.getAttribute("cx") || "0");
      c.setAttribute("cy", base.getAttribute("cy") || "0");
      c.setAttribute("r", base.getAttribute("r") || "0");
      c.setAttribute("fill", "none");
      c.setAttribute("stroke-width", base.getAttribute("stroke-width") || "20");
      c.setAttribute("vector-effect", "non-scaling-stroke");
      return c;
    }

    function rotateTo12oclock(el: SVGElement, cx: number, cy: number) {
      el.setAttribute("transform", `rotate(-90 ${cx} ${cy})`);
    }

    function createGateLabel(textContent: string) {
      const t = document.createElementNS("http://www.w3.org/2000/svg", "text");
      t.setAttribute("fill", "white");
      t.setAttribute("font-size", "12");
      t.setAttribute(
        "font-family",
        "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif"
      );
      t.setAttribute("font-weight", "700");
      t.setAttribute("text-anchor", "middle");
      t.setAttribute("dominant-baseline", "central");
      (t as any).style.pointerEvents = "none";
      t.textContent = textContent;
      return t;
    }

    function ensureBaseCircle(id: string, cx: number, cy: number) {
  const existing = svg.querySelector(`#${id}`);
  if (existing instanceof SVGCircleElement) return existing;

  const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  c.setAttribute("id", id);
  c.setAttribute("cx", String(cx));
  c.setAttribute("cy", String(cy));
  c.setAttribute("fill", "none");
  svg.appendChild(c);
  return c;
    }

    /**
    * Packs active rings into a fixed band (innerR..outerR) using a midline system.
    * Fewer rings => thicker strokes, recentered stack.
    */
    function applyRingLayout(activeIds: string[]) {
      const cx = 600;
      const cy = 600;

      // This is your “invisible midline” radius.
      // For your original 4-circle scaffold:
      // (440 + 342.5) / 2 = 391.25
      const CENTER_R = 391.25;

      // Total radial thickness the entire ring stack should occupy.
      // Tune this. Bigger => more “breathing room” and bigger thickness changes.
      const BAND = 120;

      const n = Math.max(1, activeIds.length);

      // gap relative to stroke thickness
      const gapRatio = 0.35;

      // Solve for stroke thickness so n rings + gaps fill BAND
      const thicknessRaw = BAND / (n + (n - 1) * gapRatio);
      const gap = thicknessRaw * gapRatio;

      // Let thickness actually grow when n shrinks
      const stroke = Math.max(14, Math.min(44, thicknessRaw));

      // Total used thickness (with the clamped stroke)
      const usedBand = n * stroke + (n - 1) * gap;

      // Compute the outer edge so the whole stack is centered on CENTER_R
      const outerEdge = CENTER_R + usedBand / 2;

      activeIds.forEach((id, i) => {
        // Midline radius for this ring (outer -> inner), centered as a stack
        const rMid = outerEdge - stroke / 2 - i * (stroke + gap);

        const base = ensureBaseCircle(id, cx, cy);
        base.setAttribute("r", String(rMid));
        base.setAttribute("stroke-width", String(stroke));
        base.setAttribute("stroke", "transparent"); // scaffold only
        base.style.display = "";
      });
    }


    // Creates segmented arcs
    function buildSegmentedRing(planetId: string) {
      const base = svg.querySelector(`#${planetId}`) as SVGCircleElement | null;
      if (!base) {
        console.warn(`Missing circle with id="${planetId}" in SVG`);
        return null;
      }
      if (!YEAR_START || !YEAR_END) {
        console.warn("YEAR_START/YEAR_END not set yet");
        return null;
      }

      const cx = parseFloat(base.getAttribute("cx") || "0");
      const cy = parseFloat(base.getAttribute("cy") || "0");
      const r = parseFloat(base.getAttribute("r") || "0");
      const sw = parseFloat(base.getAttribute("stroke-width") || "20");
      const OUTLINE_EXTRA = 2;
      const BASE_INSET = 4;

      const C = 2 * Math.PI * r;

      // Hide the original single-stroke ring
      base.style.display = "none";

      // Reuse existing group if present (no wipe)
let g = svg.querySelector(`#${planetId}-segments`);
if (g instanceof SVGGElement) {
  g.innerHTML = ""; // clear children but keep the group node (preserves continuity)
} else {
  g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.setAttribute("id", `${planetId}-segments`);
  base.insertAdjacentElement("afterend", g);
}

// Ensure transforms animate around center
(g as SVGGElement).style.transformOrigin = "600px 600px";
(g as SVGGElement).style.transformBox = "fill-box";


      const planet = transits[planetId];
      if (!planet || !Array.isArray(planet.segments)) {
        console.warn(`No segments found for ${planetId}`);
        return null;
      }

      const yearTotal = YEAR_END.getTime() - YEAR_START.getTime();

      for (const seg of planet.segments) {
        const segStart = new Date(seg.start);
        const segEnd = new Date(seg.end);

        let startFrac = clamp01((segStart.getTime() - YEAR_START.getTime()) / yearTotal);
        let endFrac = clamp01((segEnd.getTime() - YEAR_START.getTime()) / yearTotal);

        // Dynamic padding so rounded caps never overlap as stroke grows
        // Each round cap extends ~strokeWidth/2 beyond the arc.
        // We pad by ~0.6 * strokeWidth (plus a tiny constant) on each end.
        const swNow = sw - BASE_INSET; // the actual visible stroke width
        const PAD_PX = Math.max(6, swNow * 0.512 + 1); // tune 0.5–0.8, +2 for breathing room
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

        // Wrapper group so hover affects all layers together
        const wrap = document.createElementNS("http://www.w3.org/2000/svg", "g");
        wrap.setAttribute("class", "seg-wrap");
        (wrap as any).dataset.planet = planetId;
        (wrap as any).dataset.gate = String(seg.gate);

        wrap.addEventListener("mouseenter", () => {
           onHover?.({ planet: planetId, gate: seg.gate });
        });
        wrap.addEventListener("mouseleave", () => {
          onHover?.(null);
        });


        // --- OUTLINE ---
        const outlineArc = makeCircleLike(base);
        outlineArc.setAttribute("class", "seg-outline");
        outlineArc.setAttribute("stroke", "rgba(255,255,255,0.22)");
        outlineArc.setAttribute("stroke-linecap", "round");
        outlineArc.setAttribute("stroke-width", String(sw + OUTLINE_EXTRA));
        (outlineArc as any).style.strokeDasharray = `${visible} ${gap}`;
        (outlineArc as any).style.strokeDashoffset = `${dashOffset}`;
        rotateTo12oclock(outlineArc, cx, cy);

        // --- BASE ---
        const baseArc = makeCircleLike(base);
        baseArc.setAttribute("class", "seg-base");
        baseArc.setAttribute("stroke", "#ffffff");
        baseArc.setAttribute("stroke-linecap", "round");
        baseArc.setAttribute("stroke-width", String(sw - BASE_INSET));
        (baseArc as any).style.strokeDasharray = `${visible} ${gap}`;
        (baseArc as any).style.strokeDashoffset = `${dashOffset}`;
        rotateTo12oclock(baseArc, cx, cy);

        // --- COLOR (reveals on hover) ---
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

        // --- Gate label inside the segment (skip very short segments) ---
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

    async function fetchYearSegments(year = 2026): Promise<SegmentsPayload> {
      const res = await fetch(`/api/segments?year=${year}`);
      if (!res.ok) throw new Error(`segments fetch failed ${res.status}`);
      return res.json();
    }

    async function init(year = 2026) {
  const payload = await fetchYearSegments(year);

  // 0) Update center year label
  const yearText = svg.querySelector("#YearLabel tspan");
  if (yearText) yearText.textContent = String(payload.year);

  // 1) Set core temporal data FIRST
  transits = payload.transits;
  YEAR_START = new Date(payload.year_start_utc);
  YEAR_END = new Date(payload.year_end_utc);

  // 2) Clear any previous render
  rings.clear();

  const labelLayer = svg.querySelector("#GateLabels");
  if (labelLayer) labelLayer.innerHTML = "";

  // 3) Decide which rings exist + which are active
  const allIds = BODY_ORDER.filter((id) => transits[id]); // stable order
const vp = visiblePlanetsRef.current;
const activeIds = allIds.filter((id) => vp[id] !== false);

  // 4) Apply dynamic geometry for active rings
  applyRingLayout(activeIds);

  console.log("Mandala layout", { allIds, activeIds });


  // 5) Build only active rings (ONCE), then animate them in
    const prevRadius = prevRadiusRef.current;

  for (const id of activeIds) {
    const hadBefore = prevRadius.has(id);

    const built = buildSegmentedRing(id);
    if (built) {
      rings.set(id, built);

      const base = svg.querySelector(`#${id}`);
      if (base instanceof SVGCircleElement) {
        const newR = parseFloat(base.getAttribute("r") || "0");

        if (!hadBefore) {
          // first time this planet appears
          animateRingIn(id);
          prevRadius.set(id, newR);
        } else {
          // planet existed before: animate repack
          animateRingMove(id, newR);
        }
      }
    }
  }


  // 6) Hide inactive bases + segment groups (if they exist)
  for (const id of allIds) {
  const on = vp[id] !== false;


    const base = svg.querySelector(`#${id}`);
    if (base instanceof SVGCircleElement) base.style.display = on ? "" : "none";

    const segGroup = svg.querySelector(`#${id}-segments`);
    if (segGroup instanceof SVGGElement) segGroup.style.display = on ? "" : "none";
  }

  // 7) DevTools helpers
  (window as any).transits = transits;
  (window as any).YEAR_START = YEAR_START;
  (window as any).YEAR_END = YEAR_END;
}


    initRef.current = (y: number) => {
      init(y).catch(console.warn);
    };

    // first render
    initRef.current(year);

    // Cleanup: prevents duplicate layers on dev re-mounts / hot reload
    return () => {
      for (const id of BODY_ORDER) {
        const segGroup = svg.querySelector(`#${id}-segments`);
        if (segGroup instanceof SVGGElement) segGroup.remove();

        const base = svg.querySelector(`#${id}`);
        if (base instanceof SVGCircleElement) base.remove(); // remove scaffold circle
      }

      const labelLayer = svg.querySelector("#GateLabels");
      if (labelLayer) labelLayer.remove();
    };

  }, []);

    useEffect(() => {
    initRef.current(year);
  }, [year, visiblePlanets]);


  return null;
}
