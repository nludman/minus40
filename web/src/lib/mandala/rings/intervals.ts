// src/lib/mandala/rings/intervals.ts

export type Interval = { startMs: number; endMs: number };

/**
 * Merge overlapping/adjacent intervals.
 * Assumes startMs < endMs.
 */
export function mergeIntervals(intervals: Interval[], gapMs = 0): Interval[] {
    if (intervals.length === 0) return [];

    const sorted = [...intervals].sort((a, b) => a.startMs - b.startMs);
    const out: Interval[] = [];

    let cur = { ...sorted[0] };

    for (let i = 1; i < sorted.length; i++) {
        const nxt = sorted[i];

        // overlap or "touching" within gapMs
        if (nxt.startMs <= cur.endMs + gapMs) {
            cur.endMs = Math.max(cur.endMs, nxt.endMs);
        } else {
            out.push(cur);
            cur = { ...nxt };
        }
    }

    out.push(cur);
    return out;
}
