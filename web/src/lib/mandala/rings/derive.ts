// src/lib/mandala/rings/derive.ts
export type TimeSpan = { startMs: number; endMs: number };

export function deriveGateSpans(payload: any): Map<number, TimeSpan[]> {
    const out = new Map<number, TimeSpan[]>();
    const transits = payload?.transits;
    if (!transits) return out;

    for (const body of Object.values(transits)) {
        const segs = (body as any)?.segments;
        if (!Array.isArray(segs)) continue;

        for (const s of segs) {
            const gate = Number(s?.gate);
            if (!Number.isFinite(gate)) continue;

            const startMs = Date.parse(s.start);
            const endMs = Date.parse(s.end);
            if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) continue;

            const arr = out.get(gate) ?? [];
            arr.push({ startMs, endMs });
            out.set(gate, arr);
        }
    }

    return out;
}
