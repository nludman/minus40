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
import type { UserChartPayload } from "@/lib/userChartCache";
import { ensureTodayLayer } from "@/lib/mandala/svgDom";
import { clamp01 } from "@/lib/mandala/geometry";
import { polarToXY } from "@/lib/mandala/geometry";



type MandalaClientProps = {
  year: number;
  yearReloadKey?: number;
  yearReloadMode?: "normal" | "reset";
  onYearReloadConsumed?: () => void;
  userReloadKey?: number; // not used yet, but reserved
  visiblePlanets: Record<string, boolean>;
  onHover?: (info: HoverInfo | null) => void;
  onSelect?: (info: HoverInfo | null) => void;
  selected?: HoverInfo | null;
  arcCap?: "round" | "butt";
  ringLayout?: RingLayoutKnobs;
  showCalendar?: boolean;
  userChart?: UserChartPayload | null;
  gapPx?: {
    round?: number;
    butt?: number;
  };
  nav?: {
    view?: "calendar" | "tracker";
    span?: "year" | "quarter" | "month" | "week";
    m?: number;
    q?: number;
  };
  onNavigate?: (patch: {
    view?: "calendar" | "tracker";
    span?: "year" | "quarter" | "month" | "week";
    m?: number;
    q?: number;
  }) => void;

};

function timeToDeg(
  tMs: number,
  rangeStartMs: number,
  rangeEndMs: number,
  view: "calendar" | "tracker",
  anchorMs?: number | null
) {
  const total = rangeEndMs - rangeStartMs;
  if (total <= 0) return -90;

  if (view === "tracker") {
    if (!anchorMs) {
      const frac = (tMs - rangeStartMs) / total;
      return clamp01(frac) * 360 - 90;
    }
    const offset = (tMs - anchorMs) / total;
    return 90 - offset * 360;
  }

  const frac = (tMs - rangeStartMs) / total;
  return clamp01(frac) * 360 - 90;
}


function extractUserGates(userChart?: any): Set<number> {
  const out = new Set<number>();
  const d = userChart?.data;

  const derivedGates = d?.derived?.userGates;
  if (Array.isArray(derivedGates)) {
    return new Set<number>(derivedGates.filter((g: any) => typeof g === "number"));
  }


  // Preferred structure (what your UserChartVisual normalizes)
  const designByPlanet = d?.designByPlanet;
  const personalityByPlanet = d?.personalityByPlanet;

  for (const src of [designByPlanet, personalityByPlanet]) {
    if (!src) continue;
    for (const k of Object.keys(src)) {
      const v = src[k];
      if (typeof v === "number") out.add(v);
      else if (v && typeof v.gate === "number") out.add(v.gate);
    }
  }

  // Fallback if someone uploads arrays
  const designArr: unknown = d?.designGates;
  const persArr: unknown = d?.personalityGates;
  if (Array.isArray(designArr)) designArr.forEach((g) => typeof g === "number" && out.add(g));
  if (Array.isArray(persArr)) persArr.forEach((g) => typeof g === "number" && out.add(g));

  return out;
}

function extractUserDefinedChannelKeys(userChart?: any): Set<string> {
  const out = new Set<string>();
  const d = userChart?.data;

  // Accept a few possible shapes:
  // - d.definedChannels = [[21,45], [37,40]] or ["21-45", "37-40"]
  // - d.channels / d.definedChannelPairs similar
  const candidates =
    d?.definedChannels ??
    d?.definedChannelPairs ??
    d?.channels ??
    null;

  if (!candidates) return out;

  const addPair = (a: number, b: number) => {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);
    out.add(`${lo}-${hi}`);
  };

  if (Array.isArray(candidates)) {
    for (const item of candidates) {
      if (Array.isArray(item) && item.length === 2) {
        const a = Number(item[0]);
        const b = Number(item[1]);
        if (Number.isFinite(a) && Number.isFinite(b)) addPair(a, b);
      } else if (typeof item === "string") {
        const m = item.match(/(\d+)\s*[-–]\s*(\d+)/);
        if (m) addPair(Number(m[1]), Number(m[2]));
      } else if (item && typeof item === "object") {
        // e.g. { a: 21, b: 45 } or { gateA, gateB }
        const a = Number((item as any).a ?? (item as any).gateA);
        const b = Number((item as any).b ?? (item as any).gateB);
        if (Number.isFinite(a) && Number.isFinite(b)) addPair(a, b);
      }
    }
  }

  return out;
}

