// src/components/mandala/client.tsx

// This file is the Mandala orchestration layer:
// - fetches yearly transit data
// - holds refs (transits, yearStart, yearEnd)
// - rebuilds rings & visibility
// - manages selection state


"use client";

import { useEffect, useRef } from "react";
import { BODY_ORDER, type SegmentsPayload, type HoverInfo } from "@/lib/mandala/constants";
import { injectArcStyles } from "@/lib/mandala/styles";
import { applyRingLayout } from "@/lib/mandala/ringLayout";
import type { RingLayoutKnobs } from "@/lib/mandala/ringLayout";
import { buildSegmentedRing } from "@/lib/mandala/buildRing";
import { animateRingIn, animateRingMove } from "@/lib/mandala/animations";

type MandalaClientProps = {
  year: number;
  visiblePlanets: Record<string, boolean>;
  onHover?: (info: HoverInfo) => void;
  onSelect?: (info: HoverInfo) => void;
  selected?: HoverInfo | null;
  arcCap?: "round" | "butt";
  ringLayout?: RingLayoutKnobs;
  showCalendar?: boolean;

};


function updateCalendarOverlay(svg: SVGSVGElement, year: number, activeIds: string[], show: boolean) {
  const NS = "http://www.w3.org/2000/svg";

  // Ensure group exists
  let g = svg.querySelector("#CalendarOverlay") as SVGGElement | null;
  if (!g) {
    g = document.createElementNS(NS, "g");
    g.setAttribute("id", "CalendarOverlay");
    // put it early so it sits behind segments; change to append if you want it on top
    svg.insertBefore(g, svg.firstChild);
  }

  g.style.display = show ? "" : "none";
  if (!show) return;

  // Clear prior overlay contents (simple + reliable for now)
  while (g.firstChild) g.removeChild(g.firstChild);

  // Determine center (your system uses 600/600)
  const cx = 600;
  const cy = 600;

  // Determine outer edge based on outermost active circle
  const firstId = activeIds[0];
  const base = firstId ? (svg.querySelector(`#${firstId}`) as SVGCircleElement | null) : null;

  const rMid = base ? parseFloat(base.getAttribute("r") || "0") : 0;
  const sw = base ? parseFloat(base.getAttribute("stroke-width") || "0") : 0;

  // Outer edge of outermost ring
  const outerEdge = rMid + sw / 2;

  // Overlay styling knobs (tweak later / can be UI controls)
  const lineInner = outerEdge - 26;
  const lineOuter = outerEdge + 16;
  const labelR = outerEdge + 34;

  // Month boundaries in UTC
  const yearStart = Date.UTC(year, 0, 1, 0, 0, 0);
  const yearEnd = Date.UTC(year + 1, 0, 1, 0, 0, 0);
  const yearSpan = yearEnd - yearStart;

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // A defs container for textPaths
  const defs = document.createElementNS(NS, "defs");
  g.appendChild(defs);

  // Draw boundaries + labels
  for (let m = 0; m < 12; m++) {
    const t0 = Date.UTC(year, m, 1, 0, 0, 0);
    const t1 = Date.UTC(year, m + 1, 1, 0, 0, 0);

    const frac = (t0 - yearStart) / yearSpan;
    const midFrac = ((t0 + t1) / 2 - yearStart) / yearSpan;

    const ang = frac * 360 - 90;
    const midAng = midFrac * 360 - 90;

    // Boundary line
    const line = document.createElementNS(NS, "line");
    const a = (ang * Math.PI) / 180;
    line.setAttribute("x1", String(cx + lineInner * Math.cos(a)));
    line.setAttribute("y1", String(cy + lineInner * Math.sin(a)));
    line.setAttribute("x2", String(cx + lineOuter * Math.cos(a)));
    line.setAttribute("y2", String(cy + lineOuter * Math.sin(a)));
    line.setAttribute("stroke", "rgba(255,255,255,0.22)");
    line.setAttribute("stroke-width", "2");
    g.appendChild(line);

    // Optional: arced label around outer edge
    // We'll create a small arc path centered around the month midpoint.
    // Keep arcs short so the label doesn't wrap too far.
    const arcSpanDeg = 20; // tweak
    const startDeg = midAng - arcSpanDeg / 2;
    const endDeg = midAng + arcSpanDeg / 2;

    const start = polarToXY(cx, cy, labelR, startDeg);
    const end = polarToXY(cx, cy, labelR, endDeg);

    const path = document.createElementNS(NS, "path");
    const pathId = `monthLabelPath-${year}-${m}`;
    path.setAttribute("id", pathId);
    path.setAttribute(
      "d",
      `M ${start.x} ${start.y} A ${labelR} ${labelR} 0 0 1 ${end.x} ${end.y}`
    );
    defs.appendChild(path);

    const text = document.createElementNS(NS, "text");
    text.setAttribute("fill", "rgba(255,255,255,0.65)");
    const fontSize = Math.max(22, Math.min(28, Math.round(labelR / 30)));
    text.setAttribute("font-size", String(fontSize));
    text.setAttribute("letter-spacing", "3");


    const textPath = document.createElementNS(NS, "textPath");
    // Modern attribute: href
    textPath.setAttribute("href", `#${pathId}`);
    textPath.setAttribute("startOffset", "50%");
    textPath.setAttribute("text-anchor", "middle");
    textPath.textContent = monthNames[m];

    text.appendChild(textPath);
    g.appendChild(text);
  }

  function polarToXY(cx0: number, cy0: number, rr: number, deg: number) {
    const rad = (deg * Math.PI) / 180;
    return { x: cx0 + rr * Math.cos(rad), y: cy0 + rr * Math.sin(rad) };
  }
}



