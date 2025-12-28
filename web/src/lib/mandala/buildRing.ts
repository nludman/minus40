// src/lib/mandala/buildRing.ts
import { gateColors } from "@/lib/gateColors";
import { clamp01, polarToXY } from "./geometry";
import { createGateLabel, ensureLabelLayer, ensureBaseCircle } from "./svgDom";
import type { SegmentsPayload, HoverInfo } from "./constants";
import { partnersForGate } from "@/lib/hd/channels";

type BuildRingArgs = {
  svg: SVGSVGElement;
  planetId: string;
  transits: SegmentsPayload["transits"];
  yearStart: Date;
  yearEnd: Date;
  onHover?: (info: HoverInfo | null) => void;
  onSelect?: (info: HoverInfo | null) => void;
  arcCap?: "round" | "butt";
  overlay?: {
    userGates?: Set<number>;
    userDefinedChannelKeys?: Set<string>;
  };
  timeMap?: {
    view: "calendar" | "tracker";
    anchorMs?: number; // required for tracker behavior
  };
  gapPx?: {
    round?: number; // per-edge gap in px
    butt?: number;  // per-edge gap in px
  };

};

function arcPathD(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  // Normalize delta to 0..359.999...
  const delta = ((endDeg - startDeg) % 360 + 360) % 360;
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
  gate: number;
};

function isoZ(ms: number) {
  return new Date(ms).toISOString();
}

