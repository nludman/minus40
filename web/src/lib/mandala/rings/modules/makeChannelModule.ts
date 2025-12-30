// src/lib/mandala/rings/modules/makeChannelModule.ts

import type { RingModule } from "@/lib/mandala/rings/types";
import { trackForInstance } from "@/lib/mandala/rings/tracks";
import { mergeIntervals } from "@/lib/mandala/rings/intervals";
import { deriveGateSpans } from "@/lib/mandala/rings/derive";

type Span = { startMs: number; endMs: number };

function intersectSorted(a: Span[], b: Span[]): Span[] {
    // two-pointer intersection (assumes spans are sorted by startMs; deriveGateSpans usually is)
    const out: Span[] = [];
    let i = 0;
    let j = 0;

    while (i < a.length && j < b.length) {
        const A = a[i];
        const B = b[j];

        const s = Math.max(A.startMs, B.startMs);
        const e = Math.min(A.endMs, B.endMs);

        if (e > s) out.push({ startMs: s, endMs: e });

        // advance the one that ends first
        if (A.endMs < B.endMs) i++;
        else j++;
    }

    return out;
}

type Opts = {
    a: number;
    b: number;
    id?: string;     // optional override
    label?: string;  // optional override
};

export function makeChannelModule(opts: Opts): RingModule {
    const lo = Math.min(opts.a, opts.b);
    const hi = Math.max(opts.a, opts.b);

    const id = opts.id ?? `channel:${lo}-${hi}`;
    const label = opts.label ?? `Channel ${lo}–${hi}`;

    return {
        id,
        label,
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

            const showInactive = !!(ctx.layout as any)?.showInactive;

            if (showInactive) {
                const base = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                base.setAttribute("cx", String(cx));
                base.setAttribute("cy", String(cy));
                base.setAttribute("r", String(r));
                base.setAttribute("fill", "none");
                base.setAttribute("stroke", "rgba(255,255,255,0.12)");
                base.setAttribute("stroke-width", String(stroke));
                base.setAttribute("pointer-events", "none");
                root.appendChild(base);
            }


            const dataAny = ctx.data as any;

            const gateSpans =
                dataAny?.gateSpans ??
                deriveGateSpans(dataAny?.payload ?? dataAny);


            const spansA = (gateSpans.get(lo) ?? []) as Span[];
            const spansB = (gateSpans.get(hi) ?? []) as Span[];

            const overlapped = intersectSorted(spansA, spansB);
            const merged = mergeIntervals(overlapped, 0);

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

            if (merged.length === 0) {
                const labelEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
                labelEl.setAttribute("x", String(cx));
                labelEl.setAttribute("y", String(cy - r - stroke));
                labelEl.setAttribute("text-anchor", "middle");
                labelEl.setAttribute("fill", "rgba(255,255,255,0.55)");
                labelEl.setAttribute("font-size", "16");
                labelEl.textContent = `${lo}–${hi} (0)`;
                root.appendChild(labelEl);
                return;
            }


            for (const seg of merged) {
                const a0 = toDeg(seg.startMs);
                const a1 = toDeg(seg.endMs);

                const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
                path.setAttribute("d", arcPath(a0, a1));
                path.setAttribute("fill", "none");
                path.setAttribute("stroke", "rgba(255,255,255,0.78)");
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
            labelEl.textContent = `${lo}–${hi} (${merged.length} spans)`;
            root.appendChild(labelEl);
        },
    };
}
