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
};

function arcPathD(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
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
}: BuildRingArgs) {
  // ✅ Foundation: always ensure a base circle exists.
  // This prevents “only the original SVG planets work” failures.
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

  const MAX_LAYER_STROKE = Math.max(swNow, swScaled + OUTLINE_EXTRA);
  const CAP_TRIM_DEG = arcCap === "round" ? ((MAX_LAYER_STROKE / 2) / r) * (180 / Math.PI) : 0;

  // Hide original guide circle (but keep it in DOM for layout + geometry)
  base.style.display = "none";

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

  // Gap padding as degrees
  const PAD_DEG = 0.22;
  const padFracBase = PAD_DEG / 360;

  for (const seg of segments) {
    const segStartMs = new Date(seg.start).getTime();
    const segEndMs = new Date(seg.end).getTime();

    // Clip to year window
    const clippedStartMs = Math.max(segStartMs, yearStartMs);
    const clippedEndMs = Math.min(segEndMs, yearEndMs);
    const gateNum = Number((seg as any).gate);
    const segKey = `${planetId}:${gateNum}:${seg.start}:${seg.end}`;

    if (clippedEndMs <= clippedStartMs) continue;

    let startFrac = (clippedStartMs - yearStartMs) / yearTotalMs;
    let endFrac = (clippedEndMs - yearStartMs) / yearTotalMs;

    startFrac = clamp01(startFrac);
    endFrac = clamp01(endFrac);

    const spanFrac = endFrac - startFrac;
    const padFrac = Math.min(padFracBase, spanFrac * 0.18);
    startFrac += padFrac;
    endFrac -= padFrac;

    const EPS = 1e-6;
    startFrac = Math.max(0, Math.min(1 - EPS, startFrac));
    endFrac = Math.max(0, Math.min(1 - EPS, endFrac));
    if (endFrac <= startFrac) continue;

    let startDeg = startFrac * 360 - 90;
    let endDeg = endFrac * 360 - 90;

    if (CAP_TRIM_DEG > 0) {
      const delta = ((endDeg - startDeg) % 360 + 360) % 360;
      const eps = 1e-4;
      const trim = Math.max(0, Math.min(CAP_TRIM_DEG, delta / 2 - eps));
      startDeg += trim;
      endDeg -= trim;
    }

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
        // exclude already-natal-defined channels
        if (definedKeys?.has(key)) return false;
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

    // Selection stays on wrap (click bubbles)
    wrap.addEventListener("click", (e) => {
      e.stopPropagation();
      svg
        .querySelectorAll(".seg-wrap.is-selected")
        .forEach((el) => el.classList.remove("is-selected"));
      wrap.classList.add("is-selected");
      onSelect?.(hoverInfo);
    });

    const appendArc = (d: string) => {
      // ✅ Canonical hit surface: painted but effectively invisible
      const hit = makeArcPath(d, "seg-hit", "rgba(0,0,0,0.001)", swScaled + 16, arcCap);
      hit.setAttribute("pointer-events", "stroke");

      // Hover lives on the actual hit path (no bubbling ambiguity)
      hit.addEventListener("pointerenter", () => onHover?.(hoverInfo));
      hit.addEventListener("pointerleave", () => onHover?.(null));

      const strokeColor = isMoonRound
        ? (seg as any).phase === "waxing"
          ? "rgba(255,255,255,0.95)"
          : "rgba(255,255,255,0.35)"
        : gateColors[gateNum] || "#fff";

      const finalColor = isUserChannel ? "rgba(255,80,80,0.95)" : strokeColor;

      const outlineStroke = isUserGate ? "rgba(255,60,60,1)" : "rgba(255,255,255,0.22)";
      const outlineW = isUserGate ? swScaled + OUTLINE_EXTRA + 10 : swScaled + OUTLINE_EXTRA;

      const outline = makeArcPath(d, "seg-outline", outlineStroke, outlineW, arcCap);
      const baseArc = makeArcPath(d, "seg-base", "#ffffff", swNow, arcCap);

      let channelFill: SVGPathElement | null = null;
      if (isUserChannel) {
        channelFill = makeArcPath(d, "seg-channel-fill", "rgba(255,80,80,0.85)", swNow, arcCap);
      }

      let tint: SVGPathElement | null = null;
      if (isUserGate && !isUserChannel) {
        tint = makeArcPath(d, "seg-usergate-tint", "rgba(255,80,80,0.10)", swNow, arcCap);
      }

      const colorArc = makeArcPath(d, "seg-color", finalColor, swNow, arcCap);

      wrap.appendChild(hit);
      wrap.appendChild(outline);
      wrap.appendChild(baseArc);
      if (channelFill) wrap.appendChild(channelFill);
      if (tint) wrap.appendChild(tint);
      wrap.appendChild(colorArc);
    };

    if (endDeg <= startDeg) {
      appendArc(arcPathD(cx, cy, r, startDeg, 270));
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

      if (labelLayer.querySelector(`[data-label-key="${segKey}"]`)) continue;

      const midFrac = (startFrac + endFrac) / 2;
      const midDeg = midFrac * 360 - 90;
      const pos = polarToXY(cx, cy, r, midDeg);

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
