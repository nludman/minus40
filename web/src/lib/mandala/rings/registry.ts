// src/lib/mandala/rings/registry.ts

import type { RingModule, RingModuleDescriptor } from "./types";
import { trackForInstance } from "@/lib/mandala/rings/tracks";
import { gateToCenters } from "@/lib/hd/gateCenters";
import { mergeIntervals } from "@/lib/mandala/rings/intervals";

const SacralRing: RingModule = {
    id: "center:sacral",
    label: "Sacral Activations",
    kind: "center",
    build: (ctx, inst) => {
        const root = ctx.getRoot?.(inst);
        if (!root) return;
        root.replaceChildren();

        const cx = 600;
        const cy = 600;

        const track = trackForInstance(ctx.layout, ctx.rings, inst.instanceId);
        const r = track.rMid;

        const strokeMul = Number(root.dataset.strokeMul ?? "1") || 1;
        const stroke = track.stroke * strokeMul;



        // Payload shape comes from /api/segments-year
        const payload = ctx.data as any;
        const transits = payload?.transits;

        const intervals: Array<{ startMs: number; endMs: number }> = [];

        if (transits && typeof transits === "object") {
            for (const body of Object.keys(transits)) {
                const segs = transits?.[body]?.segments;
                if (!Array.isArray(segs)) continue;

                for (const s of segs) {
                    const gate = Number(s?.gate);
                    if (!Number.isFinite(gate)) continue;

                    const centers = gateToCenters[gate] ?? [];
                    if (!centers.includes("Sacral")) continue;

                    const t0 = Date.parse(s.start);
                    const t1 = Date.parse(s.end);
                    if (!Number.isFinite(t0) || !Number.isFinite(t1) || t1 <= t0) continue;

                    intervals.push({ startMs: t0, endMs: t1 });
                }
            }
        }

        const merged = mergeIntervals(intervals, 0);

        // Map time -> degrees (calendar year: seam at top, clockwise)
        const yearStart = ctx.range.startMs;
        const yearEnd = ctx.range.endMs;
        const total = yearEnd - yearStart;

        const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
        const toDeg = (tMs: number) => clamp01((tMs - yearStart) / total) * 360 - 90;

        const polar = (deg: number) => {
            const rad = (deg * Math.PI) / 180;
            return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
        };

        const arcPath = (a0: number, a1: number) => {
            const start = polar(a0);
            const end = polar(a1);
            const delta = ((a1 - a0) % 360 + 360) % 360;
            const largeArc = delta > 180 ? 1 : 0;
            const sweep = 1;
            return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`;
        };

        // If no matching segments, show a calm placeholder (still "working")
        if (merged.length === 0) {
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", String(cx));
            circle.setAttribute("cy", String(cy));
            circle.setAttribute("r", String(r));
            circle.setAttribute("fill", "none");
            circle.setAttribute("stroke", "rgba(255,255,255,0.18)");
            circle.setAttribute("stroke-width", String(stroke));
            root.appendChild(circle);

            const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
            label.setAttribute("x", String(cx));
            label.setAttribute("y", String(cy - r - stroke));
            label.setAttribute("text-anchor", "middle");
            label.setAttribute("fill", "rgba(255,255,255,0.6)");
            label.setAttribute("font-size", "16");
            label.textContent = "Sacral (0)";
            root.appendChild(label);
            return;
        }

        for (const seg of merged) {
            const a0 = toDeg(seg.startMs);
            const a1 = toDeg(seg.endMs);

            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", arcPath(a0, a1));
            path.setAttribute("fill", "none");
            path.setAttribute("stroke", "rgba(255,255,255,0.65)");
            path.setAttribute("stroke-width", String(stroke));
            path.setAttribute("stroke-linecap", "butt");
            root.appendChild(path);
        }

        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.setAttribute("x", String(cx));
        label.setAttribute("y", String(cy - r - stroke));
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("fill", "rgba(255,255,255,0.7)");
        label.setAttribute("font-size", "16");
        label.textContent = `Sacral (${merged.length} spans)`;
        root.appendChild(label);
    },
};

function makeChannelModule(a: number, b: number): RingModule {
    const lo = Math.min(a, b);
    const hi = Math.max(a, b);

    return {
        id: `channel:${lo}-${hi}`,
        label: `Channel ${lo}–${hi}`,
        kind: "channel",
        build: (ctx, inst) => {
            const root = ctx.getRoot?.(inst);
            if (!root) return;
            root.replaceChildren();

            const cx = 600;
            const cy = 600;

            const track = trackForInstance(ctx.layout, ctx.rings, inst.instanceId);
            const r = track.rMid;

            const strokeMul = Number(root.dataset.strokeMul ?? "1") || 1;
            const stroke = track.stroke * strokeMul;


            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", String(cx));
            circle.setAttribute("cy", String(cy));
            circle.setAttribute("r", String(r));
            circle.setAttribute("fill", "none");
            circle.setAttribute("stroke", "rgba(255,255,255,0.25)");
            circle.setAttribute("stroke-width", String(stroke));
            circle.setAttribute("stroke-dasharray", "10 8");

            const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
            label.setAttribute("x", String(cx));
            label.setAttribute("y", String(cy - r - stroke));
            label.setAttribute("text-anchor", "middle");
            label.setAttribute("fill", "rgba(255,255,255,0.7)");
            label.setAttribute("font-size", "16");
            label.textContent = `${lo}–${hi}`;

            root.appendChild(circle);
            root.appendChild(label);
        },
    };
}

function makeGateModule(gate: number): RingModule {
    return {
        id: `gate:${gate}`,
        label: `Gate ${gate}`,
        kind: "gate",
        build: (ctx, inst) => {
            const root = ctx.getRoot?.(inst);
            if (!root) return;
            root.replaceChildren();

            const cx = 600;
            const cy = 600;

            const track = trackForInstance(ctx.layout, ctx.rings, inst.instanceId);
            const r = track.rMid;

            const strokeMul = Number(root.dataset.strokeMul ?? "1") || 1;
            const stroke = track.stroke * strokeMul;


            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", String(cx));
            circle.setAttribute("cy", String(cy));
            circle.setAttribute("r", String(r));
            circle.setAttribute("fill", "none");
            circle.setAttribute("stroke", "rgba(255,255,255,0.18)");
            circle.setAttribute("stroke-width", String(stroke));

            const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
            label.setAttribute("x", String(cx));
            label.setAttribute("y", String(cy - r - stroke));
            label.setAttribute("text-anchor", "middle");
            label.setAttribute("fill", "rgba(255,255,255,0.7)");
            label.setAttribute("font-size", "16");
            label.textContent = `Gate ${gate}`;

            root.appendChild(circle);
            root.appendChild(label);
        },
    };
}


const Channel3740Ring: RingModule = {
    id: "channel:37-40",
    label: "Channel 37–40",
    kind: "channel",
    build: (ctx, inst) => {
        const root = ctx.getRoot?.(inst);
        if (!root) return;

        root.replaceChildren();

        const cx = 600;
        const cy = 600;

        const band = trackForInstance(ctx.layout, ctx.rings, inst.instanceId);
        const r = band.rMid;

        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", String(cx));
        circle.setAttribute("cy", String(cy));
        circle.setAttribute("r", String(r));
        circle.setAttribute("fill", "none");
        circle.setAttribute("stroke", "rgba(255,255,255,0.25)");
        circle.setAttribute("stroke-width", String(band.stroke));
        circle.setAttribute("stroke-dasharray", "12 10");

        const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
        label.setAttribute("x", String(cx));
        label.setAttribute("y", String(cy - r - band.stroke));
        label.setAttribute("text-anchor", "middle");
        label.setAttribute("fill", "rgba(255,255,255,0.7)");
        label.setAttribute("font-size", "16");
        label.textContent = "37–40 (demo)";

        root.appendChild(circle);
        root.appendChild(label);
    },
};

const baseRegistry: Record<string, RingModule> = {
    [SacralRing.id]: SacralRing,
};

export function getRingModule(moduleId: string): RingModule | undefined {
    const hit = baseRegistry[moduleId];
    if (hit) return hit;

    // channel:37-40
    if (moduleId.startsWith("channel:")) {
        const rest = moduleId.slice("channel:".length);
        const [aRaw, bRaw] = rest.split("-");
        const a = Number(aRaw);
        const b = Number(bRaw);
        if (Number.isFinite(a) && Number.isFinite(b)) return makeChannelModule(a, b);
    }

    // gate:37
    if (moduleId.startsWith("gate:")) {
        const rest = moduleId.slice("gate:".length);
        const g = Number(rest);
        if (Number.isFinite(g)) return makeGateModule(g);
    }

    return undefined;
}

// kept for palette iteration / debugging
export const ringRegistry = baseRegistry;

// palette = only user-addable roots for now
export const ringPalette: RingModuleDescriptor[] = [
    { id: "center:sacral", label: "Sacral Activations", kind: "center" },
];