export default function MandalaClient({ year, visiblePlanets, onHover, onSelect, selected, arcCap = "butt", ringLayout, showCalendar = true }: MandalaClientProps) {
  const prevRadiusRef = useRef<Map<string, number>>(new Map());
  const visiblePlanetsRef = useRef<Record<string, boolean>>(visiblePlanets);
  const arcCapRef = useRef<"round" | "butt">(arcCap);
  const activeIdsRef = useRef<string[]>([]);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // “Data for the current year” (in-memory only; not a caching “system”)
  const transitsRef = useRef<SegmentsPayload["transits"] | null>(null);
  const yearStartRef = useRef<Date | null>(null);
  const yearEndRef = useRef<Date | null>(null);
  const allIdsRef = useRef<string[]>([]);

  useEffect(() => {
    visiblePlanetsRef.current = visiblePlanets;
  }, [visiblePlanets]);

  useEffect(() => {
    const svgEl = document.querySelector("#MandalaSvg");
    if (!(svgEl instanceof SVGSVGElement)) return;

    svgRef.current = svgEl;
    injectArcStyles();

    return () => {
      const svg = svgRef.current;
      if (!svg) return;

      // remove only generated segment groups
      for (const id of BODY_ORDER) {
        const segGroup = svg.querySelector(`#${id}-segments`);
        if (segGroup instanceof SVGGElement) segGroup.remove();
      }

      // clear labels, but don’t remove the layer node
      const labelLayer = svg.querySelector("#GateLabels");
      if (labelLayer instanceof SVGGElement) labelLayer.innerHTML = "";
    };
  }, []);

  function applySelectedClass(svg: SVGSVGElement, selected: HoverInfo | null) {
    svg.querySelectorAll(".seg-wrap.is-selected").forEach((el) => el.classList.remove("is-selected"));
    if (!selected) return;

    const { key } = selected;
    const selector = `.seg-wrap[data-seg-key="${key}"]`;
    const el = svg.querySelector(selector);


    if (el) el.classList.add("is-selected");
  }

  function validateSegmentsDev(
    planetId: string,
    segments: { start: string; end: string }[],
    yearStartMs: number,
    yearEndMs: number
  ) {
    // Dev-only guard
    if (process.env.NODE_ENV === "production") return;

    const tolMs = 5; // tiny tolerance for parsing/rounding

    if (!segments?.length) {
      console.warn(`[segments][${planetId}] empty segments array`);
      return;
    }

    const firstStart = Date.parse(segments[0].start);
    const lastEnd = Date.parse(segments[segments.length - 1].end);

    if (Number.isNaN(firstStart) || Number.isNaN(lastEnd)) {
      console.warn(`[segments][${planetId}] invalid date parse in first/last segment`, {
        first: segments[0],
        last: segments[segments.length - 1],
      });
      return;
    }

    if (Math.abs(firstStart - yearStartMs) > tolMs) {
      console.warn(`[segments][${planetId}] first start != yearStart`, {
        yearStartMs,
        first: segments[0],
      });
    }

    if (Math.abs(lastEnd - yearEndMs) > tolMs) {
      console.warn(`[segments][${planetId}] last end != yearEnd`, {
        yearEndMs,
        last: segments[segments.length - 1],
      });
    }

    for (let i = 0; i < segments.length; i++) {
      const a = Date.parse(segments[i].start);
      const b = Date.parse(segments[i].end);

      if (Number.isNaN(a) || Number.isNaN(b)) {
        console.warn(`[segments][${planetId}] invalid date parse at i=${i}`, segments[i]);
        continue;
      }

      if (b <= a) {
        console.warn(`[segments][${planetId}] non-positive duration at i=${i}`, segments[i]);
      }

      if (i < segments.length - 1) {
        const nextStart = Date.parse(segments[i + 1].start);
        if (!Number.isNaN(nextStart) && Math.abs(b - nextStart) > tolMs) {
          console.warn(`[segments][${planetId}] seam gap/overlap between i=${i} and i=${i + 1}`, {
            left: segments[i],
            right: segments[i + 1],
          });
        }
      }
    }
  }


  async function fetchYearSegments(y: number): Promise<SegmentsPayload> {
    const res = await fetch(`/api/segments?year=${y}`);
    if (!res.ok) throw new Error(`segments fetch failed ${res.status}`);
    return res.json();
  }

  function getAllIds(svg: SVGSVGElement, transits: SegmentsPayload["transits"]) {
    // Only include bodies that actually exist in the payload
    return BODY_ORDER.filter((id) => transits[id]);
  }

  function getActiveIds(allIds: string[], vp: Record<string, boolean>) {
    return allIds.filter((id) => vp[id] !== false);
  }

  function rebuildActiveRings(svg: SVGSVGElement, activeIds: string[]) {
    const transits = transitsRef.current;
    const YEAR_START = yearStartRef.current;
    const YEAR_END = yearEndRef.current;
    if (!transits || !YEAR_START || !YEAR_END) return;

    // Clear labels and rebuild labels for currently-active rings.
    // (BuildRing currently writes labels into a shared GateLabels layer.)
    const labelLayer = svg.querySelector("#GateLabels");
    if (labelLayer instanceof SVGGElement) labelLayer.innerHTML = "";

    const prevRadius = prevRadiusRef.current;

    for (const id of activeIds) {
      const hadBefore = prevRadius.has(id);

      const built = buildSegmentedRing({
        svg,
        planetId: id,
        transits,
        yearStart: YEAR_START,
        yearEnd: YEAR_END,
        onHover,
        onSelect,
        arcCap: arcCapRef.current,
      });

      if (!built) continue;

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

  function applyVisibility(svg: SVGSVGElement, allIds: string[], vp: Record<string, boolean>) {
    for (const id of allIds) {
      const on = vp[id] !== false;

      const base = svg.querySelector(`#${id}`);
      if (base instanceof SVGCircleElement) base.style.display = on ? "" : "none";

      const segGroup = svg.querySelector(`#${id}-segments`);
      if (segGroup instanceof SVGGElement) segGroup.style.display = on ? "" : "none";
    }
  }

  async function initYear(y: number) {
    const svg = svgRef.current;
    if (!svg) return;

    const payload = await fetchYearSegments(y);

    const yearText = svg.querySelector("#YearLabel tspan");
    if (yearText) yearText.textContent = String(payload.year);

    transitsRef.current = payload.transits;
    yearStartRef.current = new Date(payload.year_start_utc);
    yearEndRef.current = new Date(payload.year_end_utc);

    const yearStartMs = yearStartRef.current.getTime();
    const yearEndMs = yearEndRef.current.getTime();

    // Dev-only: validate segment invariants per planet (seams, continuity, no negative lengths)
    for (const planetId of Object.keys(payload.transits)) {
      const planet = payload.transits[planetId];
      if (planet?.segments) {
        validateSegmentsDev(planetId, planet.segments, yearStartMs, yearEndMs);
      }
    }


    // clear any previously generated segment groups
    for (const id of BODY_ORDER) {
      const segGroup = svg.querySelector(`#${id}-segments`);
      if (segGroup instanceof SVGGElement) segGroup.remove();
    }

    // reset label content
    const labelLayer = svg.querySelector("#GateLabels");
    if (labelLayer instanceof SVGGElement) labelLayer.innerHTML = "";

    const allIds = getAllIds(svg, payload.transits);
    allIdsRef.current = allIds;

    const vp = visiblePlanetsRef.current;
    const activeIds = getActiveIds(allIds, vp);
    activeIdsRef.current = activeIds;


    applyRingLayout(svg, activeIds, ringLayout);
    updateCalendarOverlay(svg, year, activeIds, showCalendar);
    rebuildActiveRings(svg, activeIds);
    applyVisibility(svg, allIds, vp);
    applySelectedClass(svg, selected ?? null);

    // (optional debug)
    (window as any).transits = payload.transits;
    (window as any).YEAR_START = yearStartRef.current;
    (window as any).YEAR_END = yearEndRef.current;
  }

  function updateVisibleOnly() {
    const svg = svgRef.current;
    const transits = transitsRef.current;
    if (!svg || !transits) return;

    const allIds = allIdsRef.current;
    const vp = visiblePlanetsRef.current;
    const activeIds = getActiveIds(allIds, vp);
    activeIdsRef.current = activeIds;


    applyRingLayout(svg, activeIds, ringLayout);
    updateCalendarOverlay(svg, year, activeIds, showCalendar);

    // Rebuild active rings (no fetch). This keeps labels correct and allows radius animations.
    rebuildActiveRings(svg, activeIds);
    applyVisibility(svg, allIds, vp);
    applySelectedClass(svg, selected ?? null);

  }

  useEffect(() => {
    updateVisibleOnly();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ringLayout]);


  // Year change = fetch + rebuild
  useEffect(() => {
    initYear(year).catch(console.warn);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  useEffect(() => {
    arcCapRef.current = arcCap;
  }, [arcCap]);

  // Planet toggles = no fetch, just relayout + rebuild segments/labels from existing data
  useEffect(() => {
    updateVisibleOnly();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visiblePlanets]);

  useEffect(() => {
    updateVisibleOnly();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arcCap]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    applySelectedClass(svg, selected ?? null);
  }, [selected]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    updateCalendarOverlay(svg, year, activeIdsRef.current, !!showCalendar);
  }, [showCalendar, year, ringLayout]);


  return null;
}