// Approximate lunation model (upgradeable later)
function buildMoonPhaseSegments(yearStart: Date, yearEnd: Date): MoonPhaseSeg[] {
  const SYNODIC_DAYS = 29.530588853;
  const SYNODIC_MS = SYNODIC_DAYS * 24 * 60 * 60 * 1000;

  // 2000-01-06 18:14 UTC (approx)
  const EPOCH_NEW_MOON_MS = Date.UTC(2000, 0, 6, 18, 14, 0);

  const startMs = yearStart.getTime();
  const endMs = yearEnd.getTime();

  const k0 = Math.floor((startMs - EPOCH_NEW_MOON_MS) / SYNODIC_MS) - 2;

  const segs: MoonPhaseSeg[] = [];
  let prevNew = EPOCH_NEW_MOON_MS + k0 * SYNODIC_MS;

  for (let k = k0; k < k0 + 40; k++) {
    const newMoon = EPOCH_NEW_MOON_MS + k * SYNODIC_MS;
    const nextNewMoon = EPOCH_NEW_MOON_MS + (k + 1) * SYNODIC_MS;
    const fullMoon = newMoon + SYNODIC_MS / 2;

    const waxA = Math.max(newMoon, startMs);
    const waxB = Math.min(fullMoon, endMs);
    if (waxB > waxA) segs.push({ start: isoZ(waxA), end: isoZ(waxB), phase: "waxing", gate: 0 });

    const wanA = Math.max(fullMoon, startMs);
    const wanB = Math.min(nextNewMoon, endMs);
    if (wanB > wanA) segs.push({ start: isoZ(wanA), end: isoZ(wanB), phase: "waning", gate: 1 });

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
  arcCap = "butt",
  overlay,
  timeMap,
  gapPx
}: BuildRingArgs) {
  // ✅ Foundation: always ensure a base circle exists.
  const base = ensureBaseCircle(svg, planetId, 600, 600);

  // Ensure minimum attributes for geometry.
  if (!base.getAttribute("stroke-width")) base.setAttribute("stroke-width", "20");
  if (!base.getAttribute("r")) base.setAttribute("r", "200"); // placeholder; ringLayout will overwrite

  const cx = parseFloat(base.getAttribute("cx") || "0");
  const cy = parseFloat(base.getAttribute("cy") || "0");
  const r = parseFloat(base.getAttribute("r") || "0");
  const sw = parseFloat(base.getAttribute("stroke-width") || "20");

  // =====================
  // Stroke width tuning
  // =====================
  const STROKE_SCALE = 1.1;
  const swScaled = sw * STROKE_SCALE;

  const OUTLINE_EXTRA = 2;
  const BASE_INSET = 4;
  const swNow = swScaled - BASE_INSET;

  // ✅ FIX: cap trim should be based on the *actual painted arc width* (swNow),
  // NOT the cosmetic glow/outline width.
  const CAP_TRIM_DEG =
    arcCap === "round"
      ? ((swNow / 2) / Math.max(1, r)) * (180 / Math.PI) * 1.1 // tune 0.70..1.0
      : 0;

  // Keep guide circle in DOM (layout/geometry) but hide it cleanly
  base.setAttribute("stroke", "transparent");
  base.style.display = "";

  // ✅ Prefer a canonical layer if present
  const ringsLayer = (svg.querySelector("#Layer-Rings") as SVGGElement | null) ?? svg;

  // Create/clear group
  let g = ringsLayer.querySelector(`#${planetId}-segments`);
  if (g instanceof SVGGElement) {
    g.innerHTML = "";
  } else {
    g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("id", `${planetId}-segments`);
    ringsLayer.appendChild(g);
  }

  const planet = transits[planetId];
  const isMoonRound = planetId === "Moon" && arcCap === "round";
  const segments = isMoonRound ? buildMoonPhaseSegments(yearStart, yearEnd) : planet?.segments;

  if (!Array.isArray(segments)) {
    console.warn(`No segments found for ${planetId}`);
    return null;
  }

  const userGates = overlay?.userGates;
  const definedKeys = overlay?.userDefinedChannelKeys;

  const yearStartMs = yearStart.getTime();
  const yearEndMs = yearEnd.getTime();
  const yearTotalMs = yearEndMs - yearStartMs;

  const viewMode = timeMap?.view ?? "calendar";

  // time -> angle mapping (calendar or tracker)
  const timeToDeg = (tMs: number) => {
    if (viewMode === "tracker") {
      const anchor = timeMap?.anchorMs;
      if (!anchor) {
        const frac = (tMs - yearStartMs) / yearTotalMs;
        return clamp01(frac) * 360 - 90;
      }
      const offset = (tMs - anchor) / yearTotalMs;
      return 90 - offset * 360;
    }
    const frac = (tMs - yearStartMs) / yearTotalMs;
    return clamp01(frac) * 360 - 90;
  };

  // ==========================================================
  // GAP RULE (pixel-based)
  // ==========================================================
  // You said butt gap looks good; round gap is mostly CAP_TRIM. Keep this.
  const GAP_PX_PER_EDGE =
    arcCap === "round"
      ? (gapPx?.round ?? 0.5) // default round gap per-edge
      : (gapPx?.butt ?? 0.35); // default butt gap per-edge

  const gapDegBase = (GAP_PX_PER_EDGE / Math.max(1, r)) * (180 / Math.PI);
  const gapFracBase = gapDegBase / 360;

  // For full-span segments, we force a seam gap (also in pixels)
  const FULL_SPAN_SEAM_GAP_PX = arcCap === "round" ? 0.9 : 0.6;
  const fullSpanSeamGapDeg = (FULL_SPAN_SEAM_GAP_PX / Math.max(1, r)) * (180 / Math.PI);

  for (const seg of segments) {
    const segStartMs = new Date(seg.start).getTime();
    const segEndMs = new Date(seg.end).getTime();

    // Clip to year window
    const clippedStartMs = Math.max(segStartMs, yearStartMs);
    const clippedEndMs = Math.min(segEndMs, yearEndMs);
    if (clippedEndMs <= clippedStartMs) continue;

    const gateNum = Number((seg as any).gate);
    const segKey = `${planetId}:${gateNum}:${seg.start}:${seg.end}`;

    // Fractions in [0..1]
    let startFrac = (clippedStartMs - yearStartMs) / yearTotalMs;
    let endFrac = (clippedEndMs - yearStartMs) / yearTotalMs;

    startFrac = clamp01(startFrac);
    endFrac = clamp01(endFrac);

    // Apply gap (in fraction space), but never let it eat tiny segments
    const spanFrac0 = endFrac - startFrac;
    const edgeGapFrac = Math.min(gapFracBase, spanFrac0 * 0.18);
    startFrac += edgeGapFrac;
    endFrac -= edgeGapFrac;

    // Clamp away from exact 1.0 to reduce seam degeneracy
    const EPS = 1e-6;
    startFrac = Math.max(0, Math.min(1 - EPS, startFrac));
    endFrac = Math.max(0, Math.min(1 - EPS, endFrac));
    if (endFrac <= startFrac) continue;

    // Convert padded fracs back to padded times, and map THOSE to degrees.
    const paddedStartMs = yearStartMs + startFrac * yearTotalMs;
    const paddedEndMs = yearStartMs + endFrac * yearTotalMs;

    let startDeg = timeToDeg(paddedStartMs);
    let endDeg = timeToDeg(paddedEndMs);

    // Round cap trim: prevent caps from crossing seams or bridging gaps
    if (CAP_TRIM_DEG > 0) {
      const delta = ((endDeg - startDeg) % 360 + 360) % 360;

      // Minimum keep size so small segments don't get erased when trim/gap increases.
      // Think of this as "leave at least ~N pixels of arc".
      const MIN_KEEP_PX = arcCap === "round" ? 0.8 : 0.25; // tune later
      const MIN_KEEP_DEG = (MIN_KEEP_PX / Math.max(1, r)) * (180 / Math.PI);

      const eps = 1e-4;

      // We trim both ends, so the remaining span is: delta - 2*trim.
      // Enforce remaining >= MIN_KEEP_DEG.
      const maxTrimByKeep = Math.max(0, (delta - MIN_KEEP_DEG) / 2);

      const trim = Math.max(0, Math.min(CAP_TRIM_DEG, maxTrimByKeep - eps));
      startDeg += trim;
      endDeg -= trim;
    }


    // Detect "full-span" segments (slow movers can span essentially the entire window).
    const rawSpanFrac = (clippedEndMs - clippedStartMs) / yearTotalMs;
    const deltaDeg = ((endDeg - startDeg) % 360 + 360) % 360;

    // Only treat as full ring when it truly covers the whole visible window.
    const looksFullSpan = rawSpanFrac > 0.985;

    // Wrap group
    const wrap = document.createElementNS("http://www.w3.org/2000/svg", "g");
    wrap.setAttribute("class", "seg-wrap");

    (wrap as any).dataset.planet = planetId;
    (wrap as any).dataset.gate = String(gateNum);
    (wrap as any).dataset.segKey = segKey;

    const isUserGate = !!userGates?.has(gateNum);
    wrap.classList.toggle("is-user-gate", isUserGate);

    const isUserChannel =
      !!userGates &&
      partnersForGate(gateNum).some((p) => {
        if (!userGates.has(p)) return false;
        const lo = Math.min(gateNum, p);
        const hi = Math.max(gateNum, p);
        const key = `${lo}-${hi}`;
        if (definedKeys?.has(key)) return false; // exclude already-natal-defined channels
        return true;
      });

    wrap.classList.toggle("is-user-channel", isUserChannel);

    const hoverInfo: HoverInfo = {
      planet: planetId,
      gate: gateNum,
      start: seg.start,
      end: seg.end,
      key: segKey,
    };


    const appendArc = (d: string) => {
      const hit = makeArcPath(d, "seg-hit", "rgba(0,0,0,0.001)", swScaled + 16, arcCap);
      hit.setAttribute("pointer-events", "stroke");

      // Hover info MUST be on the interactive topmost element (hit)
      hit.addEventListener("pointerenter", (e) => {
        e.stopPropagation();
        onHover?.(hoverInfo);
      });
      hit.addEventListener("pointerleave", (e) => {
        e.stopPropagation();
        onHover?.(null);
      });

      // Click: put it on hit as well (pointerenter/leave don’t bubble; keep everything consistent)
      hit.addEventListener("click", (e) => {
        e.stopPropagation();
        svg
          .querySelectorAll(".seg-wrap.is-selected")
          .forEach((el) => el.classList.remove("is-selected"));
        wrap.classList.add("is-selected");
        onSelect?.(hoverInfo);
      });

      const strokeColor = isMoonRound
        ? (seg as any).phase === "waxing"
          ? "rgba(255,255,255,0.95)"
          : "rgba(255,255,255,0.35)"
        : gateColors[gateNum] || "#fff";

      const finalColor = isUserChannel ? "rgba(255,80,80,0.95)" : strokeColor;

      const outlineStroke = isUserGate ? "rgba(255,60,60,1)" : "rgba(255,255,255,0.22)";
      const outlineW = isUserGate ? swScaled + OUTLINE_EXTRA + 10 : swScaled + OUTLINE_EXTRA;

      const outline = makeArcPath(d, "seg-outline", outlineStroke, outlineW, arcCap);
      outline.setAttribute("pointer-events", "none"); // ✅ important

      const baseArc = makeArcPath(d, "seg-base", "#ffffff", swNow, arcCap);
      baseArc.setAttribute("pointer-events", "none"); // ✅ important

      let channelFill: SVGPathElement | null = null;
      if (isUserChannel) {
        channelFill = makeArcPath(d, "seg-channel-fill", "rgba(255,80,80,0.85)", swNow, arcCap);
        channelFill.setAttribute("pointer-events", "none"); // ✅ important
      }

      let tint: SVGPathElement | null = null;
      if (isUserGate && !isUserChannel) {
        tint = makeArcPath(d, "seg-usergate-tint", "rgba(255,80,80,0.10)", swNow, arcCap);
        tint.setAttribute("pointer-events", "none"); // ✅ important
      }

      const colorArc = makeArcPath(d, "seg-color", finalColor, swNow, arcCap);
      colorArc.setAttribute("pointer-events", "none"); // ✅ important

      // Append: hit first or last doesn’t matter now, because it’s the only interactive element
      wrap.appendChild(outline);
      wrap.appendChild(baseArc);
      if (channelFill) wrap.appendChild(channelFill);
      if (tint) wrap.appendChild(tint);
      wrap.appendChild(colorArc);
      wrap.appendChild(hit); // ✅ keep hit on top for absolute certainty
    };


    // ✅ Draw arcs AFTER appendArc exists
    if (looksFullSpan) {
      // Draw a single near-360 arc with a tiny seam gap.
      // This avoids the visible "midpoint split" that happens with two 180° arcs.
      const effectiveEnd = startDeg + (360 - fullSpanSeamGapDeg);
      appendArc(arcPathD(cx, cy, r, startDeg, effectiveEnd));
    } else {
      // Keep this gentle; cap trim should do most of the work now.
      if (arcCap === "round") {
        const MIN_ARC_PX = 0.25; // tune 0.15..0.5
        const MIN_ARC_DEG = (MIN_ARC_PX / Math.max(1, r)) * (180 / Math.PI);
        if (deltaDeg < MIN_ARC_DEG) continue;
      }

      appendArc(arcPathD(cx, cy, r, startDeg, endDeg));
    }

    (g as SVGGElement).appendChild(wrap);

    // Labels (keep label logic in calendar fraction space; it's stable + readable)
    const MIN_LABEL_DAYS = 7;
    const segDays = (clippedEndMs - clippedStartMs) / (24 * 60 * 60 * 1000);

    if (segDays >= MIN_LABEL_DAYS) {
      const labelLayer = ensureLabelLayer(svg);

      if (labelLayer.querySelector(`[data-label-key="${segKey}"]`)) continue;

      const midFrac = (startFrac + endFrac) / 2;
      const midDegLabel = midFrac * 360 - 90;
      const pos = polarToXY(cx, cy, r, midDegLabel);

      const label = createGateLabel(String(gateNum));
      label.setAttribute("x", String(pos.x));
      label.setAttribute("y", String(pos.y));
      label.setAttribute("opacity", "0.7");
      (label as any).dataset.labelKey = segKey;

      labelLayer.appendChild(label);
    }
  }

  return { C: 2 * Math.PI * r };
}
