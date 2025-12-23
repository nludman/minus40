// src/lib/mandala/layoutConfig.ts

export type MandalaLayoutPreset = "balanced" | "compact" | "spacious";

export type MandalaLayoutKnobs = {
    preset: MandalaLayoutPreset;

    // Safe “presentation knobs”
    outerRadius: number;     // max ring radius
    innerHoleRadius: number; // empty center space
    ringGap: number;         // distance between ring centers
    strokeWidth: number;     // default stroke width for rings

    // Optional multiplier knobs (nice for quick tuning)
    strokeScale?: number;    // multiplies strokeWidth
    gapScale?: number;       // multiplies ringGap
};

export const DEFAULT_LAYOUT: MandalaLayoutKnobs = {
    preset: "balanced",
    outerRadius: 520,
    innerHoleRadius: 160,
    ringGap: 32.5,
    strokeWidth: 20,
    strokeScale: 1,
    gapScale: 1,
};

export const LAYOUT_PRESETS: Record<MandalaLayoutPreset, Omit<MandalaLayoutKnobs, "preset">> = {
    balanced: {
        outerRadius: 520,
        innerHoleRadius: 160,
        ringGap: 32.5,
        strokeWidth: 20,
        strokeScale: 1,
        gapScale: 1,
    },
    compact: {
        outerRadius: 500,
        innerHoleRadius: 130,
        ringGap: 28,
        strokeWidth: 18,
        strokeScale: 1,
        gapScale: 1,
    },
    spacious: {
        outerRadius: 540,
        innerHoleRadius: 190,
        ringGap: 36,
        strokeWidth: 22,
        strokeScale: 1,
        gapScale: 1,
    },
};

export function resolveLayoutKnobs(knobs: MandalaLayoutKnobs): MandalaLayoutKnobs {
    const base = LAYOUT_PRESETS[knobs.preset];

    const strokeScale = knobs.strokeScale ?? 1;
    const gapScale = knobs.gapScale ?? 1;

    // Clamp to keep within the 1200x1200 viewBox (center=600)
    const outerRadius = clamp(knobs.outerRadius ?? base.outerRadius, 260, 560);
    const innerHoleRadius = clamp(knobs.innerHoleRadius ?? base.innerHoleRadius, 60, 320);

    return {
        preset: knobs.preset,
        outerRadius,
        innerHoleRadius,
        ringGap: clamp((knobs.ringGap ?? base.ringGap) * gapScale, 10, 80),
        strokeWidth: clamp((knobs.strokeWidth ?? base.strokeWidth) * strokeScale, 6, 48),
        strokeScale,
        gapScale,
    };
}

function clamp(n: number, a: number, b: number) {
    return Math.max(a, Math.min(b, n));
}
