// PATH: src/lib/mandala/overlays/calendarOverlay.ts

import { polarToXY } from "@/lib/mandala/geometry";


export function updateCalendarOverlay(
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


export function updateDayOverlay(
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