// src/lib/mandala/buildRing.ts
import { gateColors } from "@/lib/gateColors";
import { clamp01, polarToXY } from "./geometry";
import { createGateLabel, ensureLabelLayer } from "./svgDom";
import type { SegmentsPayload, HoverInfo } from "./constants";

type BuildRingArgs = {
  svg: SVGSVGElement;
  planetId: string;
  transits: SegmentsPayload["transits"];
  yearStart: Date;
  yearEnd: Date;
  onHover?: (info: HoverInfo | null) => void;
  onSelect?: (info: HoverInfo | null) => void;
  arcCap?: "round" | "butt";
};

function arcPathD(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number
) {
  // Draw clockwise from startDeg to endDeg (degrees in "math space" where 0° is at 3 o'clock)
  // We are using degrees already mapped to SVG coords (via polarToXY helper).
  const delta = ((endDeg - startDeg) % 360 + 360) % 360; // 0..359
  const largeArcFlag = delta > 180 ? 1 : 0;
  const sweepFlag = 1; // clockwise

  const start = polarToXY(cx, cy, r, startDeg);
  const end = polarToXY(cx, cy, r, endDeg);

  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} ${sweepFlag} ${end.x} ${end.y}`;
}

function makeArcPath(
  d: string,
  className: string,
  stroke: string,
  strokeWidth: number,
  linecap: "round" | "butt" = "round"
) {
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
  p.setAttribute("d", d);
  p.setAttribute("class", className);
  p.setAttribute("fill", "none");
  p.setAttribute("stroke", stroke);
  p.setAttribute("stroke-width", String(strokeWidth));
  p.setAttribute("stroke-linecap", linecap);
  p.setAttribute("stroke-linejoin", "round");
  return p;
}

type MoonPhaseSeg = {
  start: string;
  end: string;
  phase: "waxing" | "waning";
  gate: number; // we'll use 0=waxing, 1=waning for hover + coloring
};

function isoZ(ms: number) {
  return new Date(ms).toISOString();
}

// Approximate lunation model (strong enough for UI rhythm; upgradeable later to Swiss Ephemeris exact events)
function buildMoonPhaseSegments(yearStart: Date, yearEnd: Date): MoonPhaseSeg[] {
  const SYNODIC_DAYS = 29.530588853; // mean synodic month
  const SYNODIC_MS = SYNODIC_DAYS * 24 * 60 * 60 * 1000;

  // Common reference new moon epoch: 2000-01-06 18:14 UTC (approx, widely used)
  const EPOCH_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14, 0);

  const startMs = yearStart.getTime();
  const endMs = yearEnd.getTime();

  // Find the lunation index k near the year start
  const k0 = Math.floor((startMs - EPOCH_NEW_MOON_MS) / SYNODIC_MS) - 2;

  const segs: MoonPhaseSeg[] = [];

  let prevNew = EPOCH_NEW_MOON_MS + k0 * SYNODIC_MS;

  // Step forward through new moons until we cover the year
  for (let k = k0; k < k0 + 40; k++) {
    const newMoon = EPOCH_NEW_MOON_MS + k * SYNODIC_MS;
    const nextNewMoon = EPOCH_NEW_MOON_MS + (k + 1) * SYNODIC_MS;
    const fullMoon = newMoon + SYNODIC_MS / 2;

    // Clip to year window; we still want segments that overlap the year
    const waxA = Math.max(newMoon, startMs);
    const waxB = Math.min(fullMoon, endMs);
    if (waxB > waxA) {
      segs.push({
        start: isoZ(waxA),
        end: isoZ(waxB),
        phase: "waxing",
        gate: 0,
      });
    }

    const wanA = Math.max(fullMoon, startMs);
    const wanB = Math.min(nextNewMoon, endMs);
    if (wanB > wanA) {
      segs.push({
        start: isoZ(wanA),
        end: isoZ(wanB),
        phase: "waning",
        gate: 1,
      });
    }

    // Stop once we've fully passed the year
    if (newMoon > endMs && prevNew > endMs) break;
    prevNew = newMoon;
  }

  return segs;
}


export function buildSegmentedRing({
  svg,
  planetId,
  transits,
  yearStart,
  yearEnd,
  onHover,
  onSelect,
  arcCap = "butt", // ✅ default stays butt
}: BuildRingArgs) {

  const base = svg.querySelector(`#${planetId}`) as SVGCircleElement | null;
  //const ARC_CAP: SVGLineCap = "butt"; // "round" | "butt"

  if (!base) {
    console.warn(`Missing circle with id="${planetId}" in SVG`);
    return null;
  }

  const cx = parseFloat(base.getAttribute("cx") || "0");
  const cy = parseFloat(base.getAttribute("cy") || "0");
  const r = parseFloat(base.getAttribute("r") || "0");
  const sw = parseFloat(base.getAttribute("stroke-width") || "20");

  // =====================
  // Stroke width tuning
  // =====================

  // TEMP: global multiplier for fast visual testing
  const STROKE_SCALE = 1.1; // try 0.7, 0.85, 1.1, 1.25

  const swScaled = sw * STROKE_SCALE;


  const OUTLINE_EXTRA = 2;
  const BASE_INSET = 4;
  const swNow = swScaled - BASE_INSET;


  // ✅ Round caps visually extend past the arc endpoints by ~ half the stroke width.
  // To prevent adjacent segments from overlapping in ROUND mode,
  // trim the arc start/end angles by that amount (converted to degrees).
  const MAX_LAYER_STROKE = Math.max(swNow, swScaled + OUTLINE_EXTRA);
  const CAP_TRIM_DEG =
    arcCap === "round" ? ((MAX_LAYER_STROKE / 2) / r) * (180 / Math.PI) : 0;


  const C = 2 * Math.PI * r;

  // Hide original guide circle
  base.style.display = "none";

  // Create/clear group
  let g = svg.querySelector(`#${planetId}-segments`);
  if (g instanceof SVGGElement) {
    g.innerHTML = "";
  } else {
    g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("id", `${planetId}-segments`);
    base.insertAdjacentElement("afterend", g);
  }

  const planet = transits[planetId];
  const isMoonRound = planetId === "Moon" && arcCap === "round";

  // In butt mode, Moon stays EXACT (gate segments from data).
  // In round mode, Moon becomes lunation segments (waxing/waning).
  const segments = isMoonRound
    ? buildMoonPhaseSegments(yearStart, yearEnd)
    : planet?.segments;

  if (!Array.isArray(segments)) {
    console.warn(`No segments found for ${planetId}`);
    return null;
  }


  const yearStartMs = yearStart.getTime();
  const yearEndMs = yearEnd.getTime();
  const yearTotalMs = yearEndMs - yearStartMs;

  // Padding between segments as an ANGLE, not pixels.
  // This keeps gaps visually consistent even when the ring radius changes
  // (which happens when you toggle planets / relayout radii).
  const PAD_DEG = 0.22; // tweak 0.12–0.35 to taste
  const padFracBase = PAD_DEG / 360;



  // Optional: draw a true 12 o’clock seam tick for debugging
  const DEBUG_SEAM = false;
  if (DEBUG_SEAM) {
    const seamId = `${planetId}-seam-debug`;
    svg.querySelector(`#${seamId}`)?.remove();
    const seam = document.createElementNS("http://www.w3.org/2000/svg", "line");
    seam.setAttribute("id", seamId);
    seam.setAttribute("x1", String(cx));
    seam.setAttribute("y1", String(cy));
    seam.setAttribute("x2", String(cx));
    seam.setAttribute("y2", String(cy - (r + 40)));
    seam.setAttribute("stroke", "rgba(0,255,255,0.8)");
    seam.setAttribute("stroke-width", "2");
    svg.appendChild(seam);
  }

  for (const seg of segments) {
    const segStartMs = new Date(seg.start).getTime();
    const segEndMs = new Date(seg.end).getTime();

    // Clip segment to year window
    const clippedStartMs = Math.max(segStartMs, yearStartMs);
    const clippedEndMs = Math.min(segEndMs, yearEndMs);
    const segKey = `${planetId}:${seg.gate}:${seg.start}:${seg.end}`;

    if (clippedEndMs <= clippedStartMs) continue;

    let startFrac = (clippedStartMs - yearStartMs) / yearTotalMs;
    let endFrac = (clippedEndMs - yearStartMs) / yearTotalMs;

    startFrac = clamp01(startFrac);
    endFrac = clamp01(endFrac);

    // Apply padding — but never let padding eat small segments.
    // Cap padding to a % of the segment span so fast movers (Moon) still render.
    const spanFrac = endFrac - startFrac;
    const padFrac = Math.min(padFracBase, spanFrac * 0.18); // max 18% each side

    startFrac += padFrac;
    endFrac -= padFrac;


    const EPS = 1e-6;
    startFrac = Math.max(0, Math.min(1 - EPS, startFrac));
    endFrac = Math.max(0, Math.min(1 - EPS, endFrac));
    if (endFrac <= startFrac) continue;

    // Convert fraction to degrees where 0 at 12 o'clock.
    // Our polarToXY expects angleDeg where 0 is at 3 o'clock.
    // So we subtract 90° to rotate 12 o'clock to 0-frac.
    let startDeg = startFrac * 360 - 90;
    let endDeg = endFrac * 360 - 90;

    if (CAP_TRIM_DEG > 0) {
      const delta = ((endDeg - startDeg) % 360 + 360) % 360; // cw span in degrees
      const eps = 1e-4;

      // Strong foundation:
      // trim as much as we can without ever deleting the segment
      const trim = Math.max(0, Math.min(CAP_TRIM_DEG, delta / 2 - eps));

      startDeg += trim;
      endDeg -= trim;
    }




    // Wrap group with events
    const wrap = document.createElementNS("http://www.w3.org/2000/svg", "g");
    wrap.setAttribute("class", "seg-wrap");
    (wrap as any).dataset.planet = planetId;
    (wrap as any).dataset.gate = String(seg.gate);
    (wrap as any).dataset.segKey = segKey;


    wrap.addEventListener("mouseenter", () =>
      onHover?.({ planet: planetId, gate: seg.gate, start: seg.start, end: seg.end, key: segKey })
    );
    wrap.addEventListener("mouseleave", () => onHover?.(null));


    wrap.addEventListener("click", (e) => {
      e.stopPropagation();
      svg.querySelectorAll(".seg-wrap.is-selected").forEach((el) => el.classList.remove("is-selected"));
      wrap.classList.add("is-selected");
      onSelect?.({ planet: planetId, gate: seg.gate, start: seg.start, end: seg.end, key: segKey });
    });

    // Helper: append one arc segment (outline/base/color)
    const appendArc = (d: string) => {
      const strokeColor = isMoonRound
        ? (seg as any).phase === "waxing"
          ? "rgba(255,255,255,0.95)"
          : "rgba(255,255,255,0.35)"
        : gateColors[(seg as any).gate] || "#fff";

      const outline = makeArcPath(
        d,
        "seg-outline",
        "rgba(255,255,255,0.22)",
        swScaled + OUTLINE_EXTRA,
        arcCap
      );

      const baseArc = makeArcPath(d, "seg-base", "#ffffff", swNow, arcCap);

      // ✅ single color path, using strokeColor
      const colorArc = makeArcPath(d, "seg-color", strokeColor, swNow, arcCap);

      wrap.appendChild(outline);
      wrap.appendChild(baseArc);
      wrap.appendChild(colorArc);
    };


    // If the segment crosses the seam (endDeg < startDeg in our rotated space),
    // split into two arcs: [start -> 270]?? actually the seam is at -90deg (12 o'clock).
    // Easiest is to split by fraction: if endFrac < startFrac, but we already ensured endFrac > startFrac.
    // However the "deg" can wrap due to -90 shift; so detect crossing by raw fraction window instead:
    // A segment "crosses seam" only if it was originally crossing year boundary; but our year clipping prevents that.
    // Still, for safety, handle deg wrap: if endDeg <= startDeg, split at (360-90)=270deg boundary.
    if (endDeg <= startDeg) {
      // Part 1: start -> (360-90)=270
      appendArc(arcPathD(cx, cy, r, startDeg, 270));
      // Part 2: -90 -> end
      appendArc(arcPathD(cx, cy, r, -90, endDeg));
    } else {
      appendArc(arcPathD(cx, cy, r, startDeg, endDeg));
    }

    (g as SVGGElement).appendChild(wrap);

    // Labels
    const MIN_LABEL_DAYS = 7;
    const segDays = (clippedEndMs - clippedStartMs) / (24 * 60 * 60 * 1000);

    if (segDays >= MIN_LABEL_DAYS) {
      const labelLayer = ensureLabelLayer(svg);

      // Dedupe per planet+gate
      const key = segKey; // unique per occurrence

      if (labelLayer.querySelector(`[data-label-key="${key}"]`)) continue;

      const midFrac = (startFrac + endFrac) / 2;
      const midDeg = midFrac * 360 - 90;
      const pos = polarToXY(cx, cy, r, midDeg);

      const label = createGateLabel(String(seg.gate));
      label.setAttribute("x", String(pos.x));
      label.setAttribute("y", String(pos.y));
      label.setAttribute("opacity", "0.7");
      (label as any).dataset.labelKey = key;

      labelLayer.appendChild(label);
    }
  }

  return { C };
}