function wireYearLabelNav(
  svg: SVGSVGElement,
  onClick?: () => void
) {
  const el = svg.querySelector("#YearLabel") as SVGGElement | null;
  if (!el) return () => { };

  el.style.cursor = "pointer";
  el.style.pointerEvents = "all";

  const onEnter = () => el.classList.add("is-hovered");
  const onLeave = () => el.classList.remove("is-hovered");
  const onTap = (e: Event) => {
    e.stopPropagation();
    onClick?.();
  };

  el.addEventListener("pointerenter", onEnter);
  el.addEventListener("pointerleave", onLeave);
  el.addEventListener("click", onTap);

  return () => {
    el.removeEventListener("pointerenter", onEnter);
    el.removeEventListener("pointerleave", onLeave);
    el.removeEventListener("click", onTap);
  };
}


function updateCalendarOverlay(
  svg: SVGSVGElement,
  year: number,
  activeIds: string[],
  show: boolean,
  opts?: {
    mode?: "year" | "month";      // NEW
    selectedMonth?: number;       // NEW (0..11)
    onMonthClick?: (m: number) => void;
  }
) {

  const NS = "http://www.w3.org/2000/svg";

  // Ensure group exists (in canonical underlay layer)
  const underlays =
    (svg.querySelector("#Layer-Underlays") as SVGGElement | null) ?? svg;

  let g = underlays.querySelector("#CalendarOverlay") as SVGGElement | null;
  if (!g) {
    g = document.createElementNS(NS, "g");
    g.setAttribute("id", "CalendarOverlay"); //here?
    underlays.appendChild(g);
  }

  // Allow interaction on month labels, but disable pointer events on non-interactive shapes below.
  g.setAttribute("pointer-events", "auto");


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

  const mode = opts?.mode ?? "year";

  // Base positioning (year mode)
  let lineInner = outerEdge - 26;
  let lineOuter = outerEdge + 16;
  let labelR = outerEdge + 34;

  // In month mode, push month wheel outward to make room for day wheel
  if (mode === "month") {
    const bump = 64; // tune later
    lineInner += bump;
    lineOuter += bump;
    labelR += bump;
  }


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

    // ✅ important: boundary lines should never capture pointer events
    line.setAttribute("pointer-events", "none");

    g.appendChild(line);

    // Optional: arced label around outer edge
    // We'll create a small arc path centered around the month midpoint.
    // Keep arcs short so the label doesn't wrap too far.

    const isActiveMonth = mode === "month" && opts?.selectedMonth === m;

    // Font sizing (computed BEFORE hit geometry so hit can track it)
    const baseFont = Math.max(22, Math.min(28, Math.round(labelR / 30)));
    const fontSize = isActiveMonth ? Math.round(baseFont * 1.35) : baseFont;

    // Label arc span
    const arcSpanDeg = isActiveMonth ? 34 : 20; // active month gets more space
    const startDeg = midAng - arcSpanDeg / 2;
    const endDeg = midAng + arcSpanDeg / 2;

    // ---- Visual label path (defs-only; used by textPath) ----
    const start = polarToXY(cx, cy, labelR, startDeg);
    const end = polarToXY(cx, cy, labelR, endDeg);

    const path = document.createElementNS(NS, "path");
    const pathId = `monthLabelPath-${year}-${m}`;
    path.setAttribute("id", pathId);
    path.setAttribute("d", `M ${start.x} ${start.y} A ${labelR} ${labelR} 0 0 1 ${end.x} ${end.y}`);

    // ✅ critical: arc paths are layout-only, never interactive
    path.setAttribute("pointer-events", "none");
    defs.appendChild(path);

    // ---- Invisible hit arc (stable pointer target; centered on glyphs) ----
    // Push hit radius slightly outward and scale stroke width with font size.
    const hitR = labelR + fontSize * 0.4; // tune 0.25..0.55 (higher = more outward)
    const hitW = Math.max(18, Math.round(fontSize * 1.45)); // tune 1.0..1.6

    const hitStart = polarToXY(cx, cy, hitR, startDeg);
    const hitEnd = polarToXY(cx, cy, hitR, endDeg);
    const hitD = `M ${hitStart.x} ${hitStart.y} A ${hitR} ${hitR} 0 0 1 ${hitEnd.x} ${hitEnd.y}`;

    const hit = document.createElementNS(NS, "path");
    hit.setAttribute("d", hitD);
    hit.setAttribute("fill", "none");
    hit.setAttribute("stroke", "rgba(0,0,0,0.001)"); // invisible but hittable
    hit.setAttribute("stroke-width", String(hitW));
    hit.setAttribute("pointer-events", "stroke");
    hit.style.cursor = opts?.onMonthClick ? "pointer" : "default";
    g.appendChild(hit); // append to g (not defs) so it can receive events

    if (opts?.onMonthClick) {
      hit.style.cursor = "pointer";

      hit.addEventListener("click", (e) => {
        e.stopPropagation();
        opts.onMonthClick?.(m);
      });
    } else {
      hit.style.cursor = "default";
    }


    const text = document.createElementNS(NS, "text");

    text.classList.add("month-label");
    text.dataset.active = isActiveMonth ? "1" : "0";



    // Hover pulse ONLY for non-active months
    if (!isActiveMonth) {
      hit.addEventListener("pointerenter", () => text.classList.add("is-hovered"));
      hit.addEventListener("pointerleave", () => text.classList.remove("is-hovered"));
    } else {
      text.classList.remove("is-hovered");
    }





    text.setAttribute("font-size", String(fontSize));
    text.setAttribute("letter-spacing", isActiveMonth ? "4.5" : "3");
    text.setAttribute("fill", isActiveMonth ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.65)");
    text.setAttribute("pointer-events", "none");



    const textPath = document.createElementNS(NS, "textPath");
    // Modern attribute: href
    textPath.setAttribute("href", `#${pathId}`);
    textPath.setAttribute("startOffset", "50%");
    textPath.setAttribute("text-anchor", "middle");
    textPath.textContent = monthNames[m];

    text.appendChild(textPath);
    g.appendChild(text);

  }
}

