import type { RingModule } from "@/lib/mandala/rings/types";
import { trackForInstance } from "@/lib/mandala/rings/tracks";
import { mergeIntervals } from "@/lib/mandala/rings/intervals";
import { deriveGateSpans } from "@/lib/mandala/rings/derive";
import { gateToCenters } from "@/lib/hd/gateCenters";

type CenterName =
    | "Head"
    | "Ajna"
    | "Throat"
    | "G"
    | "Heart"
    | "Spleen"
    | "Sacral"
    | "Root"
    | "SolarPlexus";

type Opts = {
    center: CenterName;
    id: string;
    label: string;
};

export function makeCenterModule(opts: Opts): RingModule {
    return {
        id: opts.id,
        label: opts.label,
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

            const showInactive = !!(ctx.layout as any)?.showInactive;

            if (showInactive) {
                const base = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                base.setAttribute("cx", String(cx));
                base.setAttribute("cy", String(cy));
                base.setAttribute("r", String(r));
                base.setAttribute("fill", "none");
                base.setAttribute("stroke", "rgba(255,255,255,0.14)");
                base.setAttribute("stroke-width", String(stroke));
                base.setAttribute("pointer-events", "none");
                root.appendChild(base);
            }


            const dataAny = ctx.data as any;

            const gateSpans =
                dataAny?.gateSpans ??
                deriveGateSpans(dataAny?.payload ?? dataAny);

            const intervals: Array<{ startMs: number; endMs: number }> = [];

            for (const [gate, spans] of gateSpans) {
                const centers = gateToCenters[gate] ?? [];
                if (!centers.includes(opts.center)) continue;
                intervals.push(...spans);
            }

            const merged = mergeIntervals(intervals, 0);

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

            if (merged.length === 0) {
                const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
                label.setAttribute("x", String(cx));
                label.setAttribute("y", String(cy - r - stroke));
                label.setAttribute("text-anchor", "middle");
                label.setAttribute("fill", "rgba(255,255,255,0.6)");
                label.setAttribute("font-size", "16");
                label.textContent = `${opts.label} (0)`;
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
            label.textContent = `${opts.label} (${merged.length} spans)`;
            root.appendChild(label);
        },
    };
}
