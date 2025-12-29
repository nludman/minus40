// src/lib/mandala/rings/layout.ts

import type { RingLayoutKnobs } from "@/lib/mandala/ringLayout";
import type { RingInstance } from "./types";

export type RingBand = {
    rMid: number;      // center radius for stroke
    stroke: number;    // thickness
};

function withDefaults(layout: RingLayoutKnobs) {
    // These defaults match what you use in page.tsx
    return {
        centerR: layout.centerR ?? 391.25,
        band: layout.band ?? 120,
        gapRatio: layout.gapRatio ?? 0.35,
        strokeMin: layout.strokeMin ?? 14,
        strokeMax: layout.strokeMax ?? 44,
    };
}

export function bandForIndex(layout: RingLayoutKnobs, idx: number): RingBand {
    const L = withDefaults(layout);

    const gap = L.band * L.gapRatio;
    const pitch = L.band + gap;

    // constant-ish thickness for now; later we can vary by kind
    const stroke = Math.max(L.strokeMin, Math.min(L.strokeMax, L.band * 0.35));

    const rMid = L.centerR + idx * pitch;
    return { rMid, stroke };
}

export function bandForInstance(
    layout: RingLayoutKnobs,
    rings: RingInstance[],
    instanceId: string
): RingBand {
    const idx = Math.max(0, rings.findIndex((r) => r.instanceId === instanceId));
    return bandForIndex(layout, idx);
}