function updateDayOverlay(
  svg: SVGSVGElement,
  year: number,
  month: number,         // 0..11
  activeIds: string[],
  show: boolean
) {
  const NS = "http://www.w3.org/2000/svg";

  const underlays =
    (svg.querySelector("#Layer-Underlays") as SVGGElement | null) ?? svg;

  let g = underlays.querySelector("#DayOverlay") as SVGGElement | null;
  if (!g) {
    g = document.createElementNS(NS, "g");
    g.setAttribute("id", "DayOverlay");
    underlays.appendChild(g);
  }

  g.style.display = show ? "" : "none";
  if (!show) return;

  // Clear
  while (g.firstChild) g.removeChild(g.firstChild);

  // Center
  const cx = 600;
  const cy = 600;

  // Outer edge based on outermost ring (same method as month overlay)
  const firstId = activeIds[0];
  const base = firstId ? (svg.querySelector(`#${firstId}`) as SVGCircleElement | null) : null;
  const rMid = base ? parseFloat(base.getAttribute("r") || "0") : 0;
  const sw = base ? parseFloat(base.getAttribute("stroke-width") || "0") : 0;
  const outerEdge = rMid + sw / 2;

  // Day wheel sits BETWEEN rings and month labels (since month labels are bumped out)
  const wheelR = outerEdge + 34; // tune later (should be < month labelR in month mode)

  // Month boundaries in UTC
  const tStart = Date.UTC(year, month, 1, 0, 0, 0);
  const tEnd = Date.UTC(year, month + 1, 1, 0, 0, 0);
  const span = tEnd - tStart;

  // Days in month
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

  const defs = document.createElementNS(NS, "defs");
  g.appendChild(defs);

  // style knobs
  const tickInner = wheelR - 10;
  const tickOuter = wheelR + 10;
  const labelR = wheelR + 18;

  for (let d = 1; d <= daysInMonth; d++) {
    const t0 = Date.UTC(year, month, d, 0, 0, 0);
    const t1 = Date.UTC(year, month, d + 1, 0, 0, 0);

    const frac = (t0 - tStart) / span;
    const midFrac = ((t0 + t1) / 2 - tStart) / span;

    const ang = frac * 360 - 90;
    const midAng = midFrac * 360 - 90;

    // Tick line (not interactive)
    const line = document.createElementNS(NS, "line");
    const a = (ang * Math.PI) / 180;
    line.setAttribute("x1", String(cx + tickInner * Math.cos(a)));
    line.setAttribute("y1", String(cy + tickInner * Math.sin(a)));
    line.setAttribute("x2", String(cx + tickOuter * Math.cos(a)));
    line.setAttribute("y2", String(cy + tickOuter * Math.sin(a)));
    line.setAttribute("stroke", "rgba(255,255,255,0.18)");
    line.setAttribute("stroke-width", "1");
    line.setAttribute("pointer-events", "none");
    g.appendChild(line);

    // Label (small arced textPath)
    const arcSpanDeg = 10; // tune
    const startDeg = midAng - arcSpanDeg / 2;
    const endDeg = midAng + arcSpanDeg / 2;

    const start = polarToXY(cx, cy, labelR, startDeg);
    const end = polarToXY(cx, cy, labelR, endDeg);

    const path = document.createElementNS(NS, "path");
    const pathId = `dayLabelPath-${year}-${month}-${d}`;
    path.setAttribute("id", pathId);
    path.setAttribute(
      "d",
      `M ${start.x} ${start.y} A ${labelR} ${labelR} 0 0 1 ${end.x} ${end.y}`
    );
    path.setAttribute("pointer-events", "none");
    defs.appendChild(path);

    const text = document.createElementNS(NS, "text");
    text.setAttribute("pointer-events", "all"); // for now (later we can click days)
    text.setAttribute("fill", "rgba(255,255,255,0.55)");
    text.setAttribute("font-size", "14");
    text.setAttribute("letter-spacing", "1");


    const textPath = document.createElementNS(NS, "textPath");
    textPath.setAttribute("href", `#${pathId}`);
    textPath.setAttribute("startOffset", "50%");
    textPath.setAttribute("text-anchor", "middle");
    textPath.textContent = String(d);

    text.appendChild(textPath);
    g.appendChild(text);
  }
}


