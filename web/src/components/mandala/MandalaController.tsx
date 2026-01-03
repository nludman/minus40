// PATH: src/components/mandala/client.tsx
//
// This file is the Mandala orchestration layer:
// - fetches yearly transit data
// - holds runtime refs (transits, rangeStart, rangeEnd, ids)
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

import { updateCalendarOverlay, updateDayOverlay } from "@/lib/mandala/overlays/calendarOverlay";
import { updateTodayOnly } from "@/lib/mandala/todayMarker";
import { extractUserGates, extractUserDefinedChannelKeys } from "@/lib/mandala/userOverlay";
import { wireYearLabelNav, applySelectedClass } from "@/lib/mandala/domInteractions";
import { fetchYearSegments, validateSegmentsDev } from "@/lib/mandala/segments/fetchYearSegments";
import { createMandalaRuntime } from "@/lib/mandala/runtime";

type MandalaClientProps = {
  year: number;
  yearReloadKey?: number;
  yearReloadMode?: "normal" | "reset";
  onYearReloadConsumed?: () => void;

  userReloadKey?: number; // reserved

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

  highlightGate?: number | null;
};

export default function MandalaController({
  year,
  visiblePlanets,
  onHover,
  onSelect,
  selected,
  arcCap = "butt",
  gapPx,
  ringLayout,
  showCalendar = true,
  yearReloadKey,
  yearReloadMode,
  onYearReloadConsumed,
  userReloadKey, // reserved, intentionally unused
  userChart,
  nav,
  onNavigate,
  highlightGate,
}: MandalaClientProps) {
  // One runtime object for all internal engine state
  const rtRef = useRef(createMandalaRuntime());

  // Prop mirrors (avoid stale closures)
  const visiblePlanetsRef = useRef<Record<string, boolean>>(visiblePlanets);
  const arcCapRef = useRef<"round" | "butt">(arcCap);
  const gapPxRef = useRef(gapPx);

  useEffect(() => {
    visiblePlanetsRef.current = visiblePlanets;
  }, [visiblePlanets]);

  useEffect(() => {
    arcCapRef.current = arcCap;
  }, [arcCap]);

  useEffect(() => {
    gapPxRef.current = gapPx;
  }, [gapPx]);

  // =========================
  // User overlay derivations
  // =========================
  useEffect(() => {
    const rt = rtRef.current;

    rt.userGates = extractUserGates(userChart);
    rt.userDefinedChannelKeys = extractUserDefinedChannelKeys(userChart);

    updateVisibleOnly();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userChart]);

  // =========================
  // Highlight gate (AI / focus)
  // =========================
  useEffect(() => {
    const svg = document.querySelector("#MandalaSvg") as SVGSVGElement | null;
    if (!svg) return;

    const gate = highlightGate ?? null;

    let raf1 = 0;
    let raf2 = 0;

    const apply = () => {
      // clear previous highlights
      svg.querySelectorAll(".seg-outline[data-ai-hl='1']").forEach((el) => {
        const p = el as SVGPathElement;
        p.removeAttribute("data-ai-hl");
        p.style.stroke = "";
        p.style.filter = "";
      });

      if (!gate) return;

      const hits = svg.querySelectorAll(`.seg-wrap[data-gate='${gate}'] .seg-outline`);

      hits.forEach((el) => {
        const p = el as SVGPathElement;

        p.setAttribute("data-ai-hl", "1");
        p.style.stroke = "rgba(0, 157, 255, 1)";
        p.style.opacity = "1";

        const currentW = Number(p.getAttribute("stroke-width")) || 0;
        if (currentW > 0) {
          p.style.strokeWidth = String(Math.max(1, currentW * 0.8));
        }

        p.style.filter = "none";
      });
    };

    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(apply);
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [highlightGate, year, arcCap, showCalendar, yearReloadKey, visiblePlanets, ringLayout, nav]);

  // =========================
  // Mount + base DOM wiring
  // =========================
  useEffect(() => {
    const svgEl = document.querySelector("#MandalaSvg");
    if (!(svgEl instanceof SVGSVGElement)) return;

    const rt = rtRef.current;
    rt.svg = svgEl;

    injectArcStyles();

    const cleanupYearLabel = wireYearLabelNav(svgEl, () => {
      onNavigate?.({ view: "calendar", span: "year", m: undefined });
    });

    return () => {
      const svg = rtRef.current.svg;
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
  }, [onNavigate]);

  // =========================
  // Helpers (ids + rebuilds)
  // =========================
  function getAllIds(transits: SegmentsPayload["transits"]) {
    return BODY_ORDER.filter((id) => transits[id]);
  }

  function getActiveIds(allIds: string[], vp: Record<string, boolean>) {
    return allIds.filter((id) => vp[id] !== false);
  }

  function rebuildActiveRings(svg: SVGSVGElement, activeIds: string[]) {
    const rt = rtRef.current;
    const transits = rt.transits;
    const RANGE_START = rt.rangeStart;
    const RANGE_END = rt.rangeEnd;

    if (!transits || !RANGE_START || !RANGE_END) return;

    // Clear labels and rebuild labels for currently-active rings.
    const labelLayer = svg.querySelector("#Layer-Labels") ?? svg.querySelector("#GateLabels");
    if (labelLayer instanceof SVGGElement) labelLayer.innerHTML = "";

    const prevRadius = rt.prevRadius;

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
          userGates: rt.userGates,
          userDefinedChannelKeys: rt.userDefinedChannelKeys,
        },

        timeMap: {
          view: rt.timeView,
          anchorMs: rt.anchorMs ?? undefined,
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

  // =========================
  // Core init (fetch + build)
  // =========================
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
    const rt = rtRef.current;
    const svg = rt.svg;
    if (!svg) return;

    const payload = await fetchYearSegments(y, reset, {
      view: nav?.view ?? "calendar",
      span: nav?.span ?? "year",
      m: typeof nav?.m === "number" ? nav.m : undefined,
      q: typeof nav?.q === "number" ? nav.q : undefined,
      ...opts,
    });

    const yearText = svg.querySelector("#YearLabel tspan");
    if (yearText) yearText.textContent = String(payload.year);

    // Store runtime data
    rt.transits = payload.transits;
    rt.rangeStart = new Date(payload.range_start_utc ?? payload.year_start_utc);
    rt.rangeEnd = new Date(payload.range_end_utc ?? payload.year_end_utc);
    rt.timeView = payload.view === "tracker" ? "tracker" : "calendar";
    rt.span = (payload as any).span ?? "year";
    rt.anchorMs = payload.anchor_utc ? Date.parse(payload.anchor_utc) : null;

    const yearStartMs = rt.rangeStart?.getTime() ?? Date.parse(payload.year_start_utc);
    const yearEndMs = rt.rangeEnd?.getTime() ?? Date.parse(payload.year_end_utc);

    // Dev-only: validate segment invariants per planet
    for (const planetId of Object.keys(payload.transits)) {
      const planet = payload.transits[planetId];
      if (planet?.segments) validateSegmentsDev(planetId, planet.segments, yearStartMs, yearEndMs);
    }

    // clear any previously generated segment groups
    for (const id of BODY_ORDER) {
      const segGroup = svg.querySelector(`#${id}-segments`);
      if (segGroup instanceof SVGGElement) segGroup.remove();
    }

    const labelLayer = svg.querySelector("#Layer-Labels") ?? svg.querySelector("#GateLabels");
    if (labelLayer instanceof SVGGElement) labelLayer.innerHTML = "";

    // ids
    const allIds = getAllIds(payload.transits);
    rt.allIds = allIds;

    const vp = visiblePlanetsRef.current;
    const activeIds = getActiveIds(allIds, vp);
    rt.activeIds = activeIds;

    // layout + overlays
    applyRingLayout(svg, activeIds, ringLayout);

    const isCalendarView = rt.timeView === "calendar";
    const mode = nav?.span === "month" && typeof nav?.m === "number" ? "month" : "year";

    updateCalendarOverlay(svg, year, activeIds, !!showCalendar && isCalendarView, {
      mode,
      selectedMonth: nav?.m,
      onMonthClick: (m) => onNavigate?.({ view: "calendar", span: "month", m }),
    });

    const month = typeof nav?.m === "number" ? nav.m : new Date().getUTCMonth();

    updateDayOverlay(svg, year, month, activeIds, !!showCalendar && isCalendarView && mode === "month");

    // build rings + visibility + selection
    rebuildActiveRings(svg, activeIds);
    applyVisibility(svg, allIds, vp);
    applySelectedClass(svg, selected ?? null);

    // render Today marker immediately (no rebuild)
    updateTodayOnly({
      svg,
      transits: rt.transits,
      rangeStartMs: rt.rangeStart?.getTime() ?? null,
      rangeEndMs: rt.rangeEnd?.getTime() ?? null,
      view: rt.timeView,
      anchorMs: rt.anchorMs,
      activeIds: rt.activeIds,
      ensureTodayLayer,
    });

    // optional debug
    (window as any).transits = payload.transits;
    (window as any).RANGE_START = rt.rangeStart;
    (window as any).RANGE_END = rt.rangeEnd;
    (window as any).TIME_VIEW = rt.timeView;
    (window as any).ANCHOR_UTC = payload.anchor_utc ?? null;
  }

  function updateVisibleOnly(opts?: { rebuild?: boolean }) {
    const rt = rtRef.current;
    const svg = rt.svg;
    const transits = rt.transits;
    if (!svg || !transits) return;

    const allIds = rt.allIds;
    const vp = visiblePlanetsRef.current;
    const activeIds = getActiveIds(allIds, vp);
    rt.activeIds = activeIds;

    applyRingLayout(svg, activeIds, ringLayout);

    const isCalendarView = rt.timeView === "calendar";
    const mode = nav?.span === "month" && typeof nav?.m === "number" ? "month" : "year";

    updateCalendarOverlay(svg, year, activeIds, !!showCalendar && isCalendarView, {
      mode,
      selectedMonth: nav?.m,
      onMonthClick: (m) => onNavigate?.({ view: "calendar", span: "month", m }),
    });

    const month = typeof nav?.m === "number" ? nav.m : new Date().getUTCMonth();

    updateDayOverlay(svg, year, month, activeIds, !!showCalendar && isCalendarView && mode === "month");

    // keep today marker up-to-date
    updateTodayOnly({
      svg,
      transits,
      rangeStartMs: rt.rangeStart?.getTime() ?? null,
      rangeEndMs: rt.rangeEnd?.getTime() ?? null,
      view: rt.timeView,
      anchorMs: rt.anchorMs,
      activeIds: rt.activeIds,
      ensureTodayLayer,
    });

    if (opts?.rebuild !== false) {
      rebuildActiveRings(svg, activeIds);
    }

    applyVisibility(svg, allIds, vp);
    applySelectedClass(svg, selected ?? null);
  }

  // ringLayout changes require rebuilding segment paths
  useEffect(() => {
    updateVisibleOnly();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ringLayout]);

  // fetch on year/nav changes (and reset)
  useEffect(() => {
    const wantsReset = yearReloadMode === "reset";

    initYear(year, wantsReset)
      .catch(console.warn)
      .finally(() => {
        if (wantsReset) onYearReloadConsumed?.();
      });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, yearReloadKey, nav?.view, nav?.span, nav?.m, nav?.q]);

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
    const svg = rtRef.current.svg;
    if (!svg) return;
    applySelectedClass(svg, selected ?? null);
  }, [selected]);

  // ============================================================
  // REAL-TIME UPDATE (INTENTIONAL)
  // Today marker ONLY
  // ============================================================
  useEffect(() => {
    const id = window.setInterval(() => {
      const rt = rtRef.current;

      updateTodayOnly({
        svg: rt.svg,
        transits: rt.transits,
        rangeStartMs: rt.rangeStart?.getTime() ?? null,
        rangeEndMs: rt.rangeEnd?.getTime() ?? null,
        view: rt.timeView,
        anchorMs: rt.anchorMs,
        activeIds: rt.activeIds,
        ensureTodayLayer,
      });
    }, 15_000);

    return () => window.clearInterval(id);
  }, []);

  return null;
}
