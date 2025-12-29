// src/lib/mandala/rings/tracks.ts

import type { RingLayoutKnobs } from "@/lib/mandala/ringLayout";
import type { RingInstance } from "./types";

export type RingTrack = {
    rMid: number;
    stroke: number;
};

function withDefaults(layout: RingLayoutKnobs) {
    return {
        centerR: layout.centerR ?? 391.25,
        band: layout.band ?? 120,
        strokeMin: layout.strokeMin ?? 14,
        strokeMax: layout.strokeMax ?? 44,
    };
}

/**
 * Allocate N tracks inside a single shared band [centerR, centerR+band].
 * Each ring instance gets one "lane" (stroke + gap) within the band.
 */
export function trackForInstance(
    layout: RingLayoutKnobs,
    rings: RingInstance[],
    instanceId: string
): RingTrack {
    const L = withDefaults(layout);
    const idx = Math.max(0, rings.findIndex((r) => r.instanceId === instanceId));
    const n = Math.max(1, rings.length);

    // Reserve a little breathing room between tracks.
    // We compute a per-track "cell" height then set stroke within it.
    const cell = L.band / n;

    // Stroke uses most of the cell, but never exceeds knobs.
    const stroke = Math.max(
        L.strokeMin,
        Math.min(L.strokeMax, cell * 0.78)
    );

    // Center each stroke inside its cell
    const rMid = (L.centerR + cell * idx) + cell / 2;

    return { rMid, stroke };
}