function renderTodayMarker(
  svg: SVGSVGElement,
  angleDeg: number,
  innerR: number,
  outerR: number
) {
  const NS = "http://www.w3.org/2000/svg";
  const g = ensureTodayLayer(svg);
  g.innerHTML = "";

  const cx = 600;
  const cy = 600;

  const a = (angleDeg * Math.PI) / 180;

  const p0 = { x: cx + innerR * Math.cos(a), y: cy + innerR * Math.sin(a) };
  const p1 = { x: cx + outerR * Math.cos(a), y: cy + outerR * Math.sin(a) };

  // Thicker needle (tune)
  const line = document.createElementNS(NS, "line");
  line.setAttribute("x1", String(p0.x));
  line.setAttribute("y1", String(p0.y));
  line.setAttribute("x2", String(p1.x));
  line.setAttribute("y2", String(p1.y));
  line.setAttribute("stroke", "rgba(255,255,255,0.75)");
  line.setAttribute("stroke-width", "3.5");
  line.setAttribute("stroke-linecap", "round");
  line.setAttribute("pointer-events", "none");
  g.appendChild(line);

  // Arrow tip (small triangle) at the outer end, pointing outward
  const tipLen = 12;   // length of arrow
  const tipWide = 10;  // width of arrow base

  // Direction outward is angle a. Perpendicular is a +/- 90deg
  const ux = Math.cos(a);
  const uy = Math.sin(a);
  const px = -uy;
  const py = ux;

  const tip = { x: p1.x + ux * tipLen, y: p1.y + uy * tipLen };
  const left = { x: p1.x + px * (tipWide / 2), y: p1.y + py * (tipWide / 2) };
  const right = { x: p1.x - px * (tipWide / 2), y: p1.y - py * (tipWide / 2) };

  const tri = document.createElementNS(NS, "path");
  tri.setAttribute(
    "d",
    `M ${left.x} ${left.y} L ${tip.x} ${tip.y} L ${right.x} ${right.y} Z`
  );
  tri.setAttribute("fill", "rgba(255,255,255,0.85)");
  tri.setAttribute("pointer-events", "none");
  g.appendChild(tri);

  // Optional: a subtle dot at the outer edge (reads as “marker”)
  const dot = document.createElementNS(NS, "circle");
  dot.setAttribute("cx", String(p1.x));
  dot.setAttribute("cy", String(p1.y));
  dot.setAttribute("r", "3");
  dot.setAttribute("fill", "rgba(255,255,255,0.9)");
  dot.setAttribute("pointer-events", "none");
  g.appendChild(dot);
}



