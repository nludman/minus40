// src/lib/mandala/rings/modules/makeGateModule.ts

import type { RingModule } from "@/lib/mandala/rings/types";
import { trackForInstance } from "@/lib/mandala/rings/tracks";
import { mergeIntervals } from "@/lib/mandala/rings/intervals";
import { deriveGateSpans } from "@/lib/mandala/rings/derive";

type Span = { startMs: number; endMs: number };

type Opts = {
    gate: number;
    id?: string;
    label?: string;
    // later: showInactive?: boolean; inactiveOpacity?: number; etc
};

export function makeGateModule(opts: Opts): RingModule {
    const gate = opts.gate;
    const id = opts.id ?? `gate:${gate}`;
    const label = opts.label ?? `Gate ${gate}`;

    return {
        id,
        label,
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

            // PERF: support precomputed gateSpans from ctx.data
            const dataAny = ctx.data as any;
            const gateSpans: Map<number, Span[]> =
                dataAny?.gateSpans ?? deriveGateSpans(dataAny?.payload ?? dataAny);

            const spans = (gateSpans.get(gate) ?? []) as Span[];
            const merged = mergeIntervals(spans, 0);

            // map time -> degrees (calendar seam at top)
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

            // Subtle baseline if gate never activates (keeps the UI readable)
            if (merged.length === 0) {
                const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                circle.setAttribute("cx", String(cx));
                circle.setAttribute("cy", String(cy));
                circle.setAttribute("r", String(r));
                circle.setAttribute("fill", "none");
                circle.setAttribute("stroke", "rgba(255,255,255,0.12)");
                circle.setAttribute("stroke-width", String(stroke));
                root.appendChild(circle);

                const labelEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
                labelEl.setAttribute("x", String(cx));
                labelEl.setAttribute("y", String(cy - r - stroke));
                labelEl.setAttribute("text-anchor", "middle");
                labelEl.setAttribute("fill", "rgba(255,255,255,0.55)");
                labelEl.setAttribute("font-size", "16");
                labelEl.textContent = `${label} (0)`;
                root.appendChild(labelEl);
                return;
            }

            for (const seg of merged) {
                const a0 = toDeg(seg.startMs);
                const a1 = toDeg(seg.endMs);

                const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path.setAttribute("d", arcPath(a0, a1));
                path.setAttribute("fill", "none");
                path.setAttribute("stroke", "rgba(255,255,255,0.82)");
                path.setAttribute("stroke-width", String(stroke));
                path.setAttribute("stroke-linecap", "butt");
                root.appendChild(path);
            }

            const labelEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
            labelEl.setAttribute("x", String(cx));
            labelEl.setAttribute("y", String(cy - r - stroke));
            labelEl.setAttribute("text-anchor", "middle");
            labelEl.setAttribute("fill", "rgba(255,255,255,0.7)");
            labelEl.setAttribute("font-size", "16");
            labelEl.textContent = `${label} (${merged.length} spans)`;
            root.appendChild(labelEl);
        },
    };
}
