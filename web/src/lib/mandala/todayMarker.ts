// src/lib/mandala/todayMarker.ts
import { clamp01 } from "@/lib/mandala/geometry";
import type { SegmentsPayload } from "@/lib/mandala/constants";

/**
 * Time -> angle mapping used by the today marker.
 * Keep pure.
 */
export function timeToDeg(
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

/**
 * Pure renderer: only draws the marker into ensureTodayLayer(svg).
 */
export function renderTodayMarker(
    svg: SVGSVGElement,
    angleDeg: number,
    innerR: number,
    outerR: number,
    ensureTodayLayer: (svg: SVGSVGElement) => SVGGElement
) {
    const NS = "http://www.w3.org/2000/svg";
    const g = ensureTodayLayer(svg);
    g.innerHTML = "";

    const cx = 600;
    const cy = 600;

    const a = (angleDeg * Math.PI) / 180;

    const p0 = { x: cx + innerR * Math.cos(a), y: cy + innerR * Math.sin(a) };
    const p1 = { x: cx + outerR * Math.cos(a), y: cy + outerR * Math.sin(a) };

    // Needle
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

    // Arrow tip
    const tipLen = 12;
    const tipWide = 10;

    const ux = Math.cos(a);
    const uy = Math.sin(a);
    const px = -uy;
    const py = ux;

    const tip = { x: p1.x + ux * tipLen, y: p1.y + uy * tipLen };
    const left = { x: p1.x + px * (tipWide / 2), y: p1.y + py * (tipWide / 2) };
    const right = { x: p1.x - px * (tipWide / 2), y: p1.y - py * (tipWide / 2) };

    const tri = document.createElementNS(NS, "path");
    tri.setAttribute("d", `M ${left.x} ${left.y} L ${tip.x} ${tip.y} L ${right.x} ${right.y} Z`);
    tri.setAttribute("fill", "rgba(255,255,255,0.85)");
    tri.setAttribute("pointer-events", "none");
    g.appendChild(tri);

    // Dot
    const dot = document.createElementNS(NS, "circle");
    dot.setAttribute("cx", String(p1.x));
    dot.setAttribute("cy", String(p1.y));
    dot.setAttribute("r", "3");
    dot.setAttribute("fill", "rgba(255,255,255,0.9)");
    dot.setAttribute("pointer-events", "none");
    g.appendChild(dot);
}

/**
 * Pure "compute + draw" wrapper.
 * Note: transits isn't used right now, but keep it so later we can add "today gate" computation
 * without changing call sites.
 */
export function updateTodayOnly(args: {
    svg: SVGSVGElement | null;
    transits: SegmentsPayload["transits"] | null;
    rangeStartMs: number | null;
    rangeEndMs: number | null;
    view: "calendar" | "tracker";
    anchorMs: number | null;
    activeIds: string[];
    ensureTodayLayer: (svg: SVGSVGElement) => SVGGElement;
}) {
    const {
        svg,
        transits,
        rangeStartMs,
        rangeEndMs,
        view,
        anchorMs,
        activeIds,
        ensureTodayLayer,
    } = args;

    if (!svg || !transits) return;
    if (!rangeStartMs || !rangeEndMs) return;

    const nowMs = Date.now();
    const deg = timeToDeg(nowMs, rangeStartMs, rangeEndMs, view, anchorMs);

    const firstId = activeIds[0];
    const base = firstId ? (svg.querySelector(`#${firstId}`) as SVGCircleElement | null) : null;
    const rMid = base ? parseFloat(base.getAttribute("r") || "0") : 0;
    const sw = base ? parseFloat(base.getAttribute("stroke-width") || "0") : 0;
    const outerEdge = rMid + sw / 2;

    const inner = Math.max(0, outerEdge - 140);
    const outer = outerEdge + 20;

    renderTodayMarker(svg, deg, inner, outer, ensureTodayLayer);
}