export default function MandalaClient({
  year,
  visiblePlanets,
  onHover,
  onSelect,
  selected,
  arcCap = "butt",
  gapPx,
  ringLayout,
  showCalendar = true,

  // cache controls
  yearReloadKey,
  yearReloadMode,
  onYearReloadConsumed,

  // reserved for future user chart cache refresh
  userReloadKey,

  userChart,
  nav,
  onNavigate,


}: MandalaClientProps) {

  const prevRadiusRef = useRef<Map<string, number>>(new Map());
  const visiblePlanetsRef = useRef<Record<string, boolean>>(visiblePlanets);
  const arcCapRef = useRef<"round" | "butt">(arcCap);
  const gapPxRef = useRef(gapPx);

  const activeIdsRef = useRef<string[]>([]);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // “Data for the current year” (in-memory only; not a caching “system”)
  const transitsRef = useRef<SegmentsPayload["transits"] | null>(null);

  const rangeStartRef = useRef<Date | null>(null);
  const rangeEndRef = useRef<Date | null>(null);
  const timeViewRef = useRef<"calendar" | "tracker">("calendar");
  const anchorMsRef = useRef<number | null>(null);
  const spanRef = useRef<"year" | "quarter" | "month" | "week">("year");

  const allIdsRef = useRef<string[]>([]);

  const userGatesRef = useRef<Set<number>>(new Set());
  const userDefinedChannelKeysRef = useRef<Set<string>>(new Set());



  useEffect(() => {
    userGatesRef.current = extractUserGates(userChart);

    const keys = userChart?.data?.derived?.definedChannelKeys;
    userDefinedChannelKeysRef.current = new Set<string>(
      Array.isArray(keys) ? keys.filter((k) => typeof k === "string") : []
    );

    updateVisibleOnly();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userChart]);



  useEffect(() => {
    visiblePlanetsRef.current = visiblePlanets;
  }, [visiblePlanets]);

  useEffect(() => {
    const svgEl = document.querySelector("#MandalaSvg");
    if (!(svgEl instanceof SVGSVGElement)) return;

    svgRef.current = svgEl;
    injectArcStyles();

    const cleanupYearLabel = wireYearLabelNav(svgEl, () => {
      // click year label -> go back to year span
      onNavigate?.({ view: "calendar", span: "year", m: undefined });
    });


    return () => {
      const svg = svgRef.current;
      if (!svg) return;

      // remove only generated segment groups
      for (const id of BODY_ORDER) {
        const segGroup = svg.querySelector(`#${id}-segments`);
        if (segGroup instanceof SVGGElement) segGroup.remove();
      }

      // clear labels, but don’t remove the layer node
      const labelLayer = svg.querySelector("#Layer-Labels") ?? svg.querySelector("#GateLabels");
      if (labelLayer instanceof SVGGElement) labelLayer.innerHTML = "";

      cleanupYearLabel?.();

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


  async function fetchYearSegments(
    y: number,
    reset = false,
    opts?: {
      view?: "calendar" | "tracker";
      span?: "year" | "quarter" | "month" | "week";
      q?: number;
      m?: number;
      // tracker:
      anchorIso?: string;
      backDays?: number;
      forwardDays?: number;
      startIso?: string;
      endIso?: string;
    }
  ): Promise<SegmentsPayload> {
    const p = new URLSearchParams();
    p.set("year", String(y));
    if (reset) p.set("reset", "1");

    const view = opts?.view ?? "calendar";
    p.set("view", view);

    if (view === "calendar") {
      p.set("span", opts?.span ?? "year");
      if (typeof opts?.q === "number") p.set("q", String(opts.q));
      if (typeof opts?.m === "number") p.set("m", String(opts.m));
      if (opts?.startIso) p.set("start", opts.startIso);
      if (opts?.endIso) p.set("end", opts.endIso);
    } else {
      // tracker
      if (opts?.anchorIso) p.set("anchor", opts.anchorIso);
      if (typeof opts?.backDays === "number") p.set("backDays", String(opts.backDays));
      if (typeof opts?.forwardDays === "number") p.set("forwardDays", String(opts.forwardDays));
      if (opts?.startIso) p.set("start", opts.startIso);
      if (opts?.endIso) p.set("end", opts.endIso);
    }

    const res = await fetch(`/api/segments-year?${p.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch segments");
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

    const RANGE_START = rangeStartRef.current;
    const RANGE_END = rangeEndRef.current;

    if (!transits || !RANGE_START || !RANGE_END) return;


    // Clear labels and rebuild labels for currently-active rings.
    // (BuildRing currently writes labels into a shared GateLabels layer.)
    const labelLayer = svg.querySelector("#Layer-Labels") ?? svg.querySelector("#GateLabels");
    if (labelLayer instanceof SVGGElement) labelLayer.innerHTML = "";


    const prevRadius = prevRadiusRef.current;

    for (const id of activeIds) {
      const hadBefore = prevRadius.has(id);

      const built = buildSegmentedRing({
        svg,
        planetId: id,
        transits,
        yearStart: RANGE_START,
        yearEnd: RANGE_END,
        onHover,
        onSelect,
        arcCap: arcCapRef.current,
        gapPx: gapPxRef.current,

        overlay: {
          userGates: userGatesRef.current,
          userDefinedChannelKeys: userDefinedChannelKeysRef.current,
        },
        timeMap: {
          view: timeViewRef.current,
          anchorMs: anchorMsRef.current ?? undefined,
        },

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

  async function initYear(
    y: number,
    reset = false,
    opts?: {
      view?: "calendar" | "tracker";
      span?: "year" | "quarter" | "month" | "week";
      q?: number;
      m?: number;
      anchorIso?: string;
      backDays?: number;
      forwardDays?: number;
      startIso?: string;
      endIso?: string;
    }
  ) {
    const svg = svgRef.current;
    if (!svg) return;

    const payload = await fetchYearSegments(y, reset, {
      view: nav?.view ?? "calendar",
      span: nav?.span ?? "year",
      m: typeof nav?.m === "number" ? nav.m : undefined,
      q: typeof nav?.q === "number" ? nav.q : undefined,
    });

    const yearText = svg.querySelector("#YearLabel tspan");
    if (yearText) yearText.textContent = String(payload.year);

    transitsRef.current = payload.transits;

    rangeStartRef.current = new Date(payload.range_start_utc ?? payload.year_start_utc);
    rangeEndRef.current = new Date(payload.range_end_utc ?? payload.year_end_utc);

    timeViewRef.current = (payload.view === "tracker" ? "tracker" : "calendar");
    spanRef.current = (payload as any).span ?? "year";

    anchorMsRef.current = payload.anchor_utc ? Date.parse(payload.anchor_utc) : null;


    console.log("[range]", {
      view: timeViewRef.current,
      start: rangeStartRef.current?.toISOString(),
      end: rangeEndRef.current?.toISOString(),
    });


    const yearStartMs = rangeStartRef.current?.getTime() ?? Date.parse(payload.year_start_utc);
    const yearEndMs = rangeEndRef.current?.getTime() ?? Date.parse(payload.year_end_utc);


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

    const labelLayer = svg.querySelector("#Layer-Labels") ?? svg.querySelector("#GateLabels");
    if (labelLayer instanceof SVGGElement) labelLayer.innerHTML = "";


    const allIds = getAllIds(svg, payload.transits);
    allIdsRef.current = allIds;

    const vp = visiblePlanetsRef.current;
    const activeIds = getActiveIds(allIds, vp);
    activeIdsRef.current = activeIds;


    applyRingLayout(svg, activeIds, ringLayout);
    const isCalendarView = timeViewRef.current === "calendar";
    const canClickMonths = isCalendarView && spanRef.current === "year";

    const mode =
      nav?.span === "month" && typeof nav?.m === "number" ? "month" : "year";

    updateCalendarOverlay(svg, year, activeIds, !!showCalendar && isCalendarView, {
      mode,
      selectedMonth: nav?.m,
      onMonthClick: (m) => onNavigate?.({ view: "calendar", span: "month", m }),
    });

    // Day wheel only when month mode
    updateDayOverlay(
      svg,
      year,
      typeof nav?.m === "number" ? nav.m : new Date().getMonth(),
      activeIds,
      !!showCalendar && isCalendarView && mode === "month"
    );



    rebuildActiveRings(svg, activeIds);
    applyVisibility(svg, allIds, vp);
    applySelectedClass(svg, selected ?? null);

    // Render Today marker immediately (no rebuild)
    updateTodayOnly();


    // (optional debug)
    (window as any).transits = payload.transits;
    (window as any).RANGE_START = rangeStartRef.current;
    (window as any).RANGE_END = rangeEndRef.current;
    (window as any).TIME_VIEW = timeViewRef.current;
    (window as any).ANCHOR_UTC = payload.anchor_utc ?? null;

  }

  function zoomToMonth(m: number) {
    // month index 0..11
    initYear(year, false, { view: "calendar", span: "month", m }).catch(console.warn);
  }


  function rebuildOnly() {
    const svg = svgRef.current;
    if (!svg) return;
    rebuildActiveRings(svg, activeIdsRef.current);
    applySelectedClass(svg, selected ?? null);
  }

  function updateTodayOnly() {
    const svg = svgRef.current;
    const transits = transitsRef.current;
    if (!svg || !transits) return;

    const RS = rangeStartRef.current?.getTime();
    const RE = rangeEndRef.current?.getTime();
    if (!RS || !RE) return;

    const nowMs = Date.now();
    const deg = timeToDeg(nowMs, RS, RE, timeViewRef.current, anchorMsRef.current);

    const activeIds = activeIdsRef.current;
    const firstId = activeIds[0];
    const base = firstId ? (svg.querySelector(`#${firstId}`) as SVGCircleElement | null) : null;
    const rMid = base ? parseFloat(base.getAttribute("r") || "0") : 0;
    const sw = base ? parseFloat(base.getAttribute("stroke-width") || "0") : 0;
    const outerEdge = rMid + sw / 2;

    const inner = Math.max(0, outerEdge - 140);
    const outer = outerEdge + 20;

    renderTodayMarker(svg, deg, inner, outer);
  }


  function updateVisibleOnly(opts?: { rebuild?: boolean }) {
    const svg = svgRef.current;
    const transits = transitsRef.current;
    if (!svg || !transits) return;

    const allIds = allIdsRef.current;
    const vp = visiblePlanetsRef.current;
    const activeIds = getActiveIds(allIds, vp);
    activeIdsRef.current = activeIds;

    applyRingLayout(svg, activeIds, ringLayout);

    const isCalendarView = timeViewRef.current === "calendar";

    const mode =
      nav?.span === "month" && typeof nav?.m === "number" ? "month" : "year";

    updateCalendarOverlay(svg, year, activeIds, !!showCalendar && isCalendarView, {
      mode,
      selectedMonth: nav?.m,
      onMonthClick: (m) => onNavigate?.({ view: "calendar", span: "month", m }),
    });

    updateDayOverlay(
      svg,
      year,
      typeof nav?.m === "number" ? nav.m : new Date().getMonth(),
      activeIds,
      !!showCalendar && isCalendarView && mode === "month"
    );

    // Always keep today marker up-to-date
    updateTodayOnly();

    // Only rebuild segments/labels when needed
    if (opts?.rebuild !== false) {
      rebuildActiveRings(svg, activeIds);
    }

    applyVisibility(svg, allIds, vp);
    applySelectedClass(svg, selected ?? null);
  }

  useEffect(() => {
    updateVisibleOnly(); // ringLayout changes require rebuilding segment paths
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ringLayout]);


  useEffect(() => {
    const wantsReset = yearReloadMode === "reset";

    initYear(year, wantsReset)
      .catch(console.warn)
      .finally(() => {
        if (wantsReset) onYearReloadConsumed?.();
      });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, yearReloadKey, nav?.view, nav?.span, nav?.m, nav?.q]);


  useEffect(() => {
    arcCapRef.current = arcCap;
  }, [arcCap]);

  useEffect(() => {
    gapPxRef.current = gapPx;
  }, [gapPx]);

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
    updateVisibleOnly();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gapPx?.round, gapPx?.butt]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    applySelectedClass(svg, selected ?? null);
  }, [selected]);


  // ============================================================
  // REAL-TIME UPDATE (INTENTIONAL)
  // This interval MUST stay cheap.
  // - No rebuilds
  // - No relayout
  // - No overlays
  // - Today marker ONLY
  // ============================================================

  useEffect(() => {
    const id = window.setInterval(() => {
      updateTodayOnly();
    }, 15_000);

    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  return null;
}
