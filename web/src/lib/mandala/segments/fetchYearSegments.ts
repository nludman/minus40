// PATH: src/lib/mandala/segments/fetchYearSegments.ts
import type { SegmentsPayload } from "@/lib/mandala/constants";

export function validateSegmentsDev(
    planetId: string,
    segments: { start: string; end: string }[],
    yearStartMs: number,
    yearEndMs: number
) {
    if (process.env.NODE_ENV === "production") return;

    const tolMs = 5;

    if (!segments?.length) {
        console.warn(`[segments][${planetId}] empty segments array`);
        return;
    }

    const firstStart = Date.parse(segments[0].start);
    const lastEnd = Date.parse(segments[segments.length - 1].end);

    if (Number.isNaN(firstStart) || Number.isNaN(lastEnd)) {
        console.warn(`[segments][${planetId}] invalid date parse in first/last segment`, {
            first: segments[0],
            last: segments[segments.length - 1],
        });
        return;
    }

    if (Math.abs(firstStart - yearStartMs) > tolMs) {
        console.warn(`[segments][${planetId}] first start != yearStart`, { yearStartMs, first: segments[0] });
    }
    if (Math.abs(lastEnd - yearEndMs) > tolMs) {
        console.warn(`[segments][${planetId}] last end != yearEnd`, { yearEndMs, last: segments[segments.length - 1] });
    }

    for (let i = 0; i < segments.length; i++) {
        const a = Date.parse(segments[i].start);
        const b = Date.parse(segments[i].end);

        if (Number.isNaN(a) || Number.isNaN(b)) {
            console.warn(`[segments][${planetId}] invalid date parse at i=${i}`, segments[i]);
            continue;
        }
        if (b <= a) {
            console.warn(`[segments][${planetId}] non-positive duration at i=${i}`, segments[i]);
        }

        if (i < segments.length - 1) {
            const nextStart = Date.parse(segments[i + 1].start);
            if (!Number.isNaN(nextStart) && Math.abs(b - nextStart) > tolMs) {
                console.warn(`[segments][${planetId}] seam gap/overlap between i=${i} and i=${i + 1}`, {
                    left: segments[i],
                    right: segments[i + 1],
                });
            }
        }
    }
}

export async function fetchYearSegments(
    y: number,
    reset = false,
    opts?: {
        view?: "calendar" | "tracker";
        span?: "year" | "quarter" | "month" | "week";
        q?: number;
        m?: number;
        anchorIso?: string;
        backDays?: number;
        forwardDays?: number;
        startIso?: string;
        endIso?: string;
    }
): Promise<SegmentsPayload> {
    const p = new URLSearchParams();
    p.set("year", String(y));
    if (reset) p.set("reset", "1");

    const view = opts?.view ?? "calendar";
    p.set("view", view);

    if (view === "calendar") {
        p.set("span", opts?.span ?? "year");
        if (typeof opts?.q === "number") p.set("q", String(opts.q));
        if (typeof opts?.m === "number") p.set("m", String(opts.m));
        if (opts?.startIso) p.set("start", opts.startIso);
        if (opts?.endIso) p.set("end", opts.endIso);
    } else {
        if (opts?.anchorIso) p.set("anchor", opts.anchorIso);
        if (typeof opts?.backDays === "number") p.set("backDays", String(opts.backDays));
        if (typeof opts?.forwardDays === "number") p.set("forwardDays", String(opts.forwardDays));
        if (opts?.startIso) p.set("start", opts.startIso);
        if (opts?.endIso) p.set("end", opts.endIso);
    }

    const res = await fetch(`/api/segments-year?${p.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch segments");
    return res.json();
}
